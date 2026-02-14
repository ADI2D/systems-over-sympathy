// ===== Reader State Management =====
const ReaderState = {
    currentChapter: 'intro',
    fontSize: 18,
    theme: 'light',
    bookmarks: [],
    highlights: [],
    progress: {},
    
    save() {
        localStorage.setItem('readerState', JSON.stringify({
            currentChapter: this.currentChapter,
            fontSize: this.fontSize,
            theme: this.theme,
            bookmarks: this.bookmarks,
            highlights: this.highlights,
            progress: this.progress
        }));
    },
    
    load() {
        const saved = localStorage.getItem('readerState');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
        }
    }
};

// ===== DOM Elements =====
const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.querySelector('.sidebar-toggle'),
    sidebarClose: document.querySelector('.sidebar-close'),
    chapters: document.querySelectorAll('.chapter'),
    tocItems: document.querySelectorAll('.toc-item'),
    currentChapterLabel: document.querySelector('.current-chapter'),
    prevBtn: document.getElementById('prevChapter'),
    nextBtn: document.getElementById('nextChapter'),
    progressFill: document.getElementById('progressFill'),
    progressPercent: document.getElementById('progressPercent'),
    highlightTooltip: document.getElementById('highlightTooltip'),
    bookmarksList: document.getElementById('bookmarksList'),
    highlightsList: document.getElementById('highlightsList'),
    readerContent: document.getElementById('readerContent'),
    decreaseFontBtn: document.getElementById('decreaseFont'),
    increaseFontBtn: document.getElementById('increaseFont'),
    toggleThemeBtn: document.getElementById('toggleTheme'),
    bookmarkBtn: document.getElementById('bookmarkBtn')
};

// Chapter order for navigation
const chapterOrder = ['intro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12'];

// ===== Sidebar Toggle =====
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
}

elements.sidebarToggle?.addEventListener('click', toggleSidebar);
elements.sidebarClose?.addEventListener('click', toggleSidebar);

// Close sidebar on mobile when clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && 
        elements.sidebar.classList.contains('open') &&
        !elements.sidebar.contains(e.target) &&
        !elements.sidebarToggle.contains(e.target)) {
        toggleSidebar();
    }
});

// ===== Chapter Navigation =====
function showChapter(chapterId) {
    // Hide all chapters
    elements.chapters.forEach(ch => ch.classList.remove('active'));
    
    // Show selected chapter
    const chapter = document.getElementById(chapterId);
    if (chapter) {
        chapter.classList.add('active');
        ReaderState.currentChapter = chapterId;
        ReaderState.save();
        
        // Update TOC
        elements.tocItems.forEach(item => {
            item.classList.toggle('active', item.dataset.chapter === chapterId);
        });
        
        // Update chapter label
        const chapterTitle = chapter.querySelector('h1')?.textContent || 'Introduction';
        elements.currentChapterLabel.textContent = chapterTitle;
        
        // Update nav buttons
        updateNavButtons();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Update progress
        updateProgress();
        
        // Apply saved highlights for this chapter
        applyHighlights();
    }
}

function updateNavButtons() {
    const currentIndex = chapterOrder.indexOf(ReaderState.currentChapter);
    elements.prevBtn.disabled = currentIndex <= 0;
    elements.nextBtn.disabled = currentIndex >= chapterOrder.length - 1;
}

elements.prevBtn?.addEventListener('click', () => {
    const currentIndex = chapterOrder.indexOf(ReaderState.currentChapter);
    if (currentIndex > 0) {
        showChapter(chapterOrder[currentIndex - 1]);
    }
});

elements.nextBtn?.addEventListener('click', () => {
    const currentIndex = chapterOrder.indexOf(ReaderState.currentChapter);
    if (currentIndex < chapterOrder.length - 1) {
        showChapter(chapterOrder[currentIndex + 1]);
    }
});

