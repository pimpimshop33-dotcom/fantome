// ── GHOSTUB Haptics Service ──────────────────────────────
// Patterns de vibration contextuels
// Usage : import HapticsService from './services/haptics.service.js';
//         HapticsService.ghostNearby();

class _HapticsService {
  constructor() {
    this.enabled = true;
    this.supported = !!(navigator.vibrate);
  }

  setEnabled(v) { this.enabled = !!v; }

  _vibrate(pattern) {
    if (!this.enabled || !this.supported) return;
    try { navigator.vibrate(pattern); } catch(e) {}
  }

  // ── Fantôme détecté à proximité ──
  ghostNearby() { this._vibrate([50, 30, 50]); }

  // ── Sceau qui résiste (pendant le hold) ──
  sealResist() { this._vibrate([30, 20, 30]); }

  // ── Sceau brisé (ouverture réussie) ──
  sealBreak() { this._vibrate([10, 30, 20, 40, 10, 30, 250]); }

  // ── Révélation du message ──
  reveal() { this._vibrate([20, 60, 20]); }

  // ── Résonance envoyée ──
  resonance() { this._vibrate([200, 100, 200]); }

  // ── Dépôt ancré ──
  deposit() { this._vibrate([15, 40, 15, 40, 300]); }

  // ── Fantôme rare trouvé ──
  rareGhost() { this._vibrate([50, 30, 50, 30, 50, 100, 300]); }

  // ── Ghost Whisper reçu ──
  whisper() { this._vibrate([30, 80, 30, 80, 30, 150, 30, 150, 400]); }

  // ── Secret révélé ──
  secretRevealed() { this._vibrate([300, 100, 300, 100, 500]); }

  // ── Erreur / rejet ──
  error() { this._vibrate([100, 50, 100]); }

  // ── Milestone atteint ──
  milestone() { this._vibrate([50, 30, 50, 30, 100]); }

  // ── Tap léger (confirmation UI) ──
  tap() { this._vibrate([10]); }

  // ── Respiration fantôme (proximité) ──
  breathe(distanceM) {
    if (distanceM <= 10) {
      this._vibrate([80, 120, 80]); // très proche = fort
    } else if (distanceM <= 20) {
      this._vibrate([50, 150, 50]); // proche
    } else if (distanceM <= 30) {
      this._vibrate([30, 200, 30]); // moyen
    }
  }

  // ── Notification (pattern standard) ──
  notification() { this._vibrate([200, 100, 200, 100, 200]); }
}

const HapticsService = new _HapticsService();
export default HapticsService;
