/**
 * frontend/js/auth.js
 * =============================================
 * QUIZZERD — Authentication Page Logic
 * =============================================
 * Handles both Login and Register form submissions.
 * Detects which page is loaded and attaches appropriate handlers.
 * Uses utility functions from utils.js (DRY principle).
 */

// Wait for DOM to fully load before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {

    // If user is already logged in, skip auth pages and go to dashboard
    redirectIfAuth();

    // Detect which form exists on the current page
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Initialize the correct page
    if (loginForm) {
        initLoginPage();
    }

    if (registerForm) {
        initRegisterPage();
    }
});

// ============================================
// LOGIN PAGE
// ============================================

/**
 * Initialize the login page — attach form submit and toggle handlers
 */
function initLoginPage() {
    const form = document.getElementById('loginForm');
    const toggleBtn = document.getElementById('togglePassword');

    // Check if user just registered (via URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        showMessage('message', 'Account created successfully! Please login.', 'success');
        // Clean the URL without reloading the page
        window.history.replaceState({}, '', 'login.html');
    }

    // Attach form submission handler
    form.addEventListener('submit', handleLogin);

    // Attach password visibility toggle
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            togglePasswordVisibility('password', toggleBtn);
        });
    }
}

/**
 * Handle login form submission
 * Validates input, sends API request, stores token on success
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
    event.preventDefault();

    // Get form values
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    // Clear any previous messages
    hideMessage('message');

    // Client-side validation: check for empty fields
    if (!username || !password) {
        showMessage('message', 'Please fill in all fields.', 'error');
        return;
    }

    try {
        // Show loading spinner on button
        setButtonLoading(loginBtn, true);

        // Send login request to backend API
        const data = await apiRequest('/api/auth/login', 'POST', {
    username,
    password
});

        // Store authentication token and user data
        setToken(data.token);
        setUser(data.user);

        // Show success feedback
        showMessage('message', 'Login successful! Redirecting...', 'success');

        // Redirect to dashboard after brief delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);

    } catch (error) {
        // Display error message from server (e.g., wrong password)
        showMessage('message', error.message, 'error');
    } finally {
        // Always restore button state
        setButtonLoading(loginBtn, false);
    }
}

// ============================================
// REGISTER PAGE
// ============================================

/**
 * Initialize the register page — attach form submit and toggle handlers
 */
function initRegisterPage() {
    const form = document.getElementById('registerForm');
    const toggleBtn = document.getElementById('togglePassword');
    const toggleConfirmBtn = document.getElementById('toggleConfirmPassword');

    // Attach form submission handler
    form.addEventListener('submit', handleRegister);

    // Attach password visibility toggles
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            togglePasswordVisibility('password', toggleBtn);
        });
    }
    if (toggleConfirmBtn) {
        toggleConfirmBtn.addEventListener('click', () => {
            togglePasswordVisibility('confirmPassword', toggleConfirmBtn);
        });
    }
}

/**
 * Handle register form submission
 * Validates all fields, sends API request, redirects to login on success
 * @param {Event} event - Form submit event
 */
async function handleRegister(event) {
    event.preventDefault();

    // Get all form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const registerBtn = document.getElementById('registerBtn');

    // Clear previous messages
    hideMessage('message');

    // ---- Client-side Validations ----

    // Check all fields are filled
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
        showMessage('message', 'Please fill in all fields.', 'error');
        return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
        showMessage('message', 'Please enter a valid email address.', 'error');
        return;
    }

    // Check minimum password length
    if (password.length < 6) {
        showMessage('message', 'Password must be at least 6 characters long.', 'error');
        return;
    }

    // Check password confirmation match
    if (password !== confirmPassword) {
        showMessage('message', 'Passwords do not match.', 'error');
        return;
    }

    try {
        // Show loading spinner
        setButtonLoading(registerBtn, true);

        // Send registration request to backend API
        const data = await apiRequest('/api/auth/register', 'POST', {
    first_name: firstName,
    last_name: lastName,
    username,
    email,
    password
});

        // Show success message
        showMessage('message', 'Account created! Redirecting to login...', 'success');

        // Redirect to login page with success indicator
        setTimeout(() => {
            window.location.href = 'login.html?registered=true';
        }, 1200);

    } catch (error) {
        // Display server error (e.g., username taken)
        showMessage('message', error.message, 'error');
    } finally {
        setButtonLoading(registerBtn, false);
    }
}

// ============================================
// SHARED AUTH HELPERS
// ============================================

/**
 * Toggle password input between visible text and hidden dots
 * @param {string} inputId - ID of the password input field
 * @param {HTMLElement} button - The toggle button element
 */
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁';
    }
}