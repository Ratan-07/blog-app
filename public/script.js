// Base API configuration (Automatic local vs cloud detection)
const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:5000/api'
  : '/api';

// Expanded categories list
const APP_CATEGORIES = [
  'All',
  'Cricket',
  'Football',
  'AI & Tech',
  'Web Dev',
  'Coding & Software',
  'Gaming',
  'Entertainment',
  'Lifestyle',
  'Career',
  'Science & Space'
];

let currentCategory = 'All';
let allPosts = [];

// Helper: Normalize strings (removes spaces, symbols, and case) for smart search
function normalizeQuery(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Navigation & View Routing
function navigateTo(viewName) {
  document.querySelectorAll('.app-view').forEach(view => view.classList.add('hidden'));

  const viewMap = {
    feed: 'feedView',
    login: 'loginView',
    register: 'registerView',
    dashboard: 'dashboardView',
    profile: 'profileView',
    create: 'createView',
    single: 'singlePostView'
  };

  const target = document.getElementById(viewMap[viewName]);
  if (target) target.classList.remove('hidden');

  updateNavbar();

  if (viewName === 'feed') fetchAllPosts();
  if (viewName === 'dashboard') fetchUserPosts();
  if (viewName === 'profile') loadUserProfile();
  if (viewName === 'create') {
    document.getElementById('postForm').reset();
    document.getElementById('editPostId').value = '';
    document.getElementById('formTitle').innerText = 'Write a New Story';
    document.getElementById('savePostBtn').innerText = 'Publish Story';
  }
}

// Navbar State
function updateNavbar() {
  const token = localStorage.getItem('token');
  const navContainer = document.getElementById('navLinks');

  if (token) {
    navContainer.innerHTML = `
      <button class="btn btn-outline" onclick="navigateTo('feed')">Home Feed</button>
      <button class="btn btn-outline" onclick="navigateTo('dashboard')">My Dashboard</button>
      <button class="btn btn-outline" onclick="navigateTo('profile')">Profile</button>
      <button class="btn btn-primary" onclick="navigateTo('create')">+ Write</button>
      <button class="btn btn-danger" onclick="logout()">Logout</button>
    `;
  } else {
    navContainer.innerHTML = `
      <button class="btn btn-outline" onclick="navigateTo('feed')">Explore</button>
      <button class="btn btn-outline" onclick="navigateTo('login')">Sign In</button>
      <button class="btn btn-primary" onclick="navigateTo('register')">Get Started</button>
    `;
  }
}

// Banner alerts
function showAlert(message, type = 'success') {
  const box = document.getElementById('alertBox');
  box.className = `alert-box alert-${type}`;
  box.innerText = message;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 4000);
}

// Render category filter chips
function renderCategoryFilters() {
  const container = document.getElementById('categoryFilterContainer');
  if (!container) return;

  container.innerHTML = APP_CATEGORIES.map(cat => `
    <button class="filter-btn ${cat === currentCategory ? 'active' : ''}" onclick="selectCategory('${cat}')">
      ${cat}
    </button>
  `).join('');
}

function selectCategory(cat) {
  currentCategory = cat;
  renderCategoryFilters();
  applyFiltersAndSearch();
}

// Fetch all posts for home feed
async function fetchAllPosts() {
  try {
    const res = await fetch(`${API_BASE_URL}/posts`);
    const data = await res.json();
    allPosts = Array.isArray(data) ? data : [];
    applyFiltersAndSearch();
  } catch (err) {
    showAlert('Failed to connect to backend feed.', 'error');
  }
}

// Search and category matching logic
function applyFiltersAndSearch() {
  const searchInput = document.getElementById('searchInput');
  const rawQuery = searchInput ? searchInput.value.trim() : '';
  const cleanQuery = normalizeQuery(rawQuery);

  let filtered = allPosts;

  // 1. Category Filter
  if (currentCategory !== 'All') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  // 2. Text Search Filter (Title, Category, Author, Content)
  if (cleanQuery) {
    filtered = filtered.filter(p => {
      const matchTitle = normalizeQuery(p.title).includes(cleanQuery);
      const matchCategory = normalizeQuery(p.category).includes(cleanQuery);
      const matchAuthor = normalizeQuery(p.author?.name || '').includes(cleanQuery);
      const matchContent = normalizeQuery(p.content).includes(cleanQuery);
      return matchTitle || matchCategory || matchAuthor || matchContent;
    });
  }

  renderPostsGrid(filtered);
}

