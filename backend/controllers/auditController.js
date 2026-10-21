const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      templateCode,
      departmentId,
      userId,
      userEmail,
      startDate,
      endDate,
      search
    } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (templateCode) filter.templateCode = templateCode.toUpperCase().trim();
    if (departmentId) filter.departmentId = departmentId;
    if (userId) filter.userId = userId;
    if (userEmail) filter.userEmail = { $regex: userEmail, $options: 'i' };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { templateCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .populate('departmentId', 'name code')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
