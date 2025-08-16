//* ==========================================
//* --- data management ---
//* ==========================================

//* handle data loading
document.addEventListener('DOMContentLoaded', () => {
    const savedBookmarks = localStorage.getItem('fluxboard_bookmarks');
    if (savedBookmarks) {
        try {
            const bookmarks = JSON.parse(savedBookmarks);
            setAllBookmarks(bookmarks);
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        }
    }
    
    document.querySelectorAll('.add-link svg').forEach(button => {
        const closestCol = Array.from(document.querySelectorAll('[class*="col"]:not(.column-controls)')).find(col => col.contains(button));
        const folderBody = button.closest('.folder-body');
        button.onclick = () => addLink(closestCol || folderBody);
    });

    document.querySelectorAll('.add-folder svg').forEach(button => {
        const closestCol = Array.from(document.querySelectorAll('[class*="col"]:not(.column-controls)')).find(col => col.contains(button));
        const folderBody = button.closest('.folder-body');
        button.onclick = () => addFolder(closestCol || folderBody);
    });
    
    let currentEditingElement = null;
    const deleteBookmarkBtn = document.getElementById('deleteBookmark');
    const deleteFolderBtn = document.getElementById('deleteFolder');

    function openModal(modal, isEdit = false, element = null) {
        modal.style.display = "block";
        currentEditingElement = element;

        if (modal.id === 'bookmarkModal') {
            const deleteBtn = document.getElementById('deleteBookmark');
            const modalTitle = document.getElementById('modalTitle');
            
            if (isEdit) {
                modalTitle.textContent = 'Edit Bookmark';
                deleteBtn.style.display = 'block';
                document.getElementById('bookmarkName').value = element.querySelector('span').textContent;
                document.getElementById('bookmarkUrl').value = element.querySelector('a').href;
                document.getElementById('bookmarkNotes').value = element.getAttribute('data-notes') || '';
            } else {
                modalTitle.textContent = 'Add Bookmark';
                deleteBtn.style.display = 'none';
                document.getElementById('bookmarkForm').reset();
            }
        } else if (modal.id === 'folderModal') {
            const deleteBtn = document.getElementById('deleteFolder');
            const modalTitle = document.getElementById('folderModalTitle');
            
            if (isEdit) {
                modalTitle.textContent = 'Edit Folder';
                deleteBtn.style.display = 'block';
                document.getElementById('folderName').value = element.querySelector('.folder-name').textContent;
                document.getElementById('folderNotes').value = element.getAttribute('data-notes') || '';
            } else {
                modalTitle.textContent = 'Add Folder';
                deleteBtn.style.display = 'none';
                document.getElementById('folderForm').reset();
            }
        }
    }

    deleteBookmarkBtn.addEventListener('click', function() {
        if (currentEditingElement) {
            currentEditingElement.remove();
            saveToLocalStorage();
            closeModal(bookmarkModal);
        }
    });

    deleteFolderBtn.addEventListener('click', function() {
        if (currentEditingElement) {
            if (currentEditingElement.querySelector('.folder-content').children.length > 0) {
                if (!confirm('This folder contains items. Are you sure you want to delete it and all its contents?')) {
                    return;
                }
            }
            currentEditingElement.remove();
            saveToLocalStorage();
            closeModal(folderModal);
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('bookmark') || e.target.closest('.bookmark')) {
            const bookmark = e.target.classList.contains('bookmark') ? e.target : e.target.closest('.bookmark');
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                openModal(bookmarkModal, true, bookmark);
            }
        } else if (e.target.classList.contains('folder-name')) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                openModal(folderModal, true, e.target.closest('.folder'));
            }
        }
    });
    
    todoManager = new TodoManager();
    contextMenuManager = new ContextMenuManager();
    dragDropManager = new DragDropManager();
});

//* handle exporting
function exportBookmarks() {
    const bookmarks = getAllBookmarks();
    const exportData = {
        version: chrome.runtime.getManifest().version,
        timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        bookmarks: bookmarks,
        clockSettings: settings,
        fluxThemeEnabled: isFluxThemeEnabled,
        searchSettings: {
            currentSearchEngine,
            customSearchUrl: searchEngines.duckduckgo.url !== 'https://duckduckgo.com/?q=' ? searchEngines.duckduckgo.url : '',
            customSearchName: searchEngines.duckduckgo.name !== 'DuckDuckGo' ? searchEngines.duckduckgo.name : '',
            customSearchIcon: searchEngines.duckduckgo.icon !== 'img/duckduckgo.webp' ? searchEngines.duckduckgo.icon : ''
        }
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `fluxboard_bookmarks_${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}.json`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}


//* handel importing
function importBookmarks() {
    document.getElementById('importInput').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const bookmarks = data.bookmarks || data;
                setAllBookmarks(bookmarks);
                saveBookmarks();
                
                if (data.clockSettings) {
                    Object.assign(settings, data.clockSettings);
                    saveClockSettings();
                    updateClock();
                }

                if (data.fluxThemeEnabled !== undefined) {
                    isFluxThemeEnabled = data.fluxThemeEnabled;
                    localStorage.setItem('fluxboard_theme_enabled', JSON.stringify(isFluxThemeEnabled));
                    const toggleButton = document.getElementById('toggle-fluxtheme');
                    if (toggleButton) {
                        toggleButton.textContent = isFluxThemeEnabled ? 'Disable FluxTheme' : 'Enable FluxTheme';
                    }
                    initializeFromBrowser();
                }

                if (data.searchSettings) {
                    if (data.searchSettings.customSearchUrl) {
                        searchEngines.duckduckgo.url = data.searchSettings.customSearchUrl;
                        localStorage.setItem('fluxboard_custom_search_url', data.searchSettings.customSearchUrl);
                    }

                    if (data.searchSettings.customSearchName) {
                        searchEngines.duckduckgo.name = data.searchSettings.customSearchName;
                        localStorage.setItem('fluxboard_custom_search_name', data.searchSettings.customSearchName);
                        searchEngines.duckduckgo.placeholder = `Search with ${data.searchSettings.customSearchName} or type URL`;
                    }

                    if (data.searchSettings.customSearchIcon) {
                        searchEngines.duckduckgo.icon = data.searchSettings.customSearchIcon;
                        localStorage.setItem('fluxboard_custom_search_icon', data.searchSettings.customSearchIcon);
                    }
                    
                    if (data.searchSettings.currentSearchEngine && searchEngines[data.searchSettings.currentSearchEngine]) {
                        currentSearchEngine = data.searchSettings.currentSearchEngine;
                        localStorage.setItem('preferredSearchEngine', currentSearchEngine);
                    }
                    
                    // Update input fields
                    const customNameInput = document.getElementById('customSearchName');
                    const customIconInput = document.getElementById('customSearchIcon');
                    const customUrlInput = document.getElementById('customSearchUrl');
                    if (customNameInput) customNameInput.value = searchEngines.duckduckgo.name === 'DuckDuckGo' ? '' : searchEngines.duckduckgo.name;
                    if (customIconInput) customIconInput.value = searchEngines.duckduckgo.icon === 'img/duckduckgo.webp' ? '' : searchEngines.duckduckgo.icon;
                    if (customUrlInput) customUrlInput.value = searchEngines.duckduckgo.url === 'https://duckduckgo.com/?q=' ? '' : searchEngines.duckduckgo.url;
                    
                    updateSearchInterface();
                }
            } catch (error) {
                console.error('Error importing bookmarks:', error);
                alert('Error importing bookmarks: Invalid file format');
            }
        };
        reader.readAsText(file);
    }
}

//* handle getting all bookmarks
function getAllBookmarks() {
    const bookmarksContainer = document.querySelector('.bookmarks');
    const sections = Array.from(bookmarksContainer.children);
    const bookmarks = {};
    
    sections.forEach((sectionElement, index) => {
        const section = `col${index + 1}`;
        const titleElement = sectionElement.querySelector('.group-title h5');
        bookmarks[section] = {
            title: titleElement ? titleElement.textContent : '',
            items: serializeSection(sectionElement)
        };
    });
    
    return bookmarks;
}

