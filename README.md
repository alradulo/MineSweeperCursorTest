# Minesweeper

A faithful recreation of the classic Windows Minesweeper game with modern web technologies, featuring sound effects, mobile touch support, and a unique Power-Up system.

## Features

- Classic Windows 98/XP visual aesthetic
- Three difficulty levels: Beginner, Intermediate, Expert
- Sound effects using Web Audio API
- Mobile touchscreen support (tap to reveal, long-press to flag)
- Power-up system with special abilities
- High score tracking with local storage

## How to Play

### Objective
Clear the minefield without detonating any mines.

### Controls

**Desktop:**
- Left-click: Reveal a cell
- Right-click: Place/remove a flag
- Both mouse buttons: Chord (reveal adjacent cells if correct flags placed)

**Mobile:**
- Tap: Reveal a cell
- Long press (hold): Place/remove a flag

### Numbers
Numbers indicate how many mines are in the 8 adjacent cells.

### Power-ups
When enabled, special power-up cells appear on the board:

- **Shield** - Survive the next mine hit (one use)
- **Detector** - Reveals a random unflagged mine for 3 seconds
- **Time Freeze** - Pauses the timer for 15 seconds
- **Safe Reveal** - Auto-reveals 3 random safe cells

Power-ups can be toggled on/off in the Game menu.

## Running the Game

Simply open `index.html` in a modern web browser. No build step or server required.

For local development with live reload, you can use any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

Then open http://localhost:8000 in your browser.

## Configuration

Game settings can be modified in `config.json`:
- Difficulty levels (grid size, mine count)
- Power-up spawn chance and effects
- Timing parameters
- Sound settings

## Browser Support

Works in all modern browsers:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile Safari / Chrome for Android

## License

MIT

