const express = require('express');
const { protect, authorize } = require('../../middleware/auth');
const {
  getAdminStats,
  reloadCache,
  grantAdminPrivileges
} = require('../../controllers/admin');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Admin api routes
router.get('/stats', getAdminStats);
router.post('/reload-cache', reloadCache);
router.post('/grant-admin', grantAdminPrivileges);

module.exports = router; 