// State Management
let releases = [];
let filteredReleases = [];
let currentCategory = 'all';
let searchQuery = '';
let selectedRelease = null;
let currentPage = 1;
const itemsPerPage = 12;

// Progress Ring Configuration
const ringRadius = 9;
const ringCircumference = 2 * Math.PI * ringRadius;

// DOM Elements
const releasesGrid = document.getElementById('releases-grid');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const categoryFilters = document.getElementById('category-filters');
const refreshBtn = document.getElementById('refresh-btn');
const refreshSpinner = document.getElementById('refresh-spinner');
const themeSwitchCheckbox = document.getElementById('theme-switch-checkbox');
const statusBanner = document.getElementById('status-banner');
const statusMessage = document.getElementById('status-message');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const paginationContainer = document.getElementById('pagination-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCloseBackdrop = document.getElementById('modal-close-backdrop');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const progressRingBar = document.getElementById('progress-ring-bar');
const postTweetBtn = document.getElementById('post-tweet-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const toastContainer = document.getElementById('toast-container');

// Preview Elements in Modal
const previewUpdateType = document.getElementById('preview-update-type');
const previewUpdateDate = document.getElementById('preview-update-date');
const previewUpdateText = document.getElementById('preview-update-text');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupEventListeners();
    setupProgressRing();
    fetchReleases();
});

// Theme Setup
function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        if (themeSwitchCheckbox) themeSwitchCheckbox.checked = true;
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        if (themeSwitchCheckbox) themeSwitchCheckbox.checked = false;
    }
}

function handleThemeChange(e) {
    if (e.target.checked) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        showToast('Switched to light theme', 'success');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Switched to dark theme', 'success');
    }
}

// Progress Ring Setup
function setupProgressRing() {
    if (progressRingBar) {
        progressRingBar.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
        progressRingBar.style.strokeDashoffset = ringCircumference;
    }
}

// Event Listeners
function setupEventListeners() {
    // Theme Switch Slider
    if (themeSwitchCheckbox) {
        themeSwitchCheckbox.addEventListener('change', handleThemeChange);
    }

    // Refresh button
    refreshBtn.addEventListener('click', () => fetchReleases(true));

    // Export CSV button
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }

    // Search inputs
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        applyFilters();
    });

    // Category filters
    categoryFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        // Toggle active class
        categoryFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        currentCategory = chip.dataset.category;
        applyFilters();
    });

    // Reset filters button
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Modal Close
    modalCloseBtn.addEventListener('click', closeTweetModal);
    modalCloseBackdrop.addEventListener('click', closeTweetModal);
    
    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });

    // Textarea input
    tweetTextarea.addEventListener('input', updateTweetLength);

    // Tweet actions
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    postTweetBtn.addEventListener('click', postTweetToTwitter);

    // Load More button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            renderReleases();
        });
    }

    // Hashtag checkboxes click events to update tweet content in real time
    ['tag-bq', 'tag-gc', 'tag-gcp'].forEach(id => {
        const cb = document.getElementById(id);
        if (cb) {
            cb.addEventListener('change', () => {
                if (selectedRelease) {
                    tweetTextarea.value = generateTweetText(selectedRelease);
                    updateTweetLength();
                }
            });
        }
    });
}

// Reset all search and category filters
function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    categoryFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    categoryFilters.querySelector('[data-category="all"]').classList.add('active');
    
    currentCategory = 'all';
    applyFilters();
}

// Fetch releases from API
async function fetchReleases(forceRefresh = false) {
    showLoadingState();
    
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'warning') {
            releases = data.releases;
            
            if (data.status === 'warning') {
                showToast(`Using cached data. Feed sync failed: ${data.error}`, 'error');
                showStatusBanner(`Sync failed, displaying last cached version.`, true);
            } else {
                showStatusBanner('', false);
                if (forceRefresh) {
                    showToast('Release notes successfully synced!', 'success');
                }
            }
            
            updateCategoryBadges();
            applyFilters();
        } else {
            showErrorState(data.message || 'Failed to fetch release notes.');
        }
    } catch (error) {
        showErrorState('Network error: Could not reach the server.');
        showToast('Network error occurred.', 'error');
    } finally {
        hideLoadingState();
    }
}

