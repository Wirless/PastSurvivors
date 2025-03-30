const express = require('express');
const { register, login, logout, getMe, createAdminUser, checkAdminPassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.post('/create-admin', createAdminUser);
router.post('/check-admin-password', checkAdminPassword);

module.exports = router; 