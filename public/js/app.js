// XSS filter
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Cập nhật giao diện Dynamic khi người dùng tương tác chọn tệp
function updateFileName() {
    const input = document.getElementById('fileInput');
    const label = document.getElementById('fileLabel');
    if (!input || !label) return;

    if (input.files.length > 0) {
        const name = input.files[0].name;
        label.innerText = name.length > 25 ? name.substring(0, 22) + '...' : name;
        label.style.backgroundColor = "#e8f5e9";
        label.style.color = "#1f5d2f";
    } else {
        label.innerText = "Choose an image...";
        label.style.backgroundColor = "#fff";
        label.style.color = "#6b7280";
    }
}

// Luồng API Tải ảnh lên S3 & Đồng bộ Cloud Database
async function uploadImage() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const statusMsg = document.getElementById('statusMsg');
    const pContainer = document.getElementById('progressContainer');
    const pBar = document.getElementById('progressBar');
    const titleInput = document.getElementById('imageTitleInput');

    if (!fileInput || fileInput.files.length === 0) return alert('Please choose an image file to upload.');

    const file = fileInput.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return alert('Error: Invalid file format! Only PNG, JPG, and WEBP images are allowed.');
    }

    if (file.size > 5 * 1024 * 1024) {
        return alert('Error: Image size exceeds the limit of 5MB.');
    }

    const formData = new FormData();
    formData.append('image', file);
    const customTitle = titleInput && titleInput.value.trim();
    if (customTitle) {
        formData.append('title', customTitle);
    }

    if (uploadBtn) uploadBtn.disabled = true;
    if (statusMsg) {
        statusMsg.innerText = "Uploading image...";
        statusMsg.style.color = "#111";
    }
    if (pContainer) pContainer.style.display = "block";
    if (pBar) pBar.style.width = "40%";

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            body: formData
        });
        const data = await res.json();

        if (pBar) pBar.style.width = "100%";

        if (data.success) {
            if (statusMsg) {
                statusMsg.innerText = "Image uploaded successfully";
                statusMsg.style.color = "#1f5d2f";
            }

            if (document.getElementById('accountGallery')) {
                addAccountCardToGallery({ title: customTitle || data.title || file.name, url: data.url, id: data.id, uploadedBy: data.uploadedBy });
            } else {
                addCardToGallery(customTitle || data.title || file.name, data.url, data.id, data.uploadedBy);
            }
            fileInput.value = "";
            if (titleInput) titleInput.value = "";
            updateFileName();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        if (statusMsg) {
            statusMsg.innerText = "System error: " + error.message;
            statusMsg.style.color = "#b91c1c";
        }
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
        if (pContainer && pBar) {
            setTimeout(() => { pContainer.style.display = "none"; pBar.style.width = "0%"; }, 2000);
        }
    }
}

// Tạo đối tượng Card Pinterest inject vào cây DOM của giao diện Web View
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

function getAuthToken() {
    return localStorage.getItem('token') || '';
}

function addCardToGallery(title, url, imageId, uploadedBy) {
    const gallery = document.getElementById('accountGallery') || document.getElementById('gallery');
    if (!gallery) return;

    const safeTitle = escapeHTML(title);
    const safeUrl = encodeURI(url);
    const currentUser = getCurrentUser();
    const ownerId = uploadedBy
        ? (typeof uploadedBy === 'object' ? (uploadedBy._id || uploadedBy.id) : uploadedBy)
        : null;
    const isOwner = currentUser && ownerId && currentUser.id === ownerId;

    const card = document.createElement('div');
    card.className = 'pin-card';
    card.dataset.imageId = imageId || '';

    card.innerHTML = `
        <img src="${safeUrl}" alt="${safeTitle}" loading="lazy" onclick="openLightboxModal('${safeTitle}', '${safeUrl}')">
        <div class="pin-info">
            <div class="pin-title" title="${safeTitle}">${safeTitle}</div>
            <div class="pin-actions">
                <button class="copy-btn" onclick="copyToClipboard('${safeUrl}', this)">Copy Link</button>
                ${isOwner ? `<button class="delete-btn" onclick="deleteImage('${imageId}', this)">Delete</button>` : ''}
            </div>
        </div>
    `;

    gallery.insertBefore(card, gallery.firstChild);
}

