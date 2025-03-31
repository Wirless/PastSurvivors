const fs = require('fs');
const path = require('path');
const asyncHandler = require('express-async-handler');
const Character = require('../models/Character');
const Item = require('../models/Item');

// @desc    Get all available scavenge locations
// @route   GET /api/scavenge/locations
// @access  Private
exports.getScavengeLocations = asyncHandler(async (req, res) => {
  try {
    // Read locations from JSON file
    const locationsPath = path.join(__dirname, '../public/js/scavenge_locations.json');
    const locationsData = fs.readFileSync(locationsPath, 'utf8');
    const locations = JSON.parse(locationsData);
    
    res.status(200).json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Error loading scavenge locations:', error);
    res.status(500).json({
      success: false,
      message: 'Could not load scavenge locations',
      error: error.message
    });
  }
});

// @desc    Start scavenging at a location
// @route   POST /api/scavenge/start/:locationId
// @access  Private
exports.startScavenge = asyncHandler(async (req, res) => {
  try {
    const { locationId } = req.params;
    
    // Read locations from JSON file
    const locationsPath = path.join(__dirname, '../public/js/scavenge_locations.json');
    const locationsData = fs.readFileSync(locationsPath, 'utf8');
    const locationsJson = JSON.parse(locationsData);
    
    // Find the selected location
    const location = locationsJson.locations.find(loc => loc.id === locationId);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Scavenge location not found'
      });
    }
    
    // Get character
    const character = await Character.findOne({ user: req.user.id });
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }
    
    // Check if character is in recovery mode
    if (character.isRecovering) {
      const recoveryEnds = new Date(character.recoveryUntil);
      const minutesLeft = Math.ceil((recoveryEnds - new Date()) / (1000 * 60));
      
      return res.status(400).json({
        success: false,
        message: `You are still recovering from injuries. Recovery ends in ${minutesLeft} minutes.`,
        recovery: {
          until: character.recoveryUntil,
          minutesLeft
        }
      });
    }
    
    // Check if character has enough energy
    if (character.energy.current < location.energy_cost) {
      return res.status(400).json({
        success: false,
        message: 'Not enough energy to scavenge this location'
      });
    }
    
    // Deduct energy cost
    character.energy.current -= location.energy_cost;
    await character.save();
    
    // Calculate initial event time (5-20 seconds from now)
    const startTime = Date.now();
    const initialEventDelay = Math.floor(Math.random() * 16) + 5; // 5-20 seconds
    
    // Start a scavenging session (store in session)
    req.session.scavenging = {
      locationId,
      startTime,
      logs: [{
        time: startTime,
        message: `You begin scavenging in ${location.name}...`
      }],
      loot: [],
      nextEventTime: Math.floor(initialEventDelay), // Next event time in seconds from start
      lastProcessedTime: 0,
      currentCombat: null,
      shouldEnd: false
    };
    
    // Log the initial event time
    console.log(`Started scavenging session, next event in ${initialEventDelay} seconds`);
    
    res.status(200).json({
      success: true,
      data: {
        message: `Started scavenging at ${location.name}`,
        location,
        nextEventIn: initialEventDelay,
        character: {
          energy: character.energy
        }
      }
    });
  } catch (error) {
    console.error('Error starting scavenge:', error);
    res.status(500).json({
      success: false,
      message: 'Could not start scavenging',
      error: error.message
    });
  }
});

