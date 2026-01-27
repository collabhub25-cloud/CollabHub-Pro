"""
Users App - Authentication URLs

Endpoints for registration, login, logout, token refresh,
email verification, password reset, and MFA.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..views import (
    RegisterView, LogoutView, LoginView,
    VerifyEmailView, ResendVerificationView,
    PasswordResetRequestView, PasswordResetConfirmView
)
from ..mfa_views import (
    MFASetupView, MFAVerifyView, MFADisableView,
    MFABackupCodesView, MFAStatusView
)


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_index(request):
    """API endpoint listing all auth routes."""
    return Response({
        'message': 'CollabHub Authentication API',
        'endpoints': {
            'register': '/api/auth/register/',
            'login': '/api/auth/login/',
            'refresh': '/api/auth/refresh/',
            'logout': '/api/auth/logout/',
            'verify_email': '/api/auth/verify-email/<token>/',
            'resend_verification': '/api/auth/resend-verification/',
            'password_reset': '/api/auth/password-reset/',
            'password_reset_confirm': '/api/auth/password-reset/<token>/',
        }
    })


urlpatterns = [
    # Index
    path('', auth_index, name='auth_index'),
    
    # Registration
    path('register/', RegisterView.as_view(), name='auth_register'),
    
    # Custom login endpoint (returns user data + tokens)
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    
    # Logout (blacklists token)
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    
    # Email Verification
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='auth_resend_verification'),
    
    # Password Reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='auth_password_reset'),
    path('password-reset/<str:token>/', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    
    # MFA (Multi-Factor Authentication)
    path('mfa/status/', MFAStatusView.as_view(), name='auth_mfa_status'),
    path('mfa/setup/', MFASetupView.as_view(), name='auth_mfa_setup'),
    path('mfa/verify/', MFAVerifyView.as_view(), name='auth_mfa_verify'),
    path('mfa/disable/', MFADisableView.as_view(), name='auth_mfa_disable'),
    path('mfa/backup-codes/', MFABackupCodesView.as_view(), name='auth_mfa_backup_codes'),
]

