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

// //* handle sorting items
// function sortItems(items) {
//     return items.sort((a, b) => {
//         const aName = a.name || '';
//         const bName = b.name || '';
        
//         // Extract [xx] pattern from names
//         const aMatch = aName.match(/^\[(\d+)\]/);
//         const bMatch = bName.match(/^\[(\d+)\]/);
        
//         // Both have numbers
//         if (aMatch && bMatch) {
//             const aNum = parseInt(aMatch[1]);
//             const bNum = parseInt(bMatch[1]);
//             return aNum - bNum;
//         }
        
//         // Only a has number - a comes first
//         if (aMatch && !bMatch) {
//             return -1;
//         }
        
//         // Only b has number - b comes first
//         if (!aMatch && bMatch) {
//             return 1;
//         }
        
//         // Neither has number - alphabetical sort
//         return aName.localeCompare(bName);
//     });
// }

//* handle resorting container after adding items
// function resortContainer(container) {
//     const items = [];
    
//     // Collect all items (excluding group-title)
//     Array.from(container.children).forEach(child => {
//         if (!child.classList.contains('group-title')) {
//             if (child.classList.contains('link-element')) {
//                 const p = child.querySelector('p');
//                 items.push({
//                     type: 'link',
//                     name: p.textContent,
//                     url: p.getAttribute('data-url') || '',
//                     notes: p.getAttribute('data-notes') || '',
//                     element: child
//                 });
//             } else if (child.classList.contains('folder-element')) {
//                 const folderNameP = child.querySelector('.folder-head p');
//                 items.push({
//                     type: 'folder',
//                     name: folderNameP.textContent,
//                     notes: folderNameP.getAttribute('data-notes') || '',
//                     element: child
//                 });
//             }
//         }
//     });
    
//     // Sort items
//     const sortedItems = sortItems(items);
    
//     // Remove all non-group-title elements
//     Array.from(container.children).forEach(child => {
//         if (!child.classList.contains('group-title')) {
//             child.remove();
//         }
//     });
    
//     // Re-append in sorted order
//     sortedItems.forEach(item => {
//         container.appendChild(item.element);
//     });
// }

//* handle bookmark element creating
function createBookmarkElement(bookmark, container) {
    const linkElement = document.createElement('div');
    linkElement.className = 'link-element';

    const normalizedUrl = normalizeUrl(bookmark.url);
    linkElement.innerHTML = `
        <img src="/img/link.png" alt="link" class="link-icon">
        <p data-url="${normalizedUrl}" data-notes="${bookmark.notes || ''}">${bookmark.name}</p>
        <img src="/img/menu.png" alt="edit" class="edit-icon">
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
            <img src="/img/closed.png" alt="folder" class="folder-closed-icon">
            <img src="/img/opened.png" alt="folder" class="folder-opened-icon" style="display: none;">
            <p data-notes="${folder.notes || ''}">${folder.name}</p>
            <img src="/img/new_link.png" alt="add new link" class="edit-icon add-link-icon">
            <img src="/img/new_folder.png" alt="add new folder" class="edit-icon add-folder-icon">
            <img src="/img/menu.png" alt="edit" class="edit-icon folder-menu-icon">
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
        // Re-sort after name change
        // resortContainer(currentContainer);
    } else {
    createBookmarkElement({ name, url, notes }, currentContainer);
        // Re-sort the container after adding
        // resortContainer(currentContainer);
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
        // Re-sort after name change
        // resortContainer(currentFolderContainer);
    } else {
        createFolderElement({ name, notes, items: [] }, currentFolderContainer);
        // Re-sort the container after adding
        // resortContainer(currentFolderContainer);
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
    
    document.querySelectorAll('.add-link img').forEach(button => {
        button.onclick = () => addLink(button.closest('.col1, .col2, .col3, .col4, .folder-body'));
    });
    
    document.querySelectorAll('.add-folder img').forEach(button => {
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

    // const actionButtons = document.querySelectorAll('.data-buttons button');

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
            // Temporarily disable transitions
            // sidebar.classList.add('no-transition');
            // menu.classList.add('no-transition');
            // home.classList.add('no-transition');
            
            // Apply active classes
            sidebar.classList.add('active');
            menu.classList.add('active');
            home.classList.add('active');
            
            // Re-enable transitions after a brief delay
            // setTimeout(() => {
            //     sidebar.classList.remove('no-transition');
            //     menu.classList.remove('no-transition');
            //     home.classList.remove('no-transition');
            // }, 50);
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
            todoItem.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="todoManager.toggleTodo(${todo.id})">
                <span>${todo.text}</span>
                <button onclick="todoManager.deleteTodo(${todo.id})">✕</button>
            `;
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
                
                if (action === 'move' && this.currentElement) {
                    this.moveElement(this.currentElement, target);
                } else if (action === 'move-direction' && this.currentElement) {
                    this.moveElementDirection(this.currentElement, direction);
                }
                
                this.hideContextMenu();
            }
        });
    }

    showContextMenu(e, element) {
        e.preventDefault();
        this.currentElement = element;
        
        const currentColumn = this.getCurrentColumn(element);
        
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            const target = item.dataset.target;
            const direction = item.dataset.direction;
            
            if (target === currentColumn) {
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
            } else if (direction) {
                // Enable/disable directional moves based on position
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

    moveElement(element, targetColumnClass) {
        const targetColumn = document.querySelector('.' + targetColumnClass);
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
            createBookmarkElement(elementData, targetColumn);
        } else if (elementData.type === 'folder') {
            createFolderElement(elementData, targetColumn);
        }

        saveBookmarks();
    }

    moveElementDirection(element, direction) {
        const container = element.closest('.col1, .col2, .col3, .col4');
        
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
                this.moveElement(element, columns[targetColumnIndex]);
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
                saveBookmarks();
            }
        }
    }
}

// Initialize context menu manager
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