// Update the Badge numbers next to categories
function updateCategoryBadges() {
    const counts = {
        all: releases.length,
        feature: 0,
        announcement: 0,
        issue: 0,
        deprecation: 0
    };

    releases.forEach(r => {
        const type = r.type.toLowerCase();
        if (type.includes('feature')) counts.feature++;
        else if (type.includes('announc') || type.includes('notice')) counts.announcement++;
        else if (type.includes('issue')) counts.issue++;
        else if (type.includes('deprecat') || type.includes('chang') || type.includes('break')) counts.deprecation++;
    });

    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.feature;
    document.getElementById('count-announcement').textContent = counts.announcement;
    document.getElementById('count-issue').textContent = counts.issue;
    document.getElementById('count-deprecation').textContent = counts.deprecation;
}

// Category filter matcher
function matchCategory(releaseType, category) {
    if (category === 'all') return true;
    
    const type = releaseType.toLowerCase();
    if (category === 'feature') return type.includes('feature');
    if (category === 'announcement') return type.includes('announc') || type.includes('notice');
    if (category === 'issue') return type.includes('issue');
    if (category === 'deprecation') return type.includes('deprecat') || type.includes('chang') || type.includes('break');
    
    return false;
}

// Apply current filters & search queries to state
function applyFilters() {
    currentPage = 1; // Reset to page 1 on filter change
    filteredReleases = releases.filter(r => {
        const matchesCategory = matchCategory(r.type, currentCategory);
        
        const matchesSearch = !searchQuery || 
            r.date.toLowerCase().includes(searchQuery) ||
            r.type.toLowerCase().includes(searchQuery) ||
            r.text.toLowerCase().includes(searchQuery) ||
            r.html.toLowerCase().includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });

    renderReleases();
}

// Display Loading skeleton cards
function showLoadingState() {
    refreshSpinner.classList.add('spinning');
    refreshBtn.disabled = true;
    
    // Only show skeleton cards if we don't have current cards, otherwise keep current cards visible with spinner
    if (releases.length === 0) {
        releasesGrid.innerHTML = `
            <div class="card skeleton">
                <div class="skeleton-header"><div class="skeleton-pill"></div><div class="skeleton-date"></div></div>
                <div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
                <div class="skeleton-footer"></div>
            </div>
            <div class="card skeleton">
                <div class="skeleton-header"><div class="skeleton-pill"></div><div class="skeleton-date"></div></div>
                <div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
                <div class="skeleton-footer"></div>
            </div>
            <div class="card skeleton">
                <div class="skeleton-header"><div class="skeleton-pill"></div><div class="skeleton-date"></div></div>
                <div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
                <div class="skeleton-footer"></div>
            </div>
        `;
    }
}

function hideLoadingState() {
    refreshSpinner.classList.remove('spinning');
    refreshBtn.disabled = false;
}

function showErrorState(message) {
    releasesGrid.innerHTML = '';
    showStatusBanner(`Error: ${message}`, true);
}

function showStatusBanner(message, show) {
    if (show) {
        statusMessage.textContent = message;
        statusBanner.style.display = 'block';
    } else {
        statusBanner.style.display = 'none';
    }
}

