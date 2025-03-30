const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { checkCharacterCreated } = require('../middleware/character');
const { 
  getScavengeLocations, 
  startScavenge, 
  endScavenge, 
  getScavengeStatus
} = require('../controllers/scavenge');

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(checkCharacterCreated);

// Get all available scavenge locations
router.get('/locations', getScavengeLocations);

// Start scavenging at a location
router.post('/start/:locationId', startScavenge);

// End scavenging session
router.post('/end', endScavenge);

// Get current scavenge status
router.get('/status', getScavengeStatus);

module.exports = router; 