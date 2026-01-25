"""
Users App - User Management URLs

Endpoints for user profiles, listing, skill management, and dashboard.
"""

from django.urls import path
from ..views import (
    CurrentUserView,
    UserDetailView,
    UserListView,
    ChangePasswordView,
    SkillListView,
    UserSkillsView
)
from ..dashboard_views import (
    DashboardStatsView,
    DashboardInteractionsView,
    DashboardTeamsView,
    DashboardRecommendationsView
)

urlpatterns = [
    # Current user
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('me/password/', ChangePasswordView.as_view(), name='change_password'),
    path('me/skills/', UserSkillsView.as_view(), name='user_skills'),
    
    # Dashboard endpoints
    path('me/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('me/dashboard/interactions/', DashboardInteractionsView.as_view(), name='dashboard_interactions'),
    path('me/dashboard/teams/', DashboardTeamsView.as_view(), name='dashboard_teams'),
    path('me/dashboard/recommendations/', DashboardRecommendationsView.as_view(), name='dashboard_recommendations'),
    
    # User listing and details
    path('', UserListView.as_view(), name='user_list'),
    path('<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    
    # Skills
    path('skills/', SkillListView.as_view(), name='skill_list'),
]