// TOC Click handlers
elements.tocItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const chapterId = item.dataset.chapter;
        if (chapterId) {
            showChapter(chapterId);
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        }
    });
});

// ===== Progress Tracking =====
function updateProgress() {
    const totalChapters = chapterOrder.length;
    const currentIndex = chapterOrder.indexOf(ReaderState.currentChapter);
    
    // Mark chapters as read
    ReaderState.progress[ReaderState.currentChapter] = true;
    ReaderState.save();
    
    // Count read chapters
    const readChapters = Object.keys(ReaderState.progress).filter(ch => ReaderState.progress[ch]).length;
    const percent = Math.round((readChapters / totalChapters) * 100);
    
    elements.progressFill.style.width = percent + '%';
    elements.progressPercent.textContent = percent + '%';
}

// Track scroll progress within chapter
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const chapter = document.getElementById(ReaderState.currentChapter);
        if (chapter) {
            const rect = chapter.getBoundingClientRect();
            const scrolled = -rect.top;
            const total = chapter.offsetHeight - window.innerHeight;
            const chapterProgress = Math.min(100, Math.max(0, (scrolled / total) * 100));
            
            // Store chapter scroll position
            ReaderState.progress[ReaderState.currentChapter + '_scroll'] = chapterProgress;
            ReaderState.save();
        }
    }, 100);
});

// ===== Font Size Control =====
function adjustFontSize(delta) {
    ReaderState.fontSize = Math.max(14, Math.min(24, ReaderState.fontSize + delta));
    document.documentElement.style.setProperty('--font-size-base', ReaderState.fontSize + 'px');
    ReaderState.save();
}

elements.decreaseFontBtn?.addEventListener('click', () => adjustFontSize(-2));
elements.increaseFontBtn?.addEventListener('click', () => adjustFontSize(2));

// ===== Theme Toggle =====
function toggleTheme() {
    ReaderState.theme = ReaderState.theme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme', ReaderState.theme === 'dark');
    ReaderState.save();
}

elements.toggleThemeBtn?.addEventListener('click', toggleTheme);

// ===== Bookmarks =====
function addBookmark() {
    const chapterId = ReaderState.currentChapter;
    const chapter = document.getElementById(chapterId);
    const title = chapter?.querySelector('h1')?.textContent || 'Unknown';
    
    // Check if already bookmarked
    const existingIndex = ReaderState.bookmarks.findIndex(b => b.chapter === chapterId);
    
    if (existingIndex >= 0) {
        // Remove bookmark
        ReaderState.bookmarks.splice(existingIndex, 1);
        elements.bookmarkBtn.classList.remove('active');
    } else {
        // Add bookmark
        ReaderState.bookmarks.push({
            chapter: chapterId,
            title: title,
            date: new Date().toLocaleDateString()
        });
        elements.bookmarkBtn.classList.add('active');
    }
    
    ReaderState.save();
    renderBookmarks();
}

function renderBookmarks() {
    if (ReaderState.bookmarks.length === 0) {
        elements.bookmarksList.innerHTML = '<li class="no-bookmarks">No bookmarks yet</li>';
    } else {
        elements.bookmarksList.innerHTML = ReaderState.bookmarks.map(b => `
            <li data-chapter="${b.chapter}">
                <strong>${b.title}</strong>
                <small>${b.date}</small>
            </li>
        `).join('');
        
        // Add click handlers
        elements.bookmarksList.querySelectorAll('li[data-chapter]').forEach(li => {
            li.addEventListener('click', () => {
                showChapter(li.dataset.chapter);
            });
        });
    }
    
    // Update bookmark button state
    const isBookmarked = ReaderState.bookmarks.some(b => b.chapter === ReaderState.currentChapter);
    elements.bookmarkBtn.classList.toggle('active', isBookmarked);
}

elements.bookmarkBtn?.addEventListener('click', addBookmark);

// ===== Text Highlighting =====
let selectedRange = null;