// Render filtered release cards to DOM
function renderReleases() {
    releasesGrid.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        emptyState.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    
    const visibleCount = currentPage * itemsPerPage;
    const visibleReleases = filteredReleases.slice(0, visibleCount);
    
    visibleReleases.forEach(r => {
        const card = document.createElement('div');
        const themeClass = getThemeClass(r.type);
        card.className = `card ${themeClass}`;
        
        // Structure content
        card.innerHTML = `
            <div class="card-header">
                <span class="release-badge ${themeClass}">${r.type}</span>
                <span class="release-date">${r.date}</span>
            </div>
            <div class="card-body">
                ${r.html}
            </div>
            <div class="card-footer">
                <a href="${r.link}" target="_blank" rel="noopener noreferrer" class="source-link" title="Open official release notes">
                    <span>docs.cloud.google.com</span>
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                </a>
                <div class="card-actions">
                    <button class="copy-action-btn" data-id="${r.id}" title="Copy release notes to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button class="tweet-action-btn" data-id="${r.id}">
                        <svg viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            </div>
        `;
        
        releasesGrid.appendChild(card);
    });

    // Toggle Load More button visibility
    if (paginationContainer) {
        if (visibleCount < filteredReleases.length) {
            paginationContainer.style.display = 'flex';
        } else {
            paginationContainer.style.display = 'none';
        }
    }

    // Attach click events to Copy buttons
    releasesGrid.querySelectorAll('.copy-action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetBtn = e.currentTarget;
            if (targetBtn.classList.contains('success-state')) return;

            const releaseId = targetBtn.dataset.id;
            const item = releases.find(r => r.id === releaseId);
            if (item) {
                try {
                    await navigator.clipboard.writeText(item.text);
                    showToast('Release content copied!', 'success');
                    
                    // Button feedback
                    const originalText = targetBtn.querySelector('span').textContent;
                    const originalIconHTML = targetBtn.querySelector('svg').outerHTML;
                    
                    targetBtn.innerHTML = `
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span>Copied!</span>
                    `;
                    targetBtn.classList.add('success-state');
                    
                    setTimeout(() => {
                        targetBtn.innerHTML = `${originalIconHTML}<span>${originalText}</span>`;
                        targetBtn.classList.remove('success-state');
                    }, 2000);
                    
                } catch (err) {
                    console.error('Card copy failed:', err);
                    showToast('Failed to copy content.', 'error');
                }
            }
        });
    });

    // Attach click events to Tweet buttons
    releasesGrid.querySelectorAll('.tweet-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const releaseId = e.currentTarget.dataset.id;
            const item = releases.find(r => r.id === releaseId);
            if (item) {
                openTweetModal(item);
            }
        });
    });
}

// Brand helper
function getThemeClass(type) {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('feature')) return 'type-feature';
    if (lowerType.includes('announc') || lowerType.includes('notice')) return 'type-announcement';
    if (lowerType.includes('issue')) return 'type-issue';
    if (lowerType.includes('deprecat') || lowerType.includes('chang') || lowerType.includes('break')) return 'type-deprecation';
    return 'type-update';
}

// Tweet Composer Modal Controls
function openTweetModal(release) {
    selectedRelease = release;
    tweetModal.classList.add('active');
    tweetModal.setAttribute('aria-hidden', 'false');
    
    // Set Preview Content
    previewUpdateType.textContent = release.type;
    previewUpdateType.className = `preview-type ${getThemeClass(release.type)}`;
    previewUpdateDate.textContent = release.date;
    previewUpdateText.textContent = release.text;
    
    // Reset hashtag checkboxes to default checked state
    ['tag-bq', 'tag-gc', 'tag-gcp'].forEach(id => {
        const cb = document.getElementById(id);
        if (cb) cb.checked = true;
    });
    
    // Draft tweet contents
    const textSnippet = generateTweetText(release);
    tweetTextarea.value = textSnippet;
    
    // Trigger length updates
    updateTweetLength();
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.remove('active');
    tweetModal.setAttribute('aria-hidden', 'true');
    selectedRelease = null;
}

// Get current active hashtags based on checkbox options
function getActiveHashtags() {
    const tags = [];
    if (document.getElementById('tag-bq')?.checked) tags.push('#BigQuery');
    if (document.getElementById('tag-gc')?.checked) tags.push('#GoogleCloud');
    if (document.getElementById('tag-gcp')?.checked) tags.push('#GCP');
    return tags.join(' ');
}

