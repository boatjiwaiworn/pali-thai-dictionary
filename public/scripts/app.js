import { sinhalaToThai } from './pali-converter.js';

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const searchInput = document.getElementById('searchInput');
    const contentArea = document.getElementById('contentArea');
    
    let currentMode = 'dict';
    let searchTimer;

    // Theme
    const initTheme = () => {
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        themeToggle.querySelector('i').className = saved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    };
    themeToggle.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.querySelector('i').className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
    initTheme();

    // Mode Switching
    const placeholders = {
        dict: 'พิมพ์คำบาลีที่ต้องการค้น...',
        reverse: 'พิมพ์คำไทยเพื่อค้นคำบาลี...'
    };

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            searchInput.placeholder = placeholders[currentMode];
            searchInput.value = '';
            searchInput.focus();
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-book-open-reader"></i>
                    <p>พิมพ์คำค้นด้านบนเพื่อเริ่มค้นหา</p>
                    <span class="hint">${currentMode === 'dict' ? 'ค้นคำบาลี → แสดงความหมายภาษาไทย' : 'ค้นคำไทย → หาคำบาลีที่ตรงกัน'}</span>
                </div>`;
        });
    });

    // Search
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = searchInput.value.trim();
        if (q.length < 1) return;
        searchTimer = setTimeout(() => performSearch(q), 400);
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimer);
            const q = searchInput.value.trim();
            if (q.length > 0) performSearch(q);
        }
    });

    const performSearch = async (query) => {
        showLoading();
        try {
            const endpoint = currentMode === 'dict' ? '/api/dict' : '/api/reverse';
            const bodyKey = currentMode === 'dict' ? 'word' : 'term';
            
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [bodyKey]: query, limit: 200 })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            
            const results = Array.isArray(data) ? data : [];
            renderResults(results, query);
        } catch (error) {
            showError('เกิดข้อผิดพลาด: ' + error.message);
            console.error(error);
        }
    };

    const highlightTerm = (text, term) => {
        if (!term || !text) return text || '';
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    };

    const stripHTML = (html) => {
        if (!html) return '';
        const d = document.createElement('div');
        d.innerHTML = html;
        return d.textContent || '';
    };

    const renderResults = (results, query) => {
        if (!results || results.length === 0) {
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-search"></i>
                    <p>ไม่พบผลลัพธ์สำหรับ "${query}"</p>
                </div>`;
            return;
        }

        let html = `<div class="results-header">พบ ${results.length} ผลลัพธ์สำหรับ "${query}"</div><div class="results-list">`;
        results.forEach(r => {
            const word = sinhalaToThai(r.word || '');
            const meaning = stripHTML(r.meaning || '');
            const snippet = meaning.length > 400 ? meaning.substring(0, 400) + '…' : meaning;
            const dictName = r.dictName || '';
            const highlighted = highlightTerm(snippet, query);

            html += `<div class="result-item">
                <span class="result-badge">${dictName}</span>
                <span class="result-title pali-text">${word}</span>
                <span class="result-snippet">${highlighted}</span>
            </div>`;
        });
        html += '</div>';
        contentArea.innerHTML = html;
    };

    // UI Helpers
    const showLoading = () => {
        contentArea.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <p>กำลังค้นหา...</p>
            </div>`;
    };
    const showError = (msg) => {
        contentArea.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>${msg}</p>
            </div>`;
    };
});
