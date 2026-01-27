"""
Audit Logging Module

Provides automatic audit trail for model changes.
Uses Django signals to track CREATE, UPDATE, DELETE operations.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
import threading

# Thread-local storage for request context
_thread_locals = threading.local()


def set_current_user(user):
    """Set the current user for audit logging."""
    _thread_locals.user = user


def get_current_user():
    """Get the current user for audit logging."""
    return getattr(_thread_locals, 'user', None)


def set_current_request(request):
    """Set the current request for audit logging."""
    _thread_locals.request = request


def get_current_request():
    """Get the current request for audit logging."""
    return getattr(_thread_locals, 'request', None)


class AuditMiddleware:
    """
    Middleware to capture user and request for audit logging.
    
    Add to MIDDLEWARE in settings.py.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        set_current_request(request)
        if hasattr(request, 'user') and request.user.is_authenticated:
            set_current_user(request.user)
        else:
            set_current_user(None)
        
        response = self.get_response(request)
        
        # Clean up
        set_current_user(None)
        set_current_request(None)
        
        return response


def get_client_ip(request):
    """Extract client IP from request."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_audit(action, instance, changes=None):
    """
    Log an audit event for a model instance.
    
    Args:
        action: 'create', 'update', or 'delete'
        instance: The model instance that changed
        changes: Dict of field changes for updates
    """
    from .models import AuditLog
    
    user = get_current_user()
    request = get_current_request()
    
    # Skip logging for AuditLog and SecurityEvent to prevent recursion
    model_name = instance.__class__.__name__
    if model_name in ('AuditLog', 'SecurityEvent', 'Session'):
        return
    
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
        changes=changes or {},
        ip_address=get_client_ip(request) if request else None
    )


# Models to track (add your model names here)
AUDITED_MODELS = [
    'User', 'Profile', 'Startup', 'Opportunity', 'Collaboration',
    'Message', 'Conversation', 'Connection', 'Application'
]


def should_audit(instance):
    """Check if this model instance should be audited."""
    return instance.__class__.__name__ in AUDITED_MODELS


# Store pre-save state for detecting changes
_pre_save_state = {}


@receiver(pre_save)
def audit_pre_save(sender, instance, **kwargs):
    """Capture pre-save state for change detection."""
    if not should_audit(instance):
        return
    
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            _pre_save_state[f"{sender.__name__}:{instance.pk}"] = {
                field.name: getattr(old_instance, field.name)
                for field in sender._meta.fields
                if not field.primary_key
            }
        except sender.DoesNotExist:
            pass


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    """Log CREATE or UPDATE after save."""
    if not should_audit(instance):
        return
    
    if created:
        log_audit('create', instance)
    else:
        # Detect changes
        key = f"{sender.__name__}:{instance.pk}"
        old_state = _pre_save_state.pop(key, {})
        
        changes = {}
        for field in sender._meta.fields:
            if field.primary_key:
                continue
            field_name = field.name
            old_value = old_state.get(field_name)
            new_value = getattr(instance, field_name)
            
            # Skip password fields for security
            if 'password' in field_name.lower():
                if old_value != new_value:
                    changes[field_name] = '[CHANGED]'
                continue
            
            if old_value != new_value:
                # Convert to string for JSON serialization
                changes[field_name] = {
                    'old': str(old_value) if old_value is not None else None,
                    'new': str(new_value) if new_value is not None else None
                }
        
        if changes:
            log_audit('update', instance, changes)


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    """Log DELETE after deletion."""
    if not should_audit(instance):
        return
    
    log_audit('delete', instance)
