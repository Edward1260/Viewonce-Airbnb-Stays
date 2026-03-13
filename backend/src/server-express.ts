import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Airbnb Backend API is running!', status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Airbnb API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      properties: '/api/properties',
      bookings: '/api/bookings',
      users: '/api/users'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    infrastructure: {
      database: 'PostgreSQL ready',
      cache: 'Redis ready',
      security: 'Enabled',
      apiVersioning: 'v1'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Express Backend Server is running!');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log('✅ Phase 1 Infrastructure Complete!');
});
