// Function to toggle folder visibility
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

// Initialize modal elements
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

// Close modal handlers
bookmarkCloseBtn.onclick = () => bookmarkModal.style.display = "none";
folderCloseBtn.onclick = () => folderModal.style.display = "none";

window.onclick = (event) => {
    if (event.target === bookmarkModal) bookmarkModal.style.display = "none";
    if (event.target === folderModal) folderModal.style.display = "none";
};

// Save bookmarks to localStorage
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

// Function to add new link
function addLink(container) {
    // If we're adding to a main section, we need to identify the actual container for items
    if (container.classList.contains('col1') || container.classList.contains('col2') || 
        container.classList.contains('col3') || container.classList.contains('col4')) {
        container = container; // The container is now correct since we append directly
    }
    currentContainer = container;
    currentEditElement = null;
    modalTitle.textContent = "Add Bookmark";
    document.getElementById('bookmarkName').value = '';
    document.getElementById('bookmarkUrl').value = '';
    bookmarkModal.style.display = "block";
}

// Function to add new folder
function addFolder(container) {
    // If we're adding to a main section, we need to identify the actual container for items
    if (container.classList.contains('col1') || container.classList.contains('col2') || 
        container.classList.contains('col3') || container.classList.contains('col4')) {
        container = container; // The container is now correct since we append directly
    }
    currentFolderContainer = container;
    currentFolderElement = null;
    folderModalTitle.textContent = "Add Folder";
    document.getElementById('folderName').value = '';
    folderModal.style.display = "block";
}

// Function to edit link
function editLink(element) {
    const linkElement = element.closest('.link-element');
    const paragraph = linkElement.querySelector('p');
    currentEditElement = linkElement;
    currentContainer = linkElement.parentElement;
    
    modalTitle.textContent = "Edit Bookmark";
    document.getElementById('bookmarkName').value = paragraph.textContent;
    document.getElementById('bookmarkUrl').value = paragraph.getAttribute('data-url') || '';
    document.getElementById('deleteBookmark').style.display = 'block'; // Show delete button
    bookmarkModal.style.display = "block";
}

// Function to edit folder
function editFolder(element) {
    const folderHead = element.closest('.folder-head');
    const folderName = folderHead.querySelector('p');
    currentFolderElement = folderHead;
    currentFolderContainer = folderHead.closest('.folder-element').parentElement;
    
    folderModalTitle.textContent = "Edit Folder";
    document.getElementById('folderName').value = folderName.textContent;
    document.getElementById('deleteFolder').style.display = 'block'; // Show delete button
    folderModal.style.display = "block";
}

// Serialize a section's content
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
                    url: p.getAttribute('data-url') || ''
                });
            }
        } else if (element.classList.contains('folder-element')) {
            const folderHead = element.querySelector('.folder-head');
            const folderBody = element.querySelector('.folder-body');
            if (folderHead && folderBody) {
                items.push({
                    type: 'folder',
                    name: folderHead.querySelector('p').textContent,
                    items: serializeSection(folderBody)
                });
            }
        }
    });
    return items;
}

// Create bookmark element
function createBookmarkElement(bookmark, container) {
    const linkElement = document.createElement('div');
    linkElement.className = 'link-element';
    linkElement.innerHTML = `
        <img src="/img/link.png" alt="link" class="link-icon">
        <p data-url="${bookmark.url}">${bookmark.name}</p>
        <img src="/img/menu.png" alt="edit" class="edit-icon">
    `;
    
    // Add event listeners
    const editIcon = linkElement.querySelector('.edit-icon');
    editIcon.addEventListener('click', () => editLink(editIcon));
    
    const linkText = linkElement.querySelector('p');
    linkText.addEventListener('click', () => window.open(bookmark.url, '_blank'));
    
    // Simply append the element to the container
    container.appendChild(linkElement);
    return linkElement;
}

