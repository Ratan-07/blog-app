const API_BASE_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:5000/api' 
  : '/api';

// Supported Categories
const AVAILABLE_CATEGORIES = [
  'Cricket',
  'Football',
  'Lifestyle',
  'Career',
  'AI & Tech',
  'Web Dev',
  'Gaming',
  'General'
];

// Helper: normalize strings (lowercases, removes whitespace & symbols) for fuzzy search
function cleanString(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Application State
let activeCategory = 'All';
let searchDebounceTimer = null;

// DOM Elements
const mainNav = document.getElementById('main-nav');
const pages = document.querySelectorAll('.page');
const homeGrid = document.getElementById('home-blog-grid');
const dashboardGrid = document.getElementById('dashboard-blog-grid');
const searchInput = document.getElementById('search-input');
const searchSuggestions = document.getElementById('search-suggestions');
const categoryPills = document.getElementById('category-pills');
const editModal = document.getElementById('edit-modal');

// Session Management
function getToken() {
  return localStorage.getItem('devblog_token');
}

function getUser() {
  const user = localStorage.getItem('devblog_user');
  return user ? JSON.parse(user) : null;
}

function setSession(token, user) {
  localStorage.setItem('devblog_token', token);
  localStorage.setItem('devblog_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('devblog_token');
  localStorage.removeItem('devblog_user');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Page Routing
function navigateTo(pageId, pushState = true) {
  const token = getToken();

  if (!token && pageId !== 'login' && pageId !== 'register') {
    pageId = 'login';
  } else if (token && (pageId === 'login' || pageId === 'register')) {
    pageId = 'home';
  }

  pages.forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  if (token) {
    mainNav.style.display = 'flex';
  } else {
    mainNav.style.display = 'none';
  }

  if (pageId === 'home') loadHomeBlogs();
  if (pageId === 'dashboard') loadDashboardBlogs();
  if (pageId === 'profile') loadUserProfile();

  if (pushState) {
    window.history.pushState({ pageId }, '', `#${pageId}`);
  }
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.pageId) {
    navigateTo(e.state.pageId, false);
  } else {
    navigateTo('home', false);
  }
});

document.addEventListener('click', (e) => {
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) {
    e.preventDefault();
    navigateTo(pageBtn.dataset.page);
  }
});

// Auth: Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    alert(data.message);
    if (data.success) {
      document.getElementById('register-form').reset();
      navigateTo('login');
    }
  } catch (err) {
    alert('Registration failed. Make sure the server is running.');
  }
});

// Auth: Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      setSession(data.token, data.user);
      document.getElementById('login-form').reset();
      navigateTo('home');
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Login error. Check server status.');
  }
});

// Auth: Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  navigateTo('login');
});

