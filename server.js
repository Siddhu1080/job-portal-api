require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Startup validation
const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
  process.exit(1);
}
if (/[<>]/.test(process.env.MONGODB_URI)) {
  console.error('MONGODB_URI still contains placeholders (<db_user>, <db_password>, <cluster-host>). Replace them with your Atlas values.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Job Portal API running on http://localhost:${PORT}`));
});
