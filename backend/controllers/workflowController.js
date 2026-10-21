const WorkflowState = require('../models/WorkflowState');
const TableRecord = require('../models/TableRecord');
const Template = require('../models/Template');
const Department = require('../models/Department');
const { resolveEffectiveDeadline } = require('../services/deadlineService');

// GET /api/workflow/:templateCode
exports.getWorkflowStatus = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period } = req.query;

    if (!departmentId || !period) {
      return res.status(400).json({
        success: false,
        message: 'Birim kimliği (departmentId) ve dönem (period) zorunludur'
      });
    }

    const deadlineInfo = await resolveEffectiveDeadline(period, templateCode, departmentId);

    let workflow = await WorkflowState.findOne({
      templateCode,
      departmentId,
      period
    })
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .lean();

    if (!workflow) {
      return res.status(200).json({
        success: true,
        data: {
          templateCode,
          departmentId,
          period,
          status: 'DRAFT',
          submittedBy: null,
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: '',
          isLocked: !deadlineInfo.isOpen,
          lockReason: deadlineInfo.isOpen ? null : (deadlineInfo.reason || 'Süre doldu'),
          deadline: deadlineInfo.deadline,
          isDeadlinePassed: !deadlineInfo.isOpen,
          history: []
        }
      });
    }

    const isLocked = workflow.status === 'APPROVED' || workflow.status === 'SUBMITTED' || !deadlineInfo.isOpen;
    let lockReason = null;
    if (workflow.status === 'APPROVED') lockReason = 'Tablo onaylanmıştır (APPROVED).';
    else if (workflow.status === 'SUBMITTED') lockReason = 'Tablo inceleme aşamasındadır (SUBMITTED).';
    else if (!deadlineInfo.isOpen) lockReason = deadlineInfo.reason || 'Teslim tarihi geçmiştir.';

    res.status(200).json({
      success: true,
      data: {
        ...workflow,
        isLocked,
        lockReason,
        deadline: deadlineInfo.deadline,
        isDeadlinePassed: !deadlineInfo.isOpen
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/workflow/:templateCode/submit
exports.submitWorkflow = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period, notes = '' } = req.body;

    if (!departmentId || !period) {
      return res.status(400).json({
        success: false,
        message: 'Birim kimliği (departmentId) ve dönem (period) zorunludur'
      });
    }

    // Check deadline
    if (req.user.role !== 'ADMIN') {
      const deadlineInfo = await resolveEffectiveDeadline(period, templateCode, departmentId);
      if (!deadlineInfo.exists) {
        return res.status(404).json({ success: false, message: deadlineInfo.reason });
      }
      if (!deadlineInfo.isOpen) {
        return res.status(403).json({
          success: false,
          code: 'DEADLINE_PASSED',
          message: deadlineInfo.reason || 'Teslim tarihi dolmuştur, gönderim yapılamaz.'
        });
      }
    }

    let workflow = await WorkflowState.findOne({
      templateCode,
      departmentId,
      period
    });

    if (workflow) {
      if (workflow.status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Bu tablo zaten onaylanmıştır.'
        });
      }
      if (workflow.status === 'SUBMITTED') {
        return res.status(400).json({
          success: false,
          message: 'Bu tablo zaten onaya gönderilmiştir.'
        });
      }
    }

    const fromStatus = workflow ? workflow.status : 'DRAFT';

    if (!workflow) {
      workflow = new WorkflowState({
        templateCode,
        departmentId,
        period,
        history: []
      });
    }

    workflow.status = 'SUBMITTED';
    workflow.submittedBy = req.user._id;
    workflow.submittedAt = new Date();
    workflow.history.push({
      fromStatus,
      toStatus: 'SUBMITTED',
      action: 'SUBMIT',
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByEmail: req.user.email,
      notes: notes || 'Onaya gönderildi.',
      timestamp: new Date()
    });

    await workflow.save();

    // Sync records status
    await TableRecord.updateMany(
      { templateCode, departmentId, period },
      { $set: { status: 'SUBMITTED', submittedBy: req.user._id } }
    );

    if (req.auditLog) {
      req.auditLog('SUBMIT', 'WORKFLOW', workflow._id, { notes }, {
        departmentId,
        templateCode,
        period
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tablo başarıyla onaya gönderildi',
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/workflow/:templateCode/review
exports.reviewWorkflow = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period, action, note = '' } = req.body;

    if (!departmentId || !period || !action) {
      return res.status(400).json({
        success: false,
        message: 'Birim (departmentId), dönem (period) ve eylem (action: APPROVE|REVISE|REOPEN) zorunludur'
      });
    }

    const normalizedAction = action.toUpperCase().trim();
    if (!['APPROVE', 'REVISE', 'REOPEN'].includes(normalizedAction)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz inceleme eylemi. (APPROVE, REVISE, REOPEN olmalıdır)'
      });
    }

    let workflow = await WorkflowState.findOne({
      templateCode,
      departmentId,
      period
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'İncelenecek iş akışı kaydı bulunamadı'
      });
    }

    const fromStatus = workflow.status;

    if (normalizedAction === 'APPROVE') {
      if (workflow.status !== 'SUBMITTED' && req.user.role !== 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'Yalnızca onaya gönderilmiş (SUBMITTED) tablolar onaylanabilir'
        });
      }

      workflow.status = 'APPROVED';
      workflow.reviewedBy = req.user._id;
      workflow.reviewedAt = new Date();
      workflow.reviewNotes = note || 'Onaylandı.';

      workflow.history.push({
        fromStatus,
        toStatus: 'APPROVED',
        action: 'APPROVE',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByEmail: req.user.email,
        notes: note || 'Onaylandı.',
        timestamp: new Date()
      });

      await workflow.save();

      await TableRecord.updateMany(
        { templateCode, departmentId, period },
        { $set: { status: 'APPROVED', isApproved: true } }
      );

      if (req.auditLog) {
        req.auditLog('APPROVE', 'WORKFLOW', workflow._id, { note }, {
          departmentId,
          templateCode,
          period
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Tablo başarıyla onaylandı',
        data: workflow
      });
    }

    if (normalizedAction === 'REVISE') {
      if (!note || note.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Revizyon talebinde bulunurken açıklama (note) girilmesi zorunludur'
        });
      }

      workflow.status = 'REVISION_REQUESTED';
      workflow.reviewedBy = req.user._id;
      workflow.reviewedAt = new Date();
      workflow.reviewNotes = note.trim();

      workflow.history.push({
        fromStatus,
        toStatus: 'REVISION_REQUESTED',
        action: 'REVISE',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByEmail: req.user.email,
        notes: note.trim(),
        timestamp: new Date()
      });

      await workflow.save();

      await TableRecord.updateMany(
        { templateCode, departmentId, period },
        { $set: { status: 'REVISION_REQUESTED', isApproved: false } }
      );

      if (req.auditLog) {
        req.auditLog('REVISE', 'WORKFLOW', workflow._id, { note }, {
          departmentId,
          templateCode,
          period
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Revizyon talebi iletildi',
        data: workflow
      });
    }

    if (normalizedAction === 'REOPEN') {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Yalnızca Sistem Yöneticisi onaylanmış tabloyu yeniden açabilir'
        });
      }

      workflow.status = 'REVISION_REQUESTED';
      workflow.reviewNotes = note ? `Yeniden Açıldı: ${note}` : 'Yönetici tarafından yeniden açıldı.';

      workflow.history.push({
        fromStatus,
        toStatus: 'REVISION_REQUESTED',
        action: 'REOPEN',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByEmail: req.user.email,
        notes: note || 'Yönetici tarafından yeniden açıldı.',
        timestamp: new Date()
      });

      await workflow.save();

      await TableRecord.updateMany(
        { templateCode, departmentId, period },
        { $set: { status: 'REVISION_REQUESTED', isApproved: false } }
      );

      if (req.auditLog) {
        req.auditLog('REVISE', 'WORKFLOW', workflow._id, { note, action: 'REOPEN' }, {
          departmentId,
          templateCode,
          period
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Tablo yeniden açıldı',
        data: workflow
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/workflow/summary
exports.getWorkflowSummary = async (req, res, next) => {
  try {
    const { period, departmentId } = req.query;
    const filter = {};
    if (period) filter.period = period;

    if (departmentId) {
      filter.departmentId = departmentId;
    } else if (req.user && req.user.role !== 'ADMIN' && Array.isArray(req.authorizedDepartmentIds)) {
      filter.departmentId = { $in: req.authorizedDepartmentIds };
    }

    const allStates = await WorkflowState.find(filter)
      .populate('departmentId', 'name code')
      .populate('submittedBy', 'name email')
      .lean();

    const summary = {
      total: allStates.length,
      draft: 0,
      submitted: 0,
      approved: 0,
      revisionRequested: 0
    };

    const pendingReviews = [];

    for (const ws of allStates) {
      if (ws.status === 'DRAFT') summary.draft++;
      else if (ws.status === 'SUBMITTED') {
        summary.submitted++;
        pendingReviews.push({
          templateCode: ws.templateCode,
          departmentId: ws.departmentId?._id || ws.departmentId,
          departmentName: ws.departmentId?.name || '',
          period: ws.period,
          status: ws.status,
          submittedByName: ws.submittedBy?.name || '',
          submittedAt: ws.submittedAt
        });
      } else if (ws.status === 'APPROVED') summary.approved++;
      else if (ws.status === 'REVISION_REQUESTED') summary.revisionRequested++;
    }

    res.status(200).json({
      success: true,
      summary,
      pendingReviews
    });
  } catch (error) {
    next(error);
  }
};