//* handle clearing all data
function clearAllData() {
    if (!confirm('Are you sure you want to delete all the data? This action cannot be undone!')) {
        return;
    }

    // Reset to 4 columns and prepare empty structure
    const emptyBookmarks = {
            columnCount: DEFAULT_COLS,
            data: {}
    };
    
    try {
        // Create empty data structure for 4 columns
        for (let i = 1; i <= DEFAULT_COLS; i++) {
            emptyBookmarks.data[`col${i}`] = {
                title: `Group ${i}`,
                items: []
            };
        }
        
        // Reset column count in settings UI and storage
        if (numColumnsInput) {
            numColumnsInput.value = DEFAULT_COLS;
        }
        localStorage.setItem('fluxboard_column_count', DEFAULT_COLS);
        
        // Clear the bookmarks container and create fresh columns
        const bookmarksContainer = document.querySelector('.bookmarks');
        if (bookmarksContainer) {
            bookmarksContainer.innerHTML = '';
            setAllBookmarks(emptyBookmarks);
        }
    } catch (error) {
        console.error('Error clearing bookmarks:', error);
    }
    // Clear all local storage items
    localStorage.removeItem('groupTitles');
    localStorage.removeItem('fluxboard_bookmarks');
    localStorage.removeItem('fluxboard_todos');
    localStorage.removeItem('fluxboard_todo_history');
    localStorage.removeItem('clockSettings');
    localStorage.removeItem('fluxboard_sidebar_open');
    localStorage.removeItem('fluxboard_secondary_search');
    localStorage.removeItem('fluxboard_custom_search_url');
    localStorage.removeItem('preferredSearchEngine');
    
    // Reset column count to default
    localStorage.setItem('fluxboard_column_count', DEFAULT_COLS);

    // Reset search engine settings (add after existing removeItem calls)
    localStorage.removeItem('fluxboard_custom_search_name');
    localStorage.removeItem('fluxboard_custom_search_icon');
    localStorage.removeItem('fluxboard_custom_search_url');

    // Reset search engine settings (add after currentSearchEngine = 'google';)
    searchEngines.duckduckgo.name = 'DuckDuckGo';
    searchEngines.duckduckgo.icon = 'img/duckduckgo.webp';
    searchEngines.duckduckgo.url = 'https://duckduckgo.com/?q=';
    searchEngines.duckduckgo.placeholder = 'Search with DuckDuckGo or type URL';

    // Clear custom search input fields if they exist (add after existing input clearing)
    const customSearchNameInput = document.getElementById('customSearchName');
    const customSearchIconInput = document.getElementById('customSearchIcon');
    if (customSearchNameInput) customSearchNameInput.value = '';
    if (customSearchIconInput) customSearchIconInput.value = '';
    
    // Reset search engine settings
    currentSearchEngine = 'google';
    secondarySearchEngine = 'duckduckgo';
    
    // Clear custom search input fields if they exist
    const customSearchUrlInput = document.getElementById('customSearchUrl');
    if (customSearchUrlInput) customSearchUrlInput.value = '';
    
    // Reset settings
    Object.assign(settings, {
        timeFormat: '12',
        showSeconds: false,
        dateFormat: 'short',
        showClock: true
    });
    updateClock();
    
    // Clear todo manager
    if (typeof todoManager !== 'undefined' && todoManager) {
        todoManager.completedTimers.forEach(timer => clearTimeout(timer));
        todoManager.completedTimers.clear();
        
        todoManager.todos = [];
        todoManager.history = [];
        
        todoManager.renderTodos();
    }
    
    // Reset sidebar state
    sidebar.classList.remove('active');
    menu.classList.remove('active');
    home.classList.remove('active');
    
    // Save empty bookmarks
    localStorage.setItem('fluxboard_bookmarks', JSON.stringify(emptyBookmarks));
    
    // Reload page
    window.location.reload();
}

//* ==========================================
//* --- components ---
//* ==========================================

const bookmarkModal = document.getElementById('bookmarkModal');
const modalTitle = document.getElementById('modalTitle');
const bookmarkForm = document.getElementById('bookmarkForm');
const bookmarkCloseBtn = bookmarkModal.querySelector('.close');

const folderModal = document.getElementById('folderModal');
const folderModalTitle = document.getElementById('folderModalTitle');
const folderForm = document.getElementById('folderForm');
const folderCloseBtn = folderModal.querySelector('.close');

let currentEditElement = null;
let currentContainer = null;
let currentFolderElement = null;
let currentFolderContainer = null;
let currentGroupTitleElement = null;

//* handle modals closing
bookmarkCloseBtn.onclick = () => bookmarkModal.style.display = "none";
folderCloseBtn.onclick = () => folderModal.style.display = "none";

window.onclick = (event) => {
    if (event.target === bookmarkModal) bookmarkModal.style.display = "none";
    if (event.target === folderModal) folderModal.style.display = "none";
};

//* handle bookmarks saving
function saveBookmarks() {
    const bookmarksContainer = document.querySelector('.bookmarks');
    const columns = Array.from(bookmarksContainer.children);
    const bookmarks = {
        columnCount: getSavedColumnCount(),
        data: {}
    };
    columns.forEach((column, index) => {
        const sectionKey = `col${index + 1}`;
        const groupTitle = column.querySelector('.group-title h5').textContent;
        bookmarks.data[sectionKey] = {
            title: groupTitle,
            items: serializeSection(column)
        };
    });
    localStorage.setItem('fluxboard_bookmarks', JSON.stringify(bookmarks));
    console.log('Changes saved:', bookmarks);
}

//* handle bookmarks adding
function addLink(container) {
    if (Array.from(container.classList).some(cls => cls.startsWith('col'))) {
        container = container;
    }
    currentContainer = container;
    currentEditElement = null;
    modalTitle.textContent = "Add Bookmark";
    document.getElementById('bookmarkName').value = '';
    document.getElementById('bookmarkUrl').value = '';
    document.getElementById('bookmarkNotes').value = '';
    document.getElementById('deleteBookmark').style.display = 'none';
    bookmarkModal.style.display = "block";
}

//* handle folders adding
function addFolder(container) {
    if (Array.from(container.classList).some(cls => cls.startsWith('col'))) {
        container = container;
    }
    currentFolderContainer = container;
    currentFolderElement = null;
    folderModalTitle.textContent = "Add Folder";
    document.getElementById('folderName').value = '';
    document.getElementById('folderNotes').value = '';
    document.getElementById('deleteFolder').style.display = 'none';
    folderModal.style.display = "block";
}

