/**
 * seedTemplates.js
 * 
 * Master seeder for all 24 official YÖK monitoring templates
 * and prototype institutional categories (UAM, Action Plans, Valilik, TİKA, Export).
 */

const Template = require('../models/Template');
const fixedTemplates = require('./templates/fixedTemplates');
const dynamicTemplates = require('./templates/dynamicTemplates');
const institutionalTemplates = require('./templates/institutionalTemplates');

const seedTemplates = async () => {
  console.log('🌱 Seeding 24 Official YÖK Templates & Institutional Categories...');

  const allTemplates = [
    ...fixedTemplates,
    ...dynamicTemplates,
    ...institutionalTemplates
  ];

  let insertedCount = 0;
  let updatedCount = 0;

  for (const tpl of allTemplates) {
    const existing = await Template.findOne({ code: tpl.code });
    await Template.findOneAndUpdate(
      { code: tpl.code },
      { $set: tpl },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    if (existing) {
      updatedCount++;
    } else {
      insertedCount++;
    }
  }

  console.log(`✅ Templates seeded successfully: ${allTemplates.length} total (${insertedCount} created, ${updatedCount} updated).`);
  console.log(`   - Official YÖK Templates: ${fixedTemplates.length + dynamicTemplates.length} (6 Fixed, 18 Dynamic)`);
  console.log(`   - Institutional Templates: ${institutionalTemplates.length} across 5 categories`);
};

module.exports = seedTemplates;
