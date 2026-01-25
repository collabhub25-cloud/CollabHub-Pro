"""
Users App - Serializers

Handles serialization/deserialization of User and Profile models.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Profile, Skill, UserSkill

User = get_user_model()


class SkillSerializer(serializers.ModelSerializer):
    """Serializer for Skill model."""
    
    class Meta:
        model = Skill
        fields = ['id', 'name', 'category']


class UserSkillSerializer(serializers.ModelSerializer):
    """Serializer for UserSkill with nested skill details."""
    
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        source='skill',
        write_only=True
    )
    
    class Meta:
        model = UserSkill
        fields = ['id', 'skill', 'skill_id', 'proficiency']


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for Profile model."""
    
    class Meta:
        model = Profile
        fields = [
            'avatar', 'bio', 'headline', 'location',
            'github_url', 'linkedin_url', 'portfolio_url', 'twitter_url',
            'firm_name', 'investment_stages', 'sectors_of_interest',
            'total_connections', 'total_projects', 'total_collaborations',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['total_connections', 'total_projects', 'total_collaborations', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with nested profile.
    Used for user details and updates.
    """
    
    profile = ProfileSerializer(read_only=True)
    skills = UserSkillSerializer(source='user_skills', many=True, read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'is_verified', 'profile', 'skills',
            'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'email', 'is_verified', 'date_joined', 'last_login']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles password validation and profile creation.
    """
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'role'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                'password': "Passwords don't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information."""
    
    profile = ProfileSerializer()
    
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'role', 'profile']
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for user lists.
    Used in search results and lists.
    """
    
    avatar = serializers.CharField(source='profile.avatar', read_only=True)
    headline = serializers.CharField(source='profile.headline', read_only=True)
    location = serializers.CharField(source='profile.location', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'role', 'is_verified', 'avatar', 'headline', 'location'
        ]
