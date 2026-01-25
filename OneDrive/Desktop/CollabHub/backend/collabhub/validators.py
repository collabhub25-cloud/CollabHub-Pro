"""
Input Validators

Custom validation utilities for CollabHub API.
"""

import re
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator, EmailValidator


def validate_skill_list(value):
    """Validate skills is a list of strings."""
    if not isinstance(value, list):
        raise ValidationError('Skills must be a list.')
    if len(value) > 20:
        raise ValidationError('Maximum 20 skills allowed.')
    for skill in value:
        if not isinstance(skill, str) or len(skill) > 50:
            raise ValidationError('Each skill must be a string with max 50 characters.')


def validate_url_optional(value):
    """Validate URL if provided."""
    if value:
        validator = URLValidator()
        validator(value)


def validate_positive_integer(value):
    """Ensure value is a positive integer."""
    if value is not None and value < 0:
        raise ValidationError('Value must be a positive integer.')


def sanitize_html(text):
    """Remove HTML tags from text input."""
    if text:
        clean = re.compile('<.*?>')
        return re.sub(clean, '', text)
    return text


def validate_password_strength(password):
    """
    Validate password meets security requirements.
    - At least 8 characters
    - Contains uppercase and lowercase
    - Contains at least one number
    """
    if len(password) < 8:
        raise ValidationError('Password must be at least 8 characters.')
    if not re.search(r'[A-Z]', password):
        raise ValidationError('Password must contain at least one uppercase letter.')
    if not re.search(r'[a-z]', password):
        raise ValidationError('Password must contain at least one lowercase letter.')
    if not re.search(r'\d', password):
        raise ValidationError('Password must contain at least one number.')
