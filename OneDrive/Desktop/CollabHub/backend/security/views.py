"""
Security App - Views

API endpoints for MFA, privacy settings, and GDPR compliance.
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PrivacySettings, ConsentRecord, SecurityEvent
from .serializers import (
    PrivacySettingsSerializer,
    ConsentSerializer,
    SecurityEventSerializer
)
from .gdpr import export_user_data, delete_user_account, record_consent, get_user_consents
from .logger import log_security_event


class PrivacySettingsView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve current privacy settings
    PUT/PATCH: Update privacy settings
    """
    serializer_class = PrivacySettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        settings, created = PrivacySettings.objects.get_or_create(user=self.request.user)
        return settings


class ConsentListView(APIView):
    """
    GET: List all consent records for current user
    POST: Record a consent decision
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        consents = get_user_consents(request.user)
        return Response(consents)
    
    def post(self, request):
        consent_type = request.data.get('consent_type')
        granted = request.data.get('granted', False)
        
        if not consent_type:
            return Response(
                {'error': 'consent_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_types = [c[0] for c in ConsentRecord.ConsentType.choices]
        if consent_type not in valid_types:
            return Response(
                {'error': f'Invalid consent_type. Must be one of: {valid_types}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        consent = record_consent(
            user=request.user,
            consent_type=consent_type,
            granted=granted,
            request=request
        )
        
        return Response({
            'consent_type': consent.consent_type,
            'granted': consent.granted,
            'timestamp': consent.timestamp.isoformat()
        })


class DataExportView(APIView):
    """
    GET: Export all user data (GDPR right to access)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        data = export_user_data(request.user)
        return Response(data)


class AccountDeletionView(APIView):
    """
    POST: Request account deletion (GDPR right to erasure)
    
    Requires password confirmation.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        password = request.data.get('password')
        
        if not password:
            return Response(
                {'error': 'Password confirmation required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not request.user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        deletion_request = delete_user_account(request.user, request)
        
        return Response({
            'message': 'Account deletion completed',
            'status': deletion_request.status,
            'completed_at': deletion_request.completed_at.isoformat() if deletion_request.completed_at else None
        })


class SecurityEventsView(generics.ListAPIView):
    """
    GET: List recent security events for current user
    """
    serializer_class = SecurityEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SecurityEvent.objects.filter(
            user=self.request.user
        ).order_by('-timestamp')[:50]
