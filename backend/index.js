const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const config = require('./config');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const auditLoggerMiddleware = require('./middleware/auditLogger');

// Modular Routers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const templateRoutes = require('./routes/templateRoutes');
const recordRoutes = require('./routes/recordRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const periodRoutes = require('./routes/periodRoutes');
const auditRoutes = require('./routes/auditRoutes');
const excelRoutes = require('./routes/excelRoutes');

// Controllers for backward compatibility
const authController = require('./controllers/authController');
const TableRecord = require('./models/TableRecord');
const Department = require('./models/Department');

const app = express();

// 1. Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// 2. CORS Configuration (Fixing prototype restriction to allow Authorization headers and all REST methods)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin) || config.allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-reporting-period']
}));

// 3. Body Parsing & Logging
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4. Attach Non-blocking Audit Logging helper to req
app.use(auditLoggerMiddleware);

// 5. Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version
  });
});

// 6. Production REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/excel', excelRoutes);

// 7. Backward Compatibility Endpoints for Prototype Frontend
app.post('/login', authController.login);

app.get('/api/alanlar', async (req, res) => {
  try {
    const { tablo } = req.query;
    if (!tablo) return res.status(400).json({ message: 'Tablo ismi gerekli' });

    const records = await TableRecord.find({ templateCode: tablo.toUpperCase().trim() })
      .sort({ rowNumber: 1, createdAt: -1 });

    const formatted = records.map(r => r.data || r);
    res.json(formatted);
  } catch (err) {
    console.error('Veri çekme hatası:', err);
    res.status(500).json({ message: 'Veritabanından veri çekilemedi' });
  }
});

app.post('/api/alanlar/toplu', async (req, res) => {
  try {
    const { tablo_adi, veriler, kayitYapan } = req.body;
    if (!tablo_adi) return res.status(400).json({ message: 'tablo_adi gereklidir' });

    let defaultDept = await Department.findOne({ code: 'REKTORLUK' });
    if (!defaultDept) {
      defaultDept = await Department.findOne({});
    }

    const tCode = tablo_adi.toUpperCase().trim();
    const period = '2025-2026';

    const saved = [];
    if (Array.isArray(veriler)) {
      for (let i = 0; i < veriler.length; i++) {
        const item = veriler[i];
        const row = await TableRecord.create({
          templateCode: tCode,
          departmentId: defaultDept ? defaultDept._id : null,
          period,
          rowNumber: i + 1,
          data: item
        });
        saved.push(row);
      }
    }

    res.status(200).json({ message: 'Başarıyla kaydedildi', count: saved.length });
  } catch (err) {
    console.error('Kaydetme hatası:', err);
    res.status(500).json({ message: 'Veri kaydedilemedi', error: err.message });
  }
});

// 8. Optional Static Frontend Build Serving (when running standalone outside Nginx)
const path = require('path');
const fs = require('fs');
const frontendBuildDir = path.resolve(__dirname, '../frontend/build');
if (fs.existsSync(path.join(frontendBuildDir, 'index.html'))) {
  app.use(express.static(frontendBuildDir));
  app.get(/^(?!\/(api|health|login)).*$/, (req, res) => {
    res.sendFile(path.join(frontendBuildDir, 'index.html'));
  });
}

// 9. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Kaynak bulunamadı: ${req.method} ${req.originalUrl}`
  });
});

// 9. Error Handler
app.use(errorHandler);

// 10. Startup Lifecycle
const PORT = config.port;

if (process.env.NODE_ENV !== 'test') {
  const seedDepartments = require('./seeds/seedDepartments');
  const seedUsers = require('./seeds/seedUsers');
  const seedPeriods = require('./seeds/seedPeriods');
  const seedTemplates = require('./seeds/seedTemplates');
  const { restoreSnapshotIfAvailable, saveSnapshotNow } = require('./services/dbPersistenceService');

  connectDB().then(async () => {
    try {
      const restored = await restoreSnapshotIfAvailable();
      if (!restored) {
        await seedDepartments();
        await seedUsers();
        await seedPeriods();
        await seedTemplates();
        await saveSnapshotNow();
      }
    } catch (seedErr) {
      console.error('Warning: Automatic startup seeding encountered an error:', seedErr);
    }

    app.listen(PORT, () => {
      console.log(`================================================`);
      console.log(`🚀 OSTİM Strateji Portal Backend Engine`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔒 Mode: ${config.nodeEnv}`);
      console.log(`================================================`);
    });
  }).catch(err => {
    console.error('Fatal: Failed to connect to MongoDB on startup:', err);
  });
}

module.exports = app;
