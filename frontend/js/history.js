/**
 * frontend/js/history.js
 * Quizzerd — Full Quiz History
 */

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initNavbar();
    loadHistory();
});

// ==========================================
// 🟢 Navbar Logic
// ==========================================
function initNavbar() {
    const user = getUser();
    if (user) {
        document.getElementById('navUserName').textContent = user.first_name || user.username;
        document.getElementById('userAvatar').textContent = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase();
        document.getElementById('dropUserName').textContent = `${user.first_name} ${user.last_name}`.trim();
        document.getElementById('dropUserEmail').textContent = user.email;
    }

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.onclick = (e) => { e.stopPropagation(); userDropdown.classList.toggle('hidden'); userMenuBtn.classList.toggle('active'); };
        document.onclick = (e) => { if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) { userDropdown.classList.add('hidden'); userMenuBtn.classList.remove('active'); } };
    }

    document.getElementById('navHamburger')?.addEventListener('click', () => document.getElementById('mobileNav')?.classList.toggle('open'));
    document.getElementById('dropdownLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', logout);
}

// ==========================================
// 🟢 Load History Data
// ==========================================
async function loadHistory() {
    const user = getUser();
    if (!user) return;

    const loadingEl = document.getElementById('historyLoading');
    const listEl = document.getElementById('historyList');
    const emptyEl = document.getElementById('historyEmpty');

    try {
        // 🔥 নতুন /history এপিআই কল করা হচ্ছে (যা সব ডাটা দেবে)
        const data = await apiFetch(`/api/users/${user.id}/history`);
        const quizzes = data.quizzes || [];

        loadingEl.classList.add('hidden');

        if (quizzes.length === 0) {
            emptyEl.classList.remove('hidden');
            return;
        }

        listEl.innerHTML = quizzes.map(q => buildHistoryItem(q)).join('');
    } catch (err) {
        console.error('History load error:', err);
        loadingEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
    }
}

// ==========================================
// 🟢 Build History Card
// ==========================================
function buildHistoryItem(q) {
    const diffClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[q.difficulty] || 'badge-medium';
    const diffLabel = { easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন' }[q.difficulty] || q.difficulty;
    const subjectIcon = getSubjectIcon(q.subject);
    const scorePercent = q.total_questions > 0 ? Math.round((q.score / (q.total_questions * 10)) * 100) : 0;
    const dateStr = formatDate(q.attempted_at);

    const currentUser = getUser();
    let creatorLabel = '';
    
    if (currentUser && currentUser.id === q.creator_id) {
        creatorLabel = `<span style="color: var(--accent-cyan); font-size: 0.85rem; font-weight: 600;">✦ Created by you</span>`;
    } else {
        creatorLabel = `<span style="color: var(--text-secondary); font-size: 0.85rem;">👤 By ${escapeHtml(q.creator_name)}</span>`;
    }

    // আমরা ড্যাশবোর্ডের .recent-item ক্লাসগুলো ব্যবহার করছি যাতে ডিজাইন সেম থাকে
    return `
    <a class="recent-item" href="review.html?attempt_id=${q.attempt_id}">
        <div class="recent-left">
            <div class="recent-icon">${subjectIcon}</div>
            <div class="recent-info">
                <h4>${escapeHtml(q.subject)}</h4>
                <div class="recent-meta" style="margin-top: 4px;">${creatorLabel}</div>
                <div class="recent-meta" style="margin-top: 6px;">
                    <span class="recent-badge ${diffClass}">${diffLabel}</span>
                    <span>${q.total_questions}টি প্রশ্ন</span>
                    <span>${dateStr}</span>
                </div>
            </div>
        </div>
        <div class="recent-right">
            <div class="recent-score">
                <div class="score-value">${q.score}/${q.total_questions * 10}</div>
                <div class="score-label">${scorePercent}% সঠিক</div>
            </div>
            <span class="recent-arrow">→</span>
        </div>
    </a>`;
}

// Helpers
function getSubjectIcon(subject) {
    const s = (subject || '').toLowerCase();
    if (s.includes('python') || s.includes('javascript') || s.includes('programming') || s.includes('cse') || s.includes('dsa')) return '💻';
    if (s.includes('math') || s.includes('গণিত')) return '📐';
    if (s.includes('physics') || s.includes('পদার্থ')) return '⚛️';
    if (s.includes('chemistry') || s.includes('রসায়ন')) return '🧪';
    if (s.includes('biology') || s.includes('জীব')) return '🧬';
    if (s.includes('history') || s.includes('ইতিহাস')) return '🏛️';
    if (s.includes('geography') || s.includes('ভূগোল')) return '🌍';
    if (s.includes('english')) return '📖';
    if (s.includes('bangla') || s.includes('বাংলা')) return '✍️';
    if (s.includes('medical')) return '🩺';
    if (s.includes('bcs')) return '🏛️';
    if (s.includes('science') || s.includes('বিজ্ঞান')) return '🔬';
    return '📚';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'এইমাত্র';
        if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} দিন আগে`;
        return d.toLocaleDateString('bn-BD');
    } catch { return ''; }
}

function escapeHtml(str) { const d = document.createElement('div'); d.appendChild(document.createTextNode(str || '')); return d.innerHTML; }