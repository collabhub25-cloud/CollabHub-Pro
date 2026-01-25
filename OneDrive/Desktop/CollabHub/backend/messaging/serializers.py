"""
Messaging App - Serializers
"""

from rest_framework import serializers
from .models import Conversation, Message
from users.serializers import UserListSerializer


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model."""
    
    sender = UserListSerializer(read_only=True)
    is_own = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content',
            'attachment_url', 'attachment_type',
            'is_read', 'read_at', 'is_own',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['sender', 'is_read', 'read_at', 'created_at', 'updated_at']
    
    def get_is_own(self, obj):
        request = self.context.get('request')
        if request:
            return obj.sender == request.user
        return False


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages."""
    
    class Meta:
        model = Message
        fields = ['content', 'attachment_url', 'attachment_type']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for Conversation model."""
    
    participants = UserListSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'other_participant', 'last_message',
            'unread_count', 'opportunity', 'startup',
            'created_at', 'updated_at'
        ]
    
    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'content': last.content[:100],
                'sender_id': last.sender_id,
                'created_at': last.created_at,
                'is_read': last.is_read
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
    
    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request:
            other = obj.get_other_participant(request.user)
            if other:
                return UserListSerializer(other).data
        return None


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation lists."""
    
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'other_participant', 'last_message', 'unread_count', 'updated_at']
    
    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request:
            other = obj.get_other_participant(request.user)
            if other:
                return {
                    'id': other.id,
                    'name': other.get_full_name() or other.username,
                    'avatar': other.profile.avatar if hasattr(other, 'profile') else None
                }
        return None
    
    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'content': last.content[:50],
                'created_at': last.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
