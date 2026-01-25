"""
Startups App - Models

Handles startup profiles, team members, and updates.
"""

from django.db import models
from django.conf import settings


class Startup(models.Model):
    """
    Startup/Company profile model.
    Created by founders to showcase their ventures.
    """
    
    class Stage(models.TextChoices):
        IDEA = 'idea', 'Idea Stage'
        MVP = 'mvp', 'MVP'
        EARLY = 'early', 'Early Stage'
        GROWTH = 'growth', 'Growth Stage'
        SCALE = 'scale', 'Scale Up'
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        HIRING = 'hiring', 'Actively Hiring'
        STEALTH = 'stealth', 'Stealth Mode'
        INACTIVE = 'inactive', 'Inactive'
    
    # Basic Info
    name = models.CharField(max_length=100, db_index=True)
    tagline = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    logo = models.URLField(blank=True, null=True)
    cover_image = models.URLField(blank=True, null=True)
    
    # Details
    industry = models.CharField(max_length=50)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.IDEA)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    founded_date = models.DateField(blank=True, null=True)
    
    # Location
    location = models.CharField(max_length=100, blank=True)
    is_remote = models.BooleanField(default=False)
    
    # Links
    website = models.URLField(blank=True, null=True)
    pitch_deck_url = models.URLField(blank=True, null=True)
    
    # Team
    founder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='founded_startups'
    )
    team_size = models.PositiveIntegerField(default=1)
    
    # Stats
    total_views = models.PositiveIntegerField(default=0)
    total_applications = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'startups'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_stage_display()})"


class StartupMember(models.Model):
    """Team members of a startup."""
    
    class Role(models.TextChoices):
        FOUNDER = 'founder', 'Founder'
        COFOUNDER = 'cofounder', 'Co-Founder'
        CTO = 'cto', 'CTO'
        DEVELOPER = 'developer', 'Developer'
        DESIGNER = 'designer', 'Designer'
        MARKETING = 'marketing', 'Marketing'
        OPERATIONS = 'operations', 'Operations'
        OTHER = 'other', 'Other'
    
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='startup_memberships'
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    title = models.CharField(max_length=100, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'startup_members'
        unique_together = ['startup', 'user']
    
    def __str__(self):
        return f"{self.user.email} @ {self.startup.name}"


class StartupUpdate(models.Model):
    """Updates/news posted by startups."""
    
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name='updates'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'startup_updates'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.startup.name}: {self.title}"
