const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const config = require('../config');
const Department = require('../models/Department');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const User = require('../models/User');
const WorkflowState = require('../models/WorkflowState');
const PeriodDeadline = require('../models/PeriodDeadline');

describe('Milestone 1 — Adversarial Stress-Test Suite (Empirical Challenger)', () => {
  let adminToken;
  let cengToken;
  let dekanToken;
  let cengUser;
  let dekanUser;
  let adminUser;

  let cengDept;
  let sengDept;
  let muhFakDept;
  let iibfDept;
  let isletmeDept;
  let sksDept;
  let rektorlukDept;

  let sengRecordId;
  let cengRecordId;

  before(async () => {
    await setupTestDB();

    // 1. Fetch departments
    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });
    sengDept = await Department.findOne({ code: 'YAZILIM_MUH' });
    muhFakDept = await Department.findOne({ code: 'MUH_FAK' });
    iibfDept = await Department.findOne({ code: 'IIBF' });
    isletmeDept = await Department.findOne({ code: 'ISLETME' });
    sksDept = await Department.findOne({ code: 'SKS' });
    rektorlukDept = await Department.findOne({ code: 'REKTORLUK' });

    // 2. Create test template: DERSLER
    await Template.create({
      code: 'DERSLER',
      title: 'Dersler Şablonu',
      category: 'Eğitim',
      type: 'DYNAMIC',
      columns: [
        { key: 'ders_kodu', label: 'Ders Kodu', type: 'text', required: true },
        { key: 'ders_adi', label: 'Ders Adı', type: 'text', required: true }
      ]
    });

    // 3. Create test template: PROJELER
    await Template.create({
      code: 'PROJELER',
      title: 'Araştırma Projeleri',
      category: 'Araştırma',
      type: 'DYNAMIC',
      columns: [
        { key: 'proje_kodu', label: 'Proje Kodu', type: 'text', required: true },
        { key: 'proje_adi', label: 'Proje Adı', type: 'text', required: true }
      ]
    });

    // 4. Seed records for CENG, SENG, and ISLETME
    const cengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: cengDept._id,
      period: '2025-2026',
      rowNumber: 1,
      data: { ders_kodu: 'CENG101', ders_adi: 'Programlamaya Giriş' }
    });
    cengRecordId = cengRec._id.toString();

    const sengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: sengDept._id,
      period: '2025-2026',
      rowNumber: 1,
      data: { ders_kodu: 'SENG101', ders_adi: 'Yazılım Mühendisliği Temelleri' }
    });
    sengRecordId = sengRec._id.toString();

    await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: isletmeDept._id,
      period: '2025-2026',
      rowNumber: 1,
      data: { ders_kodu: 'BUS101', ders_adi: 'İşletme Yönetimi' }
    });

    // 5. Authenticate users
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;
    adminUser = adminLogin.body.user;

    const cengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    cengToken = cengLogin.body.token;
    cengUser = cengLogin.body.user;

    const dekanLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dekan.muhendislik@ostimteknik.edu.tr', password: 'Dekan123!' });
    dekanToken = dekanLogin.body.token;
    dekanUser = dekanLogin.body.user;
  });

  after(async () => {
    await teardownTestDB();
  });

  // =========================================================================
  // SUITE 1: JWT & Authentication Adversarial Testing
  // =========================================================================
  describe('1. JWT and Authentication Adversarial Challenge', () => {
    it('1.1 Invalid token signature signed with wrong secret must return 401', async () => {
      const forgedToken = jwt.sign(
        { id: cengUser.id, email: cengUser.email, role: 'DEPT_USER' },
        'malicious-attacker-secret-key-999',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'TOKEN_INVALID');
    });

    it('1.2 Expired token must return 401 with code TOKEN_EXPIRED', async () => {
      const expiredToken = jwt.sign(
        { id: cengUser.id, email: cengUser.email, role: 'DEPT_USER' },
        config.jwtSecret,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
    });

    it('1.3 Tampered role in JWT payload (claiming ADMIN) must be ignored and evaluated against database role', async () => {
      // Craft a token signed with REAL secret but payload claims role: 'ADMIN' for CENG user
      const tamperedToken = jwt.sign(
        {
          id: cengUser.id,
          email: cengUser.email,
          role: 'ADMIN' // Tampered claim
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      // Attempt admin-only route: GET /api/users
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tamperedToken}`);

      // Must be rejected with 403 Forbidden because DB role is DEPT_USER
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Bu işlem için gerekli role sahip değilsiniz/i);
    });

    it('1.4 Forged token with non-existent user ID must return 401 User Not Found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ghostToken = jwt.sign(
        { id: fakeId, email: 'ghost@ostimteknik.edu.tr', role: 'ADMIN' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ghostToken}`);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Kullanıcı hesabı bulunamadı/i);
    });

    it('1.5 Malformed Authorization headers must be rejected with 401', async () => {
      // Header missing Bearer scheme
      const res1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      assert.strictEqual(res1.status, 401);

      // Header with Bearer but no token
      const res2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer');
      assert.strictEqual(res2.status, 401);

      // Header with too many segments
      const res3 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token extra parts');
      assert.strictEqual(res3.status, 401);

      // Completely empty Authorization header
      const res4 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', '');
      assert.strictEqual(res4.status, 401);
    });

    it('1.6 Malformed and empty credentials on POST /api/auth/login must be rejected gracefully', async () => {
      // Empty body
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({});
      assert.strictEqual(res1.status, 400);
      assert.strictEqual(res1.body.success, false);

      // Missing password
      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@ostimteknik.edu.tr' });
      assert.strictEqual(res2.status, 400);

      // Missing email
      const res3 = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Password123!' });
      assert.strictEqual(res3.status, 400);

      // Non-existent user
      const res4 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@ostimteknik.edu.tr', password: 'Password123!' });
      assert.strictEqual(res4.status, 401);

      // Existing user with wrong password
      const res5 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ceng@ostimteknik.edu.tr', password: 'WrongPassword999!' });
      assert.strictEqual(res5.status, 401);
    });

    it('1.7 Deactivated user cannot log in and pre-issued tokens are invalidated (403)', async () => {
      // 1. Create temporary test user
      const tempUser = await User.create({
        name: 'Deactivated Test User',
        email: 'deactivated.test@ostimteknik.edu.tr',
        password: 'TestPassword123!',
        role: 'DEPT_USER',
        departmentId: cengDept._id,
        tablePermissions: [{ templateCode: '*', canView: true }],
        isActive: true
      });

      // 2. Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'deactivated.test@ostimteknik.edu.tr', password: 'TestPassword123!' });
      assert.strictEqual(loginRes.status, 200);
      const tempToken = loginRes.body.token;

      // 3. Deactivate user in database
      tempUser.isActive = false;
      await tempUser.save();

      // 4. Try logging in again -> must return 403
      const blockedLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'deactivated.test@ostimteknik.edu.tr', password: 'TestPassword123!' });
      assert.strictEqual(blockedLogin.status, 403);
      assert.match(blockedLogin.body.message, /devre dışı/i);

      // 5. Try using previously issued token -> must return 403
      const blockedTokenRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      assert.strictEqual(blockedTokenRes.status, 403);
      assert.match(blockedTokenRes.body.message, /devre dışı/i);

      // Cleanup
      await User.findByIdAndDelete(tempUser._id);
    });
  });

  // =========================================================================
  // SUITE 2: Department Scoping Adversarial Testing
  // =========================================================================
  describe('2. Department Scoping Adversarial Challenge', () => {
    it('2.1 Strict Boundary Isolation: User with Primary Dept A is blocked from Dept B records (GET and POST)', async () => {
      // GET SENG records as CENG user -> 403
      const getRes = await request(app)
        .get(`/api/records/DERSLER?departmentId=${sengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${cengToken}`);
      assert.strictEqual(getRes.status, 403);
      assert.match(getRes.body.message, /görüntüleme yetkiniz bulunmamaktadır/i);

      // POST to SENG as CENG user -> 403
      const postRes = await request(app)
        .post('/api/records/DERSLER')
        .set('Authorization', `Bearer ${cengToken}`)
        .send({
          departmentId: sengDept._id,
          period: '2025-2026',
          rows: [{ data: { ders_kodu: 'HACK202', ders_adi: 'Adversarial Injection' } }]
        });
      assert.strictEqual(postRes.status, 403);
      assert.match(postRes.body.message, /veri girişi veya değişikliği yapma yetkiniz bulunmamaktadır/i);
    });

    it('2.2 Unscoped Query Isolation: Query without departmentId must NEVER return unauthorized departments', async () => {
      const res = await request(app)
        .get('/api/records/DERSLER?period=2025-2026')
        .set('Authorization', `Bearer ${cengToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.length > 0);

      // Every returned record MUST belong to authorized department (CENG)
      for (const rec of res.body.data) {
        const deptId = rec.departmentId._id ? rec.departmentId._id.toString() : rec.departmentId.toString();
        assert.strictEqual(
          deptId,
          cengDept._id.toString(),
          `Data leaked! Found record belonging to unauthorized department: ${deptId}`
        );
      }
    });

    it('2.3 Hierarchical Inheritance: Dean of Engineering accesses ALL child engineering departments', async () => {
      const childDepts = await Department.find({ ancestors: muhFakDept._id, isActive: true });
      assert.ok(childDepts.length >= 2, 'Faculty should have multiple child departments');

      for (const child of childDepts) {
        const res = await request(app)
          .get(`/api/records/DERSLER?departmentId=${child._id}&period=2025-2026`)
          .set('Authorization', `Bearer ${dekanToken}`);

        assert.strictEqual(
          res.status,
          200,
          `Dean failed to inherit access to child department ${child.code} (Status: ${res.status})`
        );
      }
    });

    it('2.4 Hierarchical Isolation: Dean of Engineering is strictly BLOCKED from other faculties and units', async () => {
      // 1. IIBF (Faculty)
      const resIIBF = await request(app)
        .get(`/api/records/DERSLER?departmentId=${iibfDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${dekanToken}`);
      assert.strictEqual(resIIBF.status, 403);

      // 2. ISLETME (Department under IIBF)
      const resIsletme = await request(app)
        .get(`/api/records/DERSLER?departmentId=${isletmeDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${dekanToken}`);
      assert.strictEqual(resIsletme.status, 403);

      // 3. SKS (Administrative Unit)
      const resSKS = await request(app)
        .get(`/api/records/DERSLER?departmentId=${sksDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${dekanToken}`);
      assert.strictEqual(resSKS.status, 403);

      // 4. REKTORLUK (Parent of Faculty)
      const resRektor = await request(app)
        .get(`/api/records/DERSLER?departmentId=${rektorlukDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${dekanToken}`);
      assert.strictEqual(resRektor.status, 403);
    });

    it('2.5 Dynamic Grant Lifecycle: Admin grants CUSTOM scope, then revokes it to OWN_DEPT', async () => {
      // 1. Grant CENG user access to SENG department
      const grantRes = await request(app)
        .put(`/api/users/${cengUser.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentScope: {
            type: 'CUSTOM',
            departments: [sengDept._id]
          }
        });
      assert.strictEqual(grantRes.status, 200);

      // Login to refresh token and state
      const refreshedLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
      const customToken = refreshedLogin.body.token;

      // Access SENG -> must be 200 OK
      const sengAccessRes = await request(app)
        .get(`/api/records/DERSLER?departmentId=${sengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${customToken}`);
      assert.strictEqual(sengAccessRes.status, 200);

      // Access Primary CENG -> still 200 OK
      const cengAccessRes = await request(app)
        .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${customToken}`);
      assert.strictEqual(cengAccessRes.status, 200);

      // Access Ungranted ISLETME -> must be 403
      const isletmeAccessRes = await request(app)
        .get(`/api/records/DERSLER?departmentId=${isletmeDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${customToken}`);
      assert.strictEqual(isletmeAccessRes.status, 403);

      // 2. Revoke grant: Reset to OWN_DEPT
      const revokeRes = await request(app)
        .put(`/api/users/${cengUser.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentScope: {
            type: 'OWN_DEPT',
            departments: []
          }
        });
      assert.strictEqual(revokeRes.status, 200);

      // Re-login
      const revokedLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
      const revokedToken = revokedLogin.body.token;

      // Access SENG -> must now be 403 Forbidden
      const revokedSengRes = await request(app)
        .get(`/api/records/DERSLER?departmentId=${sengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${revokedToken}`);
      assert.strictEqual(revokedSengRes.status, 403);
    });

    it('2.6 IDOR / Cross-Department Record Mutation Challenge: Verify record deletion cannot cross department boundary', async () => {
      // Create dedicated SENG record to test deletion
      const sengDelRec = await TableRecord.create({
        templateCode: 'DERSLER',
        departmentId: sengDept._id,
        period: '2025-2026',
        rowNumber: 99,
        data: { ders_kodu: 'SENG-DEL', ders_adi: 'Target for Deletion' }
      });

      // User CENG attempts to delete SENG record by specifying CENG departmentId in body
      const deleteRes = await request(app)
        .delete(`/api/records/DERSLER/${sengDelRec._id}`)
        .set('Authorization', `Bearer ${cengToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026'
        });

      // Check if SENG record is still intact in the database
      const intactRecord = await TableRecord.findById(sengDelRec._id);

      // Verify that deleting a record from another department is strictly forbidden
      assert.strictEqual(
        deleteRes.status,
        403,
        `VULNERABILITY DETECTED: Cross-department DELETE returned status ${deleteRes.status} instead of 403 Forbidden! Response: ${JSON.stringify(deleteRes.body)}`
      );
      assert.ok(intactRecord, 'Record in SENG was deleted by user from CENG!');
    });

    it('2.7 IDOR / Cross-Department Record Modification Challenge: Verify record update cannot cross department boundary', async () => {
      // Create dedicated SENG record to test modification
      const sengUpdateRec = await TableRecord.create({
        templateCode: 'DERSLER',
        departmentId: sengDept._id,
        period: '2025-2026',
        rowNumber: 100,
        data: { ders_kodu: 'SENG-ORIG', ders_adi: 'Original Record' }
      });

      // User CENG attempts to update SENG record by providing CENG departmentId
      const updateRes = await request(app)
        .put(`/api/records/DERSLER/${sengUpdateRec._id}`)
        .set('Authorization', `Bearer ${cengToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { ders_kodu: 'HACKED999', ders_adi: 'Defaced Record' }
        });

      // Verify status code is 403 Forbidden
      assert.strictEqual(
        updateRes.status,
        403,
        `VULNERABILITY DETECTED: Cross-department PUT returned status ${updateRes.status} instead of 403 Forbidden! Response: ${JSON.stringify(updateRes.body)}`
      );

      // Verify the record in DB was NOT defaced
      const recordInDB = await TableRecord.findById(sengUpdateRec._id);
      assert.notStrictEqual(
        recordInDB.data?.ders_kodu,
        'HACKED999',
        `VULNERABILITY DETECTED: User from CENG was able to deface SENG record ${sengUpdateRec._id} via PUT!`
      );
    });
    it('2.8 Query-string DELETE without request body crashes with 500 TypeError (Unsafe req.body access)', async () => {
      const sengQueryRec = await TableRecord.create({
        templateCode: 'DERSLER',
        departmentId: sengDept._id,
        period: '2025-2026',
        rowNumber: 101,
        data: { ders_kodu: 'SENG-QUERY', ders_adi: 'Query Test' }
      });

      // Standard HTTP DELETE with query parameters and NO body
      const res = await request(app)
        .delete(`/api/records/DERSLER/${sengQueryRec._id}?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${cengToken}`);

      // The server crashes with 500 due to req.body.departmentId on undefined req.body
      // Expected behavior should be graceful 403 Forbidden
      assert.strictEqual(
        res.status,
        403,
        `VULNERABILITY DETECTED: Standard DELETE with query params returned ${res.status} (${res.body.message}) instead of 403 Forbidden!`
      );
    });

    it('2.9 Cross-Department Workflow Lock Bypass: User can modify another department\'s APPROVED record', async () => {
      // 1. Create SENG record
      const sengApprovedRec = await TableRecord.create({
        templateCode: 'DERSLER',
        departmentId: sengDept._id,
        period: '2025-2026',
        rowNumber: 102,
        data: { ders_kodu: 'SENG-APP', ders_adi: 'Approved Data' }
      });

      // 2. Lock SENG DERSLER workflow as APPROVED
      await WorkflowState.create({
        templateCode: 'DERSLER',
        departmentId: sengDept._id,
        period: '2025-2026',
        status: 'APPROVED',
        submittedBy: sengDept._id,
        reviewedBy: dekanUser.id,
        reviewedAt: new Date()
      });

      // 3. User CENG whose own department is in DRAFT tries to tamper with SENG's APPROVED record
      const res = await request(app)
        .put(`/api/records/DERSLER/${sengApprovedRec._id}`)
        .set('Authorization', `Bearer ${cengToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { ders_kodu: 'SEAL_BROKEN', ders_adi: 'Tampered Approved Record' }
        });

      // Workflow lock must prevent this (403 TABLE_APPROVED or 403 Unauthorized Department)
      assert.strictEqual(
        res.status,
        403,
        `VULNERABILITY DETECTED: Non-admin user was able to modify an APPROVED record belonging to another department! Status: ${res.status}`
      );

      const checkInDB = await TableRecord.findById(sengApprovedRec._id);
      assert.notStrictEqual(
        checkInDB.data?.ders_kodu,
        'SEAL_BROKEN',
        'VULNERABILITY DETECTED: APPROVED record was modified in the database!'
      );
    });
  });

  // =========================================================================
  // SUITE 3: Table Permissions Matrix Adversarial Testing
  // =========================================================================
  describe('3. Table Permissions Matrix Adversarial Challenge', () => {
    let testPermUser;
    let testPermToken;

    before(async () => {
      // Create user with explicit restrictive permissions:
      // DERSLER: canView: true, canCreate: false, canUpdate: false, canDelete: false
      // PROJELER: canView: true, canCreate: true, canUpdate: true, canDelete: false
      testPermUser = await User.create({
        name: 'Restricted Matrix User',
        email: 'restricted.matrix@ostimteknik.edu.tr',
        password: 'Password123!',
        role: 'DEPT_USER',
        departmentId: cengDept._id,
        departmentScope: { type: 'OWN_DEPT' },
        tablePermissions: [
          {
            templateCode: 'DERSLER',
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false
          },
          {
            templateCode: 'PROJELER',
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: false
          }
        ],
        isActive: true
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'restricted.matrix@ostimteknik.edu.tr', password: 'Password123!' });
      testPermToken = loginRes.body.token;
    });

    after(async () => {
      if (testPermUser) {
        await User.findByIdAndDelete(testPermUser._id);
      }
    });

    it('3.1 canView=true, canCreate=false: can view records but blocked from creating records (403)', async () => {
      // 1. GET DERSLER -> must be 200 OK
      const getRes = await request(app)
        .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${testPermToken}`);
      assert.strictEqual(getRes.status, 200);

      // 2. POST DERSLER -> must be 403 Forbidden
      const postRes = await request(app)
        .post('/api/records/DERSLER')
        .set('Authorization', `Bearer ${testPermToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          rows: [{ data: { ders_kodu: 'UNAUTH101', ders_adi: 'Unauthorized Subject' } }]
        });
      assert.strictEqual(postRes.status, 403);
      assert.strictEqual(postRes.body.success, false);
      assert.match(postRes.body.message, /canCreate/);
    });

    it('3.2 canDelete=false: user cannot delete records even in their own department (403)', async () => {
      // User creates record in PROJELER (where canCreate=true)
      const createRes = await request(app)
        .post('/api/records/PROJELER')
        .set('Authorization', `Bearer ${testPermToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          rows: [{ data: { proje_kodu: 'P-TEST', proje_adi: 'Perm Test Project' } }]
        });
      assert.strictEqual(createRes.status, 200);
      const createdRecordId = createRes.body.data[0]._id;

      // User attempts DELETE on the record they just created (canDelete=false)
      const deleteRes = await request(app)
        .delete(`/api/records/PROJELER/${createdRecordId}?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${testPermToken}`);

      assert.strictEqual(deleteRes.status, 403);
      assert.strictEqual(deleteRes.body.success, false);
      assert.match(deleteRes.body.message, /canDelete/);
    });

    it('3.3 canUpdate=false: user cannot update records in DERSLER (403)', async () => {
      const updateRes = await request(app)
        .put(`/api/records/DERSLER/${cengRecordId}`)
        .set('Authorization', `Bearer ${testPermToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          data: { ders_kodu: 'CENG101', ders_adi: 'Modified Subject' }
        });

      assert.strictEqual(updateRes.status, 403);
      assert.strictEqual(updateRes.body.success, false);
      assert.match(updateRes.body.message, /canUpdate/);
    });

    it('3.4 Empty table permissions: user without any permission entry cannot view table (403)', async () => {
      // User has no entry for FINANS template
      const res = await request(app)
        .get(`/api/records/FINANS?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${testPermToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /canView/);
    });

    it('3.5 Wildcard permission allows viewing across templates but respects action flags', async () => {
      // Create user with wildcard: templateCode: '*', canView: true, canCreate: false
      const wildcardUser = await User.create({
        name: 'Wildcard Viewer',
        email: 'wildcard.viewer@ostimteknik.edu.tr',
        password: 'Password123!',
        role: 'DEPT_USER',
        departmentId: cengDept._id,
        departmentScope: { type: 'OWN_DEPT' },
        tablePermissions: [{ templateCode: '*', canView: true, canCreate: false }],
        isActive: true
      });

      const wLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wildcard.viewer@ostimteknik.edu.tr', password: 'Password123!' });
      const wToken = wLogin.body.token;

      // Can view DERSLER -> 200 OK
      const vDersler = await request(app)
        .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${wToken}`);
      assert.strictEqual(vDersler.status, 200);

      // Can view PROJELER -> 200 OK
      const vProjeler = await request(app)
        .get(`/api/records/PROJELER?departmentId=${cengDept._id}&period=2025-2026`)
        .set('Authorization', `Bearer ${wToken}`);
      assert.strictEqual(vProjeler.status, 200);

      // Cannot create in DERSLER -> 403 Forbidden
      const cDersler = await request(app)
        .post('/api/records/DERSLER')
        .set('Authorization', `Bearer ${wToken}`)
        .send({
          departmentId: cengDept._id,
          period: '2025-2026',
          rows: [{ data: { ders_kodu: 'W-01', ders_adi: 'Wildcard Post' } }]
        });
      assert.strictEqual(cDersler.status, 403);

      await User.findByIdAndDelete(wildcardUser._id);
    });
  });
});
