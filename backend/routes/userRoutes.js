const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.put('/:id/permissions', userController.updateUserPermissions);
router.put('/:id/scope', userController.updateUserScope);
router.delete('/:id', userController.deleteUser);

module.exports = router;
