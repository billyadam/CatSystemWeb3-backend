const path = require('path');
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const usersRouter = require('./routes/users');
const catsRouter = require('./routes/cats');
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');
const { findByWallet } = require('./repositories/userRepository');
const { findByWallet: findAdminByWallet } = require('./repositories/adminRepository');

const app = express();


const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3005'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('/', cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/upload', uploadRouter);
app.use('/users', usersRouter);
app.use('/cats', catsRouter);

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findByWallet(req.user.wallet);
    res.json({ id: req.user.sub, wallet: req.user.wallet, user_data: user });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/admin/me', adminMiddleware, async (req, res) => {
  try {
    const admin = await findAdminByWallet(req.user.wallet);
    res.json({ wallet: req.user.wallet, admin_data: admin });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = app;
