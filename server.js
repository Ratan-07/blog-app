const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_URI = process.env.MONGO_URI || 'mongodb+srv://ratanspace123_db_user:gkd3WgUJ37r6Ento@cluster0.xoudqme.mongodb.net/blogApp?retryWrites=true&w=majority';

// Database connection
mongoose.connect(DB_URI)
  .then(() => console.log('Connected to MongoDB database'))
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
  content: { type: String, required: true },
  author: { type: String, default: 'Anonymous' },
  createdAt: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', blogSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch blogs' });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch blog post' });
  }
});

app.post('/api/blogs', async (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Please provide both title and content' });
  }

  try {
    const blog = await Blog.create({ title, content, author: author || 'Anonymous' });
    res.status(201).json({ success: true, message: 'Post published successfully', blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to publish post' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address is already registered' });
    }

    await User.create({ name, email, password });
    res.status(201).json({ success: true, message: 'Account created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ 
      success: true, 
      message: 'Login successful', 
      user: { name: user.name, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));