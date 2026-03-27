/**
 * =============================================
 * QUIZZERD — Dashboard Page Logic (Placeholder)
 * =============================================
 * Checks authentication, displays user info, handles logout.
 * Full dashboard features will be built in a later step.
 */

document.addEventListener('DOMContentLoaded', () => {

    // Protect this page — redirect to login if not authenticated
    requireAuth();

    // Load and display user info
    displayUserInfo();

    // Attach logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

/**
 * Display the logged-in user's name in the navbar and welcome section
 */
function displayUserInfo() {
    try {
        const user = getUser();

        if (user) {
            // Update navbar greeting
            const navUser = document.getElementById('navUser');
            if (navUser) {
                navUser.textContent = `Hello, ${user.first_name}`;
            }

            // Update welcome title
            const userName = document.getElementById('userName');
            if (userName) {
                userName.textContent = user.first_name;
            }
        }
    } catch (error) {
        console.error('Error displaying user info:', error);
    }
}

/**
 * Handle logout — clear session and redirect to login page
 */
function handleLogout() {
    // Use the shared logout utility function from utils.js
    logout();
}