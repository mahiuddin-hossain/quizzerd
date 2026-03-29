/**
 * frontend/js/review.js
 * Quizzerd — Quiz attempt review page with Edit, Delete & Bookmark
 */

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initNavbar(); // Navbar & Dropdown setup

    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get('attempt_id');

    if (!attemptId) {
        alert('Attempt ID পাওয়া যায়নি।');
        window.location.href = 'dashboard.html';
        return;
    }

    loadReview(attemptId);
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

    const navHamburger = document.getElementById('navHamburger');
    const mobileNav = document.getElementById('mobileNav');
    if (navHamburger && mobileNav) {
        navHamburger.onclick = () => mobileNav.classList.toggle('open');
    }

    document.getElementById('dropdownLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', logout);
}

// ==========================================
// 🟢 Load and Render Review Data
// ==========================================
async function loadReview(attemptId) {
    try {
        const data = await apiFetch(`/api/attempts/${attemptId}`);
        renderReview(data);
    } catch (err) {
        console.error(err);
        alert('রিভিউ লোড করতে সমস্যা হয়েছে।');
        window.location.href = 'dashboard.html';
    }
}

function renderReview({ attempt, questions }) {
    window.currentQuestions = questions; // Save globally for Bookmark functionality

    // Header Setup
    document.getElementById('reviewSubject').textContent = attempt.subject;

    const diffLabel = { easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন' }[attempt.difficulty] || attempt.difficulty;
    document.getElementById('reviewDifficulty').textContent = diffLabel;
    document.getElementById('reviewDifficulty').className = `badge badge-${attempt.difficulty}`;

    document.getElementById('reviewDate').textContent = formatDate(attempt.attempted_at);

    // Score Calculation
    const correct = attempt.score / 10;
    const total = attempt.total_questions;
    const skipped = questions.filter(q => !q.selected_option).length;
    const wrong = total - correct - skipped;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    document.getElementById('reviewScore').textContent = `${correct}/${total}`;
    document.getElementById('reviewAccuracy').textContent = `${accuracy}%`;
    document.getElementById('summaryCorrect').textContent = correct;
    document.getElementById('summaryWrong').textContent = wrong;
    document.getElementById('summarySkipped').textContent = skipped;

    // Questions Load
    const container = document.getElementById('questionsReview');
    container.innerHTML = questions.map((q, i) => buildQuestionCard(q, i)).join('');

    // ==========================================
    // 🟢 Edit & Delete Button Visibility Logic
    // ==========================================
    const currentUser = getUser();
    const isCreator = currentUser && (currentUser.id === attempt.creator_id); // চেক করা হচ্ছে কুইজটি ইউজারের নিজের কি না

    const btnDelete = document.getElementById('btnDeleteQuiz');
    const btnEdit = document.getElementById('btnEditQuiz');

    if (isCreator) {
        // 🗑️ Delete Mechanism
        if (btnDelete) {
            btnDelete.classList.remove('hidden');
            btnDelete.onclick = async () => {
                if (confirm('আপনি কি নিশ্চিত যে এই কুইজটি ডিলিট করতে চান? কুইজ এবং এর সব ফলাফল চিরতরে মুছে যাবে।')) {
                    try {
                        await apiFetch(`/api/quizzes/${attempt.quiz_id}`, { method: 'DELETE' });
                        alert('কুইজটি সফলভাবে ডিলিট করা হয়েছে!');
                        window.location.href = 'dashboard.html';
                    } catch (err) {
                        alert('কুইজটি ডিলিট করতে সমস্যা হয়েছে।');
                    }
                }
            };
        }

        // ✏️ Update Mechanism (Edit Modal)
        const editModal = document.getElementById('editModal');
        const btnCancelUpdate = document.getElementById('btnCancelUpdate');
        const btnSaveUpdate = document.getElementById('btnSaveUpdate');
        const subjectInput = document.getElementById('editSubjectInput');
        const difficultySelect = document.getElementById('editDifficultySelect');

        if (btnEdit && editModal) {
            btnEdit.classList.remove('hidden');

            btnEdit.onclick = () => {
                subjectInput.value = attempt.subject;
                difficultySelect.value = attempt.difficulty;
                editModal.classList.remove('hidden');
            };

            btnCancelUpdate.onclick = () => editModal.classList.add('hidden');

            btnSaveUpdate.onclick = async () => {
                const newSubject = subjectInput.value.trim();
                const newDifficulty = difficultySelect.value;

                if (!newSubject) return alert('বিষয় (Subject) ফাঁকা রাখা যাবে না!');

                try {
                    await apiFetch(`/api/quizzes/${attempt.quiz_id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ subject: newSubject, difficulty: newDifficulty })
                    });

                    alert('কুইজ সফলভাবে আপডেট হয়েছে!');
                    editModal.classList.add('hidden');

                    // UI Update Without Reload
                    document.getElementById('reviewSubject').textContent = newSubject;
                    attempt.subject = newSubject;

                    attempt.difficulty = newDifficulty;
                    const updatedDiffLabel = { easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন' }[newDifficulty];
                    const diffBadge = document.getElementById('reviewDifficulty');
                    diffBadge.textContent = updatedDiffLabel;
                    diffBadge.className = `badge badge-${newDifficulty}`;

                } catch (err) {
                    alert('আপডেট করতে সমস্যা হয়েছে।');
                }
            };
        }
    } else {
        // 🔴 যদি অন্য কারও কুইজ হয়, তবে বাটন হাইড থাকবে
        if (btnDelete) btnDelete.classList.add('hidden');
        if (btnEdit) btnEdit.classList.add('hidden');
    }

    // Show Content
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('reviewContent').classList.remove('hidden');
}

// ==========================================
// 🟢 Build Question HTML
// ==========================================
function buildQuestionCard(q, index) {
    const statusClass = q.is_correct ? 'q-correct' : (q.selected_option ? 'q-wrong' : 'q-skipped');
    const statusLabel = q.is_correct ? '✓ সঠিক' : (q.selected_option ? '✗ ভুল' : '— বাদ দেওয়া');

    const optionsHtml = q.options.map(opt => {
        const isCorrect = opt.option_text.trim() === q.correct_answer.trim();
        const isSelected = q.selected_option && opt.option_text.trim() === q.selected_option.trim();

        let cls = 'review-option';
        if (isCorrect) cls += ' option-correct';
        else if (isSelected && !isCorrect) cls += ' option-wrong';

        const indicator = isCorrect ? '<span class="opt-badge opt-correct">✓ সঠিক</span>'
            : (isSelected ? '<span class="opt-badge opt-wrong">✗ তোমার উত্তর</span>' : '');

        return `<div class="${cls}">
                    <span class="opt-text">${escapeHtml(opt.option_text)}</span>
                    ${indicator}
                </div>`;
    }).join('');

    return `
    <div class="question-card ${statusClass}">
        <div class="q-header">
            <span class="q-number">প্রশ্ন ${index + 1}</span>
            <div style="display:flex; gap: 10px; align-items:center;">
                <span class="q-status-badge">${statusLabel}</span>
                <button class="btn-bookmark-icon" onclick="saveBookmark(${index})" title="প্রশ্নটি বুকমার্ক করুন">🔖</button>
            </div>
        </div>
        <p class="q-text">${escapeHtml(q.question_text)}</p>
        <div class="q-options">${optionsHtml}</div>
        ${!q.is_correct && q.selected_option
            ? `<div class="q-explanation">
                <span class="exp-label">✦ সঠিক উত্তর:</span>
                <span class="exp-text">${escapeHtml(q.correct_answer)}</span>
               </div>`
            : ''}
    </div>`;
}

// ==========================================
// 🔖 Bookmark Mechanism
// ==========================================
async function saveBookmark(index) {
    const q = window.currentQuestions[index];
    const optionsArray = q.options.map(o => o.option_text);

    try {
        await apiFetch('/api/bookmarks', {
            method: 'POST',
            body: JSON.stringify({
                question_text: q.question_text,
                options: optionsArray,
                correct_answer: q.correct_answer
            })
        });
        alert('প্রশ্নটি বুকমার্ক করা হয়েছে! 🔖');
    } catch (err) {
        alert(err.message || 'বুকমার্ক করতে সমস্যা হয়েছে। হয়তো এটি আগেই বুকমার্ক করা আছে।');
    }
}

// ==========================================
// 🟢 Utilities
// ==========================================
function formatDate(dateStr) {
    try { return new Date(dateStr).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}