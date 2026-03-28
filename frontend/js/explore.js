/**
 * frontend/js/explore.js
 * Quizzerd — Explore Page Logic (Trending & Search/Filter + Navbar)
 */

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initNavbar(); // Navbar & User Dropdown Logic
    
    loadTrendingQuizzes();
    loadAllQuizzes();

    const searchInput = document.getElementById('searchInput');
    const filterDifficulty = document.getElementById('filterDifficulty');
    let debounceTimer;

    // Search Input with Debounce
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadAllQuizzes(searchInput.value, filterDifficulty.value);
            }, 500);
        });
    }

    // Filter Dropdown
    if (filterDifficulty) {
        filterDifficulty.addEventListener('change', () => {
            loadAllQuizzes(searchInput.value, filterDifficulty.value);
        });
    }
});

// ==========================================
// 🟢 Navbar & User Info Logic
// ==========================================
function initNavbar() {
    const user = getUser();
    if (user) {
        document.getElementById('navUserName').textContent = user.first_name || user.username;
        document.getElementById('userAvatar').textContent = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase();
        
        const dropUserName = document.getElementById('dropUserName');
        if (dropUserName) dropUserName.textContent = `${user.first_name} ${user.last_name}`.trim();
        
        const dropUserEmail = document.getElementById('dropUserEmail');
        if (dropUserEmail) dropUserEmail.textContent = user.email;
    }

    // Dropdown Menu Toggle
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.onclick = (e) => { 
            e.stopPropagation(); 
            userDropdown.classList.toggle('hidden'); 
            userMenuBtn.classList.toggle('active'); 
        };
        
        document.onclick = (e) => { 
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) { 
                userDropdown.classList.add('hidden'); 
                userMenuBtn.classList.remove('active'); 
            } 
        };
    }

    // Mobile Menu Toggle
    const navHamburger = document.getElementById('navHamburger');
    const mobileNav = document.getElementById('mobileNav');
    if (navHamburger && mobileNav) {
        navHamburger.onclick = () => mobileNav.classList.toggle('open');
    }

    // Logout Buttons
    document.getElementById('dropdownLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', logout);
}

// ==========================================
// 🟢 Data Loading (Explore & Trending)
// ==========================================
async function loadTrendingQuizzes() {
    try {
        const data = await apiFetch('/api/explore/trending');
        const container = document.getElementById('trendingGrid');
        
        if (!data || data.length === 0) { 
            container.innerHTML = '<p style="color:var(--text-dim);">এখনো কোনো ট্রেন্ডিং কুইজ নেই।</p>'; 
            return; 
        }
        
        container.innerHTML = data.map(quiz => buildQuizCard(quiz, true)).join('');
    } catch (error) { 
        console.error('Error loading trending:', error); 
    }
}

async function loadAllQuizzes(search = '', difficulty = 'all') {
    try {
        const container = document.getElementById('exploreGrid');
        const noData = document.getElementById('noDataMessage');
        
        if (container) container.innerHTML = '<p style="color:var(--text-dim);">খোঁজা হচ্ছে...</p>';

        const data = await apiFetch(`/api/explore/quizzes?search=${encodeURIComponent(search)}&difficulty=${difficulty}`);
        
        if (!data || data.length === 0) { 
            if (container) container.innerHTML = ''; 
            if (noData) noData.classList.remove('hidden'); 
        } else { 
            if (noData) noData.classList.add('hidden'); 
            if (container) container.innerHTML = data.map(quiz => buildQuizCard(quiz)).join(''); 
        }
    } catch (error) { 
        console.error('Error loading all quizzes:', error); 
    }
}

function buildQuizCard(quiz) {
    const diffLabel = { easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন' }[quiz.difficulty] || quiz.difficulty;
    const initial = quiz.username ? quiz.username.charAt(0).toUpperCase() : '?';
    
    return `
    <div class="quiz-card">
        <div class="card-header">
            <div>
                <h3 class="quiz-subject">${escapeHtml(quiz.subject)}</h3>
                <span class="creator-name"><span class="creator-avatar">${initial}</span> ${escapeHtml(quiz.username)}</span>
            </div>
            <span class="diff-badge ${quiz.difficulty}">${diffLabel}</span>
        </div>
        <div class="card-stats">
            <span>📝 ${quiz.total_questions} প্রশ্ন</span>
            <span>🎮 ${quiz.attempt_count} বার খেলা হয়েছে</span>
        </div>
        <button class="btn-play" onclick="window.location.href='quiz.html?quiz_id=${quiz.id}'">▶ কুইজটি খেলুন</button>
    </div>`;
}

function escapeHtml(str) { 
    const d = document.createElement('div'); 
    d.appendChild(document.createTextNode(str || '')); 
    return d.innerHTML; 
}