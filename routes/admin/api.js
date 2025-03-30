const express = require('express');
const { protect, authorize } = require('../../middleware/auth');
const {
  getAdminStats,
  reloadCache,
  grantAdminPrivileges,
  getLocations,
  updateLocation,
  getItems,
  updateItems,
  getMonsters,
  updateMonsters
} = require('../../controllers/admin');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Admin api routes
router.get('/stats', getAdminStats);
router.post('/reload-cache', reloadCache);
router.post('/grant-admin', grantAdminPrivileges);

// Locations management
router.get('/locations', getLocations);
router.post('/locations/update', updateLocation);

// Items management 
router.get('/items', getItems);
router.post('/items/update', updateItems);

// Monsters management
router.get('/monsters', getMonsters);
router.post('/monsters/update', updateMonsters);

module.exports = router; 