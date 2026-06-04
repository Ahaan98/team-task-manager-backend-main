const Task = require('../models/Task');
const Project = require('../models/Project');

const populateTask = (query) =>
  query
    .populate('assignedToId', 'id name email')
    .populate('creatorId', 'id name email');

const shapeTask = (t) => ({
  ...t.toObject(),
  id: t._id,
  assignedTo: t.assignedToId ? { id: t.assignedToId._id, name: t.assignedToId.name, email: t.assignedToId.email } : null,
  assignedToId: t.assignedToId?._id || null,
  creator: t.creatorId ? { id: t.creatorId._id, name: t.creatorId.name, email: t.creatorId.email } : null,
});

const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedToId } = req.body;
    const projectId = req.resolvedProjectId;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' });
    if (!dueDate || isNaN(new Date(dueDate))) return res.status(400).json({ error: 'Valid due date is required.' });

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    const finalPriority = priority || 'MEDIUM';
    if (!validPriorities.includes(finalPriority))
      return res.status(400).json({ error: 'Invalid priority.' });

    let finalAssignedToId = null;
    if (assignedToId) {
      const project = await Project.findById(projectId);
      const isMember = project?.members.some(m => m.userId.toString() === String(assignedToId));
      if (!isMember) return res.status(400).json({ error: 'Assignee is not a member of this project.' });
      finalAssignedToId = assignedToId;
    }

    const task = await populateTask(Task.create({
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: new Date(dueDate),
      priority: finalPriority,
      status: 'TODO',
      projectId,
      assignedToId: finalAssignedToId,
      creatorId: req.user.id
    }).then(t => Task.findById(t._id)));

    res.status(201).json({ message: 'Task created successfully', task: shapeTask(task) });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error creating task.' });
  }
};

const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const userRole = req.projectMember.role;
    const { title, description, dueDate, priority, status, assignedToId } = req.body;
    const updateData = {};

    if (userRole === 'ADMIN') {
      if (title !== undefined) {
        if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty.' });
        updateData.title = title.trim();
      }
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (dueDate !== undefined) {
        if (isNaN(new Date(dueDate))) return res.status(400).json({ error: 'Invalid due date.' });
        updateData.dueDate = new Date(dueDate);
      }
      if (priority !== undefined) {
        if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) return res.status(400).json({ error: 'Invalid priority.' });
        updateData.priority = priority;
      }
      if (status !== undefined) {
        if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
        updateData.status = status;
      }
      if (assignedToId !== undefined) {
        if (assignedToId === null) {
          updateData.assignedToId = null;
        } else {
          const project = await Project.findById(task.projectId);
          const isMember = project?.members.some(m => m.userId.toString() === String(assignedToId));
          if (!isMember) return res.status(400).json({ error: 'Assignee is not a member of this project.' });
          updateData.assignedToId = assignedToId;
        }
      }
    } else {
      if (task.assignedToId?.toString() !== req.user.id.toString())
        return res.status(403).json({ error: 'Members can only update their own assigned tasks.' });
      if (title || description || dueDate || priority || assignedToId !== undefined)
        return res.status(403).json({ error: 'Members can only change task status.' });
      if (!status) return res.status(400).json({ error: 'Status is required.' });
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
      updateData.status = status;
    }

    const updated = await populateTask(Task.findByIdAndUpdate(taskId, updateData, { new: true }));
    res.json({ message: 'Task updated successfully', task: shapeTask(updated) });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error updating task.' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error deleting task.' });
  }
};

module.exports = { createTask, updateTask, deleteTask };
