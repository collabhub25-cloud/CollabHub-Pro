"""
Password Reset Module

Provides secure token-based password reset functionality.
- Tokens are URL-safe and cryptographically random
- Tokens expire after 1 hour (shorter than email verification for security)
- One-time use: tokens are invalidated after successful reset
- Rate limited via django-axes
"""

import secrets
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.contrib.auth.hashers import make_password

User = get_user_model()


class PasswordResetToken(models.Model):
    """Stores password reset tokens with expiry."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'password_reset_tokens'
    
    @classmethod
    def create_token(cls, user, ip_address=None):
        """Create a new password reset token for a user."""
        # Invalidate any existing tokens
        cls.objects.filter(user=user, used=False).update(used=True)
        
        # Generate new token (shorter expiry for security)
        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timedelta(hours=1)
        
        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at,
            ip_address=ip_address
        )
    
    @classmethod
    def verify_token(cls, token):
        """
        Verify a token and return user if valid.
        Does NOT mark as used - that happens when password is actually reset.
        """
        try:
            token_obj = cls.objects.get(
                token=token,
                used=False,
                expires_at__gt=timezone.now()
            )
            return token_obj
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def reset_password(cls, token, new_password):
        """
        Reset password using a valid token.
        Returns the user if successful, None otherwise.
        """
        token_obj = cls.verify_token(token)
        if not token_obj:
            return None
        
        # Update password
        user = token_obj.user
        user.password = make_password(new_password)
        user.save()
        
        # Mark token as used
        token_obj.used = True
        token_obj.save()
        
        # Invalidate all other tokens for this user
        cls.objects.filter(user=user, used=False).update(used=True)
        
        return user
    
    def is_valid(self):
        """Check if token is still valid."""
        return not self.used and self.expires_at > timezone.now()


def send_password_reset_email(user, token, ip_address=None):
    """Send password reset email to user."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8000')
    reset_url = f"{frontend_url}/pages/reset-password.html?token={token}"
    
    subject = "Reset your CollabHub password"
    message = f"""
Hello {user.first_name or user.username},

We received a request to reset your password for your CollabHub account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.
Your password will remain unchanged.

For security reasons, this request was made from IP: {ip_address or 'Unknown'}

Best regards,
The CollabHub Team
"""
    
    html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .button {{ display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #0ea5e9, #d946ef); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }}
        .warning {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Password Reset Request</h2>
        <p>Hello {user.first_name or user.username},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" class="button">Reset Password</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0ea5e9;">{reset_url}</p>
        <div class="warning">
            <strong>⏰ This link expires in 1 hour.</strong><br>
            <strong>🔐 If you didn't request this, ignore this email.</strong>
        </div>
        <p style="font-size: 12px; color: #666;">Request made from IP: {ip_address or 'Unknown'}</p>
        <div class="footer">
            <p>&copy; CollabHub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send password reset email: {e}")
        return False
