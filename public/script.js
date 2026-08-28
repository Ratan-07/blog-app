const API_URL = 'http://localhost:5000/api';

// Function to switch visible section
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
    }
    if (pageId === 'home') {
        fetchBlogs();
    }
}

// Function to handle Logout
function logout() {
    document.getElementById('main-nav').style.display = 'none';
    showPage('login');
    alert('Logged out successfully!');
}

// 1. Fetch & Display Blogs
async function fetchBlogs() {
    try {
        const res = await fetch(`${API_URL}/blogs`);
        const data = await res.json();
        
        const blogGrid = document.querySelector('#home .blog-grid');
        blogGrid.innerHTML = '';

        data.blogs.forEach(blog => {
            const card = document.createElement('article');
            card.className = 'blog-card';
            card.innerHTML = `
                <h3>${blog.title}</h3>
                <p class="meta">By Author • Recent</p>
                <p>${blog.content}</p>
            `;
            blogGrid.appendChild(card);
        });
    } catch (err) {
        console.error('Error fetching blogs:', err);
    }
}

// 2. Register User API
const regForm = document.getElementById('register-form');
if (regForm) {
    regForm.addEventListener('submit', async function(e) {
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
                this.reset();
                showPage('login');
            }
        } catch (err) {
            alert('Server error during registration.');
        }
    });
}

// 3. Login User API
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
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
                alert('Login successful!');
                this.reset();
                // Reveal navbar and show home page
                document.getElementById('main-nav').style.display = 'flex';
                showPage('home');
            } else {
                alert(data.message); // Keeps user locked on login screen
            }
        } catch (err) {
            alert('Server error. Make sure node server.js is running!');
        }
    });
}

// 4. Create Blog API
const blogForm = document.getElementById('blog-form');
if (blogForm) {
    blogForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const title = document.getElementById('blog-title').value;
        const content = document.getElementById('blog-content').value;

        try {
            const res = await fetch(`${API_URL}/blogs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
            const data = await res.json();

            alert(data.message);
            if (data.success) {
                this.reset();
                showPage('home');
            }
        } catch (err) {
            alert('Error creating blog post.');
        }
    });
}