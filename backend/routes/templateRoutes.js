const express = require('express');
const router = express.Router();
const multer = require('multer');
const templateController = require('../controllers/templateController');
const excelController = require('../controllers/excelController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.get('/', templateController.getTemplates);
router.get('/:code/blank-excel', excelController.getBlankExcel);
router.get('/:code', templateController.getTemplateByCode);

router.post('/', authenticateToken, requireRole('ADMIN'), templateController.createTemplate);
router.put('/:code', authenticateToken, requireRole('ADMIN'), templateController.updateTemplate);
router.delete('/:code', authenticateToken, requireRole('ADMIN'), templateController.deleteTemplate);

router.post(
  '/extract-from-excel',
  authenticateToken,
  requireRole('ADMIN'),
  upload.single('file'),
  templateController.extractFromExcel
);

module.exports = router;
