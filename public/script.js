const API_URL = 'http://localhost:5000/api';
let currentUser = JSON.parse(localStorage.getItem('devblog_user')) || null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupNavigation();
  setupAuthListeners();
  setupBlogListeners();

  if (currentUser) {
    document.getElementById('main-nav').style.display = 'flex';
    showPage('home');
  } else {
    showPage('login');
  }
}

function showPage(pageId, pushToHistory = true) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  const activePage = document.getElementById(pageId);
  if (activePage) activePage.classList.add('active');

  if (pageId === 'home') fetchBlogs();
  if (pageId === 'dashboard') loadDashboard();

  if (pushToHistory) {
    history.pushState({ pageId }, '', `#${pageId}`);
  }
}

window.addEventListener('popstate', (e) => {
  const pageId = e.state && e.state.pageId ? e.state.pageId : 'home';
  showPage(pageId, false);
});

function setupNavigation() {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = el.getAttribute('data-page');
      showPage(pageId);
    });
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const backBtn = document.getElementById('back-to-blogs-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => showPage('home'));
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('devblog_user');
  document.getElementById('main-nav').style.display = 'none';
  showPage('login');
}

function formatDate(dateString) {
  return new Date(dateString || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function fetchBlogs() {
  try {
    const res = await fetch(`${API_URL}/blogs`);
    const data = await res.json();
    const blogGrid = document.getElementById('home-blog-grid');
    if (!blogGrid) return;

    blogGrid.innerHTML = '';

    if (!data.blogs || data.blogs.length === 0) {
      blogGrid.innerHTML = '<p class="empty-msg">No blog posts available yet.</p>';
      return;
    }

    data.blogs.forEach(blog => {
      const card = createBlogCard(blog);
      blogGrid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load blog posts:', err);
  }
}

function createBlogCard(blog) {
  const card = document.createElement('article');
  card.className = 'blog-card';

  const previewText = blog.content.length > 120 
    ? blog.content.substring(0, 120) + '...' 
    : blog.content;

  card.innerHTML = `
    <h3>${blog.title}</h3>
    <p class="meta">Published by <strong>${blog.author || 'Anonymous'}</strong> on ${formatDate(blog.createdAt)}</p>
    <p class="blog-preview-text">${previewText}</p>
    <button class="btn-read" data-id="${blog._id}">Read More</button>
  `;

  card.querySelector('.btn-read').addEventListener('click', () => {
    fetchSingleBlog(blog._id);
  });

  return card;
}

async function fetchSingleBlog(id) {
  try {
    const res = await fetch(`${API_URL}/blogs/${id}`);
    const data = await res.json();

    if (data.success) {
      document.getElementById('single-blog-title').innerText = data.blog.title;
      document.getElementById('single-blog-author').innerText = data.blog.author || 'Anonymous';
      document.getElementById('single-blog-date').innerText = formatDate(data.blog.createdAt);
      document.getElementById('single-blog-content').innerText = data.blog.content;
      showPage('blog-detail');
    }
  } catch (err) {
    console.error('Failed to fetch blog details:', err);
  }
}

async function loadDashboard() {
  try {
    const res = await fetch(`${API_URL}/blogs`);
    const data = await res.json();
    const dashGrid = document.getElementById('dashboard-blog-grid');
    const countElem = document.getElementById('user-post-count');

    if (!dashGrid || !currentUser) return;

    const userBlogs = data.blogs.filter(b => b.author === currentUser.name);
    if (countElem) countElem.innerText = userBlogs.length;

    dashGrid.innerHTML = '';
    if (userBlogs.length === 0) {
      dashGrid.innerHTML = '<p class="empty-msg">You haven\'t published any posts yet.</p>';
      return;
    }

    userBlogs.forEach(blog => {
      dashGrid.appendChild(createBlogCard(blog));
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

function setupAuthListeners() {
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      try {
        const res = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
          regForm.reset();
          showPage('login');
        }
      } catch (err) {
        alert('Server error during registration');
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          currentUser = data.user;
          localStorage.setItem('devblog_user', JSON.stringify(data.user));
          loginForm.reset();
          document.getElementById('main-nav').style.display = 'flex';
          showPage('home');
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Unable to connect to server');
      }
    });
  }
}

function setupBlogListeners() {
  const blogForm = document.getElementById('blog-form');
  if (blogForm) {
    blogForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('blog-title').value;
      const content = document.getElementById('blog-content').value;
      const author = currentUser ? currentUser.name : 'Anonymous';

      try {
        const res = await fetch(`${API_URL}/blogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, author })
        });
        const data = await res.json();

        if (data.success) {
          blogForm.reset();
          showPage('home');
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Failed to publish post');
      }
    });
  }
}