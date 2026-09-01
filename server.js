require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'devblog_super_secret_jwt_key_2026';
const DB_URI = process.env.MONGO_URI || 'mongodb+srv://ratanspace123_db_user:gkd3WgUJ37r6Ento@cluster0.xoudqme.mongodb.net/blogApp?retryWrites=true&w=majority';

// Database Connection
mongoose.connect(DB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('Database connection error:', err));

// Schemas & Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  content: { type: String, required: true },
  author: { type: String, default: 'Anonymous' },
  authorEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', blogSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- AUTH MIDDLEWARE (Token Verification) ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, email, name
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// --- AUTH ROUTES ---

// 1. Register with Password Hashing
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ success: true, message: 'Account registered successfully. Please login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// 2. Login with Password Comparison & JWT Generation
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { name: user.name, email: user.email, joined: user.createdAt }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// 3. Get Logged-in User Profile (Protected)
app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const postCount = await Blog.countDocuments({ authorEmail: user.email });
    res.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        totalPosts: postCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile data.' });
  }
});

// --- BLOG CRUD ROUTES ---

// Public: Get all blogs (with search & category filters)
app.get('/api/blogs', async (req, res) => {
  const { search, category, authorEmail } = req.query;
  let filter = {};

  if (category && category !== 'All') filter.category = category;
  if (authorEmail) filter.authorEmail = authorEmail;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const blogs = await Blog.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve blogs.' });
  }
});

// Public: Read single blog
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found.' });
    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving blog.' });
  }
});

// Protected: Create Blog (Author identity locked to verified token)
app.post('/api/blogs', verifyToken, async (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  try {
    const newBlog = await Blog.create({
      title,
      category: category || 'General',
      content,
      author: req.user.name,
      authorEmail: req.user.email
    });
    res.status(201).json({ success: true, message: 'Blog post created successfully.', blog: newBlog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create blog post.' });
  }
});

// Protected: Update Blog
app.put('/api/blogs/:id', verifyToken, async (req, res) => {
  const { title, category, content } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Post not found.' });

    if (blog.authorEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only edit your own posts.' });
    }

    blog.title = title || blog.title;
    blog.category = category || blog.category;
    blog.content = content || blog.content;
    await blog.save();

    res.json({ success: true, message: 'Post updated successfully.', blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update post.' });
  }
});

// Protected: Delete Blog
app.delete('/api/blogs/:id', verifyToken, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Post not found.' });

    if (blog.authorEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own posts.' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
});

app.listen(PORT, () => console.log(`DevBlog server listening on port ${PORT}`));