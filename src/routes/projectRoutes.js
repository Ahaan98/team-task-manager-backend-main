const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  addMember,
  removeMember,
  deleteProject
} = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkProjectRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.delete('/:projectId', checkProjectRole(['ADMIN']), deleteProject);

// Admin-only member management routes
router.post('/:projectId/members', checkProjectRole(['ADMIN']), addMember);
router.delete('/:projectId/members/:userId', checkProjectRole(['ADMIN']), removeMember);

module.exports = router;
