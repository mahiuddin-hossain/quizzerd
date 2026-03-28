/**
 * frontend/js/quiz.js
 * Quizzerd — Quiz Engine Logic (Updated with Attempt Saving)
 */

document.addEventListener('DOMContentLoaded', () => {
    // ১. Auth Check (Utils.js থেকে)
    requireAuth();

    // ২. URL থেকে Quiz ID নাও
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz_id');

    if (!quizId) {
        alert('কুইজ আইডি পাওয়া যায়নি!');
        window.location.href = 'dashboard.html';
        return;
    }

    // ৩. গেম শুরু করো
    const engine = new QuizEngine(quizId);
    engine.init();

    // Exit Button
    document.getElementById('exitBtn').addEventListener('click', () => {
        if(confirm('তুমি কি নিশ্চিত যে কুইজ থেকে বের হতে চাও? সব প্রগতি মুছে যাবে।')) {
            window.location.href = 'dashboard.html';
        }
    });
});

class QuizEngine {
    constructor(quizId) {
        this.quizId = quizId;
        this.questions = [];
        this.userAnswers = []; // ✅ নতুন: ইউজারদের উত্তর ট্র্যাক করার জন্য
        this.currentQIndex = 0;
        this.score = 0;
        this.timer = null;
        this.timeLeft = 30; 
        this.maxTime = 30;
        this.isAnswered = false;
        
        // UI Elements
        this.screens = {
            loading: document.getElementById('loadingScreen'),
            game: document.getElementById('gameScreen'),
            result: document.getElementById('resultScreen')
        };
        
        this.els = {
            questionText: document.getElementById('questionText'),
            optionsGrid: document.getElementById('optionsGrid'),
            currentQ: document.getElementById('currentQ'),
            totalQ: document.getElementById('totalQ'),
            progressBar: document.getElementById('progressBar'),
            timerDisplay: document.getElementById('timerDisplay'),
            nextBtn: document.getElementById('nextBtn'),
            feedbackMsg: document.getElementById('feedbackMsg'),
            subjectBadge: document.getElementById('subjectBadge')
        };

        // Bind Events
        this.els.nextBtn.addEventListener('click', () => this.nextQuestion());
    }

    // --- 1. Initialization ---
    async init() {
        try {
            const data = await apiFetch(`/api/quizzes/${this.quizId}`);
            
            this.quizInfo = data;
            this.questions = data.questions;

            if (!this.questions || this.questions.length === 0) {
                throw new Error('এই কুইজে কোনো প্রশ্ন নেই।');
            }

            this.els.totalQ.textContent = this.questions.length;
            this.els.subjectBadge.textContent = this.quizInfo.subject;

            this.showScreen('game');
            this.loadQuestion(0);

        } catch (error) {
            console.error(error);
            alert('কুইজ লোড করতে সমস্যা হয়েছে: ' + error.message);
            window.location.href = 'dashboard.html';
        }
    }

