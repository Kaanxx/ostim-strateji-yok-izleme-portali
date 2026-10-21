const mongoose = require('mongoose');
const WorkflowState = require('../models/WorkflowState');
const TableRecord = require('../models/TableRecord');
const { resolveEffectiveDeadline } = require('../services/deadlineService');

/**
 * Middleware: Enforces that table records cannot be created, modified, or deleted
 * if the workflow is APPROVED or SUBMITTED, or if the deadline has passed (unless user is ADMIN).
 */
async function enforceWorkflowLock(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Kimlik doğrulaması yapılmadı.' });
    }

    // Admins always bypass workflow lock
    if (user.role === 'ADMIN') {
      return next();
    }

    const templateCode = (req.params.templateCode || req.body?.templateCode || '').toUpperCase().trim();
    let departmentId = req.body?.departmentId || req.query?.departmentId || user.departmentId;
    let period = req.body?.period || req.query?.period || req.headers?.['x-reporting-period'];

    // When targeting an existing record by :id, resolve authoritative department and period from database
    if (req.params.id) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
      }

      const existingRecord = await TableRecord.findById(req.params.id);
      if (!existingRecord) {
        return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
      }

      if (templateCode && existingRecord.templateCode !== templateCode) {
        return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
      }

      departmentId = existingRecord.departmentId;
      period = existingRecord.period;
      req.targetRecord = existingRecord;
    }

    if (!templateCode) {
      return res.status(400).json({ success: false, message: 'Şablon kodu (templateCode) gereklidir.' });
    }
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Birim ID (departmentId) gereklidir.' });
    }
    if (!period) {
      return res.status(400).json({ success: false, message: 'Raporlama dönemi (period) gereklidir.' });
    }

    // 1. Check Period and Deadline
    const deadlineInfo = await resolveEffectiveDeadline(period, templateCode, departmentId);
    if (!deadlineInfo.exists) {
      return res.status(404).json({ success: false, message: deadlineInfo.reason });
    }
    if (!deadlineInfo.isOpen) {
      return res.status(403).json({
        success: false,
        code: 'DEADLINE_PASSED',
        message: deadlineInfo.reason || 'Veri giriş süresi sona ermiştir.',
        deadline: deadlineInfo.deadline
      });
    }

    // 2. Check Workflow Status
    const workflow = await WorkflowState.findOne({
      templateCode,
      departmentId,
      period
    }).lean();

    if (workflow) {
      if (workflow.status === 'APPROVED') {
        return res.status(403).json({
          success: false,
          code: 'TABLE_APPROVED',
          message: 'Bu tablo onaylanmıştır (APPROVED). Onaylanmış veriler üzerinde değişiklik yapılamaz. Değişiklik için yönetici veya onaylayıcıdan revizyon talep ediniz.',
          reviewedBy: workflow.reviewedBy,
          reviewedAt: workflow.reviewedAt
        });
      }

      if (workflow.status === 'SUBMITTED') {
        return res.status(403).json({
          success: false,
          code: 'TABLE_SUBMITTED',
          message: 'Bu tablo onay için gönderilmiştir (SUBMITTED). İnceleme aşamasında veri değiştirilemez. Değişiklik için onaylayıcının revizyon talebini bekleyiniz.',
          submittedAt: workflow.submittedAt
        });
      }
    }

    // Status is DRAFT or REVISION_REQUESTED and within deadline -> Proceed
    next();
  } catch (error) {
    console.error('Error in enforceWorkflowLock middleware:', error);
    res.status(500).json({ success: false, message: 'Yetkilendirme ve kilit kontrolü sırasında sunucu hatası.' });
  }
}

module.exports = enforceWorkflowLock;
