/**
 * frontend/js/review.js
 * Quiz attempt review page (Includes Delete, Update & Bookmark mechanisms)
 */

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();

    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get('attempt_id');

    if (!attemptId) {
        alert('Attempt ID পাওয়া যায়নি।');
        window.location.href = 'dashboard.html';
        return;
    }

    loadReview(attemptId);
});

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
    // সেভ বুকমার্কের জন্য প্রশ্নগুলো গ্লোবালি স্টোর করা হলো
    window.currentQuestions = questions;

    // Header Setup
    document.getElementById('reviewSubject').textContent = attempt.subject;

    const diffLabel = { easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন' }[attempt.difficulty] || attempt.difficulty;
    document.getElementById('reviewDifficulty').textContent = diffLabel;
    document.getElementById('reviewDifficulty').className = `badge badge-${attempt.difficulty}`;

    document.getElementById('reviewDate').textContent = formatDate(attempt.attempted_at);

    // Score Calculation
    const correct = attempt.score / 10; // ১০ পয়েন্ট প্রতি প্রশ্ন
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
    // 🗑️ Delete Mechanism Setup
    // ==========================================
    const btnDelete = document.getElementById('btnDeleteQuiz');
    if (btnDelete) {
        btnDelete.classList.remove('hidden');
        btnDelete.onclick = async () => {
            const isConfirmed = confirm('আপনি কি নিশ্চিত যে এই কুইজটি ডিলিট করতে চান? কুইজ এবং এর সব ফলাফল চিরতরে মুছে যাবে।');
            if (isConfirmed) {
                try {
                    await apiFetch(`/api/quizzes/${attempt.quiz_id}`, { method: 'DELETE' });
                    alert('কুইজটি সফলভাবে ডিলিট করা হয়েছে!');
                    window.location.href = 'dashboard.html';
                } catch (err) {
                    console.error('Delete error:', err);
                    alert('কুইজটি ডিলিট করতে সমস্যা হয়েছে।');
                }
            }
        };
    }

    // ==========================================
    // ✏️ Update Mechanism Setup (Modal)
    // ==========================================
    const btnEdit = document.getElementById('btnEditQuiz');
    const editModal = document.getElementById('editModal');
    const btnCancelUpdate = document.getElementById('btnCancelUpdate');
    const btnSaveUpdate = document.getElementById('btnSaveUpdate');
    
    const subjectInput = document.getElementById('editSubjectInput');
    const difficultySelect = document.getElementById('editDifficultySelect');

    if (btnEdit && editModal) {
        btnEdit.classList.remove('hidden');

        // Modal Open
        btnEdit.onclick = () => {
            subjectInput.value = attempt.subject;
            difficultySelect.value = attempt.difficulty;
            editModal.classList.remove('hidden');
        };

        // Modal Close
        btnCancelUpdate.onclick = () => {
            editModal.classList.add('hidden');
        };

        // Save Updated Data (PUT Request)
        btnSaveUpdate.onclick = async () => {
            const newSubject = subjectInput.value.trim();
            const newDifficulty = difficultySelect.value;

            if (!newSubject) {
                alert('বিষয় (Subject) ফাঁকা রাখা যাবে না!');
                return;
            }

            try {
                await apiFetch(`/api/quizzes/${attempt.quiz_id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        subject: newSubject,
                        difficulty: newDifficulty
                    })
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
                console.error('Update error:', err);
                alert('আপডেট করতে সমস্যা হয়েছে।');
            }
        };
    }

    // Show Main Content and Hide Loader
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('reviewContent').classList.remove('hidden');
}

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
                <!-- Bookmark Button Added Here -->
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
// 🔖 Bookmark Mechanism Function
// ==========================================
async function saveBookmark(index) {
    const q = window.currentQuestions[index];
    const optionsArray = q.options.map(o => o.option_text); // শুধু অপশনের টেক্সটগুলো নেওয়া হলো
    
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
        console.error('Bookmark error:', err);
        // Error message show
        alert(err.message || 'বুকমার্ক করতে সমস্যা হয়েছে। হয়তো এটি আগেই বুকমার্ক করা আছে।');
    }
}

// Helpers
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('bn-BD', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return ''; }
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}