    // --- 2. Load Question ---
    loadQuestion(index) {
        if (index >= this.questions.length) {
            this.finishQuiz();
            return;
        }

        const q = this.questions[index];
        this.currentQIndex = index;
        this.isAnswered = false;
        this.timeLeft = this.maxTime;

        // UI Reset
        this.els.currentQ.textContent = index + 1;
        this.updateProgressBar();
        this.els.questionText.textContent = q.question_text;
        this.els.optionsGrid.innerHTML = '';
        this.els.nextBtn.classList.add('hidden');
        this.els.feedbackMsg.textContent = '';
        this.els.feedbackMsg.className = 'feedback-msg';

        // Options Render
        q.options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-card';
            btn.textContent = opt.option_text;
            // ✅ আপডেট: questionId (q.id) পাস করা হচ্ছে
            btn.onclick = () => this.handleOptionClick(btn, opt, q.correct_answer, q.id);
            this.els.optionsGrid.appendChild(btn);
        });

        this.startTimer();
    }

    // --- 3. Timer Logic ---
    startTimer() {
        clearInterval(this.timer);
        this.els.timerDisplay.textContent = this.timeLeft;
        this.els.timerDisplay.parentElement.classList.remove('danger');

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.els.timerDisplay.textContent = this.timeLeft;

            if (this.timeLeft <= 10) {
                this.els.timerDisplay.parentElement.classList.add('danger');
            }

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleTimeUp();
            }
        }, 1000);
    }

    // --- 4. Handle Interaction ---
    handleOptionClick(selectedBtn, selectedOpt, correctAns, questionId) {
        if (this.isAnswered) return;

        this.isAnswered = true;
        clearInterval(this.timer);

        const isCorrect = selectedOpt.option_text.trim() === correctAns.trim() 
                          || correctAns.includes(selectedOpt.option_text);

        // ✅ আপডেট: Answer track করা হচ্ছে
        this.userAnswers.push({
            question_id: questionId,
            selected_option: selectedOpt.option_text,
            is_correct: isCorrect
        });

        if (isCorrect) {
            this.score += 10;
            selectedBtn.classList.add('correct');
            this.showFeedback('সঠিক উত্তর! 🎉', 'correct');
        } else {
            selectedBtn.classList.add('wrong');
            this.showFeedback(`ভুল! সঠিক উত্তর: ${correctAns}`, 'wrong');
            
            const allBtns = this.els.optionsGrid.children;
            for (let btn of allBtns) {
                if (correctAns.includes(btn.textContent.trim()) || btn.textContent.trim() === correctAns.trim()) {
                    btn.classList.add('correct');
                }
            }
        }

        Array.from(this.els.optionsGrid.children).forEach(btn => btn.classList.add('disabled'));
        this.els.nextBtn.classList.remove('hidden');
    }

    handleTimeUp() {
        this.isAnswered = true;
        this.showFeedback('সময় শেষ! ⏰', 'wrong');
        
        // টাইমাউট হলে ডাটা ট্র্যাকিং (Optional but recommended)
        const currentQ = this.questions[this.currentQIndex];
        this.userAnswers.push({
            question_id: currentQ.id,
            selected_option: null,
            is_correct: false
        });

        Array.from(this.els.optionsGrid.children).forEach(btn => btn.classList.add('disabled'));

        const allBtns = this.els.optionsGrid.children;
        for (let btn of allBtns) {
            if (currentQ.correct_answer.includes(btn.textContent.trim())) {
                btn.classList.add('correct');
            }
        }
        this.els.nextBtn.classList.remove('hidden');
    }

    nextQuestion() {
        this.loadQuestion(this.currentQIndex + 1);
    }

    updateProgressBar() {
        const percentage = ((this.currentQIndex) / this.questions.length) * 100;
        this.els.progressBar.style.width = `${percentage}%`;
    }

    showFeedback(msg, type) {
        this.els.feedbackMsg.textContent = msg;
        this.els.feedbackMsg.className = `feedback-msg ${type}`;
    }

    // --- 5. Finish Quiz ---
    async finishQuiz() {
        this.showScreen('loading');
        document.querySelector('.loading-text').textContent = 'ফলাফল তৈরি করা হচ্ছে...';

        // ✅ নতুন: Attempt backend এ save করা
        try {
            const answers = this.userAnswers;
            const attemptData = await apiFetch('/api/attempts', {
                method: 'POST',
                body: JSON.stringify({
                    quiz_id: this.quizId,
                    answers: answers
                })
            });
            this.attemptId = attemptData.attempt_id;
            this.finalScore = attemptData.score; // সার্ভার থেকে আসা সঠিক স্কোর
        } catch(e) {
            console.error('Attempt save failed:', e);
        }

        // ক্যালকুলেশন (UI এর জন্য)
        const totalPoints = this.questions.length * 10;
        const currentScore = this.finalScore || this.score; // সার্ভার স্কোর অগ্রাধিকার পাবে
        const accuracy = Math.round((currentScore / totalPoints) * 100);
        const correctCount = currentScore / 10;
        const wrongCount = this.questions.length - correctCount;

        // Result Screen UI Update
        const circle = document.getElementById('scoreCirclePath');
        const percentageText = document.getElementById('scorePercentage');
        
        circle.style.strokeDasharray = `${accuracy}, 100`;
        percentageText.textContent = `${accuracy}%`;

        document.getElementById('finalScore').textContent = currentScore;
        document.getElementById('finalCorrect').textContent = correctCount;
        document.getElementById('finalWrong').textContent = wrongCount;

        const titleEl = document.getElementById('resultTitle');
        if (accuracy >= 80) titleEl.textContent = 'অসাধারণ! 🏆';
        else if (accuracy >= 50) titleEl.textContent = 'ভালো হয়েছে! 👍';
        else titleEl.textContent = 'চেষ্টা চালিয়ে যাও! 💪';

        setTimeout(() => {
            this.showScreen('result');
            if (accuracy > 70) this.startConfetti();
        }, 800);
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(el => el.classList.add('hidden'));
        Object.values(this.screens).forEach(el => el.classList.remove('active'));
        
        const target = this.screens[screenName];
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active'), 10);
    }

    startConfetti() {
        const container = document.getElementById('confetti');
        const colors = ['#00e5ff', '#7b5ea7', '#00ff88', '#ffd166'];
        
        for (let i = 0; i < 50; i++) {
            const conf = document.createElement('div');
            conf.style.position = 'absolute';
            conf.style.width = '10px';
            conf.style.height = '10px';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            conf.style.left = Math.random() * 100 + '%';
            conf.style.top = '-10px';
            conf.style.opacity = Math.random();
            conf.style.transform = `rotate(${Math.random() * 360}deg)`;
            conf.style.animation = `drop ${Math.random() * 2 + 1}s linear infinite`;
            container.appendChild(conf);
        }

        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes drop {
                to { top: 100%; transform: rotate(720deg); }
            }
        `;
        document.head.appendChild(style);
    }
}