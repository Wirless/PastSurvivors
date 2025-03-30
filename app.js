const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');
const inventoryRoutes = require('./routes/inventory');

// Import middleware
const { protect } = require('./middleware/auth');
const { checkCharacterCreated, checkCharacterNotCreated } = require('./middleware/character');
const ejsLayoutMiddleware = require('./middleware/ejsLayout');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET || 'postapo-survival-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayoutMiddleware);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/inventory', inventoryRoutes);

// Public Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Postapo Survival - Post-Apocalyptic Game' });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - Postapo Survival' });
});

app.get('/register', (req, res) => {
  res.render('register', { title: 'Register - Postapo Survival' });
});

// Protected Routes
app.get('/character/create', protect, checkCharacterNotCreated, (req, res) => {
  res.render('character-creation', { title: 'Create Your Survivor - Postapo Survival' });
});

app.get('/dashboard', protect, checkCharacterCreated, (req, res) => {
  res.render('dashboard', { title: 'Dashboard - Postapo Survival', user: req.user });
});

app.get('/inventory', protect, checkCharacterCreated, (req, res) => {
  res.render('inventory', { title: 'Inventory - Postapo Survival', user: req.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error', 
    message: 'Something went wrong!' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.' 
  });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 