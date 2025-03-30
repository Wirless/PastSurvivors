const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Admin dashboard
router.get('/dashboard', protect, authorize('admin'), (req, res) => {
  res.render('admin/dashboard', { title: 'Admin Dashboard - Postapo Survival' });
});

// Monster management
router.get('/monsters', protect, authorize('admin'), (req, res) => {
  res.render('admin/monsters', { title: 'Monster Management - Postapo Survival' });
});

// Item management
router.get('/items', protect, authorize('admin'), (req, res) => {
  res.render('admin/items', { title: 'Item Management - Postapo Survival' });
});

// Location management
router.get('/locations', protect, authorize('admin'), (req, res) => {
  res.render('admin/locations', { title: 'Location Management - Postapo Survival' });
});

module.exports = router; 