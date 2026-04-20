import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import ConnectMongo from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';

import { AdminJS } from 'adminjs';
import { buildAuthenticatedRouter } from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';

import AdminUser from './models/AdminUser.js';
import { getAdminResources } from './admin/resources.js';
import { logAdminAction } from './middleware/audit.js';
import apiRoutes from './routes/api.js';

// ============================================
// CONFIGURATION
// ============================================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI is required. Set it in .env');
  process.exit(1);
}

// ============================================
// REGISTER ADMINJS ADAPTER
// ============================================
AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

// ============================================
// MAIN SERVER
// ============================================
async function startServer() {
  // 1. Connect to MongoDB
  await mongoose.connect(MONGO_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
  });
  console.log('✅ Connected to MongoDB');

  // 2. Create Express app
  const app = express();

  // 3. Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // AdminJS needs inline scripts
    crossOriginEmbedderPolicy: false,
  }));
  
  app.use(cors({
    origin: ['http://localhost:3000', 'https://alloysphere.online'],
    credentials: true,
  }));

  // Rate limiting — stricter for login
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);
  app.use(morgan('short'));
  app.use(express.json());

  // 4. Configure AdminJS
  const adminJs = new AdminJS({
    resources: getAdminResources(),
    rootPath: '/admin',
    branding: {
      companyName: 'AlloySphere Admin',
      logo: false,
      softwareBrothers: false,
      favicon: false,
    },
    locale: {
      language: 'en',
      translations: {
        en: {
          labels: {
            User: 'Platform Users',
            Startup: 'Startup Profiles',
            Pitch: 'Pitch Requests',
            AdminUser: 'Admin Accounts',
            AuditLog: 'Audit Logs',
          },
          messages: {
            loginWelcome: 'Welcome to AlloySphere Admin Panel. Please log in.',
          },
        },
      },
    },
    settings: {
      defaultPerPage: 20,
    },
    dashboard: {
      handler: async () => {
        const [totalUsers, totalStartups, pendingVerifications, totalPitches, usersByRole] = await Promise.all([
          mongoose.model('User').countDocuments(),
          mongoose.model('Startup').countDocuments(),
          mongoose.model('Startup').countDocuments({ verificationStatus: 'pending' }),
          mongoose.model('Pitch').countDocuments(),
          mongoose.model('User').aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        ]);
        const roleDistribution = {};
        usersByRole.forEach(r => { roleDistribution[r._id] = r.count; });
        return { totalUsers, totalStartups, pendingVerifications, totalPitches, roleDistribution };
      },
    },
  });

  // 5. Authentication via AdminJS session
  const sessionStore = ConnectMongo.create({
    mongoUrl: MONGO_URI,
    collectionName: 'admin_sessions',
    ttl: 24 * 60 * 60, // 1 day
  });

  const adminRouter = buildAuthenticatedRouter(
    adminJs,
    {
      authenticate: async (email, password) => {
        try {
          const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });
          if (!admin || !admin.isActive) return null;

          // Check lockout
          if (admin.lockUntil && admin.lockUntil > new Date()) {
            console.warn(`🔒 Admin account locked: ${email}`);
            return null;
          }

          const isValid = await bcrypt.compare(password, admin.passwordHash);
          if (!isValid) {
            // Increment login attempts
            admin.loginAttempts = (admin.loginAttempts || 0) + 1;
            if (admin.loginAttempts >= 5) {
              admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 min
              console.warn(`🔒 Admin account locked after 5 failed attempts: ${email}`);
            }
            await admin.save();
            return null;
          }

          // Reset on successful login
          admin.loginAttempts = 0;
          admin.lockUntil = undefined;
          admin.lastLogin = new Date();
          await admin.save();

          console.log(`✅ Admin login: ${email}`);
          await logAdminAction({
            adminEmail: email,
            action: 'login',
            resource: 'AdminUser',
            details: { timestamp: new Date().toISOString() },
          });

          return { email: admin.email, role: admin.role, id: admin._id.toString() };
        } catch (err) {
          console.error('Auth error:', err.message);
          return null;
        }
      },
      cookieName: 'alloysphere-admin',
      cookiePassword: SESSION_SECRET,
    },
    null, // predefinedRouter
    {
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      secret: SESSION_SECRET,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax',
      },
    }
  );

  // Apply login rate limiting
  app.use('/admin/login', loginLimiter);

  // Mount AdminJS router
  app.use(adminJs.options.rootPath, adminRouter);

  // 6. API routes
  app.use('/api', apiRoutes);

  // 7. Root redirect
  app.get('/', (req, res) => {
    res.redirect('/admin');
  });

  // 8. Error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  // 9. Start server
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║       AlloySphere Admin Panel 🚀              ║
╠═══════════════════════════════════════════════╣
║  Admin UI:   http://localhost:${PORT}/admin       ║
║  API Base:   http://localhost:${PORT}/api         ║
║  Health:     http://localhost:${PORT}/api/health   ║
╠═══════════════════════════════════════════════╣
║  ⚠  Run 'npm run seed' to create admin user  ║
╚═══════════════════════════════════════════════╝
    `);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
