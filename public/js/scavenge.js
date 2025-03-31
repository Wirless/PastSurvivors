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
      const maxTime = 15;
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
    
    // Show combat window if hidden
    combatWindow.classList.remove('hidden');
    
    // Get the monster data
    const monster = combat.monster;
    
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
    
    // Update monster health with improved styling
    if (combatMonsterHealthBar && combatMonsterHealthValue) {
      const monsterHealthPercent = (monster.currentHealth / monster.health) * 100;
      combatMonsterHealthBar.style.width = `${Math.max(0, Math.min(100, monsterHealthPercent))}%`;
      combatMonsterHealthValue.innerHTML = `
        <span class="health-text">${monster.currentHealth}/${monster.health}</span>
      `;
      
      // Set health bar color based on percentage
      if (monsterHealthPercent < 25) {
        combatMonsterHealthBar.style.background = 'linear-gradient(to right, #ff0000, #ff3333)';
      } else if (monsterHealthPercent < 50) {
        combatMonsterHealthBar.style.background = 'linear-gradient(to right, #ff5500, #ff7733)';
      } else {
        combatMonsterHealthBar.style.background = 'linear-gradient(to right, #ff5555, #f14f5c)';
      }
    }
    
    // Update player health with improved styling
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
      combatPlayerHealthValue.innerHTML = `
        <span class="health-text">${current}/${max}</span>
      `;
      
      // Set health bar color based on percentage
      if (playerHealthPercent < 25) {
        combatPlayerHealthBar.style.background = 'linear-gradient(to right, #ff0000, #ff3333)';
      } else if (playerHealthPercent < 50) {
        combatPlayerHealthBar.style.background = 'linear-gradient(to right, #ff5500, #ff7733)';
      } else {
        combatPlayerHealthBar.style.background = 'linear-gradient(to right, #55ff55, #33ff33)';
      }
    }
    
    // Create or update combat stats container
    const statsContainer = document.querySelector('.combat-stats-container') || document.createElement('div');
    if (!statsContainer.classList.contains('combat-stats-container')) {
      statsContainer.classList.add('combat-stats-container');
      // Find where to insert the stats container (after monster name/before combat log)
      const insertPoint = combatMonsterName ? combatMonsterName.parentNode : combatWindow;
      insertPoint.appendChild(statsContainer);
    }
    
    // Update combat stats in the container
    statsContainer.innerHTML = `
      <div class="combat-stat">
        <span class="combat-stat-label">Round:</span>
        <span class="combat-stat-value">${combat.rounds || 0}</span>
      </div>
      <div class="combat-stat">
        <span class="combat-stat-label">Your Damage:</span>
        <span class="combat-stat-value">${combat.playerDamage || 0}</span>
      </div>
      <div class="combat-stat">
        <span class="combat-stat-label">Monster Damage:</span>
        <span class="combat-stat-value">${combat.monsterDamage || 0}</span>
      </div>
      <div class="combat-stat">
        <span class="combat-stat-label">XP Reward:</span>
        <span class="combat-stat-value">${monster.experience || 0}</span>
      </div>
    `;
    
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
    if (!combatWindow || !combat || !combat.monster) {
      console.error("Cannot start combat - missing required data", { combatWindow, combat });
      return;
    }
    
    console.log("Starting combat with monster:", combat.monster.name);
    
    // Set combat flag
    isInCombat = true;
    
    try {
      // Clear any existing intervals and timers to avoid conflicts
      // Only clear scavenging intervals, not combat timers
      if (scavengeInterval) {
        clearInterval(scavengeInterval);
        scavengeInterval = null;
      }
      
      if (window.elapsedTimerInterval) {
        clearInterval(window.elapsedTimerInterval);
        window.elapsedTimerInterval = null;
      }
      
      // Update UI to show combat mode
      updateCombatUI(true);
      
      // Initialize combat display
      console.log("Initializing combat display");
      showCombatWindow(combat, characterHealth);
      
      // Immediately trigger the first combat round with minimal delay
      console.log("Scheduling immediate first combat round");
      triggerCombatRound();
    } catch (error) {
      console.error("Error in startCombat:", error);
    }
  }

  // Update UI for combat mode
  function updateCombatUI(isCombatActive) {
    // Apply styles to combat section
    if (scavengeSection) {
      if (isCombatActive) {
        scavengeSection.classList.add('combat-active');
      } else {
        scavengeSection.classList.remove('combat-active');
      }
    }
    
    // Handle next event countdown visibility
    if (nextEventProgress && nextEventProgress.parentElement) {
      nextEventProgress.parentElement.style.display = isCombatActive ? 'none' : '';
    }
  }

  // Show and initialize the combat window
  function showCombatWindow(combat, characterHealth) {
    // Apply styling to combat window
    styleElementForCombat(combatWindow);
    
    // Show combat window
    combatWindow.classList.remove('hidden');
    
    // Set player name
    if (playerName && characterHealth) {
      const charName = characterHealth.name || 'Player';
      playerName.textContent = charName;
    }
    
    // Create the flashing effect to get user's attention
    combatWindow.classList.add('combat-flash');
    setTimeout(() => {
      combatWindow.classList.remove('combat-flash');
    }, 3000); // Longer flash duration
    
    // Clear and initialize combat log
    if (combatLogContainer) {
      combatLogContainer.innerHTML = '';
      addCombatLogEntry(`⚔️ COMBAT STARTED! ⚔️ You encounter a ${combat.monster.name}!`);
      addCombatLogEntry(`Ready your weapon! Combat rounds will occur every 2 seconds.`);
      addCombatLogEntry(`Your strength bonus: +${characterHealth.stats?.strength || '?'} damage`);
    }
    
    // Make sure combat window is visible to the user
    setTimeout(() => {
      combatWindow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    // Update the combat display with initial data
    updateCombatDisplay(combat, characterHealth);
    
    // Add a warning message at the top of the combat window
    const warningMsg = document.createElement('div');
    warningMsg.className = 'combat-warning';
    warningMsg.innerHTML = `
      <span class="combat-alert">⚠️ COMBAT IN PROGRESS ⚠️</span>
      <p>Scavenging is paused until combat resolves</p>
    `;
    warningMsg.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    warningMsg.style.color = '#ff9999';
    warningMsg.style.padding = '10px';
    warningMsg.style.marginBottom = '15px';
    warningMsg.style.borderRadius = '5px';
    warningMsg.style.textAlign = 'center';
    warningMsg.style.fontWeight = 'bold';
    
    combatWindow.insertBefore(warningMsg, combatWindow.firstChild);
  }

  // Helper function to clear all intervals and timers
  function clearAllIntervals() {
    // Clear scavenging interval
    if (scavengeInterval) {
      clearInterval(scavengeInterval);
      scavengeInterval = null;
    }
    
    // Clear elapsed timer interval
    if (window.elapsedTimerInterval) {
      clearInterval(window.elapsedTimerInterval);
      window.elapsedTimerInterval = null;
    }
    
    // Clear combat round timeout
    if (window.combatRoundTimeout) {
      clearTimeout(window.combatRoundTimeout);
      window.combatRoundTimeout = null;
    }
    
    // Clear combat interval
    if (combatIntervalId) {
      clearInterval(combatIntervalId);
      combatIntervalId = null;
    }
  }

  // Style element for combat
  function styleElementForCombat(element) {
    element.style.zIndex = "1000";  // Higher z-index
    element.style.position = "relative";
    element.style.backgroundColor = "#1c1c24";
    element.style.border = "5px solid #ff5555"; // Thicker border
    element.style.borderRadius = "8px";
    element.style.padding = "20px";
    element.style.marginBottom = "30px";
    element.style.boxShadow = "0 0 30px rgba(255, 85, 85, 0.8)"; // Brighter glow
    element.style.transition = "all 0.3s ease";
    element.style.transform = "translateY(0)";
    element.style.animation = "combat-bounce 0.5s ease";
    
    // Add animation keyframe if it doesn't exist
    if (!document.getElementById('combat-bounce-keyframes')) {
      const bounceKeyframes = document.createElement('style');
      bounceKeyframes.id = 'combat-bounce-keyframes';
      bounceKeyframes.textContent = `
        @keyframes combat-bounce {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(bounceKeyframes);
    }
  }

  // Start the first combat round
  function startFirstCombatRound() {
    if (!isInCombat) return;
    
    console.log("Starting first combat round immediately");
    
    // Skip status check and directly trigger the round
    triggerCombatRound();
  }

  // Trigger a combat round with the server
  async function triggerCombatRound() {
    if (!isInCombat) {
      console.error("Not in combat, can't trigger round");
      return;
    }
    
    console.log("Attempting to trigger combat round...");
    
    // Clear any existing timer
    if (window.combatRoundTimeout) {
      clearTimeout(window.combatRoundTimeout);
      window.combatRoundTimeout = null;
    }
    
    try {
      console.log("Sending combat round POST request");
      const response = await fetch('/api/scavenge/combat-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Server returned error status: ${response.status}`);
        throw new Error(`Server returned ${response.status}`);
      }
      
      console.log("Combat round POST request successful, parsing response");
      const data = await response.json();
      console.log("Combat round full response:", data);
      
      if (data.success) {
        // Check if combat has ended
        if (!data.data.combat || data.data.combat.ended) {
          console.log("Combat has ended in response");
          isInCombat = false;
          endCombat(data.data.character);
          return;
        }
        
        // Update the combat display with new data
        console.log("Updating combat display with response data");
        updateCombatDisplay(data.data.combat, data.data.character);
        
        // Schedule next round
        console.log("Scheduling next round");
        scheduleNextRound();
      } else {
        console.error('Combat round failed:', data.message);
        // If we get an error, try to check status and maybe end combat
        setTimeout(() => updateCombatStatus(), 1000);
      }
    } catch (error) {
      console.error('Error triggering combat round:', error);
      // If we get an error, try to check status and maybe end combat
      setTimeout(() => updateCombatStatus(), 1000);
    }
  }

  // Schedule the next combat round
  function scheduleNextRound() {
    if (!isInCombat) {
      console.log("Not scheduling next round because combat ended");
      return;
    }
    
    // Clear any existing intervals or timeouts first
    if (window.combatRoundTimeout) {
      clearTimeout(window.combatRoundTimeout);
      window.combatRoundTimeout = null;
    }
    
    if (window.currentCountdownInterval) {
      clearInterval(window.currentCountdownInterval);
      window.currentCountdownInterval = null;
    }
    
    // Fixed 2 second delay between rounds
    const roundDelay = 2000;
    
    console.log(`Scheduling next combat round in ${roundDelay}ms`);
    
    // Start the countdown display
    startRoundCountdown(roundDelay / 1000);
    
    // Schedule the next round with a direct function call to triggerCombatRound
    window.combatRoundTimeout = setTimeout(function() {
      console.log("Timeout triggered for next combat round");
      if (isInCombat) {
        triggerCombatRound();
      } else {
        console.log("Combat ended before next round could start");
      }
    }, roundDelay);
  }

  // Show countdown for next round
  function startRoundCountdown(seconds) {
    if (!combatRoundTimer || !isInCombat) return;
    
    // Initial display
    combatRoundTimer.textContent = `${Math.ceil(seconds)}s`;
    combatRoundTimer.classList.remove('pulse');
    
    // Start a counter to update every 500ms for smoother countdown
    let remainingTime = seconds;
    const updateInterval = 500; // update every 500ms
    
    const countdownInterval = setInterval(() => {
      remainingTime -= updateInterval / 1000;
      
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        combatRoundTimer.textContent = 'Next';
        combatRoundTimer.classList.add('pulse');
        return;
      }
      
      combatRoundTimer.textContent = `${Math.ceil(remainingTime)}s`;
    }, updateInterval);
    
    // Clean up interval when next round starts
    window.currentCountdownInterval = countdownInterval;
  }

  // Update the combat status manually
  function updateCombatStatus() {
    if (!isInCombat) return;
    
    console.log("Manually updating combat status");
    
    // Use the regular status endpoint to check combat status
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
            console.log("Combat ended according to status check");
            isInCombat = false;
            endCombat(data.data.character || data.data.characterHealth);
          }
        }
      })
      .catch(error => {
        console.error('Error updating combat status:', error);
      });
  }

  // End combat and return to scavenging
  function endCombat(character) {
    if (!combatWindow) return;
    
    console.log("Ending combat");
    
    // Clear all combat timers
    if (window.combatRoundTimeout) {
      clearTimeout(window.combatRoundTimeout);
      window.combatRoundTimeout = null;
    }
    
    if (window.currentCountdownInterval) {
      clearInterval(window.currentCountdownInterval);
      window.currentCountdownInterval = null;
    }
    
    // Add final combat message
    addCombatLogEntry('Combat ended!');
    
    // After a delay, hide the combat window and restore scavenging
    setTimeout(() => {
      // Clear combat flag
      isInCombat = false;
      
      // Hide combat window
      combatWindow.classList.add('hidden');
      
      // Remove combat active styling from scavenging section
      if (scavengeSection) {
        scavengeSection.classList.remove('combat-active');
      }
      
      // Show next event countdown again
      if (nextEventProgress && nextEventProgress.parentElement) {
        nextEventProgress.parentElement.style.display = '';
      }
      
      // Restart scavenging updates if still scavenging
      if (isScavenging) {
        startScavengeInterval();
      }
      
      // Check if player died and needs recovery
      if (character && character.recoveryUntil) {
        const recoveryDate = new Date(character.recoveryUntil);
        if (recoveryDate > new Date()) {
          startRecoveryCountdown(recoveryDate);
        }
      }
    }, 2000);
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
          50% { box-shadow: 0 0 30px rgba(255, 85, 85, 0.9); }
          100% { box-shadow: 0 0 15px rgba(255, 85, 85, 0.4); }
        }
        
        .combat-flash {
          animation: combat-flash 0.5s 5; /* More flashes */
        }
        
        @keyframes pulse {
          0% { color: #f1fa8c; transform: scale(1); }
          50% { color: #ff5555; transform: scale(1.1); }
          100% { color: #f1fa8c; transform: scale(1); }
        }
        
        .pulse {
          animation: pulse 0.5s infinite;
          display: inline-block;
          font-weight: bold;
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
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        
        #combat-window {
          transition: all 0.3s ease;
        }
        
        #combat-round-timer {
          font-weight: bold;
          transition: all 0.2s ease;
        }
        
        /* Health bar animations */
        #combat-player-health-bar, #combat-monster-health-bar {
          transition: width 0.5s ease-in-out;
        }
        
        /* Combat stats positioning */
        .combat-stats-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        
        .combat-stat {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 5px;
          padding: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .combat-stat-label {
          font-weight: bold;
          color: #f1fa8c;
        }
        
        .combat-stat-value {
          font-weight: bold;
          color: #ff5555;
        }
        
        /* Health bars */
        .health-bar-container {
          height: 24px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          margin: 10px 0;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .health-bar {
          height: 100%;
          background: linear-gradient(to right, #ff5555, #f14f5c);
          border-radius: 12px;
          transition: width 0.5s ease;
        }
        
        .health-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          text-shadow: 1px 1px 2px black;
          z-index: 2;
        }
      `;
      document.head.appendChild(styleElement);
    }
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

  // Add this after the DOM loaded event listener setup
  function initCombatDebugTools() {
    // Check if we're in development mode
    const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isDevMode) {
      // Create a debug button container
      const debugContainer = document.createElement('div');
      debugContainer.style.position = 'fixed';
      debugContainer.style.bottom = '10px';
      debugContainer.style.right = '10px';
      debugContainer.style.zIndex = '9999';
      debugContainer.style.padding = '10px';
      debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      debugContainer.style.borderRadius = '5px';
      
      // Add a button to force combat
      const debugButton = document.createElement('button');
      debugButton.textContent = 'Force Combat Round';
      debugButton.style.padding = '5px 10px';
      debugButton.style.marginRight = '5px';
      debugButton.style.backgroundColor = '#ff5555';
      debugButton.style.color = 'white';
      debugButton.style.border = 'none';
      debugButton.style.borderRadius = '3px';
      debugButton.style.cursor = 'pointer';
      
      debugButton.addEventListener('click', () => {
        console.log('Manual combat round triggered');
        if (isInCombat) {
          triggerCombatRound();
        } else {
          // Try to force a combat encounter
          fetch('/api/scavenge/force-combat/any', {
            method: 'POST'
          })
          .then(r => r.json())
          .then(data => {
            console.log('Force combat response:', data);
            if (data.success) {
              isInCombat = true;
              startCombat(data.data.combat, data.data.character);
            }
          })
          .catch(err => console.error('Error forcing combat:', err));
        }
      });
      
      // Add a status check button
      const statusButton = document.createElement('button');
      statusButton.textContent = 'Check DOM Elements';
      statusButton.style.padding = '5px 10px';
      statusButton.style.backgroundColor = '#5555ff';
      statusButton.style.color = 'white';
      statusButton.style.border = 'none';
      statusButton.style.borderRadius = '3px';
      statusButton.style.cursor = 'pointer';
      
      statusButton.addEventListener('click', () => {
        console.log('Checking combat DOM elements');
        checkCombatDomElements();
      });
      
      debugContainer.appendChild(debugButton);
      debugContainer.appendChild(statusButton);
      document.body.appendChild(debugContainer);
    }
  }

  // Function to check if all combat DOM elements exist
  function checkCombatDomElements() {
    const elements = {
      'Combat Window': combatWindow,
      'Player Health Bar': combatPlayerHealthBar,
      'Player Health Value': combatPlayerHealthValue,
      'Monster Health Bar': combatMonsterHealthBar,
      'Monster Health Value': combatMonsterHealthValue,
      'Monster Name': combatMonsterName,
      'Monster Damage': combatMonsterDamage,
      'Monster XP': combatMonsterXP,
      'Round Count': combatRoundCount,
      'Player Damage': combatPlayerDamage,
      'Monster Damage Dealt': combatMonsterDamageDealt,
      'Round Timer': combatRoundTimer,
      'Combat Log': combatLogContainer,
      'Player Name': playerName,
      'Monster Image': monsterImage
    };
    
    console.group('Combat DOM Elements Check');
    let allElementsExist = true;
    
    for (const [name, element] of Object.entries(elements)) {
      const exists = !!element;
      console.log(`${name}: ${exists ? 'Found ✓' : 'Missing ✗'}`);
      if (!exists) allElementsExist = false;
    }
    
    console.log(`Overall Status: ${allElementsExist ? 'All elements found ✓' : 'Missing elements detected ✗'}`);
    console.groupEnd();
    
    return allElementsExist;
  }

  // Initialize debug tools after page load
  initCombatDebugTools();
}); 