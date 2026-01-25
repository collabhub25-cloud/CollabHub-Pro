"""
Opportunities App - Models

Handles hackathons, internships, projects, and other opportunities.
"""

from django.db import models
from django.conf import settings


class Opportunity(models.Model):
    """
    Opportunity model for hackathons, internships, projects, etc.
    These are opportunities that users can apply to or join.
    """
    
    class Type(models.TextChoices):
        HACKATHON = 'hackathon', 'Hackathon'
        INTERNSHIP = 'internship', 'Internship'
        PROJECT = 'project', 'Project'
        JOB = 'job', 'Job'
        COLLABORATION = 'collaboration', 'Collaboration'
        COMPETITION = 'competition', 'Competition'
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        CLOSED = 'closed', 'Closed'
        COMPLETED = 'completed', 'Completed'
    
    class Difficulty(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'
        EXPERT = 'expert', 'Expert'
    
    # Basic Info
    title = models.CharField(max_length=200, db_index=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    cover_image = models.URLField(blank=True, null=True)
    
    # Details
    organization = models.CharField(max_length=100, blank=True)
    difficulty = models.CharField(
        max_length=20, 
        choices=Difficulty.choices, 
        default=Difficulty.INTERMEDIATE
    )
    
    # Location
    location = models.CharField(max_length=100, blank=True)
    is_remote = models.BooleanField(default=True)
    
    # Team
    team_size_min = models.PositiveIntegerField(default=1)
    team_size_max = models.PositiveIntegerField(default=5)
    
    # Dates
    start_date = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    deadline = models.DateTimeField(blank=True, null=True)
    
    # Requirements
    required_skills = models.JSONField(default=list, blank=True)  # ['Python', 'React']
    
    # Perks/Rewards
    perks = models.JSONField(default=list, blank=True)  # ['Prize money', 'Swag']
    prize_amount = models.CharField(max_length=50, blank=True)  # '$10,000'
    
    # Links
    website_url = models.URLField(blank=True, null=True)
    registration_url = models.URLField(blank=True, null=True)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    is_featured = models.BooleanField(default=False)
    
    # Creator
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_opportunities'
    )
    
    # Optional: Link to startup
    startup = models.ForeignKey(
        'startups.Startup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='opportunities'
    )
    
    # Stats
    total_views = models.PositiveIntegerField(default=0)
    total_applications = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'opportunities'
        ordering = ['-created_at']
        verbose_name_plural = 'Opportunities'
    
    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"


class SavedOpportunity(models.Model):
    """Opportunities saved/bookmarked by users."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_opportunities'
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='saved_by'
    )
    saved_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'saved_opportunities'
        unique_together = ['user', 'opportunity']
    
    def __str__(self):
        return f"{self.user.email} saved {self.opportunity.title}"
