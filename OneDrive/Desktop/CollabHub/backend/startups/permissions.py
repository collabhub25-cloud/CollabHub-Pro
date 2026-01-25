"""
Startups App - Custom Permissions
"""

from rest_framework import permissions


class IsFounderOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow founders to edit their startups.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the founder
        return obj.founder == request.user
