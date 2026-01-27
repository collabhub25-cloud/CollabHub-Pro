"""
Multi-Factor Authentication (MFA) Module

Provides TOTP-based two-factor authentication using pyotp.
Supports QR code generation for authenticator apps.
"""

import pyotp
import qrcode
import base64
import secrets
from io import BytesIO
from django.conf import settings


def generate_totp_secret():
    """
    Generate a new TOTP secret for MFA setup.
    
    Returns:
        Base32-encoded secret string
    """
    return pyotp.random_base32()


def get_totp(secret):
    """
    Get TOTP instance for a secret.
    
    Args:
        secret: Base32-encoded secret
    
    Returns:
        pyotp.TOTP instance
    """
    return pyotp.TOTP(secret)


def verify_totp(secret, code):
    """
    Verify a TOTP code.
    
    Args:
        secret: Base32-encoded secret
        code: 6-digit code from authenticator app
    
    Returns:
        Boolean indicating if code is valid
    """
    totp = get_totp(secret)
    return totp.verify(code, valid_window=1)  # Allow 30s window


def get_provisioning_uri(secret, email, issuer=None):
    """
    Get the provisioning URI for QR code generation.
    
    Args:
        secret: Base32-encoded secret
        email: User's email address
        issuer: App name (defaults to settings.SITE_NAME or 'CollabHub')
    
    Returns:
        otpauth:// URI string
    """
    issuer = issuer or getattr(settings, 'SITE_NAME', 'CollabHub')
    totp = get_totp(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code(secret, email, issuer=None):
    """
    Generate a QR code image for MFA setup.
    
    Args:
        secret: Base32-encoded secret
        email: User's email address
        issuer: App name
    
    Returns:
        Base64-encoded PNG image data
    """
    uri = get_provisioning_uri(secret, email, issuer)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def generate_backup_codes(count=10):
    """
    Generate backup codes for MFA recovery.
    
    Args:
        count: Number of codes to generate
    
    Returns:
        List of 8-character alphanumeric codes
    """
    codes = []
    for _ in range(count):
        # Generate 8-character codes (easier to type than longer ones)
        code = secrets.token_hex(4).upper()
        codes.append(code)
    return codes


def hash_backup_codes(codes):
    """
    Hash backup codes for secure storage.
    
    Args:
        codes: List of plain-text backup codes
    
    Returns:
        List of hashed codes
    """
    from django.contrib.auth.hashers import make_password
    return [make_password(code) for code in codes]


def verify_backup_code(plain_code, hashed_codes):
    """
    Verify a backup code against stored hashes.
    
    Args:
        plain_code: User-entered backup code
        hashed_codes: List of hashed backup codes
    
    Returns:
        Tuple of (is_valid, index_of_used_code or -1)
    """
    from django.contrib.auth.hashers import check_password
    
    plain_code = plain_code.upper().replace('-', '').replace(' ', '')
    
    for i, hashed in enumerate(hashed_codes):
        if check_password(plain_code, hashed):
            return True, i
    
    return False, -1


class MFAMixin:
    """
    Mixin for views that require MFA verification.
    
    Usage:
        class SensitiveActionView(MFAMixin, APIView):
            def post(self, request):
                if not self.verify_mfa(request):
                    return Response({'error': 'MFA required'}, status=403)
                # ... proceed with action
    """
    
    mfa_code_field = 'mfa_code'
    
    def get_mfa_code(self, request):
        """Extract MFA code from request."""
        return (
            request.data.get(self.mfa_code_field) or
            request.headers.get('X-MFA-Code')
        )
    
    def verify_mfa(self, request):
        """
        Verify MFA for the request.
        
        Returns:
            dict with 'success', 'error', and 'requires_mfa' keys
        """
        user = request.user
        
        # Check if user has MFA enabled
        if not getattr(user, 'mfa_enabled', False):
            return {'success': True, 'requires_mfa': False}
        
        code = self.get_mfa_code(request)
        if not code:
            return {
                'success': False,
                'requires_mfa': True,
                'error': 'MFA code required'
            }
        
        # Try TOTP verification
        if hasattr(user, 'mfa_secret') and user.mfa_secret:
            if verify_totp(user.mfa_secret, code):
                return {'success': True, 'requires_mfa': True}
        
        # Try backup code
        if hasattr(user, 'backup_codes') and user.backup_codes:
            valid, index = verify_backup_code(code, user.backup_codes)
            if valid:
                # Remove used backup code
                codes = list(user.backup_codes)
                codes.pop(index)
                user.backup_codes = codes
                user.save(update_fields=['backup_codes'])
                return {'success': True, 'requires_mfa': True, 'used_backup_code': True}
        
        # Log failed MFA attempt
        from security.logger import log_mfa_failed
        log_mfa_failed(user, request)
        
        return {
            'success': False,
            'requires_mfa': True,
            'error': 'Invalid MFA code'
        }