function addAccountCardToGallery(imageData) {
    const gallery = document.getElementById('accountGallery');
    if (!gallery) return;

    const safeTitle = escapeHTML(imageData.title || 'Untitled image');
    const safeUrl = encodeURI(imageData.url || '');
    const imageId = imageData.id || imageData._id || '';

    const card = document.createElement('div');
    card.className = 'account-image-card';
    card.dataset.imageId = imageId;

    card.innerHTML = `
        <img src="${safeUrl}" alt="${safeTitle}" loading="lazy" onclick="openLightboxModal('${safeTitle}', '${safeUrl}')">
        <div class="account-image-body">
            <div class="account-image-title">${safeTitle}</div>
            <div class="account-image-actions">
                <input type="text" class="account-title-input" value="${safeTitle}" aria-label="Edit image title">
                <button class="account-action-btn" onclick="saveImageTitle('${imageId}', this.previousElementSibling)">Save</button>
                <button class="delete-btn account-delete-btn" onclick="deleteImage('${imageId}', this)">Delete</button>
            </div>
        </div>
    `;

    gallery.insertBefore(card, gallery.firstChild);
}

function saveImageTitle(imageId, inputEl) {
    if (!inputEl || !imageId) return;

    const title = inputEl.value.trim();
    const buttonEl = inputEl.nextElementSibling;
    const card = inputEl.closest('.account-image-card');
    const titleEl = card ? card.querySelector('.account-image-title') : null;

    if (!title) {
        alert('Title cannot be empty.');
        return;
    }

    if (buttonEl) buttonEl.disabled = true;
    buttonEl && (buttonEl.innerText = 'Saving...');

    fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ title })
    })
        .then(async res => {
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Unable to update image title.');
            if (titleEl) titleEl.innerText = data.image.title;
            inputEl.value = data.image.title;
            alert('Title updated successfully.');
        })
        .catch(err => {
            alert('Error: ' + err.message);
        })
        .finally(() => {
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.innerText = 'Save';
            }
        });
}

// Tiện ích sao chép nhanh liên kết CloudFront phân phối biên
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "copied";
        btn.style.backgroundColor = "#d4edda";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = "#efefef";
        }, 1500);
    });
}

// =================================================================
// 🎨 ĐIỀU KHIỂN WEB VIEW CHỨC NĂNG LIGHTBOX MODAL phóng to ảnh
// =================================================================
function openLightboxModal(title, url) {
    const modal = document.getElementById('lightboxModal');
    const modalImg = document.getElementById('lightboxImg');
    const modalTitle = document.getElementById('lightboxTitle');
    const downloadLink = document.getElementById('downloadLink');
    const copyCdnBtn = document.getElementById('copyCdnBtn');

    modalImg.src = url;
    modalImg.alt = title;
    modalTitle.innerText = title;
    downloadLink.href = url;
    
    copyCdnBtn.onclick = function() {
        copyToClipboard(url, this);
    };

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Khóa thanh cuộn nền trang chính
}

function closeLightboxModal(event) {
    forceCloseLightbox();
}

function forceCloseLightbox() {
    const modal = document.getElementById('lightboxModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Trải nghiệm người dùng nâng cao: Đóng nhanh bằng bàn phím (Nút ESC)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        forceCloseLightbox();
    }
});

// Gọi API đồng bộ cơ sở dữ liệu ngay khi khởi chạy Web View trang
async function loadInitialGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    try {
        const res = await fetch('/api/images');
        const images = await res.json();
        if (!images || images.length === 0) {
            gallery.innerHTML = '<div class="empty-state">No images have been uploaded yet. Be the first to add one.</div>';
            return;
        }

        gallery.innerHTML = '';
        images.forEach(img => addCardToGallery(img.title, img.url, img._id, img.uploadedBy));
    } catch (e) {
        console.error("Lỗi đồng bộ danh sách hình ảnh ban đầu:", e);
        gallery.innerHTML = '<div class="empty-state">Unable to load the gallery right now. Please try again later.</div>';
    }
}

async function loadMyImages() {
    const gallery = document.getElementById('accountGallery');
    if (!gallery) return;

    try {
        const res = await fetch('/api/me/images', {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const images = await res.json();

        if (!images || images.length === 0) {
            gallery.innerHTML = '<div class="empty-state">You have not uploaded any images yet.</div>';
            return;
        }

        gallery.innerHTML = '';
        images.forEach(img => addAccountCardToGallery(img));
    } catch (e) {
        console.error('Unable to load your images:', e);
        gallery.innerHTML = '<div class="empty-state">Unable to load your images right now.</div>';
    }
}

function updateAuthNav() {
    const navActions = document.getElementById('navActions');
    if (!navActions) return;

    const user = getCurrentUser();
    if (user) {
        const adminLink = user.role === 'admin'
            ? `<a href="admin.html" class="nav-link">Admin</a>`
            : '';
        navActions.innerHTML = `
            <a href="account.html" class="nav-link nav-user-link">${escapeHTML(user.username)}</a>
            <a href="index.html" class="nav-link">Gallery</a>
            ${adminLink}
            <button class="nav-link nav-logout-btn" onclick="handleLogout()">Log out</button>
        `;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    updateAuthNav();

    if (document.getElementById('accountGallery')) {
        const user = getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        loadMyImages();
    } else {
        loadInitialGallery();
    }
});

// =================================================================
// Authentication & Authorization
// =================================================================

// Register API
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            alert('Register successful! Please log in.');
            window.location.href = 'login.html';
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        alert('System error: Unable to connect.');
    }
}

