/**
 * UI - DOM manipulation and rendering
 */
const UI = (function() {
  let boardEl = null;
  let mineCounterEl = null;
  let timerEl = null;
  let faceBtnEl = null;
  let powerupBarEl = null;
  let powerupInventoryEl = null;
  
  /**
   * Initialize UI elements
   */
  function init() {
    boardEl = document.getElementById('board');
    mineCounterEl = document.querySelector('.mine-counter');
    timerEl = document.querySelector('.timer');
    faceBtnEl = document.getElementById('faceBtn');
    powerupBarEl = document.getElementById('powerupBar');
    powerupInventoryEl = document.querySelector('.powerup-inventory');
  }
  
  /**
   * Create the game board grid
   * @param {Object} board - Board state
   */
  function createBoard(board) {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${board.cols}, var(--cell-size))`;
    boardEl.style.gridTemplateRows = `repeat(${board.rows}, var(--cell-size))`;
    
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `Cell ${row + 1}, ${col + 1}`);
        boardEl.appendChild(cell);
      }
    }
  }
  
  /**
   * Update a single cell's display
   * @param {Object} cell - Cell data
   * @param {boolean} animate - Whether to animate the reveal
   */
  function updateCell(cell, animate = false) {
    const cellEl = boardEl.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
    if (!cellEl) return;
    
    // Clear previous state
    cellEl.className = 'cell';
    cellEl.innerHTML = '';
    cellEl.removeAttribute('data-number');
    
    if (cell.isRevealed) {
      cellEl.classList.add('revealed');
      
      if (animate) {
        cellEl.classList.add('cascade-reveal');
      }
      
      if (cell.isMine) {
        cellEl.classList.add('mine');
        if (cell.exploded) {
          cellEl.classList.add('exploded');
        }
        cellEl.innerHTML = '<div class="mine-icon"></div>';
      } else if (cell.powerup) {
        cellEl.classList.add(`powerup-${cell.powerup}`);
        const icon = document.createElement('div');
        icon.className = `powerup-icon ${getPowerupIconClass(cell.powerup)}`;
        cellEl.appendChild(icon);
      } else if (cell.adjacentMines > 0) {
        cellEl.textContent = cell.adjacentMines;
        cellEl.dataset.number = cell.adjacentMines;
      }
    } else if (cell.isFlagged) {
      cellEl.classList.add('flagged');
    } else if (cell.isQuestion) {
      cellEl.classList.add('question');
    } else if (cell.wrongFlag) {
      cellEl.classList.add('revealed', 'wrong-flag');
    }
  }
  
  /**
   * Get powerup icon class
   * @param {string} type - Powerup type
   * @returns {string} Icon class
   */
  function getPowerupIconClass(type) {
    const iconMap = {
      shield: 'shield',
      detector: 'radar',
      freeze: 'snowflake',
      safeReveal: 'star'
    };
    return iconMap[type] || '';
  }
  
  /**
   * Update multiple cells with cascade animation
   * @param {Array} cells - Array of cells to update
   * @param {number} delay - Delay between animations in ms
   */
  function updateCellsCascade(cells, delay = 15) {
    cells.forEach((cell, index) => {
      setTimeout(() => {
        updateCell(cell, true);
        if (index < cells.length - 1) {
          Sound.playCascade();
        }
      }, index * delay);
    });
  }
  
  /**
   * Update mine counter display
   * @param {number} count - Mine count
   */
  function updateMineCounter(count) {
    const digits = mineCounterEl.querySelectorAll('.digit');
    const absCount = Math.abs(count);
    const negative = count < 0;
    
    // Clamp to 3 digits
    const displayCount = Math.min(absCount, 999);
    const str = displayCount.toString().padStart(3, '0');
    
    digits[0].textContent = negative ? '-' : str[0];
    digits[1].textContent = str[negative ? 0 : 1];
    digits[2].textContent = str[negative ? 1 : 2];
  }
  
  /**
   * Update timer display
   * @param {number} seconds - Time in seconds
   */
  function updateTimer(seconds) {
    const digits = timerEl.querySelectorAll('.digit');
    const displayTime = Math.min(seconds, 999);
    const str = displayTime.toString().padStart(3, '0');
    
    digits[0].textContent = str[0];
    digits[1].textContent = str[1];
    digits[2].textContent = str[2];
  }
  
  /**
   * Set timer frozen state
   * @param {boolean} frozen - Whether timer is frozen
   */
  function setTimerFrozen(frozen) {
    if (frozen) {
      timerEl.classList.add('frozen');
    } else {
      timerEl.classList.remove('frozen');
    }
  }
  
  /**
   * Set face button expression
   * @param {string} expression - Face type: 'smile', 'surprised', 'dead', 'cool'
   */
  function setFace(expression) {
    const faceEl = faceBtnEl.querySelector('.face');
    faceEl.className = 'face face-' + expression;
  }
  
  /**
   * Set shield active indicator
   * @param {boolean} active - Whether shield is active
   */
  function setShieldActive(active) {
    if (active) {
      faceBtnEl.classList.add('shield-active');
    } else {
      faceBtnEl.classList.remove('shield-active');
    }
  }
  
  /**
   * Update power-up inventory display
   * @param {Array} inventory - Array of power-ups
   * @param {Function} onUse - Callback when power-up is used
   */
  function updatePowerupInventory(inventory, onUse) {
    powerupInventoryEl.innerHTML = '';
    
    if (inventory.length === 0) {
      powerupBarEl.classList.remove('active');
      return;
    }
    
    powerupBarEl.classList.add('active');
    
    // Group by type
    const grouped = {};
    for (const item of inventory) {
      if (!grouped[item.type]) {
        grouped[item.type] = 0;
      }
      grouped[item.type]++;
    }
    
    for (const [type, count] of Object.entries(grouped)) {
      const slot = document.createElement('button');
      slot.className = 'powerup-slot';
      slot.dataset.type = type;
      
      if (count > 1) {
        const badge = document.createElement('span');
        badge.className = 'count-badge';
        badge.textContent = count;
        badge.style.cssText = 'position: absolute; top: -4px; right: -4px; font-size: 10px; background: #ff0; border-radius: 50%; width: 14px; height: 14px; line-height: 14px; text-align: center;';
        slot.appendChild(badge);
      }
      
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = getPowerupTooltip(type);
      slot.appendChild(tooltip);
      
      slot.addEventListener('click', () => {
        onUse(type);
      });
      
      powerupInventoryEl.appendChild(slot);
    }
  }
  
  /**
   * Get power-up tooltip text
   * @param {string} type - Power-up type
   * @returns {string} Tooltip text
   */
  function getPowerupTooltip(type) {
    const tooltips = {
      detector: 'Reveal a mine (click to use)',
      freeze: 'Freeze timer (click to use)',
      safeReveal: 'Reveal safe cells (click to use)'
    };
    return tooltips[type] || type;
  }
  
  /**
   * Show power-ups enabled state
   * @param {boolean} enabled - Whether power-ups are enabled
   */
  function setPowerupsEnabled(enabled) {
    if (enabled) {
      powerupBarEl.style.display = '';
    } else {
      powerupBarEl.style.display = 'none';
    }
  }
  
  /**
   * Shake the board (for explosion effect)
   */
  function shakeBoard() {
    boardEl.classList.add('shake');
    setTimeout(() => {
      boardEl.classList.remove('shake');
    }, 300);
  }
  
  /**
   * Create confetti celebration effect
   */
  function celebrate() {
    const colors = ['#ff0', '#f00', '#0f0', '#00f', '#f0f', '#0ff'];
    
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => {
          confetti.remove();
        }, 4000);
      }, i * 50);
    }
  }
  
  /**
   * Show a modal
   * @param {string} modalId - Modal element ID
   */
  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }
  
  /**
   * Hide a modal
   * @param {string} modalId - Modal element ID
   */
  function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }
  
  /**
   * Hide all modals
   */
  function hideAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  }
  
  /**
   * Show game over modal
   * @param {boolean} won - Whether player won
   * @param {number} time - Time in seconds
   * @param {boolean} isHighScore - Whether this is a high score
   */
  function showGameOver(won, time, isHighScore) {
    const titleEl = document.getElementById('gameOverTitle');
    const messageEl = document.getElementById('gameOverMessage');
    const nameSection = document.getElementById('nameInputSection');
    
    if (won) {
      titleEl.textContent = 'You Win!';
      messageEl.textContent = `Completed in ${time} seconds!`;
      
      if (isHighScore) {
        messageEl.textContent += ' New high score!';
        nameSection.style.display = 'block';
        document.getElementById('playerName').value = '';
        document.getElementById('playerName').focus();
      } else {
        nameSection.style.display = 'none';
      }
    } else {
      titleEl.textContent = 'Game Over';
      messageEl.textContent = 'You hit a mine!';
      nameSection.style.display = 'none';
    }
    
    showModal('gameOverModal');
  }
  
  /**
   * Update high scores display
   * @param {Array} scores - Array of score objects
   */
  function updateHighScores(scores) {
    const listEl = document.getElementById('highscoreList');
    listEl.innerHTML = '';
    
    if (scores.length === 0) {
      listEl.innerHTML = '<p class="no-scores">No scores yet</p>';
      return;
    }
    
    scores.slice(0, 10).forEach((score, index) => {
      const entry = document.createElement('div');
      entry.className = 'highscore-entry';
      entry.innerHTML = `
        <span class="highscore-rank">${index + 1}.</span>
        <span class="highscore-name">${escapeHtml(score.name)}</span>
        <span class="highscore-time">${score.time}s</span>
      `;
      listEl.appendChild(entry);
    });
  }
  
  /**
   * Set active difficulty in menu
   * @param {string} difficulty - Difficulty level
   */
  function setActiveDifficulty(difficulty) {
    document.querySelectorAll('[data-action="beginner"], [data-action="intermediate"], [data-action="expert"]').forEach(btn => {
      const check = btn.querySelector('.checkmark');
      if (check) check.remove();
      
      if (btn.dataset.action === difficulty) {
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        checkmark.innerHTML = '&#10003;';
        btn.insertBefore(checkmark, btn.firstChild);
      }
    });
  }
  
  /**
   * Update menu checkbox states
   * @param {Object} state - State object with powerupsEnabled and soundEnabled
   */
  function updateMenuState(state) {
    const powerupCheck = document.getElementById('powerupCheck');
    const soundCheck = document.getElementById('soundCheck');
    
    powerupCheck.style.visibility = state.powerupsEnabled ? 'visible' : 'hidden';
    soundCheck.style.visibility = state.soundEnabled ? 'visible' : 'hidden';
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  /**
   * Get board element
   * @returns {HTMLElement} Board element
   */
  function getBoardElement() {
    return boardEl;
  }
  
  /**
   * Get face button element
   * @returns {HTMLElement} Face button element
   */
  function getFaceButton() {
    return faceBtnEl;
  }
  
  return {
    init,
    createBoard,
    updateCell,
    updateCellsCascade,
    updateMineCounter,
    updateTimer,
    setTimerFrozen,
    setFace,
    setShieldActive,
    updatePowerupInventory,
    setPowerupsEnabled,
    shakeBoard,
    celebrate,
    showModal,
    hideModal,
    hideAllModals,
    showGameOver,
    updateHighScores,
    setActiveDifficulty,
    updateMenuState,
    getBoardElement,
    getFaceButton
  };
})();

