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
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
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
    """
    
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)


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
