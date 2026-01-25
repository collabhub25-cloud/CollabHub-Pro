"""
Users App - User Management URLs

Endpoints for user profiles, listing, and skill management.
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

urlpatterns = [
    # Current user
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('me/password/', ChangePasswordView.as_view(), name='change_password'),
    path('me/skills/', UserSkillsView.as_view(), name='user_skills'),
    
    # User listing and details
    path('', UserListView.as_view(), name='user_list'),
    path('<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    
    # Skills
    path('skills/', SkillListView.as_view(), name='skill_list'),
]
