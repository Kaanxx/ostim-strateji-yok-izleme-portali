# Project: OSTİM Teknik Üniversitesi Veri İzleme ve Değerlendirme Birimi - Strateji Portal

## Overview
A production-grade, Dockerized institutional data tracking and YÖK monitoring portal for OSTİM Technical University. It provides complete web interfaces, validation engines, fixed-row matrices, live formula engines, and VBA macro equivalents for all 24 official YÖK Excel/XLSM monitoring templates, a dynamic template builder for System Admins, hierarchical department scoping, granular RBAC, multi-state workflow approvals, 1:1 bidirectional Excel/XLSM import/export (preserving original templates, formulas, and VBA binaries), and turnkey Docker Compose packaging.

---

## Architecture

### Backend Architecture
- **Runtime**: Node.js (LTS), Express 5.x.
- **Database**: MongoDB via Mongoose 9.x.
- **Security**: JWT authentication (`jsonwebtoken`), password hashing (`bcryptjs`), CORS configured for frontend origin with Authorization headers, Helmet security headers.
- **Organization Hierarchy**: Tree model (`Rectorate` -> `Faculties / MYO / Institutes / Administrative Units / Research Centers` -> `Departments / Programs`).
- **Authorization**:
  - Two orthogonal layers: Table Permissions Matrix (`canView`, `canCreate`, `canUpdate`, `canDelete`, `canImport`, `canExport`, `canApprove`) AND Department Visibility Scope (`OWN_DEPT`, list of specific department IDs, or `ALL`).
- **Approval Workflow State Machine**: `DRAFT` -> `SUBMITTED` -> `APPROVED` | `REVISION_REQUESTED` with reviewer comments, audit logs, and deadline locking.
- **Excel Processing Engine**:
  - `exceljs` / `adm-zip` for 1:1 template re-population: loads the authentic `.xlsx` or `.xlsm` file from template storage, injects table rows starting at the specified data start row, preserves all existing header rows, merged cells, formulas, secondary sheets (`Referans Değerler`, `listeler`), and preserves `xl/vbaProject.bin` byte-for-byte in `.xlsm` workbooks.
  - Streaming validation parser for uploaded `.xlsx`/`.xlsm` workbooks validating data types, mandatory flags, case-sensitive dropdown values, numeric bounds, and regex formats.
- **Audit Logging**: Comprehensive logging for every record creation, edit, deletion, workflow transition, import, export, and permission modification.

### Frontend Architecture
- **Framework**: React 18 with modern component architecture and Tailwind CSS for styling.
- **Branding**: Official OSTİM Teknik Üniversitesi branding (`frontend/src/assets/otun-logo.png`), color palette (OSTİM blue/gold/slate), responsive layout with mobile drawer.
- **Navigation Tree**: Complete hierarchy including all 24 YÖK monitoring templates grouped logically, plus the institutional categories from prototype (Research Centers, Action Plans, Ankara Valiliği Briefings, TİKA, etc.).
- **Interactive Data Entry**:
  - 6 Fixed-Row Matrix & Survey Views:
    - `Enerji`: 28 fixed rows, auto-sum Toplam, auto-sum Toplam2, equality check warning.
    - `Finans`: 34 fixed rows, Toplam Gelir, Toplam Gider, negative balance on row 32, cash difference check.
    - `KarbonAyakizi`: 6 fixed unit rows, live carbon emission calculator.
    - `Atik`: 6 fixed unit rows, 5 waste + 5 recycling decimal columns.
    - `SoruSeti`: 22 fixed questions, integer bounds, live dynamic note on rows 9 & 10 (>89 -> explanation warning), dedicated `Açıklama` tab.
    - `DijitalOlgunlukAnketi`: All 106 survey questions across 5 dimensions, guidance panels, 4 reference dropdown lookups.
  - 18 Dynamic-Row Views: Full grid with pagination, search, column sorting, typed inputs, date pickers, single-select dropdowns from reference dictionaries.
  - VBA Macro Equivalent Multi-Select Tag Selectors: For `MYOUygulamaliEgitim` (cols W, AI) and `Projeler` (cols F, G) with searchable dropdown, tag badges, single-click removal, and comma-separated storage.
  - Live In-Browser Formula Engine: Instant reactive recalculation on input changes matching backend engine.
