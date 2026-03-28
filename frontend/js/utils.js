/**
 * frontend/js/utils.js
 * =============================================
 * QUIZZERD — Shared Utility Functions
 * =============================================
 * Contains reusable helper functions used across all pages.
 */

// Base URL for all API requests
// dashboard.js এ যেহেতু /api পাথ সহ কল করা হয়, তাই এখানে শুধু পোর্ট পর্যন্ত রাখা হলো
const API_BASE = 'http://localhost:3000'; 

// ---- Token Management (localStorage + Cookie) ----

function setToken(token) {
    try {
        localStorage.setItem('quizzerd_token', token);
        document.cookie = `quizzerd_token=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
    } catch (error) {
        console.error('Error storing token:', error);
    }
}

function getToken() {
    try {
        // চেকিং: নতুন নাম অথবা পুরনো নাম (backward compatibility)
        return localStorage.getItem('quizzerd_token') || localStorage.getItem('token');
    } catch (error) {
        console.error('Error retrieving token:', error);
        return null;
    }
}

function removeToken() {
    try {
        localStorage.removeItem('quizzerd_token');
        localStorage.removeItem('token'); // পুরনোটা থাকলে মুছে ফেলবে
        localStorage.removeItem('quizzerd_user');
        localStorage.removeItem('user');
        document.cookie = 'quizzerd_token=; path=/; max-age=0';
    } catch (error) {
        console.error('Error removing token:', error);
    }
}

// ---- User Data Management ----

function setUser(user) {
    try {
        localStorage.setItem('quizzerd_user', JSON.stringify(user));
    } catch (error) {
        console.error('Error storing user data:', error);
    }
}

function getUser() {
    try {
        const data = localStorage.getItem('quizzerd_user') || localStorage.getItem('user');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error retrieving user data:', error);
        return null;
    }
}

// [COMPATIBILITY] dashboard.js এর জন্য saveUser ফাংশন
function saveUser(token, user) {
    setToken(token);
    setUser(user);
}

// ---- Authentication Checks ----

function isAuthenticated() {
    return !!getToken();
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

function redirectIfAuth() {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
    }
}

// ---- UI Message Display ----

function showMessage(elementId, text, type = 'error') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = text;
    element.className = `message ${type}`;
    element.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => hideMessage(elementId), 5000);
    }
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

// [COMPATIBILITY] dashboard.js এর জন্য showToast ফাংশন
function showToast(message, type = 'info') {
    // এখানে আমরা সিম্পল অ্যালার্ট বা কনসোল লগ ব্যবহার করছি
    // তুমি চাইলে সুন্দর কোনো টোস্ট লাইব্রেরি বা কাস্টম ডিভ ব্যবহার করতে পারো
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // যদি UI তে দেখানোর ব্যবস্থা না থাকে, তবে আপাতত অ্যালার্ট
    if (type === 'error') {
        alert('⚠️ ' + message);
    } else {
        // Success মেসেজ বারবার অ্যালার্ট করলে বিরক্তিকর হতে পারে, তাই শুধু কনসোলে বা ছোট পপআপে
        // alert('✅ ' + message); 
    }
}

// ---- API Request Helper ----

/**
 * [CORE FUNCTION] apiRequest
 * তোমার আগের কোড অনুযায়ী
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    return apiFetch(endpoint, {
        method: method,
        body: body ? JSON.stringify(body) : null
    });
}

/**
 * [COMPATIBILITY] apiFetch
 * dashboard.js এই ফাংশনটিই কল করছে। এটি fetch এর মতো কাজ করে কিন্তু অটোমেটিক টোকেন বসায়।
 */
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        // URL হ্যান্ডলিং: ড্যাশবোর্ড থেকে /api পাঠানো হলে সেটা ঠিক রাখা
        const url = `${API_BASE}${endpoint}`;
        
        const response = await fetch(url, config);
        
        // 401 Unauthorized হলে লগআউট
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            removeToken();
            window.location.href = 'login.html';
            throw new Error('Session expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong.');
        }

        return data;
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// ---- Logout ----

function logout() {
    removeToken();
    window.location.href = 'login.html';
}

// ---- Validation Helpers ----

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ---- Button Loading State ----

function setButtonLoading(button, loading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text') || button.querySelector('.btn-generate-text');
    const btnLoader = button.querySelector('.btn-loader') || button.querySelector('.btn-generate-loader');

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