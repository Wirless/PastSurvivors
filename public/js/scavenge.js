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
  
  let locations = [];
  let activeLocation = null;
  let scavengeInterval = null;
  let isScavenging = false;
  let scavengeStartTime = null;
  
  // Initialize the page
  try {
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
      const response = await fetch(`/api/scavenge/start/${activeLocation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        isScavenging = true;
        updateScavengingUI(true);
        scavengeStartTime = Date.now();
        
        // Start the update interval
        startScavengeInterval();
        
        // Update UI with initial data
        if (data.data.location) {
          activeLocation = data.data.location;
        }
        
        // Show toast
        showToast('Scavenging started!');
      } else {
        showError(data.message || 'Could not start scavenging');
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
    
    // Also start a timer to update the elapsed time display
    const elapsedTimer = document.getElementById('elapsed-time');
    if (elapsedTimer) {
      setInterval(() => {
        if (!scavengeStartTime) return;
        
        const elapsed = Date.now() - scavengeStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        elapsedTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
    }
  }
  
  // Update scavenging status
  async function updateScavengeStatus() {
    if (!isScavenging) return;
    
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
          
          // Update combat information if available
          if (data.data.currentCombat) {
            updateCombatDisplay(data.data.currentCombat, data.data.characterHealth);
          } else {
            // Hide combat panel if no active combat
            const combatPanel = document.getElementById('combat-panel');
            if (combatPanel) {
              combatPanel.classList.add('hidden');
            }
          }
          
          // Update countdown for next event if available
          if (data.data.nextEventIn !== null) {
            updateNextEventCountdown(data.data.nextEventIn);
          }
        } else {
          // Scavenging ended elsewhere (maybe in another tab)
          isScavenging = false;
          updateScavengingUI(false);
          clearInterval(scavengeInterval);
          
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
      // Get the max time between events (we know it's between 15-60 seconds from the controller)
      const maxTime = 60;
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
    
    // Add log entries
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      
      // Add appropriate classes based on content
      if (log.message.includes('defeated') || log.message.includes('found')) {
        logEntry.classList.add('success');
      } else if (log.message.includes('attacks you') || log.message.includes('damage')) {
        logEntry.classList.add('danger');
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
    const combatPanel = document.getElementById('combat-panel');
    if (!combatPanel) return;
    
    // Show combat panel
    combatPanel.classList.remove('hidden');
    
    // Update monster info
    const monster = combat.monster;
    const monsterNameElement = document.getElementById('monster-name');
    const monsterHealthBar = document.getElementById('monster-health-bar');
    const monsterHealthValue = document.getElementById('monster-health-value');
    
    if (monsterNameElement) monsterNameElement.textContent = monster.name;
    
    if (monsterHealthBar && monsterHealthValue) {
      const monsterHealthPercent = (monster.currentHealth / monster.health) * 100;
      monsterHealthBar.style.width = `${Math.max(0, Math.min(100, monsterHealthPercent))}%`;
      monsterHealthValue.textContent = `${monster.currentHealth}/${monster.health}`;
    }
    
    // Update player health
    const playerHealthBar = document.getElementById('player-health-bar');
    const playerHealthValue = document.getElementById('player-health-value');
    
    if (playerHealthBar && playerHealthValue && characterHealth) {
      const playerHealthPercent = (characterHealth.current / characterHealth.max) * 100;
      playerHealthBar.style.width = `${Math.max(0, Math.min(100, playerHealthPercent))}%`;
      playerHealthValue.textContent = `${characterHealth.current}/${characterHealth.max}`;
    }
    
    // Update combat round and damage info
    const combatRoundElement = document.getElementById('combat-round');
    const playerDamageElement = document.getElementById('player-damage');
    const monsterDamageElement = document.getElementById('monster-damage');
    
    if (combatRoundElement) combatRoundElement.textContent = combat.rounds;
    if (playerDamageElement) playerDamageElement.textContent = combat.playerDamage;
    if (monsterDamageElement) monsterDamageElement.textContent = combat.monsterDamage;
    
    // Update monster image if available
    const monsterImageContainer = document.getElementById('monster-image-container');
    if (monsterImageContainer) {
      if (monster.image) {
        monsterImageContainer.innerHTML = `<img src="${monster.image}" alt="${monster.name}" class="monster-image">`;
      } else {
        monsterImageContainer.innerHTML = `<div class="monster-placeholder">${monster.name}</div>`;
      }
    }
    
    // Update combat status
    const combatStatusElement = document.getElementById('combat-status');
    if (combatStatusElement) {
      if (monster.currentHealth <= 0) {
        combatStatusElement.textContent = `You defeated the ${monster.name}!`;
      } else if (characterHealth && characterHealth.current <= 0) {
        combatStatusElement.textContent = 'You were knocked unconscious!';
      } else {
        combatStatusElement.textContent = `Combat in progress. Attack round: ${combat.rounds}`;
      }
    }
  }
}); 