- **Admin UI**:
  - Dynamic Template & Table Builder: Create/edit templates, add columns, specify validation types, import schema from sample Excel.
  - User & Role Management: Assign department, department scope, and table permission matrix.
  - Workflow Management: Period manager, deadline manager, review/approval console with feedback notes.
  - Audit Log Viewer: Filterable log table.
- **Import/Export Modals**: 1:1 original template export button, standard clean export button, drag-and-drop Excel file upload with live validation error table.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Case-Sensitivity & Base Server Architecture | Fix Linux case-sensitivity bug (`Tablo` vs `tablo.js`), modular routes, controllers, middleware | M1 | Prototype Survey |
| 2 | Hierarchical Organization & Department Engine | University tree structure (Rectorate, Faculties, MYO, Institutes, Departments) | M1 | R3, Prototype Survey |
| 3 | User Authentication & Secure JWT | JWT token issuance, verification, password hashing, user registration & login | M1 | R3, Prototype Survey |
| 4 | Granular RBAC & Orthogonal Permission Engine | Table Permission Matrix + Department Scope (`OWN_DEPT`, specific list, `ALL`) | M1 | R3, Acceptance Criteria 2 |
| 5 | Dynamic Template & Table Builder Backend | Admin API to dynamically create/update custom templates, columns, validations | M1 | R2, Acceptance Criteria 2 |
| 6 | Reporting Periods & Deadline Management | Period selection (`2024-2025`, `2025-2026`, etc.) and per-table submission deadlines | M1 | R4 |
| 7 | Multi-State Approval Workflow Engine | `DRAFT` -> `SUBMITTED` -> `APPROVED` / `REVISION_REQUESTED` state machine & locking | M1 | R4, Acceptance Criteria 2 |
| 8 | Comprehensive Audit Logging | Audit trail for all CRUD operations, approvals, imports, exports, permission edits | M1 | R3 |
| 9 | 24 YÖK Template Database Schemas & Seeder | Seeding all 24 official YÖK templates with exact column definitions, types, options | M2 | R1, Spec Mining Survey |
| 10 | Fixed-Row Matrix Templates Engine | 6 fixed-row matrices (`Enerji`, `Finans`, `KarbonAyakizi`, `Atik`, `SoruSeti`, `DijitalOlgunlukAnketi`) | M2 | R1, Spec Mining Survey |
| 11 | Live Calculation & Validation Formulas Engine | Exact formulas for Enerji, Finans, KarbonAyakizi, Memnuniyet, Projeler, SoruSeti | M2 | R1, Acceptance Criteria 1 |
| 12 | VBA Macro Equivalents & Custom Rules | Comma-delimited multi-select (MYOUygulamaliEgitim, Projeler), KVKK rule, duration regex | M2 | R1, Spec Mining Survey |
| 13 | 1:1 Bidirectional Excel/XLSM Export Engine | Populate original `.xlsx`/`.xlsm` templates preserving headers, formulas, VBA binaries | M2 | R5, Acceptance Criteria 3 |
| 14 | Validated Excel Import Engine | Upload `.xlsx`/`.xlsm`, validate rows against template rules, generate error report, import | M2 | R5, Acceptance Criteria 3 |
| 15 | Modern Frontend Shell & OSTİM Branding | Responsive layout, sidebar, OSTİM logo, user profile, department switcher | M3 | R1, Prototype Survey |
| 16 | Complete Navigation Tree with Institutional Categories | All 24 YÖK templates + Research Centers, Action Plans, Ankara Valiliği, TİKA | M3 | R1, Prototype Survey |
| 17 | Interactive Fixed-Row Matrix Web Views | Interactive UIs for Enerji, Finans, KarbonAyakizi, Atik, SoruSeti, DijitalOlgunluk | M3 | R1, Acceptance Criteria 1 |
| 18 | Interactive Dynamic-Row Grid Views | Grid view for 18 dynamic templates with pagination, filters, sorting, modals | M3 | R1, Acceptance Criteria 1 |
| 19 | Frontend Multi-Select Tag Selector Components | VBA Macro equivalent pill picker for MYOUygulamaliEgitim and Projeler | M3 | R1, Acceptance Criteria 1 |
| 20 | Frontend Reactive Formula & Check Engine | Real-time calculation of totals, differences, emissions, and budget alerts | M3 | R1, Acceptance Criteria 1 |
| 21 | Frontend Dynamic Template Builder UI | Admin UI to create custom tables, add typed columns, define dropdown options | M3 | R2, Acceptance Criteria 2 |
| 22 | Frontend Admin Management & Audit Log Console | User management, permission matrix editor, department scope assigner, audit viewer | M3 | R3, Acceptance Criteria 2 |
| 23 | Frontend Workflow Controls & Feedback Notes | Status banners, Submit button, Reviewer Approve/Reject modal with feedback notes | M3 | R4, Acceptance Criteria 2 |
| 24 | Frontend 1:1 Export & Validated Import UI | Download official template button, upload dropzone, live validation preview table | M3 | R5, Acceptance Criteria 3 |
| 25 | Backend Production Containerization (Dockerfile) | Multi-stage Node.js container with dependency caching, non-root user | M4 | R6, Acceptance Criteria 4 |
| 26 | Frontend Production Containerization (Dockerfile) | Multi-stage build (Node build + Nginx production server or Node server) | M4 | R6, Acceptance Criteria 4 |
| 27 | Central Database Seeding on Container Startup | Automatic initialization of admin, test users, departments, and 24 YÖK templates | M4 | R6, Acceptance Criteria 4 |
| 28 | Complete Docker Compose Architecture | `docker-compose.yml` linking mongodb, backend, and frontend with networks/healthchecks | M4 | R6, Acceptance Criteria 4 |
| 29 | Opaque-Box E2E Testing Suite (Tiers 1-4) | Comprehensive independent automated test runner verifying R1-R6 | Final | Acceptance Criteria 1-4 |
| 30 | Adversarial Coverage Hardening (Tier 5) | White-box edge case testing, fuzzing, and stress testing | Final | Acceptance Criteria 1-4 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M1 | Core Backend Engine, Security & RBAC | Features 1, 2, 3, 4, 5, 6, 7, 8 | none | PLANNED |
| M2 | YÖK Template Engine, Formulas & 1:1 Excel/XLSM | Features 9, 10, 11, 12, 13, 14 | M1 | PLANNED |
| M3 | Frontend Interactive Portal & User Experience | Features 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 | M1, M2 | PLANNED |
| M4 | Docker Compose Packaging & System Integration | Features 25, 26, 27, 28 | M1, M2, M3 | PLANNED |
| Final | E2E Testing Track Pass (Tiers 1-4) & Adversarial Hardening (Tier 5) | Features 29, 30 | M4, TEST_READY | PLANNED |

