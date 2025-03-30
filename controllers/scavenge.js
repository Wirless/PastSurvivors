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
      lastProcessedTime: 0
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
              image: item.image.startsWith('/images/items/') ? item.image : `/images/items/${item.image}`
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
                image: item.image.startsWith('/images/items/') ? item.image : `/images/items/${item.image}`
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
      
      await character.save();
    }
    
    // Get total experience gained
    const experienceGained = req.session.scavenging.experienceGained || 0;
    if (experienceGained > 0) {
      character.experience += experienceGained;
      await character.save();
    }
    
    // Compile results
    const results = {
      logs: req.session.scavenging.logs,
      duration: Math.floor((Date.now() - req.session.scavenging.startTime) / 1000), // in seconds
      loot: req.session.scavenging.loot,
      itemsAdded,
      itemsNotAdded,
      experienceGained
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
          health: character.health
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
    if (!req.session.scavenging) {
      return res.status(200).json({
        success: true,
        data: {
          active: false
        }
      });
    }
    
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
    
    // Get the elapsed time in seconds
    const startTime = req.session.scavenging.startTime;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Check if there are new events to process
    const lastProcessedTime = req.session.scavenging.lastProcessedTime || 0;
    
    // Initialize nextEventTime if it doesn't exist
    if (!req.session.scavenging.nextEventTime) {
      // Initialize with a time 5-20 seconds from the start
      req.session.scavenging.nextEventTime = generateRandomEventTime(startTime);
    }
    
    // Get the current next event time
    const nextEventTime = req.session.scavenging.nextEventTime;
    
    // Check if it's time for a new event
    if (elapsedSeconds >= nextEventTime && elapsedSeconds > lastProcessedTime) {
      console.log('Processing new event at', elapsedSeconds, 'seconds');
      await processScavengeEvent(req, location, elapsedSeconds);
      
      // Update the last processed time
      req.session.scavenging.lastProcessedTime = elapsedSeconds;
      
      // Generate next event time (15-60 seconds from now)
      const nextInterval = generateRandomEventInterval();
      req.session.scavenging.nextEventTime = elapsedSeconds + nextInterval;
      console.log('Next event in', nextInterval, 'seconds');
    }
    
    // Calculate seconds until next event
    const secondsUntilNextEvent = req.session.scavenging.nextEventTime 
                                ? Math.max(0, req.session.scavenging.nextEventTime - elapsedSeconds)
                                : null;
    
    res.status(200).json({
      success: true,
      data: {
        active: true,
        locationId: req.session.scavenging.locationId,
        location,
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: req.session.scavenging.logs,
        loot: req.session.scavenging.loot || [],
        nextEventIn: secondsUntilNextEvent
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

// Function to generate a random time interval for events (15-60 seconds)
function generateRandomEventInterval() {
  return Math.floor(Math.random() * 46) + 15; // Random number between 15-60
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
          
          // Simple combat resolution
          const playerDamage = Math.floor(Math.random() * 3) + character.stats.strength - 3;
          
          // Player attacks first based on agility
          let monsterDefeated = false;
          let monsterHealth = monster.health;
          
          if (character.stats.agility >= 5) {
            // Player gets first attack
            monsterHealth -= Math.max(1, playerDamage);
            
            if (monsterHealth <= 0) {
              monsterDefeated = true;
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `You quickly defeated the ${monster.name} before it could attack!`
              });
            } else {
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `You hit the ${monster.name} for ${Math.max(1, playerDamage)} damage.`
              });
            }
          }
          
          // Monster attack if still alive
          if (!monsterDefeated) {
            const monsterDamage = Math.max(0, monster.damage);
            
            if (monsterDamage > 0) {
              character.health.current -= monsterDamage;
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `The ${monster.name} attacks you for ${monsterDamage} damage!`
              });
              
              // Check if player died
              if (character.health.current <= 0) {
                character.health.current = 1; // Don't let player die, just knock them out
                req.session.scavenging.logs.push({
                  time: Date.now(),
                  message: `You were knocked unconscious! You wake up with 1 health.`
                });
                
                // End scavenging session after this event
                req.session.scavenging.logs.push({
                  time: Date.now(),
                  message: `You decide to head back to safety.`
                });
                
                await character.save();
                return; // End processing here
              }
            } else {
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `The ${monster.name} tries to attack but misses!`
              });
            }
            
            // Player's second attack if monster still alive
            monsterHealth -= Math.max(1, playerDamage);
            
            if (monsterHealth <= 0) {
              monsterDefeated = true;
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `You defeated the ${monster.name}!`
              });
            } else {
              req.session.scavenging.logs.push({
                time: Date.now(),
                message: `You hit the ${monster.name} for ${Math.max(1, playerDamage)} damage but it's still fighting!`
              });
            }
          }
          
          // Rewards if monster defeated
          if (monsterDefeated) {
            // Experience gain
            character.experience += monster.experience;
            req.session.scavenging.experienceGained += monster.experience;
            req.session.scavenging.logs.push({
              time: Date.now(),
              message: `You gained ${monster.experience} experience!`
            });
            
            // Loot drop 
            if (monster.loot && monster.loot.length > 0) {
              for (const lootItem of monster.loot) {
                const lootRoll = Math.random() * 100;
                
                if (lootRoll <= lootItem.chance) {
                  // Verify the item exists in the database
                  const itemExists = await Item.findOne({ itemId: lootItem.item_id });
                  
                  if (itemExists) {
                    req.session.scavenging.logs.push({
                      time: Date.now(),
                      message: `You found ${itemExists.name}!`
                    });
                    
                    // Add to loot
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
          }
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
        "The air is thick with dust and radiation."
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