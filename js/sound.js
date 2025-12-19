/**
 * Sound - Web Audio API sound effects manager
 */
const Sound = (function() {
  let audioContext = null;
  let enabled = true;
  let volume = 0.5;
  
  /**
   * Initialize the audio context (must be called after user interaction)
   */
  function init() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }
  
  /**
   * Set sound enabled state
   * @param {boolean} state - Whether sound is enabled
   */
  function setEnabled(state) {
    enabled = state;
  }
  
  /**
   * Set volume
   * @param {number} vol - Volume level (0-1)
   */
  function setVolume(vol) {
    volume = Math.max(0, Math.min(1, vol));
  }
  
  /**
   * Create a gain node with current volume
   * @returns {GainNode} Gain node
   */
  function createGain() {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioContext.destination);
    return gainNode;
  }
  
  /**
   * Play a click sound (soft click for revealing cells)
   */
  function playClick() {
    if (!enabled || !audioContext) return;
    
    const gainNode = createGain();
    const oscillator = audioContext.createOscillator();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.connect(gainNode);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  }
  
  /**
   * Play flag placement sound
   */
  function playFlag() {
    if (!enabled || !audioContext) return;
    
    const gainNode = createGain();
    const oscillator = audioContext.createOscillator();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(volume * 0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }
  
  /**
   * Play unflag sound
   */
  function playUnflag() {
    if (!enabled || !audioContext) return;
    
    const gainNode = createGain();
    const oscillator = audioContext.createOscillator();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(volume * 0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    
    oscillator.connect(gainNode);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.08);
  }
  
  /**
   * Play mine explosion sound
   */
  function playExplosion() {
    if (!enabled || !audioContext) return;
    
    // Create noise for explosion
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    // Low-pass filter for rumble effect
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    
    const gainNode = createGain();
    gainNode.gain.setValueAtTime(volume * 0.8, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(gainNode);
    
    // Add low sine for bass thump
    const bass = audioContext.createOscillator();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(80, audioContext.currentTime);
    bass.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.2);
    
    const bassGain = audioContext.createGain();
    bassGain.gain.setValueAtTime(volume * 0.6, audioContext.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    bassGain.connect(audioContext.destination);
    
    bass.connect(bassGain);
    
    noise.start(audioContext.currentTime);
    bass.start(audioContext.currentTime);
    bass.stop(audioContext.currentTime + 0.3);
  }
  
  /**
   * Play victory fanfare
   */
  function playVictory() {
    if (!enabled || !audioContext) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const durations = [0.15, 0.15, 0.15, 0.4];
    let time = audioContext.currentTime;
    
    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(volume * 0.4, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
      
      oscillator.connect(gainNode);
      oscillator.start(time);
      oscillator.stop(time + durations[i]);
      
      time += durations[i] * 0.8;
    });
    
    // Add sparkle effect
    setTimeout(() => {
      playSparkle();
    }, 500);
  }
  
  /**
   * Play power-up collection sound
   */
  function playPowerup() {
    if (!enabled || !audioContext) return;
    
    const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 - major arpeggio
    let time = audioContext.currentTime;
    
    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(volume * 0.3, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      oscillator.connect(gainNode);
      oscillator.start(time);
      oscillator.stop(time + 0.15);
      
      time += 0.08;
    });
  }
  
  /**
   * Play sparkle effect (used in victory and power-ups)
   */
  function playSparkle() {
    if (!enabled || !audioContext) return;
    
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = createGain();
        
        const freq = 2000 + Math.random() * 2000;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume * 0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }, i * 50);
    }
  }
  
  /**
   * Play shield activation sound
   */
  function playShieldActivate() {
    if (!enabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(volume * 0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }
  
  /**
   * Play shield break sound
   */
  function playShieldBreak() {
    if (!enabled || !audioContext) return;
    
    // Glass breaking sound
    const bufferSize = audioContext.sampleRate * 0.3;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / audioContext.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * Math.sin(t * 1000);
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    
    const gainNode = createGain();
    gainNode.gain.value = volume * 0.5;
    
    noise.connect(filter);
    filter.connect(gainNode);
    noise.start(audioContext.currentTime);
  }
  
  /**
   * Play freeze activation sound
   */
  function playFreeze() {
    if (!enabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1500, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    
    oscillator.connect(gainNode);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
  }
  
  /**
   * Play detector ping sound
   */
  function playDetector() {
    if (!enabled || !audioContext) return;
    
    // Radar ping effect
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume * 0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      }, i * 150);
    }
  }
  
  /**
   * Play cascade reveal sound (subtle)
   */
  function playCascade() {
    if (!enabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = createGain();
    
    const freq = 400 + Math.random() * 200;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume * 0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);
    
    oscillator.connect(gainNode);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.03);
  }
  
  return {
    init,
    setEnabled,
    setVolume,
    playClick,
    playFlag,
    playUnflag,
    playExplosion,
    playVictory,
    playPowerup,
    playSparkle,
    playShieldActivate,
    playShieldBreak,
    playFreeze,
    playDetector,
    playCascade
  };
})();

