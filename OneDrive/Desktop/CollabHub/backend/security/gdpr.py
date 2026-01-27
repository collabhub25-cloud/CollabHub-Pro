"""
GDPR Compliance Module

Provides utilities for GDPR compliance including:
- Data export (right to access)
- Account deletion (right to erasure)
- Consent management
"""

import json
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model


def export_user_data(user):
    """
    Export all user data in GDPR-compliant format.
    
    Args:
        user: User instance to export data for
    
    Returns:
        dict with all user data
    """
    from .logger import log_data_export
    
    User = get_user_model()
    
    data = {
        'export_date': timezone.now().isoformat(),
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_verified': user.is_verified,
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
        },
        'profile': None,
        'skills': [],
        'startups': [],
        'applications': [],
        'messages': [],
        'connections': [],
        'security_events': [],
        'consents': [],
    }
    
    # Profile data
    if hasattr(user, 'profile'):
        profile = user.profile
        data['profile'] = {
            'bio': profile.bio,
            'headline': profile.headline,
            'location': profile.location,
            'github_url': profile.github_url,
            'linkedin_url': profile.linkedin_url,
            'portfolio_url': profile.portfolio_url,
            'twitter_url': profile.twitter_url,
        }
    
    # Skills
    if hasattr(user, 'user_skills'):
        data['skills'] = [
            {'skill': us.skill.name, 'proficiency': us.proficiency}
            for us in user.user_skills.select_related('skill').all()
        ]
    
    # Startups (if founder)
    if hasattr(user, 'founded_startups'):
        data['startups'] = [
            {
                'name': s.name,
                'description': s.description,
                'stage': s.stage,
                'created_at': s.created_at.isoformat(),
            }
            for s in user.founded_startups.all()
        ]
    
    # Applications
    if hasattr(user, 'applications'):
        data['applications'] = [
            {
                'opportunity': str(a.opportunity),
                'status': a.status,
                'created_at': a.created_at.isoformat(),
            }
            for a in user.applications.all()
        ]
    
    # Messages (last 1000)
    try:
        from messaging.models import Message
        messages = Message.objects.filter(sender=user).order_by('-created_at')[:1000]
        data['messages'] = [
            {
                'content': m.content,
                'sent_at': m.created_at.isoformat(),
            }
            for m in messages
        ]
    except ImportError:
        pass
    
    # Connections
    try:
        from collaborations.models import Connection
        connections = Connection.objects.filter(user=user)
        data['connections'] = [
            {
                'connected_to': c.connected_user.email,
                'status': c.status,
                'connected_at': c.created_at.isoformat(),
            }
            for c in connections
        ]
    except (ImportError, AttributeError):
        pass
    
    # Security events (last 100)
    from .models import SecurityEvent
    events = SecurityEvent.objects.filter(user=user).order_by('-timestamp')[:100]
    data['security_events'] = [
        {
            'event_type': e.event_type,
            'ip_address': e.ip_address,
            'timestamp': e.timestamp.isoformat(),
        }
        for e in events
    ]
    
    # Consent records
    from .models import ConsentRecord
    consents = ConsentRecord.objects.filter(user=user)
    data['consents'] = [
        {
            'consent_type': c.consent_type,
            'granted': c.granted,
            'timestamp': c.timestamp.isoformat(),
        }
        for c in consents
    ]
    
    # Log the export
    log_data_export(user, None)
    
    return data


@transaction.atomic
def delete_user_account(user, request=None):
    """
    Delete a user account and all associated data.
    
    This is a hard delete that removes all user data.
    Some data may be anonymized instead of deleted for legal requirements.
    
    Args:
        user: User instance to delete
        request: Optional request for logging
    
    Returns:
        DataDeletionRequest instance
    """
    from .models import DataDeletionRequest, SecurityEvent
    from .logger import log_account_deletion
    
    # Create deletion request record
    deletion_request = DataDeletionRequest.objects.create(
        user=user,
        user_email=user.email,
        status=DataDeletionRequest.Status.PROCESSING,
        ip_address=request.META.get('REMOTE_ADDR') if request else None
    )
    
    deletion_log = {
        'email': user.email,
        'username': user.username,
        'deleted_at': timezone.now().isoformat(),
        'deleted_data': []
    }
    
    try:
        # Delete user's startups (cascade)
        if hasattr(user, 'founded_startups'):
            count = user.founded_startups.count()
            user.founded_startups.all().delete()
            deletion_log['deleted_data'].append(f'{count} startups')
        
        # Delete user's applications
        if hasattr(user, 'applications'):
            count = user.applications.count()
            user.applications.all().delete()
            deletion_log['deleted_data'].append(f'{count} applications')
        
        # Delete user's messages
        try:
            from messaging.models import Message
            count = Message.objects.filter(sender=user).count()
            Message.objects.filter(sender=user).delete()
            deletion_log['deleted_data'].append(f'{count} messages')
        except ImportError:
            pass
        
        # Delete user's connections
        try:
            from collaborations.models import Connection
            count = Connection.objects.filter(user=user).count()
            Connection.objects.filter(user=user).delete()
            deletion_log['deleted_data'].append(f'{count} connections')
        except (ImportError, AttributeError):
            pass
        
        # Anonymize security events (keep for audit but remove PII)
        SecurityEvent.objects.filter(user=user).update(
            user=None,
            details={'anonymized': True, 'original_user': user.email}
        )
        deletion_log['deleted_data'].append('security events anonymized')
        
        # Log the deletion before deleting user
        log_account_deletion(user, request)
        
        # Delete the user (cascades to profile, skills, etc.)
        user.delete()
        deletion_log['deleted_data'].append('user account')
        
        # Update deletion request
        deletion_request.status = DataDeletionRequest.Status.COMPLETED
        deletion_request.completed_at = timezone.now()
        deletion_request.deletion_log = deletion_log
        deletion_request.save()
        
    except Exception as e:
        deletion_request.status = DataDeletionRequest.Status.CANCELLED
        deletion_request.deletion_log = {
            'error': str(e),
            'partial_log': deletion_log
        }
        deletion_request.save()
        raise
    
    return deletion_request


def record_consent(user, consent_type, granted, request=None, consent_text=''):
    """
    Record or update a consent decision.
    
    Args:
        user: User instance
        consent_type: One of ConsentRecord.ConsentType choices
        granted: Boolean indicating if consent was granted
        request: Optional request for IP/UA logging
        consent_text: Version of consent text shown to user
    
    Returns:
        ConsentRecord instance
    """
    from .models import ConsentRecord
    
    consent, created = ConsentRecord.objects.update_or_create(
        user=user,
        consent_type=consent_type,
        defaults={
            'granted': granted,
            'consent_text': consent_text,
            'ip_address': request.META.get('REMOTE_ADDR') if request else None,
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
        }
    )
    
    return consent


def get_user_consents(user):
    """
    Get all consent records for a user.
    
    Returns:
        dict mapping consent_type to granted status
    """
    from .models import ConsentRecord
    
    consents = ConsentRecord.objects.filter(user=user)
    return {c.consent_type: c.granted for c in consents}
