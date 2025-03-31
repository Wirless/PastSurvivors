// Client-side scavenging functionality
document.addEventListener('DOMContentLoaded', async () => {
  const locationsCarousel = document.getElementById('locations-carousel');
  const locationInfo = document.getElementById('location-info');
  const scavengeStartButton = document.getElementById('scavenge-start-btn');
  const scavengeEndButton = document.getElementById('scavenge-end-btn');
  const scavengeLogContainer = document.getElementById('scavenge-log');
  const scavengeLootContainer = document.getElementById('scavenge-loot');
  const scavengeSection = document.getElementById('scavenge-section');
  const scavengeStats = document.getElementById('scavenge-stats');
  const nextEventProgress = document.getElementById('next-event-progress');
  const nextEventCountdown = document.getElementById('next-event-countdown');
  
  // New combat elements
  const combatWindow = document.getElementById('combat-window');
  const combatPlayerHealthBar = document.getElementById('combat-player-health-bar');
  const combatPlayerHealthValue = document.getElementById('combat-player-health-value');
  const combatMonsterHealthBar = document.getElementById('combat-monster-health-bar');
  const combatMonsterHealthValue = document.getElementById('combat-monster-health-value');
  const combatMonsterName = document.getElementById('combat-monster-name');
  const combatMonsterDamage = document.getElementById('combat-monster-damage');
  const combatMonsterXP = document.getElementById('combat-monster-xp');
  const combatRoundCount = document.getElementById('combat-round-count');
  const combatPlayerDamage = document.getElementById('combat-player-damage');
  const combatMonsterDamageDealt = document.getElementById('combat-monster-damage-dealt');
  const combatRoundTimer = document.getElementById('combat-round-timer');
  const combatLogContainer = document.getElementById('combat-log');
  const combatRecoverySection = document.getElementById('combat-recovery');
  const recoveryProgress = document.getElementById('recovery-progress');
  const recoveryTime = document.getElementById('recovery-time');
  const playerName = document.getElementById('player-name');
  const monsterImage = document.getElementById('monster-image');
  
  let locations = [];
  let activeLocation = null;
  let scavengeInterval = null;
  let isScavenging = false;
  let scavengeStartTime = null;
  let isInCombat = false;
  let recoveryEndTime = null;
  let recoveryInterval = null;
  
  // Global variable for combat interval ID
  let combatIntervalId = null;
  
  // Initialize the page
  try {
    addCombatStyles();
    await loadLocations();
    await checkScavengeStatus();
  } catch (error) {
    console.error('Error initializing scavenge page:', error);
    showError('Failed to load scavenging data. Please try refreshing the page.');
  }
  
  // Set up event listeners
  if (scavengeStartButton) {
    scavengeStartButton.addEventListener('click', startScavenging);
  }
  
  if (scavengeEndButton) {
    scavengeEndButton.addEventListener('click', endScavenging);
  }
  
  // Load scavenging locations
  async function loadLocations() {
    try {
      const response = await fetch('/api/scavenge/locations');
      const data = await response.json();
      
      if (data.success && data.data) {
        locations = data.data.locations;
        renderLocations();
      } else {
        showError('Could not load locations');
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      showError('Failed to load location data');
    }
  }
  
  // Render locations carousel
  function renderLocations() {
    if (!locationsCarousel) return;
    
    locationsCarousel.innerHTML = '';
    
    locations.forEach((location, index) => {
      const locationCard = document.createElement('div');
      locationCard.className = 'location-card';
      locationCard.dataset.locationId = location.id;
      
      if (index === 0) {
        locationCard.classList.add('active');
        updateLocationInfo(location);
        activeLocation = location;
      }
      
      const locationImage = document.createElement('div');
      locationImage.className = 'location-image';
      locationImage.style.backgroundImage = `url('${location.image}')`;
      
      const locationName = document.createElement('div');
      locationName.className = 'location-name';
      locationName.textContent = location.name;
      
      locationCard.appendChild(locationImage);
      locationCard.appendChild(locationName);
      
      locationCard.addEventListener('click', () => {
        document.querySelectorAll('.location-card').forEach(card => {
          card.classList.remove('active');
        });
        
        locationCard.classList.add('active');
        updateLocationInfo(location);
        activeLocation = location;
      });
      
      locationsCarousel.appendChild(locationCard);
    });
  }
  
  // Update location information section
  function updateLocationInfo(location) {
    if (!locationInfo) return;
    
    // Clear existing content
    locationInfo.innerHTML = '';
    
    // Create location details
    const locationName = document.createElement('h3');
    locationName.textContent = location.name;
    
    const locationDesc = document.createElement('p');
    locationDesc.className = 'location-description';
    locationDesc.textContent = location.description;
    
    const locationStats = document.createElement('div');
    locationStats.className = 'location-stats';
    locationStats.innerHTML = `
      <div class="stat">
        <span class="stat-label">Energy Cost:</span>
        <span class="stat-value">${location.energy_cost}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Minimum Level:</span>
        <span class="stat-value">${location.min_level || 1}</span>
      </div>
    `;
    
    const locationMonsters = document.createElement('div');
    locationMonsters.className = 'location-monsters';
    locationMonsters.innerHTML = '<h4>Possible Encounters:</h4>';
    
    const monstersList = document.createElement('ul');
    
    location.encounters.forEach(encounter => {
      if (encounter.type === 'monster') {
        const monsterItem = document.createElement('li');
        monsterItem.innerHTML = `<span class="monster-name">${encounter.name}</span>`;
        monstersList.appendChild(monsterItem);
      }
    });
    
    // Don't show empty monsters list
    if (monstersList.children.length > 0) {
      locationMonsters.appendChild(monstersList);
      locationInfo.appendChild(locationName);
      locationInfo.appendChild(locationDesc);
      locationInfo.appendChild(locationStats);
      locationInfo.appendChild(locationMonsters);
    } else {
      locationInfo.appendChild(locationName);
      locationInfo.appendChild(locationDesc);
      locationInfo.appendChild(locationStats);
    }
  }
  
  // Check if there's an active scavenging session
  async function checkScavengeStatus() {
    try {
      const response = await fetch('/api/scavenge/status');
      const data = await response.json();
      
      if (data.success && data.data.active) {
        // There is an active scavenging session
        isScavenging = true;
        activeLocation = data.data.location;
        scavengeStartTime = data.data.startTime || Date.now();
        
        // Update UI for active scavenging
        updateScavengingUI(true);
        
        // Select the current location in the carousel
        document.querySelectorAll('.location-card').forEach(card => {
          if (card.dataset.locationId === data.data.locationId) {
            card.click();
          }
        });
        
        // Update the log and loot
        if (data.data.logs) {
          updateScavengeLog(data.data.logs);
        }
        
        if (data.data.loot) {
          updateLoot(data.data.loot);
        }
        
        // Check if there's an active combat
        if (data.data.currentCombat) {
          isInCombat = true;
          updateCombatDisplay(data.data.currentCombat, data.data.characterHealth);
        }
        
        // Start the update interval
        startScavengeInterval();
        
        // Update countdown for next event if available
        if (data.data.nextEventIn !== null) {
          updateNextEventCountdown(data.data.nextEventIn);
        }
      }
    } catch (error) {
      console.error('Error checking scavenge status:', error);
    }
  }
  
  // Start scavenging
  async function startScavenging() {
    if (!activeLocation) return;
    
    try {
      // First check if character is in recovery
      const characterResponse = await fetch('/api/character');
      const characterData = await characterResponse.json();
      
      if (characterData.success && characterData.data) {
        const character = characterData.data;
        
        // Check if in recovery
        if (character.recoveryUntil) {
          const recoveryDate = new Date(character.recoveryUntil);
          if (recoveryDate > new Date()) {
            const minutesLeft = Math.ceil((recoveryDate - new Date()) / (1000 * 60));
            showError(`You cannot scavenge while recovering from injuries. Recovery ends in ${minutesLeft} minutes.`);
            return;
          }
        }
        
        // We no longer check for energy since we're removing energy cost
      }
      
      const response = await fetch(`/api/scavenge/start/${activeLocation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        isScavenging = true;
        scavengeStartTime = Date.now();
        
        // Start interval for updates
        startScavengeInterval();
        
        // Update UI with initial data
        if (data.data.location) {
          activeLocation = data.data.location;
        }
        
        // Update UI for active scavenging
        updateScavengingUI(true);
        
        // Show toast
        showToast('Scavenging started!');
      } else {
        if (data.recovery) {
          showError(`You cannot scavenge while recovering from injuries. Recovery ends in ${data.recovery.minutesLeft} minutes.`);
        } else {
          showError(data.message || 'Could not start scavenging');
        }
      }
    } catch (error) {
      console.error('Error starting scavenging:', error);
      showError('Failed to start scavenging');
    }
  }
  
  // End scavenging
  async function endScavenging() {
    try {
      const response = await fetch('/api/scavenge/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        isScavenging = false;
        isInCombat = false;
        updateScavengingUI(false);
        
        // Clear the update interval
        clearInterval(scavengeInterval);
        
        // Show results
        showScavengeResults(data.data.results);
        
        // Update character stats
        updateCharacterStats(data.data.character);
        
        // Show toast
        showToast('Scavenging complete!');
      } else {
        showError(data.message || 'Could not end scavenging');
      }
    } catch (error) {
      console.error('Error ending scavenging:', error);
      showError('Failed to end scavenging');
    }
  }
  
  // Start interval to update scavenging status
  function startScavengeInterval() {
    // Clear any existing interval first
    if (scavengeInterval) {
      clearInterval(scavengeInterval);
    }
    
    // Start a new interval - update every second to ensure timely updates
    scavengeInterval = setInterval(updateScavengeStatus, 1000);
    
    // Track total paused time for accurate elapsed time calculation
    let totalPausedTime = 0;
    let lastPauseStart = null;
    
    // Also start a timer to update the elapsed time display
    const elapsedTimer = document.getElementById('elapsed-time');
    if (elapsedTimer) {
      window.elapsedTimerInterval = setInterval(() => {
        if (!scavengeStartTime) return;
        
        // If in combat, don't update the timer
        if (isInCombat) {
          if (!lastPauseStart) {
            lastPauseStart = Date.now();
          }
          return;
        } else if (lastPauseStart) {
          // Coming out of combat, add to total paused time
          totalPausedTime += Date.now() - lastPauseStart;
          lastPauseStart = null;
        }
        
        // Calculate elapsed time excluding paused time
        const elapsed = Date.now() - scavengeStartTime - totalPausedTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        elapsedTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
    }
  }
  
  // Update scavenging status
  async function updateScavengeStatus() {
    if (!isScavenging) return;
    
    // Skip updates if in combat - combat has its own update cycle
    if (isInCombat) return;
    
    try {
      const response = await fetch('/api/scavenge/status');
      const data = await response.json();
      
      if (data.success) {
        if (data.data.active) {
          // Update logs and loot
          if (data.data.logs) {
            updateScavengeLog(data.data.logs);
          }
          
          if (data.data.loot) {
            updateLoot(data.data.loot);
          }
          
          // Check if there's a new combat encounter - verify we have the necessary data
          if (data.data.currentCombat && data.data.currentCombat.monster && !isInCombat) {
            // New combat started - pause scavenging updates
            isInCombat = true;
            
            // Stop regular scavenging interval
            if (scavengeInterval) {
              clearInterval(scavengeInterval);
              scavengeInterval = null;
            }
            
            // Start combat
            startCombat(data.data.currentCombat, data.data.character || data.data.characterHealth);
          } 
          // Update ongoing combat - verify we have the necessary data
          else if (data.data.currentCombat && data.data.currentCombat.monster && isInCombat) {
            // Already in combat - combat updates are handled by the combat interval
            // No need to do anything here
          } 
          // Combat ended
          else if (!data.data.currentCombat && isInCombat) {
            // Combat ended from the server side
            isInCombat = false;
            
            // Clear combat interval if it exists
            if (combatIntervalId) {
              clearInterval(combatIntervalId);
              combatIntervalId = null;
            }
            
            // End combat and transition back to scavenging
            endCombat(data.data.character);
          }
          
          // Update countdown for next event if not in combat
          if (data.data.nextEventIn !== null && !isInCombat) {
            updateNextEventCountdown(data.data.nextEventIn);
          }
          
          // Check if player is in recovery
          if (data.data.character && data.data.character.recoveryUntil) {
            const recoveryDate = new Date(data.data.character.recoveryUntil);
            if (recoveryDate > new Date()) {
              startRecoveryCountdown(recoveryDate);
            } else {
              stopRecoveryCountdown();
            }
          }
        } else {
          // Scavenging ended elsewhere (maybe in another tab)
          isScavenging = false;
          isInCombat = false;
          
          // Clear all intervals
          if (scavengeInterval) {
            clearInterval(scavengeInterval);
            scavengeInterval = null;
          }
          
          if (combatIntervalId) {
            clearInterval(combatIntervalId);
            combatIntervalId = null;
          }
          
          updateScavengingUI(false);
          
          // Show toast
          showToast('Scavenging session ended');
        }
      }
    } catch (error) {
      console.error('Error updating scavenge status:', error);
    }
  }
  
  // Update the countdown timer for the next event
  function updateNextEventCountdown(seconds) {
    const progressBar = document.getElementById('next-event-progress');
    const progressContainer = document.querySelector('.next-event-container');
    
    if (!progressBar || !progressContainer) return;
    
    if (seconds <= 0) {
      progressBar.style.width = '100%';
      progressContainer.classList.add('event-imminent');
    } else {
      // Get the max time between events (we know it's between 5-15 seconds from the controller)
      const maxTime = 6;
      // Calculate progress percentage (inverted - starts full and decreases)
      const progressPercent = 100 - ((seconds / maxTime) * 100);
      progressBar.style.width = `${progressPercent}%`;
      progressContainer.classList.remove('event-imminent');
    }
  }
  
  // Update scavenge log with new entries
  function updateScavengeLog(logs) {
    if (!scavengeLogContainer) return;
    
    // Clear current log
    scavengeLogContainer.innerHTML = '';
    
    if (!logs || logs.length === 0) {
      const emptyLog = document.createElement('div');
      emptyLog.className = 'log-entry empty';
      emptyLog.textContent = 'No events yet...';
      scavengeLogContainer.appendChild(emptyLog);
      return;
    }
    
    // Filter out combat logs if in combat
    const filteredLogs = logs.filter(log => {
      // Remove ALL combat-related logs, not just during active combat
      return !log.message.includes('attacks you') && 
             !log.message.includes('You hit') &&
             !log.message.includes('You attack') && 
             !log.message.includes('defeated') &&
             !log.message.includes('encounter') &&
             !log.message.includes('Combat') &&
             !log.message.includes('damage') &&
             !log.message.includes('experience') &&
             !log.message.includes('unconscious') &&
             !log.message.includes('knocked') &&
             !log.message.includes('misses');
    });
    
    // Add log entries
    filteredLogs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      
      // Add appropriate classes based on content
      if (log.message.includes('found')) {
        logEntry.classList.add('success');
      }
      
      logEntry.textContent = log.message;
      scavengeLogContainer.appendChild(logEntry);
    });
    
    // Scroll to the bottom of the log
    scavengeLogContainer.scrollTop = scavengeLogContainer.scrollHeight;
  }
  
  // Update loot display
  function updateLoot(loot) {
    if (!scavengeLootContainer) return;
    
    // Clear current loot
    scavengeLootContainer.innerHTML = '';
    
    if (!loot || loot.length === 0) {
      const emptyLoot = document.createElement('div');
      emptyLoot.className = 'empty-loot';
      emptyLoot.textContent = 'No items found yet...';
      scavengeLootContainer.appendChild(emptyLoot);
      return;
    }
    
    // Add loot entries
    loot.forEach(item => {
      const lootEntry = document.createElement('div');
      lootEntry.className = 'loot-item';
      
      const itemName = item.name || item.item_id.replace(/_/g, ' ');
      
      lootEntry.innerHTML = `
        <span class="item-name">${itemName}</span>
        <span class="item-quantity">x${item.quantity || 1}</span>
      `;
      
      scavengeLootContainer.appendChild(lootEntry);
    });
  }
  
  // Update UI based on scavenging state
  function updateScavengingUI(isActive) {
    if (scavengeStartButton) {
      scavengeStartButton.disabled = isActive;
    }
    
    if (scavengeEndButton) {
      scavengeEndButton.disabled = !isActive;
    }
    
    if (locationsCarousel) {
      locationsCarousel.classList.toggle('disabled', isActive);
      
      // Disable clicking on location cards during scavenging
      document.querySelectorAll('.location-card').forEach(card => {
        if (isActive) {
          card.style.pointerEvents = 'none';
        } else {
          card.style.pointerEvents = 'auto';
        }
      });
    }
    
    // Show/hide the scavenging section
    if (scavengeSection) {
      scavengeSection.classList.toggle('active', isActive);
    }
  }
  
  // Show scavenging results
  function showScavengeResults(results) {
    if (!scavengeStats) return;
    
    // Create the results summary
    const resultsSummary = document.createElement('div');
    resultsSummary.className = 'scavenge-results';
    
    // Duration
    const duration = Math.floor(results.duration / 60);
    const seconds = results.duration % 60;
    const durationDisplay = `${duration}m ${seconds}s`;
    
    // Experience
    const experienceDisplay = results.experienceGained || 0;
    
    // Items collected
    const itemsCollected = (results.itemsAdded || []).reduce((total, item) => total + item.quantity, 0);
    
    // Items not added due to full inventory
    const itemsNotAdded = (results.itemsNotAdded || []).reduce((total, item) => total + item.quantity, 0);
    
    resultsSummary.innerHTML = `
      <h3>Scavenging Results</h3>
      <div class="result-stat">
        <span class="result-label">Duration:</span>
        <span class="result-value">${durationDisplay}</span>
      </div>
      <div class="result-stat">
        <span class="result-label">Experience Gained:</span>
        <span class="result-value">${experienceDisplay}</span>
      </div>
      <div class="result-stat">
        <span class="result-label">Items Collected:</span>
        <span class="result-value">${itemsCollected}</span>
      </div>
      ${itemsNotAdded > 0 ? `
        <div class="result-stat warning">
          <span class="result-label">Items Lost (Inventory Full):</span>
          <span class="result-value">${itemsNotAdded}</span>
        </div>
      ` : ''}
    `;
    
    // Show collected items
    if (results.itemsAdded && results.itemsAdded.length > 0) {
      const itemsList = document.createElement('div');
      itemsList.className = 'results-items';
      itemsList.innerHTML = '<h4>Items Added to Inventory:</h4>';
      
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'items-grid';
      
      results.itemsAdded.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'result-item';
        itemElement.innerHTML = `
          <div class="item-image" style="background-image: url('${item.image || '/images/items/default-item.png'}')"></div>
          <div class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-quantity">x${item.quantity}</div>
          </div>
        `;
        itemsGrid.appendChild(itemElement);
      });
      
      itemsList.appendChild(itemsGrid);
      resultsSummary.appendChild(itemsList);
    }
    
    // Add to scavenge stats section
    scavengeStats.innerHTML = '';
    scavengeStats.appendChild(resultsSummary);
    scavengeStats.classList.add('has-results');
    
    // Smooth scroll to results
    scavengeStats.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Update character stats display
  function updateCharacterStats(character) {
    // This would update any character stats displayed on the page
    // For example, update energy bar, health, etc.
    
    // Since this depends on page structure, adjust as needed
    const energyBar = document.getElementById('energy-bar');
    const energyValue = document.getElementById('energy-value');
    
    if (energyBar && character.energy) {
      const energyPercent = (character.energy.current / character.energy.max) * 100;
      energyBar.style.width = `${energyPercent}%`;
    }
    
    if (energyValue && character.energy) {
      energyValue.textContent = `${character.energy.current}/${character.energy.max}`;
    }
    
    // Similar updates for health, experience, etc.
  }
  
  // Helper function to show toast messages
  function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  // Helper function to show errors
  function showError(message) {
    showToast(message);
    console.error(message);
  }
  
  // Update combat display with current combat information
  function updateCombatDisplay(combat, characterHealth) {
    if (!combatWindow || !combat || !combat.monster) {
        console.error("Missing required combat data", { combat, characterHealth });
        return;
    }
    
    console.log("Updating combat display with data:", { combat, characterHealth });
    
    // Show combat window
    combatWindow.classList.remove('hidden');
    
    // Get the monster data
    const monster = combat.monster;
    
    // Debug for monster data
    console.log("Monster data:", monster);
    
    // Update monster image
    if (monsterImage) {
        if (monster.image) {
            monsterImage.innerHTML = `<img src="${monster.image}" alt="${monster.name}">`;
        } else {
            monsterImage.innerHTML = `<div class="monster-placeholder">${monster.name}</div>`;
        }
    }
    
    // Update monster name and stats
    if (combatMonsterName) combatMonsterName.textContent = monster.name;
    if (combatMonsterDamage) combatMonsterDamage.textContent = monster.damage || 0;
    if (combatMonsterXP) combatMonsterXP.textContent = monster.experience || 0;
    
    // Update monster health
    if (combatMonsterHealthBar && combatMonsterHealthValue) {
        const monsterHealthPercent = (monster.currentHealth / monster.health) * 100;
        combatMonsterHealthBar.style.width = `${Math.max(0, Math.min(100, monsterHealthPercent))}%`;
        combatMonsterHealthValue.textContent = `${monster.currentHealth}/${monster.health}`;
    }
    
    // Update player health (with proper null checks)
    if (combatPlayerHealthBar && combatPlayerHealthValue) {
        let current, max;
        
        // Handle different character data structures
        if (characterHealth && characterHealth.health) {
            current = characterHealth.health.current;
            max = characterHealth.health.max;
        } else if (characterHealth) {
            current = characterHealth.current;
            max = characterHealth.max;
        } else {
            // Default fallback values
            current = 0;
            max = 100;
        }
        
        // Ensure we have valid numbers
        current = Number(current) || 0;
        max = Number(max) || 100;
        
        const playerHealthPercent = (current / max) * 100;
        combatPlayerHealthBar.style.width = `${Math.max(0, Math.min(100, playerHealthPercent))}%`;
        combatPlayerHealthValue.textContent = `${current}/${max}`;
    }
    
    // Update combat round and damage info
    if (combatRoundCount) combatRoundCount.textContent = combat.rounds || 0;
    if (combatPlayerDamage) combatPlayerDamage.textContent = combat.playerDamage || 0;
    if (combatMonsterDamageDealt) combatMonsterDamageDealt.textContent = combat.monsterDamage || 0;
    
    // Add combat log entries for new damage
    if (combat.newPlayerDamage && combat.newPlayerDamage > 0) {
        addCombatLogEntry(`${monster.name} attacks you for ${combat.newPlayerDamage} damage!`);
    }
    
    if (combat.newMonsterDamage && combat.newMonsterDamage > 0) {
        addCombatLogEntry(`You attack ${monster.name} for ${combat.newMonsterDamage} damage!`);
    }
    
    // Check for combat victory or defeat
    if (monster.currentHealth <= 0) {
        addCombatLogEntry(`You defeated the ${monster.name}!`);
    } else if (characterHealth) {
        // Check if health is in character.health or directly on character
        const currentHealth = characterHealth.health ? characterHealth.health.current : characterHealth.current;
        if (currentHealth !== undefined && currentHealth <= 0) {
            addCombatLogEntry(`You were defeated by the ${monster.name}! Starting recovery...`);
        }
    }
  }
  
  // Start combat mode and show the combat window
  function startCombat(combat, characterHealth) {
    if (!combatWindow || !combat || !combat.monster) return;
    
    console.log("Starting combat with monster:", combat.monster);
    
    // Set combat flag to block any scavenging updates
    isInCombat = true;
    
    // Pause scavenging updates while in combat
    if (scavengeInterval) {
        clearInterval(scavengeInterval);
        scavengeInterval = null;
    }
    
    // Store the scavenge start time to resume elapsed time calculation later
    const storedStartTime = scavengeStartTime;
    const pauseTime = Date.now();
    
    // Clear all existing intervals
    if (window.elapsedTimerInterval) {
        clearInterval(window.elapsedTimerInterval);
        window.elapsedTimerInterval = null;
    }
    
    if (window.combatRoundTimeout) {
        clearInterval(window.combatRoundTimeout);
        window.combatRoundTimeout = null;
    }
    
    // Make the scavenging section visually indicate combat is in progress
    if (scavengeSection) {
        scavengeSection.classList.add('combat-active');
    }
    
    // Hide next event countdown during combat
    if (nextEventProgress && nextEventProgress.parentElement) {
        nextEventProgress.parentElement.style.display = 'none';
    }
    
    // Apply styling to combat window
    combatWindow.style.zIndex = "100";
    combatWindow.style.position = "relative";
    combatWindow.style.backgroundColor = "#1c1c24";
    combatWindow.style.border = "2px solid #ff5555";
    combatWindow.style.borderRadius = "8px";
    combatWindow.style.padding = "20px";
    combatWindow.style.marginBottom = "30px";
    combatWindow.style.boxShadow = "0 0 15px rgba(255, 85, 85, 0.4)";
    
    // Show combat window
    combatWindow.classList.remove('hidden');
    
    // Set player name from character data
    if (playerName) {
        const charName = characterHealth && characterHealth.name ? characterHealth.name : 'Player';
        playerName.textContent = charName;
    }
    
    // Add a flashing effect
    combatWindow.classList.add('combat-flash');
    setTimeout(() => {
        combatWindow.classList.remove('combat-flash');
    }, 500);
    
    // Clear combat log
    if (combatLogContainer) {
        combatLogContainer.innerHTML = '';
    }
    
    // Add initial combat message
    addCombatLogEntry(`Combat started! You encounter a ${combat.monster.name}!`);
    
    // Scroll to combat window
    combatWindow.scrollIntoView({ behavior: 'smooth' });
    
    // Update the combat display
    updateCombatDisplay(combat, characterHealth);
    
    // Start the first round manually after a short delay
    setTimeout(() => {
        // Force start the first combat round
        triggerCombatRound().then(success => {
            if (success && isInCombat) {
                // Start the timer for the next round
                startCombatRoundTimer();
            }
        });
    }, 500);
  }

  // Add a new function to handle combat round timing
  function startCombatRoundTimer() {
    if (!isInCombat) return;
    
    console.log("Starting combat round timer");
    
    // Clear any existing timer
    if (window.combatRoundTimeout) {
        clearInterval(window.combatRoundTimeout);
        window.combatRoundTimeout = null;
    }
    
    // Set initial timer state - fixed 2 second interval
    let secondsLeft = 2;
    
    // Update timer display
    if (combatRoundTimer) {
        combatRoundTimer.textContent = `${secondsLeft}s`;
        combatRoundTimer.classList.remove('pulse');
    }
    
    // Start the countdown
    window.combatRoundTimeout = setInterval(() => {
        secondsLeft--;
        
        // Update timer display
        if (combatRoundTimer) {
            if (secondsLeft <= 0) {
                combatRoundTimer.textContent = 'Next';
                combatRoundTimer.classList.add('pulse');
                
                // Clear interval before triggering next round
                clearInterval(window.combatRoundTimeout);
                window.combatRoundTimeout = null;
                
                // Trigger the next round
                triggerCombatRound().then(success => {
                    if (success && isInCombat) {
                        // Only start a new timer if combat is still active
                        startCombatRoundTimer();
                    }
                });
            } else {
                combatRoundTimer.textContent = `${secondsLeft}s`;
                combatRoundTimer.classList.remove('pulse');
            }
        }
    }, 1000);
  }
  
  // Update the triggerCombatRound function to handle the response properly
  async function triggerCombatRound() {
    if (!isInCombat) return false;
    
    console.log("Triggering combat round");
    
    try {
        const response = await fetch('/api/scavenge/combat-round', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log("Combat round response:", data);
        
        if (data.success) {
            // Check if combat has ended
            if (!data.data.combat || data.data.combat.ended) {
                console.log("Combat has ended");
                isInCombat = false;
                endCombat(data.data.character);
                return false;
            } else {
                // Update the combat display with new data
                updateCombatDisplay(data.data.combat, data.data.character);
                return true;
            }
        } else {
            console.error('Combat round failed:', data.message);
            updateCombatStatus(); // Try to update status
            return false;
        }
    } catch (error) {
        console.error('Error triggering combat round:', error);
        updateCombatStatus(); // Try to update status
        return false;
    }
  }
  
  // Start recovery countdown after player death
  function startRecoveryCountdown(recoveryEndDateTime) {
    if (!combatRecoverySection || !recoveryProgress || !recoveryTime) return;
    
    // Store recovery end time
    recoveryEndTime = recoveryEndDateTime;
    
    // Show recovery section
    combatRecoverySection.classList.remove('hidden');
    
    // Clear any existing interval
    if (recoveryInterval) {
      clearInterval(recoveryInterval);
    }
    
    // Update recovery progress and time
    updateRecoveryCountdown();
    
    // Set interval to update countdown
    recoveryInterval = setInterval(updateRecoveryCountdown, 1000);
  }
  
  // Update recovery countdown timer
  function updateRecoveryCountdown() {
    if (!recoveryEndTime || !recoveryProgress || !recoveryTime) return;
    
    const now = new Date();
    const timeDiff = recoveryEndTime - now;
    
    if (timeDiff <= 0) {
      // Recovery complete
      stopRecoveryCountdown();
      showToast('Recovery complete! You can now continue scavenging.');
      return;
    }
    
    // Calculate progress percentage (inverted - starts at 0% and increases to 100%)
    const totalRecoveryTime = 10 * 60 * 1000; // 10 minutes in milliseconds
    const elapsedTime = totalRecoveryTime - timeDiff;
    const progressPercent = (elapsedTime / totalRecoveryTime) * 100;
    
    // Update progress bar
    recoveryProgress.style.width = `${Math.min(100, progressPercent)}%`;
    
    // Update time display
    const minutesLeft = Math.floor(timeDiff / 60000);
    const secondsLeft = Math.floor((timeDiff % 60000) / 1000);
    recoveryTime.textContent = `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`;
  }
  
  // Stop recovery countdown
  function stopRecoveryCountdown() {
    if (!combatRecoverySection) return;
    
    // Hide recovery section
    combatRecoverySection.classList.add('hidden');
    
    // Clear interval
    if (recoveryInterval) {
      clearInterval(recoveryInterval);
      recoveryInterval = null;
    }
    
    // Reset recovery end time
    recoveryEndTime = null;
  }
  
  // Add a message to the combat log
  function addCombatLogEntry(message) {
    if (!combatLogContainer) return;
    
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Add appropriate classes based on content
    if (message.includes('defeated') || message.includes('success')) {
      logEntry.classList.add('success');
    } else if (message.includes('attacks you') || message.includes('damage')) {
      logEntry.classList.add('danger');
    }
    
    logEntry.innerHTML = `<span class="log-time">[${timeString}]</span> ${message}`;
    combatLogContainer.appendChild(logEntry);
    
    // Scroll to the bottom of the log
    combatLogContainer.scrollTop = combatLogContainer.scrollHeight;
  }
  
  // Update the updateCombatStatus function to use consistent structure
  function updateCombatStatus() {
    if (!isInCombat) {
      if (combatIntervalId) {
        clearInterval(combatIntervalId);
        combatIntervalId = null;
      }
      return;
    }
    
    // Use the regular status endpoint since we don't have a dedicated combat endpoint
    fetch('/api/scavenge/status')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          if (data.data.currentCombat && data.data.currentCombat.monster) {
            // Update combat display
            const characterData = data.data.character || data.data.characterHealth;
            updateCombatDisplay(data.data.currentCombat, characterData);
          } else {
            // Combat ended
            isInCombat = false;
            endCombat(data.data.character || data.data.characterHealth);
            
            // Clear combat interval
            if (combatIntervalId) {
              clearInterval(combatIntervalId);
              combatIntervalId = null;
            }
            
            // Restart scavenge interval to resume normal scavenging
            if (isScavenging && !scavengeInterval) {
              scavengeInterval = setInterval(updateScavengeStatus, 1000);
            }
          }
        }
      })
      .catch(error => {
        console.error('Error updating combat status:', error);
      });
  }

  // Add combat-flash animation style to document head
  function addCombatStyles() {
    // Only add styles if they don't already exist
    if (!document.getElementById('combat-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'combat-styles';
      styleElement.textContent = `
        @keyframes combat-flash {
          0% { box-shadow: 0 0 15px rgba(255, 85, 85, 0.4); }
          50% { box-shadow: 0 0 25px rgba(255, 85, 85, 0.8); }
          100% { box-shadow: 0 0 15px rgba(255, 85, 85, 0.4); }
        }
        
        .combat-flash {
          animation: combat-flash 0.5s 3;
        }
        
        @keyframes pulse {
          0% { color: #f1fa8c; }
          50% { color: #ff5555; }
          100% { color: #f1fa8c; }
        }
        
        .pulse {
          animation: pulse 0.5s infinite;
        }
        
        .combat-overlay {
          position: relative;
          z-index: 100;
        }
        
        .combat-active {
          opacity: 0.6;
          pointer-events: none;
          filter: grayscale(50%);
          position: relative;
        }
        
        .combat-active::after {
          content: "Combat in progress...";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(255, 85, 85, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          font-weight: bold;
          z-index: 10;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }

  // Update the endCombat function to properly handle elapsed time
  function endCombat(character) {
    if (!combatWindow) return;
    
    // Add final combat message
    addCombatLogEntry('Combat ended!');
    
    // Clear combat interval
    if (combatIntervalId) {
        clearInterval(combatIntervalId);
        combatIntervalId = null;
    }
    
    // Clear combat round timer
    if (window.combatRoundTimeout) {
        clearInterval(window.combatRoundTimeout);
        window.combatRoundTimeout = null;
    }
    
    // After a delay, hide the combat window and restore scavenging
    setTimeout(() => {
        // Clear combat flag
        isInCombat = false;
        
        // Hide combat window
        combatWindow.classList.add('hidden');
        
        // Clear combat log
        if (combatLogContainer) {
            combatLogContainer.innerHTML = '';
        }
        
        // Remove combat active styling from scavenging section
        if (scavengeSection) {
            scavengeSection.classList.remove('combat-active');
        }
        
        // Show next event countdown again
        if (nextEventProgress && nextEventProgress.parentElement) {
            nextEventProgress.parentElement.style.display = '';
        }
        
        // Restart scavenging updates if still scavenging
        if (isScavenging && !scavengeInterval) {
            startScavengeInterval();
        }
    }, 2000);
    
    // Check if player died and needs recovery
    if (character && character.recoveryUntil) {
        const recoveryDate = new Date(character.recoveryUntil);
        if (recoveryDate > new Date()) {
            startRecoveryCountdown(recoveryDate);
        }
    }
  }
}); 