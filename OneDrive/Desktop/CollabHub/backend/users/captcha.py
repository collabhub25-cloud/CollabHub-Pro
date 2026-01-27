"""
CAPTCHA Integration Module

Provides CAPTCHA verification for login, registration, and other high-risk actions.
Supports hCaptcha (recommended) and reCAPTCHA v3.
"""

import requests
from django.conf import settings


# CAPTCHA configuration
HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify'
RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


def get_captcha_config():
    """Get CAPTCHA configuration from settings."""
    return {
        'provider': getattr(settings, 'CAPTCHA_PROVIDER', 'hcaptcha'),
        'secret_key': getattr(settings, 'CAPTCHA_SECRET_KEY', ''),
        'site_key': getattr(settings, 'CAPTCHA_SITE_KEY', ''),
        'enabled': getattr(settings, 'CAPTCHA_ENABLED', not settings.DEBUG),
        'score_threshold': getattr(settings, 'CAPTCHA_SCORE_THRESHOLD', 0.5),
    }


def verify_hcaptcha(token, remote_ip=None):
    """
    Verify hCaptcha token.
    
    Args:
        token: hCaptcha response token from client
        remote_ip: Optional client IP address
    
    Returns:
        dict with 'success' boolean and 'error' message if failed
    """
    config = get_captcha_config()
    
    if not config['enabled']:
        return {'success': True, 'skipped': True}
    
    if not config['secret_key']:
        return {'success': False, 'error': 'CAPTCHA not configured'}
    
    if not token:
        return {'success': False, 'error': 'CAPTCHA token required'}
    
    try:
        data = {
            'secret': config['secret_key'],
            'response': token,
        }
        if remote_ip:
            data['remoteip'] = remote_ip
        
        response = requests.post(HCAPTCHA_VERIFY_URL, data=data, timeout=5)
        result = response.json()
        
        if result.get('success'):
            return {'success': True}
        else:
            return {
                'success': False,
                'error': 'CAPTCHA verification failed',
                'error_codes': result.get('error-codes', [])
            }
    except requests.RequestException as e:
        return {'success': False, 'error': f'CAPTCHA verification error: {str(e)}'}


def verify_recaptcha_v3(token, action=None, remote_ip=None):
    """
    Verify reCAPTCHA v3 token.
    
    Args:
        token: reCAPTCHA response token from client
        action: Expected action name
        remote_ip: Optional client IP address
    
    Returns:
        dict with 'success' boolean, 'score', and 'error' message if failed
    """
    config = get_captcha_config()
    
    if not config['enabled']:
        return {'success': True, 'skipped': True}
    
    if not config['secret_key']:
        return {'success': False, 'error': 'CAPTCHA not configured'}
    
    if not token:
        return {'success': False, 'error': 'CAPTCHA token required'}
    
    try:
        data = {
            'secret': config['secret_key'],
            'response': token,
        }
        if remote_ip:
            data['remoteip'] = remote_ip
        
        response = requests.post(RECAPTCHA_VERIFY_URL, data=data, timeout=5)
        result = response.json()
        
        if not result.get('success'):
            return {
                'success': False,
                'error': 'CAPTCHA verification failed',
                'error_codes': result.get('error-codes', [])
            }
        
        # Check action if specified
        if action and result.get('action') != action:
            return {
                'success': False,
                'error': 'CAPTCHA action mismatch'
            }
        
        # Check score
        score = result.get('score', 0)
        if score < config['score_threshold']:
            return {
                'success': False,
                'error': 'CAPTCHA score too low',
                'score': score
            }
        
        return {'success': True, 'score': score}
    
    except requests.RequestException as e:
        return {'success': False, 'error': f'CAPTCHA verification error: {str(e)}'}


def verify_captcha(token, remote_ip=None, action=None):
    """
    Verify CAPTCHA token using configured provider.
    
    Args:
        token: CAPTCHA response token from client
        remote_ip: Optional client IP address
        action: Optional action name (for reCAPTCHA v3)
    
    Returns:
        dict with 'success' boolean and error details if failed
    """
    config = get_captcha_config()
    
    if config['provider'] == 'recaptcha':
        return verify_recaptcha_v3(token, action, remote_ip)
    else:
        return verify_hcaptcha(token, remote_ip)


class CaptchaMixin:
    """
    Mixin for views that require CAPTCHA verification.
    
    Usage:
        class LoginView(CaptchaMixin, APIView):
            captcha_action = 'login'
            
            def post(self, request):
                if not self.verify_captcha_token(request):
                    return Response({'error': 'CAPTCHA failed'}, status=400)
                # ... rest of login logic
    """
    
    captcha_action = None
    captcha_field = 'captcha_token'
    
    def verify_captcha_token(self, request):
        """
        Verify CAPTCHA token from request.
        
        Returns:
            dict with verification result
        """
        token = request.data.get(self.captcha_field) or request.headers.get('X-Captcha-Token')
        remote_ip = self.get_client_ip(request)
        
        return verify_captcha(token, remote_ip, self.captcha_action)
    
    def get_client_ip(self, request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
