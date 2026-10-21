const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', departmentController.getDepartments);
router.get('/:id', departmentController.getDepartmentById);
router.get('/:id/descendants', departmentController.getDepartmentDescendants);

router.post('/', authenticateToken, requireRole('ADMIN'), departmentController.createDepartment);
router.put('/:id', authenticateToken, requireRole('ADMIN'), departmentController.updateDepartment);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), departmentController.deleteDepartment);

module.exports = router;
