"""
Security App - Serializers
"""

from rest_framework import serializers
from .models import PrivacySettings, ConsentRecord, SecurityEvent


class PrivacySettingsSerializer(serializers.ModelSerializer):
    """Serializer for user privacy settings."""
    
    class Meta:
        model = PrivacySettings
        fields = [
            'profile_visibility',
            'show_email',
            'show_location',
            'show_last_active',
            'allow_messages_from',
            'searchable'
        ]


class ConsentSerializer(serializers.ModelSerializer):
    """Serializer for consent records."""
    
    class Meta:
        model = ConsentRecord
        fields = ['consent_type', 'granted', 'timestamp']
        read_only_fields = ['timestamp']


class SecurityEventSerializer(serializers.ModelSerializer):
    """Serializer for security events (read-only)."""
    
    class Meta:
        model = SecurityEvent
        fields = ['event_type', 'severity', 'ip_address', 'timestamp', 'details']
        read_only_fields = fields
