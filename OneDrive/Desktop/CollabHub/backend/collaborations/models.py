"""
Collaborations App - Models

Handles applications to opportunities and team collaborations.
"""

from django.db import models
from django.conf import settings


class Application(models.Model):
    """
    Application to an opportunity.
    Tracks the application status and communication.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        REVIEWING = 'reviewing', 'Under Review'
        SHORTLISTED = 'shortlisted', 'Shortlisted'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        WITHDRAWN = 'withdrawn', 'Withdrawn'
    
    # Core relations
    opportunity = models.ForeignKey(
        'opportunities.Opportunity',
        on_delete=models.CASCADE,
        related_name='applications'
    )
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    
    # Application details
    cover_letter = models.TextField(blank=True)
    resume_url = models.URLField(blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Feedback
    feedback = models.TextField(blank=True)  # From reviewer
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5
    
    # Timestamps
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'applications'
        unique_together = ['opportunity', 'applicant']
        ordering = ['-applied_at']
    
    def __str__(self):
        return f"{self.applicant.email} -> {self.opportunity.title}"


class TeamInvitation(models.Model):
    """
    Invitation to join a team/startup.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        EXPIRED = 'expired', 'Expired'
    
    # Who invited whom
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_invitations'
    )
    
    # What they're invited to
    startup = models.ForeignKey(
        'startups.Startup',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='invitations'
    )
    opportunity = models.ForeignKey(
        'opportunities.Opportunity',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='invitations'
    )
    
    # Details
    role = models.CharField(max_length=50, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'team_invitations'
        ordering = ['-created_at']
    
    def __str__(self):
        target = self.startup.name if self.startup else self.opportunity.title
        return f"Invitation: {self.invitee.email} to {target}"


class Connection(models.Model):
    """
    Connection/follow relationship between users.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        BLOCKED = 'blocked', 'Blocked'
    
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_connections'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_connections'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'connections'
        unique_together = ['requester', 'receiver']
    
    def __str__(self):
        return f"{self.requester.email} -> {self.receiver.email}"


class Notification(models.Model):
    """
    Notifications for users about various events.
    """
    
    class Type(models.TextChoices):
        APPLICATION = 'application', 'Application Update'
        INVITATION = 'invitation', 'Team Invitation'
        CONNECTION = 'connection', 'Connection Request'
        MESSAGE = 'message', 'New Message'
        SYSTEM = 'system', 'System Notification'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)  # URL to redirect
    
    # Related objects (optional)
    related_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email}: {self.title}"
