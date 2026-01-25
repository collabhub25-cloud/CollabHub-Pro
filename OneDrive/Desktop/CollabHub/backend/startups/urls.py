"""
Startups App - URL Configuration
"""

from django.urls import path
from .views import (
    StartupListCreateView,
    StartupDetailView,
    MyStartupsView,
    StartupMemberView,
    StartupUpdateView
)

urlpatterns = [
    # Startup CRUD
    path('', StartupListCreateView.as_view(), name='startup_list'),
    path('<int:pk>/', StartupDetailView.as_view(), name='startup_detail'),
    
    # My startups
    path('my/', MyStartupsView.as_view(), name='my_startups'),
    
    # Team members
    path('<int:pk>/members/', StartupMemberView.as_view(), name='startup_members'),
    
    # Updates
    path('<int:pk>/updates/', StartupUpdateView.as_view(), name='startup_updates'),
]
