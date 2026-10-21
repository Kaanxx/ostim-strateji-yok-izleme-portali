const departmentService = require('./departmentService');
const Department = require('../models/Department');

const resolveDepartmentHierarchy = async (DepartmentModel, rootDeptIds) => {
  if (!rootDeptIds || rootDeptIds.length === 0) return [];

  const stringIds = rootDeptIds.map(id => id.toString());
  const depts = await (DepartmentModel || Department).find({
    isActive: true,
    $or: [
      { _id: { $in: stringIds } },
      { ancestors: { $in: stringIds } }
    ]
  }).select('_id').lean();

  return depts.map(d => d._id.toString());
};

const getUserAuthorizedDepartmentIds = async (user, DepartmentModel) => {
  if (!user) return [];
  if (user.role === 'ADMIN' || user.departmentScope?.type === 'ALL' || user.departmentScope === 'ALL') {
    return 'ALL';
  }
  return departmentService.resolveUserAccessibleDepartmentIds(user);
};

module.exports = {
  resolveDepartmentHierarchy,
  getUserAuthorizedDepartmentIds
};
