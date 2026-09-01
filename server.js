require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Replace with your MongoDB URI or configure it inside a local .env file
const DB_URI = process.env.MONGO_URI || 'mongodb+srv://ratanspace123_db_user:gkd3WgUJ37r6Ento@cluster0.xoudqme.mongodb.net/blogApp?retryWrites=true&w=majority';

// Database Connection
mongoose.connect(DB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('Database connection error:', err));

// Schemas & Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
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

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }
    await User.create({ name, email, password });
    res.status(201).json({ success: true, message: 'Account registered successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    res.json({
      success: true,
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// --- BLOG CRUD ROUTES (With Search & Category Filter) ---

// 1. READ ALL (With Search query and Category filtering)
app.get('/api/blogs', async (req, res) => {
  const { search, category, authorEmail } = req.query;
  let filter = {};

  if (category && category !== 'All') {
    filter.category = category;
  }
  if (authorEmail) {
    filter.authorEmail = authorEmail;
  }
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

// 2. READ SINGLE
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found.' });
    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving blog details.' });
  }
});

// 3. CREATE
app.post('/api/blogs', async (req, res) => {
  const { title, category, content, author, authorEmail } = req.body;
  if (!title || !content || !authorEmail) {
    return res.status(400).json({ success: false, message: 'Title, content, and user session are required.' });
  }

  try {
    const newBlog = await Blog.create({
      title,
      category: category || 'General',
      content,
      author: author || 'Anonymous',
      authorEmail
    });
    res.status(201).json({ success: true, message: 'Blog post created successfully.', blog: newBlog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create blog post.' });
  }
});

// 4. UPDATE (PUT)
app.put('/api/blogs/:id', async (req, res) => {
  const { title, category, content, authorEmail } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Post not found.' });

    // Ensure only the original author can edit
    if (blog.authorEmail !== authorEmail) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this post.' });
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

// 5. DELETE
app.delete('/api/blogs/:id', async (req, res) => {
  const { authorEmail } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Post not found.' });

    // Ensure only the original author can delete
    if (blog.authorEmail !== authorEmail) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this post.' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
});

app.listen(PORT, () => console.log(`DevBlog server listening on port ${PORT}`));