//* handle bookmarks editing
function editLink(element) {
    const linkElement = element.closest('.link-element');
    const paragraph = linkElement.querySelector('p');
    currentEditElement = linkElement;
    currentContainer = linkElement.parentElement;
    
    modalTitle.textContent = "Edit Bookmark";
    document.getElementById('bookmarkName').value = paragraph.textContent;

    const rawUrl = paragraph.getAttribute('data-url') || '';

    const displayUrl = rawUrl.replace(/^https?:\/\//, '');
    document.getElementById('bookmarkUrl').value = displayUrl;

    const notes = paragraph.getAttribute('data-notes') || '';
    document.getElementById('bookmarkNotes').value = notes;
    document.getElementById('deleteBookmark').style.display = 'block';
    bookmarkModal.style.display = "block";
}

//* handle folders editing
function editFolder(element) {
    const folderHead = element.closest('.folder-head');
    const folderName = folderHead.querySelector('p');
    currentFolderElement = folderHead;
    currentFolderContainer = folderHead.closest('.folder-element').parentElement;
    
    folderModalTitle.textContent = "Edit Folder";
    document.getElementById('folderName').value = folderName.textContent;

    const notes = folderName.getAttribute('data-notes') || '';
    document.getElementById('folderNotes').value = notes;
    document.getElementById('deleteFolder').style.display = 'block';
    folderModal.style.display = "block";
}

//* handle serialize section
function serializeSection(section) {
    const items = [];
    Array.from(section.children).forEach(element => {
        if (element.classList.contains('new-link')) return;
        
        if (element.classList.contains('link-element')) {
            const p = element.querySelector('p');
            if (p) {
                items.push({
                    type: 'link',
                    name: p.textContent,
                    url: p.getAttribute('data-url') || '',
                    notes: p.getAttribute('data-notes') || ''
                });
            }
        } else if (element.classList.contains('folder-element')) {
            const folderHead = element.querySelector('.folder-head');
            const folderBody = element.querySelector('.folder-body');
            if (folderHead && folderBody) {
                const folderNameP = folderHead.querySelector('p');
                items.push({
                    type: 'folder',
                    name: folderNameP.textContent,
                    notes: folderNameP.getAttribute('data-notes') || '',
                    items: serializeSection(folderBody)
                });
            }
        }
    });
    return items;
}

//* handle bookmark element creating
function createBookmarkElement(bookmark, container) {
    const linkElement = document.createElement('div');
    linkElement.className = 'link-element';
    linkElement.draggable = true;

    const normalizedUrl = normalizeUrl(bookmark.url);
    linkElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="link-icon"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm0-82q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/></svg>
        <p data-url="${normalizedUrl}" data-notes="${bookmark.notes || ''}">${bookmark.name}</p>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="edit-icon"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
    `;
    
    const editIcon = linkElement.querySelector('.edit-icon');
    editIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        editLink(editIcon);
    });

    const linkText = linkElement.querySelector('p');
    linkText.addEventListener('click', () => window.location.href = normalizedUrl);

    linkElement.addEventListener('contextmenu', (e) => {
        contextMenuManager.showContextMenu(e, linkElement);
    });
    
    container.appendChild(linkElement);
    return linkElement;
}

//* handle folder element creating
function createFolderElement(folder, container) {
    const folderElement = document.createElement('div');
    folderElement.className = 'folder-element';
    folderElement.draggable = true;
    folderElement.innerHTML = `
        <div class="folder-head">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="folder-closed-icon"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="folder-opened-icon" style="display: none;"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>
            <p data-notes="${folder.notes || ''}">${folder.name}</p>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="edit-icon add-link-icon"><path d="M680-160v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm560-40h-80q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480Z"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="edit-icon add-folder-icon"><path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="edit-icon folder-menu-icon"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
        </div>
        <div class="folder-body" style="display: none;">
            <!-- <div class="link-element">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="link-icon"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm0-82q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/></svg>
                <p>eg</p>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="edit-icon"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
            </div> -->
        </div>
    `;
    
    const folderHead = folderElement.querySelector('.folder-head');
    folderHead.addEventListener('click', (e) => {
        if (!e.target.classList.contains('edit-icon')) {
            folder_toggle(folderHead);
        }
    });

    folderHead.addEventListener('contextmenu', (e) => {
        if (!e.target.classList.contains('edit-icon')) {
            e.stopPropagation();
            contextMenuManager.showContextMenu(e, folderElement);
        }
    });
    
    const addLinkIcon = folderElement.querySelector('.add-link-icon');
    addLinkIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderBody = e.target.closest('.folder-element').querySelector('.folder-body');
        addLink(folderBody);
    });
    
    const addFolderIcon = folderElement.querySelector('.add-folder-icon');
    addFolderIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderBody = e.target.closest('.folder-element').querySelector('.folder-body');
        addFolder(folderBody);
    });
    
    const menuIcon = folderElement.querySelector('.folder-menu-icon');
    menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        editFolder(menuIcon);
    });
    
    const folderBody = folderElement.querySelector('.folder-body');
    if (folder.items && Array.isArray(folder.items)) {
        folder.items.forEach(item => {
            if (item.type === 'link') {
                createBookmarkElement(item, folderBody);
            } else if (item.type === 'folder') {
                createFolderElement(item, folderBody);
            }
        });
    }
    
    container.appendChild(folderElement);
    return folderElement;
}

//* handle bookmark deletion
document.getElementById('deleteBookmark').onclick = () => {
    if (currentEditElement) {
        currentEditElement.remove();
        bookmarkModal.style.display = "none";
        saveBookmarks();
    }
};

//* handle normalizing url
function normalizeUrl(url) {
    if (!url) return '';

    url = url.trim();
    
    if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
    }
    
    return url;
}

//* handle folder deletion
document.getElementById('deleteFolder').onclick = () => {
    if (currentFolderElement) {
        const folderElement = currentFolderElement.closest('.folder-element');
        const folderBody = folderElement.querySelector('.folder-body');
        if (folderBody && folderBody.children.length > 0) {
            if (!confirm('This folder contains items. Are you sure you want to delete it and all its contents?')) {
                return;
            }
        }
        folderElement.remove();
        folderModal.style.display = "none";
        saveBookmarks();
    }
};

bookmarkForm.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('bookmarkName').value;
    const userUrl = document.getElementById('bookmarkUrl').value;
    const notes = document.getElementById('bookmarkNotes').value;
    
    const url = normalizeUrl(userUrl);
    
    if (currentEditElement) {
        const paragraph = currentEditElement.querySelector('p');
        paragraph.textContent = name;
        paragraph.setAttribute('data-url', url);
        paragraph.setAttribute('data-notes', notes);
        paragraph.onclick = () => window.location.href = url;
    } else {
        createBookmarkElement({ name, url, notes }, currentContainer);
    }

    bookmarkModal.style.display = "none";
    saveBookmarks();
}

//* handle folder form submission
folderForm.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('folderName').value;
    const notes = document.getElementById('folderNotes').value;
    
    if (currentFolderElement) {
        const folderNameP = currentFolderElement.querySelector('p');
        folderNameP.textContent = name;
        folderNameP.setAttribute('data-notes', notes);
    } else {
        createFolderElement({ name, notes, items: [] }, currentFolderContainer);
    }

    folderModal.style.display = "none";
    saveBookmarks();
}

//* handle setting all bookmarks
function setAllBookmarks(bookmarks) {
    try {
        // Support new format with columnCount and data
        let colCount = DEFAULT_COLS;
        let data = bookmarks;

        // Handle both new and old format
        if (bookmarks && typeof bookmarks === 'object') {
            if (bookmarks.columnCount && bookmarks.data) {
                // New format with explicit column count
                colCount = Math.max(MIN_COLS, Math.min(MAX_COLS, parseInt(bookmarks.columnCount)));
                data = bookmarks.data;
            } else {
                // Old format, count the columns in data
                const existingCols = Object.keys(bookmarks).filter(k => k.startsWith('col')).length;
                colCount = Math.max(MIN_COLS, Math.min(MAX_COLS, existingCols || DEFAULT_COLS));
                data = bookmarks;
            }
        }

        // Always ensure we have at least MIN_COLS
        colCount = Math.max(MIN_COLS, colCount);
        
        // Update column count in settings if needed
        if (numColumnsInput) {
            numColumnsInput.value = colCount;
        }
        localStorage.setItem('fluxboard_column_count', colCount);

        const bookmarksContainer = document.querySelector('.bookmarks');
        if (!bookmarksContainer) return;
        
        // Save current titles if we're keeping any existing columns
        const existingTitles = {};
        if (bookmarks.data) {
            Object.keys(bookmarks.data).forEach(key => {
                if (bookmarks.data[key] && bookmarks.data[key].title) {
                    existingTitles[key] = bookmarks.data[key].title;
                }
            });
        }
        
        bookmarksContainer.innerHTML = '';
        
        // Create columns
        for (let i = 1; i <= colCount; i++) {
            const sectionKey = `col${i}`;
            const column = document.createElement('div');
            column.className = `column ${sectionKey}`;
            
            // Add group title with proper precedence:
            // 1. Existing title from imported data
            // 2. Title from current state if available
            // 3. Default "Group X" title
            const groupTitleDiv = document.createElement('div');
            groupTitleDiv.className = 'group-title';
            const h5 = document.createElement('h5');
            h5.textContent = (data[sectionKey]?.title || existingTitles[sectionKey] || `Group ${i}`);
            // Only mark as user-set if it's coming from the main data structure
            if (data[sectionKey]?.title) {
                h5.setAttribute('data-user-set', 'true');
            }
            groupTitleDiv.appendChild(h5);
            
            // Add new-link controls
            const newLinkDiv = document.createElement('div');
            newLinkDiv.className = 'new-link';
            
            const addLinkDiv = document.createElement('div');
            addLinkDiv.className = 'add-link';
            addLinkDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M680-160v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm560-40h-80q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480Z"/></svg>';
            newLinkDiv.appendChild(addLinkDiv);
            
            const addFolderDiv = document.createElement('div');
            addFolderDiv.className = 'add-folder';
            addFolderDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>';
            newLinkDiv.appendChild(addFolderDiv);
            
            groupTitleDiv.appendChild(newLinkDiv);
            column.appendChild(groupTitleDiv);
            
            // Bind event listeners for new column
            bindColumnEventListeners(column);
            
            // Add items if they exist
            if (data[sectionKey]) {
                const items = Array.isArray(data[sectionKey]) ? data[sectionKey] : (data[sectionKey]?.items || []);
                items.forEach(item => {
                    try {
                        if (item.type === 'link') {
                            createBookmarkElement(item, column);
                        } else if (item.type === 'folder') {
                            createFolderElement(item, column);
                        }
                    } catch (itemError) {
                        console.error('Error creating item:', itemError);
                    }
                });
            }
            
            bookmarksContainer.appendChild(column);
        }
    } catch (error) {
        console.error('Error setting bookmarks:', error);
        // Fallback to default state
        adjustColumns(DEFAULT_COLS);
    }
}


//* handle group title
const groupTitleModal = document.getElementById('groupTitleModal');
const groupTitleForm = document.getElementById('groupTitleForm');
const groupTitleInput = document.getElementById('groupTitle');

function editGroupTitle(titleElement) {
    currentGroupTitleElement = titleElement;
    const currentTitle = titleElement.querySelector('h5').textContent;
    groupTitleInput.value = currentTitle;
    groupTitleModal.style.display = 'block';
}

function closeGroupTitleModal() {
    groupTitleModal.style.display = 'none';
    currentGroupTitleElement = null;
}

//* handle group title form submission
groupTitleForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (currentGroupTitleElement) {
        const newTitle = groupTitleInput.value.trim();
        if (newTitle) {
            const titleElement = currentGroupTitleElement.querySelector('h5');
            titleElement.textContent = newTitle;
            titleElement.setAttribute('data-user-set', 'true');
            saveGroupTitles();
        }
    }
    closeGroupTitleModal();
});

//* handel click outside to close
window.addEventListener('click', function(event) {
    if (event.target === groupTitleModal) {
        closeGroupTitleModal();
    }
});

//* handel saving group title
function saveGroupTitles() {
    saveBookmarks();
}

//* handle loading group title - now only used for initial loading
function loadGroupTitles() {
    const titles = JSON.parse(localStorage.getItem('groupTitles')) || {};
    document.querySelectorAll('.group-title').forEach((element, index) => {
        const savedTitle = titles[`group${index + 1}`];
        if (savedTitle && !element.querySelector('h5').hasAttribute('data-user-set')) {
            element.querySelector('h5').textContent = savedTitle;
        }
    });
}

//* handle dynamic column management
function getColumnCount() {
    return document.querySelectorAll('[class*="col"]:not(.column-controls)').length;
}

function getNextColumnNumber() {
    const existingColumns = Array.from(document.querySelectorAll('[class*="col"]:not(.column-controls)'))
        .map(el => {
            const classList = Array.from(el.classList);
            const colClass = classList.find(cls => cls.startsWith('col'));
            return colClass ? parseInt(colClass.replace('col', '')) : 0;
        })
        .filter(num => !isNaN(num));
    
    return existingColumns.length > 0 ? Math.max(...existingColumns) + 1 : 1;
}

function createNewColumn() {
    const columnNumber = getNextColumnNumber();
    const newColumnClass = `col${columnNumber}`;
    
    // This function will be expanded when you implement the UI for adding columns
    console.log(`Ready to create ${newColumnClass}`);
    return newColumnClass;
}

//* handle getting current column order
function getCurrentColumnOrder() {
    const bookmarksContainer = document.querySelector('.bookmarks');
    return Array.from(bookmarksContainer.children).map(col => {
        const classList = Array.from(col.classList);
        return classList.find(cls => cls.startsWith('col'));
    }).filter(Boolean);
}

document.addEventListener('DOMContentLoaded', loadGroupTitles);

//* Column count customization
const numColumnsInput = document.getElementById('numColumns');
const DEFAULT_COLS = 4;
const MIN_COLS = 4;
const MAX_COLS = 6;

function getSavedColumnCount() {
    let val = parseInt(localStorage.getItem('fluxboard_column_count'));
    if (isNaN(val) || val < MIN_COLS || val > MAX_COLS) return DEFAULT_COLS;
    return val;
}

function setColumnCount(val) {
    val = Math.max(MIN_COLS, Math.min(MAX_COLS, parseInt(val)));
    localStorage.setItem('fluxboard_column_count', val);
    if (numColumnsInput) numColumnsInput.value = val;
    adjustColumns(val);
}

function adjustColumns(newCount) {
    try {
        const bookmarksContainer = document.querySelector('.bookmarks');
        if (!bookmarksContainer) return;

        let columns = Array.from(bookmarksContainer.children);
        
        // Save existing data before adjusting
        const existingData = {};
        columns.forEach((col, idx) => {
            const sectionKey = `col${idx + 1}`;
            existingData[sectionKey] = {
                title: col.querySelector('.group-title h5')?.textContent || `Group ${idx + 1}`,
                items: serializeSection(col)
            };
        });

        // Remove extra columns, preserving data where possible
        while (columns.length > newCount) {
            const removedCol = columns.pop();
            // Try to merge data into remaining columns if possible
            if (removedCol) {
                const items = serializeSection(removedCol);
                if (items.length > 0 && columns.length > 0) {
                    // Distribute items to the last remaining column
                    const lastCol = columns[columns.length - 1];
                    items.forEach(item => {
                        if (item.type === 'link') {
                            createBookmarkElement(item, lastCol);
                        } else if (item.type === 'folder') {
                            createFolderElement(item, lastCol);
                        }
                    });
                }
                bookmarksContainer.removeChild(removedCol);
            }
        }

        // Add missing columns
        while (columns.length < newCount) {
            const colNum = columns.length + 1;
            const colDiv = document.createElement('div');
            colDiv.className = `column col${colNum}`;
            
            // Add group title
            const groupTitleDiv = document.createElement('div');
            groupTitleDiv.className = 'group-title';
            const h5 = document.createElement('h5');
            h5.textContent = existingData[`col${colNum}`]?.title || `Group ${colNum}`;
            groupTitleDiv.appendChild(h5);
            
            // Add new-link controls
            const newLinkDiv = document.createElement('div');
            newLinkDiv.className = 'new-link';
            
            const addLinkDiv = document.createElement('div');
            addLinkDiv.className = 'add-link';
            addLinkDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M680-160v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm560-40h-80q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480Z"/></svg>';
            newLinkDiv.appendChild(addLinkDiv);
            
            const addFolderDiv = document.createElement('div');
            addFolderDiv.className = 'add-folder';
            addFolderDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>';
            newLinkDiv.appendChild(addFolderDiv);
            
            groupTitleDiv.appendChild(newLinkDiv);
            colDiv.appendChild(groupTitleDiv);
            
            // Bind event listeners for new column
            bindColumnEventListeners(colDiv);

            // Add items from saved data if available
            const items = existingData[`col${colNum}`]?.items || [];
            items.forEach(item => {
                if (item.type === 'link') {
                    createBookmarkElement(item, colDiv);
                } else if (item.type === 'folder') {
                    createFolderElement(item, colDiv);
                }
            });

            bookmarksContainer.appendChild(colDiv);
            columns = Array.from(bookmarksContainer.children);
        }
        
        saveBookmarks();
        loadGroupTitles();
    } catch (error) {
        console.error('Error adjusting columns:', error);
    }
}

// Input validation for column count
if (numColumnsInput) {
    numColumnsInput.value = getSavedColumnCount();
    numColumnsInput.addEventListener('input', function(e) {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val === '') val = DEFAULT_COLS;
        val = Math.max(MIN_COLS, Math.min(MAX_COLS, parseInt(val)));
        e.target.value = val;
    });
    numColumnsInput.addEventListener('change', function(e) {
        setColumnCount(e.target.value);
    });
}

// On page load, adjust columns
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setColumnCount(getSavedColumnCount());
    }, 0);
});

//* bind event listeners for column controls
function bindColumnEventListeners(column) {
    const addLinkBtn = column.querySelector('.add-link');
    const addFolderBtn = column.querySelector('.add-folder');
    const titleElement = column.querySelector('.group-title');

    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addLink(column);
        });
    }

    if (addFolderBtn) {
        addFolderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addFolder(column);
        });
    }

    if (titleElement) {
        titleElement.addEventListener('click', (e) => {
            if (e.target.closest('.add-link') || e.target.closest('.add-folder') || titleElement.classList.contains('dragging-column')) {
                return;
            }
            editGroupTitle(titleElement);
        });
        
        titleElement.addEventListener('selectstart', (e) => {
            if (titleElement.draggable) {
                e.preventDefault();
            }
        });
    }
}

//* Context Menu functionality
class ContextMenuManager {
    constructor() {
        this.contextMenu = document.getElementById('contextMenu');
        this.currentElement = null;
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        this.contextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const action = item.dataset.action;
                const target = item.dataset.target;
                const direction = item.dataset.direction;
                
                if (action === 'move-direction' && this.currentElement) {
                    this.moveElementDirection(this.currentElement, direction);
                } else if (action === 'new-tap' && this.currentElement) {
                    this.openInNewTab(this.currentElement);
                } else if (action === 'edit' && this.currentElement) {
                    this.editElement(this.currentElement);
                } else if (action === 'delete' && this.currentElement) {
                    this.deleteElement(this.currentElement);
                }
                
                this.hideContextMenu();
            }
        });
    }

    showContextMenu(e, element) {
        e.preventDefault();
        this.currentElement = element;
        
        const currentColumn = this.getCurrentColumn(element);
        const isLinkElement = element.classList.contains('link-element');
        const isFolderElement = element.classList.contains('folder-element');
        
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            const action = item.dataset.action;
            const target = item.dataset.target;
            const direction = item.dataset.direction;
            
            if ((action === 'new-tap' || action === 'new-window') && !isLinkElement) {
                item.style.display = 'none';
                return;
            } else if ((action === 'new-tap' || action === 'new-window') && isLinkElement) {
                item.style.display = 'block';
            }
        });

        const firstSeparator = this.contextMenu.querySelector('.context-menu-separator');
        if (firstSeparator) {
            firstSeparator.style.display = isLinkElement ? 'block' : 'none';
        }

        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            const action = item.dataset.action;
            const target = item.dataset.target;
            const direction = item.dataset.direction;
            
            if (direction) {
                this.updateDirectionalItemState(item, element, direction);
            } else {
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            }
        });

        this.contextMenu.style.left = e.pageX + 'px';
        this.contextMenu.style.top = e.pageY + 'px';
        this.contextMenu.style.display = 'block';
        
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = (e.pageX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = (e.pageY - rect.height) + 'px';
        }
    }

    updateDirectionalItemState(item, element, direction) {
        const container = element.closest('.col1, .col2, .col3, .col4, .col5, .col6');
        const siblings = Array.from(container.children).filter(child => 
            !child.classList.contains('group-title') && 
            (child.classList.contains('link-element') || child.classList.contains('folder-element'))
        );
        
        const currentIndex = siblings.indexOf(element);
        let canMove = true;

        if (['col1', 'col2', 'col3', 'col4', 'col5'].includes(direction)) {
            const currentColumn = this.getCurrentColumn(element);
            if (currentColumn === direction) canMove = false;
        }
        
        if (direction === 'up' && currentIndex <= 0) canMove = false;
        if (direction === 'down' && currentIndex >= siblings.length - 1) canMove = false;
        if (direction === 'left' && container.classList.contains('col1')) canMove = false;
        if (direction === 'right' && container.classList.contains('col5')) canMove = false;
        
        if (canMove) {
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        } else {
            item.style.opacity = '0.5';
            item.style.pointerEvents = 'none';
        }
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.currentElement = null;
    }

    getCurrentColumn(element) {
        const columns = Array.from(document.querySelectorAll('[class*="col"]:not(.column-controls)'));
        const column = columns.find(col => col.contains(element));
        if (column) {
            const classList = Array.from(column.classList);
            return classList.find(cls => cls.startsWith('col'));
        }
        return null;
    }

    moveElementDirection(element, direction) {
        const container = element.closest('.col1, .col2, .col3, .col4, .col5, .col6, .folder-body');
        
        if (['col1', 'col2', 'col3', 'col4', 'col5'].includes(direction)) {
            const targetColumn = document.querySelector('.' + direction);
            if (!targetColumn) return;

            let elementData;
            if (element.classList.contains('link-element')) {
                const p = element.querySelector('p');
                elementData = {
                    type: 'link',
                    name: p.textContent,
                    url: p.getAttribute('data-url') || '',
                    notes: p.getAttribute('data-notes') || ''
                };
            } else if (element.classList.contains('folder-element')) {
                const folderHead = element.querySelector('.folder-head');
                const folderBody = element.querySelector('.folder-body');
                const folderNameP = folderHead.querySelector('p');
                elementData = {
                    type: 'folder',
                    name: folderNameP.textContent,
                    notes: folderNameP.getAttribute('data-notes') || '',
                    items: serializeSection(folderBody)
                };
            }

            element.remove();

            if (elementData.type === 'link') {
                const newElement = createBookmarkElement(elementData, targetColumn);
                newElement.classList.add('moved-element');
                setTimeout(() => newElement.classList.remove('moved-element'), 1500);
            } else if (elementData.type === 'folder') {
                const newElement = createFolderElement(elementData, targetColumn);
                newElement.classList.add('moved-element');
                setTimeout(() => newElement.classList.remove('moved-element'), 1500);
            }

            saveBookmarks();
            return;
        }
        
        if (direction === 'left' || direction === 'right') {
            const columns = Array.from(document.querySelectorAll('[class*="col"]:not(.column-controls)')).map(el => {
                const classList = Array.from(el.classList);
                return classList.find(cls => cls.startsWith('col'));
            }).filter(Boolean).sort((a, b) => {
                const numA = parseInt(a.replace('col', ''));
                const numB = parseInt(b.replace('col', ''));
                return numA - numB;
            });
            
            const currentColumnClass = this.getCurrentColumn(element);
            const currentColumnIndex = columns.indexOf(currentColumnClass);
            let targetColumnIndex;
            
            if (direction === 'left') {
                targetColumnIndex = currentColumnIndex - 1;
            } else {
                targetColumnIndex = currentColumnIndex + 1;
            }
            
            if (targetColumnIndex >= 0 && targetColumnIndex < columns.length) {
                this.moveElementDirection(element, columns[targetColumnIndex]);
            }
        } else if (direction === 'up' || direction === 'down') {
            const siblings = Array.from(container.children).filter(child => 
                !child.classList.contains('group-title') && 
                (child.classList.contains('link-element') || child.classList.contains('folder-element'))
            );
            
            const currentIndex = siblings.indexOf(element);
            let targetIndex;
            
            if (direction === 'up') {
                targetIndex = currentIndex - 1;
            } else {
                targetIndex = currentIndex + 1;
            }
            
            if (targetIndex >= 0 && targetIndex < siblings.length) {
                const targetElement = siblings[targetIndex];
                if (direction === 'up') {
                    container.insertBefore(element, targetElement);
                } else {
                    container.insertBefore(element, targetElement.nextSibling);
                }
                element.classList.add('moved-element'); 
                setTimeout(() => element.classList.remove('moved-element'), 1500); 
                saveBookmarks();
            }
        }
    }
    
    openInNewTab(element) {
    if (element.classList.contains('link-element')) {
            const p = element.querySelector('p');
            const url = p.getAttribute('data-url');
            if (url) {
                window.open(url, '_blank');
            }
        }
    }

    editElement(element) {
        if (element.classList.contains('link-element')) {
            const editIcon = element.querySelector('.edit-icon');
            if (editIcon) {
                editLink(editIcon);
            }
        } else if (element.classList.contains('folder-element')) {
            const menuIcon = element.querySelector('.folder-menu-icon');
            if (menuIcon) {
                editFolder(menuIcon);
            }
        }
    }

    deleteElement(element) {
        if (element.classList.contains('link-element')) {
            if (confirm('Are you sure you want to delete this bookmark?')) {
                element.remove();
                saveBookmarks();
            }
        } else if (element.classList.contains('folder-element')) {
            const folderBody = element.querySelector('.folder-body');
            if (folderBody && folderBody.children.length > 0) {
                if (!confirm('This folder contains items. Are you sure you want to delete it and all its contents?')) {
                    return;
                }
            }
            element.remove();
            saveBookmarks();
        }
    }
}

let contextMenuManager;

//* ==========================================
//* --- UI management ---
//* ==========================================

//* handle folder visibility
function folder_toggle(element) {
    const folderBody = element.parentElement.querySelector('.folder-body');
    const closedIcon = element.querySelector('.folder-closed-icon');
    const openedIcon = element.querySelector('.folder-opened-icon');

    if (folderBody.style.display === 'block') {
        folderBody.style.display = 'none';
        closedIcon.style.display = 'block';
        openedIcon.style.display = 'none';
    } else {
        folderBody.style.display = 'block';
        closedIcon.style.display = 'none';
        openedIcon.style.display = 'block';
    }
}

//* sidebar and responsive behavior
const sidebar = document.querySelector('.sidebar');
const menu = document.querySelector('.menu');
const home = document.querySelector('.home');

// Keep track of sidebar state before auto-close
let wasOpenBeforeAutoClose = false;

// Add media query listener for responsive behavior
const mediaQuery = window.matchMedia('(max-width: 700px)');

function handleScreenSizeChange(e) {
    if (e.matches) {
        // Screen is narrower than 700px
        if (sidebar.classList.contains('active')) {
            wasOpenBeforeAutoClose = true;
            sidebar.classList.remove('active');
            menu.classList.remove('active');
            home.classList.remove('active');
            saveSidebarState();
        }
    } else {
        // Screen is wider than 700px
        if (wasOpenBeforeAutoClose) {
            sidebar.classList.add('active');
            menu.classList.add('active');
            home.classList.add('active');
            saveSidebarState();
            wasOpenBeforeAutoClose = false;
        }
    }
}

// Initial check
mediaQuery.addListener(handleScreenSizeChange);
handleScreenSizeChange(mediaQuery);

menu.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menu.classList.toggle('active');
    home.classList.toggle('active');
    wasOpenBeforeAutoClose = sidebar.classList.contains('active');
    saveSidebarState();
});

//* handle saving sidebar state
function saveSidebarState() {
    const isActive = sidebar.classList.contains('active');
    localStorage.setItem('fluxboard_sidebar_open', JSON.stringify(isActive));
}

//* handle loading sidebar state
function loadSidebarState() {
    const savedState = localStorage.getItem('fluxboard_sidebar_open');
    if (savedState !== null) {
        const isOpen = JSON.parse(savedState);
        if (isOpen && !mediaQuery.matches) {  // Only open if screen is wide enough
            sidebar.classList.add('active');
            menu.classList.add('active');
            home.classList.add('active');
            wasOpenBeforeAutoClose = true;
        }
    }
}

//* handle drag and drop
class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedData = null;
        this.dropIndicator = null;
        this.lastDropTarget = null;
        this.folderOpenTimeout = null;
        this.lastHoveredFolder = null;
        this.lastClientX = 0;
        this.lastClientY = 0;
        this.init();
    }

    init() {
        this.createDropIndicator();
        this.bindEvents();
    }

    createDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'drop-indicator';
        document.body.appendChild(this.dropIndicator);
    }

    bindEvents() {
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));
    }

    handleDragStart(e) {
        const element = e.target.closest('.link-element, .folder-element');
        if (!element) return;

        this.draggedElement = element;
        element.classList.add('dragging');

        // Store element data
        if (element.classList.contains('link-element')) {
            const p = element.querySelector('p');
            this.draggedData = {
                type: 'link',
                name: p.textContent,
                url: p.getAttribute('data-url') || '',
                notes: p.getAttribute('data-notes') || ''
            };
        } else if (element.classList.contains('folder-element')) {
            const folderHead = element.querySelector('.folder-head');
            const folderBody = element.querySelector('.folder-body');
            const folderNameP = folderHead.querySelector('p');
            this.draggedData = {
                type: 'folder',
                name: folderNameP.textContent,
                notes: folderNameP.getAttribute('data-notes') || '',
                items: serializeSection(folderBody)
            };
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', element.outerHTML);
    }

    handleDragEnd(e) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
            this.draggedElement = null;
            this.draggedData = null;
        }
        this.hideDropIndicator();
        this.clearDragOverEffects();
    }
    
    handleFolderAutoOpen(target) {
        if (!target) return;

        const folderHead = target.classList.contains('folder-head') ? target : target.closest('.folder-head');
        if (!folderHead) return;
        
        const folderElement = folderHead.closest('.folder-element');
        if (!folderElement || folderElement === this.draggedElement) return;

        const folderBody = folderElement.querySelector('.folder-body');
        const closedIcon = folderHead.querySelector('.folder-closed-icon');
        const openedIcon = folderHead.querySelector('.folder-opened-icon');
        if (!folderBody || !closedIcon || !openedIcon) return;

        if (folderBody.style.display === 'block') {
            return;
        }

        if (this.folderOpenTimeout) {
            clearTimeout(this.folderOpenTimeout);
        }

        const openNestedFolders = (container) => {
            const folders = container.querySelectorAll('.folder-element');
            folders.forEach(folder => {
                const body = folder.querySelector('.folder-body');
                const head = folder.querySelector('.folder-head');
                if (body && head) {
                    body.style.display = 'block';
                    const closedIcon = head.querySelector('.folder-closed-icon');
                    const openedIcon = head.querySelector('.folder-opened-icon');
                    if (closedIcon && openedIcon) {
                        closedIcon.style.display = 'none';
                        openedIcon.style.display = 'block';
                    }
                }
            });
        };

        const openFolder = () => {
            if (!document.contains(folderElement)) return;
            
            this.lastHoveredFolder = folderElement;
            folderBody.style.display = 'block';
            closedIcon.style.display = 'none';
            openedIcon.style.display = 'block';
            
            openNestedFolders(folderBody);
            
            const rect = folderBody.getBoundingClientRect();
            const children = Array.from(folderBody.children).filter(child => 
                (child.classList.contains('link-element') || child.classList.contains('folder-element')) &&
                child !== this.draggedElement
            );
            
            this.dropIndicator.style.display = 'block';
            this.dropIndicator.style.width = `${rect.width - 25}px`;
            this.dropIndicator.style.left = `${rect.left}px`;
            this.dropIndicator.style.marginLeft = '25px';
            
            this.dropIndicator.style.top = children.length > 0 
                ? `${children[0].getBoundingClientRect().top - 2}px` 
                : `${rect.top + 5}px`;
            this.lastClientY = rect.top + 2;
            
            this.lastDropTarget = folderBody;
        };

        if (target === folderHead || target.parentNode === folderHead) {
            openFolder();
        } else {
            this.folderOpenTimeout = setTimeout(openFolder, 300);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;

        const folderHead = e.target.closest('.folder-head');
        if (folderHead) {
            const folderElement = folderHead.closest('.folder-element');
            if (folderElement && folderElement !== this.draggedElement) {
                this.handleFolderAutoOpen(folderHead);
                return;
            }
        }

        const target = this.findDropTarget(e);
        if (!target || !this.draggedElement) return;

        if (this.isInvalidDropTarget(target)) return;

        this.handleFolderAutoOpen(target);

        this.updateDropIndicator(e, target);
    }

    findDropTarget(e) {
        const folderBody = e.target.closest('.folder-body');
        if (folderBody) {
            const rect = folderBody.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                return folderBody;
            }
        }

        const folderElement = e.target.closest('.folder-element');
        if (folderElement && folderElement !== this.draggedElement) {
            const folderHead = folderElement.querySelector('.folder-head');
            const body = folderElement.querySelector('.folder-body');
            
            if (e.target.closest('.folder-head')) {
                this.handleFolderAutoOpen(folderElement);
                return folderElement;
            }
            
            if (body && body.style.display === 'block') {
                const rect = body.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    return body;
                }
            }
            
            return folderElement;
        }

        const linkElement = e.target.closest('.link-element');
        if (linkElement && linkElement !== this.draggedElement) {
            return linkElement;
        }

        const columns = Array.from(document.querySelectorAll('[class*="col"]:not(.column-controls)'));
        return columns.find(col => col.contains(e.target)) || null;
    }

    isInvalidDropTarget(target) {
        if (target === this.draggedElement) return true;

        if (this.draggedElement.classList.contains('folder-element')) {
            const draggedFolder = this.draggedElement;
            let parent = target;
            while (parent) {
                if (parent === draggedFolder) return true;
                parent = parent.parentElement.closest('.folder-element');
            }
        }

        return false;
    }

    updateDropIndicator(e, target) {
        const rect = target.getBoundingClientRect();
        const isContainer = Array.from(target.classList).some(cls => cls.startsWith('col')) ||
                            target.classList.contains('folder-body');
        
        const isInsideFolder = target.classList.contains('folder-body') || target.closest('.folder-body');

        if (isContainer) {
            this.showDropIndicator(e, target);
            
            if (isInsideFolder) {
                this.dropIndicator.style.marginLeft = '25px';
            } else {
                this.dropIndicator.style.marginLeft = '0';
            }
        } else {
            const container = target.parentElement;
            const children = Array.from(container.children).filter(child => 
                (child.classList.contains('link-element') || child.classList.contains('folder-element')) &&
                child !== this.draggedElement
            );
            
            const elementIndex = children.indexOf(target);
            const mouseY = e.clientY;
            const elementTop = rect.top;
            const elementMiddle = rect.top + (rect.height / 2);
            
            this.dropIndicator.style.display = 'block';
            this.dropIndicator.style.width = `${rect.width}px`;
            this.dropIndicator.style.left = `${rect.left}px`;
            this.dropIndicator.style.marginLeft = isInsideFolder ? '25px' : '0';
            if (isInsideFolder) {
                this.dropIndicator.style.width = `${rect.width - 25}px`;
            }
            
            if (elementIndex === 0 && mouseY < elementMiddle) {
                this.dropIndicator.style.top = `${rect.top - 2}px`;
            } else {
                this.dropIndicator.style.top = `${rect.bottom - 2}px`;
            }
        }

        this.lastDropTarget = target;
    }

    handleDragLeave(e) {
        const target = e.target.closest('.col1, .col2, .col3, .col4, .col5, .col6, .folder-body, .link-element, .folder-element');
        if (target && target === this.lastDropTarget) {
            this.lastDropTarget = null;
        }
    }

    showDropIndicator(e, container) {
        const rect = container.getBoundingClientRect();
        const isFolder = container.classList.contains('folder-body');
        const isInsideFolder = container.classList.contains('folder-body') || container.closest('.folder-body');
        const children = Array.from(container.children).filter(child => 
            (child.classList.contains('link-element') || child.classList.contains('folder-element')) &&
            child !== this.draggedElement
        );

        if (children.length === 0) {
            const width = rect.width - (isInsideFolder ? 25 : 0);
            this.dropIndicator.style.display = 'block';
            this.dropIndicator.style.width = `${width}px`;
            this.dropIndicator.style.left = `${rect.left}px`;
            this.dropIndicator.style.marginLeft = isInsideFolder ? '25px' : '0';
            this.dropIndicator.style.top = isInsideFolder ? `${rect.top + 5}px` : `${rect.top + 33}px`;
            return;
        }

        let targetChild = null;
        let position = 'after'; // Default to 'after'

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childRect = child.getBoundingClientRect();
            
            if (i === 0 && e.clientY < (childRect.top + childRect.height / 2)) {
                targetChild = child;
                position = 'before';
                break;
            }
            else if (e.clientY >= (childRect.top + childRect.height / 2)) {
                targetChild = child;
                position = 'after';
            }
        }

        if (!targetChild) {
            targetChild = children[children.length - 1];
            position = 'after';
        }

        if (targetChild) {
            const targetRect = targetChild.getBoundingClientRect();
            this.dropIndicator.style.display = 'block';
            this.dropIndicator.style.width = `${rect.width}px`;
            this.dropIndicator.style.left = `${rect.left}px`;
            this.dropIndicator.style.marginLeft = isInsideFolder ? '25px' : '0';
            if (isInsideFolder) {
                this.dropIndicator.style.width = `${rect.width - 25}px`;
            }
            this.dropIndicator.style.top = position === 'before' 
                ? `${targetRect.top - 2}px`
                : `${targetRect.bottom - 2}px`;
        }
    }

    hideDropIndicator() {
        if (this.dropIndicator) {
            this.dropIndicator.style.display = 'none';
        }
        if (this.lastDropTarget) {
            this.lastDropTarget = null;
        }
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.draggedElement || !this.draggedData) return;

        const dropTarget = this.findDropTarget(e);
        if (!dropTarget || this.isInvalidDropTarget(dropTarget)) return;

        let container;
        if (this.lastDropTarget && this.lastDropTarget.classList.contains('folder-body')) {
            container = this.lastDropTarget;
        }
        else if (dropTarget.classList.contains('folder-body')) {
            container = dropTarget;
        }
        else if (Array.from(dropTarget.classList).some(cls => cls.startsWith('col'))) {
            container = dropTarget;
        } else {
            container = dropTarget.parentElement;
        }

        const insertBefore = this.getDropPosition(e, dropTarget);
        this.moveElement(container, insertBefore);
        
        this.hideDropIndicator();
        saveBookmarks();
    }

    getDropPosition(e, target) {
        if (target.classList.contains('folder-body') || 
            Array.from(target.classList).some(cls => cls.startsWith('col'))) {
            
            const children = Array.from(target.children).filter(child => 
                (child.classList.contains('link-element') || child.classList.contains('folder-element')) &&
                child !== this.draggedElement
            );

            if (children.length > 0 && this.dropIndicator && this.dropIndicator.style.display === 'block') {
                const indicatorTop = parseInt(this.dropIndicator.style.top);
                
                for (let i = 0; i < children.length; i++) {
                    const childRect = children[i].getBoundingClientRect();
                    
                    if (i === 0 && indicatorTop <= childRect.top) {
                        return children[i];
                    }
                    
                    if (indicatorTop >= childRect.bottom - 5 && indicatorTop <= childRect.bottom + 5) {
                        return children[i + 1] || null;
                    }
                }
                
                return null;
            }

            if (children.length === 0) {
                return null;
            }

            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const rect = child.getBoundingClientRect();
                
                if (i === 0 && e.clientY < rect.top + (rect.height / 2)) {
                    return child;
                }
                
                if (e.clientY >= rect.top + (rect.height / 2)) {
                    if (i === children.length - 1) {
                        return null;
                    }
                    continue;
                } else {
                    return child;
                }
            }

            return null;
        } else {
            const container = target.parentElement;
            const children = Array.from(container.children).filter(child => 
                (child.classList.contains('link-element') || child.classList.contains('folder-element')) &&
                child !== this.draggedElement
            );
            
            const elementIndex = children.indexOf(target);
            const rect = target.getBoundingClientRect();
            const mouseY = e.clientY;
            const elementMiddle = rect.top + (rect.height / 2);
            
            if (elementIndex === 0 && mouseY < elementMiddle) {
                return target;
            } else {
                return target.nextSibling;
            }
        }
    }

    moveElement(targetContainer, insertBefore) {
        try {
            if (this.draggedElement.parentNode) {
                this.draggedElement.remove();
            }

            let newElement;
            if (this.draggedData.type === 'link') {
                newElement = createBookmarkElement(this.draggedData, targetContainer);
            } else if (this.draggedData.type === 'folder') {
                newElement = createFolderElement(this.draggedData, targetContainer);
            }

            if (!document.contains(targetContainer)) {
                return;
            }

            if (insertBefore && insertBefore.parentNode === targetContainer) {
                targetContainer.insertBefore(newElement, insertBefore);
            } else {
                targetContainer.appendChild(newElement);
            }

            newElement.classList.add('moved-element');
            setTimeout(() => newElement.classList.remove('moved-element'), 1500);
        } catch (error) {
            console.error('Error moving element:', error);
        }
    }

    clearDragOverEffects() {
        document.querySelectorAll('.drag-over').forEach(element => {
            element.classList.remove('drag-over');
        });
    }
}

let dragDropManager;

//* ==========================================
//* --- features management ---
//* ==========================================

//* handle page colors
const defaultThemeValues = {
    text: "#fbfbfe",
    frame: "#1c1b22",
    toolbar: "#2b2a33",
    tab_background: "#42414d",
    accent: "#0061e0",
    divider: "#52525e"
};

let isFluxThemeEnabled = JSON.parse(localStorage.getItem('fluxboard_theme_enabled') || 'false');

function updatePageStyle(colors) {
    document.documentElement.style.setProperty('--page-text', colors.text);
    document.documentElement.style.setProperty('--page-background', colors.frame);
    document.documentElement.style.setProperty('--section-background', colors.toolbar);
    document.documentElement.style.setProperty('--tab-background', colors.tab_background);
    document.documentElement.style.setProperty('--accent-color', colors.accent);
    document.documentElement.style.setProperty('--divider-color', colors.divider);
}

async function initializeFromBrowser() {
    if (!isFluxThemeEnabled) {
        updatePageStyle(defaultThemeValues);
        return;
    }

    try {
        const theme = await browser.theme.getCurrent();
        if (theme && theme.colors) {
            const colors = {
                text: theme.colors.toolbar_text || defaultThemeValues.text,
                frame: theme.colors.frame || defaultThemeValues.frame,
                toolbar: theme.colors.toolbar || defaultThemeValues.toolbar,
                tab_background: theme.colors.tab_selected || defaultThemeValues.tab_background,
                accent: theme.colors.button_background_hover || defaultThemeValues.accent,
                divider: theme.colors.popup_border || 
                         theme.colors.popup_highlight || 
                         theme.colors.toolbar_field_border || 
                         theme.colors.tab_line ||
                         theme.colors.toolbar_vertical_separator ||
                         defaultThemeValues.divider
            };
            updatePageStyle(colors);
        }
    } catch (error) {
        console.log('Using default theme values');
        updatePageStyle(defaultThemeValues);
    }
}

function toggleFluxTheme() {
    isFluxThemeEnabled = !isFluxThemeEnabled;
    localStorage.setItem('fluxboard_theme_enabled', JSON.stringify(isFluxThemeEnabled));
    initializeFromBrowser();
    
    const toggleButton = document.getElementById('toggle-fluxtheme');
    toggleButton.textContent = isFluxThemeEnabled ? 'Disable FluxTheme' : 'Enable FluxTheme';
}

function initTheme() {
    const toggleButton = document.getElementById('toggle-fluxtheme');
    toggleButton.textContent = isFluxThemeEnabled ? 'Disable FluxTheme' : 'Enable FluxTheme';
    toggleButton.addEventListener('click', toggleFluxTheme);
    
    initializeFromBrowser();
    if (typeof browser !== 'undefined' && browser.theme && browser.theme.onUpdated) {
        browser.theme.onUpdated.addListener((updateInfo) => {
            if (isFluxThemeEnabled) {
                initializeFromBrowser();
            }
        });
    }
}

//* handle search
let currentSearchEngine = 'google';
let secondarySearchEngine = 'duckduckgo';
const searchEngines = {
    google: {
        name: 'Google',
        icon: 'img/google.webp',
        url: 'https://www.google.com/search?q=',
        placeholder: 'Search with Google or type URL',
        isDefault: true
    },
    duckduckgo: {
        name: localStorage.getItem('fluxboard_custom_search_name') || 'DuckDuckGo',
        icon: localStorage.getItem('fluxboard_custom_search_icon') || 'img/duckduckgo.webp',
        url: localStorage.getItem('fluxboard_custom_search_url') || 'https://duckduckgo.com/?q=',
        placeholder: localStorage.getItem('fluxboard_custom_search_name') ? 
            `Search with ${localStorage.getItem('fluxboard_custom_search_name')} or type URL` :
            'Search with DuckDuckGo or type URL'
    }
};

function initSearchToggle() {
    const iconElement = document.querySelector('.search .icon');
    const iconImg = iconElement.querySelector('img');
    const searchInput = document.getElementById('searchInput');

    // Get references to custom search inputs
    const customSearchNameInput = document.getElementById('customSearchName');
    const customSearchIconInput = document.getElementById('customSearchIcon');
    const customSearchUrlInput = document.getElementById('customSearchUrl');
    const saveBtn = document.getElementById('save-custom-search');
    const resetBtn = document.getElementById('reset-custom-search');

    // Set initial values
    customSearchNameInput.value = searchEngines.duckduckgo.name === 'DuckDuckGo' ? '' : searchEngines.duckduckgo.name;
    customSearchIconInput.value = searchEngines.duckduckgo.icon === 'img/duckduckgo.webp' ? '' : searchEngines.duckduckgo.icon;
    customSearchUrlInput.value = searchEngines.duckduckgo.url === 'https://duckduckgo.com/?q=' ? '' : searchEngines.duckduckgo.url;

    // Save custom search settings
    saveBtn.addEventListener('click', () => {
        const name = customSearchNameInput.value.trim() || 'DuckDuckGo';
        const icon = customSearchIconInput.value.trim() || 'img/duckduckgo.webp';
        const url = customSearchUrlInput.value.trim() || 'https://duckduckgo.com/?q=';

        // Validate URL
        if (url && !url.includes('{searchTerm}') && !url.includes('=')) {
            alert('Please include {searchTerm} or use a valid search URL format');
            return;
        }

        // Update searchEngines object
        searchEngines.duckduckgo.name = name;
        searchEngines.duckduckgo.icon = icon;
        searchEngines.duckduckgo.url = url;
        searchEngines.duckduckgo.placeholder = `Search with ${name} or type URL`;

        // Save to localStorage
        localStorage.setItem('fluxboard_custom_search_name', name === 'DuckDuckGo' ? '' : name);
        localStorage.setItem('fluxboard_custom_search_icon', icon === 'img/duckduckgo.webp' ? '' : icon);
        localStorage.setItem('fluxboard_custom_search_url', url === 'https://duckduckgo.com/?q=' ? '' : url);

        updateSearchInterface();
    });

    // Reset to DuckDuckGo
    resetBtn.addEventListener('click', () => {
        if (confirm('Reset to DuckDuckGo defaults?')) {
            searchEngines.duckduckgo.name = 'DuckDuckGo';
            searchEngines.duckduckgo.icon = 'img/duckduckgo.webp';
            searchEngines.duckduckgo.url = 'https://duckduckgo.com/?q=';
            searchEngines.duckduckgo.placeholder = 'Search with DuckDuckGo or type URL';

            // Clear localStorage
            localStorage.removeItem('fluxboard_custom_search_name');
            localStorage.removeItem('fluxboard_custom_search_icon');
            localStorage.removeItem('fluxboard_custom_search_url');

            // Update input fields
            customSearchNameInput.value = '';
            customSearchIconInput.value = '';
            customSearchUrlInput.value = '';

            updateSearchInterface();
        }
    });
    
    // Function to toggle between search engines
    function toggleSearchEngine() {
        currentSearchEngine = currentSearchEngine === 'google' ? 'duckduckgo' : 'google';
        updateSearchInterface();
        
        try {
            localStorage.setItem('preferredSearchEngine', currentSearchEngine);
        } catch (e) {
            console.error('Error saving preferred search engine to localStorage:', e);
        }
    }
    
    // Add click event listener for search engine toggle
    iconElement.addEventListener('click', toggleSearchEngine);
    
    // Update interface initially
    updateSearchInterface();
    
    // Load saved search engine preference
    try {
        const savedEngine = localStorage.getItem('preferredSearchEngine');
        if (savedEngine && searchEngines[savedEngine]) {
            currentSearchEngine = savedEngine;
            updateSearchInterface();
        }
    } catch (e) {
        console.error('Error retrieving preferred search engine from localStorage:', e);
    }
}

// Function to update search UI
function updateSearchInterface() {
    const engine = searchEngines[currentSearchEngine];
    const iconImg = document.querySelector('.search .icon img');
    const searchInput = document.getElementById('searchInput');
    const iconElement = document.querySelector('.search .icon');
    
    if (!iconImg || !searchInput || !iconElement) return;
    
    // Check if icon exists by creating a temporary image
    const tempImg = new Image();
    tempImg.onerror = () => {
        iconImg.src = 'img/custom.webp';
    };
    tempImg.onload = () => {
        iconImg.src = engine.icon;
    };
    tempImg.src = engine.icon;
    
    iconImg.alt = engine.name;
    searchInput.placeholder = engine.placeholder;
    iconElement.setAttribute('data-tooltip', `switch to ${currentSearchEngine === 'google' ? searchEngines.duckduckgo.name : 'Google'}`);
}

function handleSearch(event) {
    event.preventDefault();
    const input = document.getElementById('searchInput').value.trim();
    const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/;
    
    if (urlRegex.test(input)) {
        const url = input.startsWith('http') ? input : `https://${input}`;
        window.location.href = url;
    } else {
        const searchQuery = encodeURIComponent(input);
        let searchUrl;
        
        if (currentSearchEngine === 'duckduckgo') {
            searchUrl = searchEngines.duckduckgo.url.replace('{searchTerm}', searchQuery);
            if (!searchUrl.includes(searchQuery)) {
                searchUrl = searchEngines.duckduckgo.url + searchQuery;
            }
        } else {
            searchUrl = searchEngines[currentSearchEngine].url + searchQuery;
        }
        
        window.location.href = searchUrl;
    }
}

