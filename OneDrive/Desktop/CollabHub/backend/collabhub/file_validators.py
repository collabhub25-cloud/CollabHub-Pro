"""
File Upload Validators

Provides secure file upload validation including:
- File size limits
- MIME type verification
- Magic bytes (file signature) validation
- Extension whitelist
"""

import magic
from django.core.exceptions import ValidationError
from django.conf import settings


# Default allowed file types and max sizes
ALLOWED_IMAGE_TYPES = {
    'image/jpeg': {'extensions': ['.jpg', '.jpeg'], 'max_size': 5 * 1024 * 1024},
    'image/png': {'extensions': ['.png'], 'max_size': 5 * 1024 * 1024},
    'image/webp': {'extensions': ['.webp'], 'max_size': 5 * 1024 * 1024},
    'image/gif': {'extensions': ['.gif'], 'max_size': 2 * 1024 * 1024},
}

ALLOWED_DOCUMENT_TYPES = {
    'application/pdf': {'extensions': ['.pdf'], 'max_size': 10 * 1024 * 1024},
    'application/msword': {'extensions': ['.doc'], 'max_size': 10 * 1024 * 1024},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        'extensions': ['.docx'], 'max_size': 10 * 1024 * 1024
    },
}

# Default max file size if not specified
DEFAULT_MAX_SIZE = 5 * 1024 * 1024  # 5MB


def get_file_mime_type(file):
    """
    Get the actual MIME type of a file using python-magic.
    
    Args:
        file: Django UploadedFile object
    
    Returns:
        MIME type string
    """
    # Read first bytes to check magic number
    file.seek(0)
    header = file.read(2048)
    file.seek(0)  # Reset file pointer
    
    try:
        mime = magic.from_buffer(header, mime=True)
        return mime
    except Exception:
        # Fallback to content_type from upload
        return getattr(file, 'content_type', 'application/octet-stream')


def validate_file_size(file, max_size=None):
    """
    Validate file size.
    
    Args:
        file: Django UploadedFile object
        max_size: Maximum size in bytes
    
    Raises:
        ValidationError: If file exceeds size limit
    """
    max_size = max_size or DEFAULT_MAX_SIZE
    
    if file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        file_mb = file.size / (1024 * 1024)
        raise ValidationError(
            f"File size ({file_mb:.1f}MB) exceeds the maximum allowed size ({max_mb:.1f}MB)."
        )


def validate_file_extension(file, allowed_extensions):
    """
    Validate file extension.
    
    Args:
        file: Django UploadedFile object
        allowed_extensions: List of allowed extensions (e.g., ['.jpg', '.png'])
    
    Raises:
        ValidationError: If extension is not allowed
    """
    import os
    ext = os.path.splitext(file.name)[1].lower()
    
    if ext not in allowed_extensions:
        raise ValidationError(
            f"File type '{ext}' is not allowed. "
            f"Allowed types: {', '.join(allowed_extensions)}"
        )


def validate_image_file(file):
    """
    Validate an image file upload.
    
    Checks:
    - MIME type is an allowed image type
    - Extension matches MIME type
    - File size is within limits
    - Magic bytes match declared type
    
    Args:
        file: Django UploadedFile object
    
    Raises:
        ValidationError: If any validation fails
    """
    import os
    
    # Get actual MIME type
    mime_type = get_file_mime_type(file)
    
    if mime_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(
            f"Image type '{mime_type}' is not allowed. "
            f"Allowed types: JPEG, PNG, WebP, GIF."
        )
    
    allowed_config = ALLOWED_IMAGE_TYPES[mime_type]
    
    # Validate extension matches MIME type
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_config['extensions']:
        raise ValidationError(
            f"File extension '{ext}' does not match the file content type."
        )
    
    # Validate size
    validate_file_size(file, allowed_config['max_size'])
    
    return True


def validate_document_file(file):
    """
    Validate a document file upload (PDF, DOC, DOCX).
    
    Args:
        file: Django UploadedFile object
    
    Raises:
        ValidationError: If any validation fails
    """
    import os
    
    mime_type = get_file_mime_type(file)
    
    if mime_type not in ALLOWED_DOCUMENT_TYPES:
        raise ValidationError(
            f"Document type '{mime_type}' is not allowed. "
            f"Allowed types: PDF, DOC, DOCX."
        )
    
    allowed_config = ALLOWED_DOCUMENT_TYPES[mime_type]
    
    # Validate extension
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_config['extensions']:
        raise ValidationError(
            f"File extension '{ext}' does not match the file content type."
        )
    
    # Validate size
    validate_file_size(file, allowed_config['max_size'])
    
    return True


def validate_avatar(file):
    """
    Validate avatar image upload.
    
    More restrictive than general images:
    - Max 2MB
    - Only JPEG, PNG, WebP
    
    Args:
        file: Django UploadedFile object
    
    Raises:
        ValidationError: If validation fails
    """
    import os
    
    # Max 2MB for avatars
    validate_file_size(file, 2 * 1024 * 1024)
    
    # Check MIME type
    mime_type = get_file_mime_type(file)
    allowed_avatar_types = ['image/jpeg', 'image/png', 'image/webp']
    
    if mime_type not in allowed_avatar_types:
        raise ValidationError(
            "Avatar must be a JPEG, PNG, or WebP image."
        )
    
    return True


class FileValidator:
    """
    Reusable file validator for Django model fields.
    
    Usage:
        avatar = models.ImageField(
            upload_to='avatars/',
            validators=[FileValidator(max_size=2*1024*1024, allowed_types=['image/jpeg', 'image/png'])]
        )
    """
    
    def __init__(self, max_size=None, allowed_types=None, allowed_extensions=None):
        self.max_size = max_size or DEFAULT_MAX_SIZE
        self.allowed_types = allowed_types
        self.allowed_extensions = allowed_extensions
    
    def __call__(self, file):
        # Validate size
        validate_file_size(file, self.max_size)
        
        # Validate MIME type
        if self.allowed_types:
            mime_type = get_file_mime_type(file)
            if mime_type not in self.allowed_types:
                raise ValidationError(
                    f"File type '{mime_type}' is not allowed."
                )
        
        # Validate extension
        if self.allowed_extensions:
            validate_file_extension(file, self.allowed_extensions)
