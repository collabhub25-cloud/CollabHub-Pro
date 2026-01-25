"""
Users App - Authentication URLs

Endpoints for registration, login, logout, and token refresh.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..views import RegisterView, LogoutView, LoginView


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
]