// @desc    End scavenging session
// @route   POST /api/scavenge/end
// @access  Private
exports.endScavenge = asyncHandler(async (req, res) => {
  try {
    if (!req.session.scavenging) {
      return res.status(400).json({
        success: false,
        message: 'No active scavenging session'
      });
    }
    
    // Get character
    const character = await Character.findOne({ user: req.user.id });
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }
    
    // Add any collected items to inventory
    const itemsAdded = [];
    const itemsNotAdded = [];
    
    if (req.session.scavenging.loot && req.session.scavenging.loot.length > 0) {
      for (const lootItem of req.session.scavenging.loot) {
        // Find the item in the database
        const item = await Item.findOne({ itemId: lootItem.item_id });
        
        if (item) {
          // Check if item already exists in inventory
          const existingItemIndex = character.inventory.findIndex(
            invItem => invItem.item.toString() === item._id.toString()
          );
          
          if (existingItemIndex !== -1) {
            // Update existing item quantity
            character.inventory[existingItemIndex].quantity += lootItem.quantity || 1;
            
            itemsAdded.push({
              _id: item._id,
              name: item.name,
              quantity: lootItem.quantity || 1,
              image: item.image ? (item.image.startsWith('/images/items/') ? item.image : `/images/items/${item.image}`) : '/images/items/default-item.png'
            });
          } else {
            // Check if inventory has space
            if (character.inventory.length < character.inventorySize) {
              // Add new item to inventory
              character.inventory.push({
                item: item._id,
                quantity: lootItem.quantity || 1
              });
              
              itemsAdded.push({
                _id: item._id,
                name: item.name,
                quantity: lootItem.quantity || 1,
                image: item.image ? (item.image.startsWith('/images/items/') ? item.image : `/images/items/${item.image}`) : '/images/items/default-item.png'
              });
            } else {
              // Inventory is full
              itemsNotAdded.push({
                name: item.name,
                quantity: lootItem.quantity || 1
              });
              
              // Add to scavenging logs that inventory is full
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `You couldn't carry ${item.name} because your inventory is full.`
              });
            }
          }
        } else {
          console.warn(`Item with ID ${lootItem.item_id} not found in database when ending scavenge`);
        }
      }
    }
    
    // Get total experience gained
    const experienceGained = req.session.scavenging.experienceGained || 0;
    if (experienceGained > 0) {
      character.experience += experienceGained;
    }
    
    // Track if character died during scavenging
    const isRecovering = character.isRecovering;
    
    // If recovery just started during this session, leave health at 1
    // Otherwise if coming out of recovery, set health to 25
    if (character.recoveryUntil && !isRecovering) {
      // Recovery period has ended, set health to 25
      character.health.current = 25;
      character.recoveryUntil = null;
    }
    
    await character.save();
    
    // Compile results
    const results = {
      logs: req.session.scavenging.logs,
      duration: Math.floor((Date.now() - req.session.scavenging.startTime) / 1000), // in seconds
      loot: req.session.scavenging.loot,
      itemsAdded,
      itemsNotAdded,
      experienceGained,
      isRecovering: character.isRecovering,
      recoveryUntil: character.recoveryUntil
    };
    
    // Clear scavenging session
    req.session.scavenging = null;
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Scavenging session ended',
        results,
        character: {
          energy: character.energy,
          experience: character.experience,
          health: character.health,
          isRecovering: character.isRecovering,
          recoveryUntil: character.recoveryUntil
        }
      }
    });
  } catch (error) {
    console.error('Error ending scavenge:', error);
    res.status(500).json({
      success: false,
      message: 'Could not end scavenging session',
      error: error.message
    });
  }
});

