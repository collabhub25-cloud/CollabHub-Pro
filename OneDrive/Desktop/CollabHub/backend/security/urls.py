"""
Security App - URL Configuration
"""

from django.urls import path
from .views import (
    PrivacySettingsView,
    ConsentListView,
    DataExportView,
    AccountDeletionView,
    SecurityEventsView
)

urlpatterns = [
    # Privacy Settings
    path('privacy/', PrivacySettingsView.as_view(), name='privacy_settings'),
    
    # GDPR Consent
    path('consent/', ConsentListView.as_view(), name='consent_list'),
    
    # GDPR Data Export
    path('data-export/', DataExportView.as_view(), name='data_export'),
    
    # GDPR Account Deletion
    path('delete-account/', AccountDeletionView.as_view(), name='delete_account'),
    
    # Security Events
    path('events/', SecurityEventsView.as_view(), name='security_events'),
]
