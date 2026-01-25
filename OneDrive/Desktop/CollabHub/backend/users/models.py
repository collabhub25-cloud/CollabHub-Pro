"""
Users App - Custom User Model and Profile

Architecture Decision:
- Custom User model extends AbstractUser for flexibility
- Profile is a separate model with OneToOne relationship for extensibility
- Supports multiple roles: student, founder, talent, investor
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import URLValidator


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Adds email as a required unique field and role-based access.
    """
    
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        FOUNDER = 'founder', 'Founder'
        TALENT = 'talent', 'Talent'
        INVESTOR = 'investor', 'Investor'
    
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.STUDENT
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Make email the primary login field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"


class Profile(models.Model):
    """
    Extended user profile with additional information.
    Separated from User model for better modularity.
    """
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    
    # Basic Info
    avatar = models.URLField(blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    headline = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=100, blank=True)
    
    # Professional Links
    github_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    linkedin_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    portfolio_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    twitter_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    
    # For Investors
    firm_name = models.CharField(max_length=100, blank=True)
    investment_stages = models.JSONField(default=list, blank=True)  # ['seed', 'series_a']
    sectors_of_interest = models.JSONField(default=list, blank=True)
    
    # Stats (denormalized for performance)
    total_connections = models.PositiveIntegerField(default=0)
    total_projects = models.PositiveIntegerField(default=0)
    total_collaborations = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'profiles'
    
    def __str__(self):
        return f"Profile: {self.user.email}"


class Skill(models.Model):
    """
    Skills that users can have.
    Used for matching and filtering.
    """
    
    name = models.CharField(max_length=50, unique=True, db_index=True)
    category = models.CharField(max_length=50, blank=True)  # e.g., 'Programming', 'Design'
    
    class Meta:
        db_table = 'skills'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class UserSkill(models.Model):
    """
    Many-to-many relationship between users and skills with proficiency level.
    """
    
    class Proficiency(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'
        EXPERT = 'expert', 'Expert'
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='user_skills'
    )
    skill = models.ForeignKey(
        Skill, 
        on_delete=models.CASCADE, 
        related_name='user_skills'
    )
    proficiency = models.CharField(
        max_length=20, 
        choices=Proficiency.choices, 
        default=Proficiency.INTERMEDIATE
    )
    
    class Meta:
        db_table = 'user_skills'
        unique_together = ['user', 'skill']
    
    def __str__(self):
        return f"{self.user.email} - {self.skill.name} ({self.proficiency})"
