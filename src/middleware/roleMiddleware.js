const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');

const resolveProjectId = async (req) => {
  // Explicit projectId in params or body
  if (req.params.projectId) return req.params.projectId;
  if (req.body?.projectId) return req.body.projectId;
  if (req.query?.projectId) return req.query.projectId;

  // Task routes: resolve project from task id
  if (req.params.id && (req.baseUrl === '/api/tasks' || req.originalUrl.startsWith('/api/tasks/'))) {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('[roleMiddleware] Invalid task ID format:', req.params.id);
      return null;
    }
    const task = await Task.findById(req.params.id).select('projectId');
    if (!task) {
      console.error('[roleMiddleware] Task not found:', req.params.id);
      return null;
    }
    return task.projectId?.toString() || null;
  }

  // Project routes: id in params is the projectId
  if (req.params.id && (req.baseUrl === '/api/projects' || req.originalUrl.startsWith('/api/projects/'))) {
    return req.params.id;
  }

  return null;
};

const checkProjectRole = (requiredRoles = []) => async (req, res, next) => {
  try {
    const projectId = await resolveProjectId(req);
    if (!projectId) {
      console.error('[roleMiddleware] Could not resolve project ID. Params:', req.params, 'Body:', req.body);
      return res.status(400).json({ error: 'Project ID could not be identified.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      console.error('[roleMiddleware] Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found.' });
    }

    const member = project.members.find(m => m.userId.toString() === req.user.id.toString());
    if (!member) {
      console.error('[roleMiddleware] User not a member. User:', req.user.id, 'Project:', projectId);
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
      console.error('[roleMiddleware] Insufficient permissions. User role:', member.role, 'Required:', requiredRoles);
      return res.status(403).json({ error: `Permission denied. Requires: ${requiredRoles.join(', ')}` });
    }

    req.projectMember = member;
    req.resolvedProjectId = projectId;
    req.resolvedProject = project;
    next();
  } catch (error) {
    console.error('[roleMiddleware] Error:', error);
    res.status(500).json({ error: 'Internal server error during authorization.' });
  }
};

module.exports = { checkProjectRole };
