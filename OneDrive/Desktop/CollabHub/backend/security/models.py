"""
Security App - Models

Models for security event logging, audit trails, GDPR compliance,
and privacy settings.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


class SecurityEvent(models.Model):
    """
    Logs security-relevant events for monitoring and compliance.
    
    Events include: login attempts, password changes, MFA events,
    role changes, admin actions, and suspicious activity.
    """
    
    class EventType(models.TextChoices):
        LOGIN_SUCCESS = 'login_success', 'Login Success'
        LOGIN_FAILED = 'login_failed', 'Login Failed'
        LOGOUT = 'logout', 'Logout'
        PASSWORD_CHANGE = 'password_change', 'Password Change'
        PASSWORD_RESET_REQUEST = 'password_reset_request', 'Password Reset Request'
        PASSWORD_RESET_COMPLETE = 'password_reset_complete', 'Password Reset Complete'
        MFA_ENABLED = 'mfa_enabled', 'MFA Enabled'
        MFA_DISABLED = 'mfa_disabled', 'MFA Disabled'
        MFA_FAILED = 'mfa_failed', 'MFA Verification Failed'
        ROLE_CHANGE = 'role_change', 'Role Change'
        ADMIN_ACTION = 'admin_action', 'Admin Action'
        TOKEN_REFRESH = 'token_refresh', 'Token Refresh'
        TOKEN_BLACKLIST = 'token_blacklist', 'Token Blacklisted'
        ACCOUNT_LOCKED = 'account_locked', 'Account Locked'
        ACCOUNT_UNLOCKED = 'account_unlocked', 'Account Unlocked'
        SUSPICIOUS_ACTIVITY = 'suspicious_activity', 'Suspicious Activity'
        DATA_EXPORT = 'data_export', 'Data Export Requested'
        ACCOUNT_DELETION = 'account_deletion', 'Account Deletion Requested'
    
    class Severity(models.TextChoices):
        INFO = 'info', 'Info'
        WARNING = 'warning', 'Warning'
        CRITICAL = 'critical', 'Critical'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_events'
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices, db_index=True)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'security_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'event_type', '-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.user} at {self.timestamp}"


class AuditLog(models.Model):
    """
    Tracks changes to models for audit trail and compliance.
    
    Records who changed what, when, and what the changes were.
    """
    
    class Action(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} {self.model_name}:{self.object_id} by {self.user}"


class ConsentRecord(models.Model):
    """
    GDPR consent tracking.
    
    Records user consent for various data processing activities.
    """
    
    class ConsentType(models.TextChoices):
        TERMS_OF_SERVICE = 'tos', 'Terms of Service'
        PRIVACY_POLICY = 'privacy', 'Privacy Policy'
        MARKETING_EMAIL = 'marketing', 'Marketing Emails'
        DATA_ANALYTICS = 'analytics', 'Data Analytics'
        THIRD_PARTY_SHARING = 'third_party', 'Third Party Sharing'
        COOKIES = 'cookies', 'Cookie Consent'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_records'
    )
    consent_type = models.CharField(max_length=50, choices=ConsentType.choices)
    granted = models.BooleanField(default=False)
    consent_text = models.TextField(blank=True, help_text="Version of consent text shown")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'consent_records'
        ordering = ['-timestamp']
        unique_together = ['user', 'consent_type']
    
    def __str__(self):
        status = 'granted' if self.granted else 'revoked'
        return f"{self.consent_type} {status} by {self.user}"


class DataDeletionRequest(models.Model):
    """
    GDPR right to erasure (data deletion) requests.
    
    Tracks the status of user data deletion requests.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='deletion_requests'
    )
    user_email = models.EmailField(help_text="Stored in case user is deleted")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reason = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    deletion_log = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'data_deletion_requests'
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Deletion request for {self.user_email} - {self.status}"


class PrivacySettings(models.Model):
    """
    User privacy preferences.
    
    Controls visibility and data sharing options.
    """
    
    class ProfileVisibility(models.TextChoices):
        PUBLIC = 'public', 'Public'
        CONNECTIONS = 'connections', 'Connections Only'
        PRIVATE = 'private', 'Private'
    
    class MessagePermission(models.TextChoices):
        EVERYONE = 'everyone', 'Everyone'
        CONNECTIONS = 'connections', 'Connections Only'
        NONE = 'none', 'No One'
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='privacy_settings'
    )
    profile_visibility = models.CharField(
        max_length=20,
        choices=ProfileVisibility.choices,
        default=ProfileVisibility.PUBLIC
    )
    show_email = models.BooleanField(default=False)
    show_location = models.BooleanField(default=True)
    show_last_active = models.BooleanField(default=True)
    allow_messages_from = models.CharField(
        max_length=20,
        choices=MessagePermission.choices,
        default=MessagePermission.EVERYONE
    )
    searchable = models.BooleanField(default=True, help_text="Appear in search results")
    
    class Meta:
        db_table = 'privacy_settings'
        verbose_name_plural = 'Privacy settings'
    
    def __str__(self):
        return f"Privacy settings for {self.user}"
