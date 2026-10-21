const User = require('../models/User');
const Department = require('../models/Department');

const seedUsers = async () => {
  console.log('🌱 Seeding production user accounts and RBAC matrix...');

  const rektorluk = await Department.findOne({ code: 'REKTORLUK' });
  const muhFak = await Department.findOne({ code: 'MUH_FAK' });
  const ceng = await Department.findOne({ code: 'BILGISAYAR_MUH' });
  const seng = await Department.findOne({ code: 'YAZILIM_MUH' });
  const strategy = await Department.findOne({ code: 'STRATEJI_GELISTIRME' });

  const defaultMatrix = [
    {
      templateCode: '*',
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canImport: true,
      canExport: true,
      canApprove: false
    }
  ];

  const adminMatrix = [
    {
      templateCode: '*',
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canImport: true,
      canExport: true,
      canApprove: true
    }
  ];

  const reviewerMatrix = [
    {
      templateCode: '*',
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canImport: false,
      canExport: true,
      canApprove: true
    }
  ];

  const users = [
    {
      name: 'Sistem Yöneticisi',
      email: 'admin@ostimteknik.edu.tr',
      password: 'Admin123!',
      role: 'ADMIN',
      departmentId: rektorluk?._id || null,
      departmentScope: { type: 'ALL', departments: [] },
      tablePermissions: adminMatrix
    },
    {
      name: 'Mühendislik Fakültesi Dekanı',
      email: 'dekan.muhendislik@ostimteknik.edu.tr',
      password: 'Dekan123!',
      role: 'REVIEWER',
      departmentId: muhFak?._id,
      departmentScope: { type: 'OWN_DEPT', departments: [] }, // Inherits all engineering depts via tree expansion
      tablePermissions: reviewerMatrix
    },
    {
      name: 'Bilgisayar Mühendisliği Sorumlusu',
      email: 'ceng@ostimteknik.edu.tr',
      password: 'Ceng123!',
      role: 'DEPT_USER',
      departmentId: ceng?._id,
      departmentScope: { type: 'OWN_DEPT', departments: [] },
      tablePermissions: defaultMatrix
    },
    {
      name: 'Yazılım Mühendisliği Sorumlusu',
      email: 'seng@ostimteknik.edu.tr',
      password: 'Seng123!',
      role: 'DEPT_USER',
      departmentId: seng?._id,
      departmentScope: { type: 'OWN_DEPT', departments: [] },
      tablePermissions: defaultMatrix
    },
    {
      name: 'Mühendislik Koordinatörü',
      email: 'muhendislik.koordinator@ostimteknik.edu.tr',
      password: 'Koord123!',
      role: 'DEPT_USER',
      departmentId: ceng?._id,
      departmentScope: {
        type: 'CUSTOM',
        departments: seng ? [seng._id] : []
      },
      tablePermissions: defaultMatrix
    },
    {
      name: 'Strateji Geliştirme Daire Başkanlığı',
      email: 'strateji@ostimteknik.edu.tr',
      password: 'Strateji123!',
      role: 'REVIEWER',
      departmentId: strategy?._id,
      departmentScope: { type: 'ALL', departments: [] },
      tablePermissions: reviewerMatrix
    }
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create(u);
      console.log(`  + User created: ${u.email} (${u.role})`);
    } else {
      // Update fields while preserving or updating password
      existing.name = u.name;
      existing.role = u.role;
      existing.departmentId = u.departmentId;
      existing.departmentScope = u.departmentScope;
      existing.tablePermissions = u.tablePermissions;
      existing.password = u.password;
      await existing.save();
      console.log(`  ~ User refreshed: ${u.email}`);
    }
  }

  console.log('✅ Users seeded successfully.');
};

module.exports = seedUsers;
