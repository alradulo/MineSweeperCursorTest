/**
 * PowerUps - Power-up system management
 */
const PowerUps = (function() {
  let inventory = [];
  let shieldActive = false;
  let freezeActive = false;
  let freezeEndTime = 0;
  let detectorTimeout = null;
  let onInventoryChange = null;
  let onShieldChange = null;
  let onFreezeChange = null;
  
  /**
   * Reset power-up state
   */
  function reset() {
    inventory = [];
    shieldActive = false;
    freezeActive = false;
    freezeEndTime = 0;
    
    if (detectorTimeout) {
      clearTimeout(detectorTimeout);
      detectorTimeout = null;
    }
    
    notifyInventoryChange();
  }
  
  /**
   * Set callback for inventory changes
   * @param {Function} callback - Callback function
   */
  function setOnInventoryChange(callback) {
    onInventoryChange = callback;
  }
  
  /**
   * Set callback for shield state changes
   * @param {Function} callback - Callback function
   */
  function setOnShieldChange(callback) {
    onShieldChange = callback;
  }
  
  /**
   * Set callback for freeze state changes
   * @param {Function} callback - Callback function
   */
  function setOnFreezeChange(callback) {
    onFreezeChange = callback;
  }
  
  /**
   * Notify inventory change listeners
   */
  function notifyInventoryChange() {
    if (onInventoryChange) {
      onInventoryChange([...inventory]);
    }
  }
  
  /**
   * Collect a power-up
   * @param {string} type - Power-up type
   */
  function collect(type) {
    // Shield is auto-activated immediately
    if (type === 'shield') {
      activateShield();
      return;
    }
    
    // Other power-ups go to inventory
    inventory.push({
      type,
      id: Date.now() + Math.random()
    });
    
    notifyInventoryChange();
    Sound.playPowerup();
  }
  
  /**
   * Use a power-up from inventory
   * @param {string} type - Power-up type
   * @param {Object} game - Game instance for power-up effects
   * @returns {boolean} Whether power-up was used
   */
  function use(type, game) {
    const index = inventory.findIndex(p => p.type === type);
    if (index === -1) return false;
    
    inventory.splice(index, 1);
    notifyInventoryChange();
    
    switch (type) {
      case 'detector':
        activateDetector(game);
        break;
      case 'freeze':
        activateFreeze(game);
        break;
      case 'safeReveal':
        activateSafeReveal(game);
        break;
    }
    
    return true;
  }
  
  /**
   * Activate shield power-up
   */
  function activateShield() {
    shieldActive = true;
    Sound.playShieldActivate();
    
    if (onShieldChange) {
      onShieldChange(true);
    }
  }
  
  /**
   * Check if shield is active and consume it
   * @returns {boolean} Whether shield was active and consumed
   */
  function consumeShield() {
    if (!shieldActive) return false;
    
    shieldActive = false;
    Sound.playShieldBreak();
    
    if (onShieldChange) {
      onShieldChange(false);
    }
    
    return true;
  }
  
  /**
   * Check if shield is currently active
   * @returns {boolean} Shield state
   */
  function hasShield() {
    return shieldActive;
  }
  
  /**
   * Activate detector power-up
   * @param {Object} game - Game instance
   */
  function activateDetector(game) {
    const mine = Board.getRandomUnflaggedMine(game.board);
    if (!mine) return;
    
    Sound.playDetector();
    
    // Highlight the mine
    const cellEl = document.querySelector(`[data-row="${mine.row}"][data-col="${mine.col}"]`);
    if (cellEl) {
      cellEl.classList.add('detector-highlight');
      
      // Remove highlight after duration
      detectorTimeout = setTimeout(() => {
        cellEl.classList.remove('detector-highlight');
        detectorTimeout = null;
      }, game.config.powerups.types.detector.duration || 3000);
    }
  }
  
  /**
   * Activate time freeze power-up
   * @param {Object} game - Game instance
   */
  function activateFreeze(game) {
    const duration = game.config.powerups.types.freeze.duration || 15000;
    
    freezeActive = true;
    freezeEndTime = Date.now() + duration;
    
    Sound.playFreeze();
    
    if (onFreezeChange) {
      onFreezeChange(true, duration);
    }
    
    // Auto-deactivate after duration
    setTimeout(() => {
      if (freezeActive && Date.now() >= freezeEndTime) {
        freezeActive = false;
        if (onFreezeChange) {
          onFreezeChange(false, 0);
        }
      }
    }, duration);
  }
  
  /**
   * Check if timer is frozen
   * @returns {boolean} Freeze state
   */
  function isTimerFrozen() {
    if (freezeActive && Date.now() >= freezeEndTime) {
      freezeActive = false;
      if (onFreezeChange) {
        onFreezeChange(false, 0);
      }
    }
    return freezeActive;
  }
  
  /**
   * Activate safe reveal power-up
   * @param {Object} game - Game instance
   */
  function activateSafeReveal(game) {
    const cellCount = game.config.powerups.types.safeReveal.cellCount || 3;
    const revealed = [];
    
    for (let i = 0; i < cellCount; i++) {
      const cell = Board.getRandomSafeCell(game.board);
      if (cell) {
        const result = Board.revealCell(game.board, cell.row, cell.col);
        revealed.push(...result.revealed);
      }
    }
    
    // Update UI
    if (revealed.length > 0) {
      Sound.playSparkle();
      game.updateCells(revealed);
    }
  }
  
  /**
   * Get current inventory
   * @returns {Array} Copy of inventory
   */
  function getInventory() {
    return [...inventory];
  }
  
  /**
   * Check if player has a specific power-up
   * @param {string} type - Power-up type
   * @returns {boolean} Whether player has the power-up
   */
  function has(type) {
    return inventory.some(p => p.type === type);
  }
  
  /**
   * Get count of specific power-up type
   * @param {string} type - Power-up type
   * @returns {number} Count
   */
  function count(type) {
    return inventory.filter(p => p.type === type).length;
  }
  
  return {
    reset,
    setOnInventoryChange,
    setOnShieldChange,
    setOnFreezeChange,
    collect,
    use,
    consumeShield,
    hasShield,
    isTimerFrozen,
    getInventory,
    has,
    count
  };
})();

