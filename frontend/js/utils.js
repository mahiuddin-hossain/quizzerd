/**
 * =============================================
 * QUIZZERD — Shared Utility Functions
 * =============================================
 * Contains reusable helper functions used across all pages.
 * Implements DRY (Don't Repeat Yourself) principle.
 */

// Base URL for all API requests
const API_BASE = 'http://localhost:3000/api';

// ---- Token Management (localStorage + Cookie) ----

/**
 * Store JWT token in both localStorage and cookie for persistence
 * @param {string} token - JWT authentication token
 */
function setToken(token) {
    try {
        localStorage.setItem('quizzerd_token', token);
        // Set cookie with 24-hour expiry and secure flags
        document.cookie = `quizzerd_token=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
    } catch (error) {
        console.error('Error storing token:', error);
    }
}

/**
 * Retrieve JWT token from localStorage
 * @returns {string|null} The stored token or null if not found
 */
function getToken() {
    try {
        return localStorage.getItem('quizzerd_token');
    } catch (error) {
        console.error('Error retrieving token:', error);
        return null;
    }
}

/**
 * Remove JWT token and user data from all storage locations
 * Used during logout to clear all session data
 */
function removeToken() {
    try {
        localStorage.removeItem('quizzerd_token');
        localStorage.removeItem('quizzerd_user');
        // Expire the cookie immediately by setting max-age to 0
        document.cookie = 'quizzerd_token=; path=/; max-age=0';
    } catch (error) {
        console.error('Error removing token:', error);
    }
}

// ---- User Data Management ----

/**
 * Store user profile data in localStorage as JSON
 * @param {Object} user - User object { id, first_name, last_name, username, email }
 */
function setUser(user) {
    try {
        localStorage.setItem('quizzerd_user', JSON.stringify(user));
    } catch (error) {
        console.error('Error storing user data:', error);
    }
}

/**
 * Retrieve stored user profile data
 * @returns {Object|null} Parsed user object or null
 */
function getUser() {
    try {
        const data = localStorage.getItem('quizzerd_user');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error retrieving user data:', error);
        return null;
    }
}

// ---- Authentication Checks ----

/**
 * Check if user has an active authentication token
 * @returns {boolean} True if token exists
 */
function isAuthenticated() {
    return !!getToken();
}

/**
 * Redirect to login page if user is NOT authenticated
 * Call this on protected pages (dashboard, quiz, etc.)
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

/**
 * Redirect to dashboard if user IS already authenticated
 * Call this on login/register pages to skip re-authentication
 */
function redirectIfAuth() {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
    }
}

// ---- UI Message Display ----

/**
 * Display a styled message (error or success) in a message container
 * @param {string} elementId - ID of the message container element
 * @param {string} text - Message text to display
 * @param {string} type - Message type: 'error' or 'success'
 */
function showMessage(elementId, text, type = 'error') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = text;
    element.className = `message ${type}`;
    element.classList.remove('hidden');

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => hideMessage(elementId), 5000);
    }
}

/**
 * Hide a message container element
 * @param {string} elementId - ID of the message container
 */
function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

// ---- API Request Helper ----

/**
 * Make an HTTP request to the backend API with proper headers and error handling
 * Automatically includes JWT token for authenticated requests
 * @param {string} endpoint - API endpoint path (e.g., '/auth/login')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object|null} body - Request body data (for POST/PUT)
 * @returns {Promise<Object>} Parsed JSON response data
 * @throws {Error} If the request fails or returns an error status
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    // Set up request headers
    const headers = {
        'Content-Type': 'application/json'
    };

    // Attach JWT token if user is authenticated
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Build fetch options
    const options = { method, headers };

    // Attach body for non-GET requests
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    // Execute fetch request
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    // If server returns 401 (unauthorized) on a protected route, force logout
    if (response.status === 401 && !endpoint.includes('/auth/')) {
        removeToken();
        window.location.href = 'login.html';
        return;
    }

    // Throw error if response is not OK (4xx or 5xx status)
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    return data;
}

// ---- Logout ----

/**
 * Log the user out by clearing all stored data and redirecting to login
 */
function logout() {
    removeToken();
    window.location.href = 'login.html';
}

// ---- Validation Helpers ----

/**
 * Validate email format using regex
 * @param {string} email - Email string to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ---- Button Loading State ----

/**
 * Toggle loading state on a submit button (show spinner, disable button)
 * @param {HTMLElement} button - The button element
 * @param {boolean} loading - True to show loading, false to restore
 */
function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');

    if (loading) {
        button.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (btnLoader) btnLoader.classList.remove('hidden');
    } else {
        button.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
    }
}