document.addEventListener('DOMContentLoaded', initSearchToggle);

//* todo functionality
class TodoManager {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('fluxboard_todos')) || [];
        this.history = JSON.parse(localStorage.getItem('fluxboard_todo_history')) || [];
        this.completedTimers = new Map();
        this.init();
    }

    init() {
        this.renderTodos();
        this.bindEvents();
        this.checkCompletedTodos();
    }

    bindEvents() {
        const addBtn = document.getElementById('addTodoBtn');
        const todoInput = document.getElementById('todoInput');
        const historyBtn = document.getElementById('historyBtn');
        const historyModal = document.getElementById('historyModal');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');

        addBtn.addEventListener('click', () => this.addTodo());
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        historyBtn.addEventListener('click', () => this.showHistory());
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        const closeBtn = historyModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            historyModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === historyModal) {
                historyModal.style.display = 'none';
            }
        });
    }

    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        
        if (text) {
            const todo = {
                id: Date.now(),
                text: text,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            this.todos.push(todo);
            this.saveTodos();
            this.renderTodos();
            input.value = '';
        }
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
            
            if (todo.completed) {
                const timer = setTimeout(() => {
                    this.moveToHistory(id);
                }, 7000);
                this.completedTimers.set(id, timer);
            } else {
                if (this.completedTimers.has(id)) {
                    clearTimeout(this.completedTimers.get(id));
                    this.completedTimers.delete(id);
                }
            }
            
            this.saveTodos();
            this.renderTodos();
        }
    }

    deleteTodo(id) {
        if (this.completedTimers.has(id)) {
            clearTimeout(this.completedTimers.get(id));
            this.completedTimers.delete(id);
        }
        
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    moveToHistory(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo && todo.completed) {
            this.history.unshift({
                ...todo,
                movedToHistoryAt: new Date().toISOString()
            });
            
            this.todos = this.todos.filter(t => t.id !== id);
            
            if (this.completedTimers.has(id)) {
                clearTimeout(this.completedTimers.get(id));
                this.completedTimers.delete(id);
            }
            
            this.saveTodos();
            this.saveHistory();
            this.renderTodos();
        }
    }

    checkCompletedTodos() {
        const now = new Date();
        this.todos.forEach(todo => {
            if (todo.completed && todo.completedAt) {
                const completedTime = new Date(todo.completedAt);
                const timeDiff = now - completedTime;
                
                if (timeDiff >= 7000) {
                    this.moveToHistory(todo.id);
                } else {
                    const remainingTime = 7000 - timeDiff;
                    const timer = setTimeout(() => {
                        this.moveToHistory(todo.id);
                    }, remainingTime);
                    this.completedTimers.set(todo.id, timer);
                }
            }
        });
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        todoList.innerHTML = '';
        
        const sortedTodos = [...this.todos].sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
        });
        
        sortedTodos.forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
            
            const span = document.createElement('span');
            span.textContent = todo.text;
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '✕';
            deleteButton.addEventListener('click', () => this.deleteTodo(todo.id));
            
            todoItem.appendChild(checkbox);
            todoItem.appendChild(span);
            todoItem.appendChild(deleteButton);
            
            todoList.appendChild(todoItem);
        });
    }

    showHistory() {
        const historyModal = document.getElementById('historyModal');
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">No completed todos in history</div>';
        } else {
            historyList.innerHTML = this.history.map(item => `
                <div class="history-item">
                    <div class="history-item-text">${item.text}</div>
                    <div class="history-item-date">
                        Completed: ${new Date(item.completedAt).toLocaleDateString()} 
                        ${new Date(item.completedAt).toLocaleTimeString()}
                    </div>
                </div>
            `).join('');
        }
        
        historyModal.style.display = 'block';
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all todo history?')) {
            this.history = [];
            this.saveHistory();
            this.showHistory();
        }
    }

    saveTodos() {
        localStorage.setItem('fluxboard_todos', JSON.stringify(this.todos));
    }

    saveHistory() {
        localStorage.setItem('fluxboard_todo_history', JSON.stringify(this.history));
    }
}

