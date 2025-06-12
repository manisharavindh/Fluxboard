// Function to toggle folder visibility
function folder_toggle() {
    const folderBody = document.querySelector('.folder-body');
    const closedIcon = document.querySelector('.folder-closed-icon');
    const openedIcon = document.querySelector('.folder-opened-icon');

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