---

## Code Layout

```
c:\Users\Leno\Desktop\ZNDV\
├── 2025-2026 yök izleme şablonlar/        # Authoritative official YÖK .xlsx and .xlsm templates
├── backend/                               # Production Backend service
│   ├── config/                            # Database connection, JWT secrets, environment config
│   ├── models/                            # Mongoose schemas: User, Department, Template, TableRecord,
│   │                                      # WorkflowState, Period, AuditLog
│   ├── middleware/                        # auth.js (JWT), rbac.js (matrix & department scope), validate.js
│   ├── controllers/                       # authController, departmentController, templateController,
│   │                                      # recordController, workflowController, excelController,
│   │                                      # dynamicBuilderController, auditController
│   ├── routes/                            # Modular Express routers
│   ├── services/                          # excelTemplateService (1:1 export & import validation),
│   │                                      # formulaEngineService (calculation rules)
│   ├── seeds/                             # Automated database seeders (departments, users, 24 templates)
│   ├── tests/                             # Backend integration and unit tests
│   ├── index.js                           # Express app entry point
│   ├── package.json                       # Backend dependencies
│   └── Dockerfile                         # Production Backend Dockerfile
├── frontend/                              # Production Frontend service
│   ├── public/                            # Static assets, index.html
│   ├── src/
│   │   ├── assets/                        # otun-logo.png, icons, branding
│   │   ├── components/                    # Reusable UI: Header, Sidebar, Navbar, Modal,
│   │   │                                  # MultiSelectTagPicker, Dropdown, StatusBadge
│   │   ├── pages/                         # Dashboard, TableView, DynamicBuilder, AdminUsers,
│   │   │                                  # AdminPermissions, WorkflowManager, AuditLogs, Login
│   │   ├── services/                      # API client (Axios with JWT interceptors), excelService
│   │   ├── utils/                         # formulaEngine.js, validators.js, formatters.js
│   │   ├── App.js                         # Root layout, routing, notification toast provider
│   │   ├── index.js                       # React entry point
│   │   └── index.css                      # Tailwind CSS root styling
│   ├── package.json                       # Frontend dependencies
│   ├── tailwind.config.js                 # Tailwind design tokens
│   └── Dockerfile                         # Production Frontend Dockerfile
├── tests/                                 # E2E Independent Test Suite (Opaque-box)
│   ├── runner.js                          # Standalone Node test runner
│   ├── tier1_features.test.js             # Tier 1: Feature coverage
│   ├── tier2_boundaries.test.js           # Tier 2: Boundary & corner cases
│   ├── tier3_pairwise.test.js             # Tier 3: Cross-feature combinations
│   └── tier4_realworld.test.js            # Tier 4: Real-world academic scenarios
├── docker-compose.yml                     # Multi-container orchestration (mongodb, backend, frontend)
├── PROJECT.md                             # Global project specification and milestone tracker
└── TEST_INFRA.md                          # E2E Test infrastructure specification
```

