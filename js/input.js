/**
 * Input - Unified mouse and touch input handling
 */
const Input = (function() {
  let longPressTimer = null;
  let longPressMs = 500;
  let isLongPress = false;
  let touchStartPos = null;
  let activeTouchCell = null;
  let bothButtonsDown = false;
  let leftDown = false;
  let rightDown = false;
  
  // Callbacks
  let onReveal = null;
  let onFlag = null;
  let onChord = null;
  let onCellPress = null;
  let onCellRelease = null;
  
  /**
   * Initialize input handlers
   * @param {HTMLElement} boardEl - Board element
   * @param {Object} callbacks - Event callbacks
   */
  function init(boardEl, callbacks) {
    onReveal = callbacks.onReveal || (() => {});
    onFlag = callbacks.onFlag || (() => {});
    onChord = callbacks.onChord || (() => {});
    onCellPress = callbacks.onCellPress || (() => {});
    onCellRelease = callbacks.onCellRelease || (() => {});
    
    // Mouse events
    boardEl.addEventListener('mousedown', handleMouseDown);
    boardEl.addEventListener('mouseup', handleMouseUp);
    boardEl.addEventListener('mouseleave', handleMouseLeave);
    boardEl.addEventListener('contextmenu', handleContextMenu);
    
    // Touch events
    boardEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    boardEl.addEventListener('touchend', handleTouchEnd);
    boardEl.addEventListener('touchcancel', handleTouchCancel);
    boardEl.addEventListener('touchmove', handleTouchMove, { passive: false });
  }
  
  /**
   * Set long press duration
   * @param {number} ms - Duration in milliseconds
   */
  function setLongPressMs(ms) {
    longPressMs = ms;
  }
  
  /**
   * Get cell from event target
   * @param {Event} e - Event object
   * @returns {Object|null} Cell row and col, or null
   */
  function getCellFromEvent(e) {
    const target = e.target.closest('.cell');
    if (!target) return null;
    
    return {
      row: parseInt(target.dataset.row, 10),
      col: parseInt(target.dataset.col, 10),
      element: target
    };
  }
  
  /**
   * Handle mouse down
   * @param {MouseEvent} e - Mouse event
   */
  function handleMouseDown(e) {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    
    if (e.button === 0) {
      leftDown = true;
    } else if (e.button === 2) {
      rightDown = true;
    }
    
    // Check for chord (both buttons)
    if (leftDown && rightDown) {
      bothButtonsDown = true;
      onCellPress(cell.row, cell.col);
    } else if (e.button === 0) {
      onCellPress(cell.row, cell.col);
    }
  }
  
  /**
   * Handle mouse up
   * @param {MouseEvent} e - Mouse event
   */
  function handleMouseUp(e) {
    const cell = getCellFromEvent(e);
    
    onCellRelease();
    
    if (bothButtonsDown && cell) {
      // Chord reveal
      bothButtonsDown = false;
      leftDown = false;
      rightDown = false;
      onChord(cell.row, cell.col);
      return;
    }
    
    if (e.button === 0) {
      leftDown = false;
      if (cell && !rightDown) {
        onReveal(cell.row, cell.col);
      }
    } else if (e.button === 2) {
      rightDown = false;
      if (cell && !leftDown) {
        onFlag(cell.row, cell.col);
      }
    }
    
    bothButtonsDown = false;
  }
  
  /**
   * Handle mouse leave
   */
  function handleMouseLeave() {
    leftDown = false;
    rightDown = false;
    bothButtonsDown = false;
    onCellRelease();
  }
  
  /**
   * Handle context menu (prevent default)
   * @param {Event} e - Event object
   */
  function handleContextMenu(e) {
    e.preventDefault();
  }
  
  /**
   * Handle touch start
   * @param {TouchEvent} e - Touch event
   */
  function handleTouchStart(e) {
    if (e.touches.length > 1) return; // Ignore multi-touch
    
    const touch = e.touches[0];
    const cell = getCellFromTarget(touch.target);
    
    if (!cell) return;
    
    e.preventDefault(); // Prevent scrolling and zoom
    
    touchStartPos = { x: touch.clientX, y: touch.clientY };
    activeTouchCell = cell;
    isLongPress = false;
    
    onCellPress(cell.row, cell.col);
    
    // Start long press timer for flagging
    longPressTimer = setTimeout(() => {
      if (activeTouchCell) {
        isLongPress = true;
        onFlag(activeTouchCell.row, activeTouchCell.col);
        
        // Visual feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, longPressMs);
  }
  
  /**
   * Handle touch end
   * @param {TouchEvent} e - Touch event
   */
  function handleTouchEnd(e) {
    clearTimeout(longPressTimer);
    onCellRelease();
    
    if (!activeTouchCell) return;
    
    // If not a long press, reveal the cell
    if (!isLongPress) {
      onReveal(activeTouchCell.row, activeTouchCell.col);
    }
    
    activeTouchCell = null;
    touchStartPos = null;
    isLongPress = false;
  }
  
  /**
   * Handle touch cancel
   */
  function handleTouchCancel() {
    clearTimeout(longPressTimer);
    activeTouchCell = null;
    touchStartPos = null;
    isLongPress = false;
    onCellRelease();
  }
  
  /**
   * Handle touch move
   * @param {TouchEvent} e - Touch event
   */
  function handleTouchMove(e) {
    if (!touchStartPos || !activeTouchCell) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If moved too far, cancel the long press
    if (distance > 20) {
      clearTimeout(longPressTimer);
      activeTouchCell = null;
      onCellRelease();
    }
  }
  
  /**
   * Get cell from touch target
   * @param {Element} target - Touch target element
   * @returns {Object|null} Cell data or null
   */
  function getCellFromTarget(target) {
    const cellEl = target.closest('.cell');
    if (!cellEl) return null;
    
    return {
      row: parseInt(cellEl.dataset.row, 10),
      col: parseInt(cellEl.dataset.col, 10),
      element: cellEl
    };
  }
  
  /**
   * Clean up event listeners
   * @param {HTMLElement} boardEl - Board element
   */
  function destroy(boardEl) {
    boardEl.removeEventListener('mousedown', handleMouseDown);
    boardEl.removeEventListener('mouseup', handleMouseUp);
    boardEl.removeEventListener('mouseleave', handleMouseLeave);
    boardEl.removeEventListener('contextmenu', handleContextMenu);
    boardEl.removeEventListener('touchstart', handleTouchStart);
    boardEl.removeEventListener('touchend', handleTouchEnd);
    boardEl.removeEventListener('touchcancel', handleTouchCancel);
    boardEl.removeEventListener('touchmove', handleTouchMove);
    
    clearTimeout(longPressTimer);
  }
  
  return {
    init,
    setLongPressMs,
    destroy
  };
})();