// Create folder element
function createFolderElement(folder, container) {
    const folderElement = document.createElement('div');
    folderElement.className = 'folder-element';
    folderElement.innerHTML = `
        <div class="folder-head">
            <img src="/img/closed.png" alt="folder" class="folder-closed-icon">
            <img src="/img/opened.png" alt="folder" class="folder-opened-icon" style="display: none;">
            <p>${folder.name}</p>
            <img src="/img/new_link.png" alt="add new link" class="edit-icon add-link-icon">
            <img src="/img/new_folder.png" alt="add new folder" class="edit-icon add-folder-icon">
            <img src="/img/menu.png" alt="edit" class="edit-icon folder-menu-icon">
        </div>
        <div class="folder-body" style="display: none;">
        </div>
    `;
    
    // Add event listeners
    const folderHead = folderElement.querySelector('.folder-head');
    folderHead.addEventListener('click', (e) => {
        // Only toggle if the click wasn't on one of the action icons
        if (!e.target.classList.contains('edit-icon')) {
            folder_toggle(folderHead);
        }
    });
    
    const addLinkIcon = folderElement.querySelector('.add-link-icon');
    addLinkIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent folder toggle
        const folderBody = e.target.closest('.folder-element').querySelector('.folder-body');
        addLink(folderBody);
    });
    
    const addFolderIcon = folderElement.querySelector('.add-folder-icon');
    addFolderIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent folder toggle
        const folderBody = e.target.closest('.folder-element').querySelector('.folder-body');
        addFolder(folderBody);
    });
    
    const menuIcon = folderElement.querySelector('.folder-menu-icon');
    menuIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent folder toggle
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
    
    // Simply append the folder element to the container
    container.appendChild(folderElement);
    return folderElement;
}

// Handle bookmark form submission
// Handle bookmark deletion
document.getElementById('deleteBookmark').onclick = () => {
    if (currentEditElement) {
        currentEditElement.remove();
        bookmarkModal.style.display = "none";
        saveBookmarks();
    }
};

// Handle folder deletion
document.getElementById('deleteFolder').onclick = () => {
    if (currentFolderElement) {
        const folderElement = currentFolderElement.closest('.folder-element');
        // Check if folder has contents
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
    const url = document.getElementById('bookmarkUrl').value;
    
    if (currentEditElement) {
        // Edit existing bookmark
        const paragraph = currentEditElement.querySelector('p');
        paragraph.textContent = name;
        paragraph.setAttribute('data-url', url);
        paragraph.onclick = () => window.open(url, '_blank');
    } else {
        // Create new bookmark
        createBookmarkElement({ name, url }, currentContainer);
    }
    
    bookmarkModal.style.display = "none";
    saveBookmarks();
}

// Handle folder form submission
folderForm.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('folderName').value;
    
    if (currentFolderElement) {
        // Edit existing folder
        currentFolderElement.querySelector('p').textContent = name;
    } else {
        // Create new folder
        createFolderElement({ name, items: [] }, currentFolderContainer);
    }
    
    folderModal.style.display = "none";
    saveBookmarks();
}

// Export bookmarks
function exportBookmarks() {
    const bookmarks = getAllBookmarks();
    const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        bookmarks: bookmarks
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

// Import bookmarks
function importBookmarks() {
    document.getElementById('importInput').click();
}

// Handle import
function handleImport(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                // Handle both new and old format
                const bookmarks = data.bookmarks || data;
                setAllBookmarks(bookmarks);
                saveBookmarks();
            } catch (error) {
                console.error('Error importing bookmarks:', error);
                alert('Error importing bookmarks: Invalid file format');
            }
        };
        reader.readAsText(file);
    }
}

// Get all bookmarks
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

