"""
Users App - Views

API views for user management, authentication, and profiles.
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Profile, Skill, UserSkill
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
    UserListSerializer,
    ProfileSerializer,
    SkillSerializer,
    ChangePasswordSerializer
)

User = get_user_model()


class LoginView(APIView):
    """
    Custom login endpoint that returns user data along with tokens.
    SECURITY: Blocks login for unverified email addresses.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        from django.conf import settings
        
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'detail': 'Email and password are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate using email
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return Response({
                'detail': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'detail': 'Account is disabled.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # SECURITY: Check email verification (skip in DEBUG mode for testing)
        if not settings.DEBUG and not user.is_verified:
            return Response({
                'detail': 'Please verify your email address before logging in.',
                'code': 'email_not_verified',
                'email': user.email
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)



# =============================================================================
# AUTHENTICATION VIEWS
# =============================================================================

class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    Creates a new user and returns user data with tokens.
    SECURITY: Sends verification email in production mode.
    """
    
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        from django.conf import settings
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # SECURITY: User starts as unverified
        user.is_verified = settings.DEBUG  # Auto-verify in debug mode
        user.save()
        
        # Send verification email in production
        verification_sent = False
        if not settings.DEBUG:
            try:
                from .models import EmailVerificationToken
                from .email_verification import send_verification_email
                token_obj = EmailVerificationToken.create_token(user)
                verification_sent = send_verification_email(user, token_obj.token)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to send verification email: {e}")
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        response_data = {
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Registration successful'
        }
        
        # Add verification status in production
        if not settings.DEBUG:
            response_data['verification_required'] = True
            response_data['verification_email_sent'] = verification_sent
            response_data['message'] = 'Registration successful. Please check your email to verify your account.'
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """
    Logout endpoint.
    Blacklists the refresh token to prevent further use.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# USER VIEWS
# =============================================================================

class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    Get or update current authenticated user.
    GET: Returns user details with profile
    PUT/PATCH: Updates user and profile
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    """Get user details by ID."""
    
    queryset = User.objects.select_related('profile').prefetch_related('user_skills__skill')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserListView(generics.ListAPIView):
    """
    List users with filtering and search.
    Supports filtering by role and search by name/email.
    """
    
    queryset = User.objects.select_related('profile').filter(is_active=True)
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_verified']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']


class ChangePasswordView(generics.UpdateAPIView):
    """Change user password."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = self.get_object()
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)


# =============================================================================
# SKILL VIEWS
# =============================================================================

class SkillListView(generics.ListCreateAPIView):
    """List all skills or create new ones."""
    
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'category']


class UserSkillsView(APIView):
    """Manage current user's skills."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current user's skills."""
        user_skills = UserSkill.objects.filter(user=request.user).select_related('skill')
        data = [{
            'id': us.id,
            'skill': SkillSerializer(us.skill).data,
            'proficiency': us.proficiency
        } for us in user_skills]
        return Response(data)
    
    def post(self, request):
        """Add a skill to current user."""
        skill_id = request.data.get('skill_id')
        proficiency = request.data.get('proficiency', 'intermediate')
        
        try:
            skill = Skill.objects.get(id=skill_id)
        except Skill.DoesNotExist:
            return Response({
                'error': 'Skill not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        user_skill, created = UserSkill.objects.get_or_create(
            user=request.user,
            skill=skill,
            defaults={'proficiency': proficiency}
        )
        
        if not created:
            user_skill.proficiency = proficiency
            user_skill.save()
        
        return Response({
            'id': user_skill.id,
            'skill': SkillSerializer(skill).data,
            'proficiency': user_skill.proficiency
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    def delete(self, request):
        """Remove a skill from current user."""
        skill_id = request.data.get('skill_id')
        
        try:
            user_skill = UserSkill.objects.get(user=request.user, skill_id=skill_id)
            user_skill.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserSkill.DoesNotExist:
            return Response({
                'error': 'Skill not found in your profile'
            }, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# EMAIL VERIFICATION VIEWS
# =============================================================================

class VerifyEmailView(APIView):
    """Verify user email with token."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, token):
        from .models import EmailVerificationToken
        
        user = EmailVerificationToken.verify_token(token)
        if user:
            return Response({
                'message': 'Email verified successfully! You can now log in.',
                'verified': True
            }, status=status.HTTP_200_OK)
        
        return Response({
            'detail': 'Invalid or expired verification link.',
            'verified': False
        }, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """Resend verification email."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        from .models import EmailVerificationToken
        from .email_verification import send_verification_email
        from django.conf import settings
        
        email = request.data.get('email')
        if not email:
            return Response({
                'detail': 'Email is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal whether email exists
            return Response({
                'message': 'If this email is registered, a verification link will be sent.'
            }, status=status.HTTP_200_OK)
        
        if user.is_verified:
            return Response({
                'message': 'Email is already verified.'
            }, status=status.HTTP_200_OK)
        
        # Create and send new token
        if not settings.DEBUG:
            token_obj = EmailVerificationToken.create_token(user)
            send_verification_email(user, token_obj.token)
        
        return Response({
            'message': 'If this email is registered, a verification link will be sent.'
        }, status=status.HTTP_200_OK)


# =============================================================================
# PASSWORD RESET VIEWS
# =============================================================================

class PasswordResetRequestView(APIView):
    """Request a password reset email."""
    permission_classes = [permissions.AllowAny]
    
    def get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
    
    def post(self, request):
        from .models import PasswordResetToken
        from .password_reset import send_password_reset_email
        
        email = request.data.get('email')
        if not email:
            return Response({
                'detail': 'Email is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email=email)
            ip_address = self.get_client_ip(request)
            token_obj = PasswordResetToken.create_token(user, ip_address=ip_address)
            send_password_reset_email(user, token_obj.token, ip_address)
        except User.DoesNotExist:
            pass  # Don't reveal email existence
        
        return Response({
            'message': 'If this email is registered, a password reset link will be sent.'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, token):
        """Validate token before showing reset form."""
        from .models import PasswordResetToken
        
        token_obj = PasswordResetToken.verify_token(token)
        if token_obj:
            return Response({
                'valid': True,
                'message': 'Token is valid. You can reset your password.'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'valid': False,
            'detail': 'Invalid or expired reset link.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request, token):
        """Reset password with valid token."""
        from .models import PasswordResetToken
        
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 8:
            return Response({
                'detail': 'Password must be at least 8 characters.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = PasswordResetToken.reset_password(token, new_password)
        if user:
            return Response({
                'message': 'Password reset successfully! You can now log in.'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'detail': 'Invalid or expired reset link.'
        }, status=status.HTTP_400_BAD_REQUEST)

