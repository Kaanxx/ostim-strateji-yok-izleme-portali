const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const { authenticateToken } = require('../middleware/auth');
const { requireTablePermission, enforceDepartmentScope } = require('../middleware/rbac');
const enforceWorkflowLock = require('../middleware/workflowLock');

const multer = require('multer');
const excelController = require('../controllers/excelController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.use(authenticateToken);

// POST live calculations for template
router.post(
  '/:templateCode/calculate',
  requireTablePermission('canView'),
  enforceDepartmentScope,
  recordController.calculateRecords
);

// GET 1:1 Excel export
router.get(
  '/:templateCode/export',
  requireTablePermission('canExport'),
  enforceDepartmentScope,
  excelController.exportRecords
);

// POST validated Excel import
router.post(
  '/:templateCode/import',
  upload.single('file'),
  requireTablePermission('canImport'),
  enforceDepartmentScope,
  enforceWorkflowLock,
  excelController.importRecords
);

// GET records for template
router.get(
  '/:templateCode',
  requireTablePermission('canView'),
  enforceDepartmentScope,
  recordController.getRecords
);

// POST records (batch or single)
router.post(
  '/:templateCode',
  requireTablePermission('canCreate'),
  enforceDepartmentScope,
  enforceWorkflowLock,
  recordController.saveRecords
);

// PUT single record
router.put(
  '/:templateCode/:id',
  requireTablePermission('canUpdate'),
  enforceDepartmentScope,
  enforceWorkflowLock,
  recordController.updateRecord
);

// DELETE single record
router.delete(
  '/:templateCode/:id',
  requireTablePermission('canDelete'),
  enforceDepartmentScope,
  enforceWorkflowLock,
  recordController.deleteRecord
);

module.exports = router;
