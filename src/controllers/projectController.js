const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required.' });

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      creatorId: req.user.id,
      members: [{ userId: req.user.id, role: 'ADMIN' }]
    });

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error during project creation.' });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ 'members.userId': req.user.id })
      .populate('creatorId', 'id name email')
      .sort({ createdAt: -1 });

    const result = await Promise.all(projects.map(async (p) => {
      const taskCount = await Task.countDocuments({ projectId: p._id });
      const myMember = p.members.find(m => m.userId.toString() === req.user.id.toString());
      return {
        ...p.toObject(),
        id: p._id,
        myRole: myMember?.role || 'MEMBER',
        _count: { members: p.members.length, tasks: taskCount }
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error fetching projects.' });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creatorId', 'id name email')
      .populate('members.userId', 'id name email');

    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const myMember = project.members.find(m => m.userId._id.toString() === req.user.id.toString());
    if (!myMember) return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });

    const tasks = await Task.find({ projectId: project._id })
      .populate('assignedToId', 'id name email')
      .populate('creatorId', 'id name email')
      .sort({ createdAt: -1 });

    // Shape members to match frontend expectations
    const members = project.members.map(m => ({
      userId: m.userId._id,
      role: m.role,
      createdAt: m.createdAt,
      user: { id: m.userId._id, name: m.userId.name, email: m.userId.email }
    }));

    // Shape tasks to match frontend expectations
    const shapedTasks = tasks.map(t => ({
      ...t.toObject(),
      id: t._id,
      assignedTo: t.assignedToId ? { id: t.assignedToId._id, name: t.assignedToId.name, email: t.assignedToId.email } : null,
      assignedToId: t.assignedToId?._id || null,
      creator: t.creatorId ? { id: t.creatorId._id, name: t.creatorId.name, email: t.creatorId.email } : null,
    }));

    res.json({
      ...project.toObject(),
      id: project._id,
      creatorId: project.creatorId._id,
      creator: project.creatorId,
      members,
      tasks: shapedTasks,
      myRole: myMember.role
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error fetching project details.' });
  }
};

const addMember = async (req, res) => {
  try {
    const project = req.resolvedProject;
    const { email, role = 'MEMBER' } = req.body;

    if (!email) return res.status(400).json({ error: 'User email is required.' });
    if (!['ADMIN', 'MEMBER'].includes(role.toUpperCase()))
      return res.status(400).json({ error: 'Invalid role. Must be ADMIN or MEMBER.' });

    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) return res.status(404).json({ error: 'User with this email is not registered.' });

    const alreadyMember = project.members.some(m => m.userId.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ error: 'User is already a member of this project.' });

    project.members.push({ userId: userToAdd._id, role: role.toUpperCase() });
    await project.save();

    res.status(201).json({
      message: 'Member added successfully',
      member: { userId: userToAdd._id, role: role.toUpperCase(), user: { id: userToAdd._id, name: userToAdd.name, email: userToAdd.email } }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error adding member.' });
  }
};

const removeMember = async (req, res) => {
  try {
    const project = req.resolvedProject;
    const targetUserId = req.params.userId;

    const memberIndex = project.members.findIndex(m => m.userId.toString() === targetUserId);
    if (memberIndex === -1) return res.status(404).json({ error: 'Member not found in this project.' });

    if (project.creatorId.toString() === targetUserId)
      return res.status(400).json({ error: 'Cannot remove the project creator.' });

    const member = project.members[memberIndex];
    const adminCount = project.members.filter(m => m.role === 'ADMIN').length;
    if (member.role === 'ADMIN' && adminCount <= 1)
      return res.status(400).json({ error: 'Cannot remove the last admin.' });

    project.members.splice(memberIndex, 1);
    await project.save();

    // Unassign tasks in this project assigned to the removed user
    await Task.updateMany({ projectId: project._id, assignedToId: targetUserId }, { $set: { assignedToId: null } });

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error removing member.' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = req.resolvedProject;

    if (project.creatorId.toString() !== req.user.id.toString())
      return res.status(403).json({ error: 'Only the project creator can delete this project.' });

    await Task.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);

    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error deleting project.' });
  }
};

module.exports = { createProject, getProjects, getProjectById, addMember, removeMember, deleteProject };
