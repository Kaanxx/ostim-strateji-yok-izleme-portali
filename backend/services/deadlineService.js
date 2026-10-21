const Period = require('../models/Period');
const PeriodDeadline = require('../models/PeriodDeadline');

/**
 * Resolves the effective deadline and submission status for a given reporting context.
 * Cascade order:
 * 1. Department-specific extension (PeriodDeadline with departmentId)
 * 2. Template-wide deadline (PeriodDeadline with departmentId: null)
 * 3. Period default deadline (Period.defaultDeadline or Period.endDate)
 */
async function resolveEffectiveDeadline(periodName, templateCode, departmentId = null) {
  if (!periodName) {
    return {
      exists: false,
      isOpen: false,
      reason: 'Raporlama dönemi (period) belirtilmelidir.'
    };
  }

  const normalizedCode = (templateCode || '').toUpperCase().trim();
  const period = await Period.findOne({
    $or: [{ name: periodName }, { code: periodName.toLowerCase() }]
  }).lean();

  if (!period) {
    return {
      exists: false,
      isOpen: false,
      reason: `Raporlama dönemi '${periodName}' bulunamadı.`
    };
  }

  if (!period.isActive) {
    return {
      exists: true,
      period,
      isOpen: false,
      isPeriodInactive: true,
      deadline: period.endDate,
      reason: `Raporlama dönemi (${period.name}) aktif değildir.`
    };
  }

  const now = new Date();

  // 1. Check departmental override
  if (departmentId) {
    const deptDeadline = await PeriodDeadline.findOne({
      period: period.name,
      templateCode: normalizedCode,
      departmentId
    }).lean();

    if (deptDeadline) {
      const deadlineDate = new Date(deptDeadline.deadline);
      const isOpen = now <= deadlineDate;
      return {
        exists: true,
        period,
        deadline: deadlineDate,
        isOverridden: true,
        isOpen,
        reason: isOpen ? null : 'Şablon teslim süresi (birim uzatması) dolmuştur.'
      };
    }
  }

  // 2. Check template-level deadline (departmentId: null)
  const tmplDeadline = await PeriodDeadline.findOne({
    period: period.name,
    templateCode: normalizedCode,
    departmentId: null
  }).lean();

  if (tmplDeadline) {
    const deadlineDate = new Date(tmplDeadline.deadline);
    const isOpen = now <= deadlineDate;
    return {
      exists: true,
      period,
      deadline: deadlineDate,
      isOverridden: false,
      isOpen,
      reason: isOpen ? null : 'Şablon için belirlenen son teslim tarihi geçmiştir.'
    };
  }

  // 3. Fallback to period defaultDeadline or endDate
  const effectiveDeadline = period.defaultDeadline ? new Date(period.defaultDeadline) : new Date(period.endDate);
  const isOpen = now <= effectiveDeadline;

  return {
    exists: true,
    period,
    deadline: effectiveDeadline,
    isOverridden: false,
    isOpen,
    reason: isOpen ? null : 'Dönem genel son teslim tarihi geçmiştir.'
  };
}

module.exports = { resolveEffectiveDeadline };
