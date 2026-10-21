const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authenticateToken } = require('../middleware/auth');
const { requireTablePermission, enforceDepartmentScope } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/summary', enforceDepartmentScope, workflowController.getWorkflowSummary);

router.get(
  '/:templateCode',
  requireTablePermission('canView'),
  enforceDepartmentScope,
  workflowController.getWorkflowStatus
);

router.post(
  '/:templateCode/submit',
  requireTablePermission('canCreate'),
  enforceDepartmentScope,
  workflowController.submitWorkflow
);

router.post(
  '/:templateCode/review',
  requireTablePermission('canApprove'),
  enforceDepartmentScope,
  workflowController.reviewWorkflow
);

module.exports = router;
