"""
Custom Permissions

Role-based and object-level permissions for CollabHub.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners to edit.
    Assumes the model has an `owner` or `created_by` attribute.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        owner_field = getattr(obj, 'owner', None) or getattr(obj, 'created_by', None) or getattr(obj, 'founder', None)
        return owner_field == request.user


class IsFounderOrReadOnly(permissions.BasePermission):
    """Only founders can create/edit startups."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'founder'
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.founder == request.user


class IsApplicantOrOpportunityOwner(permissions.BasePermission):
    """
    Permission for applications:
    - Applicants can view/withdraw their own applications
    - Opportunity owners can view/update applications to their opportunities
    """
    
    def has_object_permission(self, request, view, obj):
        # Applicant can view their own
        if obj.applicant == request.user:
            return True
        
        # Opportunity owner can view/update
        if obj.opportunity.created_by == request.user:
            return True
        
        return False


class IsParticipantOrReadOnly(permissions.BasePermission):
    """Only conversation participants can access messages."""
    
    def has_object_permission(self, request, view, obj):
        return request.user in obj.participants.all()


class IsAdminOrReadOnly(permissions.BasePermission):
    """Only admins can modify, others can read."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_staff


class CanPostOpportunity(permissions.BasePermission):
    """Only founders and admins can post opportunities."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in ['founder', 'admin'] or request.user.is_staff
