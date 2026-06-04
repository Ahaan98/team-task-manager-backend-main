const User = require('../models/User');

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q?.trim()
      ? { $or: [{ name: { $regex: q.trim(), $options: 'i' } }, { email: { $regex: q.trim(), $options: 'i' } }] }
      : {};

    const users = await User.find(filter).select('id name email').limit(20);
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error searching users.' });
  }
};

module.exports = { searchUsers };
