/**
 * CollabHub API Service
 * Handles all backend API calls with JWT authentication
 */

const API_BASE_URL = 'http://localhost:8000/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'collabhub_access_token';
const REFRESH_TOKEN_KEY = 'collabhub_refresh_token';
const USER_DATA_KEY = 'collabhub_user';

/**
 * Get stored access token
 */
function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store tokens securely
 */
function setTokens(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
}

/**
 * Store user data
 */
function setUserData(user) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

/**
 * Get stored user data
 */
function getUserData() {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Clear all auth data (logout)
 */
function clearAuthData() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getAccessToken();
}

/**
 * Refresh the access token
 */
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
    });

    if (!response.ok) {
        clearAuthData();
        throw new Error('Token refresh failed');
    }

    const data = await response.json();
    setTokens(data.access, data.refresh);
    return data.access;
}

/**
 * Make authenticated API request with automatic token refresh
 */
async function apiRequest(endpoint, options = {}) {
    let accessToken = getAccessToken();

    const makeRequest = async (token) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        return response;
    };

    let response = await makeRequest(accessToken);

    // If unauthorized, try refreshing token
    if (response.status === 401 && accessToken) {
        try {
            accessToken = await refreshAccessToken();
            response = await makeRequest(accessToken);
        } catch (e) {
            // Redirect to login with dynamic path detection
            const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
            window.location.href = basePath + 'login.html';
            throw e;
        }
    }

    return response;
}

/**
 * API Methods
 */
