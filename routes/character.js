const express = require('express');
const { createCharacter, getCharacter, updateCharacter } = require('../controllers/character');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createCharacter)
  .get(protect, getCharacter)
  .put(protect, updateCharacter);

module.exports = router; 