// @desc    Get current scavenge status
// @route   GET /api/scavenge/status
// @access  Private
exports.getScavengeStatus = asyncHandler(async (req, res) => {
  try {
    // Check if there's an active scavenging session
    if (!req.session.scavenging) {
      return res.status(200).json({
        success: true,
        data: {
          active: false
        }
      });
    }
    
    // Get character
    const character = await Character.findOne({ user: req.user.id });
    
    // Read locations from JSON file to get current location data
    const locationsPath = path.join(__dirname, '../public/js/scavenge_locations.json');
    const locationsData = fs.readFileSync(locationsPath, 'utf8');
    const locationsJson = JSON.parse(locationsData);
    
    // Find the selected location
    const location = locationsJson.locations.find(
      loc => loc.id === req.session.scavenging.locationId
    );
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Scavenge location not found'
      });
    }
    
    // Check if session should end (due to recovery or other reasons)
    if (req.session.scavenging.shouldEnd || (character && character.isRecovering)) {
      // Auto-end the session
      await endScavenge(req, res);
      return;
    }
    
    // Get the elapsed time in seconds
    const startTime = req.session.scavenging.startTime;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Check if there are new events to process - regardless of combat status
    // Initialize event timing if needed
    if (!req.session.scavenging.nextEventTime) {
      req.session.scavenging.nextEventTime = generateRandomEventTime(startTime);
    }
    
    const lastProcessedTime = req.session.scavenging.lastProcessedTime || 0;
    const nextEventTime = req.session.scavenging.nextEventTime;
    
    // Process an event if it's time, even if we're in combat
    // This ensures we don't miss combat encounters
    // If combat is active, the processScavengeEvent function will handle it appropriately
    if (elapsedSeconds >= nextEventTime && elapsedSeconds > lastProcessedTime) {
      console.log(`Processing new event at ${elapsedSeconds} seconds`);
      
      // Process the event
      await processScavengeEvent(req, location, elapsedSeconds);
      
      // Update the last processed time
      req.session.scavenging.lastProcessedTime = elapsedSeconds;
      
      // Generate next event time (5-15 seconds from now)
      const nextInterval = generateRandomEventInterval();
      req.session.scavenging.nextEventTime = elapsedSeconds + nextInterval;
      
      console.log(`Next event scheduled in ${nextInterval} seconds`);
    }
    
    // Calculate seconds until next event (only if not in combat)
    let secondsUntilNextEvent = null;
    if (!req.session.scavenging.currentCombat && req.session.scavenging.nextEventTime) {
      secondsUntilNextEvent = Math.max(0, req.session.scavenging.nextEventTime - elapsedSeconds);
    }
    
    // Prepare character health data for the client
    const characterHealth = character ? {
      health: character.health,
      name: character.name,
      recoveryUntil: character.recoveryUntil
    } : null;
    
    // Send response
    res.status(200).json({
      success: true,
      data: {
        active: true,
        locationId: req.session.scavenging.locationId,
        location,
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: req.session.scavenging.logs || [],
        loot: req.session.scavenging.loot || [],
        nextEventIn: secondsUntilNextEvent,
        currentCombat: req.session.scavenging.currentCombat,
        character: characterHealth
      }
    });
  } catch (error) {
    console.error('Error getting scavenge status:', error);
    res.status(500).json({
      success: false,
      message: 'Could not get scavenging status',
      error: error.message
    });
  }
});

// Function to generate a random time interval for events (5-15 seconds)
function generateRandomEventInterval() {
  return Math.floor(Math.random() * 11) + 5; // Random number between 5-15
}

// Function to generate the initial event time from start time
function generateRandomEventTime(startTime) {
  const initialWait = Math.floor(Math.random() * 16) + 5; // 5-20 seconds initial wait
  return Math.floor((Date.now() - startTime) / 1000) + initialWait;
}