// Show tooltip on text selection
document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text.length > 0 && elements.readerContent.contains(selection.anchorNode)) {
        selectedRange = selection.getRangeAt(0);
        
        // Position tooltip
        const rect = selectedRange.getBoundingClientRect();
        elements.highlightTooltip.style.top = (rect.top + window.scrollY - 50) + 'px';
        elements.highlightTooltip.style.left = (rect.left + rect.width / 2 - 100) + 'px';
        elements.highlightTooltip.classList.add('visible');
    } else {
        elements.highlightTooltip.classList.remove('visible');
    }
});

// Hide tooltip on click elsewhere
document.addEventListener('mousedown', (e) => {
    if (!elements.highlightTooltip.contains(e.target)) {
        elements.highlightTooltip.classList.remove('visible');
    }
});

// Highlight button handlers
elements.highlightTooltip?.querySelectorAll('.tooltip-btn[data-color]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (selectedRange) {
            highlightSelection(btn.dataset.color);
        }
    });
});

// Copy button
elements.highlightTooltip?.querySelector('.copy-btn')?.addEventListener('click', () => {
    const selection = window.getSelection();
    const text = selection.toString();
    navigator.clipboard.writeText(text).then(() => {
        elements.highlightTooltip.classList.remove('visible');
        // Could show a toast notification here
    });
});

function highlightSelection(color) {
    if (!selectedRange) return;
    
    const text = selectedRange.toString();
    const span = document.createElement('span');
    span.className = `highlight-${color}-text`;
    span.textContent = text;
    
    // Store highlight
    const highlight = {
        chapter: ReaderState.currentChapter,
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        fullText: text,
        color: color,
        date: new Date().toLocaleDateString()
    };
    
    ReaderState.highlights.push(highlight);
    ReaderState.save();
    
    // Apply highlight
    selectedRange.deleteContents();
    selectedRange.insertNode(span);
    
    // Clear selection
    window.getSelection().removeAllRanges();
    elements.highlightTooltip.classList.remove('visible');
    
    renderHighlights();
}

function renderHighlights() {
    if (ReaderState.highlights.length === 0) {
        elements.highlightsList.innerHTML = '<li class="no-highlights">No highlights yet</li>';
    } else {
        elements.highlightsList.innerHTML = ReaderState.highlights.map((h, i) => `
            <li data-index="${i}" class="highlight-item">
                <span class="highlight-preview highlight-${h.color}-text">${h.text}</span>
                <small>${h.date}</small>
            </li>
        `).join('');
        
        // Add click handlers to jump to highlight location
        elements.highlightsList.querySelectorAll('.highlight-item').forEach(li => {
            li.addEventListener('click', () => {
                const highlight = ReaderState.highlights[li.dataset.index];
                if (highlight) {
                    showChapter(highlight.chapter);
                }
            });
        });
    }
}

function applyHighlights() {
    // This would require more complex logic to restore highlights
    // after page reload, using text markers or character offsets
    // For now, highlights persist in the list but don't reapply to DOM
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            elements.prevBtn.click();
            break;
        case 'ArrowRight':
            elements.nextBtn.click();
            break;
        case 'Escape':
            if (elements.sidebar.classList.contains('open')) {
                toggleSidebar();
            }
            break;
        case 'b':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                addBookmark();
            }
            break;
    }
});

// ===== Initialize =====
function init() {
    // Load saved state
    ReaderState.load();
    
    // Apply saved settings
    document.documentElement.style.setProperty('--font-size-base', ReaderState.fontSize + 'px');
    document.body.classList.toggle('dark-theme', ReaderState.theme === 'dark');
    
    // Show saved chapter or intro
    showChapter(ReaderState.currentChapter || 'intro');
    
    // Render bookmarks and highlights
    renderBookmarks();
    renderHighlights();
    
    // Open sidebar by default on desktop
    if (window.innerWidth > 1024) {
        elements.sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
