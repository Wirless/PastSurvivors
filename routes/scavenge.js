const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { checkCharacterCreated } = require('../middleware/character');
const { 
  getScavengeLocations, 
  startScavenge, 
  endScavenge, 
  getScavengeStatus,
  triggerCombatRound,
  forceEncounter
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

// Manually trigger a combat round
router.post('/combat-round', triggerCombatRound);

// Add the force combat route to the scavenge routes
router.post('/force-combat/:monsterId', forceEncounter);

module.exports = router; 