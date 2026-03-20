// ── GHOST SCRATCH — Frotter pour révéler ──────────────────
// Module autonome, s'initialise avec initScratchReveal()
// Dépend de : Web Audio API (optionnel)

const GhostScratch = (() => {

  // ── CONFIG ─────────────────────────────────────────────
  const CFG = {
    revealThreshold: 0.68,   // 68% gratté → révélation auto
    brushRadius: 28,         // rayon du pinceau (px)
    brushRadiusMobile: 36,   // plus grand sur mobile
    fadeOutDuration: 500,    // ms de fondu sortie
    particleCount: 18,       // étoiles au déblocage
    soundEnabled: true,      // effets sonores
    overlayColor: '#0a0810', // couleur du masque (noir/void)
    glowColor: 'rgba(168,180,255,0.35)',
  };

  // ── STATE ───────────────────────────────────────────────
  let canvas, ctx, overlay, onRevealCb;
  let isDrawing = false;
  let totalPixels = 0;
  let scratchedPixels = 0;
  let progressEl = null;
  let audioCtx = null;
  let revealed = false;

  // ── INIT ────────────────────────────────────────────────
  function init(targetEl, onReveal) {
    if (!targetEl) return;
    revealed = false;
    onRevealCb = onReveal;

    // Conteneur overlay
    overlay = document.createElement('div');
    overlay.id = 'scratchOverlay';
    overlay.style.cssText = `
      position:absolute;inset:0;z-index:50;
      border-radius:18px;overflow:hidden;
      user-select:none;-webkit-user-select:none;
      cursor: crosshair;
    `;

    // Canvas principal
    canvas = document.createElement('canvas');
    const rect = targetEl.getBoundingClientRect();
    const w = Math.max(rect.width, targetEl.offsetWidth, 320);
    const h = Math.max(rect.height, targetEl.offsetHeight, 200);
    canvas.width  = w;
    canvas.height = h;
    canvas.style.cssText = `
      position:absolute;inset:0;width:100%;height:100%;
      display:block;touch-action:none;
    `;

    ctx = canvas.getContext('2d');

    // Fond flouté mystérieux
    _drawOverlay(w, h);

    // Indicateur de progression
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

    // Wrap le targetEl en position:relative si besoin
    const cs = getComputedStyle(targetEl);
    if (cs.position === 'static') targetEl.style.position = 'relative';
    targetEl.appendChild(overlay);

    // Pixels totaux (pour calcul %)
    totalPixels = w * h;

    // Événements
    _bindEvents();
  }

  // ── DESSIN DU MASQUE ────────────────────────────────────
  function _drawOverlay(w, h) {
    // Fond sombre semi-opaque
    ctx.fillStyle = CFG.overlayColor;
    ctx.fillRect(0, 0, w, h);

    // Overlay dégradé mystérieux
    const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
    grad.addColorStop(0,   'rgba(30,15,60,0.92)');
    grad.addColorStop(0.6, 'rgba(10,8,20,0.96)');
    grad.addColorStop(1,   'rgba(6,4,16,0.99)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Texte fantôme au centre
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.font = `${Math.min(w*0.35, 80)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a8b4ff';
    ctx.fillText('👻', w/2, h/2 - 20);
    ctx.restore();

    // "Gratter" hint — particules d'étoiles statiques
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2 + 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,180,255,${Math.random() * 0.12 + 0.04})`;
      ctx.fill();
    }
  }

  // ── ÉVÉNEMENTS ─────────────────────────────────────────
  function _bindEvents() {
    canvas.addEventListener('mousedown',  _onStart, { passive: false });
    canvas.addEventListener('mousemove',  _onMove,  { passive: false });
    canvas.addEventListener('mouseup',    _onEnd);
    canvas.addEventListener('mouseleave', _onEnd);
    canvas.addEventListener('touchstart', _onStart, { passive: false });
    canvas.addEventListener('touchmove',  _onMove,  { passive: false });
    canvas.addEventListener('touchend',   _onEnd,   { passive: false });
    canvas.addEventListener('touchcancel',_onEnd);
  }

  function _getPos(e) {
    const r = canvas.getBoundingClientRect();
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
    isDrawing = true;
    _playStartSound();
    const p = _getPos(e);
    _scratch(p.x, p.y);
  }

  function _onMove(e) {
    e.preventDefault();
    if (!isDrawing || revealed) return;
    const p = _getPos(e);
    _scratch(p.x, p.y);
  }

  function _onEnd(e) {
    if (e) e.preventDefault();
    isDrawing = false;
    _checkReveal();
  }

  // ── GRATTER ─────────────────────────────────────────────
  function _scratch(x, y) {
    const isMobile = window.innerWidth < 500;
    const r = isMobile ? CFG.brushRadiusMobile : CFG.brushRadius;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Pinceau principal
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

    // Glow vu au-dessus du canvas (effet lumineux autour du doigt)
    _drawGlowCursor(x, y, r);

    // Update progress
    _updateProgress();
  }

  function _drawGlowCursor(x, y, r) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.5);
    grad.addColorStop(0,   CFG.glowColor);
    grad.addColorStop(0.5, 'rgba(168,180,255,0.06)');
    grad.addColorStop(1,   'rgba(168,180,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── PROGRESSION ─────────────────────────────────────────
  function _updateProgress() {
    // Échantillonnage rapide (~4000px instead of all)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let transparent = 0;
    const step = 4 * 4; // sample every 4th pixel
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 128) transparent++;
    }
    const sampledTotal = Math.floor(data.length / (4 * 4));
    const pct = transparent / sampledTotal;

    // Update texte
    if (progressEl) {
      const pctDisplay = Math.min(Math.round(pct * 100), 100);
      if (pct < 0.3) {
        progressEl.textContent = '✧ Frottez pour révéler';
      } else if (pct < 0.5) {
        progressEl.textContent = `🌫️ ${pctDisplay}% révélé…`;
      } else if (pct < CFG.revealThreshold) {
        progressEl.textContent = `👻 Presque… ${pctDisplay}%`;
      }
    }

    if (pct >= CFG.revealThreshold && !revealed) {
      _autoReveal();
    }
  }

  function _checkReveal() {
    if (!revealed) _updateProgress();
  }

  // ── RÉVÉLATION AUTO ─────────────────────────────────────
  function _autoReveal() {
    if (revealed) return;
    revealed = true;

    // Masquer hint
    if (progressEl) {
      progressEl.style.opacity = '0';
      progressEl.style.transition = 'opacity 0.3s';
    }

    // Son de révélation
    _playRevealSound();

    // Flash de lumière
    _triggerRevealFlash();

    // Particules
    _spawnParticles();

    // Effacer le reste du canvas avec animation
    _clearCanvas(() => {
      // Supprimer overlay
      if (overlay && overlay.parentNode) {
        overlay.style.transition = `opacity ${CFG.fadeOutDuration}ms ease`;
        overlay.style.opacity = '0';
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          if (onRevealCb) onRevealCb();
        }, CFG.fadeOutDuration);
      }
    });
  }

  function _clearCanvas(cb) {
    let alpha = 1;
    const step = () => {
      alpha -= 0.06;
      if (alpha <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (cb) cb();
        return;
      }
      ctx.globalAlpha = alpha;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── FLASH DE RÉVÉLATION ─────────────────────────────────
  function _triggerRevealFlash() {
    const flash = document.getElementById('sealBreakFlash');
    if (!flash) return;
    flash.style.background = 'radial-gradient(ellipse at center,rgba(200,210,255,0.9) 0%,rgba(140,120,255,0.5) 40%,transparent 75%)';
    flash.style.animation = 'none';
    flash.offsetWidth; // reflow
    flash.style.animation = 'sealFlash 0.7s ease-out forwards';
  }

  // ── PARTICULES ──────────────────────────────────────────
  function _spawnParticles() {
    const container = document.getElementById('sealParticles');
    if (!container) return;

    const colors = [
      'rgba(168,180,255,0.9)',
      'rgba(200,210,255,0.8)',
      'rgba(100,220,160,0.7)',
      'rgba(255,200,120,0.6)',
    ];

    for (let i = 0; i < CFG.particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'reso-particle';
      const angle  = (Math.PI * 2 * i) / CFG.particleCount + Math.random() * 0.5;
      const dist   = 60 + Math.random() * 80;
      const size   = 3 + Math.random() * 4;
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const dur    = 0.5 + Math.random() * 0.6;

      // Position centrée dans l'overlay
      const rect = overlay ? overlay.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 300, height: 200 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;

      Object.assign(p.style, {
        left:       `${cx}px`,
        top:        `${cy}px`,
        width:      `${size}px`,
        height:     `${size}px`,
        background: color,
        boxShadow:  `0 0 ${size*2}px ${color}`,
        '--px':     `${Math.cos(angle) * dist}px`,
        '--py':     `${Math.sin(angle) * dist}px`,
        '--dur':    `${dur}s`,
        position:   'fixed',
        zIndex:     9999,
        borderRadius:'50%',
        pointerEvents:'none',
        animation:  `particleRise ${dur}s cubic-bezier(.25,.46,.45,.94) forwards`,
      });
      document.body.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 100);
    }
  }

  // ── SON ──────────────────────────────────────────────────
  function _getAudioCtx() {
    if (!CFG.soundEnabled) return null;
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    return audioCtx;
  }

  function _playStartSound() {
    const ac = _getAudioCtx();
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ac.currentTime);
      gain.gain.setValueAtTime(0.04, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.15);
    } catch(e) {}
  }

  function _playRevealSound() {
    const ac = _getAudioCtx();
    if (!ac) return;
    try {
      const frequencies = [220, 330, 440, 660];
      frequencies.forEach((f, i) => {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ac.currentTime + i * 0.06);
        osc.frequency.exponentialRampToValueAtTime(f * 1.5, ac.currentTime + i * 0.06 + 0.2);
        gain.gain.setValueAtTime(0.08, ac.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.06 + 0.35);
        osc.start(ac.currentTime + i * 0.06);
        osc.stop(ac.currentTime + i * 0.06 + 0.4);
      });
    } catch(e) {}
  }

  // ── DESTROY ─────────────────────────────────────────────
  function destroy() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    canvas = ctx = overlay = progressEl = null;
    revealed = false;
    isDrawing = false;
  }

  // ── API PUBLIQUE ─────────────────────────────────────────
  return { init, destroy };

})();

export default GhostScratch;
