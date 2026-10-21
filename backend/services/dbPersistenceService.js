const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Department = require('../models/Department');
const User = require('../models/User');
const Period = require('../models/Period');
const PeriodDeadline = require('../models/PeriodDeadline');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const WorkflowState = require('../models/WorkflowState');
const AuditLog = require('../models/AuditLog');

const DATA_DIR = path.resolve(__dirname, '../.data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'db_snapshot.json');

let saveTimer = null;
let isSaving = false;
let pendingSave = false;

/**
 * Restores all 8 collections from backend/.data/db_snapshot.json if available
 * and if the current database is empty (such as when embedded MongoMemoryServer starts up).
 * Returns true if a snapshot was restored, false otherwise.
 */
async function restoreSnapshotIfAvailable(options = {}) {
  const { force = false } = options;
  if (process.env.NODE_ENV === 'test' && !force) {
    return false;
  }

  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return false;
    }

    const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
    if (!raw || !raw.trim()) {
      return false;
    }

    const snapshot = JSON.parse(raw);
    const collections = snapshot?.collections;
    if (!collections || typeof collections !== 'object') {
      return false;
    }

    // Only skip if not forced and the current database already has populated core data
    if (!force) {
      const existingDeptCount = await Department.countDocuments();
      const existingUserCount = await User.countDocuments();
      if (existingDeptCount > 0 && existingUserCount > 0) {
        return true;
      }
    }

    const modelMap = [
      { key: 'departments', model: Department },
      { key: 'users', model: User },
      { key: 'periods', model: Period },
      { key: 'periodDeadlines', model: PeriodDeadline },
      { key: 'templates', model: Template },
      { key: 'tableRecords', model: TableRecord },
      { key: 'workflowStates', model: WorkflowState },
      { key: 'auditLogs', model: AuditLog }
    ];

    let totalRestored = 0;

    for (const { key, model } of modelMap) {
      const docs = collections[key];
      if (Array.isArray(docs) && docs.length > 0) {
        const count = await model.countDocuments();
        if (count === 0) {
          await model.insertMany(docs, { ordered: false });
          totalRestored += docs.length;
        }
      }
    }

    if (totalRestored > 0) {
      console.log(`💾 Disk yerel veritabanı yedeği geri yüklendi (${totalRestored} kayıt: ${SNAPSHOT_FILE})`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('⚠️ Veritabanı yedeği geri yüklenirken uyarı:', err.message);
    return false;
  }
}

/**
 * Immediately exports all 8 collections to backend/.data/db_snapshot.json atomically.
 */
async function saveSnapshotNow(options = {}) {
  const { force = false } = options;
  if (process.env.NODE_ENV === 'test' && !force) {
    return false;
  }
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  if (isSaving) {
    pendingSave = true;
    return false;
  }

  isSaving = true;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    const [
      departments,
      users,
      periods,
      periodDeadlines,
      templates,
      tableRecords,
      workflowStates,
      auditLogs
    ] = await Promise.all([
      Department.find({}).lean(),
      User.find({}).select('+password').lean(),
      Period.find({}).lean(),
      PeriodDeadline.find({}).lean(),
      Template.find({}).lean(),
      TableRecord.find({}).lean(),
      WorkflowState.find({}).lean(),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(5000).lean()
    ]);

    const payload = {
      updatedAt: new Date().toISOString(),
      collections: {
        departments,
        users,
        periods,
        periodDeadlines,
        templates,
        tableRecords,
        workflowStates,
        auditLogs
      }
    };

    const tmpFile = `${SNAPSHOT_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmpFile, SNAPSHOT_FILE);
    return true;
  } catch (err) {
    console.error('⚠️ Veritabanı anlık görüntüsü kaydedilirken hata:', err.message);
    return false;
  } finally {
    isSaving = false;
    if (pendingSave) {
      pendingSave = false;
      scheduleSnapshotSave(100);
    }
  }
}

/**
 * Schedules a debounced snapshot save so rapid consecutive writes coalesce cleanly.
 */
function scheduleSnapshotSave(delayMs = 150) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSnapshotNow();
  }, delayMs);
}

module.exports = {
  SNAPSHOT_FILE,
  restoreSnapshotIfAvailable,
  saveSnapshotNow,
  scheduleSnapshotSave
};
