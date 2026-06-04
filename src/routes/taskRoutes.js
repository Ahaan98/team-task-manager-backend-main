const express = require('express');
const { createTask, updateTask, deleteTask } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkProjectRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Create task: requires admin permissions in the specified project (body.projectId)
router.post('/', checkProjectRole(['ADMIN']), createTask);

// Update task: resolves project role dynamically (either ADMIN or MEMBER).
// MEMBER permissions are internally checked within updateTask to restrict to status-only for assigned tasks.
router.put('/:id', checkProjectRole(), updateTask);

// Delete task: requires admin permissions in the project
router.delete('/:id', checkProjectRole(['ADMIN']), deleteTask);

module.exports = router;
