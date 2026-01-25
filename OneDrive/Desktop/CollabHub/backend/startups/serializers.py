"""
Startups App - Serializers
"""

from rest_framework import serializers
from .models import Startup, StartupMember, StartupUpdate
from users.serializers import UserListSerializer


class StartupMemberSerializer(serializers.ModelSerializer):
    """Serializer for startup team members."""
    
    user = UserListSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = StartupMember
        fields = ['id', 'user', 'user_id', 'role', 'title', 'joined_at']
        read_only_fields = ['joined_at']


class StartupUpdateSerializer(serializers.ModelSerializer):
    """Serializer for startup updates."""
    
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = StartupUpdate
        fields = ['id', 'title', 'content', 'image_url', 'author_name', 'created_at']
        read_only_fields = ['created_at']


class StartupSerializer(serializers.ModelSerializer):
    """Full serializer for Startup model."""
    
    founder = UserListSerializer(read_only=True)
    members = StartupMemberSerializer(many=True, read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Startup
        fields = [
            'id', 'name', 'tagline', 'description', 'logo', 'cover_image',
            'industry', 'stage', 'stage_display', 'status', 'status_display',
            'founded_date', 'location', 'is_remote', 'website', 'pitch_deck_url',
            'founder', 'team_size', 'members', 'total_views', 'total_applications',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['founder', 'total_views', 'total_applications', 'created_at', 'updated_at']


class StartupListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for startup lists."""
    
    founder_name = serializers.CharField(source='founder.get_full_name', read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    
    class Meta:
        model = Startup
        fields = [
            'id', 'name', 'tagline', 'logo', 'industry', 'stage', 
            'stage_display', 'status', 'location', 'is_remote',
            'founder_name', 'team_size', 'created_at'
        ]


class StartupCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating startups."""
    
    class Meta:
        model = Startup
        fields = [
            'name', 'tagline', 'description', 'logo', 'cover_image',
            'industry', 'stage', 'status', 'founded_date',
            'location', 'is_remote', 'website', 'pitch_deck_url', 'team_size'
        ]