// Modified event processing function (renamed from processScavengeMinute)
async function processScavengeEvent(req, location, elapsedSeconds) {
  try {
    // Get character
    const character = await Character.findOne({ user: req.user.id });
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Initialize experience counter if it doesn't exist
    if (!req.session.scavenging.experienceGained) {
      req.session.scavenging.experienceGained = 0;
    }
    
    // Initialize loot array if it doesn't exist
    if (!req.session.scavenging.loot) {
      req.session.scavenging.loot = [];
    }
    
    // Check if there's an active combat
    if (req.session.scavenging.currentCombat) {
      console.log("Combat is active, skipping normal event processing");
      // Don't actually skip event processing, just don't generate a new event
      // We still want to process combat rounds regularly via the combat round API
      return;
    }
    
    // Determine what happens in this event
    const roll = Math.random() * 100; // Random roll between 0-100
    
    // Format the elapsed time as minutes and seconds for logs
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Flag to track if any encounter was processed
    let encounterProcessed = false;
    
    // Check for encounters based on their chance
    for (const encounter of location.encounters) {
      if (roll <= encounter.chance) {
        // We have an encounter!
        encounterProcessed = true;
        
        if (encounter.type === 'monster') {
          // Monster encounter - fight!
          const monster = encounter;
          
          // Add log entry
          req.session.scavenging.logs.push({
            time: Date.now(),
            message: `[${timeString}] You encountered a ${monster.name}!`
          });
          
          // Start combat
          req.session.scavenging.currentCombat = {
            monster: {
              ...monster,
              currentHealth: monster.health
            },
            rounds: 0,
            lastRound: Date.now(),
            playerDamage: 0,
            monsterDamage: 0
          };
          
          console.log(`Combat initialized with ${monster.name}`);
          
          // Return early - combat will be processed via combat round API
          return;
        } else if (encounter.type === 'item') {
          // Item encounter - find some loot
          if (encounter.items && encounter.items.length > 0) {
            // Roll for a specific item
            const totalItemChance = encounter.items.reduce((sum, item) => sum + item.chance, 0);
            const itemRoll = Math.random() * totalItemChance;
            
            let cumulativeChance = 0;
            for (const item of encounter.items) {
              cumulativeChance += item.chance;
              
              if (itemRoll <= cumulativeChance) {
                // Verify the item exists in the database
                const itemExists = await Item.findOne({ itemId: item.item_id });
                
                if (itemExists) {
                  req.session.scavenging.logs.push({
                    time: Date.now(),
                    message: `[${timeString}] You found ${itemExists.name}!`
                  });
                  
                  // Add to loot
                  const existingLoot = req.session.scavenging.loot.find(
                    loot => loot.item_id === item.item_id
                  );
                  
                  if (existingLoot) {
                    existingLoot.quantity = (existingLoot.quantity || 1) + 1;
                  } else {
                    req.session.scavenging.loot.push({
                      item_id: item.item_id,
                      name: itemExists.name,
                      quantity: 1
                    });
                  }
                } else {
                  console.warn(`Item with ID ${item.item_id} not found in database`);
                }
                
                break; // Found an item, don't need to check others
              }
            }
          }
        }
        
        // We've processed one encounter, break out of the loop
        break;
      }
    }
    
    // If no encounter was processed, add an ambient event
    if (!encounterProcessed) {
      // Define some ambient events with descriptive text
      const ambientEvents = [
        "You continue searching but find nothing interesting.",
        "The wind howls through the abandoned structures.",
        "You hear distant sounds, but can't identify their source.",
        "The ground is disturbed, suggesting someone was here recently.",
        "You find footprints, but they lead nowhere.",
        "Something rustles in the distance, but you see nothing.",
        "You feel like you're being watched, but see no one.",
        "The silence is deafening as you continue to search.",
        "You find some discarded trash, but nothing useful.",
        "The air is thick with dust and radiation.",
        "A sudden gust of wind sends debris skittering across the ground.",
        "The distant sound of metal creaking echoes through the ruins.",
        "You spot movement in the shadows, but when you look closer, there's nothing there.",
        "A strange smell lingers in the air, sharp and metallic.",
        "You step on something brittle, and it crumbles to dust beneath your foot.",
        "A low, distant rumble vibrates through the ground, but the source is unclear.",
        "A flicker of light catches your eye, but it vanishes when you focus on it.",
        "You find a faded sign warning of dangers long forgotten.",
        "A single drop of water falls from above, breaking the eerie silence.",
        "The wind carries a faint whisper, but you can't make out any words.",
        "You stumble upon an old, rusted weapon, completely useless now.",
        "A shiver runs down your spine, but you can't explain why.",
        "The ruins seem unnaturally still, as if waiting for something to happen.",
        "A distant, muffled explosion echoes across the wasteland.",
        "You find an old, torn piece of fabric caught on a jagged piece of metal.",
        "A weak radio signal crackles briefly in the static before vanishing.",
        "You hear a faint tapping sound, rhythmic and unnatural.",
        "The ground shifts slightly beneath your feet, unsettling but stable.",
        "You notice strange markings on a nearby wall, their meaning unknown.",
        "The remains of a long-dead fire suggest someone was here not too long ago."
      ];
      
      // Select a random ambient event
      const randomEvent = ambientEvents[Math.floor(Math.random() * ambientEvents.length)];
      
      req.session.scavenging.logs.push({
        time: Date.now(),
        message: `[${timeString}] ${randomEvent}`
      });
    }
    
    // Save character changes
    await character.save();
    
  } catch (error) {
    console.error('Error processing scavenge event:', error);
    throw error;
  }
}

