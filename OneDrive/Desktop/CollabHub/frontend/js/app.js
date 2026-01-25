/**
 * CollabHub Main App Script
 * Handles common functionality across pages
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check auth status and update navigation
    updateNavigation();

    // Initialize mobile menu if present
    initMobileMenu();

    // Add smooth scrolling for anchor links
    initSmoothScroll();
}

/**
 * Update navigation based on auth status
 */
function updateNavigation() {
    const authNav = document.getElementById('auth-nav');
    const userNav = document.getElementById('user-nav');

    if (!authNav && !userNav) return;

    const { isAuthenticated, getUserData } = window.CollabHubAPI || {};

    if (isAuthenticated && isAuthenticated()) {
        const user = getUserData ? getUserData() : null;
        if (authNav) authNav.classList.add('hidden');
        if (userNav) {
            userNav.classList.remove('hidden');
            const userName = userNav.querySelector('#user-name');
            if (userName && user) {
                userName.textContent = user.first_name || user.username || 'User';
            }
        }
    } else {
        if (authNav) authNav.classList.remove('hidden');
        if (userNav) userNav.classList.add('hidden');
    }
}

/**
 * Initialize mobile menu toggle
 */
function initMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${colors[type]} shadow-lg z-50 transform transition-all duration-300 translate-y-0`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) return formatDate(dateString);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function for search inputs
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Redirect to dashboard based on user role
 */
function redirectToDashboard() {
    const { getUserData } = window.CollabHubAPI || {};
    const user = getUserData ? getUserData() : null;

    if (!user) {
        window.location.href = '/frontend/pages/login.html';
        return;
    }

    const dashboards = {
        founder: '/frontend/pages/dashboard-founder.html',
        talent: '/frontend/pages/dashboard-talent.html',
        investor: '/frontend/pages/dashboard-investor.html',
        student: '/frontend/pages/dashboard-talent.html'
    };

    window.location.href = dashboards[user.role] || dashboards.talent;
}

/**
 * Protect page - redirect if not authenticated
 */
function requireAuth() {
    const { isAuthenticated } = window.CollabHubAPI || {};

    if (!isAuthenticated || !isAuthenticated()) {
        window.location.href = '/frontend/pages/login.html?redirect=' + encodeURIComponent(window.location.href);
        return false;
    }
    return true;
}

/**
 * Handle logout
 */
async function handleLogout() {
    const { api } = window.CollabHubAPI || {};

    try {
        if (api) await api.logout();
    } catch (e) {
        console.error('Logout error:', e);
    }

    window.location.href = '/frontend/index.html';
}

// Export utilities
window.AppUtils = {
    showToast,
    formatDate,
    formatRelativeTime,
    truncateText,
    debounce,
    redirectToDashboard,
    requireAuth,
    handleLogout
};