// Profile Loader
async function loadUserProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      headers: authHeaders()
    });
    const data = await res.json();

    if (data.success) {
      const p = data.profile;
      document.getElementById('profile-name').textContent = p.name;
      document.getElementById('profile-email').textContent = p.email;
      document.getElementById('profile-articles').textContent = p.totalPosts;
      document.getElementById('profile-joined').textContent = new Date(p.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch (err) {
    alert('Failed to load profile.');
  }
}

// Create Blog
document.getElementById('blog-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('blog-title').value.trim();
  const category = document.getElementById('blog-category').value;
  const content = document.getElementById('blog-content').value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/blogs`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, category, content })
    });
    const data = await res.json();

    if (data.success) {
      alert('Article published successfully!');
      document.getElementById('blog-form').reset();
      navigateTo('home');
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Failed to publish post.');
  }
});

// Read Home Blogs
async function loadHomeBlogs() {
  const searchTerm = searchInput ? searchInput.value.trim() : '';
  const queryParams = new URLSearchParams();

  if (activeCategory !== 'All') queryParams.append('category', activeCategory);
  if (searchTerm) queryParams.append('search', searchTerm);

  try {
    const res = await fetch(`${API_BASE_URL}/blogs?${queryParams.toString()}`);
    const data = await res.json();
    homeGrid.innerHTML = '';

    if (!data.blogs || data.blogs.length === 0) {
      homeGrid.innerHTML = '<p class="meta" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No blog posts found matching your criteria.</p>';
      return;
    }

    data.blogs.forEach(blog => {
      const card = document.createElement('div');
      card.className = 'blog-card';
      const formattedDate = new Date(blog.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      card.innerHTML = `
        <div>
          <span class="category-tag">${blog.category || 'General'}</span>
          <h3>${blog.title}</h3>
          <p class="meta">By <strong>${blog.author}</strong> • ${formattedDate}</p>
          <p class="excerpt">${blog.content.substring(0, 110)}...</p>
        </div>
        <div class="card-actions">
          <button class="btn-secondary" onclick="viewSingleBlog('${blog._id}')">Read More</button>
        </div>
      `;
      homeGrid.appendChild(card);
    });
  } catch (err) {
    homeGrid.innerHTML = '<p class="meta" style="grid-column: 1/-1; text-align: center;">Error fetching articles from server.</p>';
  }
}

// Read Single Blog
window.viewSingleBlog = async function (id) {
  try {
    const res = await fetch(`${API_BASE_URL}/blogs/${id}`);
    const data = await res.json();

    if (data.success) {
      const blog = data.blog;
      document.getElementById('single-blog-title').textContent = blog.title;
      document.getElementById('single-blog-category').textContent = blog.category || 'General';
      document.getElementById('single-blog-author').textContent = blog.author;
      document.getElementById('single-blog-date').textContent = new Date(blog.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      document.getElementById('single-blog-content').textContent = blog.content;

      navigateTo('blog-detail');
    }
  } catch (err) {
    alert('Error loading blog content.');
  }
};

document.getElementById('back-to-blogs-btn').addEventListener('click', () => {
  navigateTo('home');
});

// Dashboard Blogs
async function loadDashboardBlogs() {
  const user = getUser();
  if (!user) return;

  try {
    const res = await fetch(`${API_BASE_URL}/blogs?authorEmail=${encodeURIComponent(user.email)}`);
    const data = await res.json();
    dashboardGrid.innerHTML = '';
    document.getElementById('user-post-count').textContent = data.blogs ? data.blogs.length : 0;

    if (!data.blogs || data.blogs.length === 0) {
      dashboardGrid.innerHTML = '<p class="meta" style="grid-column: 1/-1; text-align: center; padding: 2rem;">You haven\'t published any posts yet.</p>';
      return;
    }

    data.blogs.forEach(blog => {
      const card = document.createElement('div');
      card.className = 'blog-card';
      card.innerHTML = `
        <div>
          <span class="category-tag">${blog.category || 'General'}</span>
          <h3>${blog.title}</h3>
          <p class="excerpt">${blog.content.substring(0, 90)}...</p>
        </div>
        <div class="card-actions">
          <button class="btn-secondary" onclick="openEditModal('${blog._id}')">Edit</button>
          <button class="btn-danger" onclick="deleteBlogPost('${blog._id}')">Delete</button>
        </div>
      `;
      dashboardGrid.appendChild(card);
    });
  } catch (err) {
    dashboardGrid.innerHTML = '<p class="meta" style="grid-column: 1/-1; text-align: center;">Error loading dashboard items.</p>';
  }
}

// Update Blog
window.openEditModal = async function (id) {
  try {
    const res = await fetch(`${API_BASE_URL}/blogs/${id}`);
    const data = await res.json();

    if (data.success) {
      document.getElementById('edit-blog-id').value = data.blog._id;
      document.getElementById('edit-blog-title').value = data.blog.title;
      document.getElementById('edit-blog-category').value = data.blog.category || 'General';
      document.getElementById('edit-blog-content').value = data.blog.content;
      editModal.style.display = 'flex';
    }
  } catch (err) {
    alert('Error loading blog for editing.');
  }
};

document.getElementById('close-modal-btn').addEventListener('click', () => editModal.style.display = 'none');
document.getElementById('cancel-edit-btn').addEventListener('click', () => editModal.style.display = 'none');

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-blog-id').value;
  const title = document.getElementById('edit-blog-title').value.trim();
  const category = document.getElementById('edit-blog-category').value;
  const content = document.getElementById('edit-blog-content').value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ title, category, content })
    });
    const data = await res.json();

    if (data.success) {
      alert('Post updated successfully!');
      editModal.style.display = 'none';
      loadDashboardBlogs();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Failed to update post.');
  }
});

// Delete Blog
window.deleteBlogPost = async function (id) {
  if (!confirm('Are you sure you want to delete this blog post?')) return;

  try {
    const res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (data.success) {
      alert('Post deleted.');
      loadDashboardBlogs();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Failed to delete post.');
  }
};

// --- SMART SEARCH & CATEGORY RECOMMENDATIONS ---
function selectCategoryBySearch(categoryName) {
  activeCategory = categoryName;
  document.querySelectorAll('.pill').forEach(p => {
    if (p.dataset.category === categoryName) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  if (searchInput) searchInput.value = '';
  if (searchSuggestions) searchSuggestions.style.display = 'none';
  loadHomeBlogs();
}

if (searchInput && searchSuggestions) {
  searchInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    const cleanVal = cleanString(rawVal);

    if (!rawVal) {
      searchSuggestions.innerHTML = '';
      searchSuggestions.style.display = 'none';
      loadHomeBlogs();
      return;
    }

    // Match categories regardless of spaces/casing
    const matched = AVAILABLE_CATEGORIES.filter(cat => {
      const cleanCat = cleanString(cat);
      return cleanCat.includes(cleanVal) || cleanVal.includes(cleanCat);
    });

    if (matched.length > 0) {
      searchSuggestions.innerHTML = matched.map(cat => `
        <div class="suggestion-item" onclick="selectCategoryBySearch('${cat}')">
          <span>🏷️</span> Filter category: <strong>${cat}</strong>
        </div>
      `).join('');
    } else {
      searchSuggestions.innerHTML = `
        <div class="suggestion-empty">
          No category found for "${rawVal}". Searching all post content...
        </div>
      `;
    }

    searchSuggestions.style.display = 'block';

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      loadHomeBlogs();
    }, 300);
  });

  // Close suggestion dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchSuggestions.style.display = 'none';
    }
  });
}

// Category Pills click listener
if (categoryPills) {
  categoryPills.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill')) {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.category;
      if (searchSuggestions) searchSuggestions.style.display = 'none';
      loadHomeBlogs();
    }
  });
}

// Boot
navigateTo(getToken() ? 'home' : 'login', false);