// Set all bookmarks
function setAllBookmarks(bookmarks) {
    Object.entries(bookmarks).forEach(([section, data]) => {
        const sectionElement = document.querySelector('.' + section);
        if (sectionElement) {
            // Update the group title if it exists in the data
            const titleElement = sectionElement.querySelector('.group-title h5');
            if (data.title !== undefined && titleElement) {
                titleElement.textContent = data.title;
            }

            // Remove all items except the group-title
            Array.from(sectionElement.children).forEach(child => {
                if (!child.classList.contains('group-title')) {
                    child.remove();
                }
            });
            
            // Add all items
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

// Clear all bookmarks
function clearAllBookmarks() {
    if (!confirm('Are you sure you want to delete all bookmarks? This action cannot be undone!')) {
        return;
    }
    
    const sections = ['col1', 'col2', 'col3', 'col4'];
    sections.forEach((section, index) => {
        const sectionElement = document.querySelector('.' + section);
        if (sectionElement) {
            // Reset the title to default
            const titleElement = sectionElement.querySelector('.group-title h5');
            if (titleElement) {
                titleElement.textContent = String(index + 1);
            }
            
            // Remove all items except the group-title
            Array.from(sectionElement.children).forEach(child => {
                if (!child.classList.contains('group-title')) {
                    child.remove();
                }
            });
        }
    });
    
    // Clear bookmarks and reset titles
    const emptyBookmarks = {};
    sections.forEach((section, index) => {
        emptyBookmarks[section] = {
            title: String(index + 1),
            items: []
        };
    });
    
    // Clear both bookmarks and titles from localStorage
    localStorage.removeItem('groupTitles');
    localStorage.setItem('fluxboard_bookmarks', JSON.stringify(emptyBookmarks));
}

// Load saved bookmarks on page load
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
    
    // Add click handlers for buttons
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
            } else {
                modalTitle.textContent = 'Add Folder';
                deleteBtn.style.display = 'none';
                document.getElementById('folderForm').reset();
            }
        }
    }

    // Add click handlers for delete buttons
    deleteBookmarkBtn.addEventListener('click', function() {
        if (currentEditingElement) {
            currentEditingElement.remove();
            saveToLocalStorage();
            closeModal(bookmarkModal);
        }
    });

    deleteFolderBtn.addEventListener('click', function() {
        if (currentEditingElement) {
            // Check if folder is empty
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

    // Update the click handlers for bookmarks and folders to support editing
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
});

// Group title editing
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

// Handle group title form submission
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

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === groupTitleModal) {
        closeGroupTitleModal();
    }
});

// Save group titles to localStorage
function saveGroupTitles() {
    const titles = {};
    document.querySelectorAll('.group-title').forEach((element, index) => {
        const title = element.querySelector('h5').textContent;
        titles[`group${index + 1}`] = title;
    });
    localStorage.setItem('groupTitles', JSON.stringify(titles));
}

// Load group titles from localStorage
function loadGroupTitles() {
    const titles = JSON.parse(localStorage.getItem('groupTitles')) || {};
    document.querySelectorAll('.group-title').forEach((element, index) => {
        const savedTitle = titles[`group${index + 1}`];
        if (savedTitle) {
            element.querySelector('h5').textContent = savedTitle;
        }
    });
}

// Load saved titles when page loads
document.addEventListener('DOMContentLoaded', loadGroupTitles);

// Add event listeners once DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // File import handler
    const importInput = document.getElementById('importInput');
    importInput.addEventListener('change', handleImport);

    // Search form handler
    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', handleSearch);

    // Group title handlers
    document.querySelectorAll('.group-title').forEach(titleElement => {
        titleElement.addEventListener('click', (e) => {
            // Don't trigger if clicking on add-link or add-folder elements or their children
            if (e.target.closest('.add-link') || e.target.closest('.add-folder')) {
                return;
            }
            editGroupTitle(titleElement);
        });
    });

    // Add link handlers
    document.querySelectorAll('.add-link').forEach(linkElement => {
        linkElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up to group-title
            addLink(linkElement.closest('.col1, .col2, .col3, .col4'));
        });
    });

    // Add folder handlers
    document.querySelectorAll('.add-folder').forEach(folderElement => {
        folderElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up to group-title
            addFolder(folderElement.closest('.col1, .col2, .col3, .col4'));
        });
    });

    // Action buttons handlers
    const actionButtons = document.querySelectorAll('.data-buttons button');
    actionButtons[0].addEventListener('click', exportBookmarks);
    actionButtons[1].addEventListener('click', importBookmarks);
    actionButtons[2].addEventListener('click', clearAllBookmarks);

    // Modal close buttons
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

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            if (event.target.id === 'groupTitleModal') {
                currentGroupTitleElement = null;
            }
        }
    });
});


// sidebar
const sidebar = document.querySelector('.sidebar');
const menu = document.querySelector('.menu');
const home = document.querySelector('.home');

menu.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menu.classList.toggle('active');
    home.classList.toggle('active');
});