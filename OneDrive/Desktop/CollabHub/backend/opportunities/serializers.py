"""
Opportunities App - Serializers
"""

from rest_framework import serializers
from .models import Opportunity, SavedOpportunity
from users.serializers import UserListSerializer


class OpportunitySerializer(serializers.ModelSerializer):
    """Full serializer for Opportunity model."""
    
    created_by = UserListSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    is_saved = serializers.SerializerMethodField()
    
    class Meta:
        model = Opportunity
        fields = [
            'id', 'title', 'type', 'type_display', 'description', 'short_description',
            'cover_image', 'organization', 'difficulty', 'difficulty_display',
            'location', 'is_remote', 'team_size_min', 'team_size_max',
            'start_date', 'end_date', 'deadline', 'required_skills',
            'perks', 'prize_amount', 'website_url', 'registration_url',
            'status', 'status_display', 'is_featured', 'created_by', 'startup',
            'total_views', 'total_applications', 'is_saved',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'total_views', 'total_applications', 'created_at', 'updated_at']
    
    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedOpportunity.objects.filter(
                user=request.user,
                opportunity=obj
            ).exists()
        return False


class OpportunityListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for opportunity lists."""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    organization_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Opportunity
        fields = [
            'id', 'title', 'type', 'type_display', 'short_description',
            'cover_image', 'organization', 'organization_name', 'difficulty', 
            'difficulty_display', 'location', 'is_remote', 'deadline',
            'required_skills', 'prize_amount', 'status', 'is_featured',
            'total_applications', 'created_at'
        ]
    
    def get_organization_name(self, obj):
        if obj.startup:
            return obj.startup.name
        return obj.organization


class OpportunityCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating opportunities."""
    
    class Meta:
        model = Opportunity
        fields = [
            'title', 'type', 'description', 'short_description', 'cover_image',
            'organization', 'difficulty', 'location', 'is_remote',
            'team_size_min', 'team_size_max', 'start_date', 'end_date', 'deadline',
            'required_skills', 'perks', 'prize_amount', 'website_url', 
            'registration_url', 'status', 'is_featured', 'startup'
        ]


class SavedOpportunitySerializer(serializers.ModelSerializer):
    """Serializer for saved opportunities."""
    
    opportunity = OpportunityListSerializer(read_only=True)
    
    class Meta:
        model = SavedOpportunity
        fields = ['id', 'opportunity', 'saved_at']
