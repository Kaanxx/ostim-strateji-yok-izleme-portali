const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', periodController.getPeriods);
router.get('/active', periodController.getActivePeriod);
router.get('/:period/deadlines', periodController.getPeriodDeadlines);

router.post('/', requireRole('ADMIN'), periodController.createPeriod);
router.put('/:id', requireRole('ADMIN'), periodController.updatePeriod);
router.put('/:id/active', requireRole('ADMIN'), periodController.setActivePeriod);
router.post('/:period/deadlines', requireRole('ADMIN'), periodController.setPeriodDeadline);
router.delete('/:period/deadlines/:id', requireRole('ADMIN'), periodController.deletePeriodDeadline);

module.exports = router;