---

## Interface Contracts

### 1. Authentication & Authorization API
- `POST /api/auth/login`
  - Request: `{ email: String, password: String }`
  - Response: `{ success: true, token: String, user: { id, name, email, role, departmentId, departmentScope, permissions } }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ user: UserObject }`

### 2. Department & Hierarchy API
- `GET /api/departments`
  - Response: `Array<Department>` (hierarchical tree: Rectorate -> Faculties -> Departments)
- `POST /api/departments` (Admin only)
  - Request: `{ name, code, type: 'RECTORATE'|'FACULTY'|'MYO'|'INSTITUTE'|'DEPARTMENT', parentId }`

### 3. Template & Schema API
- `GET /api/templates`
  - Response: `Array<TemplateSchema>` (All 24 seeded YÖK templates + custom templates)
- `GET /api/templates/:templateCode`
  - Response: `TemplateSchema` (columns, types, options, fixedRows, formulaRules, validationRules)
- `POST /api/templates` (Admin only - Dynamic Builder)
  - Request: `{ title, code, category, type: 'DYNAMIC'|'FIXED', columns: Array<ColumnDef>, fixedRows?: Array<RowDef> }`
- `POST /api/templates/extract-from-excel` (Admin only)
  - Multipart file upload -> extracts sheet names and column headers -> returns draft `TemplateSchema`.

### 4. Table Records & Data Mutation API
- `GET /api/records/:templateCode?departmentId=...&period=...`
  - Response: `{ records: Array<Record>, fixedRows?: Array<FixedRowData>, workflow: WorkflowStatus }`
- `POST /api/records/:templateCode`
  - Request: `{ departmentId, period, rows: Array<RecordData> }`
  - Middleware: Verifies `canCreate` or `canUpdate`, checks user's department scope, verifies table is not `APPROVED` and deadline has not passed.
- `DELETE /api/records/:templateCode/:recordId`
  - Middleware: Verifies `canDelete`, checks department scope and approval state.

### 5. Workflow Approval API
- `GET /api/workflow/:templateCode?departmentId=...&period=...`
  - Response: `{ state: 'DRAFT'|'SUBMITTED'|'APPROVED'|'REVISION_REQUESTED', deadline: Date, reviews: Array<{ reviewer, state, note, date }> }`
- `POST /api/workflow/:templateCode/submit`
  - Request: `{ departmentId, period }`
  - Transition: `DRAFT` | `REVISION_REQUESTED` -> `SUBMITTED`
- `POST /api/workflow/:templateCode/review`
  - Request: `{ departmentId, period, action: 'APPROVE'|'REVISE', note: String }`
  - Middleware: Verifies `canApprove`. Transition: `SUBMITTED` -> `APPROVED` | `REVISION_REQUESTED`.

### 6. Excel 1:1 Export & Validated Import API
- `GET /api/excel/export/:templateCode?departmentId=...&period=...&format=template|clean`
  - Middleware: Verifies `canExport` and department scope.
  - If `format=template`: streams binary `.xlsx` or `.xlsm` with data inserted at data start row into the authentic template, preserving original formulas, sheets, and VBA macros.
  - If `format=clean`: streams flat standard workbook.
- `POST /api/excel/import/:templateCode`
  - Request: Multipart form-data with file, `departmentId`, `period`, `commit: true|false`.
  - Response: `{ success: Boolean, totalRows: Number, validRows: Number, invalidRows: Number, errors: Array<{ row, column, field, value, message }>, importedCount?: Number }`

### 7. Audit Log API
- `GET /api/audit-logs?page=1&limit=50&templateCode=...&userId=...&action=...`
  - Admin only. Response: `{ logs: Array<AuditLog>, total: Number }`
