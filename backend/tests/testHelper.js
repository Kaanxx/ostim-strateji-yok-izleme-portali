process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const seedDepartments = require('../seeds/seedDepartments');
const seedUsers = require('../seeds/seedUsers');
const seedPeriods = require('../seeds/seedPeriods');

let mongod = null;

const setupTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);

  // Run full seeds
  await seedDepartments();
  await seedUsers();
  await seedPeriods();

  return uri;
};

const teardownTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
};

const clearCollection = async (collectionName) => {
  const coll = mongoose.connection.collections[collectionName];
  if (coll) {
    await coll.deleteMany({});
  }
};

module.exports = {
  app,
  setupTestDB,
  teardownTestDB,
  clearCollection
};
