const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim())
      return res.status(400).json({ error: 'Please provide a valid name.' });
    if (!email || !validator.isEmail(email.trim()))
      return res.status(400).json({ error: 'Invalid email format.' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(400).json({ error: 'User with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    // Onboarding project
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const past   = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const project = await Project.create({
      name: 'Getting Started 🚀',
      description: 'Welcome! This project was created automatically to help you explore features.',
      creatorId: user._id,
      members: [{ userId: user._id, role: 'ADMIN' }]
    });

    await Task.insertMany([
      { title: 'Explore your Kanban Board 📋', description: 'Click on tasks to see details.', dueDate: future, priority: 'LOW',    status: 'TODO',        projectId: project._id, creatorId: user._id, assignedToId: user._id },
      { title: 'Invite team members 👥',       description: 'Add teammates via Team Members button.', dueDate: future, priority: 'MEDIUM', status: 'TODO',        projectId: project._id, creatorId: user._id, assignedToId: user._id },
      { title: 'Update task status 🚀',         description: 'Change status to DONE to see dashboard update.', dueDate: future, priority: 'HIGH',   status: 'IN_PROGRESS', projectId: project._id, creatorId: user._id, assignedToId: user._id },
      { title: 'Resolve overdue tasks ⚠️',      description: 'This task is flagged as overdue!', dueDate: past,   priority: 'HIGH',   status: 'TODO',        projectId: project._id, creatorId: user._id, assignedToId: user._id },
    ]);

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User registered successfully', token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { register, login, getProfile };
