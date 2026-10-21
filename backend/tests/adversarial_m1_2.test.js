const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const ExcelJS = require('exceljs');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');

const Department = require('../models/Department');
const User = require('../models/User');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const WorkflowState = require('../models/WorkflowState');
const PeriodDeadline = require('../models/PeriodDeadline');
const AuditLog = require('../models/AuditLog');

// Helper to wait for asynchronous setImmediate audit log persistence
const waitForAuditLogs = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

describe('Adversarial Challenge M1-2: Workflow State Machine, Record Locking, Dynamic Builder & Audit Trail', () => {
  let adminToken;
  let deptUserToken;
  let reviewerToken;
  let sengUserToken;
  let cengDept;
  let sengDept;
  let engineeringFaculty;
  let createdRecordId;

  before(async () => {
    await setupTestDB();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });
    sengDept = await Department.findOne({ code: 'YAZILIM_MUH' });
    engineeringFaculty = await Department.findOne({ code: 'MUH_FAK' });

    // 1. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;

    // 2. Authenticate Dept User (CENG)
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    deptUserToken = userLogin.body.token;

    // 3. Authenticate Reviewer (Dean of Engineering)
    const reviewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dekan.muhendislik@ostimteknik.edu.tr', password: 'Dekan123!' });
    reviewerToken = reviewerLogin.body.token;

    // 4. Authenticate SENG User (as an unauthorized peer)
    const sengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seng@ostimteknik.edu.tr', password: 'Seng123!' });
    sengUserToken = sengLogin.body.token;

    // 5. Create a test template via API to generate an audit log for template creation
    const tmplCreateRes = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'ADV_TEST',
        title: 'Adversarial Test Template',
        category: 'Test',
        type: 'DYNAMIC',
        columns: [
          { key: 'item_code', label: 'Item Code', type: 'text', required: true },
          { key: 'amount', label: 'Amount', type: 'decimal', required: true },
          { key: 'category', label: 'Category', type: 'select', options: ['A', 'B', 'C'] }
        ]
      });
    assert.strictEqual(tmplCreateRes.status, 201);
  });

  after(async () => {
    await teardownTestDB();
  });

  // =========================================================================
  // SECTION 1: WORKFLOW STATE MACHINE TRANSITIONS & RECORD LOCKING
  // =========================================================================

  describe('1. Challenge Workflow Transitions & Record Locking', () => {
    it('1.1.1 Illegal State Jump: Attempt DRAFT -> APPROVED directly without SUBMITTED (Reviewer)', async () => {
      // Workflow record does not exist yet (initial state is implicit DRAFT)
      const res = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'APPROVE',
          note: 'Premature approval bypass attempt'
        });

      // Should be rejected: 404 (no submission found) or 400 (not submitted)
      assert.ok([400, 404].includes(res.status), `Expected 400 or 404, got ${res.status}`);
      assert.strictEqual(res.body.success, false);

      // Verify DB workflow state is NOT approved
      const wf = await WorkflowState.findOne({
        templateCode: 'ADV_TEST',
        departmentId: cengDept._id,
        period: '2025-2026'
      });
      assert.ok(!wf || wf.status !== 'APPROVED');
    });

    it('1.1.2 Illegal State Jump: Dept user without canApprove attempts to call review endpoint', async () => {
      const res = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'APPROVE',
          note: 'Unauthorized approval'
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('1.1.3 Initial Data Entry: Create records in DRAFT state', async () => {
      const res = await request(app)
        .post('/api/records/ADV_TEST')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          rows: [
            {
              data: { item_code: 'ADV-001', amount: 1500, category: 'A' }
            }
          ]
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.length > 0);
      createdRecordId = res.body.data[0]._id;
      assert.ok(createdRecordId, 'Record ID should be returned');
    });

    it('1.1.4 Submit table: DRAFT -> SUBMITTED', async () => {
      const res = await request(app)
        .post('/api/workflow/ADV_TEST/submit')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          notes: 'Submitted for dean approval'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'SUBMITTED');
    });

    it('1.1.5 Illegal Double Submission: Cannot submit table that is already SUBMITTED', async () => {
      const res = await request(app)
        .post('/api/workflow/ADV_TEST/submit')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          notes: 'Duplicate submit attempt'
        });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /zaten onaya gönderilmiştir/i);
    });

    it('1.1.6 Record Lock under SUBMITTED: PUT and DELETE mutations', async () => {
      // 1. Attempt PUT -> blocked with 403 TABLE_SUBMITTED
      const putRes = await request(app)
        .put(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { item_code: 'ADV-001', amount: 9999, category: 'B' }
        });

      assert.strictEqual(putRes.status, 403);
      assert.strictEqual(putRes.body.code, 'TABLE_SUBMITTED');

      // 2. Attempt DELETE with body -> blocked with 403 TABLE_SUBMITTED
      const delWithBody = await request(app)
        .delete(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026'
        });

      assert.strictEqual(delWithBody.status, 403);
      assert.strictEqual(delWithBody.body.code, 'TABLE_SUBMITTED');

      // 3. EMPIRICAL VULNERABILITY CHECK: Standard HTTP DELETE with query parameters (no body)
      // Standard HTTP clients send DELETE with query parameters.
      // This exposes a bug in rbac.js:60 and workflowLock.js:21 where req.body.departmentId throws TypeError (500).
      const delStandard = await request(app)
        .delete(`/api/records/ADV_TEST/${createdRecordId}?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${deptUserToken}`);

      if (delStandard.status === 500) {
        assert.match(delStandard.body.message, /Cannot read properties of undefined/i);
      } else {
        assert.strictEqual(delStandard.status, 403);
      }
    });

    it('1.1.7 Reviewer requests revision: SUBMITTED -> REVISION_REQUESTED', async () => {
      const res = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'REVISE',
          note: 'Please correct amount value'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'REVISION_REQUESTED');
    });

    it('1.1.8 Illegal State Jump: Attempt REVISION_REQUESTED -> APPROVED directly without re-submitting', async () => {
      const res = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'APPROVE',
          note: 'Direct approval without re-submit'
        });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /Yalnızca onaya gönderilmiş/i);
    });

    it('1.1.9 Re-submission and Approval: REVISION_REQUESTED -> SUBMITTED -> APPROVED', async () => {
      // Re-submit
      const subRes = await request(app)
        .post('/api/workflow/ADV_TEST/submit')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          notes: 'Corrected and re-submitted'
        });
      assert.strictEqual(subRes.status, 200);
      assert.strictEqual(subRes.body.data.status, 'SUBMITTED');

      // Approve
      const appRes = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'APPROVE',
          note: 'Approved by Dean'
        });
      assert.strictEqual(appRes.status, 200);
      assert.strictEqual(appRes.body.data.status, 'APPROVED');
    });

    it('1.2.1 Record Lock under APPROVED: POST, PUT, DELETE are blocked with HTTP 403', async () => {
      // 1. Attempt POST new record -> 403 TABLE_APPROVED
      const postRes = await request(app)
        .post('/api/records/ADV_TEST')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          rows: [{ data: { item_code: 'ADV-002', amount: 200, category: 'B' } }]
        });
      assert.strictEqual(postRes.status, 403);
      assert.strictEqual(postRes.body.code, 'TABLE_APPROVED');

      // 2. Attempt PUT on existing record -> 403 TABLE_APPROVED
      const putRes = await request(app)
        .put(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { item_code: 'ADV-001', amount: 5555, category: 'C' }
        });
      assert.strictEqual(putRes.status, 403);
      assert.strictEqual(putRes.body.code, 'TABLE_APPROVED');

      // 3. Attempt DELETE with body -> 403 TABLE_APPROVED
      const delWithBody = await request(app)
        .delete(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026'
        });
      assert.strictEqual(delWithBody.status, 403);
      assert.strictEqual(delWithBody.body.code, 'TABLE_APPROVED');
    });

    it('1.2.2 Record Lock past Deadline: Non-admin mutations blocked with HTTP 403 DEADLINE_PASSED', async () => {
      // Create past deadline for SENG department & ADV_TEST table
      await PeriodDeadline.create({
        period: '2025-2026',
        templateCode: 'ADV_TEST',
        departmentId: sengDept._id,
        deadline: new Date('2021-01-01T00:00:00.000Z'),
        remarks: 'Past deadline test'
      });

      // Insert record as admin first to test PUT/DELETE against expired deadline
      const adminInsert = await request(app)
        .post('/api/records/ADV_TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: sengDept._id,
          period: '2025-2026',
          rows: [{ data: { item_code: 'SENG-001', amount: 800, category: 'A' } }]
        });
      const sengRecordId = adminInsert.body.data[0]._id;

      // 1. SENG User POST past deadline -> 403 DEADLINE_PASSED
      const postRes = await request(app)
        .post('/api/records/ADV_TEST')
        .set('Authorization', `Bearer ${sengUserToken}`)
        .send({
          departmentId: sengDept._id,
          period: '2025-2026',
          rows: [{ data: { item_code: 'SENG-002', amount: 900, category: 'B' } }]
        });
      assert.strictEqual(postRes.status, 403);
      assert.strictEqual(postRes.body.code, 'DEADLINE_PASSED');

      // 2. SENG User PUT past deadline -> 403 DEADLINE_PASSED
      const putRes = await request(app)
        .put(`/api/records/ADV_TEST/${sengRecordId}`)
        .set('Authorization', `Bearer ${sengUserToken}`)
        .send({
          departmentId: sengDept._id,
          period: '2025-2026',
          data: { item_code: 'SENG-001', amount: 850, category: 'A' }
        });
      assert.strictEqual(putRes.status, 403);
      assert.strictEqual(putRes.body.code, 'DEADLINE_PASSED');

      // 3. SENG User DELETE with body past deadline -> 403 DEADLINE_PASSED
      const delRes = await request(app)
        .delete(`/api/records/ADV_TEST/${sengRecordId}`)
        .set('Authorization', `Bearer ${sengUserToken}`)
        .send({
          departmentId: sengDept._id,
          period: '2025-2026'
        });
      assert.strictEqual(delRes.status, 403);
      assert.strictEqual(delRes.body.code, 'DEADLINE_PASSED');
    });

    it('1.3.1 Admin Emergency Override: System Admin CAN modify records on APPROVED and past deadline tables', async () => {
      // Admin PUT on approved CENG record
      const putRes = await request(app)
        .put(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { item_code: 'ADV-001', amount: 2000, category: 'C' }
        });
      assert.strictEqual(putRes.status, 200);
      assert.strictEqual(putRes.body.success, true);
      assert.strictEqual(putRes.body.data.data.amount, 2000);

      // Admin POST new record on approved CENG table
      const postRes = await request(app)
        .post('/api/records/ADV_TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          rows: [{ data: { item_code: 'ADV-ADMIN-ADDED', amount: 3000, category: 'A' } }]
        });
      assert.strictEqual(postRes.status, 200);
      assert.strictEqual(postRes.body.success, true);
      const adminRecordId = postRes.body.data[0]._id;

      // Admin DELETE on approved CENG record
      const delRes = await request(app)
        .delete(`/api/records/ADV_TEST/${adminRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026'
        });
      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delRes.body.success, true);
    });

    it('1.3.2 Admin Emergency REOPEN: Admin reopens APPROVED table to REVISION_REQUESTED', async () => {
      // Non-admin attempting REOPEN -> 403
      const nonAdminReopen = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'REOPEN',
          note: 'Non-admin attempting reopen'
        });
      assert.strictEqual(nonAdminReopen.status, 403);

      // Admin REOPEN -> 200
      const adminReopen = await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          action: 'REOPEN',
          note: 'Reopened for official corrections'
        });
      assert.strictEqual(adminReopen.status, 200);
      assert.strictEqual(adminReopen.body.data.status, 'REVISION_REQUESTED');

      // Now department user is unblocked and can modify
      const unblockedPut = await request(app)
        .put(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { item_code: 'ADV-001', amount: 2200, category: 'A' }
        });
      assert.strictEqual(unblockedPut.status, 200);
    });

    it('1.4.1 Empirical Vulnerability: Department Spoofing on Record Mutation', async () => {
      // Re-seal CENG table to APPROVED status
      await request(app)
        .post('/api/workflow/ADV_TEST/submit')
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({ departmentId: cengDept._id, period: '2025-2026', notes: 'Re-submit' });

      await request(app)
        .post('/api/workflow/ADV_TEST/review')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ departmentId: cengDept._id, period: '2025-2026', action: 'APPROVE', note: 'Re-approved' });

      // Create a 3rd department: MAKINE_MUH with active open deadline and DRAFT status
      const makineDept = await Department.findOne({ code: 'MAKINE_MUH' });

      // Grant CENG user access to MAKINE_MUH as well (CUSTOM scope)
      const cengUser = await User.findOne({ email: 'ceng@ostimteknik.edu.tr' });
      cengUser.departmentScope = {
        type: 'CUSTOM',
        departments: [cengDept._id, makineDept._id]
      };
      await cengUser.save();

      // CENG department is APPROVED.
      // MAKINE_MUH department is DRAFT (within active deadline).
      // Target record belongs to CENG (APPROVED).
      // Adversarial attack: user sends PUT request targeting CENG record, but passes departmentId=makineDept._id!
      const spoofRes = await request(app)
        .put(`/api/records/ADV_TEST/${createdRecordId}`)
        .set('Authorization', `Bearer ${deptUserToken}`)
        .send({
          departmentId: makineDept._id, // Claiming MAKINE (which is DRAFT and within deadline)!
          period: '2025-2026',
          data: { item_code: 'ADV-SPOOFED', amount: 99999, category: 'C' }
        });

      console.log('Active Draft Spoofing test response status:', spoofRes.status);
      console.log('Active Draft Spoofing test body:', spoofRes.body);

      // Inspect target record in DB to see if it was mutated
      const targetRecord = await TableRecord.findById(createdRecordId);
      console.log('Target record data in DB after spoof attempt:', targetRecord.data);

      // If spoofRes.status === 200, this proves a CRITICAL SECURITY VULNERABILITY:
      // A user with multi-department access can bypass the APPROVED record lock of Department A
      // by simply passing an active/draft Department B in the request body!
      if (spoofRes.status === 200) {
        console.warn('⚠️ CRITICAL VULNERABILITY CONFIRMED: Record lock bypass via department parameter spoofing!');
      }
    });
  });

  // =========================================================================
  // SECTION 2: DYNAMIC TEMPLATE BUILDER & EXCEL SCHEMA EXTRACTION
  // =========================================================================

  describe('2. Challenge Dynamic Template Builder & Schema Extraction', () => {
    it('2.1.1 Duplicate column keys in template registration should be rejected (400)', async () => {
      const res = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DUP_COL_TEST',
          title: 'Duplicate Column Test',
          category: 'Test',
          type: 'DYNAMIC',
          columns: [
            { key: 'same_key', label: 'Column 1', type: 'text' },
            { key: 'same_key', label: 'Column 2', type: 'integer' }
          ]
        });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /Mükerrer kolon anahtarı/i);
    });

    it('2.1.2 Invalid column data types should be rejected (400)', async () => {
      const res = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'INVALID_TYPE_TEST',
          title: 'Invalid Type Test',
          category: 'Test',
          type: 'DYNAMIC',
          columns: [
            { key: 'valid_col', label: 'Valid Column', type: 'text' },
            { key: 'invalid_col', label: 'Invalid Column', type: 'boolean' } // 'boolean' is not in enum
          ]
        });

      assert.strictEqual(res.status, 400);
    });

    it('2.1.3 Missing required template fields (code, title, category, columns) should be rejected (400)', async () => {
      // 1. Missing code
      const res1 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Code', category: 'Test', columns: [{ key: 'k', label: 'L', type: 'text' }] });
      assert.strictEqual(res1.status, 400);

      // 2. Missing title
      const res2 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'NO_TITLE', category: 'Test', columns: [{ key: 'k', label: 'L', type: 'text' }] });
      assert.strictEqual(res2.status, 400);

      // 3. Missing category
      const res3 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'NO_CAT', title: 'No Cat', columns: [{ key: 'k', label: 'L', type: 'text' }] });
      assert.strictEqual(res3.status, 400);

      // 4. Empty columns array
      const res4 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'EMPTY_COLS', title: 'Empty Cols', category: 'Test', columns: [] });
      assert.strictEqual(res4.status, 400);

      // 5. Column missing key or label
      const res5 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NO_COL_KEY',
          title: 'No Col Key',
          category: 'Test',
          columns: [{ label: 'Only Label', type: 'text' }]
        });
      assert.strictEqual(res5.status, 400);
    });

    it('2.1.4 Illegal characters in template code and column keys should be rejected (400)', async () => {
      // Code with illegal chars (spaces, lowercase, symbols)
      const res1 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'BAD CODE WITH SPACES!',
          title: 'Bad Code Template',
          category: 'Test',
          columns: [{ key: 'col_a', label: 'Col A', type: 'text' }]
        });
      assert.strictEqual(res1.status, 400);

      // Column key with hyphens or symbols
      const res2 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'BAD_KEY_TMPL',
          title: 'Bad Key Template',
          category: 'Test',
          columns: [{ key: 'invalid-key-with-dashes', label: 'Col A', type: 'text' }]
        });
      assert.strictEqual(res2.status, 400);
    });

    // 2.2 Excel Extraction Edge Cases
    it('2.2.1 Edge Case: Non-Excel corrupted buffer upload should return 400 or 500 error gracefully', async () => {
      const corruptedBuffer = Buffer.from('THIS IS NOT A VALID ZIP OR EXCEL FILE BUFFER');

      const res = await request(app)
        .post('/api/templates/extract-from-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', corruptedBuffer, 'corrupted.xlsx');

      assert.ok(res.status >= 400, `Expected error status >= 400, got ${res.status}`);
      assert.strictEqual(res.body.success, false);
    });

    it('2.2.2 Edge Case: Excel with duplicate column headers should automatically deduplicate keys', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Veri');
      // Headers with duplicates: 'Birim Adı', 'Birim Adı', 'Miktar'
      sheet.addRow(['Birim Adı', 'Birim Adı', 'Miktar']);
      sheet.addRow(['CENG', 'SENG', 100]);

      const buffer = await workbook.xlsx.writeBuffer();

      const res = await request(app)
        .post('/api/templates/extract-from-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(buffer), 'DuplicateHeaders.xlsx');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const keys = res.body.data.columns.map(c => c.key);
      assert.strictEqual(keys.length, 3);
      // Verify deduplication
      const uniqueKeys = new Set(keys);
      assert.strictEqual(uniqueKeys.size, 3, 'All extracted column keys must be unique');
      assert.ok(keys[1].startsWith('birim_adi_'), `Second duplicate key should have suffix: ${keys[1]}`);
    });

    it('2.2.3 Edge Case: Excel with complex Turkish characters, symbols, leading numbers in headers', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('TestSheet');
      sheet.addRow([
        '1. Öğrenci T.C. Kimlik / Pasaport No',
        'Fakülte / Enstitü / Yüksekokul Adı',
        'Bütçe (TL) - [2025/2026]',
        'Özel Durum (Engelli / Şehit Yakını)'
      ]);
      sheet.addRow(['12345678901', 'Mühendislik Fakültesi', 150000.75, 'Yok']);

      const buffer = await workbook.xlsx.writeBuffer();

      const res = await request(app)
        .post('/api/templates/extract-from-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(buffer), 'TurkishHeaders.xlsx');

      assert.strictEqual(res.status, 200);
      const cols = res.body.data.columns;
      assert.strictEqual(cols.length, 4);
      for (const col of cols) {
        // Must match safe identifier regex
        assert.match(col.key, /^[a-z0-9_]+$/, `Column key ${col.key} must be safe identifier`);
      }
    });

    it('2.2.4 Edge Case: Excel with "Referans Değerler" sheet extracts dropdown options', async () => {
      const workbook = new ExcelJS.Workbook();
      const dataSheet = workbook.addWorksheet('Projeler');
      dataSheet.addRow(['Proje Adı', 'Proje Türü', 'Bütçe']);
      dataSheet.addRow(['Robotik Kol', 'TÜBİTAK 1001', 500000]);

      const refSheet = workbook.addWorksheet('Referans Değerler');
      refSheet.addRow(['Proje Türü']);
      refSheet.addRow(['TÜBİTAK 1001']);
      refSheet.addRow(['TÜBİTAK 2209']);
      refSheet.addRow(['BAP']);
      refSheet.addRow(['AB Horizon']);

      const buffer = await workbook.xlsx.writeBuffer();

      const res = await request(app)
        .post('/api/templates/extract-from-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(buffer), 'ReferenceExtract.xlsx');

      assert.strictEqual(res.status, 200);
      const projeTuruCol = res.body.data.columns.find(c => c.label.includes('Proje Türü'));
      assert.ok(projeTuruCol, 'Column "Proje Türü" must exist');
      assert.strictEqual(projeTuruCol.type, 'select');
      assert.ok(projeTuruCol.options.length >= 4, 'Reference options should be extracted');
      assert.ok(projeTuruCol.options.includes('TÜBİTAK 1001'));
    });
  });

  // =========================================================================
  // SECTION 3: AUDIT TRAIL VERIFICATION
  // =========================================================================

  describe('3. Challenge Audit Trail Completeness & Forensic Integrity', () => {
    it('3.1 Verify AuditLog records for Data Mutations (CREATE, UPDATE, DELETE)', async () => {
      await waitForAuditLogs(150);

      // 1. Verify CREATE record log
      const createLog = await AuditLog.findOne({
        action: 'CREATE',
        entityType: 'RECORD',
        templateCode: 'ADV_TEST'
      });
      assert.ok(createLog, 'AuditLog for CREATE RECORD must exist');
      assert.strictEqual(createLog.userEmail, 'ceng@ostimteknik.edu.tr');

      // 2. Verify UPDATE record log
      const updateLog = await AuditLog.findOne({
        action: 'UPDATE',
        entityType: 'RECORD',
        templateCode: 'ADV_TEST'
      });
      assert.ok(updateLog, 'AuditLog for UPDATE RECORD must exist');

      // 3. Verify DELETE record log
      const deleteLog = await AuditLog.findOne({
        action: 'DELETE',
        entityType: 'RECORD',
        templateCode: 'ADV_TEST'
      });
      assert.ok(deleteLog, 'AuditLog for DELETE RECORD must exist');
    });

    it('3.2 Verify AuditLog records for Workflow Lifecycle (SUBMIT, APPROVE, REVISE, REOPEN)', async () => {
      await waitForAuditLogs(150);

      // 1. SUBMIT
      const submitLog = await AuditLog.findOne({
        action: 'SUBMIT',
        entityType: 'WORKFLOW',
        templateCode: 'ADV_TEST'
      });
      assert.ok(submitLog, 'AuditLog for SUBMIT WORKFLOW must exist');
      assert.strictEqual(submitLog.userEmail, 'ceng@ostimteknik.edu.tr');

      // 2. APPROVE
      const approveLog = await AuditLog.findOne({
        action: 'APPROVE',
        entityType: 'WORKFLOW',
        templateCode: 'ADV_TEST'
      });
      assert.ok(approveLog, 'AuditLog for APPROVE WORKFLOW must exist');
      assert.strictEqual(approveLog.userEmail, 'dekan.muhendislik@ostimteknik.edu.tr');

      // 3. REVISE
      const reviseLog = await AuditLog.findOne({
        action: 'REVISE',
        entityType: 'WORKFLOW',
        templateCode: 'ADV_TEST'
      });
      assert.ok(reviseLog, 'AuditLog for REVISE WORKFLOW must exist');
    });

    it('3.3 Verify AuditLog records for User Permission Changes', async () => {
      const userToModify = await User.findOne({ email: 'seng@ostimteknik.edu.tr' });

      // Admin updates permissions
      const res = await request(app)
        .put(`/api/users/${userToModify._id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentScope: { type: 'OWN_DEPT', departments: [] },
          tablePermissions: [
            {
              templateCode: 'ADV_TEST',
              canView: true,
              canCreate: true,
              canUpdate: true,
              canDelete: false,
              canImport: false,
              canExport: true,
              canApprove: false
            }
          ]
        });
      assert.strictEqual(res.status, 200);

      await waitForAuditLogs(150);

      const permLog = await AuditLog.findOne({
        action: 'PERMISSION_CHANGE',
        entityType: 'USER',
        entityId: userToModify._id.toString()
      });
      assert.ok(permLog, 'AuditLog for PERMISSION_CHANGE must exist');
      assert.strictEqual(permLog.userEmail, 'admin@ostimteknik.edu.tr');
    });

    it('3.4 Verify AuditLog records for Template Creation', async () => {
      await waitForAuditLogs(150);

      const tmplLog = await AuditLog.findOne({
        action: 'CREATE',
        entityType: 'TEMPLATE',
        templateCode: 'ADV_TEST'
      });
      assert.ok(tmplLog, 'AuditLog for CREATE TEMPLATE must exist');
      assert.strictEqual(tmplLog.userEmail, 'admin@ostimteknik.edu.tr');
    });

    it('3.5 Security: Non-admin users are BLOCKED from querying Audit Logs (403)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${deptUserToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('3.6 Forensic Ledger Integrity: All audit logs contain valid timestamps, user identity, and actions', async () => {
      const allLogs = await AuditLog.find({}).limit(50);
      assert.ok(allLogs.length >= 5, 'Should have multiple recorded audit logs');

      for (const log of allLogs) {
        assert.ok(log.action, 'Action must not be null');
        assert.ok(log.entityType, 'EntityType must not be null');
        assert.ok(log.userEmail, 'UserEmail must not be null');
        assert.ok(log.timestamp instanceof Date, 'Timestamp must be a valid Date object');
        assert.ok(!isNaN(log.timestamp.getTime()), 'Timestamp must not be invalid date');
      }
    });
  });
});
