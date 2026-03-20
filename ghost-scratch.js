// ── GHOST SCRATCH — Frotter pour révéler ──────────────────
// v2 — 6 bugs corrigés :
//   #1 ctx.clearRect ignore globalAlpha → fadeOut via destination-out
//   #2 getImageData à chaque pixel → throttle 150ms
//   #3 double _updateProgress (scratch + onEnd) → throttle unifié
//   #4 AudioContext suspended sur mobile → resume() avant play
//   #5 destroy() pendant RAF → _destroyed guard + cancelAnimationFrame
//   #6 sampledTotal incorrect → recalcul propre

const GhostScratch = (() => {

  const CFG = {
    revealThreshold:  0.65,
    brushRadius:      28,
    brushRadiusMobile:38,
    fadeOutDuration:  480,
    particleCount:    18,
    soundEnabled:     true,
    overlayColor:     '#0a0810',
    glowColor:        'rgba(168,180,255,0.35)',
    progressThrottle: 150,   // FIX #2 : ms entre deux getImageData
  };

  let canvas, ctx, overlay, onRevealCb;
  let isDrawing    = false;
  let progressEl   = null;
  let audioCtx     = null;
  let revealed     = false;
  let _destroyed   = false;  // FIX #5
  let _rafId       = null;   // FIX #5
  let _lastProgressTs = 0;   // FIX #2/#3

  // ── INIT ────────────────────────────────────────────────
  function init(targetEl, onReveal) {
    if (!targetEl) return;
    destroy();
    _destroyed = false;
    revealed   = false;
    onRevealCb = onReveal;

    overlay = document.createElement('div');
    overlay.id = 'scratchOverlay';
    overlay.style.cssText = `
      position:absolute;inset:0;z-index:50;
      border-radius:18px;overflow:hidden;
      user-select:none;-webkit-user-select:none;
      cursor:crosshair;
    `;

    canvas = document.createElement('canvas');
    const rect = targetEl.getBoundingClientRect();
    const w    = Math.max(rect.width,  targetEl.offsetWidth,  320);
    const h    = Math.max(rect.height, targetEl.offsetHeight, 280);
    canvas.width  = w;
    canvas.height = h;
    canvas.style.cssText = `
      position:absolute;inset:0;width:100%;height:100%;
      display:block;touch-action:none;
    `;

    ctx = canvas.getContext('2d');
    _drawOverlay(w, h);

    progressEl = document.createElement('div');
    progressEl.id = 'scratchProgress';
    progressEl.style.cssText = `
      position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
      background:rgba(10,8,20,0.75);backdrop-filter:blur(10px);
      border:1px solid rgba(168,180,255,0.25);border-radius:20px;
      padding:6px 16px;font-size:11px;letter-spacing:1.5px;
      color:rgba(168,180,255,0.7);font-family:'Instrument Sans',sans-serif;
      pointer-events:none;white-space:nowrap;z-index:51;
      text-transform:uppercase;
      animation:scratchHint 2s ease-in-out infinite;
    `;
    progressEl.textContent = '✧ Frottez pour révéler';

    overlay.appendChild(canvas);
    overlay.appendChild(progressEl);

    const cs = getComputedStyle(targetEl);
    if (cs.position === 'static') targetEl.style.position = 'relative';
    targetEl.appendChild(overlay);

    _bindEvents();
  }

  // ── MASQUE ──────────────────────────────────────────────
  function _drawOverlay(w, h) {
    ctx.fillStyle = CFG.overlayColor;
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h) * 0.7);
    grad.addColorStop(0,   'rgba(30,15,60,0.92)');
    grad.addColorStop(0.6, 'rgba(10,8,20,0.96)');
    grad.addColorStop(1,   'rgba(6,4,16,0.99)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.font = `${Math.min(w * 0.3, 72)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a8b4ff';
    ctx.fillText('👻', w / 2, h / 2 - 16);
    ctx.restore();

    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,180,255,${(Math.random() * 0.12 + 0.03).toFixed(2)})`;
      ctx.fill();
    }
  }

  // ── ÉVÉNEMENTS ─────────────────────────────────────────
  function _bindEvents() {
    canvas.addEventListener('mousedown',   _onStart, { passive: false });
    canvas.addEventListener('mousemove',   _onMove,  { passive: false });
    canvas.addEventListener('mouseup',     _onEnd);
    canvas.addEventListener('mouseleave',  _onEnd);
    canvas.addEventListener('touchstart',  _onStart, { passive: false });
    canvas.addEventListener('touchmove',   _onMove,  { passive: false });
    canvas.addEventListener('touchend',    _onEnd,   { passive: false });
    canvas.addEventListener('touchcancel', _onEnd);
  }

  function _getPos(e) {
    if (!canvas) return { x: 0, y: 0 };
    const r      = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / r.width;
    const scaleY = canvas.height / r.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - r.left) * scaleX,
        y: (e.touches[0].clientY - r.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top)  * scaleY,
    };
  }

  function _onStart(e) {
    e.preventDefault();
    if (_destroyed || revealed) return;
    isDrawing = true;
    _resumeAudio();   // FIX #4
    _playStartSound();
    _scratch(_getPos(e));
  }

  function _onMove(e) {
    e.preventDefault();
    if (!isDrawing || _destroyed || revealed) return;
    _scratch(_getPos(e));
  }

  function _onEnd(e) {
    if (e) e.preventDefault();
    isDrawing = false;
    // FIX #3 : forcer un calcul final sans throttle au relâchement
    if (!revealed && !_destroyed) _updateProgress(true);
  }

  // ── GRATTER ─────────────────────────────────────────────
  function _scratch({ x, y }) {
    if (!ctx) return;
    const r = window.innerWidth < 520 ? CFG.brushRadiusMobile : CFG.brushRadius;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0,    'rgba(0,0,0,1)');
    grad.addColorStop(0.6,  'rgba(0,0,0,0.9)');
    grad.addColorStop(0.85, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    _drawGlowCursor(x, y, r);

    // FIX #2 : throttle getImageData
    const now = performance.now();
    if (now - _lastProgressTs > CFG.progressThrottle) {
      _lastProgressTs = now;
      _updateProgress(false);
    }
  }

  function _drawGlowCursor(x, y, r) {
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    grad.addColorStop(0,   CFG.glowColor);
    grad.addColorStop(0.5, 'rgba(168,180,255,0.05)');
    grad.addColorStop(1,   'rgba(168,180,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── PROGRESSION ─────────────────────────────────────────
  function _updateProgress(force = false) {
    if (!ctx || !canvas || revealed || _destroyed) return;
    const now = performance.now();
    if (!force && now - _lastProgressTs < CFG.progressThrottle) return;
    _lastProgressTs = now;

    // FIX #6 : calcul correct — lire alpha tous les 4 pixels
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const STEP  = 16; // 4 canaux × 4 pixels = lire 1 alpha sur 4 pixels
    let transparent = 0, total = 0;
    for (let i = 3; i < data.length; i += STEP) {
      if (data[i] < 128) transparent++;
      total++;
    }
    const pct = total > 0 ? transparent / total : 0;

    if (progressEl) {
      const pct100 = Math.min(Math.round(pct * 100), 100);
      progressEl.textContent =
        pct < 0.25 ? '✧ Frottez pour révéler' :
        pct < 0.50 ? `🌫️ ${pct100}% révélé…`  :
        pct < CFG.revealThreshold ? `👻 Encore un peu… ${pct100}%` : '';
    }

    if (pct >= CFG.revealThreshold) _autoReveal();
  }

  // ── RÉVÉLATION ──────────────────────────────────────────
  function _autoReveal() {
    if (revealed || _destroyed) return;
    revealed = true;

    if (progressEl) {
      progressEl.style.transition = 'opacity 0.25s';
      progressEl.style.opacity    = '0';
    }

    _playRevealSound();
    _triggerRevealFlash();
    _spawnParticles();

    // FIX #1 : fondu correct via destination-out progressive
    _fadeOutCanvas(() => {
      if (_destroyed) return;
      if (overlay && overlay.parentNode) {
        overlay.style.transition = `opacity ${CFG.fadeOutDuration}ms ease`;
        overlay.style.opacity    = '0';
        setTimeout(() => {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          if (onRevealCb) onRevealCb();
        }, CFG.fadeOutDuration);
      }
    });
  }

  // FIX #1 : remplacer clearRect+globalAlpha (ne fonctionnait pas)
  // par des passes successives en destination-out
  function _fadeOutCanvas(cb) {
    const step = () => {
      if (_destroyed || !ctx) { if (cb) cb(); return; } // FIX #5
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.14;
      ctx.fillStyle   = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Vérifier si le canvas est quasi transparent
      const data = ctx.getImageData(0, 0, Math.min(canvas.width, 80), Math.min(canvas.height, 80)).data;
      let maxAlpha = 0;
      for (let i = 3; i < data.length; i += 16) maxAlpha = Math.max(maxAlpha, data[i]);

      if (maxAlpha < 10) { if (cb) cb(); return; }
      _rafId = requestAnimationFrame(step);
    };
    _rafId = requestAnimationFrame(step);
  }

  // ── FLASH + PARTICULES ───────────────────────────────────
  function _triggerRevealFlash() {
    const flash = document.getElementById('sealBreakFlash');
    if (!flash) return;
    flash.style.background = 'radial-gradient(ellipse at center,rgba(200,210,255,0.9) 0%,rgba(140,120,255,0.5) 40%,transparent 75%)';
    flash.style.animation  = 'none';
    flash.offsetWidth;
    flash.style.animation  = 'sealFlash 0.7s ease-out forwards';
  }

  function _spawnParticles() {
    if (!overlay) return;
    const rect   = overlay.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const colors = ['rgba(168,180,255,0.9)','rgba(200,210,255,0.8)','rgba(100,220,160,0.7)','rgba(255,200,120,0.6)'];

    for (let i = 0; i < CFG.particleCount; i++) {
      const p     = document.createElement('div');
      const angle = (Math.PI * 2 * i) / CFG.particleCount + Math.random() * 0.5;
      const dist  = 60 + Math.random() * 80;
      const size  = 3 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dur   = 0.5 + Math.random() * 0.6;
      p.className = 'reso-particle';
      Object.assign(p.style, {
        position: 'fixed', zIndex: 9999,
        left: `${cx}px`, top: `${cy}px`,
        width: `${size}px`, height: `${size}px`,
        borderRadius: '50%', pointerEvents: 'none',
        background: color, boxShadow: `0 0 ${size*2}px ${color}`,
        '--px': `${Math.cos(angle) * dist}px`,
        '--py': `${Math.sin(angle) * dist}px`,
        '--dur': `${dur}s`,
        animation: `particleRise ${dur}s cubic-bezier(.25,.46,.45,.94) forwards`,
      });
      document.body.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 100);
    }
  }

  // ── SON ──────────────────────────────────────────────────
  function _getAudioCtx() {
    if (!CFG.soundEnabled) return null;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
    }
    return audioCtx;
  }

  // FIX #4 : resume AudioContext suspendu (requis sur mobile après politique autoplay)
  function _resumeAudio() {
    const ac = _getAudioCtx();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  }

  function _playStartSound() {
    const ac = _getAudioCtx();
    if (!ac || ac.state !== 'running') return;
    try {
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, ac.currentTime);
      gain.gain.setValueAtTime(0.035, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(); osc.stop(ac.currentTime + 0.12);
    } catch(e) {}
  }

  function _playRevealSound() {
    const ac = _getAudioCtx();
    if (!ac) return;
    const _play = () => {
      try {
        [220, 330, 440, 660].forEach((f, i) => {
          const osc = ac.createOscillator(), gain = ac.createGain();
          osc.connect(gain); gain.connect(ac.destination);
          osc.type = 'sine';
          const t = ac.currentTime + i * 0.07;
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.2);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.start(t); osc.stop(t + 0.4);
        });
      } catch(e) {}
    };
    // FIX #4 : resume si suspendu puis jouer
    if (ac.state === 'suspended') ac.resume().then(_play).catch(() => {});
    else _play();
  }

  // ── DESTROY ─────────────────────────────────────────────
  function destroy() {
    // FIX #5 : annuler RAF AVANT de nullifier ctx
    _destroyed = true;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    canvas = ctx = overlay = progressEl = null;
    revealed = isDrawing = false;
    _lastProgressTs = 0;
  }

  return { init, destroy };

})();

export default GhostScratch;
