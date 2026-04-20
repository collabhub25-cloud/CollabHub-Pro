import express from 'express';
import User from '../models/User.js';
import Startup from '../models/Startup.js';
import Pitch from '../models/Pitch.js';

const router = express.Router();

/**
 * GET /api/stats — Dashboard statistics (protected by session auth)
 */
router.get('/stats', async (req, res) => {
  if (!req.session?.adminUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [
      totalUsers,
      totalStartups,
      pendingVerifications,
      totalPitches,
      usersByRole,
      recentUsers,
      recentStartups,
    ] = await Promise.all([
      User.countDocuments(),
      Startup.countDocuments(),
      Startup.countDocuments({ AlloySphereVerified: false, isActive: true }),
      Pitch.countDocuments(),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt').lean(),
      Startup.find().sort({ createdAt: -1 }).limit(5).select('name industry stage AlloySphereVerified createdAt').lean(),
    ]);

    const roleDistribution = {};
    usersByRole.forEach(r => { roleDistribution[r._id] = r.count; });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalStartups,
        pendingVerifications,
        totalPitches,
        roleDistribution,
      },
      recent: {
        users: recentUsers,
        startups: recentStartups,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

/**
 * GET /api/health — Health check
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

export default router;
