/**
 * Game - Main game controller
 */
const Game = (function() {
  let config = null;
  let board = null;
  let gameState = 'idle'; // idle, playing, won, lost
  let difficulty = 'beginner';
  let timer = 0;
  let timerInterval = null;
  let timerFrozenUntil = 0;
  
  // Settings
  let powerupsEnabled = true;
  let soundEnabled = true;
  
  // High scores
  let highScores = {
    beginner: [],
    intermediate: [],
    expert: []
  };
  
  /**
   * Load configuration from config.json
   */
  async function loadConfig() {
    try {
      const response = await fetch('config.json');
      config = await response.json();
    } catch (e) {
      console.warn('Could not load config.json, using defaults');
      config = getDefaultConfig();
    }
    
    // Apply config
    if (config.timing && config.timing.longPressMs) {
      Input.setLongPressMs(config.timing.longPressMs);
    }
    
    powerupsEnabled = config.powerups ? config.powerups.enabled : true;
    soundEnabled = config.sound ? config.sound.enabled : true;
    
    if (config.sound && config.sound.volume !== undefined) {
      Sound.setVolume(config.sound.volume);
    }
  }
  
  /**
   * Get default configuration
   * @returns {Object} Default config
   */
  function getDefaultConfig() {
    return {
      difficulties: {
        beginner: { rows: 9, cols: 9, mines: 10 },
        intermediate: { rows: 16, cols: 16, mines: 40 },
        expert: { rows: 16, cols: 30, mines: 99 }
      },
      powerups: {
        enabled: true,
        spawnChance: 0.05,
        types: {
          shield: { name: 'Shield', duration: 0 },
          detector: { name: 'Detector', duration: 3000 },
          freeze: { name: 'Time Freeze', duration: 15000 },
          safeReveal: { name: 'Safe Reveal', cellCount: 3 }
        }
      },
      timing: {
        longPressMs: 500,
        maxTimer: 999,
        cascadeDelayMs: 15
      },
      sound: {
        enabled: true,
        volume: 0.5
      }
    };
  }
  
  /**
   * Initialize the game
   */
  async function init() {
    await loadConfig();
    loadHighScores();
    
    UI.init();
    Sound.init();
    
    // Set up power-up callbacks
    PowerUps.setOnInventoryChange((inventory) => {
      UI.updatePowerupInventory(inventory, usePowerup);
    });
    
    PowerUps.setOnShieldChange((active) => {
      UI.setShieldActive(active);
    });
    
    PowerUps.setOnFreezeChange((frozen, duration) => {
      UI.setTimerFrozen(frozen);
      if (frozen) {
        timerFrozenUntil = Date.now() + duration;
      }
    });
    
    // Set up UI event handlers
    setupUIEvents();
    
    // Start a new game
    newGame();
  }
  
  /**
   * Set up UI event handlers
   */
  function setupUIEvents() {
    // Face button - new game
    UI.getFaceButton().addEventListener('click', () => {
      Sound.init(); // Ensure audio context is active
      newGame();
    });
    
    // Menu buttons
    document.getElementById('gameMenu').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown('gameDropdown');
    });
    
    document.getElementById('helpMenu').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown('helpDropdown');
    });
    
    // Dropdown actions
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', handleDropdownAction);
    });
    
    // Close dropdowns when clicking elsewhere
    document.addEventListener('click', () => {
      closeAllDropdowns();
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Modal footer buttons
    document.querySelectorAll('.modal-footer .btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Play again button
    document.getElementById('playAgainBtn').addEventListener('click', () => {
      const nameInput = document.getElementById('playerName');
      if (nameInput.offsetParent !== null) { // visible
        saveHighScore(nameInput.value || 'Player');
      }
      UI.hideModal('gameOverModal');
      newGame();
    });
    
    // High score tabs
    document.querySelectorAll('.highscore-tabs .tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.highscore-tabs .tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        UI.updateHighScores(highScores[e.target.dataset.difficulty] || []);
      });
    });
    
    // Clear scores button
    document.getElementById('clearScores').addEventListener('click', () => {
      const activeTab = document.querySelector('.highscore-tabs .tab.active');
      if (activeTab) {
        highScores[activeTab.dataset.difficulty] = [];
        saveHighScores();
        UI.updateHighScores([]);
      }
    });
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('volumeSlider').value = Sound.volume * 100 || 50;
      document.getElementById('powerupsToggle').checked = powerupsEnabled;
      UI.showModal('settingsModal');
    });
    
    document.getElementById('settingsSave').addEventListener('click', () => {
      const volume = parseInt(document.getElementById('volumeSlider').value, 10) / 100;
      powerupsEnabled = document.getElementById('powerupsToggle').checked;
      
      Sound.setVolume(volume);
      UI.setPowerupsEnabled(powerupsEnabled);
      UI.updateMenuState({ powerupsEnabled, soundEnabled });
      
      UI.hideModal('settingsModal');
    });
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        newGame();
      } else if (e.key === 'Escape') {
        UI.hideAllModals();
        closeAllDropdowns();
      }
    });
  }
  
  /**
   * Toggle dropdown menu
   * @param {string} dropdownId - Dropdown ID
   */
  function toggleDropdown(dropdownId) {
    closeAllDropdowns();
    const dropdown = document.getElementById(dropdownId);
    dropdown.classList.toggle('active');
    
    // Position dropdown
    const menuBtn = dropdownId === 'gameDropdown' 
      ? document.getElementById('gameMenu')
      : document.getElementById('helpMenu');
    
    const rect = menuBtn.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = rect.bottom + 'px';
  }
  
  /**
   * Close all dropdowns
   */
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('active'));
  }
  
  /**
   * Handle dropdown menu actions
   * @param {Event} e - Click event
   */
  function handleDropdownAction(e) {
    const action = e.target.dataset.action;
    closeAllDropdowns();
    Sound.init(); // Ensure audio context
    
    switch (action) {
      case 'new':
        newGame();
        break;
      case 'beginner':
      case 'intermediate':
      case 'expert':
        setDifficulty(action);
        break;
      case 'togglePowerups':
        powerupsEnabled = !powerupsEnabled;
        UI.updateMenuState({ powerupsEnabled, soundEnabled });
        UI.setPowerupsEnabled(powerupsEnabled);
        break;
      case 'toggleSound':
        soundEnabled = !soundEnabled;
        Sound.setEnabled(soundEnabled);
        UI.updateMenuState({ powerupsEnabled, soundEnabled });
        break;
      case 'highscores':
        UI.updateHighScores(highScores[difficulty] || []);
        document.querySelectorAll('.highscore-tabs .tab').forEach(t => {
          t.classList.toggle('active', t.dataset.difficulty === difficulty);
        });
        UI.showModal('highscoresModal');
        break;
      case 'howToPlay':
        UI.showModal('helpModal');
        break;
      case 'about':
        alert('Minesweeper\nA classic game with power-ups!\n\nBuilt with vanilla JavaScript.');
        break;
    }
  }
  
  /**
   * Set difficulty level
   * @param {string} level - Difficulty level
   */
  function setDifficulty(level) {
    difficulty = level;
    UI.setActiveDifficulty(level);
    newGame();
  }
  
  /**
   * Start a new game
   */
  function newGame() {
    // Stop timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    // Reset state
    gameState = 'idle';
    timer = 0;
    timerFrozenUntil = 0;
    
    // Get difficulty settings
    const settings = config.difficulties[difficulty];
    
    // Create board
    const powerupConfig = powerupsEnabled ? config.powerups : null;
    board = Board.create(settings.rows, settings.cols, settings.mines, powerupConfig);
    
    // Reset power-ups
    PowerUps.reset();
    
    // Update UI
    UI.createBoard(board);
    UI.updateMineCounter(settings.mines);
    UI.updateTimer(0);
    UI.setFace('smile');
    UI.setShieldActive(false);
    UI.setTimerFrozen(false);
    UI.setActiveDifficulty(difficulty);
    UI.updateMenuState({ powerupsEnabled, soundEnabled });
    UI.setPowerupsEnabled(powerupsEnabled);
    
    // Set up input handlers
    Input.init(UI.getBoardElement(), {
      onReveal: handleReveal,
      onFlag: handleFlag,
      onChord: handleChord,
      onCellPress: handleCellPress,
      onCellRelease: handleCellRelease
    });
  }
  
  /**
   * Start the game timer
   */
  function startTimer() {
    if (timerInterval) return;
    
    timerInterval = setInterval(() => {
      // Check if timer is frozen
      if (PowerUps.isTimerFrozen() || Date.now() < timerFrozenUntil) {
        return;
      }
      
      timer++;
      if (timer > (config.timing.maxTimer || 999)) {
        timer = config.timing.maxTimer || 999;
      }
      UI.updateTimer(timer);
    }, 1000);
  }
  
  /**
   * Handle cell reveal
   * @param {number} row - Row index
   * @param {number} col - Column index
   */
  function handleReveal(row, col) {
    if (gameState === 'won' || gameState === 'lost') return;
    
    const cell = Board.getCell(board, row, col);
    if (!cell || cell.isRevealed || cell.isFlagged) return;
    
    // First click - place mines
    if (!board.minesPlaced) {
      Board.placeMines(board, row, col);
      gameState = 'playing';
      startTimer();
    }
    
    // Reveal cell
    const result = Board.revealCell(board, row, col);
    
    if (result.hitMine) {
      // Check for shield
      if (PowerUps.consumeShield()) {
        // Shield saved us! Mark the mine as flagged instead
        result.explodedCell.isRevealed = false;
        result.explodedCell.isFlagged = true;
        UI.updateCell(result.explodedCell);
        updateMineCounter();
        Sound.playClick();
        return;
      }
      
      gameOver(false, result.explodedCell);
      return;
    }
    
    // Play sound
    if (result.revealed.length > 1) {
      // Cascade reveal with animation
      UI.updateCellsCascade(result.revealed, config.timing.cascadeDelayMs || 15);
    } else if (result.revealed.length === 1) {
      Sound.playClick();
      UI.updateCell(result.revealed[0]);
    }
    
    // Handle power-up
    if (result.powerup) {
      PowerUps.collect(result.powerup);
    }
    
    // Check win
    if (Board.checkWin(board)) {
      gameOver(true);
    }
  }
  
  /**
   * Handle cell flag
   * @param {number} row - Row index
   * @param {number} col - Column index
   */
  function handleFlag(row, col) {
    if (gameState === 'won' || gameState === 'lost') return;
    if (!board.minesPlaced) return; // Can't flag before first click
    
    const result = Board.toggleFlag(board, row, col);
    
    if (result.changed) {
      UI.updateCell(result.cell);
      updateMineCounter();
      
      if (result.cell.isFlagged) {
        Sound.playFlag();
      } else {
        Sound.playUnflag();
      }
    }
  }
  
  /**
   * Handle chord reveal (both buttons)
   * @param {number} row - Row index
   * @param {number} col - Column index
   */
  function handleChord(row, col) {
    if (gameState === 'won' || gameState === 'lost') return;
    if (!board.minesPlaced) return;
    
    const result = Board.chordReveal(board, row, col);
    
    if (result.hitMine) {
      // Check for shield
      if (PowerUps.consumeShield()) {
        result.explodedCell.isRevealed = false;
        result.explodedCell.isFlagged = true;
        
        // Update all revealed cells except the exploded one
        for (const cell of result.revealed) {
          if (cell !== result.explodedCell) {
            UI.updateCell(cell);
          }
        }
        UI.updateCell(result.explodedCell);
        updateMineCounter();
        return;
      }
      
      gameOver(false, result.explodedCell);
      return;
    }
    
    if (result.revealed.length > 0) {
      UI.updateCellsCascade(result.revealed, config.timing.cascadeDelayMs || 15);
      
      if (result.powerup) {
        PowerUps.collect(result.powerup);
      }
    }
    
    if (Board.checkWin(board)) {
      gameOver(true);
    }
  }
  
  /**
   * Handle cell press (for surprised face)
   */
  function handleCellPress(row, col) {
    if (gameState === 'playing' || gameState === 'idle') {
      UI.setFace('surprised');
    }
  }
  
  /**
   * Handle cell release
   */
  function handleCellRelease() {
    if (gameState === 'playing' || gameState === 'idle') {
      UI.setFace('smile');
    }
  }
  
  /**
   * Update mine counter based on flags
   */
  function updateMineCounter() {
    const flagCount = Board.getFlagCount(board);
    const remaining = board.mineCount - flagCount;
    UI.updateMineCounter(remaining);
  }
  
  /**
   * End the game
   * @param {boolean} won - Whether player won
   * @param {Object} explodedCell - Cell that exploded (if lost)
   */
  function gameOver(won, explodedCell = null) {
    gameState = won ? 'won' : 'lost';
    
    // Stop timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    if (won) {
      UI.setFace('cool');
      Sound.playVictory();
      UI.celebrate();
      
      // Flag all remaining mines
      for (const cell of board.cells) {
        if (cell.isMine && !cell.isFlagged) {
          cell.isFlagged = true;
          UI.updateCell(cell);
        }
      }
      UI.updateMineCounter(0);
      
      // Check for high score
      const isHighScore = checkHighScore(timer);
      
      setTimeout(() => {
        UI.showGameOver(true, timer, isHighScore);
      }, 500);
    } else {
      UI.setFace('dead');
      Sound.playExplosion();
      UI.shakeBoard();
      
      // Mark exploded cell
      if (explodedCell) {
        explodedCell.exploded = true;
      }
      
      // Reveal all mines
      const mines = Board.revealAllMines(board);
      for (const cell of mines) {
        UI.updateCell(cell);
      }
      
      setTimeout(() => {
        UI.showGameOver(false, timer, false);
      }, 1000);
    }
  }
  
  /**
   * Use a power-up from inventory
   * @param {string} type - Power-up type
   */
  function usePowerup(type) {
    if (gameState !== 'playing') return;
    
    PowerUps.use(type, {
      board,
      config,
      updateCells: (cells) => {
        for (const cell of cells) {
          UI.updateCell(cell);
        }
        
        if (Board.checkWin(board)) {
          gameOver(true);
        }
      }
    });
  }
  
  /**
   * Check if time is a high score
   * @param {number} time - Time in seconds
   * @returns {boolean} Whether it's a high score
   */
  function checkHighScore(time) {
    const scores = highScores[difficulty] || [];
    
    if (scores.length < 10) return true;
    
    return time < scores[scores.length - 1].time;
  }
  
  /**
   * Save a high score
   * @param {string} name - Player name
   */
  function saveHighScore(name) {
    if (!highScores[difficulty]) {
      highScores[difficulty] = [];
    }
    
    highScores[difficulty].push({
      name: name.substring(0, 20),
      time: timer,
      date: new Date().toISOString()
    });
    
    // Sort by time
    highScores[difficulty].sort((a, b) => a.time - b.time);
    
    // Keep top 10
    highScores[difficulty] = highScores[difficulty].slice(0, 10);
    
    saveHighScores();
  }
  
  /**
   * Load high scores from localStorage
   */
  function loadHighScores() {
    try {
      const saved = localStorage.getItem('minesweeper_highscores');
      if (saved) {
        highScores = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load high scores');
    }
  }
  
  /**
   * Save high scores to localStorage
   */
  function saveHighScores() {
    try {
      localStorage.setItem('minesweeper_highscores', JSON.stringify(highScores));
    } catch (e) {
      console.warn('Could not save high scores');
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  return {
    newGame,
    setDifficulty
  };
})();

