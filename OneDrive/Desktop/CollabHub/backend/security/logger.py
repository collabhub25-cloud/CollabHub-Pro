"""
Security Event Logger

Provides utility functions for logging security events.
Integrates with Django signals and can be called directly.
"""

from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger('django.security')


def get_client_ip(request):
    """Extract client IP from request, handling proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_user_agent(request):
    """Extract user agent from request."""
    return request.META.get('HTTP_USER_AGENT', '')[:500]


def log_security_event(
    event_type,
    user=None,
    request=None,
    severity='info',
    details=None,
    ip_address=None,
    user_agent=None
):
    """
    Log a security event to the database and optionally to file.
    
    Args:
        event_type: One of SecurityEvent.EventType choices
        user: User instance (optional)
        request: Django request object (optional, used to extract IP/UA)
        severity: 'info', 'warning', or 'critical'
        details: Additional JSON-serializable data
        ip_address: Override IP (uses request if not provided)
        user_agent: Override UA (uses request if not provided)
    
    Returns:
        SecurityEvent instance
    """
    from .models import SecurityEvent
    
    # Extract info from request if provided
    if request:
        ip_address = ip_address or get_client_ip(request)
        user_agent = user_agent or get_user_agent(request)
        if not user and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
    
    # Create the event
    event = SecurityEvent.objects.create(
        user=user,
        event_type=event_type,
        severity=severity,
        ip_address=ip_address,
        user_agent=user_agent or '',
        details=details or {}
    )
    
    # Also log to file for real-time monitoring
    log_message = f"[{severity.upper()}] {event_type}"
    if user:
        log_message += f" | user:{user.email}"
    if ip_address:
        log_message += f" | ip:{ip_address}"
    if details:
        log_message += f" | {details}"
    
    if severity == 'critical':
        logger.critical(log_message)
    elif severity == 'warning':
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    return event


def log_login_success(user, request):
    """Log successful login."""
    return log_security_event(
        event_type='login_success',
        user=user,
        request=request,
        severity='info'
    )


def log_login_failed(email, request, reason='invalid_credentials'):
    """Log failed login attempt."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user = None
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        pass
    
    return log_security_event(
        event_type='login_failed',
        user=user,
        request=request,
        severity='warning',
        details={'email': email, 'reason': reason}
    )


def log_password_change(user, request):
    """Log password change."""
    return log_security_event(
        event_type='password_change',
        user=user,
        request=request,
        severity='info'
    )


def log_password_reset_request(user, request):
    """Log password reset request."""
    return log_security_event(
        event_type='password_reset_request',
        user=user,
        request=request,
        severity='info'
    )


def log_password_reset_complete(user, request):
    """Log password reset completion."""
    return log_security_event(
        event_type='password_reset_complete',
        user=user,
        request=request,
        severity='info'
    )


def log_mfa_enabled(user, request):
    """Log MFA enablement."""
    return log_security_event(
        event_type='mfa_enabled',
        user=user,
        request=request,
        severity='info'
    )


def log_mfa_disabled(user, request):
    """Log MFA disablement."""
    return log_security_event(
        event_type='mfa_disabled',
        user=user,
        request=request,
        severity='warning'
    )


def log_mfa_failed(user, request):
    """Log failed MFA verification."""
    return log_security_event(
        event_type='mfa_failed',
        user=user,
        request=request,
        severity='warning'
    )


def log_role_change(user, old_role, new_role, changed_by, request=None):
    """Log role change."""
    return log_security_event(
        event_type='role_change',
        user=user,
        request=request,
        severity='warning',
        details={
            'old_role': old_role,
            'new_role': new_role,
            'changed_by': changed_by.email if changed_by else 'system'
        }
    )


def log_admin_action(admin_user, action, target, request=None):
    """Log admin action."""
    return log_security_event(
        event_type='admin_action',
        user=admin_user,
        request=request,
        severity='warning',
        details={'action': action, 'target': str(target)}
    )


def log_suspicious_activity(user, activity_type, request=None, details=None):
    """Log suspicious activity for investigation."""
    return log_security_event(
        event_type='suspicious_activity',
        user=user,
        request=request,
        severity='critical',
        details={'activity_type': activity_type, **(details or {})}
    )


def log_account_locked(user, request=None, reason='too_many_failures'):
    """Log account lockout."""
    return log_security_event(
        event_type='account_locked',
        user=user,
        request=request,
        severity='warning',
        details={'reason': reason}
    )


def log_data_export(user, request):
    """Log data export request (GDPR)."""
    return log_security_event(
        event_type='data_export',
        user=user,
        request=request,
        severity='info'
    )


def log_account_deletion(user, request):
    """Log account deletion request (GDPR)."""
    return log_security_event(
        event_type='account_deletion',
        user=user,
        request=request,
        severity='warning'
    )
