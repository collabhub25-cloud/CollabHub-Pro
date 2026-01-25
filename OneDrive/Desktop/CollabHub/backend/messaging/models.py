"""
Messaging App - Models

Handles direct messaging between users.
"""

from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """
    Conversation thread between two or more users.
    """
    
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional: Link to opportunity or startup
    opportunity = models.ForeignKey(
        'opportunities.Opportunity',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    startup = models.ForeignKey(
        'startups.Startup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    
    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']
    
    def __str__(self):
        participant_emails = ', '.join([p.email for p in self.participants.all()[:3]])
        return f"Conversation: {participant_emails}"
    
    def get_other_participant(self, user):
        """Get the other participant in a 2-person conversation."""
        return self.participants.exclude(id=user.id).first()


class Message(models.Model):
    """
    Individual message within a conversation.
    """
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField()
    
    # Attachments
    attachment_url = models.URLField(blank=True, null=True)
    attachment_type = models.CharField(max_length=20, blank=True)  # 'image', 'file', 'link'
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.email}: {self.content[:50]}"
