const Task = require('../models/Task');
const Project = require('../models/Project');

const getDashboardStats = async (req, res) => {
  try {
    const { projectId } = req.query;
    let projectIds = [];

    if (projectId) {
      const member = await Project.findOne({ _id: projectId, 'members.userId': req.user.id });
      if (!member) return res.status(403).json({ error: 'Access denied.' });
      projectIds = [projectId];
    } else {
      const projects = await Project.find({ 'members.userId': req.user.id }).select('_id');
      projectIds = projects.map(p => p._id);
    }

    if (projectIds.length === 0) {
      return res.json({ totalTasks: 0, statusBreakdown: { TODO: 0, IN_PROGRESS: 0, DONE: 0 }, priorityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0 }, tasksPerUser: [], overdueTasks: [], overdueCount: 0 });
    }

    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .populate('assignedToId', 'id name email')
      .populate('projectId', 'id name');

    const now = new Date();
    const statusBreakdown = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    const priorityBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const userTaskMap = {};
    const overdueTasks = [];

    tasks.forEach(task => {
      statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
      priorityBreakdown[task.priority] = (priorityBreakdown[task.priority] || 0) + 1;

      if (task.status !== 'DONE' && task.dueDate < now) overdueTasks.push(task);

      const key = task.assignedToId ? task.assignedToId._id.toString() : 'unassigned';
      if (!userTaskMap[key]) {
        userTaskMap[key] = {
          id: task.assignedToId ? task.assignedToId._id : null,
          name: task.assignedToId ? task.assignedToId.name : 'Unassigned',
          email: task.assignedToId ? task.assignedToId.email : 'N/A',
          taskCount: 0
        };
      }
      userTaskMap[key].taskCount++;
    });

    const tasksPerUser = Object.values(userTaskMap).sort((a, b) => b.taskCount - a.taskCount);

    res.json({
      totalTasks: tasks.length,
      statusBreakdown,
      priorityBreakdown,
      tasksPerUser,
      overdueTasks: overdueTasks.map(t => ({
        id: t._id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        projectId: t.projectId._id,
        projectName: t.projectId.name,
        assignedTo: t.assignedToId ? t.assignedToId.name : 'Unassigned'
      })),
      overdueCount: overdueTasks.length
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error computing dashboard statistics.' });
  }
};

module.exports = { getDashboardStats };
