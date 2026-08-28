const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serves frontend files from public folder

// In-Memory Database (Temporary Storage)
const users = [];
const blogs = [
    { id: 1, title: 'Getting Started with Web Development', content: 'Learn the core fundamentals of HTML, CSS, and JS...' },
    { id: 2, title: 'Mastering Express.js', content: 'Building RESTful APIs with Node and Express is simple and fast...' }
];

// --- REST APIs ---

// 1. GET API: Fetch all blogs
app.get('/api/blogs', (req, res) => {
    res.json({ success: true, blogs });
});

// 2. POST API: Create Blog
app.post('/api/blogs', (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    const newBlog = { id: blogs.length + 1, title, content };
    blogs.unshift(newBlog);
    res.status(201).json({ success: true, message: 'Blog created successfully', blog: newBlog });
});

// 3. POST API: User Register
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    const userExists = users.find(u => u.email === email);
    
    if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    users.push({ name, email, password });
    res.status(201).json({ success: true, message: 'Registration successful' });
});

// 4. POST API: User Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    res.json({ success: true, message: 'Login successful', user: { name: user.name, email: user.email } });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});