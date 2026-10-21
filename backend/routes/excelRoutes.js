/**
 * excelRoutes.js
 * 
 * Routes for Excel operations: 1:1 Export, Validated Import, Blank Template
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const excelController = require('../controllers/excelController');
const { authenticateToken } = require('../middleware/auth');
const { requireTablePermission, enforceDepartmentScope } = require('../middleware/rbac');
const enforceWorkflowLock = require('../middleware/workflowLock');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.use(authenticateToken);

// 1:1 Export Endpoint
router.get(
  '/export/:templateCode',
  requireTablePermission('canExport'),
  enforceDepartmentScope,
  excelController.exportRecords
);

// Validated Import Endpoint
router.post(
  '/import/:templateCode',
  upload.single('file'),
  requireTablePermission('canImport'),
  enforceDepartmentScope,
  enforceWorkflowLock,
  excelController.importRecords
);

// Blank Authentic Template Download Endpoint
router.get(
  '/blank/:templateCode',
  excelController.getBlankExcel
);

module.exports = router;
