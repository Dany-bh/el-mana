import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';
import { setupOrderSockets } from './sockets/orderHandlers.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

// Auth Middleware for Sockets
io.use((socket, next) => {
  const { role, userId } = socket.handshake.auth;
  if (!role || !userId) {
    return next(new Error("Authentication error"));
  }
  socket.userId = userId;
  socket.role = role;
  next();
});

io.on('connection', (socket) => {
  console.log(`[+] User connected: ${socket.role} (${socket.userId})`);

  if (socket.role === 'COCINA') {
    socket.join('room_kitchen');
  } else if (socket.role === 'MOZO') {
    socket.join(`room_waiter_${socket.userId}`);
  }

  // Setup Order Handlers
  setupOrderSockets(io, socket);

  socket.on('disconnect', () => {
    console.log(`[-] User disconnected: ${socket.userId}`);
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal en el servidor'
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
