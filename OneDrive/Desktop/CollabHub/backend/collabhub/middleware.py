"""
Custom Security Middleware

Adds security headers not covered by Django's built-in security middleware.
"""

from django.conf import settings


class PermissionsPolicyMiddleware:
    """
    Middleware to add Permissions-Policy header to responses.
    
    This restricts browser features like camera, microphone, geolocation, etc.
    to enhance security and privacy.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.permissions_policy = self._build_policy()
    
    def _build_policy(self):
        """Build the Permissions-Policy header value from settings."""
        policy = getattr(settings, 'PERMISSIONS_POLICY', {})
        if not policy:
            return ''
        
        parts = []
        for feature, allowlist in policy.items():
            feature_name = feature.replace('_', '-')
            if not allowlist:
                # Empty list = disallow
                parts.append(f'{feature_name}=()')
            else:
                # List of allowed origins
                allowed = ' '.join(f'"{origin}"' for origin in allowlist)
                parts.append(f'{feature_name}=({allowed})')
        
        return ', '.join(parts)
    
    def __call__(self, request):
        response = self.get_response(request)
        
        if self.permissions_policy:
            response['Permissions-Policy'] = self.permissions_policy
        
        return response


class SecurityHeadersMiddleware:
    """
    Additional security headers middleware.
    
    Adds headers that supplement Django's built-in security features.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Prevent your site from being embedded in iframes (backup for X-Frame-Options)
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = "frame-ancestors 'none'"
        
        # Cross-Origin policies for added isolation
        response['Cross-Origin-Opener-Policy'] = 'same-origin'
        response['Cross-Origin-Resource-Policy'] = 'same-origin'
        
        return response
