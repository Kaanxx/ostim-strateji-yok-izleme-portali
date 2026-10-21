const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('./index');

let isConnected = false;
let embeddedMongod = null;

const connectDB = async (customUri = null) => {
  const uri = customUri || config.mongoUri;
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    isConnected = true;
    console.log(`✅ MongoDB Bağlantısı Başarılı: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    // If no customUri was passed and local MongoDB is unreachable, fall back to embedded MongoMemoryServer
    if (!customUri && (uri.includes('localhost') || uri.includes('127.0.0.1'))) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const dbPath = path.resolve(__dirname, '../.data/mongodb');
        fs.mkdirSync(dbPath, { recursive: true });
        console.log('ℹ️ Yerel MongoDB servisi çalışmıyor; gömülü MongoDB sunucusu başlatılıyor...');
        embeddedMongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'ostim_strateji_db',
            dbPath,
            storageEngine: 'wiredTiger'
          }
        }).catch(async () => {
          return await MongoMemoryServer.create({
            instance: { dbName: 'ostim_strateji_db' }
          });
        });
        const fallbackUri = embeddedMongod.getUri('ostim_strateji_db');
        const conn = await mongoose.connect(fallbackUri, {
          maxPoolSize: 20,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000
        });
        isConnected = true;
        console.log(`✅ Gömülü MongoDB Bağlantısı Başarılı: ${fallbackUri}`);
        return conn;
      } catch (fallbackErr) {
        console.error('❌ MongoDB Bağlantı Hatası:', err.message);
        throw err;
      }
    }
    console.error('❌ MongoDB Bağlantı Hatası:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (embeddedMongod) {
    await embeddedMongod.stop();
    embeddedMongod = null;
  }
};

const isUsingEmbeddedFallback = () => Boolean(embeddedMongod);

module.exports = { connectDB, disconnectDB, isUsingEmbeddedFallback };