let todoManager;

//* handle clock functionality
document.addEventListener('DOMContentLoaded', function() {
    loadClockSettings();
    
    updateClock();
    setInterval(updateClock, 1000);
    
    document.getElementById('edit-clock').addEventListener('click', clockModal);
    document.getElementById('popup').querySelector('.close').addEventListener('click', closePopup);
    document.getElementById('applyClockEdit').addEventListener('click', applyClockEdit);
});

const settings = {
    timeFormat: '12',
    showSeconds: false,
    dateFormat: 'short',
    showClock: true
};

function loadClockSettings() {
    const savedSettings = localStorage.getItem('clockSettings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
    }
}

function saveClockSettings() {
    localStorage.setItem('clockSettings', JSON.stringify(settings));
}

function updateClock() {
    const clockContainer = document.querySelector('.clock-container');
    if (!settings.showClock) {
        clockContainer.style.display = 'none';
        return;
    } else {
        clockContainer.style.display = 'block';
    }

    const now = new Date();
    
    let timeString = '';
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    if (settings.timeFormat === '12') {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        timeString = `${hours}:${minutes}`;
        if (settings.showSeconds) {
            timeString += `:${seconds}`;
        }
        timeString += ` ${ampm}`;
    } else {
        timeString = `${hours.toString().padStart(2, '0')}:${minutes}`;
        if (settings.showSeconds) {
            timeString += `:${seconds}`;
        }
    }

    let dateString = '';
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    
    switch (settings.dateFormat) {
            case 'full':
                // Monday, January 1
                const fullOptions = { weekday: 'long', month: 'long', day: 'numeric' };
                dateString = now.toLocaleDateString(undefined, fullOptions).replace(',', '');
                break;
            case 'short':
                // Mon, Jan 1
                const shortOptions = { weekday: 'short', month: 'short', day: 'numeric' };
                dateString = now.toLocaleDateString(undefined, shortOptions).replace(',', '');
                break;
            case 'numeric':
                // 01/01/2025
                dateString = `${month}/${day}/${year}`;
                break;
            case 'iso':
                // 2025-01-01
                dateString = `${year}-${month}-${day}`;
                break;
            case 'custom':
                // 1 January 2025
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];
                dateString = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                break;
            default:
                dateString = now.toLocaleDateString();
        }
    
    document.getElementById('time').textContent = timeString;
    document.getElementById('date').textContent = dateString;
    
    saveClockSettings();
}

