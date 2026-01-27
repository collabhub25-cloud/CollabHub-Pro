"""
Django settings for collabhub project.

CollabHub - A collaboration platform for connecting students, founders, 
talents, and investors with opportunities.

SECURITY HARDENED VERSION
- All sensitive settings loaded from environment variables
- Debug mode disabled by default
- Strict CORS and security headers
- Brute-force protection with django-axes
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# =============================================================================
# SECURITY SETTINGS - ALL FROM ENVIRONMENT VARIABLES
# =============================================================================

def get_secret_key():
    """
    Get secret key from environment or generate a secure one.
    In production, SECRET_KEY MUST be set in environment.
    """
    key = os.environ.get('SECRET_KEY')
    if key:
        return key
    
    # Development fallback - generate a new key
    # WARNING: This should NEVER happen in production
    from django.core.management.utils import get_random_secret_key
    import warnings
    warnings.warn(
        "SECRET_KEY not found in environment. Using generated key. "
        "This is INSECURE for production!",
        RuntimeWarning
    )
    return get_random_secret_key()


SECRET_KEY = get_secret_key()

# Debug mode - MUST be False in production (default: False)
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

# Allowed hosts - NO wildcards allowed
ALLOWED_HOSTS = [
    host.strip() 
    for host in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip() and host.strip() != '*'
]

# Ensure at least localhost is allowed for development
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']


# =============================================================================
# APPLICATION DEFINITION
# =============================================================================

INSTALLED_APPS = [
    # Django Core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',                    # Django REST Framework
    'rest_framework_simplejwt',          # JWT Authentication
    'rest_framework_simplejwt.token_blacklist',  # Token blacklisting for logout
    'corsheaders',                       # CORS support
    'django_filters',                    # Filtering for API
    'axes',                              # Brute-force protection
    'csp',                               # Content Security Policy
    
    # CollabHub Apps (modular architecture)
    'users.apps.UsersConfig',            # User management & profiles
    'startups.apps.StartupsConfig',      # Startup management
    'opportunities.apps.OpportunitiesConfig',  # Hackathons, internships, projects
    'collaborations.apps.CollaborationsConfig',  # Applications & team matching
    'messaging.apps.MessagingConfig',    # Direct messaging system
    'security.apps.SecurityConfig',      # Security, audit, and GDPR
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS - must be first
    'csp.middleware.CSPMiddleware',            # Content Security Policy
    'collabhub.middleware.PermissionsPolicyMiddleware',  # Permissions-Policy
    'collabhub.middleware.SecurityHeadersMiddleware',    # Additional security
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'security.audit.AuditMiddleware',         # Audit logging context
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'axes.middleware.AxesMiddleware',  # Brute-force protection - must be after auth
]

# Authentication backends - axes must be first
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]

ROOT_URLCONF = 'collabhub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'collabhub.wsgi.application'


# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# Use PostgreSQL in production, SQLite for development
USE_POSTGRES = os.environ.get('USE_POSTGRES', 'False').lower() == 'true'

if USE_POSTGRES:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'collabhub'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {
                'connect_timeout': 10,
            },
            'CONN_MAX_AGE': 60,  # Connection pooling
        }
    }
else:
    # SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# =============================================================================
# PASSWORD VALIDATION
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 10}},  # Increased from default 8
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =============================================================================
# INTERNATIONALIZATION
# =============================================================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# =============================================================================
# STATIC FILES (CSS, JavaScript, Images)
# =============================================================================

STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR.parent / 'frontend',  # Serve frontend files
]
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (user uploads)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Frontend directory for templates
FRONTEND_DIR = BASE_DIR.parent / 'frontend'



# =============================================================================
# DEFAULT PRIMARY KEY FIELD TYPE
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =============================================================================
# CUSTOM USER MODEL
# =============================================================================

AUTH_USER_MODEL = 'users.User'


# =============================================================================
# DJANGO REST FRAMEWORK CONFIGURATION
# =============================================================================

REST_FRAMEWORK = {
    # Use JWT as default authentication
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    
    # Default permission - require authentication
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    
    # Filtering and pagination
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    
    # Pagination
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    
    # Throttling (rate limiting) - stricter limits
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',       # Reduced from 100/hour
        'user': '300/minute',      # More granular control
        'auth': '5/minute',        # Strict limit for auth endpoints
        'password_reset': '3/hour', # Very strict for password reset
        'messaging': '60/minute',   # Rate limit for messaging
    },
    
    # Exception handling - don't expose internal errors
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}


# =============================================================================
# JWT CONFIGURATION (Simple JWT)
# =============================================================================

# Separate signing key for JWT (not the same as Django SECRET_KEY)
JWT_SIGNING_KEY = os.environ.get('JWT_SIGNING_KEY', SECRET_KEY)

SIMPLE_JWT = {
    # Token lifetimes - shorter for security
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Reduced from 60
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),     # Reduced from 7
    
    # Token rotation - mandatory
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    # Algorithm and signing
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,
    
    # Token types
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # User identification
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    # Token claims
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}


# =============================================================================
# CORS CONFIGURATION (Cross-Origin Resource Sharing) - HARDENED
# =============================================================================

# NEVER allow all origins - explicitly list allowed origins
CORS_ALLOW_ALL_ORIGINS = False

# Allowed origins from environment (comma-separated)
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000'
    ).split(',')
    if origin.strip()
]

# Only allow credentials if strictly necessary
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Restrict methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]


# =============================================================================
# SECURITY HEADERS AND SETTINGS
# =============================================================================

# HTTPS/SSL Settings (enable in production)
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session and CSRF cookie security
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# Session timeout (30 minutes of inactivity)
SESSION_COOKIE_AGE = 1800
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# HSTS (HTTP Strict Transport Security)
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Prevent clickjacking
X_FRAME_OPTIONS = 'DENY'

# Prevent MIME sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# XSS Protection (legacy, but still useful)
SECURE_BROWSER_XSS_FILTER = True

# Referrer policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'


# =============================================================================
# CONTENT SECURITY POLICY (CSP)
# =============================================================================

CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "script-src": [
            "'self'",
            "'unsafe-inline'",  # Required for Tailwind CDN - consider self-hosting
            "https://cdn.tailwindcss.com",
        ],
        "style-src": [
            "'self'",
            "'unsafe-inline'",  # Required for Tailwind - consider self-hosting
            "https://fonts.googleapis.com",
        ],
        "font-src": [
            "'self'",
            "https://fonts.gstatic.com",
        ],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
    }
}


# =============================================================================
# DJANGO-AXES CONFIGURATION (Brute-force Protection)
# =============================================================================

# Enable axes
AXES_ENABLED = True

# Lock out after 5 failed attempts
AXES_FAILURE_LIMIT = 5

# Lock out for 30 minutes
AXES_COOLOFF_TIME = timedelta(minutes=30)

# Track by username AND IP (more secure)
AXES_LOCKOUT_PARAMETERS = ['username', 'ip_address']

# Lock out only the specific combination
AXES_LOCK_OUT_BY_COMBINATION = True

# Reset failed attempts on successful login
AXES_RESET_ON_SUCCESS = True

# Use database for tracking (works with any cache backend)
AXES_HANDLER = 'axes.handlers.database.AxesDatabaseHandler'

# Verbose logging for security monitoring
AXES_VERBOSE = True

# Custom lockout response
AXES_LOCKOUT_CALLABLE = None  # Uses default JSON response


# =============================================================================
# LOGGING CONFIGURATION - SECURITY FOCUSED
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'security': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'security',
        },
        'security_file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'security.log',
            'formatter': 'security',
        },
    },
    'loggers': {
        'axes': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    },
}

# Create logs directory if it doesn't exist
(BASE_DIR / 'logs').mkdir(exist_ok=True)


# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================

# Email backend - use console in development, SMTP in production
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@collabhub.com')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Frontend URL for email links (verification, password reset)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8000')


# =============================================================================
# PERMISSIONS POLICY (Feature Policy)
# =============================================================================

# Restrict browser features for security
PERMISSIONS_POLICY = {
    'accelerometer': [],
    'camera': [],
    'geolocation': [],
    'gyroscope': [],
    'magnetometer': [],
    'microphone': [],
    'payment': [],
    'usb': [],
}


# =============================================================================
# REQUEST SIZE LIMITS
# =============================================================================

# Maximum request body size (2MB for regular requests)
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024  # 2MB

# Maximum number of form fields
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100

# Maximum file upload size (10MB)
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# File upload handlers
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.MemoryFileUploadHandler',
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

# Allowed file types for uploads
ALLOWED_UPLOAD_MIMETYPES = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'application/pdf',
]

# Maximum avatar size (2MB)
MAX_AVATAR_SIZE = 2 * 1024 * 1024


# =============================================================================
# CAPTCHA CONFIGURATION
# =============================================================================

# CAPTCHA provider: 'hcaptcha' or 'recaptcha'
CAPTCHA_PROVIDER = os.environ.get('CAPTCHA_PROVIDER', 'hcaptcha')

# CAPTCHA keys (set in production)
CAPTCHA_SECRET_KEY = os.environ.get('CAPTCHA_SECRET_KEY', '')
CAPTCHA_SITE_KEY = os.environ.get('CAPTCHA_SITE_KEY', '')

# Enable/disable CAPTCHA (disabled in DEBUG mode by default)
CAPTCHA_ENABLED = os.environ.get('CAPTCHA_ENABLED', 'False').lower() == 'true' if DEBUG else True

# reCAPTCHA v3 score threshold (0.0 - 1.0, higher = more strict)
CAPTCHA_SCORE_THRESHOLD = float(os.environ.get('CAPTCHA_SCORE_THRESHOLD', '0.5'))