// Smart Tweet generator fitting within limits
function generateTweetText(release) {
    const hashTags = getActiveHashtags();
    const header = `BigQuery Update - ${release.date} [${release.type}]:`;
    const link = release.link;
    
    // Length calculations
    // Character limit is 280
    // We want: header + "\n" + snippet + "\n\n" + link + "\n" + tags
    // Let's compute characters available for snippet:
    const baseTemplate = `${header}\n\n\n\n${link}\n${hashTags}`;
    const usedLength = baseTemplate.length;
    const maxSnippetLength = 280 - usedLength - 5; // buffer for ellipsis
    
    let snippet = release.text;
    if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength).trim() + "...";
    }
    
    const formattedTags = hashTags ? `\n${hashTags}` : '';
    return `${header}\n"${snippet}"\n\n${link}${formattedTags}`;
}

// Update character limits and visual indicators
function updateTweetLength() {
    const text = tweetTextarea.value;
    const len = text.length;
    const remaining = 280 - len;
    
    // Text elements
    charCount.textContent = remaining;
    
    // Coloring
    if (remaining < 0) {
        charCount.className = 'danger';
        postTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        charCount.className = 'warning';
        postTweetBtn.disabled = false;
    } else {
        charCount.className = '';
        postTweetBtn.disabled = false;
    }
    
    // Update progress circular bar
    const percentage = Math.min(len / 280, 1);
    const dashOffset = ringCircumference - (percentage * ringCircumference);
    progressRingBar.style.strokeDashoffset = dashOffset;
    
    // Change circle color under strain
    if (remaining < 0) {
        progressRingBar.style.stroke = '#ef4444';
    } else if (remaining <= 20) {
        progressRingBar.style.stroke = '#eab308';
    } else {
        progressRingBar.style.stroke = '#1d9bf0';
    }
}

// Copy Tweet contents to Clipboard
async function copyTweetToClipboard() {
    if (copyTweetBtn.classList.contains('success-state')) return;

    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Tweet copied to clipboard!', 'success');
        
        // Visual button feedback
        const originalText = copyTweetBtn.querySelector('span').textContent;
        const originalIcon = copyTweetBtn.querySelector('.btn-icon').innerHTML;
        
        copyTweetBtn.querySelector('span').textContent = 'Copied!';
        copyTweetBtn.querySelector('.btn-icon').innerHTML = `
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        copyTweetBtn.classList.add('success-state');
        
        setTimeout(() => {
            copyTweetBtn.querySelector('span').textContent = originalText;
            copyTweetBtn.querySelector('.btn-icon').innerHTML = originalIcon;
            copyTweetBtn.classList.remove('success-state');
        }, 2000);
        
    } catch (err) {
        console.error('Tweet copy failed:', err);
        showToast('Failed to copy text.', 'error');
    }
}

// Open Web intent window to tweet
function postTweetToTwitter() {
    const text = tweetTextarea.value;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    closeTweetModal();
}

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 
        `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` : 
        `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
        
    toast.innerHTML = `${icon}<span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Auto remove toast from DOM
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Export current filtered release notes to a CSV file
function exportToCSV() {
    if (filteredReleases.length === 0) {
        showToast('No releases to export.', 'error');
        return;
    }

    // Helper to escape values for CSV
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let formatted = val.toString();
        // Replace carriage returns and newlines with spaces
        formatted = formatted.replace(/[\r\n]+/g, ' ');
        // If it contains double quotes, commas, or semicolons, wrap it in double quotes and double any existing quotes
        if (formatted.includes('"') || formatted.includes(',') || formatted.includes(';')) {
            formatted = '"' + formatted.replace(/"/g, '""') + '"';
        }
        return formatted;
    };

    // Header row
    const headers = ['ID', 'Date', 'Type', 'URL', 'Content'];
    const rows = [headers];

    // Data rows
    filteredReleases.forEach(r => {
        rows.push([
            r.id,
            r.date,
            r.type,
            r.link,
            r.text
        ]);
    });

    // Convert to CSV string
    const csvContent = rows.map(e => e.map(escapeCSV).join(',')).join('\n');

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Format file name with current category and date
    const dateStr = new Date().toISOString().slice(0, 10);
    const categoryName = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
    link.setAttribute('href', url);
    link.setAttribute('download', `BigQuery_Releases_${categoryName}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported ${filteredReleases.length} releases!`, 'success');
}