// Render posts to UI
function renderPostsGrid(posts) {
  const grid = document.getElementById('postsGrid');
  const badge = document.getElementById('postCountBadge');
  badge.innerText = `${posts.length} ${posts.length === 1 ? 'Article' : 'Articles'}`;

  if (posts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
        <h3>No articles found</h3>
        <p style="margin-top: 0.5rem;">Try another keyword or category filter.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = posts.map(post => `
    <div class="post-card" onclick="openSinglePost('${post._id}')">
      <div>
        <div class="card-category">${post.category || 'General'}</div>
        <h3 class="card-post-title">${escapeHtml(post.title)}</h3>
        <p class="card-post-snippet">${escapeHtml(post.content.substring(0, 120))}...</p>
      </div>
      <div class="card-meta">
        <span>✍️ ${escapeHtml(post.author?.name || 'Anonymous')}</span>
        <span>${new Date(post.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

// Smart Search Suggestions Dropdown with fuzzy matching
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');

if (searchInput && searchSuggestions) {
  searchInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    const cleanQuery = normalizeQuery(rawVal);

    if (!rawVal) {
      searchSuggestions.innerHTML = '';
      searchSuggestions.classList.add('hidden');
      applyFiltersAndSearch();
      return;
    }

    // Match categories without space/casing sensitivity
    const matchedCategories = APP_CATEGORIES.filter(cat => {
      if (cat === 'All') return false;
      const cleanCat = normalizeQuery(cat);
      return cleanCat.includes(cleanQuery) || cleanQuery.includes(cleanCat);
    });

    if (matchedCategories.length > 0) {
      searchSuggestions.innerHTML = matchedCategories.map(cat => `
        <div class="search-suggestion-item" data-cat="${cat}">
          <span>🏷️</span> Filter category: <strong>${cat}</strong>
        </div>
      `).join('');
    } else {
      searchSuggestions.innerHTML = `
        <div class="search-suggestion-empty">
          No direct category for "${escapeHtml(rawVal)}". Searching text content...
        </div>
      `;
    }

    searchSuggestions.classList.remove('hidden');
    applyFiltersAndSearch();
  });

  searchSuggestions.addEventListener('click', (e) => {
    const item = e.target.closest('.search-suggestion-item');
    if (item) {
      const selected = item.dataset.cat;
      searchInput.value = '';
      searchSuggestions.classList.add('hidden');
      selectCategory(selected);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box-wrapper')) {
      searchSuggestions.classList.add('hidden');
    }
  });
}

// View Single Post
async function openSinglePost(postId) {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`);
    const post = await res.json();

    const container = document.getElementById('singleArticleContainer');
    container.innerHTML = `
      <div class="card-category">${post.category || 'General'}</div>
      <h1 class="single-title">${escapeHtml(post.title)}</h1>
      <div class="card-meta" style="margin-bottom: 2rem;">
        <span>By <strong>${escapeHtml(post.author?.name || 'Author')}</strong></span>
        <span>Published on ${new Date(post.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>
      <div class="single-content">${escapeHtml(post.content)}</div>
    `;

    navigateTo('single');
  } catch (err) {
    showAlert('Error loading story details', 'error');
  }
}

// User Dashboard Posts
async function fetchUserPosts() {
  const token = localStorage.getItem('token');
  if (!token) return navigateTo('login');

  try {
    const res = await fetch(`${API_BASE_URL}/posts/my-posts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const posts = await res.json();
    const grid = document.getElementById('userPostsGrid');

    if (!Array.isArray(posts) || posts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
          <h3>You haven't written any articles yet</h3>
          <button class="btn btn-primary" style="margin-top: 1rem;" onclick="navigateTo('create')">Write Your First Article</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = posts.map(post => `
      <div class="post-card">
        <div>
          <div class="card-category">${post.category}</div>
          <h3 class="card-post-title">${escapeHtml(post.title)}</h3>
          <p class="card-post-snippet">${escapeHtml(post.content.substring(0, 100))}...</p>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-outline" style="flex: 1;" onclick="startEditPost('${post._id}')">Edit</button>
          <button class="btn btn-danger" style="flex: 1;" onclick="deletePost('${post._id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showAlert('Error loading dashboard posts.', 'error');
  }
}

// User Profile
async function loadUserProfile() {
  const token = localStorage.getItem('token');
  if (!token) return navigateTo('login');

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await res.json();

    document.getElementById('profileName').innerText = user.name || 'User';
    document.getElementById('profileEmail').innerText = user.email || '-';

    // Post count
    const postRes = await fetch(`${API_BASE_URL}/posts/my-posts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const posts = await postRes.json();
    document.getElementById('profilePostCount').innerText = Array.isArray(posts) ? posts.length : 0;
  } catch (err) {
    showAlert('Failed to load profile details.', 'error');
  }
}

// Create / Edit Post Submit
document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  if (!token) return navigateTo('login');

  const editId = document.getElementById('editPostId').value;
  const payload = {
    title: document.getElementById('postTitle').value.trim(),
    category: document.getElementById('postCategory').value,
    content: document.getElementById('postContent').value.trim()
  };

  const url = editId ? `${API_BASE_URL}/posts/${editId}` : `${API_BASE_URL}/posts`;
  const method = editId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Operation failed');

    showAlert(editId ? 'Story updated successfully!' : 'Story published successfully!');
    navigateTo('dashboard');
  } catch (err) {
    showAlert('Failed to save article. Please try again.', 'error');
  }
});

// Edit helper
async function startEditPost(postId) {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`);
    const post = await res.json();

    document.getElementById('editPostId').value = post._id;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postCategory').value = post.category;
    document.getElementById('postContent').value = post.content;

    document.getElementById('formTitle').innerText = 'Edit Story';
    document.getElementById('savePostBtn').innerText = 'Save Changes';

    navigateTo('create');
  } catch (err) {
    showAlert('Could not load story for editing', 'error');
  }
}

// Delete helper
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this story?')) return;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showAlert('Article removed successfully');
      fetchUserPosts();
    }
  } catch (err) {
    showAlert('Failed to delete article', 'error');
  }
}

// Auth: Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('token', data.token);
    showAlert('Welcome back!');
    navigateTo('feed');
  } catch (err) {
    showAlert(err.message || 'Invalid email or password', 'error');
  }
});

// Auth: Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Registration failed');

    localStorage.setItem('token', data.token);
    showAlert('Account created! Welcome to InsightHub.');
    navigateTo('feed');
  } catch (err) {
    showAlert(err.message || 'Registration error', 'error');
  }
});

function logout() {
  localStorage.removeItem('token');
  showAlert('Signed out successfully.');
  navigateTo('feed');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  renderCategoryFilters();
  navigateTo('feed');
});