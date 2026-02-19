/**
 * Environment Variable Validation
 * Validates environment variables at startup for security
 */

type EnvVar = {
  name: string;
  required: boolean;
  sensitive: boolean;
  description: string;
};

const ENV_SCHEMA: EnvVar[] = [
  {
    name: 'MONGODB_URI',
    required: true,
    sensitive: true,
    description: 'MongoDB connection string',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    sensitive: true,
    description: 'Secret key for JWT token signing',
  },
  {
    name: 'JWT_REFRESH_SECRET',
    required: false,
    sensitive: true,
    description: 'Secret key for refresh token signing',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    sensitive: true,
    description: 'Stripe API secret key',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    sensitive: true,
    description: 'Stripe webhook signing secret',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: false,
    sensitive: false,
    description: 'Stripe publishable key (frontend)',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    sensitive: false,
    description: 'Application URL',
  },
  {
    name: 'NODE_ENV',
    required: false,
    sensitive: false,
    description: 'Node environment',
  },
];

let validated = false;
const validationErrors: string[] = [];
const validationWarnings: string[] = [];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  if (validated) {
    return {
      valid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
    };
  }

  console.log('\n🔒 Validating environment variables...\n');

  for (const envVar of ENV_SCHEMA) {
    const value = process.env[envVar.name];

    if (!value || value === '__MONGO_URI_NOT_SET__' || value.includes('your-')) {
      if (envVar.required) {
        validationErrors.push(`Missing required environment variable: ${envVar.name} (${envVar.description})`);
      } else {
        validationWarnings.push(`Optional environment variable not set: ${envVar.name} (${envVar.description})`);
      }
    } else if (envVar.sensitive) {
      // Log that it's set (but don't log the value)
      console.log(`  ✅ ${envVar.name}: [SET - HIDDEN]`);
    } else {
      // Log non-sensitive values
      console.log(`  ✅ ${envVar.name}: ${value}`);
    }
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    validationWarnings.push('JWT_SECRET should be at least 32 characters for security');
  }

  // Check for placeholder secrets in production
  if (process.env.NODE_ENV === 'production') {
    // Check for development-only secrets in production
    if (jwtSecret?.includes('placeholder') || jwtSecret?.includes('dev-secret')) {
      validationErrors.push('JWT_SECRET cannot contain placeholder values in production');
    }
    
    // Check for default insecure value
    if (jwtSecret === 'collabhub-default-secret-change-in-production') {
      validationErrors.push('JWT_SECRET is using the default insecure value. Please set a secure secret!');
    }
    
    // Check for development mode Stripe keys in production
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey?.includes('sk_test')) {
      validationWarnings.push('Using test Stripe keys in production environment');
    }
  }

  validated = true;

  if (validationWarnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validationWarnings.forEach((warning) => console.log(`     - ${warning}`));
  }

  if (validationErrors.length > 0) {
    console.log('\n❌ Errors:');
    validationErrors.forEach((error) => console.log(`     - ${error}`));
    if (process.env.NODE_ENV === 'production') {
      console.log('\n🛑 Application cannot start with missing required environment variables.\n');
    } else {
      console.log('\n⚠️  Using development fallbacks. Configure proper secrets for production.\n');
    }
  } else {
    console.log('\n✅ Environment validation passed.\n');
  }

  return {
    valid: validationErrors.length === 0,
    errors: validationErrors,
    warnings: validationWarnings,
  };
}

/**
 * Check if environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

// Export environment variables with type safety
export const env = {
  get MONGODB_URI() {
    return process.env.MONGODB_URI || process.env.DATABASE_URL || '';
  },
  get JWT_SECRET() {
    return process.env.JWT_SECRET || 'collabhub-dev-secret-change-in-production';
  },
  get JWT_REFRESH_SECRET() {
    return process.env.JWT_REFRESH_SECRET || this.JWT_SECRET + '-refresh';
  },
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY || '';
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET || '';
  },
  get STRIPE_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  },
  get APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
};
