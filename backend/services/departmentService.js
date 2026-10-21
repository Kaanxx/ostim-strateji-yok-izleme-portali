const Department = require('../models/Department');

class DepartmentService {
  /**
   * Builds a nested department tree from the flat list.
   */
  async getDepartmentTree(filter = { isActive: true }) {
    const allDepts = await Department.find(filter)
      .sort({ order: 1, name: 1 })
      .lean();

    const deptMap = {};
    const rootNodes = [];

    // Map departments and initialize children array
    allDepts.forEach(dept => {
      deptMap[dept._id.toString()] = { ...dept, children: [] };
    });

    // Populate tree hierarchy
    allDepts.forEach(dept => {
      const idStr = dept._id.toString();
      const parentIdStr = dept.parentId ? dept.parentId.toString() : null;

      if (parentIdStr && deptMap[parentIdStr]) {
        deptMap[parentIdStr].children.push(deptMap[idStr]);
      } else {
        rootNodes.push(deptMap[idStr]);
      }
    });

    return rootNodes;
  }

  /**
   * Fetches flat list of departments matching criteria.
   */
  async getFlatDepartments(filter = { isActive: true }) {
    return Department.find(filter)
      .populate('parentId', 'name code type')
      .sort({ order: 1, name: 1 })
      .lean();
  }

  /**
   * Returns array of department ID strings for all descendants of a given department ID.
   */
  async getDescendantIds(departmentId) {
    if (!departmentId) return [];
    const descendants = await Department.find({
      ancestors: departmentId,
      isActive: true
    }).select('_id').lean();

    return descendants.map(d => d._id.toString());
  }

  /**
   * Resolves the list of department IDs accessible by a user based on their scope and hierarchy.
   * If user has ALL or is ADMIN, returns 'ALL'.
   * Otherwise returns array of string department IDs (including sub-departments).
   */
  async resolveUserAccessibleDepartmentIds(user) {
    if (!user) return [];

    if (user.role === 'ADMIN') {
      return 'ALL';
    }

    const scopeType = user.departmentScope?.type || user.departmentScope;
    if (scopeType === 'ALL') {
      return 'ALL';
    }

    const rootIds = [];

    // 1. Add primary department
    if (user.departmentId) {
      const primaryId = user.departmentId._id ? user.departmentId._id.toString() : user.departmentId.toString();
      rootIds.push(primaryId);
    }

    // 2. Add custom granted departments
    if (scopeType === 'CUSTOM' && Array.isArray(user.departmentScope?.departments)) {
      user.departmentScope.departments.forEach(dept => {
        const deptId = dept._id ? dept._id.toString() : dept.toString();
        if (!rootIds.includes(deptId)) {
          rootIds.push(deptId);
        }
      });
    } else if (Array.isArray(user.departmentScope)) {
      user.departmentScope.forEach(dept => {
        const deptId = dept._id ? dept._id.toString() : dept.toString();
        if (!rootIds.includes(deptId)) {
          rootIds.push(deptId);
        }
      });
    }

    if (rootIds.length === 0) {
      return [];
    }

    // 3. Find matching departments + any department where ancestors include any of rootIds
    const matching = await Department.find({
      isActive: true,
      $or: [
        { _id: { $in: rootIds } },
        { ancestors: { $in: rootIds } }
      ]
    }).select('_id').lean();

    return matching.map(d => d._id.toString());
  }

  /**
   * Recalculates ancestors when reparenting a department.
   */
  async updateDepartmentAncestors(deptId, newParentId) {
    const dept = await Department.findById(deptId);
    if (!dept) throw new Error('Birim bulunamadı');

    let newAncestors = [];
    if (newParentId) {
      const parent = await Department.findById(newParentId);
      if (!parent) throw new Error('Üst birim bulunamadı');

      if (parent._id.equals(dept._id) || parent.ancestors.some(a => a.equals(dept._id))) {
        throw new Error('Döngüsel hiyerarşi hatası: Birim kendi alt biriminin altına taşınamaz');
      }

      newAncestors = [...parent.ancestors, parent._id];
    }

    const oldAncestors = dept.ancestors;
    dept.parentId = newParentId || null;
    dept.ancestors = newAncestors;
    await dept.save();

    const descendants = await Department.find({ ancestors: dept._id });
    for (const desc of descendants) {
      const relativePath = desc.ancestors.slice(oldAncestors.length + 1);
      desc.ancestors = [...newAncestors, dept._id, ...relativePath];
      await desc.save();
    }
  }
}

const serviceInstance = new DepartmentService();
module.exports = serviceInstance;
