require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const seedDepartments = require('./seedDepartments');
const seedUsers = require('./seedUsers');
const seedPeriods = require('./seedPeriods');
const seedTemplates = require('./seedTemplates');
const { saveSnapshotNow } = require('../services/dbPersistenceService');

const runAllSeeds = async () => {
  console.log('====================================================');
  console.log('🚀 Starting OSTİM Strateji Portal Database Seeding');
  console.log('====================================================');

  let mongod = null;
  try {
    try {
      await connectDB();
    } catch (dbErr) {
      // If local MongoDB is not running, fall back to MongoMemoryServer for standalone execution
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        console.log('ℹ️ Local MongoDB daemon not reachable, initializing MongoMemoryServer for seed execution...');
        mongod = await MongoMemoryServer.create();
        await connectDB(mongod.getUri());
      } catch (memErr) {
        throw dbErr;
      }
    }

    await seedDepartments();
    await seedUsers();
    await seedPeriods();
    await seedTemplates();
    await saveSnapshotNow();

    console.log('====================================================');
    console.log('🎉 All Database Seeds Completed Successfully!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  }
};

if (require.main === module) {
  runAllSeeds().then(() => {
    process.exit(process.exitCode || 0);
  });
}

module.exports = runAllSeeds;
