"""
Opportunities App - Admin Configuration
"""

from django.contrib import admin
from .models import Opportunity, SavedOpportunity


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'organization', 'status', 'is_featured', 'deadline', 'created_at']
    list_filter = ['type', 'status', 'difficulty', 'is_remote', 'is_featured']
    search_fields = ['title', 'description', 'organization']
    date_hierarchy = 'created_at'


@admin.register(SavedOpportunity)
class SavedOpportunityAdmin(admin.ModelAdmin):
    list_display = ['user', 'opportunity', 'saved_at']
    list_filter = ['saved_at']
