/**
 * CollabHub Security Utilities
 * 
 * This module provides secure alternatives to innerHTML for preventing XSS attacks.
 * All user-generated content MUST be processed through these utilities.
 * 
 * SECURITY: Never use innerHTML directly with user-provided content.
 */

const CollabHubSecurity = (function () {
    'use strict';

    /**
     * HTML entities to escape for XSS prevention
     */
    const HTML_ENTITIES = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string safe for HTML insertion
     */
    function escapeHTML(str) {
        if (str === null || str === undefined) {
            return '';
        }
        return String(str).replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char]);
    }

    /**
     * Safely set text content of an element (no HTML interpretation)
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text content to set
     */
    function safeSetText(element, text) {
        if (element && typeof element.textContent !== 'undefined') {
            element.textContent = text || '';
        }
    }

    /**
     * Safely create an element with text content
     * @param {string} tag - HTML tag name
     * @param {string} text - Text content
     * @param {string} [className] - Optional CSS class
     * @returns {HTMLElement} - Created element
     */
    function createTextElement(tag, text, className) {
        const element = document.createElement(tag);
        element.textContent = text || '';
        if (className) {
            element.className = className;
        }
        return element;
    }

    /**
     * Safely set innerHTML with escaped user content
     * Use this ONLY when you need HTML structure with user data
     * @param {HTMLElement} element - Target element
     * @param {string} template - HTML template with {placeholders}
     * @param {Object} data - Data object with values to insert (will be escaped)
     */
    function safeTemplate(element, template, data) {
        if (!element || !template) return;

        let safeHTML = template;
        for (const [key, value] of Object.entries(data || {})) {
            const placeholder = new RegExp(`\\{${key}\\}`, 'g');
            safeHTML = safeHTML.replace(placeholder, escapeHTML(value));
        }
        element.innerHTML = safeHTML;
    }

    /**
     * Sanitize a URL to prevent javascript: and data: XSS attacks
     * @param {string} url - URL to sanitize
     * @returns {string} - Safe URL or empty string
     */
    function sanitizeURL(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }

        const trimmed = url.trim().toLowerCase();

        // Block dangerous protocols
        if (trimmed.startsWith('javascript:') ||
            trimmed.startsWith('data:') ||
            trimmed.startsWith('vbscript:')) {
            console.warn('Blocked potentially malicious URL:', url);
            return '';
        }

        return url;
    }

    /**
     * Create a card element with safely escaped user content
     * Common pattern used throughout the app
     * @param {Object} data - Card data with title, description, etc.
     * @param {string} template - HTML template
     * @returns {string} - Safe HTML string
     */
    function createSafeCard(data, template) {
        let safeHTML = template;
        for (const [key, value] of Object.entries(data || {})) {
            const placeholder = new RegExp(`\\{${key}\\}`, 'g');
            // Escape all values except those marked as safe (prefixed with _safe_)
            if (key.startsWith('_safe_')) {
                safeHTML = safeHTML.replace(placeholder, value);
            } else {
                safeHTML = safeHTML.replace(placeholder, escapeHTML(value));
            }
        }
        return safeHTML;
    }

    /**
     * Batch process an array of items into safe HTML
     * @param {Array} items - Array of data objects
     * @param {Function} templateFn - Function that returns template for each item
     * @returns {string} - Concatenated safe HTML
     */
    function createSafeList(items, templateFn) {
        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }
        return items.map(item => {
            const template = templateFn(item);
            return createSafeCard(item, template);
        }).join('');
    }

    /**
     * Safely append user message content (for messaging feature)
     * @param {HTMLElement} container - Container element
     * @param {string} message - User message content
     * @param {boolean} isSent - Whether message was sent by current user
     */
    function appendMessage(container, message, isSent) {
        const msgDiv = document.createElement('div');
        msgDiv.className = isSent
            ? 'flex justify-end mb-2'
            : 'flex justify-start mb-2';

        const bubble = document.createElement('div');
        bubble.className = isSent
            ? 'bg-primary-500 text-white px-4 py-2 rounded-2xl rounded-br-none max-w-xs'
            : 'bg-white/10 text-white px-4 py-2 rounded-2xl rounded-bl-none max-w-xs';

        // Use textContent for message - NO HTML interpretation
        bubble.textContent = message;

        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
    }

    // Public API
    return {
        escapeHTML,
        safeSetText,
        createTextElement,
        safeTemplate,
        sanitizeURL,
        createSafeCard,
        createSafeList,
        appendMessage
    };
})();

// Make available globally
window.CollabHubSecurity = CollabHubSecurity;

// Shorthand for common operations
window.escapeHTML = CollabHubSecurity.escapeHTML;
window.safeSetText = CollabHubSecurity.safeSetText;
