/**
 * Board - Handles board generation, mine placement, and cell management
 */
const Board = (function() {
  /**
   * Create a new board
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @param {number} mineCount - Number of mines
   * @param {Object} powerupConfig - Power-up configuration
   * @returns {Object} Board state
   */
  function create(rows, cols, mineCount, powerupConfig) {
    const cells = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          row,
          col,
          index: row * cols + col,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          isQuestion: false,
          adjacentMines: 0,
          powerup: null
        });
      }
    }
    
    return {
      rows,
      cols,
      mineCount,
      cells,
      minesPlaced: false,
      powerupConfig
    };
  }
  
  /**
   * Get cell at position
   * @param {Object} board - Board state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {Object|null} Cell or null if out of bounds
   */
  function getCell(board, row, col) {
    if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
      return null;
    }
    return board.cells[row * board.cols + col];
  }
  
  /**
   * Get adjacent cells
   * @param {Object} board - Board state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {Array} Array of adjacent cells
   */
  function getAdjacentCells(board, row, col) {
    const adjacent = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dr, dc] of directions) {
      const cell = getCell(board, row + dr, col + dc);
      if (cell) {
        adjacent.push(cell);
      }
    }
    
    return adjacent;
  }
  
  /**
   * Place mines on the board, avoiding the first click position
   * @param {Object} board - Board state
   * @param {number} safeRow - Row to keep safe (first click)
   * @param {number} safeCol - Col to keep safe (first click)
   */
  function placeMines(board, safeRow, safeCol) {
    if (board.minesPlaced) return;
    
    // Get safe zone (first click and adjacent cells)
    const safeZone = new Set();
    safeZone.add(safeRow * board.cols + safeCol);
    
    const adjacentToSafe = getAdjacentCells(board, safeRow, safeCol);
    for (const cell of adjacentToSafe) {
      safeZone.add(cell.index);
    }
    
    // Get all valid positions for mines
    const validPositions = [];
    for (let i = 0; i < board.cells.length; i++) {
      if (!safeZone.has(i)) {
        validPositions.push(i);
      }
    }
    
    // Shuffle and pick mine positions
    shuffleArray(validPositions);
    const minePositions = validPositions.slice(0, Math.min(board.mineCount, validPositions.length));
    
    // Place mines
    for (const pos of minePositions) {
      board.cells[pos].isMine = true;
    }
    
    // Calculate adjacent mine counts
    for (const cell of board.cells) {
      if (!cell.isMine) {
        const adjacent = getAdjacentCells(board, cell.row, cell.col);
        cell.adjacentMines = adjacent.filter(c => c.isMine).length;
      }
    }
    
    // Place power-ups on safe cells
    if (board.powerupConfig && board.powerupConfig.enabled) {
      placePowerups(board);
    }
    
    board.minesPlaced = true;
  }
  
  /**
   * Place power-ups on the board
   * @param {Object} board - Board state
   */
  function placePowerups(board) {
    const safeCells = board.cells.filter(c => !c.isMine && c.adjacentMines > 0);
    const powerupTypes = Object.keys(board.powerupConfig.types);
    const spawnChance = board.powerupConfig.spawnChance || 0.05;
    
    for (const cell of safeCells) {
      if (Math.random() < spawnChance) {
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        cell.powerup = type;
      }
    }
  }
  
  /**
   * Reveal a cell and cascade if empty
   * @param {Object} board - Board state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {Object} Result with revealed cells and hit mine info
   */
  function revealCell(board, row, col) {
    const cell = getCell(board, row, col);
    
    if (!cell || cell.isRevealed || cell.isFlagged) {
      return { revealed: [], hitMine: false, powerup: null };
    }
    
    const revealed = [];
    const toReveal = [cell];
    
    while (toReveal.length > 0) {
      const current = toReveal.pop();
      
      if (current.isRevealed || current.isFlagged) continue;
      
      current.isRevealed = true;
      revealed.push(current);
      
      // If hit a mine, stop
      if (current.isMine) {
        return { revealed, hitMine: true, explodedCell: current, powerup: null };
      }
      
      // If cell has a powerup, return it
      if (current.powerup) {
        return { revealed, hitMine: false, powerup: current.powerup };
      }
      
      // If empty cell (no adjacent mines), cascade to neighbors
      if (current.adjacentMines === 0) {
        const adjacent = getAdjacentCells(board, current.row, current.col);
        for (const adj of adjacent) {
          if (!adj.isRevealed && !adj.isFlagged && !adj.isMine) {
            toReveal.push(adj);
          }
        }
      }
    }
    
    return { revealed, hitMine: false, powerup: null };
  }
  
  /**
   * Chord reveal - reveal adjacent cells if flag count matches
   * @param {Object} board - Board state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {Object} Result with revealed cells and hit mine info
   */
  function chordReveal(board, row, col) {
    const cell = getCell(board, row, col);
    
    if (!cell || !cell.isRevealed || cell.adjacentMines === 0) {
      return { revealed: [], hitMine: false };
    }
    
    const adjacent = getAdjacentCells(board, row, col);
    const flaggedCount = adjacent.filter(c => c.isFlagged).length;
    
    if (flaggedCount !== cell.adjacentMines) {
      return { revealed: [], hitMine: false };
    }
    
    const result = { revealed: [], hitMine: false, explodedCell: null };
    
    for (const adj of adjacent) {
      if (!adj.isRevealed && !adj.isFlagged) {
        const revealResult = revealCell(board, adj.row, adj.col);
        result.revealed.push(...revealResult.revealed);
        
        if (revealResult.hitMine) {
          result.hitMine = true;
          result.explodedCell = revealResult.explodedCell;
        }
        
        if (revealResult.powerup) {
          result.powerup = revealResult.powerup;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Toggle flag on a cell
   * @param {Object} board - Board state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {Object} Result with flagged state change
   */
  function toggleFlag(board, row, col) {
    const cell = getCell(board, row, col);
    
    if (!cell || cell.isRevealed) {
      return { changed: false };
    }
    
    if (cell.isFlagged) {
      cell.isFlagged = false;
      cell.isQuestion = true;
    } else if (cell.isQuestion) {
      cell.isQuestion = false;
    } else {
      cell.isFlagged = true;
    }
    
    return { changed: true, cell };
  }
  
  /**
   * Check if the game is won
   * @param {Object} board - Board state
   * @returns {boolean} True if all non-mine cells are revealed
   */
  function checkWin(board) {
    for (const cell of board.cells) {
      if (!cell.isMine && !cell.isRevealed) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Get count of flagged cells
   * @param {Object} board - Board state
   * @returns {number} Number of flagged cells
   */
  function getFlagCount(board) {
    return board.cells.filter(c => c.isFlagged).length;
  }
  
  /**
   * Reveal all mines (for game over)
   * @param {Object} board - Board state
   * @returns {Array} Array of mine cells
   */
  function revealAllMines(board) {
    const mines = [];
    
    for (const cell of board.cells) {
      if (cell.isMine && !cell.isFlagged) {
        cell.isRevealed = true;
        mines.push(cell);
      } else if (!cell.isMine && cell.isFlagged) {
        // Mark wrong flags
        cell.wrongFlag = true;
        mines.push(cell);
      }
    }
    
    return mines;
  }
  
  /**
   * Get a random unrevealed safe cell
   * @param {Object} board - Board state
   * @returns {Object|null} Random safe cell or null
   */
  function getRandomSafeCell(board) {
    const safeCells = board.cells.filter(c => !c.isMine && !c.isRevealed && !c.isFlagged);
    if (safeCells.length === 0) return null;
    return safeCells[Math.floor(Math.random() * safeCells.length)];
  }
  
  /**
   * Get a random unflagged mine
   * @param {Object} board - Board state
   * @returns {Object|null} Random mine cell or null
   */
  function getRandomUnflaggedMine(board) {
    const mines = board.cells.filter(c => c.isMine && !c.isFlagged && !c.isRevealed);
    if (mines.length === 0) return null;
    return mines[Math.floor(Math.random() * mines.length)];
  }
  
  /**
   * Shuffle array in place (Fisher-Yates)
   * @param {Array} array - Array to shuffle
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  return {
    create,
    getCell,
    getAdjacentCells,
    placeMines,
    revealCell,
    chordReveal,
    toggleFlag,
    checkWin,
    getFlagCount,
    revealAllMines,
    getRandomSafeCell,
    getRandomUnflaggedMine
  };
})();

