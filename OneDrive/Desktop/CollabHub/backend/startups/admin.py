"""
Startups App - Admin Configuration
"""

from django.contrib import admin
from .models import Startup, StartupMember, StartupUpdate


class StartupMemberInline(admin.TabularInline):
    model = StartupMember
    extra = 0


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = ['name', 'founder', 'industry', 'stage', 'status', 'team_size', 'created_at']
    list_filter = ['stage', 'status', 'industry', 'is_remote']
    search_fields = ['name', 'description', 'industry']
    inlines = [StartupMemberInline]


@admin.register(StartupUpdate)
class StartupUpdateAdmin(admin.ModelAdmin):
    list_display = ['startup', 'title', 'author', 'created_at']
    list_filter = ['startup']
