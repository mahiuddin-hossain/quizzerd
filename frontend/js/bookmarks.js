/**
 * frontend/js/bookmarks.js
 * Quizzerd — Bookmarks Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initNavbar(); // Navbar & User Dropdown Logic
    loadBookmarks();
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
// 🟢 Data Loading (Bookmarks)
// ==========================================
async function loadBookmarks() {
    const list = document.getElementById('bookmarksList');
    if (!list) return;

    try {
        const data = await apiFetch('/api/bookmarks');
        
        if (!data || data.length === 0) { 
            list.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding: 2rem 0; font-size: 1.2rem;">আপনি এখনো কোনো প্রশ্ন বুকমার্ক করেননি। 🤷‍♂️</p>'; 
            return; 
        }

        list.innerHTML = data.map((bm, index) => {
            const optionsHtml = bm.options.map(opt => {
                const isCorrect = opt.trim() === bm.correct_answer.trim();
                const cls = isCorrect ? 'bm-option bm-correct' : 'bm-option';
                const mark = isCorrect ? ' <span style="float:right;">✓ সঠিক উত্তর</span>' : '';
                return `<div class="${cls}">${escapeHtml(opt)}${mark}</div>`;
            }).join('');

            return `
            <div class="bm-card">
                <button class="btn-remove" onclick="removeBookmark(${bm.id})">ডিলিট করুন 🗑️</button>
                <div class="bm-question">Q${index + 1}. ${escapeHtml(bm.question_text)}</div>
                <div class="bm-options-container">${optionsHtml}</div>
            </div>`;
        }).join('');
        
    } catch (err) { 
        console.error('Bookmark load error:', err);
        list.innerHTML = '<p style="color:var(--red);">বুকমার্ক লোড করতে সমস্যা হয়েছে।</p>'; 
    }
}

async function removeBookmark(id) {
    if(!confirm('আপনি কি নিশ্চিত যে এই বুকমার্কটি মুছে ফেলতে চান?')) return;
    
    try {
        await apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
        loadBookmarks(); // সফল হলে লিস্ট রিলোড হবে
    } catch (err) { 
        console.error('Delete bookmark error:', err);
        alert('ডিলিট করতে সমস্যা হয়েছে।'); 
    }
}

function escapeHtml(str) { 
    const d = document.createElement('div'); 
    d.appendChild(document.createTextNode(str || '')); 
    return d.innerHTML; 
}