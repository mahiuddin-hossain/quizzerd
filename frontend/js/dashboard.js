/**
 * frontend/js/dashboard.js
 * QUIZZERD — Dashboard Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---- Auth Guard ----
    requireAuth();

    // ---- User Info দেখাও ----
    initUserDisplay();

    // ---- Dashboard Stats লোড করো ----
    loadStats();

    // ---- Recent Quizzes লোড করো ----
    loadRecentQuizzes();

    // ---- Category Card logic ----
    initCategoryCards();

    // ---- User Menu Dropdown & Logout ----
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

    const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', handleLogout);
    }
    
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', handleLogout);

    // ---- Generate Button ----
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // ---- Clear Subject ----
    const clearBtn = document.getElementById('clearSubject');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSubjectSelection);
    }

    // ---- Mobile hamburger ----
    document.getElementById('navHamburger')?.addEventListener('click', () => {
        document.getElementById('mobileNav')?.classList.toggle('open');
    });
});

// =============================================
// USER INFO
// =============================================
function initUserDisplay() {
    const user = getUser();
    if (!user) return;

    const fullName = `${user.first_name} ${user.last_name}`.trim();
    const initial = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase();

    // Navbar
    const navUserName = document.getElementById('navUserName');
    if (navUserName) navUserName.textContent = user.first_name || user.username;

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.textContent = initial;

    // Welcome section
    const userName = document.getElementById('userName');
    if (userName) userName.textContent = user.first_name || user.username;

    // Dropdown section
    const dropUserName = document.getElementById('dropUserName');
    const dropUserEmail = document.getElementById('dropUserEmail');
    if (dropUserName) dropUserName.textContent = fullName;
    if (dropUserEmail) dropUserEmail.textContent = user.email;
}


// =============================================
// DASHBOARD STATS (Updated)
// =============================================
async function loadStats() {
    const user = getUser();
    if (!user) return;

    try {
        const data = await apiFetch(`/api/users/${user.id}/stats`);

        // ডাটাবেস থেকে পাওয়া ভ্যালু
        const points = data.total_point || 0;
        const quizzes = data.total_attempt_quizz || 0;

        // সঠিক উত্তরের পার্সেন্টেজ ক্যালকুলেশন
        // প্রতি কুইজে গড়ে ১০০ পয়েন্ট (১০টি প্রশ্ন * ১০ পয়েন্ট) ধরে হিসাব করা হলো:
        // সূত্র: (মোট অর্জিত পয়েন্ট / মোট সম্ভাব্য পয়েন্ট) * ১০০
        let accuracy = 0;
        if (quizzes > 0) {
            accuracy = Math.round(points / quizzes); 
            if (accuracy > 100) accuracy = 100; // সেফটি চেক
        }

        const statScore = document.getElementById('statScore');
        const statQuizzes = document.getElementById('statQuizzes');
        const statCorrect = document.getElementById('statCorrect');

        // UI তে ডাটা সেট করা (বাংলা নাম্বারে কনভার্ট করে)
        if (statScore) statScore.textContent = formatBanglaNumber(points);
        if (statQuizzes) statQuizzes.textContent = formatBanglaNumber(quizzes);
        if (statCorrect) statCorrect.textContent = `${formatBanglaNumber(accuracy)}%`;

    } catch (err) {
        console.error('Stats load error:', err);
    }
}

function formatBanglaNumber(num) {
    const bangla = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bangla[d]);
}

// =============================================
// CATEGORY CARD SELECTION
// =============================================
let selectedSubject = '';

function initCategoryCards() {
    const cards = document.querySelectorAll('.category-card');

    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('sub-tag')) return;
            cards.forEach(c => c.classList.remove('active'));
            card.classList.toggle('active');
        });
    });

    document.querySelectorAll('.sub-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.sub-tag').forEach(t => t.classList.remove('selected'));
            
            tag.classList.add('selected');
            selectedSubject = tag.dataset.subject;

            const subjectInput = document.getElementById('subjectInput');
            if (subjectInput) {
                subjectInput.value = selectedSubject;
                subjectInput.readOnly = true;
            }
        });
    });

    const subjectInput = document.getElementById('subjectInput');
    if (subjectInput) {
        subjectInput.readOnly = false;
        subjectInput.addEventListener('input', () => {
            selectedSubject = subjectInput.value;
            if (!subjectInput.value) {
                document.querySelectorAll('.sub-tag').forEach(t => t.classList.remove('selected'));
            }
        });
    }
}

function clearSubjectSelection() {
    selectedSubject = '';
    const subjectInput = document.getElementById('subjectInput');
    if (subjectInput) subjectInput.value = '';

    document.querySelectorAll('.sub-tag').forEach(t => t.classList.remove('selected'));
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
}

// =============================================
// QUIZ GENERATION
// =============================================
async function handleGenerate() {
    const subjectInput = document.getElementById('subjectInput');
    const questionCount = document.getElementById('questionCount');
    const difficultySelect = document.getElementById('difficultySelect');
    const customPrompt = document.getElementById('customPrompt');

    const subject = (subjectInput?.value || '').trim();
    const difficulty = difficultySelect?.value || 'medium';
    const count = parseInt(questionCount?.value || '10');
    const prompt = (customPrompt?.value || '').trim();

    if (!subject) {
        showToast('একটি বিষয় নির্বাচন করো বা লেখো।', 'error');
        subjectInput?.focus();
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.querySelector('.btn-generate-text');
    const btnLoader = document.querySelector('.btn-generate-loader');

    if (generateBtn) generateBtn.disabled = true;
    if (btnText) btnText.classList.add('hidden');
    if (btnLoader) btnLoader.classList.remove('hidden');

    showGeneratingOverlay(subject, count);

    try {
        const data = await apiFetch('/api/quizzes/generate', {
            method: 'POST',
            body: JSON.stringify({
                subject,
                difficulty,
                question_count: count,
                prompt: prompt || undefined
            })
        });

        setOverlayProgress(100, 'কুইজ প্রস্তুত! শুরু হচ্ছে...');

        setTimeout(() => {
            window.location.href = `quiz.html?quiz_id=${data.quiz_id}`;
        }, 800);

    } catch (err) {
        console.error('Generate error:', err);
        hideGeneratingOverlay();

        if (generateBtn) generateBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');

        showToast(err.message || 'কুইজ তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করো।', 'error');
    }
}

// =============================================
// GENERATING OVERLAY ANIMATION
// =============================================
const statusMessages = [
    'Gemini AI কে প্রম্পট পাঠানো হচ্ছে...',
    'প্রশ্ন তৈরি করা হচ্ছে...',
    'উত্তর যাচাই করা হচ্ছে...',
    'ডেটাবেজে সংরক্ষণ করা হচ্ছে...',
    'কুইজ প্রস্তুত করা হচ্ছে...'
];

let overlayProgressInterval = null;
let overlayStatusInterval = null;
let currentProgress = 0;
let currentStatusIdx = 0;

function showGeneratingOverlay(subject, count) {
    const overlay = document.getElementById('generatingOverlay');
    const subjectText = document.getElementById('genSubjectText');
    const progressFill = document.getElementById('genProgressFill');
    const statusText = document.getElementById('genStatusText');

    if (!overlay) return;

    if (subjectText) subjectText.textContent = `${subject} — ${count}টি প্রশ্ন`;

    currentProgress = 0;
    currentStatusIdx = 0;
    if (progressFill) progressFill.style.width = '0%';
    if (statusText) statusText.textContent = statusMessages[0];

    overlay.classList.remove('hidden');

    overlayProgressInterval = setInterval(() => {
        if (currentProgress < 88) {
            currentProgress += Math.random() * 3 + 1;
            if (currentProgress > 88) currentProgress = 88;
            if (progressFill) progressFill.style.width = `${currentProgress}%`;
        }
    }, 400);

    overlayStatusInterval = setInterval(() => {
        currentStatusIdx = (currentStatusIdx + 1) % statusMessages.length;
        if (statusText) statusText.textContent = statusMessages[currentStatusIdx];
    }, 2000);
}

function setOverlayProgress(percent, statusMsg) {
    clearInterval(overlayProgressInterval);
    clearInterval(overlayStatusInterval);

    const progressFill = document.getElementById('genProgressFill');
    const statusText = document.getElementById('genStatusText');

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (statusText) statusText.textContent = statusMsg;
}

function hideGeneratingOverlay() {
    clearInterval(overlayProgressInterval);
    clearInterval(overlayStatusInterval);

    const overlay = document.getElementById('generatingOverlay');
    if (overlay) overlay.classList.add('hidden');

    currentProgress = 0;
    currentStatusIdx = 0;
}

// =============================================
// RECENT QUIZZES
// =============================================
async function loadRecentQuizzes() {
    const user = getUser();
    if (!user) return;

    const loadingEl = document.getElementById('recentLoading');
    const listEl = document.getElementById('recentList');
    const emptyEl = document.getElementById('recentEmpty');

    try {
        const data = await apiFetch(`/api/users/${user.id}/quizzes`);
        const quizzes = data.quizzes || [];

        if (loadingEl) loadingEl.classList.add('hidden');

        if (quizzes.length === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }

        if (listEl) {
            listEl.innerHTML = quizzes.map(q => buildRecentItem(q)).join('');
        }

    } catch (err) {
        console.error('Recent quizzes load error:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
    }
}

// =============================================
// BUILD RECENT ITEM (Updated with Creator Name)
// =============================================
function buildRecentItem(q) {
    const diffClass = {
        easy: 'badge-easy',
        medium: 'badge-medium',
        hard: 'badge-hard'
    }[q.difficulty] || 'badge-medium';

    const diffLabel = {
        easy: 'সহজ',
        medium: 'মাঝারি',
        hard: 'কঠিন'
    }[q.difficulty] || q.difficulty;

    const subjectIcon = getSubjectIcon(q.subject);
    const scorePercent = q.total_questions > 0
        ? Math.round((q.score / (q.total_questions * 10)) * 100)
        : 0;

    const dateStr = formatDate(q.attempted_at);

    // 🟢 Creator Name Logic
    const currentUser = getUser();
    let creatorLabel = '';
    
    // যদি কুইজটি এই ইউজার নিজেই তৈরি করে থাকে
    if (currentUser && currentUser.id === q.creator_id) {
        creatorLabel = `<span style="color: var(--cyan); font-size: 0.8rem; font-weight: 600;">✦ Created by you</span>`;
    } else {
        // অন্য কেউ তৈরি করলে তার নাম দেখাবে
        creatorLabel = `<span style="color: var(--text-dim); font-size: 0.8rem;">👤 By ${escapeHtml(q.creator_name)}</span>`;
    }

    return `
    <a class="recent-item" href="review.html?attempt_id=${q.attempt_id}">
        <div class="recent-left">
            <div class="recent-icon">${subjectIcon}</div>
            <div class="recent-info">
                <h4>${escapeHtml(q.subject)}</h4>
                <div class="recent-meta" style="margin-top: 4px;">
                    ${creatorLabel}
                </div>
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

function getSubjectIcon(subject) {
    const s = (subject || '').toLowerCase();
    if (s.includes('python') || s.includes('javascript') || s.includes('programming') || s.includes('cse') || s.includes('dsa') || s.includes('sql') || s.includes('network') || s.includes('os')) return '💻';
    if (s.includes('math') || s.includes('গণিত')) return '📐';
    if (s.includes('physics') || s.includes('পদার্থ')) return '⚛️';
    if (s.includes('chemistry') || s.includes('রসায়ন')) return '🧪';
    if (s.includes('biology') || s.includes('জীব')) return '🧬';
    if (s.includes('history') || s.includes('ইতিহাস')) return '🏛️';
    if (s.includes('geography') || s.includes('ভূগোল')) return '🌍';
    if (s.includes('english')) return '📖';
    if (s.includes('bangla') || s.includes('বাংলা')) return '✍️';
    if (s.includes('medical') || s.includes('anatomy') || s.includes('physiology')) return '🩺';
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
    } catch {
        return '';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
}

// =============================================
// LOGOUT
// =============================================
function handleLogout() {
    logout();
}

function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    alert(message);
}