/**
 * frontend/js/leaderboard.js
 * Quizzerd — Leaderboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initUserDisplay(); // Navbar user data
    
    // ==========================================
    // 🟢 Navbar Handlers (Updated for Dropdown)
    // ==========================================
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
            userMenuBtn.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
                userMenuBtn.classList.remove('active');
            }
        });
    }

    // Logout Handlers
    const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', logout);
    }
    
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', logout);
    
    // Mobile Hamburger Handler
    document.getElementById('navHamburger')?.addEventListener('click', () => {
        document.getElementById('mobileNav')?.classList.toggle('open');
    });

    // Load Data
    loadLeaderboard();
});

// ==========================================
// 🟢 User Info Display
// ==========================================
function initUserDisplay() {
    const user = getUser();
    if (!user) return;

    const fullName = `${user.first_name} ${user.last_name}`.trim();
    const initial = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase();
    
    // Navbar Display
    const navUserName = document.getElementById('navUserName');
    if (navUserName) navUserName.textContent = user.first_name || user.username;
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.textContent = initial;

    // Dropdown Display
    const dropUserName = document.getElementById('dropUserName');
    const dropUserEmail = document.getElementById('dropUserEmail');
    if (dropUserName) dropUserName.textContent = fullName;
    if (dropUserEmail) dropUserEmail.textContent = user.email;
}

// ==========================================
// 🟢 Fetch and Render Leaderboard Data
// ==========================================
async function loadLeaderboard() {
    const loadingEl = document.getElementById('lbLoading');
    const contentEl = document.getElementById('leaderboardContent');
    const emptyEl = document.getElementById('lbEmpty');

    try {
        const data = await apiFetch('/api/leaderboard');
        const players = data.leaderboard || [];

        loadingEl.classList.add('hidden');

        if (players.length === 0) {
            emptyEl.classList.remove('hidden');
            return;
        }

        contentEl.classList.remove('hidden');
        renderPodium(players.slice(0, 3));
        renderList(players.slice(3));

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        loadingEl.classList.add('hidden');
        showToast('লিডারবোর্ড লোড করতে সমস্যা হয়েছে।', 'error');
    }
}

// Render Top 3 (Podium)
function renderPodium(topPlayers) {
    const container = document.getElementById('podiumContainer');
    container.innerHTML = '';

    // Array reordering so UI shows: 2nd (Left) - 1st (Middle) - 3rd (Right)
    const podiumOrder = [];
    if(topPlayers[1]) podiumOrder.push({ ...topPlayers[1], rank: 2 });
    if(topPlayers[0]) podiumOrder.push({ ...topPlayers[0], rank: 1 });
    if(topPlayers[2]) podiumOrder.push({ ...topPlayers[2], rank: 3 });

    podiumOrder.forEach(player => {
        const initial = (player.first_name?.[0] || '?').toUpperCase();
        // 🔥 Use new column name: total_point
        const score = formatBanglaNumber(player.total_point);
        const isFirst = player.rank === 1;

        const card = document.createElement('div');
        card.className = `podium-item rank-${player.rank}`;
        card.innerHTML = `
            ${isFirst ? '<div class="crown">👑</div>' : ''}
            <div class="podium-avatar">${initial}</div>
            <div class="podium-name">${escapeHtml(player.first_name)}</div>
            <div class="podium-username">@${escapeHtml(player.username)}</div>
            <div class="podium-score">${score}</div>
            <div class="podium-badge">${formatBanglaNumber(player.rank)}</div>
        `;
        container.appendChild(card);
    });
}

// Render Rest (Rank 4+)
function renderList(restPlayers) {
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '';
    const currentUser = getUser();

    restPlayers.forEach((player, index) => {
        const actualRank = index + 4;
        const initial = (player.first_name?.[0] || '?').toUpperCase();
        const isMe = currentUser && currentUser.id === player.user_id;
        
        const row = document.createElement('div');
        row.className = `lb-row ${isMe ? 'current-user' : ''}`;
        
        // 🔥 Use new column names: total_point and total_attempt_quizz
        row.innerHTML = `
            <div class="lb-rank">#${formatBanglaNumber(actualRank)}</div>
            <div class="lb-avatar">${initial}</div>
            <div class="lb-info">
                <div class="lb-name">${escapeHtml(player.first_name)} ${isMe ? '(তুমি)' : ''}</div>
                <div class="lb-username">@${escapeHtml(player.username)}</div>
            </div>
            <div class="lb-stats">
                <div class="lb-score">${formatBanglaNumber(player.total_point)}</div>
                <div class="lb-quizzes">${formatBanglaNumber(player.total_attempt_quizz)} কুইজ</div>
            </div>
        `;
        container.appendChild(row);
    });
}

// ==========================================
// 🟢 Utilities
// ==========================================
function formatBanglaNumber(num) {
    const bangla = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bangla[d]);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
}