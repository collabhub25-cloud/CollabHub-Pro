"""
Email Verification Module

Provides secure token-based email verification for user registration.
- Tokens are URL-safe and cryptographically random
- Tokens expire after 24 hours
- One-time use: tokens are invalidated after successful verification
"""

import secrets
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class EmailVerificationToken(models.Model):
    """Stores email verification tokens with expiry."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='verification_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'email_verification_tokens'
    
    @classmethod
    def create_token(cls, user):
        """Create a new verification token for a user."""
        # Invalidate any existing tokens
        cls.objects.filter(user=user, used=False).update(used=True)
        
        # Generate new token
        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timedelta(hours=24)
        
        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
    
    @classmethod
    def verify_token(cls, token):
        """
        Verify a token and return the user if valid.
        Returns None if token is invalid, expired, or already used.
        """
        try:
            token_obj = cls.objects.get(
                token=token,
                used=False,
                expires_at__gt=timezone.now()
            )
            # Mark token as used
            token_obj.used = True
            token_obj.save()
            
            # Mark user as verified
            token_obj.user.is_verified = True
            token_obj.user.save()
            
            return token_obj.user
        except cls.DoesNotExist:
            return None
    
    def is_valid(self):
        """Check if token is still valid."""
        return not self.used and self.expires_at > timezone.now()


def send_verification_email(user, token):
    """Send verification email to user."""
    # Build verification URL
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8000')
    verification_url = f"{frontend_url}/api/auth/verify-email/{token}/"
    
    subject = "Verify your CollabHub account"
    message = f"""
Hello {user.first_name or user.username},

Thank you for registering with CollabHub!

Please click the link below to verify your email address:
{verification_url}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

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
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Welcome to CollabHub!</h2>
        <p>Hello {user.first_name or user.username},</p>
        <p>Thank you for registering! Please verify your email address to get started.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{verification_url}" class="button">Verify Email Address</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0ea5e9;">{verification_url}</p>
        <p>This link will expire in 24 hours.</p>
        <div class="footer">
            <p>If you did not create an account, please ignore this email.</p>
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
        # Log the error but don't expose details
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send verification email: {e}")
        return False
