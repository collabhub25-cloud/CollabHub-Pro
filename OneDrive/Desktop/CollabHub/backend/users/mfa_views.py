"""
MFA Views - Multi-Factor Authentication API Endpoints
"""

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .mfa import (
    generate_totp_secret,
    generate_qr_code,
    verify_totp,
    generate_backup_codes,
    hash_backup_codes
)
from security.logger import log_mfa_enabled, log_mfa_disabled, log_mfa_failed


class MFASetupView(APIView):
    """
    POST: Start MFA setup, returns QR code and secret
    
    User must verify the code before MFA is enabled.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.mfa_enabled:
            return Response(
                {'error': 'MFA is already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new secret
        secret = generate_totp_secret()
        
        # Store temporarily (not enabled yet)
        user.mfa_secret = secret
        user.save(update_fields=['mfa_secret'])
        
        # Generate QR code
        qr_code = generate_qr_code(secret, user.email)
        
        return Response({
            'secret': secret,
            'qr_code': f'data:image/png;base64,{qr_code}',
            'message': 'Scan the QR code with your authenticator app, then verify with a code'
        })


class MFAVerifyView(APIView):
    """
    POST: Verify MFA code and enable MFA
    
    Requires the TOTP code from authenticator app.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        code = request.data.get('code')
        
        if not code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user.mfa_secret:
            return Response(
                {'error': 'Please start MFA setup first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if verify_totp(user.mfa_secret, code):
            # Generate backup codes
            backup_codes = generate_backup_codes(10)
            
            # Enable MFA
            user.mfa_enabled = True
            user.backup_codes = hash_backup_codes(backup_codes)
            user.save(update_fields=['mfa_enabled', 'backup_codes'])
            
            # Log event
            log_mfa_enabled(user, request)
            
            return Response({
                'message': 'MFA enabled successfully',
                'backup_codes': backup_codes,
                'warning': 'Save these backup codes securely. They will not be shown again.'
            })
        else:
            log_mfa_failed(user, request)
            return Response(
                {'error': 'Invalid code'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MFADisableView(APIView):
    """
    POST: Disable MFA
    
    Requires password and current MFA code for security.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        password = request.data.get('password')
        code = request.data.get('code')
        
        if not user.mfa_enabled:
            return Response(
                {'error': 'MFA is not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not password or not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not code or not verify_totp(user.mfa_secret, code):
            log_mfa_failed(user, request)
            return Response(
                {'error': 'Invalid MFA code'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Disable MFA
        user.mfa_enabled = False
        user.mfa_secret = None
        user.backup_codes = []
        user.save(update_fields=['mfa_enabled', 'mfa_secret', 'backup_codes'])
        
        # Log event
        log_mfa_disabled(user, request)
        
        return Response({'message': 'MFA disabled successfully'})


class MFABackupCodesView(APIView):
    """
    POST: Regenerate backup codes
    
    Requires current MFA code for security.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        code = request.data.get('code')
        
        if not user.mfa_enabled:
            return Response(
                {'error': 'MFA is not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not code or not verify_totp(user.mfa_secret, code):
            log_mfa_failed(user, request)
            return Response(
                {'error': 'Invalid MFA code'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate new backup codes
        backup_codes = generate_backup_codes(10)
        user.backup_codes = hash_backup_codes(backup_codes)
        user.save(update_fields=['backup_codes'])
        
        return Response({
            'backup_codes': backup_codes,
            'warning': 'Save these backup codes securely. They will not be shown again.'
        })


class MFAStatusView(APIView):
    """
    GET: Check MFA status for current user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'mfa_enabled': user.mfa_enabled,
            'backup_codes_remaining': len(user.backup_codes) if user.backup_codes else 0
        })
