//* handle page colors
const defaultThemeValues = {
    frame: "#1c1b22",
    toolbar: "#2b2a33",
    text: "#fbfbfe",
    tab_background: "#2b2a33",
    tab_text: "#fbfbfe",
    toolbar_field: "#1c1b22",
    toolbar_field_text: "#fbfbfe",
    bookmark_text: "#fbfbfe",
    accent: "#0061e0",
    popup_text: "#fbfbfe",
    popup_background: "#2b2a33",
    sidebar: "#2b2a33"
};
function updatePageStyle(colors) {
    document.documentElement.style.setProperty('--page-background', colors.frame);
    document.documentElement.style.setProperty('--page-text', colors.text);
    document.documentElement.style.setProperty('--section-background', colors.toolbar);
    document.documentElement.style.setProperty('--input-background', colors.toolbar_field);
    document.documentElement.style.setProperty('--input-text', colors.toolbar_field_text);
    document.documentElement.style.setProperty('--accent-color', colors.accent);
    document.documentElement.style.setProperty('--button-text', colors.text);
    document.documentElement.style.setProperty('--tab-background', colors.tab_background);
}

async function initializeFromBrowser() {
    try {
        const theme = await browser.theme.getCurrent();
        if (theme && theme.colors) {
            const colors = {
                frame: theme.colors.frame || defaultThemeValues.frame,
                toolbar: theme.colors.toolbar || defaultThemeValues.toolbar,
                text: theme.colors.toolbar_text || defaultThemeValues.text,
                tab_background: theme.colors.tab_selected || defaultThemeValues.tab_background,
                tab_text: theme.colors.tab_text || defaultThemeValues.tab_text,
                toolbar_field: theme.colors.toolbar_field || defaultThemeValues.toolbar_field,
                toolbar_field_text: theme.colors.toolbar_field_text || defaultThemeValues.toolbar_field_text,
                bookmark_text: theme.colors.bookmark_text || defaultThemeValues.bookmark_text,
                accent: theme.colors.button_background_hover || defaultThemeValues.accent,
                popup_text: theme.colors.popup_text || defaultThemeValues.popup_text,
                popup_background: theme.colors.popup_background || defaultThemeValues.popup_background,
                sidebar: theme.colors.sidebar || defaultThemeValues.sidebar
            };
            updatePageStyle(colors);
        }
    } catch (error) {
        console.log('Using default theme values');
        updatePageStyle(defaultThemeValues);
    }
}

function initTheme() {
    initializeFromBrowser();
    if (typeof browser !== 'undefined' && browser.theme && browser.theme.onUpdated) {
        browser.theme.onUpdated.addListener((updateInfo) => {
            initializeFromBrowser();
        });
    }
}

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

//* handle search
function handleSearch(event) {
    event.preventDefault();
    const input = document.getElementById('searchInput').value.trim();
    
    const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/;
    
    if (urlRegex.test(input)) {
        const url = input.startsWith('http') ? input : `https://${input}`;
        window.location.href = url;
    } else {
        const searchQuery = encodeURIComponent(input);
        window.location.href = `https://www.google.com/search?q=${searchQuery}`;
    }
}

//* handle url
function normalizeUrl(url) {
    if (!url) return '';

    url = url.trim();
    
    if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
    }
    
    return url;
}

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
    const sections = ['col1', 'col2', 'col3', 'col4'];
    const bookmarks = {};
    
    sections.forEach(section => {
        const sectionElement = document.querySelector('.' + section);
        if (sectionElement) {
            const groupTitle = sectionElement.querySelector('.group-title h5').textContent;
            bookmarks[section] = {
                title: groupTitle,
                items: serializeSection(sectionElement)
            };
        }
    });
    
    localStorage.setItem('fluxboard_bookmarks', JSON.stringify(bookmarks));
    console.log('Bookmarks saved:', bookmarks);
}

