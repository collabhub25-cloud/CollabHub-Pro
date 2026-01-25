"""
Collaborations App - Serializers
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Application, TeamInvitation, Connection, Notification
from users.serializers import UserListSerializer


class ApplicationSerializer(serializers.ModelSerializer):
    """Full serializer for Application model."""
    
    applicant = UserListSerializer(read_only=True)
    opportunity_title = serializers.CharField(source='opportunity.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id', 'opportunity', 'opportunity_title', 'applicant',
            'cover_letter', 'resume_url', 'portfolio_url',
            'status', 'status_display', 'feedback', 'rating',
            'applied_at', 'updated_at', 'reviewed_at'
        ]
        read_only_fields = ['applicant', 'applied_at', 'updated_at', 'reviewed_at']


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications."""
    
    class Meta:
        model = Application
        fields = ['opportunity', 'cover_letter', 'resume_url', 'portfolio_url']


class ApplicationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating application status (by opportunity owner)."""
    
    class Meta:
        model = Application
        fields = ['status', 'feedback', 'rating']
    
    def update(self, instance, validated_data):
        instance.reviewed_at = timezone.now()
        return super().update(instance, validated_data)


class TeamInvitationSerializer(serializers.ModelSerializer):
    """Serializer for team invitations."""
    
    inviter = UserListSerializer(read_only=True)
    invitee = UserListSerializer(read_only=True)
    startup_name = serializers.CharField(source='startup.name', read_only=True)
    opportunity_title = serializers.CharField(source='opportunity.title', read_only=True)
    
    class Meta:
        model = TeamInvitation
        fields = [
            'id', 'inviter', 'invitee', 'invitee_id',
            'startup', 'startup_name', 'opportunity', 'opportunity_title',
            'role', 'message', 'status',
            'created_at', 'responded_at', 'expires_at'
        ]
        read_only_fields = ['inviter', 'created_at', 'responded_at']
    
    invitee_id = serializers.IntegerField(write_only=True)


class ConnectionSerializer(serializers.ModelSerializer):
    """Serializer for connections."""
    
    requester = UserListSerializer(read_only=True)
    receiver = UserListSerializer(read_only=True)
    
    class Meta:
        model = Connection
        fields = ['id', 'requester', 'receiver', 'status', 'created_at', 'updated_at']
        read_only_fields = ['requester', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    
    related_user = UserListSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message', 'link',
            'related_user', 'is_read', 'created_at'
        ]
        read_only_fields = ['type', 'title', 'message', 'link', 'related_user', 'created_at']
