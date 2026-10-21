/**
 * Model Simulators & Domain Engines for RBAC, Workflow, JWT, and Multi-Select Tags
 * 
 * Provides independent, opaque-box reference engines that test the exact
 * business rules and contracts defined in PROJECT.md, ORIGINAL_REQUEST.md,
 * and explorer analysis documents.
 */

const crypto = require('crypto');

// 1. JWT Simulation & Verification (HMAC-SHA256)
class JWTHelper {
  constructor(secret = 'ostim-portal-super-secret-key-2026') {
    this.secret = secret;
  }

  sign(payload, expiresInSeconds = 3600) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encHeader}.${encPayload}`)
      .digest('base64url');

    return `${encHeader}.${encPayload}.${signature}`;
  }

  verify(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is missing or not a string');
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed JWT token structure');
    }

    const [encHeader, encPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(`${encHeader}.${encPayload}`)
      .digest('base64url');

    if (signature !== expectedSig) {
      throw new Error('Invalid JWT signature');
    }

    const payload = JSON.parse(Buffer.from(encPayload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('JWT token has expired');
    }

    return payload;
  }
}

// 2. Organization Structure & Hierarchical RBAC Engine
const OSTIM_DEPARTMENTS = [
  { id: 'REKTORLUK', name: 'Rektörlük', type: 'RECTORATE', parentId: null, ancestors: [] },
  { id: 'MUH_FAK', name: 'Mühendislik Fakültesi', type: 'FACULTY', parentId: 'REKTORLUK', ancestors: ['REKTORLUK'] },
  { id: 'BILGISAYAR_MUH', name: 'Bilgisayar Mühendisliği', type: 'DEPARTMENT', parentId: 'MUH_FAK', ancestors: ['REKTORLUK', 'MUH_FAK'] },
  { id: 'YAZILIM_MUH', name: 'Yazılım Mühendisliği', type: 'DEPARTMENT', parentId: 'MUH_FAK', ancestors: ['REKTORLUK', 'MUH_FAK'] },
  { id: 'MAKINE_MUH', name: 'Makine Mühendisliği', type: 'DEPARTMENT', parentId: 'MUH_FAK', ancestors: ['REKTORLUK', 'MUH_FAK'] },
  { id: 'ELEKTRIK_MUH', name: 'Elektrik-Elektronik Mühendisliği', type: 'DEPARTMENT', parentId: 'MUH_FAK', ancestors: ['REKTORLUK', 'MUH_FAK'] },
  { id: 'ENDUSTRI_MUH', name: 'Endüstri Mühendisliği', type: 'DEPARTMENT', parentId: 'MUH_FAK', ancestors: ['REKTORLUK', 'MUH_FAK'] },
  { id: 'IIBF', name: 'İktisadi ve İdari Bilimler Fakültesi', type: 'FACULTY', parentId: 'REKTORLUK', ancestors: ['REKTORLUK'] },
  { id: 'ISLETME', name: 'İşletme', type: 'DEPARTMENT', parentId: 'IIBF', ancestors: ['REKTORLUK', 'IIBF'] },
  { id: 'IKTISAT', name: 'İktisat', type: 'DEPARTMENT', parentId: 'IIBF', ancestors: ['REKTORLUK', 'IIBF'] },
  { id: 'MYO', name: 'Meslek Yüksekokulu', type: 'MYO', parentId: 'REKTORLUK', ancestors: ['REKTORLUK'] },
  { id: 'MYO_BILGISAYAR', name: 'Bilgisayar Programcılığı', type: 'DEPARTMENT', parentId: 'MYO', ancestors: ['REKTORLUK', 'MYO'] },
  { id: 'STRATEJI_GELISTIRME', name: 'Strateji Geliştirme Daire Başkanlığı', type: 'ADMIN_UNIT', parentId: 'REKTORLUK', ancestors: ['REKTORLUK'] },
  { id: 'GENEL_SEKRETERLIK', name: 'Genel Sekreterlik', type: 'ADMIN_UNIT', parentId: 'REKTORLUK', ancestors: ['REKTORLUK'] },
];

class RBACEngine {
  constructor(departments = OSTIM_DEPARTMENTS) {
    this.departments = departments;
    this.deptMap = new Map(departments.map(d => [d.id, d]));
  }

  resolveAccessibleDepartments(user) {
    if (!user) return [];
    if (user.role === 'ADMIN' || user.departmentScope?.type === 'ALL') {
      return this.departments.map(d => d.id);
    }

    const scopeType = user.departmentScope?.type || 'OWN_DEPT';
    const accessible = new Set();

    if (user.departmentId) {
      accessible.add(user.departmentId);
    }

    if (scopeType === 'OWN_DEPT') {
      return Array.from(accessible);
    }

    if (scopeType === 'PARENT_FACULTY') {
      const userDept = this.deptMap.get(user.departmentId);
      if (userDept) {
        // If user is at faculty level, include all descendants
        const targetId = userDept.type === 'FACULTY' ? userDept.id : userDept.parentId;
        if (targetId) {
          accessible.add(targetId);
          for (const d of this.departments) {
            if (d.ancestors.includes(targetId) || d.id === targetId) {
              accessible.add(d.id);
            }
          }
        }
      }
      return Array.from(accessible);
    }

    if (scopeType === 'CUSTOM') {
      const grantList = user.departmentScope?.departments || [];
      for (const gid of grantList) {
        accessible.add(gid);
        // Also expand child descendants of granted units
        for (const d of this.departments) {
          if (d.ancestors.includes(gid)) {
            accessible.add(d.id);
          }
        }
      }
      return Array.from(accessible);
    }

    return Array.from(accessible);
  }

  canUserAccessDepartment(user, targetDeptId) {
    if (user.role === 'ADMIN' || user.departmentScope?.type === 'ALL') {
      return true;
    }
    const accessible = this.resolveAccessibleDepartments(user);
    return accessible.includes(targetDeptId);
  }

  canUserPerform(user, templateCode, action) {
    if (user.role === 'ADMIN') return true;
    if (!user.permissions) return false;

    // Check table-level permission matrix
    const tablePerm = user.permissions.find(p => p.templateCode === templateCode || p.templateCode === '*');
    if (!tablePerm) return false;

    return Boolean(tablePerm[action]);
  }
}

// 3. Multi-State Approval Workflow Finite State Machine
class WorkflowFSM {
  static STATES = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    REVISION_REQUESTED: 'REVISION_REQUESTED',
    APPROVED: 'APPROVED',
  };

  constructor() {
    this.history = [];
  }

  transition(currentState, action, actor, { note = '', deadline = null, isDeadlinePassed = false } = {}) {
    // Non-admin deadline check
    if (actor.role !== 'ADMIN' && isDeadlinePassed) {
      throw new Error('DEADLINE_PASSED: Submissions are locked because the deadline has passed');
    }

    switch (action) {
      case 'SUBMIT': {
        if (currentState !== WorkflowFSM.STATES.DRAFT && currentState !== WorkflowFSM.STATES.REVISION_REQUESTED) {
          throw new Error(`Cannot SUBMIT from state ${currentState}`);
        }
        return {
          newState: WorkflowFSM.STATES.SUBMITTED,
          log: { action, actor: actor.id, date: new Date(), note },
        };
      }
      case 'APPROVE': {
        if (currentState !== WorkflowFSM.STATES.SUBMITTED) {
          throw new Error(`Cannot APPROVE from state ${currentState}. Submission must be SUBMITTED first.`);
        }
        if (actor.role !== 'ADMIN' && !actor.canApprove) {
          throw new Error('FORBIDDEN: User does not possess canApprove permission');
        }
        return {
          newState: WorkflowFSM.STATES.APPROVED,
          log: { action, actor: actor.id, date: new Date(), note },
        };
      }
      case 'REVISE': {
        if (currentState !== WorkflowFSM.STATES.SUBMITTED) {
          throw new Error(`Cannot request REVISION from state ${currentState}`);
        }
        if (actor.role !== 'ADMIN' && !actor.canApprove) {
          throw new Error('FORBIDDEN: User does not possess canApprove permission');
        }
        if (!note || note.trim().length === 0) {
          throw new Error('Review notes are strictly mandatory when requesting revision');
        }
        return {
          newState: WorkflowFSM.STATES.REVISION_REQUESTED,
          log: { action, actor: actor.id, date: new Date(), note },
        };
      }
      case 'REOPEN': {
        if (actor.role !== 'ADMIN') {
          throw new Error('Only System Admins can REOPEN an approved or locked table');
        }
        return {
          newState: WorkflowFSM.STATES.REVISION_REQUESTED,
          log: { action, actor: actor.id, date: new Date(), note: note || 'Reopened by Admin' },
        };
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  isMutationAllowed(state, actor, isDeadlinePassed = false) {
    if (actor.role === 'ADMIN') return true;
    if (isDeadlinePassed) return false;
    if (state === WorkflowFSM.STATES.APPROVED || state === WorkflowFSM.STATES.SUBMITTED) {
      return false; // Locked against editing
    }
    return state === WorkflowFSM.STATES.DRAFT || state === WorkflowFSM.STATES.REVISION_REQUESTED;
  }
}

// 4. VBA Macro Equivalent Multi-Select Tag Selector
class MultiSelectTagManager {
  static parseTags(tagString) {
    if (!tagString || typeof tagString !== 'string') return [];
    return tagString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  static addTag(currentTagString, newTag, allowedOptions = null) {
    if (!newTag || typeof newTag !== 'string') return currentTagString || '';
    const cleanTag = newTag.trim();
    if (allowedOptions && !allowedOptions.includes(cleanTag)) {
      throw new Error(`Tag "${cleanTag}" is not in the allowed reference list`);
    }

    const currentList = MultiSelectTagManager.parseTags(currentTagString);
    // Deduplication check (VBA InStr > 0 behavior)
    if (currentList.includes(cleanTag)) {
      return currentList.join(','); // Unchanged
    }

    currentList.push(cleanTag);
    return currentList.join(',');
  }

  static removeTag(currentTagString, tagToRemove) {
    const currentList = MultiSelectTagManager.parseTags(currentTagString);
    const filtered = currentList.filter(t => t !== tagToRemove.trim());
    return filtered.join(',');
  }

  static clearTags() {
    return '';
  }
}

// 5. Dynamic Template Builder Schema Validator
class DynamicTemplateValidator {
  static ALLOWED_COLUMN_TYPES = ['text', 'integer', 'decimal', 'date', 'select', 'multiselect', 'formula', 'url'];

  static validateSchema(template) {
    if (!template.title || typeof template.title !== 'string') {
      throw new Error('Template title is required');
    }
    if (!template.code || typeof template.code !== 'string') {
      throw new Error('Template code is required');
    }
    if (!Array.isArray(template.columns) || template.columns.length === 0) {
      throw new Error('Template must define at least one column');
    }

    const seenKeys = new Set();
    for (const col of template.columns) {
      if (!col.key || typeof col.key !== 'string') {
        throw new Error('Each column must have a valid string key');
      }
      if (seenKeys.has(col.key)) {
        throw new Error(`Duplicate column key: "${col.key}"`);
      }
      seenKeys.add(col.key);

      if (!DynamicTemplateValidator.ALLOWED_COLUMN_TYPES.includes(col.type)) {
        throw new Error(`Invalid column type "${col.type}" for column "${col.key}"`);
      }

      if ((col.type === 'select' || col.type === 'multiselect') && (!Array.isArray(col.options) || col.options.length === 0)) {
        throw new Error(`Select column "${col.key}" must provide non-empty options array`);
      }
    }
    return true;
  }
}

module.exports = {
  JWTHelper,
  RBACEngine,
  OSTIM_DEPARTMENTS,
  WorkflowFSM,
  MultiSelectTagManager,
  DynamicTemplateValidator,
};