document.getElementById('edit-clock').addEventListener('click', clockModal);
document.querySelector('.clock-container').addEventListener('click', clockModal);

function clockModal() {
    document.getElementById('popup').style.display = 'block';

    document.getElementById('showClock').checked = settings.showClock;
    
    document.getElementById('timeFormat').value = settings.timeFormat;
    document.getElementById('showSeconds').value = settings.showSeconds.toString();
    document.getElementById('dateFormat').value = settings.dateFormat;
    
    document.getElementById('popup').style.display = 'block';
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

document.getElementById('applyClockEdit').addEventListener('click', applyClockEdit);

function applyClockEdit() {
    settings.showClock = document.getElementById('showClock').checked;
    settings.timeFormat = document.getElementById('timeFormat').value;
    settings.showSeconds = document.getElementById('showSeconds').value === 'true';
    settings.dateFormat = document.getElementById('dateFormat').value;

    saveClockSettings();
    updateClock();
    closePopup();
}

document.addEventListener('DOMContentLoaded', function() {
    loadClockSettings();
    updateClock();
    setInterval(updateClock, 1000);
});

//* handle quick notes text area
const textarea = document.getElementById('notes-textarea');

textarea.value = localStorage.getItem('textareaContent') || '';
textarea.addEventListener('input', function() {
    localStorage.setItem('textareaContent', this.value);
});

//* ==========================================
//* --- settings management ---
//* ==========================================

//* Settings modal functionality
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('open-settings');
const settingsCloseBtn = settingsModal.querySelector('.close');

function openSettingsModal() {
    settingsModal.style.display = "block";
}

function closeSettingsModal() {
    settingsModal.style.display = "none";
}

settingsCloseBtn.onclick = () => closeSettingsModal();
window.onclick = (event) => {
    if (event.target === settingsModal) closeSettingsModal();
    if (event.target === bookmarkModal) bookmarkModal.style.display = "none";
    if (event.target === folderModal) folderModal.style.display = "none";
};

//* handle sidebar and settings
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadSidebarState();
    const importInput = document.getElementById('importInput');
    importInput.addEventListener('change', handleImport);

    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', handleSearch);

    // Settings modal event listeners
    openSettingsBtn.addEventListener('click', openSettingsModal);
    document.getElementById('export-data').addEventListener('click', () => {
        exportBookmarks();
        closeSettingsModal();
    });
    document.getElementById('import-data').addEventListener('click', () => {
        importBookmarks();
        closeSettingsModal();
    });
    document.getElementById('delete-all').addEventListener('click', () => {
        clearAllData();
        closeSettingsModal();
    });
    document.getElementById('edit-clock').addEventListener('click', () => {
        document.getElementById('popup').style.display = 'block';
        closeSettingsModal();
    });

    document.querySelectorAll('.group-title').forEach(titleElement => {
        titleElement.addEventListener('click', (e) => {
            // Prevent click event during drag operations
            if (e.target.closest('.add-link') || e.target.closest('.add-folder') || titleElement.classList.contains('dragging-column')) {
                return;
            }
            editGroupTitle(titleElement);
        });
        
        // Prevent text selection during drag
        titleElement.addEventListener('selectstart', (e) => {
            if (titleElement.draggable) {
                e.preventDefault();
            }
        });
    });

    document.querySelectorAll('.add-link').forEach(linkElement => {
        linkElement.addEventListener('click', (e) => {
            e.stopPropagation();
            addLink(linkElement.closest('.col1, .col2, .col3, .col4, .col5, .col6'));
        });
    });

    document.querySelectorAll('.add-folder').forEach(folderElement => {
        folderElement.addEventListener('click', (e) => {
            e.stopPropagation();
            addFolder(folderElement.closest('.col1, .col2, .col3, .col4, .col5, .col6'));
        });
    });

    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal.id === 'groupTitleModal') {
                closeGroupTitleModal();
            } else {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            if (event.target.id === 'groupTitleModal') {
                currentGroupTitleElement = null;
            }
        }
    });
});