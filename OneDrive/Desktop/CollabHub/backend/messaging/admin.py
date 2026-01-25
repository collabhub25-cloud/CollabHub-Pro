"""
Messaging App - Admin Configuration
"""

from django.contrib import admin
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ['sender', 'created_at']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_participants', 'created_at', 'updated_at']
    filter_horizontal = ['participants']
    inlines = [MessageInline]
    
    def get_participants(self, obj):
        return ', '.join([p.email for p in obj.participants.all()[:3]])
    get_participants.short_description = 'Participants'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'conversation', 'content_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    
    def content_preview(self, obj):
        return obj.content[:50]
    content_preview.short_description = 'Content'