// Process combat round in scavenging
async function processCombatRound(req, character) {
  try {
    // Validate combat exists
    if (!req.session.scavenging || !req.session.scavenging.currentCombat) {
      console.error("No combat in session");
      return false;
    }
    
    const combat = req.session.scavenging.currentCombat;
    const monster = combat.monster;
    
    console.log(`Processing combat round for ${monster.name}, health: ${monster.currentHealth}/${monster.health}`);
    
    // Round timing
    const now = Date.now();
    combat.lastRound = now;
    
    // Initialize or increment round counter
    if (combat.rounds === undefined) {
      combat.rounds = 1; // Start at round 1
    } else {
      combat.rounds += 1;
    }
    
    console.log(`Combat round ${combat.rounds} started`);
    
    // Reset damage for this round
    combat.newMonsterDamage = 0;
    combat.newPlayerDamage = 0;
    
    // PLAYER ATTACKS FIRST
    
    // Calculate player damage with strength and equipped weapon
    let weaponDamage = 0;
    
    // Get weapon damage if character has a weapon equipped
    if (character.equipment && character.equipment.weapon) {
      try {
        // Populate the weapon item if not already populated
        if (typeof character.equipment.weapon === 'string' || !character.equipment.weapon.stats) {
          const weapon = await Item.findById(character.equipment.weapon);
          if (weapon && weapon.stats && weapon.stats.damage) {
            weaponDamage = weapon.stats.damage;
          }
        } else if (character.equipment.weapon.stats && character.equipment.weapon.stats.damage) {
          // If already populated
          weaponDamage = character.equipment.weapon.stats.damage;
        }
        console.log(`Weapon damage: ${weaponDamage}`);
      } catch (err) {
        console.error("Error getting weapon damage:", err);
      }
    }
    
    // Calculate player damage with randomness (1-3 base + strength + weapon damage)
    const strengthBonus = character.stats && character.stats.strength ? character.stats.strength : 1;
    const baseDamage = Math.floor(Math.random() * 3) + 1; // 1-3 damage
    const playerDamage = Math.max(1, baseDamage + strengthBonus + weaponDamage); // Minimum 1 damage
    
    // Update damage values for UI
    combat.playerDamage = playerDamage;
    combat.newMonsterDamage = playerDamage;
    
    // Apply damage to monster
    monster.currentHealth -= playerDamage;
    
    console.log(`Player hits for ${playerDamage} (Strength: ${strengthBonus}, Weapon: ${weaponDamage}), monster health now ${monster.currentHealth}/${monster.health}`);
    
    // Log the attack
    req.session.scavenging.logs.push({
      time: now,
      message: `You hit the ${monster.name} for ${playerDamage} damage.`
    });
    
    // Check if monster is defeated
    if (monster.currentHealth <= 0) {
      await handleMonsterDefeat(req, combat, monster, character, now);
      return true;
    }
    
    // MONSTER ATTACKS NEXT
    
    // Calculate monster damage with randomness (0 to monster damage value)
    const monsterDamage = monster.damage > 0 ? Math.floor(Math.random() * (monster.damage + 1)) : 0;
    
    // Update damage values for UI
    combat.monsterDamage = monsterDamage;
    combat.newPlayerDamage = monsterDamage;
    
    console.log(`Monster attempts to hit for up to ${monster.damage}, rolls ${monsterDamage}`);
    
    // Apply and log monster attack
    if (monsterDamage > 0) {
      // Apply damage to player
      character.health.current -= monsterDamage;
      
      console.log(`Monster hits for ${monsterDamage}, player health now ${character.health.current}/${character.health.max}`);
      
      // Log the attack
      req.session.scavenging.logs.push({
        time: now,
        message: `The ${monster.name} attacks you for ${monsterDamage} damage!`
      });
      
      // Check if player is defeated
      if (character.health.current <= 0) {
        await handlePlayerDefeat(req, combat, monster, character, now);
        return true;
      }
    } else {
      // Monster missed
      req.session.scavenging.logs.push({
        time: now,
        message: `The ${monster.name} tries to attack but misses!`
      });
    }
    
    // Save character changes (health updates)
    await character.save();
    
    console.log(`Combat round ${combat.rounds} completed successfully`);
    return true;
  } catch (error) {
    console.error('Error processing combat round:', error);
    return false;
  }
}