const api = {
    // Auth
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        setTokens(data.access, data.refresh);
        setUserData(data.user);
        return data;
    },

    async register(userData) {
        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        return response.json();
    },

    async logout() {
        try {
            await apiRequest('/auth/logout/', {
                method: 'POST',
                body: JSON.stringify({ refresh: getRefreshToken() })
            });
        } finally {
            clearAuthData();
        }
    },

    // User
    async getProfile() {
        const response = await apiRequest('/users/me/');
        if (!response.ok) throw new Error('Failed to fetch profile');
        return response.json();
    },

    async updateProfile(data) {
        const response = await apiRequest('/users/me/', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    },

    // Dashboard
    async getDashboardStats() {
        const response = await apiRequest('/users/me/dashboard/stats/');
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        return response.json();
    },

    async getDashboardInteractions() {
        const response = await apiRequest('/users/me/dashboard/interactions/');
        if (!response.ok) throw new Error('Failed to fetch interactions');
        return response.json();
    },

    async getDashboardTeams() {
        const response = await apiRequest('/users/me/dashboard/teams/');
        if (!response.ok) throw new Error('Failed to fetch teams');
        return response.json();
    },

    async getDashboardRecommendations() {
        const response = await apiRequest('/users/me/dashboard/recommendations/');
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        return response.json();
    },

    // Startups
    async getStartups(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await apiRequest(`/startups/?${query}`);
        if (!response.ok) throw new Error('Failed to fetch startups');
        return response.json();
    },

    async getStartup(id) {
        const response = await apiRequest(`/startups/${id}/`);
        if (!response.ok) throw new Error('Failed to fetch startup');
        return response.json();
    },

    async createStartup(data) {
        const response = await apiRequest('/startups/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create startup');
        return response.json();
    },

    async updateStartup(id, data) {
        const response = await apiRequest(`/startups/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update startup');
        return response.json();
    },

    // Opportunities
    async getOpportunities(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await apiRequest(`/opportunities/?${query}`);
        if (!response.ok) throw new Error('Failed to fetch opportunities');
        return response.json();
    },

    async getOpportunity(id) {
        const response = await apiRequest(`/opportunities/${id}/`);
        if (!response.ok) throw new Error('Failed to fetch opportunity');
        return response.json();
    },

    async createOpportunity(data) {
        const response = await apiRequest('/opportunities/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create opportunity');
        return response.json();
    },

    async searchOpportunities(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await apiRequest(`/opportunities/search/?${query}`);
        if (!response.ok) throw new Error('Search failed');
        return response.json();
    },

    // Applications
    async getApplications() {
        const response = await apiRequest('/collaborations/applications/');
        if (!response.ok) throw new Error('Failed to fetch applications');
        return response.json();
    },

    async applyToOpportunity(opportunityId, data) {
        const response = await apiRequest('/collaborations/applications/', {
            method: 'POST',
            body: JSON.stringify({ opportunity: opportunityId, ...data })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Application failed');
        }
        return response.json();
    },

    async updateApplication(id, data) {
        const response = await apiRequest(`/collaborations/applications/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update application');
        return response.json();
    },

    // Messages
    async getConversations() {
        const response = await apiRequest('/messages/');
        if (!response.ok) throw new Error('Failed to fetch conversations');
        return response.json();
    },

    async getMessages(conversationId) {
        const response = await apiRequest(`/messages/${conversationId}/messages/`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        return response.json();
    },

    async sendMessage(conversationId, content) {
        const response = await apiRequest(`/messages/${conversationId}/messages/`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('Failed to send message');
        return response.json();
    },

    async startConversation(recipientId, message = '') {
        const response = await apiRequest('/messages/start/', {
            method: 'POST',
            body: JSON.stringify({ recipient_id: recipientId, message })
        });
        if (!response.ok) throw new Error('Failed to start conversation');
        return response.json();
    },

    // Notifications
    async getNotifications() {
        const response = await apiRequest('/collaborations/notifications/');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return response.json();
    },

    async getUnreadCount() {
        const response = await apiRequest('/collaborations/notifications/count/');
        if (!response.ok) throw new Error('Failed to fetch unread count');
        return response.json();
    },

    async markNotificationsRead(ids = []) {
        const response = await apiRequest('/collaborations/notifications/read/', {
            method: 'POST',
            body: JSON.stringify({ ids })
        });
        if (!response.ok) throw new Error('Failed to mark notifications');
        return response.json();
    },

    // Dashboard
    async getDashboardStats() {
        const response = await apiRequest('/users/me/dashboard/stats/');
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        return response.json();
    },

    async getDashboardInteractions() {
        const response = await apiRequest('/users/me/dashboard/interactions/');
        if (!response.ok) throw new Error('Failed to fetch dashboard interactions');
        return response.json();
    },

    async getDashboardTeams() {
        const response = await apiRequest('/users/me/dashboard/teams/');
        if (!response.ok) throw new Error('Failed to fetch dashboard teams');
        return response.json();
    },

    async getDashboardRecommendations() {
        const response = await apiRequest('/users/me/dashboard/recommendations/');
        if (!response.ok) throw new Error('Failed to fetch dashboard recommendations');
        return response.json();
    },

    // Connections
    async getConnections() {
        const response = await apiRequest('/collaborations/connections/');
        if (!response.ok) throw new Error('Failed to fetch connections');
        return response.json();
    },

    async getConnectionRequests() {
        const response = await apiRequest('/collaborations/connections/requests/');
        if (!response.ok) throw new Error('Failed to fetch connection requests');
        return response.json();
    },

    async sendConnectionRequest(receiverId) {
        const response = await apiRequest('/collaborations/connections/', {
            method: 'POST',
            body: JSON.stringify({ receiver_id: receiverId })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.error || 'Failed to send connection request');
        }
        return response.json();
    },

    async respondToConnection(connectionId, action) {
        const response = await apiRequest(`/collaborations/connections/${connectionId}/respond/`, {
            method: 'POST',
            body: JSON.stringify({ action })  // 'accept' or 'decline'
        });
        if (!response.ok) throw new Error('Failed to respond to connection');
        return response.json();
    },

    // Users
    async getUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await apiRequest(`/users/?${query}`);
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    // Activity Feed
    async getActivityFeed(limit = 20) {
        const response = await apiRequest(`/users/me/feed/?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch activity feed');
        return response.json();
    }
};

// Export for modules or attach to window for scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { api, isAuthenticated, getUserData, clearAuthData };
} else {
    window.CollabHubAPI = { api, isAuthenticated, getUserData, clearAuthData, getAccessToken };
}
