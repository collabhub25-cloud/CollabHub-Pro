# ============================================
# CollabHub Production Environment Checklist
# Complete production deployment validation
# ============================================

## 🔐 CRITICAL SECURITY VARIABLES (REQUIRED)

| Variable | Description | Set? | Notes |
|----------|-------------|------|-------|
| `MONGODB_URI` | MongoDB Atlas connection string | ⬜ | Must use Atlas in production |
| `JWT_SECRET` | JWT signing secret (32+ chars) | ⬜ | Generate with `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token secret | ⬜ | Different from JWT_SECRET |
| `STRIPE_SECRET_KEY` | Stripe production API key | ⬜ | Starts with `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ⬜ | From Stripe Dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | ⬜ | Starts with `pk_live_` |
| `NEXT_PUBLIC_APP_URL` | Production URL | ⬜ | `https://collabhub.app` |

## 🔧 OPTIONAL MONITORING VARIABLES

| Variable | Description | Set? | Notes |
|----------|-------------|------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking | ⬜ | Get from Sentry project |
| `SENTRY_AUTH_TOKEN` | Sentry auth token | ⬜ | For release tracking |
| `REDIS_URL` | Redis connection string | ⬜ | Or use Upstash |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL | ⬜ | For serverless |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token | ⬜ | From Upstash dashboard |
| `LOG_LEVEL` | Logging verbosity | ⬜ | `info` for production |

## 🛡️ SECURITY VALIDATION

### Authentication & Authorization
- [ ] JWT_SECRET is at least 32 characters
- [ ] JWT_SECRET does not contain "placeholder" or "dev"
- [ ] JWT_REFRESH_SECRET is different from JWT_SECRET
- [ ] Password hashing uses bcrypt with cost factor 12+

### Database Security
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Database user has minimal required permissions
- [ ] Connection string uses SSL/TLS
- [ ] Connection pooling configured (maxPoolSize: 10)

### API Security
- [ ] Rate limiting enabled on all public endpoints
- [ ] CORS configured for production domains only
- [ ] Admin routes hidden or protected with separate key
- [ ] Webhook signature verification enabled

### Cookie Security
- [ ] `secure: true` in production
- [ ] `httpOnly: true` for auth cookies
- [ ] `sameSite: 'strict'` or `'lax'`
- [ ] Proper domain and path restrictions

### HTTPS & Headers
- [ ] HTTPS enforced on all routes
- [ ] HSTS header configured (max-age=63072000)
- [ ] X-Frame-Options: DENY or SAMEORIGIN
- [ ] X-Content-Type-Options: nosniff
- [ ] Content-Security-Policy configured
- [ ] X-Powered-By header disabled

## 📊 MONITORING SETUP

### Health Checks
- [ ] `/api/health` endpoint returns 200
- [ ] Database connectivity verified
- [ ] Cache connectivity verified
- [ ] Stripe configuration verified

### Error Tracking (Sentry)
- [ ] Sentry DSN configured
- [ ] Environment set to 'production'
- [ ] Release tracking enabled
- [ ] Source maps uploaded
- [ ] PII redaction configured

### Logging
- [ ] Log level set to 'info' or higher
- [ ] Structured logging enabled
- [ ] Sensitive data not logged
- [ ] Log aggregation configured

## 🚀 DEPLOYMENT VALIDATION

### Pre-Deployment
- [ ] All TypeScript errors resolved
- [ ] ESLint passes without warnings
- [ ] Build completes successfully
- [ ] No hardcoded credentials in code
- [ ] .env files not committed to git

### Post-Deployment
- [ ] Health check returns healthy status
- [ ] User registration works
- [ ] User login works
- [ ] Password reset works
- [ ] All API endpoints return expected responses
- [ ] Stripe webhook receives events
- [ ] Rate limiting works
- [ ] Error tracking captures errors

## 💳 STRIPE PRODUCTION CHECKLIST

### Account Setup
- [ ] Stripe account verified
- [ ] Tax forms submitted
- [ ] Bank account connected
- [ ] Business information complete

### Integration Validation
- [ ] Using live API keys (sk_live_*)
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] All webhook events handled correctly
- [ ] Payment flow tested with real cards
- [ ] Refund flow tested
- [ ] Subscription cancellation tested
- [ ] Invoice payment succeeded event handled

### Webhook Events to Handle
- [ ] `checkout.session.completed`
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated`
- [ ] `customer.subscription.deleted`
- [ ] `invoice.payment_succeeded`
- [ ] `invoice.payment_failed`

## 🔍 PERFORMANCE CHECKLIST

### Database
- [ ] Indexes created on frequently queried fields
- [ ] Connection pooling enabled
- [ ] Query timeouts configured
- [ ] Read replicas configured (if needed)

### Caching
- [ ] Redis connected (or Upstash)
- [ ] Cache invalidation working
- [ ] TTL configured appropriately
- [ ] Cache hit rate > 80%

### CDN & Static Assets
- [ ] Static assets served from CDN
- [ ] Image optimization enabled
- [ ] Font loading optimized
- [ ] Gzip/Brotli compression enabled

## 💾 BACKUP & RECOVERY

### Database Backups
- [ ] MongoDB Atlas backups enabled
- [ ] Backup retention set to 7+ days
- [ ] Point-in-time recovery enabled
- [ ] Cross-region backup configured

### Application Backups
- [ ] Environment variables backed up securely
- [ ] Deployment rollback tested
- [ ] Disaster recovery plan documented

## 📈 SCALING PREPARATION

### Horizontal Scaling
- [ ] Stateless application design confirmed
- [ ] Session storage externalized (Redis)
- [ ] File uploads to external storage (S3)
- [ ] Load balancer health check configured

### Vertical Scaling
- [ ] Memory limits configured
- [ ] CPU limits configured
- [ ] Auto-scaling rules defined

## 🔐 COMPLIANCE CHECKLIST

### Data Protection
- [ ] PII encrypted at rest
- [ ] PII encrypted in transit
- [ ] Data retention policy defined
- [ ] User data deletion implemented

### Security
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] Output encoding implemented
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection implemented

## ✅ FINAL SIGN-OFF

### Developer Sign-Off
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance review completed

### Operations Sign-Off
- [ ] Deployment tested in staging
- [ ] Monitoring dashboards configured
- [ ] Alerting rules configured
- [ ] Runbook created

### Business Sign-Off
- [ ] UAT completed
- [ ] Legal review completed (if needed)
- [ ] Marketing materials ready

---

**Deployment Approved By:** ________________

**Date:** ________________

**Notes:**