// Handle monster defeat
async function handleMonsterDefeat(req, combat, monster, character, timestamp) {
  console.log(`Monster ${monster.name} defeated`);
  
  // Log victory
  req.session.scavenging.logs.push({
    time: timestamp,
    message: `You defeated the ${monster.name}!`
  });
  
  // Award experience
  const expGained = monster.experience || 1;
  character.experience += expGained;
  
  // Track experience in session
  if (!req.session.scavenging.experienceGained) {
    req.session.scavenging.experienceGained = expGained;
  } else {
    req.session.scavenging.experienceGained += expGained;
  }
  
  // Log experience gain
  req.session.scavenging.logs.push({
    time: timestamp,
    message: `You gained ${expGained} experience!`
  });
  
  // Process monster loot drops
  if (monster.loot && monster.loot.length > 0) {
    for (const lootItem of monster.loot) {
      // Roll for each potential loot item
      const lootRoll = Math.random() * 100;
      
      if (lootRoll <= lootItem.chance) {
        // Check if item exists in database
        const itemExists = await Item.findOne({ itemId: lootItem.item_id });
        
        if (itemExists) {
          // Log item find
          req.session.scavenging.logs.push({
            time: timestamp,
            message: `You found ${itemExists.name}!`
          });
          
          // Add to session loot
          const existingLoot = req.session.scavenging.loot.find(
            item => item.item_id === lootItem.item_id
          );
          
          if (existingLoot) {
            existingLoot.quantity = (existingLoot.quantity || 1) + 1;
          } else {
            req.session.scavenging.loot.push({
              item_id: lootItem.item_id,
              name: itemExists.name,
              quantity: 1
            });
          }
        } else {
          console.warn(`Item with ID ${lootItem.item_id} not found in database`);
        }
      }
    }
  }
  
  // End combat
  combat.ended = true;
  req.session.scavenging.currentCombat = null;
  
  // Save character with experience update
  await character.save();
  
  console.log('Monster defeat processed, combat ended');
  return true;
}

// Handle player defeat
async function handlePlayerDefeat(req, combat, monster, character, timestamp) {
  console.log(`Player defeated by ${monster.name}`);
  
  // Set recovery period (10 minutes)
  const recoveryTime = new Date();
  recoveryTime.setMinutes(recoveryTime.getMinutes() + 10);
  character.recoveryUntil = recoveryTime;
  
  // Set health to 1 (will be restored to 25% after recovery)
  character.health.current = 1;
  
  // Log defeat and recovery
  req.session.scavenging.logs.push({
    time: timestamp,
    message: `You were knocked unconscious by the ${monster.name}!`
  });
  
  req.session.scavenging.logs.push({
    time: timestamp,
    message: `You will be in recovery for 10 minutes.`
  });
  
  // End combat
  combat.ended = true;
  req.session.scavenging.currentCombat = null;
  
  // Flag session to end
  req.session.scavenging.shouldEnd = true;
  
  // Save character with recovery time
  await character.save();
  
  console.log('Player defeat processed, recovery started');
  return true;
}

