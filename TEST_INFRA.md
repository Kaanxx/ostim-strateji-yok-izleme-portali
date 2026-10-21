# E2E Test Infra: OSTİM Teknik Üniversitesi Strateji ve YÖK İzleme Portalı

## Test Philosophy
- **Opaque-box & Requirement-driven**: Tests derive strictly from user requirements and acceptance criteria in `ORIGINAL_REQUEST.md`, independent of backend/frontend implementation design.
- **Methodology**: 4-Tier verification incorporating Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Realistic Academic Workload Scenarios.
- **Pass/Fail Semantics**: 100% pass rate with exit code 0 required across all test suites before final sign-off.

## Feature Inventory Test Coverage Matrix

| # | Feature / Subsystem | Primary Verification Criteria | Tier 1 (Count) | Tier 2 (Count) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------------------|-------------------------------|:--------------:|:--------------:|:-----------------:|:-----------------:|
| 1 | 24 YÖK Template Discovery | Exact columns, types, mandatory flags, dropdown arrays from source | ≥ 24 | ≥ 10 | ✓ | ✓ |
| 2 | Fixed-Row Matrices | 6 fixed templates init with exact row counts (28, 34, 6, 6, 22, 106) | ≥ 6 | ≥ 6 | ✓ | ✓ |
| 3 | Formula Calculations | Live exact calculations (Enerji sums, Finans cash diff, Karbon footprint, Memnuniyet norm, Projeler budget check, SoruSeti >89) | ≥ 10 | ≥ 10 | ✓ | ✓ |
| 4 | Macro Multi-Select | Comma-delimited list without duplicates, clear, tag removal | ≥ 5 | ≥ 5 | ✓ | ✓ |
| 5 | Hierarchical RBAC & Scoping | Bilgisayar Müh user blocked from unauthorized, sees own, sees Yazılım Müh when granted | ≥ 6 | ≥ 6 | ✓ | ✓ |
| 6 | Workflow Approvals | DRAFT -> SUBMITTED -> REVISION_REQUESTED -> SUBMITTED -> APPROVED state machine | ≥ 6 | ≥ 6 | ✓ | ✓ |
| 7 | Dynamic Template Builder | Admin creates custom table/columns, user submits data | ≥ 5 | ≥ 5 | ✓ | ✓ |
| 8 | 1:1 Excel/XLSM Export | Exact ZIP/OOXML workbook, preserves sheets, formulas, and xl/vbaProject.bin | ≥ 6 | ≥ 6 | ✓ | ✓ |
| 9 | Validated Excel Import | Flags invalid cells (out-of-range, wrong dropdown, case error), imports valid rows | ≥ 6 | ≥ 6 | ✓ | ✓ |
| 10| Docker Compose & Health | MongoDB, Backend, and Frontend containers run healthy and respond | ≥ 4 | ≥ 4 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Node.js standalone test runner (`node tests/runner.js` or `npm test`).
- **Location**: `c:\Users\Leno\Desktop\ZNDV\tests\`.
- **Format**:
  - `tier1_features.test.js`: Feature coverage across all 24 templates, formulas, authentication, and CRUD.
  - `tier2_boundaries.test.js`: Boundary values, empty inputs, negative balances on row 32, 226 vs 223 countries, KVKK 1-2 disabled members, invalid dates, out-of-range survey responses.
  - `tier3_pairwise.test.js`: Combinations of role x department scope x table type x workflow state.
  - `tier4_realworld.test.js`: End-to-end academic submission scenario from raw data input to workflow approval, 1:1 XLSM export, and YÖKSİS validation.

## Real-World Application Scenarios (Tier 4)
1. **Academic Department Full Cycle**: *Bilgisayar Mühendisliği* enters `Dersler`, `Projeler`, and `MYOUygulamaliEgitim`, submits for approval, Dean requests revision with comment, department updates, resubmits, Dean approves, data locks against further edits.
2. **Institutional Financial Audit**: *Strateji Geliştirme Daire Başkanlığı* inputs all 34 rows in `Finans`, validates auto-calculated `Toplam Gelir` and `Toplam Gider`, tests cash-difference warning when income != expenses, balances the books, exports 1:1 Excel.
3. **Campus Sustainability & Footprint Audit**: *Genel Sekreterlik* inputs energy consumption and fleet fuel logs in `Enerji` and `KarbonAyakizi`, verifies live formula calculation against official YÖK emission factors, exports populated templates.
4. **Digital Maturity Institutional Assessment**: University Quality Commission completes all 106 survey questions across 5 dimensions in `DijitalOlgunlukAnketi`, verifies dimension guidance and dropdown role selections.
5. **Bidirectional Excel Roundtrip**: Export authentic `.xlsm` with populated student data, modify rows in Excel, re-import with strict validation engine, ensuring zero corruption of VBA macros or reference sheets.

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥ 75 test cases.
- **Tier 2 (Boundary & Corner Cases)**: ≥ 60 test cases.
- **Tier 3 (Cross-Feature Combinations)**: ≥ 25 test cases.
- **Tier 4 (Real-World Application Scenarios)**: ≥ 5 comprehensive scenarios.
- **Total Minimum**: ≥ 165 test cases.
