const Period = require('../models/Period');

const seedPeriods = async () => {
  console.log('🌱 Seeding reporting periods...');

  const periods = [
    {
      name: '2024-2025',
      code: '2024-2025',
      startDate: new Date('2024-09-01T00:00:00.000Z'),
      endDate: new Date('2025-08-31T23:59:59.000Z'),
      defaultDeadline: new Date('2025-06-30T23:59:59.000Z'),
      isActive: false,
      isArchived: true,
      description: '2024-2025 Akademik Yılı Veri İzleme Dönemi (Arşivlenmiş)'
    },
    {
      name: '2025-2026',
      code: '2025-2026',
      startDate: new Date('2025-09-01T00:00:00.000Z'),
      endDate: new Date('2027-08-31T23:59:59.000Z'),
      defaultDeadline: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
      isArchived: false,
      description: '2025-2026 Akademik Yılı Veri İzleme ve Değerlendirme Dönemi (Aktif)'
    }
  ];

  for (const p of periods) {
    const existing = await Period.findOne({ name: p.name });
    if (!existing) {
      await Period.create(p);
      console.log(`  + Period created: ${p.name} (Active: ${p.isActive})`);
    } else {
      existing.startDate = p.startDate;
      existing.endDate = p.endDate;
      existing.defaultDeadline = p.defaultDeadline;
      existing.isActive = p.isActive;
      existing.isArchived = p.isArchived;
      await existing.save();
      console.log(`  ~ Period refreshed: ${p.name}`);
    }
  }

  console.log('✅ Periods seeded successfully.');
};

module.exports = seedPeriods;