// @desc    Manually trigger a combat round
// @route   POST /api/scavenge/combat-round
// @access  Private
exports.triggerCombatRound = asyncHandler(async (req, res) => {
  try {
    console.log("Combat round request received from client");
    
    // Check if there's an active session
    if (!req.session.scavenging) {
      console.error("No active scavenging session found in session");
      return res.status(400).json({
        success: false,
        message: 'No active scavenging session'
      });
    }
    
    // Check if there's an active combat
    if (!req.session.scavenging.currentCombat) {
      console.error("No active combat found in session");
      return res.status(400).json({
        success: false,
        message: 'No active combat in progress'
      });
    }
    
    // Check if combat data is valid
    if (!req.session.scavenging.currentCombat.monster) {
      console.error("Invalid combat data - missing monster");
      return res.status(400).json({
        success: false,
        message: 'Invalid combat data'
      });
    }
    
    // Get the character
    const character = await Character.findOne({ user: req.user.id });
    
    if (!character) {
      console.error("Character not found");
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }
    
    console.log(`Processing combat round for character: ${character.name}, monster: ${req.session.scavenging.currentCombat.monster.name}`);
    console.log("Combat state before processing:", JSON.stringify(req.session.scavenging.currentCombat));
    
    // Process a combat round
    try {
      const roundProcessed = await processCombatRound(req, character);
      
      if (!roundProcessed) {
        console.error("Failed to process combat round");
        return res.status(400).json({
          success: false,
          message: 'Failed to process combat round'
        });
      }
    } catch (error) {
      console.error("Error in processCombatRound:", error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error in combat processing',
        error: error.message
      });
    }
    
    console.log("Combat state after processing:", JSON.stringify(req.session.scavenging.currentCombat));
    
    // Prepare response data
    if (req.session.scavenging.currentCombat) {
      // Combat is still ongoing
      console.log("Combat continues, returning updated state");
      
      return res.status(200).json({
        success: true,
        data: {
          combat: req.session.scavenging.currentCombat,
          character: {
            name: character.name,
            health: character.health
          }
        }
      });
    } else {
      // Combat has ended
      console.log("Combat has ended, returning ended state");
      
      return res.status(200).json({
        success: true,
        data: {
          combat: { ended: true },
          character: {
            name: character.name,
            health: character.health,
            recoveryUntil: character.recoveryUntil
          }
        }
      });
    }
  } catch (error) {
    console.error('Error triggering combat round:', error);
    res.status(500).json({
      success: false,
      message: 'Could not process combat round',
      error: error.message
    });
  }
});

// @desc    Force a combat encounter for testing
// @route   POST /api/scavenge/force-combat/:monsterId
// @access  Private
exports.forceEncounter = asyncHandler(async (req, res) => {
  try {
    const { monsterId } = req.params;
    
    // Check if there's an active scavenging session
    if (!req.session.scavenging) {
      return res.status(400).json({
        success: false,
        message: 'No active scavenging session'
      });
    }
    
    // Get character
    const character = await Character.findOne({ user: req.user.id });
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }
    
    // Load locations data
    const locationsPath = path.join(__dirname, '../public/js/scavenge_locations.json');
    const locationsData = fs.readFileSync(locationsPath, 'utf8');
    const locationsJson = JSON.parse(locationsData);
    
    // Find the current location
    const location = locationsJson.locations.find(
      loc => loc.id === req.session.scavenging.locationId
    );
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Scavenge location not found'
      });
    }
    
    // Find the specified monster in the location
    let monsterEncounter;
    for (const encounter of location.encounters) {
      if (encounter.type === 'monster' && encounter.id === monsterId) {
        monsterEncounter = encounter;
        break;
      }
    }
    
    // If monster not found, find any monster
    if (!monsterEncounter) {
      for (const encounter of location.encounters) {
        if (encounter.type === 'monster') {
          monsterEncounter = encounter;
          break;
        }
      }
    }
    
    if (!monsterEncounter) {
      return res.status(404).json({
        success: false,
        message: 'No monsters available in this location'
      });
    }
    
    // Format the elapsed time for logs
    const elapsedSeconds = Math.floor((Date.now() - req.session.scavenging.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Add log entry
    req.session.scavenging.logs.push({
      time: Date.now(),
      message: `[${timeString}] You encountered a ${monsterEncounter.name}!`    });
    
    // Start combat
    req.session.scavenging.currentCombat = {
      monster: {
        ...monsterEncounter,
        currentHealth: monsterEncounter.health
      },
      rounds: 0,
      lastRound: Date.now(),
      playerDamage: 0,
      monsterDamage: 0
    };
    
    // Return success with combat data
    res.status(200).json({
      success: true,
      message: `Started combat with ${monsterEncounter.name}`,
      data: {
        combat: req.session.scavenging.currentCombat,
        character: {
          name: character.name, 
          health: character.health
        }
      }
    });
    
  } catch (error) {
    console.error('Error forcing combat encounter:', error);
    res.status(500).json({
      success: false,
      message: 'Could not force combat encounter',
      error: error.message
    });
  }
}); 