// Login API
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            // Store JWT token and user info in localStorage for session management
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert('Login successful!');
            // if admin == true, redirect to admin.html, else redirect to index.html
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        alert('System error: Unable to connect.');
    }
}

// Logout API
function handleLogout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// =================================================================
// Admin Dashboard: Load & Delete Images (CRUD) with Role Authorization
// =================================================================
async function loadAdminDashboard() {
    const tableBody = document.getElementById('adminTableBody');
    const subtitle = document.getElementById('adminSubtitle');
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/images', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const images = await res.json();

        tableBody.innerHTML = '';

        if (subtitle) {
            subtitle.innerText = `${images.length} image${images.length === 1 ? '' : 's'} across all users.`;
        }

        if (images.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state">No images have been uploaded yet.</div></td></tr>`;
            return;
        }

        images.forEach(img => {
            const tr = document.createElement('tr');
            const uploaderName = img.uploadedBy && img.uploadedBy.username
                ? escapeHTML(img.uploadedBy.username)
                : 'Unknown';

            tr.innerHTML = `
                <td><img src="${encodeURI(img.url)}" class="admin-thumb" alt=""></td>
                <td><strong>${escapeHTML(img.title)}</strong></td>
                <td><span class="uploader-badge">${uploaderName}</span></td>
                <td>
                    <button class="btn-delete-admin" onclick="deleteImageByAdmin('${img._id}', this)">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error syncing admin table:", err);
        if (subtitle) subtitle.innerText = 'Unable to load images right now.';
    }
}

// Delete image by admin with confirmation and API call
async function deleteImageByAdmin(imageId, buttonEl) {
    if (!confirm("Are you sure you want to permanently delete this image from Database?")) return;
    
    const token = getAuthToken();
    
    try {
        buttonEl.disabled = true;
        buttonEl.innerText = "Deleting...";

        const res = await fetch(`/api/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            alert('Image deleted successfully from the database!');
            buttonEl.closest('tr').remove(); // Remove the row from the UI immediately
        } else {
            alert('Permission error: ' + data.error);
            buttonEl.disabled = false;
            buttonEl.innerText = "Delete";
        }
    } catch (err) {
        alert('API connection error while deleting image.');
        buttonEl.disabled = false;
        buttonEl.innerText = "Delete";
    }
}

async function deleteImage(imageId, buttonEl) {
    if (!confirm("Are you sure you want to delete this image?")) return;
    const token = getAuthToken();

    try {
        buttonEl.disabled = true;
        buttonEl.innerText = "Deleting...";

        const res = await fetch(`/api/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const card = buttonEl.closest('.account-image-card, .pin-card');
            if (card) card.remove();
        } else {
            alert('Error: ' + data.error);
            buttonEl.disabled = false;
            buttonEl.innerText = "Delete";
        }
    } catch (err) {
        alert('API connection error while deleting image.');
        buttonEl.disabled = false;
        buttonEl.innerText = "Delete";
    }
}

//search bar
let allGalleryImages = [];

async function loadInitialGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    try {
        const res = await fetch('/api/images');
        const images = await res.json();
        allGalleryImages = images || [];
        renderGalleryImages(allGalleryImages, '');
    } catch (e) {
        console.error("Error loading initial image list:", e);
        gallery.innerHTML = '<div class="empty-state">Unable to load the gallery right now. Please try again later.</div>';
    }
}

function renderGalleryImages(images, query) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    if (!images || images.length === 0) {
        const message = query
            ? `No images match "${escapeHTML(query)}".`
            : 'No images have been uploaded yet. Be the first to add one.';
        gallery.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }

    images.forEach(img => addCardToGallery(img.title, img.url, img._id, img.uploadedBy));
}

function filterGallery(query) {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
        renderGalleryImages(allGalleryImages, '');
        return;
    }

    const filtered = allGalleryImages.filter(img =>
        img.title && img.title.toLowerCase().includes(trimmed)
    );
    renderGalleryImages(filtered, query);
}

// initial load of gallery when the page is ready
window.onload = loadInitialGallery;