//* handle bookmarks adding
function addLink(container) {
    if (container.classList.contains('col1') || container.classList.contains('col2') || 
        container.classList.contains('col3') || container.classList.contains('col4')) {
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
    if (container.classList.contains('col1') || container.classList.contains('col2') || 
        container.classList.contains('col3') || container.classList.contains('col4')) {
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

    const normalizedUrl = normalizeUrl(bookmark.url);
    linkElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="link-icon"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm0-82q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/></svg>
        <p data-url="${normalizedUrl}" data-notes="${bookmark.notes || ''}">${bookmark.name}</p>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="edit-icon"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
    `;
    
    const editIcon = linkElement.querySelector('.edit-icon');
    editIcon.addEventListener('click', () => editLink(editIcon));

    const linkText = linkElement.querySelector('p');

    linkText.addEventListener('click', () => window.location.href = normalizedUrl);

    // Add right-click context menu
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
        </div>
    `;
    
    const folderHead = folderElement.querySelector('.folder-head');
    folderHead.addEventListener('click', (e) => {
        if (!e.target.classList.contains('edit-icon')) {
            folder_toggle(folderHead);
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

    // Add right-click context menu
    folderElement.addEventListener('contextmenu', (e) => {
        // Only show context menu if not clicking on edit icons
        if (!e.target.classList.contains('edit-icon')) {
            contextMenuManager.showContextMenu(e, folderElement);
        }
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

//* handle exporting
function exportBookmarks() {
    const bookmarks = getAllBookmarks();
    const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        bookmarks: bookmarks,
        clockSettings: settings
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'fluxboard_bookmarks.json');
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
    const sections = ['col1', 'col2', 'col3', 'col4'];
    const bookmarks = {};
    
    sections.forEach(section => {
        const sectionElement = document.querySelector('.' + section);
        if (sectionElement) {
            const titleElement = sectionElement.querySelector('.group-title h5');
            bookmarks[section] = {
                title: titleElement ? titleElement.textContent : '',
                items: serializeSection(sectionElement)
            };
        }
    });
    
    return bookmarks;
}

//* handle setting all bookmarks
function setAllBookmarks(bookmarks) {
    Object.entries(bookmarks).forEach(([section, data]) => {
        const sectionElement = document.querySelector('.' + section);
        if (sectionElement) {
            const titleElement = sectionElement.querySelector('.group-title h5');
            if (data.title !== undefined && titleElement) {
                titleElement.textContent = data.title;
            }

            Array.from(sectionElement.children).forEach(child => {
                if (!child.classList.contains('group-title')) {
                    child.remove();
                }
            });

            const items = Array.isArray(data) ? data : (data.items || []);
            items.forEach(item => {
                if (item.type === 'link') {
                    createBookmarkElement(item, sectionElement);
                } else if (item.type === 'folder') {
                    createFolderElement(item, sectionElement);
                }
            });
        }
    });
}

//* handle clearing all bookmarks
function clearAllBookmarks() {
    if (!confirm('Are you sure you want to delete all bookmarks? This action cannot be undone!')) {
        return;
    }
    
    const sections = ['col1', 'col2', 'col3', 'col4'];
    sections.forEach((section, index) => {
        const sectionElement = document.querySelector('.' + section);
        if (sectionElement) {
            const titleElement = sectionElement.querySelector('.group-title h5');
            if (titleElement) {
                titleElement.textContent = String(index + 1);
            }
            
            Array.from(sectionElement.children).forEach(child => {
                if (!child.classList.contains('group-title')) {
                    child.remove();
                }
            });
        }
    });
    
    const emptyBookmarks = {};
    sections.forEach((section, index) => {
        emptyBookmarks[section] = {
            title: String(index + 1),
            items: []
        };
    });
    
    localStorage.removeItem('groupTitles');
    localStorage.removeItem('fluxboard_bookmarks');
    localStorage.removeItem('fluxboard_todos');
    localStorage.removeItem('fluxboard_todo_history');
    localStorage.removeItem('clockSettings');
    localStorage.removeItem('fluxboard_sidebar_open');
    
    Object.assign(settings, {
        timeFormat: '12',
        showSeconds: false,
        dateFormat: 'short',
        showClock: true
    });
    updateClock();
    
    if (typeof todoManager !== 'undefined' && todoManager) {
        todoManager.completedTimers.forEach(timer => clearTimeout(timer));
        todoManager.completedTimers.clear();
        
        todoManager.todos = [];
        todoManager.history = [];
        
        todoManager.renderTodos();
    }
    
    sidebar.classList.remove('active');
    menu.classList.remove('active');
    home.classList.remove('active');
    
    localStorage.setItem('fluxboard_bookmarks', JSON.stringify(emptyBookmarks));
}

//* handle loading bookmarks
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
        button.onclick = () => addLink(button.closest('.col1, .col2, .col3, .col4, .folder-body'));
    });
    
    document.querySelectorAll('.add-folder svg').forEach(button => {
        button.onclick = () => addFolder(button.closest('.col1, .col2, .col3, .col4, .folder-body'));
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
});

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
            currentGroupTitleElement.querySelector('h5').textContent = newTitle;
            // Save to localStorage if needed
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
    const titles = {};
    document.querySelectorAll('.group-title').forEach((element, index) => {
        const title = element.querySelector('h5').textContent;
        titles[`group${index + 1}`] = title;
    });
    localStorage.setItem('groupTitles', JSON.stringify(titles));
}

//* handle loading group title
function loadGroupTitles() {
    const titles = JSON.parse(localStorage.getItem('groupTitles')) || {};
    document.querySelectorAll('.group-title').forEach((element, index) => {
        const savedTitle = titles[`group${index + 1}`];
        if (savedTitle) {
            element.querySelector('h5').textContent = savedTitle;
        }
    });
}

document.addEventListener('DOMContentLoaded', loadGroupTitles);

//* handle loading bookmarks from local
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadSidebarState();
    const importInput = document.getElementById('importInput');
    importInput.addEventListener('change', handleImport);

    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', handleSearch);

    document.querySelectorAll('.group-title').forEach(titleElement => {
        titleElement.addEventListener('click', (e) => {
            if (e.target.closest('.add-link') || e.target.closest('.add-folder')) {
                return;
            }
            editGroupTitle(titleElement);
        });
    });

    document.querySelectorAll('.add-link').forEach(linkElement => {
        linkElement.addEventListener('click', (e) => {
            e.stopPropagation();
            addLink(linkElement.closest('.col1, .col2, .col3, .col4'));
        });
    });

    document.querySelectorAll('.add-folder').forEach(folderElement => {
        folderElement.addEventListener('click', (e) => {
            e.stopPropagation();
            addFolder(folderElement.closest('.col1, .col2, .col3, .col4'));
        });
    });

    const exportBtn = document.getElementById('export-data');
    const importBtn = document.getElementById('import-data');
    const deleteBtn = document.getElementById('delete-all');

    exportBtn.addEventListener('click', exportBookmarks);
    importBtn.addEventListener('click', importBookmarks);
    deleteBtn.addEventListener('click', clearAllBookmarks);

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

//* sidebar
const sidebar = document.querySelector('.sidebar');
const menu = document.querySelector('.menu');
const home = document.querySelector('.home');

menu.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menu.classList.toggle('active');
    home.classList.toggle('active');
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
        if (isOpen) {
            sidebar.classList.add('active');
            menu.classList.add('active');
            home.classList.add('active');
        }
    }
}


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
                } else if (action === 'new-window' && this.currentElement) {
                    this.openInNewWindow(this.currentElement);
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
        
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            const action = item.dataset.action;
            const target = item.dataset.target;
            const direction = item.dataset.direction;
            
            if ((action === 'new-tap' || action === 'new-window') && !isLinkElement) {
                item.style.display = 'none';
                return;
            } else if (action === 'new-tap' || action === 'new-window') {
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
        const container = element.closest('.col1, .col2, .col3, .col4');
        const siblings = Array.from(container.children).filter(child => 
            !child.classList.contains('group-title') && 
            (child.classList.contains('link-element') || child.classList.contains('folder-element'))
        );
        
        const currentIndex = siblings.indexOf(element);
        let canMove = true;

        if (['col1', 'col2', 'col3', 'col4'].includes(direction)) {
            const currentColumn = this.getCurrentColumn(element);
            if (currentColumn === direction) canMove = false;
        }
        
        if (direction === 'up' && currentIndex <= 0) canMove = false;
        if (direction === 'down' && currentIndex >= siblings.length - 1) canMove = false;
        if (direction === 'left' && container.classList.contains('col1')) canMove = false;
        if (direction === 'right' && container.classList.contains('col4')) canMove = false;
        
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
        const column = element.closest('.col1, .col2, .col3, .col4');
        if (column.classList.contains('col1')) return 'col1';
        if (column.classList.contains('col2')) return 'col2';
        if (column.classList.contains('col3')) return 'col3';
        if (column.classList.contains('col4')) return 'col4';
        return null;
    }

    moveElementDirection(element, direction) {
        const container = element.closest('.col1, .col2, .col3, .col4');

        if (['col1', 'col2', 'col3', 'col4'].includes(direction)) {
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
            const columns = ['col1', 'col2', 'col3', 'col4'];
            const currentColumnIndex = columns.findIndex(col => container.classList.contains(col));
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

    openInNewWindow(element) {
        if (element.classList.contains('link-element')) {
            const p = element.querySelector('p');
            const url = p.getAttribute('data-url');
            if (url) {
                const newWindow = window.open('', '_blank', 'width=1200,height=800,left=200,top=200,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes,status=yes');
                if (newWindow) {
                    newWindow.location.href = url;
                } else {
                    window.open(url, '_blank');
                }
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

//* clock functionality
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

// === DARK/LIGHT MODE TOGGLE ===
function setTheme(mode) {
    document.body.setAttribute('data-bgmode', mode);
    localStorage.setItem('fluxboard_theme', mode);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-bgmode') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

document.addEventListener('DOMContentLoaded', function() {
    // Load theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('fluxboard_theme') || 'dark';
    setTheme(savedTheme);
    const toggleBtn = document.getElementById('toggle-theme');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
});

//* quick notes text area

const textarea = document.getElementById('notes-textarea');

textarea.value = localStorage.getItem('textareaContent') || '';
textarea.addEventListener('input', function() {
    localStorage.setItem('textareaContent', this.value);
});