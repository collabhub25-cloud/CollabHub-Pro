"""
Input Validators Module

Provides validation and sanitization utilities for user input.
Prevents XSS, SQL injection, and other input-based attacks.
"""

import re
import bleach
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from urllib.parse import urlparse


# Allowed HTML tags and attributes for sanitization
ALLOWED_TAGS = ['b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li']
ALLOWED_ATTRIBUTES = {'a': ['href', 'title']}
ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']


def sanitize_html(value, strip=True):
    """
    Sanitize HTML content, removing dangerous tags and attributes.
    
    Args:
        value: String to sanitize
        strip: If True, remove disallowed tags. If False, escape them.
    
    Returns:
        Sanitized string
    """
    if not value:
        return value
    
    return bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=strip
    )


def sanitize_text(value, max_length=None):
    """
    Sanitize plain text input, removing all HTML.
    
    Args:
        value: String to sanitize
        max_length: Optional maximum length
    
    Returns:
        Plain text with no HTML
    """
    if not value:
        return value
    
    # Remove all HTML tags
    clean = bleach.clean(value, tags=[], strip=True)
    
    # Normalize whitespace
    clean = ' '.join(clean.split())
    
    # Enforce length limit
    if max_length and len(clean) > max_length:
        clean = clean[:max_length]
    
    return clean


def validate_username(value):
    """Validate username format."""
    if not value:
        raise ValidationError("Username is required.")
    
    if len(value) < 3:
        raise ValidationError("Username must be at least 3 characters.")
    
    if len(value) > 30:
        raise ValidationError("Username cannot exceed 30 characters.")
    
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', value):
        raise ValidationError(
            "Username must start with a letter and contain only letters, "
            "numbers, underscores, and hyphens."
        )
    
    return value


def validate_bio(value):
    """Validate and sanitize bio field."""
    if not value:
        return value
    
    # Sanitize HTML
    clean = sanitize_text(value, max_length=500)
    
    return clean


def validate_headline(value):
    """Validate and sanitize headline field."""
    if not value:
        return value
    
    # Sanitize and limit length
    clean = sanitize_text(value, max_length=100)
    
    return clean


def validate_url_field(value, allowed_domains=None):
    """
    Validate URL field.
    
    Args:
        value: URL string to validate
        allowed_domains: Optional list of allowed domains (e.g., ['github.com'])
    
    Returns:
        Validated URL
    
    Raises:
        ValidationError: If URL is invalid or domain not allowed
    """
    if not value:
        return value
    
    # Basic URL validation
    url_validator = URLValidator(schemes=['http', 'https'])
    try:
        url_validator(value)
    except ValidationError:
        raise ValidationError("Please enter a valid URL.")
    
    # Parse URL
    parsed = urlparse(value)
    
    # Prevent javascript: and data: URLs
    if parsed.scheme.lower() not in ('http', 'https'):
        raise ValidationError("Only HTTP and HTTPS URLs are allowed.")
    
    # Check allowed domains if specified
    if allowed_domains:
        domain = parsed.netloc.lower()
        if not any(domain == d or domain.endswith('.' + d) for d in allowed_domains):
            raise ValidationError(f"URL must be from: {', '.join(allowed_domains)}")
    
    return value


def validate_github_url(value):
    """Validate GitHub profile URL."""
    return validate_url_field(value, allowed_domains=['github.com'])


def validate_linkedin_url(value):
    """Validate LinkedIn profile URL."""
    return validate_url_field(value, allowed_domains=['linkedin.com', 'www.linkedin.com'])


def validate_string_length(value, min_length=0, max_length=None, field_name="Field"):
    """Validate string length bounds."""
    if not value:
        if min_length > 0:
            raise ValidationError(f"{field_name} is required.")
        return value
    
    if len(value) < min_length:
        raise ValidationError(f"{field_name} must be at least {min_length} characters.")
    
    if max_length and len(value) > max_length:
        raise ValidationError(f"{field_name} cannot exceed {max_length} characters.")
    
    return value


def validate_json_array(value, max_items=20, max_item_length=100):
    """Validate JSON array fields (e.g., skills, sectors)."""
    if not value:
        return []
    
    if not isinstance(value, list):
        raise ValidationError("Expected a list of values.")
    
    if len(value) > max_items:
        raise ValidationError(f"Cannot have more than {max_items} items.")
    
    cleaned = []
    for item in value:
        if isinstance(item, str):
            clean_item = sanitize_text(item, max_length=max_item_length)
            if clean_item:
                cleaned.append(clean_item)
        elif isinstance(item, dict):
            # For nested objects, sanitize string values
            clean_dict = {}
            for k, v in item.items():
                if isinstance(v, str):
                    clean_dict[k] = sanitize_text(v, max_length=max_item_length)
                else:
                    clean_dict[k] = v
            cleaned.append(clean_dict)
    
    return cleaned
