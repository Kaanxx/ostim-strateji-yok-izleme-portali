const departmentService = require('../services/departmentService');

/**
 * Middleware: Verifies user has permission for a specific table action
 * (e.g., 'canView', 'canCreate', 'canUpdate', 'canDelete', 'canImport', 'canExport', 'canApprove').
 */
const requireTablePermission = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Kimlik doğrulanmadı' });
    }

    // System ADMIN has unconditional permission
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const templateCode = req.params.templateCode || req.query.templateCode || req.body?.templateCode;

    if (!templateCode) {
      return res.status(400).json({
        success: false,
        message: 'Yetki denetimi için şablon kodu (templateCode) belirtilmelidir'
      });
    }

    const hasPerm = req.user.hasTablePermission(templateCode, action);
    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: `'${templateCode}' tablosunda '${action}' işlemi için yetkiniz bulunmamaktadır.`
      });
    }

    next();
  };
};

/**
 * Middleware: Enforces department visibility and modification scope.
 * Resolves hierarchical department scope (parent faculty grants child departments).
 */
const enforceDepartmentScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Kimlik doğrulanmadı' });
    }

    // ADMIN or 'ALL' scope
    if (req.user.role === 'ADMIN' || req.user.departmentScope?.type === 'ALL' || req.user.departmentScope === 'ALL') {
      req.authorizedDepartmentIds = 'ALL';
      return next();
    }

    const authorized = await departmentService.resolveUserAccessibleDepartmentIds(req.user);
    req.authorizedDepartmentIds = authorized;

    // A. For Data Mutation (POST, PUT, DELETE, PATCH)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      let targetDeptId = (req.body?.departmentId || req.query?.departmentId || '').toString();

      // If mutating an individual record by ID and no departmentId was provided in body/query,
      // resolve the target record's departmentId
      if (!targetDeptId && req.params?.id) {
        const TableRecord = require('../models/TableRecord');
        const existingRecord = await TableRecord.findById(req.params.id).select('departmentId').lean();
        if (existingRecord && existingRecord.departmentId) {
          targetDeptId = existingRecord.departmentId.toString();
        }
      }

      if (!targetDeptId) {
        return res.status(400).json({
          success: false,
          message: 'İşlem yapılacak birim kimliği (departmentId) belirtilmelidir'
        });
      }

      if (!authorized.includes(targetDeptId)) {
        return res.status(403).json({
          success: false,
          message: 'Bu birim adına veri girişi veya değişikliği yapma yetkiniz bulunmamaktadır'
        });
      }
    }

    // B. For Data Querying (GET)
    if (req.method === 'GET') {
      const requestedDeptId = req.query.departmentId?.toString();

      if (requestedDeptId) {
        if (!authorized.includes(requestedDeptId)) {
          return res.status(403).json({
            success: false,
            message: 'Bu birimin verilerini görüntüleme yetkiniz bulunmamaktadır'
          });
        }
      } else {
        // Filter records to authorized departments
        req.departmentFilter = { $in: authorized };
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requireTablePermission,
  enforceDepartmentScope
};
