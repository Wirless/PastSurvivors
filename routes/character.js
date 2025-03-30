const express = require('express');
const { protect } = require('../middleware/auth');
const { createCharacter, getCharacter, updateCharacterEnergy } = require('../controllers/character');

const router = express.Router();

// Protected routes
router.post('/create', protect, createCharacter);
router.get('/', protect, getCharacter);
router.post('/updateEnergy', protect, updateCharacterEnergy);

module.exports = router; 