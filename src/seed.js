require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Seeding...');

  await Task.deleteMany({});
  await Project.deleteMany({});
  await User.deleteMany({});

  const hash = await bcrypt.hash('password123', 10);

  const [user1, user2, user3] = await User.insertMany([
    { name: 'Aahaan Sharma', email: 'admin@example.com',  password: hash },
    { name: 'Priya Patel',   email: 'member@example.com', password: hash },
    { name: 'Rohan Sen',     email: 'team@example.com',   password: hash },
  ]);

  const project = await Project.create({
    name: 'Next-Gen Mobile App',
    description: 'Design and build our brand new mobile application featuring real-time sync and Offline-First capability.',
    creatorId: user1._id,
    members: [
      { userId: user1._id, role: 'ADMIN' },
      { userId: user2._id, role: 'MEMBER' },
      { userId: user3._id, role: 'MEMBER' },
    ]
  });

  const now = new Date();
  const past    = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const future1 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const future2 = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  await Task.insertMany([
    { title: 'Design high-fidelity UI wireframes',         description: 'Produce mockups for home, dashboard and login screens.', dueDate: future1, priority: 'HIGH',   status: 'IN_PROGRESS', projectId: project._id, assignedToId: user2._id, creatorId: user1._id },
    { title: 'Configure JWT Authentication endpoints',      description: 'Implement token validation, login, and registration APIs.', dueDate: past,    priority: 'HIGH',   status: 'TODO',        projectId: project._id, assignedToId: user3._id, creatorId: user1._id },
    { title: 'Draft API contracts and architectural plans', description: 'Write specifications for REST endpoints and schemas.',    dueDate: past,    priority: 'MEDIUM', status: 'DONE',        projectId: project._id, assignedToId: user1._id, creatorId: user1._id },
    { title: 'Integrate SVG workload charts in Dashboard',  description: 'Build responsive graphics for user task counts.',         dueDate: future2, priority: 'LOW',    status: 'TODO',        projectId: project._id, assignedToId: null,      creatorId: user1._id },
  ]);

  console.log('Seeding completed!');
  console.log('  admin@example.com  / password123 (ADMIN)');
  console.log('  member@example.com / password123 (MEMBER)');
  console.log('  team@example.com   / password123 (MEMBER)');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
