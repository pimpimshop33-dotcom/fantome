/**
 * GHOSTUB - Application principale
 * Version optimisée - v3.0
 * 
 * Améliorations :
 * - Gestion des fuites mémoire avec système de nettoyage
 * - Modularisation i18n
 * - Rendu DOM optimisé
 * - Code structuré et commenté
 */

// ============================================================
// IMPORTS
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, addDoc, getDocs, query, where, orderBy, limit, 
  doc, getDoc, setDoc, updateDoc, deleteDoc, increment, 
  serverTimestamp, GeoPoint, runTransaction, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import WorldService, { buildGeohashFields, encodeGeohash } from './services/world.service.js?v=3';
import GhostService from './services/ghost.service.js';
import LocationService from './services/location.service.js';
import GhostScratch from './ghost-scratch.js';

// ============================================================
// MODULES INTERNES (optimisation)
// ============================================================

// Module de traduction intégré (version inline pour éviter les imports croisés)
const LANGS = {
  fr: {
    ob_start: '👻 Commencer',
    ob_title1: 'Découvrez', ob_sub1: 'Passez près d\'un lieu et les fantômes autour de vous apparaissent.',
    ob_title2: 'Ouvrez', ob_sub2: 'Chaque message est une enveloppe scellée à dévoiler.',
    ob_title3: 'Résonnez', ob_sub3: 'Une résonance par jour — choisissez le message qui vous touche.',
    ob_cta: 'Entrer dans les lieux ›', ob_skip: 'Passer →', ob_free: 'Gratuit · Sans pub',
    auth_login_tab: 'Connexion', auth_register_tab: 'Inscription',
    auth_email: 'Email', auth_password: 'Mot de passe', auth_pseudo: 'Pseudo',
    auth_login_btn: 'Se connecter', auth_register_btn: 'Créer mon compte',
    auth_err_fields: 'Remplissez tous les champs.', auth_err_short_pass: 'Mot de passe trop court (6 car. min).',
    auth_err_email: 'Email invalide.', auth_err_wrong: 'Email ou mot de passe incorrect.',
    auth_loading: 'Connexion…', auth_pass_hint: '6 caractères minimum',
    radar_area_title: 'Aux alentours', radar_invoke_btn: '↻ Invoquer',
    radar_vibe_label: 'Détection active · présences en attente',
    radar_locating: 'Localisation en cours…', radar_searching: '🔍 Recherche de fantômes…',
    radar_no_gps: 'Géolocalisation refusée — activez-la dans les paramètres de votre navigateur.',
    radar_no_ghosts: 'Aucun fantôme proche — soyez le premier !',
    radar_firestore_err: 'Impossible de charger les fantômes — vérifiez votre connexion.',
    radar_offline: '📵 Hors ligne — données peut-être incomplètes.',
    detail_sealed_label: 'Une trace vous attend ici', detail_sealed_hint: 'Approchez-vous pour briser le sceau',
    detail_open_btn: '✉ Briser le sceau', detail_anonymous: 'Anonyme', detail_from_you: 'de vous',
    detail_replies_title: 'Réponses dans ce lieu', detail_share_ghost_btn: '↗ Partager ce fantôme',
    detail_reply_ghost_btn: '↩ Laisser une réponse ici', detail_report_btn: '⚑ Signaler ce fantôme',
    detail_reso_btn: '✦ Résonner · {n} résonances', detail_reso_used: '✦ Résonance utilisée aujourd\'hui',
    detail_reso_sent: '✦ Résonance envoyée — merci ✨', detail_first_toast: '🥇 Vous êtes le premier à lire ce message !',
    env_gps_checking: '📡 Vérification de votre position…', env_gps_slow: '⚠️ GPS trop long — déplacez-vous en extérieur et réessayez.',
    env_resist: '🌫️ Le sceau résiste encore', env_resist_dist: 'encore {n}m à parcourir', env_hint_reset: 'Approchez-vous pour briser le sceau',
    dep_title: 'Déposer', dep_msg_placeholder: 'Laissez un message à cet endroit…',
    dep_loc_label: 'Nom du lieu', dep_duration_label: 'Durée de vie', dep_radius_label: 'Rayon de détection',
    dep_identity_label: 'Identité', dep_visibility_label: 'Visibilité', dep_vocal_label: 'Message vocal (optionnel)',
    dep_photo_label: 'Photo (optionnel)', dep_deposit_btn: '👻 Ancrer ce fantôme', dep_next_btn: 'Continuer →',
    dep_back: '← Retour', dep_success_title: 'Fantôme ancré',
    dep_success_sub: 'Votre trace repose dans ce lieu.<br>Une âme la découvrira… peut-être.',
    dep_dur_24h: '24h', dep_dur_7d: '7 jours', dep_dur_1m: '1 mois', dep_dur_eternal: '♾ Éternel',
    dep_cond_always_label: 'Toujours accessible', dep_cond_night_label: 'La nuit uniquement', dep_cond_hour_label: 'À une heure précise',
    profile_title: 'Mon Empreinte', profile_rank: 'Rang', profile_logout: '🚪 Déconnexion',
    profile_activate_btn: 'Activer', profile_code_question: 'Vous avez un code d\'activation ?',
    profile_day_mode: 'Mode jour', profile_night_mode: 'Mode nuit',
    nav_radar: 'Radar', nav_map: 'Carte', nav_deposit: 'Déposer', nav_profile: 'Profil',
    misc_loading: 'Chargement…', misc_error_generic: 'Erreur — réessaie plus tard.',
    misc_offline_title: '📵 Hors ligne', misc_update_banner: '🔄 Nouvelle version disponible',
    misc_update_btn: 'Mettre à jour', misc_ptr_pull: 'Tirer pour actualiser',
    misc_ptr_release: 'Relâcher pour actualiser', misc_ptr_refreshing: 'Actualisation…',
    map_title: 'Carte des fantômes', map_hunt_on: '🎯 Chasse ON', map_hunt_off: '🎯 Chasse', map_share_btn: '↗ Partager',
    filter_all: '🌫️ Toutes', filter_recent: '✨ Récentes', filter_photo: '📷 Visions',
    filter_audio: '🎙 Voix', filter_video: '🎥 Vidéos',
    help_back: '← retour', help_title: 'Comment ça marche ?', help_version: 'Ghostub v1.0 — Géocaching émotionnel',
  },
  en: {
    ob_start: '👻 Get started', ob_title1: 'Discover', ob_sub1: 'Pass near a location and the ghosts around you appear.',
    ob_title2: 'Open', ob_sub2: 'Every message is a sealed envelope to unveil.',
    ob_title3: 'Resonate', ob_sub3: 'One resonance a day — pick the message that moves you.',
    ob_cta: 'Enter the locations ›', ob_skip: 'Skip →', ob_free: 'Free · No ads',
    auth_login_tab: 'Sign in', auth_register_tab: 'Sign up',
    auth_email: 'Email', auth_password: 'Password', auth_pseudo: 'Username',
    auth_login_btn: 'Sign in', auth_register_btn: 'Create account',
    auth_err_fields: 'Please fill in all fields.', auth_err_short_pass: 'Password too short (6 chars min).',
    auth_err_email: 'Invalid email.', auth_err_wrong: 'Incorrect email or password.',
    auth_loading: 'Signing in…', auth_pass_hint: '6 characters minimum',
    radar_area_title: 'Nearby', radar_invoke_btn: '↻ Invoke',
    radar_vibe_label: 'Detection active · presences waiting',
    radar_locating: 'Getting your location…', radar_searching: '🔍 Searching for ghosts…',
    radar_no_gps: 'Location denied — enable it in your browser settings.',
    radar_no_ghosts: 'No ghosts nearby — be the first!',
    radar_firestore_err: 'Could not load ghosts — check your connection.',
    radar_offline: '📵 Offline — data may be incomplete.',
    detail_sealed_label: 'A trace is waiting here', detail_sealed_hint: 'Move closer to break the seal',
    detail_open_btn: '✉ Break the seal', detail_anonymous: 'Anonymous', detail_from_you: 'from you',
    detail_replies_title: 'Replies at this location', detail_share_ghost_btn: '↗ Share this ghost',
    detail_reply_ghost_btn: '↩ Leave a reply here', detail_report_btn: '⚑ Report this ghost',
    detail_reso_btn: '✦ Resonate · {n} resonances', detail_reso_used: '✦ Resonance used today',
    detail_reso_sent: '✦ Resonance sent — thank you ✨', detail_first_toast: '🥇 You are the first to read this message!',
    env_gps_checking: '📡 Checking your position…', env_gps_slow: '⚠️ GPS taking too long — go outside and try again.',
    env_resist: '🌫️ The seal still resists', env_resist_dist: '{n}m still to go', env_hint_reset: 'Move closer to break the seal',
    dep_title: 'Drop', dep_msg_placeholder: 'Leave a message at this spot…',
    dep_loc_label: 'Place name', dep_duration_label: 'Lifespan', dep_radius_label: 'Detection radius',
    dep_identity_label: 'Identity', dep_visibility_label: 'Visibility', dep_vocal_label: 'Voice message (optional)',
    dep_photo_label: 'Photo (optional)', dep_deposit_btn: '👻 Anchor this ghost', dep_next_btn: 'Continue →',
    dep_back: '← Back', dep_success_title: 'Ghost anchored',
    dep_success_sub: 'Your trace rests in this place.<br>A soul will discover it… perhaps.',
    dep_dur_24h: '24h', dep_dur_7d: '7 days', dep_dur_1m: '1 month', dep_dur_eternal: '♾ Eternal',
    dep_cond_always_label: 'Always accessible', dep_cond_night_label: 'Night only', dep_cond_hour_label: 'At a specific time',
    profile_title: 'My Footprint', profile_rank: 'Rank', profile_logout: '🚪 Sign out',
    profile_activate_btn: 'Activate', profile_code_question: 'Do you have an activation code?',
    profile_day_mode: 'Day mode', profile_night_mode: 'Night mode',
    nav_radar: 'Radar', nav_map: 'Map', nav_deposit: 'Drop', nav_profile: 'Profile',
    misc_loading: 'Loading…', misc_error_generic: 'Error — please try again later.',
    misc_offline_title: '📵 Offline', misc_update_banner: '🔄 New version available',
    misc_update_btn: 'Update', misc_ptr_pull: 'Pull to refresh',
    misc_ptr_release: 'Release to refresh', misc_ptr_refreshing: 'Refreshing…',
    map_title: 'Ghost Map', map_hunt_on: '🎯 Hunt ON', map_hunt_off: '🎯 Hunt', map_share_btn: '↗ Share',
    filter_all: '🌫️ All', filter_recent: '✨ Recent', filter_photo: '📷 Visions',
    filter_audio: '🎙 Voices', filter_video: '🎥 Videos',
    help_back: '← back', help_title: 'How does it work?', help_version: 'Ghostub v1.0 — Emotional geocaching',
  }
};

let _currentLang = (() => {
  const saved = localStorage.getItem('ghostub_lang');
  if (saved && LANGS[saved]) return saved;
  const browser = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return LANGS[browser] ? browser : 'fr';
})();

const t = new Proxy({}, {
  get(_, key) {
    const val = LANGS[_currentLang]?.[key];
    return val !== undefined ? val : (LANGS['fr'][key] || key);
  }
});

window.t = t;

function setLang(lang) {
  if (!LANGS[lang]) return;
  _currentLang = lang;
  localStorage.setItem('ghostub_lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t[key];
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t[key];
    if (val !== undefined) el.placeholder = val;
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (typeof refreshProfileStats === 'function') refreshProfileStats();
  if (typeof updatePremiumUI === 'function') updatePremiumUI();
  if (typeof loadNearbyGhosts === 'function') loadNearbyGhosts().catch(() => {});
}

window.setLang = setLang;

// ============================================================
// SYSTÈME DE NETTOYAGE (anti-fuite mémoire)
// ============================================================

const _cleanupFunctions = [];

function registerCleanup(fn) {
  if (typeof fn === 'function') _cleanupFunctions.push(fn);
}

function performCleanup() {
  console.log(`[Cleanup] Nettoyage de ${_cleanupFunctions.length} fonctions...`);
  _cleanupFunctions.forEach(fn => { try { fn(); } catch(e) { console.warn(e); } });
  _cleanupFunctions.length = 0;
}

// ============================================================
// CONFIGURATION FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDtxsiaZgs2iycJRBK3SCvNuOarW7wEWaI",
  authDomain: "fantome-app.firebaseapp.com",
  projectId: "fantome-app",
  storageBucket: "fantome-app.firebasestorage.app",
  messagingSenderId: "62498675696",
  appId: "1:62498675696:web:9df717cdcda47a84d1db35"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// CONSTANTES GLOBALES
// ============================================================

const CLOUDINARY_CLOUD = 'dcarogsye';
const CLOUDINARY_UPLOAD_PRESET = 'fantome_unsigned';
const DAILY_OPEN_LIMIT = 3;

const COLL = {
  GHOSTS: 'ghosts', USERS: 'users', REPLIES: 'replies', NOTIFS: 'notifications',
  REPORTS: 'reports', DISCOVERIES: 'discoveries', PREMIUM_CODES: 'premiumCodes',
  GHOST_STATS: 'ghostStats', WHISPERS: 'whispers'
};

// ============================================================
// ÉTAT GLOBAL
// ============================================================

let currentUser = null;
let isPremium = false;
let userLat = null, userLng = null;
let nearbyGhosts = [];
let selectedGhost = null;
let map = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingInterval = null;
let activeFilter = 'all';
let currentGhostIndex = 0;
let huntMode = false;
let _unsubResonances = null;
let _gpsUnsub = null;
let _notifIntervalsStarted = false;
let _notifIntervalIds = [];

// ============================================================
// FONCTIONS UTILITAIRES (optimisées)
// ============================================================

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDistance(m) {
  return m < 1000 ? Math.round(m) + 'm' : (m / 1000).toFixed(1) + 'km';
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  const fr = _currentLang === 'fr';
  if (s < 60) return fr ? 'à l\'instant' : 'just now';
  if (s < 3600) return fr ? 'il y a ' + Math.floor(s / 60) + ' min' : Math.floor(s / 60) + ' min ago';
  if (s < 86400) return fr ? 'il y a ' + Math.floor(s / 3600) + 'h' : Math.floor(s / 3600) + 'h ago';
  return fr ? 'il y a ' + Math.floor(s / 86400) + ' jours' : Math.floor(s / 86400) + ' days ago';
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isExpired(g) {
  if (g.expired) return true;
  if (!g.createdAt) return false;
  const durations = { '24h': 86400000, '7 jours': 604800000, '1 mois': 2592000000 };
  const maxAge = durations[g.duration];
  if (!maxAge) return false;
  return (Date.now() - g.createdAt.seconds * 1000) > maxAge;
}

function timeRemaining(g) {
  if (!g.createdAt) return _currentLang === 'fr' ? 'Permanent' : 'Permanent';
  const durations = { '24h': 86400000, '7 jours': 604800000, '1 mois': 2592000000 };
  const maxAge = durations[g.duration];
  if (!maxAge) return _currentLang === 'fr' ? 'Permanent' : 'Permanent';
  const remaining = maxAge - (Date.now() - g.createdAt.seconds * 1000);
  if (remaining <= 0) return _currentLang === 'fr' ? 'Expiré' : 'Expired';
  const days = Math.floor(remaining / 86400000);
  if (days > 0) return _currentLang === 'fr' ? `Expire dans ${days}j` : `Expires in ${days}d`;
  const hours = Math.floor(remaining / 3600000);
  if (hours > 0) return _currentLang === 'fr' ? `Expire dans ${hours}h` : `Expires in ${hours}h`;
  const minutes = Math.floor(remaining / 60000);
  return _currentLang === 'fr' ? `Expire dans ${minutes}min` : `Expires in ${minutes}min`;
}

function getPoeticName(ghostId) {
  let hash = 0;
  for (let i = 0; i < ghostId.length; i++) hash = (hash * 31 + ghostId.charCodeAt(i)) >>> 0;
  const adj = ['silencieux', 'nocturne', 'perdu', 'oublié', 'errant', 'pâle', 'lointain', 'secret'];
  const noun = ['passant', 'souffle', 'murmure', 'reflet', 'voyageur', 'ombre', 'témoin', 'spectre'];
  const time = ['du soir', 'de l\'aube', 'd\'hiver', 'de minuit', 'd\'automne', 'du crépuscule'];
  const adjEn = ['silent', 'nocturnal', 'lost', 'forgotten', 'wandering', 'pale', 'distant', 'secret'];
  const nounEn = ['wanderer', 'whisper', 'murmur', 'reflection', 'traveler', 'shadow', 'witness', 'specter'];
  const timeEn = ['of the evening', 'of the dawn', 'of winter', 'of midnight', 'of autumn', 'of dusk'];
  if (_currentLang === 'en') {
    return `The ${adjEn[hash % adjEn.length]} ${nounEn[(hash >> 4) % nounEn.length]} ${timeEn[(hash >> 8) % timeEn.length]}`;
  }
  return `Le ${noun[hash % noun.length]} ${adj[(hash >> 4) % adj.length]} ${time[(hash >> 8) % time.length]}`;
}

// ============================================================
// GESTION DES DÉCOUVERTES (localStorage + Firestore)
// ============================================================

function getDiscoveryKey() {
  return currentUser ? 'discoveries_' + currentUser.uid : 'discoveries_anon';
}

function getDiscoveredIds() {
  try { return JSON.parse(localStorage.getItem(getDiscoveryKey()) || '[]'); } catch(e) { return []; }
}

function addDiscovery(ghostId) {
  const ids = getDiscoveredIds();
  if (ids.includes(ghostId)) return false;
  ids.push(ghostId);
  localStorage.setItem(getDiscoveryKey(), JSON.stringify(ids));
  if (currentUser) {
    setDoc(doc(db, 'userStats', currentUser.uid), { discoveries: ids }, { merge: true }).catch(() => {});
  }
  return true;
}

function getDiscoveryCount() {
  return getDiscoveredIds().length;
}

// ============================================================
// GESTION DES FAVORIS
// ============================================================

function getFavKey() {
  return currentUser ? 'favorites_' + currentUser.uid : 'favorites_anon';
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(getFavKey()) || '[]'); } catch(e) { return []; }
}

function isFavorite(ghostId) {
  return getFavorites().some(f => f.id === ghostId);
}

function saveFavorites(favs) {
  localStorage.setItem(getFavKey(), JSON.stringify(favs));
}

function toggleFavorite() {
  if (!selectedGhost) return;
  const favs = getFavorites();
  const idx = favs.findIndex(f => f.id === selectedGhost.id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    showToast('info', t.toast_fav_removed || '★ Retiré des favoris');
  } else {
    favs.unshift({
      id: selectedGhost.id,
      emoji: selectedGhost.emoji || '👻',
      location: selectedGhost.location || 'Lieu inconnu',
      message: (selectedGhost.message || '').substring(0, 60),
      savedAt: Date.now()
    });
    showToast('success', t.toast_fav_added || '★ Ajouté aux favoris');
  }
  saveFavorites(favs);
  updateFavoriteBtn();
  updateFavoritesCount();
}

function updateFavoriteBtn() {
  const btn = document.getElementById('favoriteBtn');
  if (!btn || !selectedGhost) return;
  const fav = isFavorite(selectedGhost.id);
  btn.textContent = fav ? '★ Dans vos favoris' : '★ Ajouter aux favoris';
  btn.style.color = fav ? 'rgba(255,200,80,.9)' : 'rgba(255,200,80,.5)';
  btn.style.borderColor = fav ? 'rgba(255,200,80,.5)' : 'rgba(255,200,80,.2)';
}

function updateFavoritesCount() {
  const el = document.getElementById('statFavorites');
  if (el) el.textContent = getFavorites().length;
}

// ============================================================
// GESTION DE LA RÉSONANCE QUOTIDIENNE
// ============================================================

function getDailyResoKey() {
  const d = new Date();
  const uid = currentUser ? currentUser.uid : 'anon';
  return `daily_reso_${uid}_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function hasResonatedToday() {
  return !!localStorage.getItem(getDailyResoKey());
}

function markResonatedToday(ghostId) {
  localStorage.setItem(getDailyResoKey(), ghostId);
}

// ============================================================
// GESTION DES OUVERTURES JOURNALIÈRES
// ============================================================

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyOpenCountLocal() {
  const uid = currentUser ? currentUser.uid : 'anon';
  const key = `daily_opens_${uid}_${_todayKey()}`;
  return parseInt(localStorage.getItem(key) || '0');
}

function _incrementLocal() {
  const uid = currentUser ? currentUser.uid : 'anon';
  const key = `daily_opens_${uid}_${_todayKey()}`;
  localStorage.setItem(key, getDailyOpenCountLocal() + 1);
}

async function canOpenToday() {
  if (isPremium) return true;
  if (!currentUser) return getDailyOpenCountLocal() < DAILY_OPEN_LIMIT;
  try {
    const ref = doc(db, 'userStats', currentUser.uid);
    const snap = await getDoc(ref);
    const count = snap.exists() ? (snap.data().dailyOpens?.[_todayKey()] || 0) : 0;
    return count < DAILY_OPEN_LIMIT;
  } catch(e) {
    return getDailyOpenCountLocal() < DAILY_OPEN_LIMIT;
  }
}

async function incrementDailyOpenCount() {
  if (!currentUser) { _incrementLocal(); return; }
  const today = _todayKey();
  const ref = doc(db, 'userStats', currentUser.uid);
  try {
    await setDoc(ref, { dailyOpens: { [today]: increment(1) } }, { merge: true });
  } catch(e) {}
  _incrementLocal();
}

async function remainingOpensToday() {
  if (isPremium) return Infinity;
  if (!currentUser) return Math.max(0, DAILY_OPEN_LIMIT - getDailyOpenCountLocal());
  try {
    const ref = doc(db, 'userStats', currentUser.uid);
    const snap = await getDoc(ref);
    const count = snap.exists() ? (snap.data().dailyOpens?.[_todayKey()] || 0) : 0;
    return Math.max(0, DAILY_OPEN_LIMIT - count);
  } catch(e) {
    return Math.max(0, DAILY_OPEN_LIMIT - getDailyOpenCountLocal());
  }
}

// ============================================================
// GESTION DES TOASTS
// ============================================================

let _toastTimer = null;

function showToast(type, msg, duration = 3200) {
  const toast = document.getElementById('discoveryToast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastText');
  if (!toast || !icon || !text) return;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: '👻', report: '⚑', link: '🔗' };
  icon.textContent = icons[type] || '👻';
  text.innerHTML = msg;
  clearTimeout(_toastTimer);
  toast.classList.remove('show');
  requestAnimationFrame(() => {
    toast.classList.add('show');
    _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  });
}

// ============================================================
// RENDU OPTIMISÉ DE LA LISTE DES FANTÔMES
// ============================================================

let _ghostListContainer = null;
let _renderedGhostIds = [];

function initGhostListContainer() {
  _ghostListContainer = document.getElementById('ghostList');
}

function getHintText(ghost) {
  const neverOpened = !ghost.openCount || ghost.openCount === 0;
  const ageDays = ghost.createdAt ? (Date.now() - ghost.createdAt.seconds * 1000) / 86400000 : 0;
  if (neverOpened && ageDays > 30) return `🕯 Attend depuis ${Math.floor(ageDays)} jours — jamais lu`;
  if (neverOpened) return '✦ Aucun regard ne l\'a encore lu…';
  if (ghost.openCondition === 'night') return '🌙 S\'éveille la nuit';
  if (ghost.openCondition === 'hour') return `⏰ ${ghost.openHour || ''}`;
  if (ghost.openCondition === 'after') return '🔗 Prérequis requis';
  return '✦ Un secret vous attend…';
}

function getResonanceStars(ghost) {
  const resoCount = ghost.resonances || 0;
  const text = resoCount > 0 ? '✦'.repeat(Math.min(resoCount, 5)) : '✦ 0';
  const style = resoCount >= 5 ? 'color:rgba(255,200,80,.9);text-shadow:0 0 8px rgba(255,200,80,.4);' : 
                resoCount >= 2 ? 'color:rgba(168,180,255,.8);' : '';
  return { text, style };
}

function getAgeStyle(ghost) {
  if (!ghost.createdAt) return '';
  const ageDays = (Date.now() - ghost.createdAt.seconds * 1000) / 86400000;
  if (ageDays > 180) return 'filter:sepia(.6) opacity(.85);';
  if (ageDays > 30) return 'filter:sepia(.25) opacity(.92);';
  return '';
}

function createGhostElement(ghost) {
  const div = document.createElement('div');
  div.className = `ghost-envelope ${ghost.secret ? 'ghost-envelope-secret' : ''}`;
  div.setAttribute('data-ghost-id', ghost.id);
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.setAttribute('onclick', `openGhost('${escapeHTML(ghost.id)}')`);
  
  const emoji = ghost.secret ? '🔮' : (ghost.businessMode ? '🏪' : escapeHTML(ghost.emoji || '👻'));
  const authorDisplay = ghost.anonymous ? getPoeticName(ghost.id) : escapeHTML(ghost.author || '');
  const hintText = getHintText(ghost);
  const ageStyle = getAgeStyle(ghost);
  const resoStars = getResonanceStars(ghost);
  const distStyle = ghost.distance <= 50 ? 'background:rgba(100,220,160,.1);border:1px solid rgba(100,220,160,.25);color:rgba(100,220,160,.9);' :
                    ghost.distance <= 200 ? 'background:rgba(255,200,80,.08);border:1px solid rgba(255,200,80,.2);color:rgba(255,200,80,.8);' :
                    'background:rgba(168,180,255,.08);border:1px solid rgba(168,180,255,.12);color:rgba(168,180,255,.6);';
  
  div.innerHTML = `
    <div class="envelope-flap" aria-hidden="true"></div>
    <div class="envelope-body">
      <div class="envelope-emoji" aria-hidden="true">${emoji}</div>
      <div class="envelope-content">
        <div class="envelope-location">📍 ${escapeHTML(ghost.location || 'Lieu inconnu')}${ghost.secret ? ' <span class="secret-badge">SECRET</span>' : ''}</div>
        <div class="envelope-hint">${hintText}</div>
      </div>
      <div class="envelope-meta">
        <div class="envelope-dist" style="${distStyle}">${formatDistance(ghost.distance)}</div>
        <div class="envelope-reso" style="${resoStars.style}">${resoStars.text}</div>
        ${ghost.openCount > 0 ? `<div class="envelope-views">👁 ${ghost.openCount}</div>` : ''}
      </div>
    </div>
    <div class="envelope-footer">
      <div class="envelope-tag">${authorDisplay}</div>
      <div class="envelope-tag">⏳ ${timeRemaining(ghost)}</div>
      <div class="envelope-tag">${timeAgo(ghost.createdAt)}</div>
    </div>
  `;
  
  if (ageStyle) div.style.cssText = ageStyle;
  return div;
}

function updateGhostElement(el, ghost) {
  const distEl = el.querySelector('.envelope-dist');
  if (distEl) {
    const newDist = formatDistance(ghost.distance);
    if (distEl.textContent !== newDist) {
      distEl.textContent = newDist;
      const style = ghost.distance <= 50 ? 'background:rgba(100,220,160,.1);border:1px solid rgba(100,220,160,.25);color:rgba(100,220,160,.9);' :
                    ghost.distance <= 200 ? 'background:rgba(255,200,80,.08);border:1px solid rgba(255,200,80,.2);color:rgba(255,200,80,.8);' :
                    'background:rgba(168,180,255,.08);border:1px solid rgba(168,180,255,.12);color:rgba(168,180,255,.6);';
      distEl.style.cssText = style;
    }
  }
  const resoEl = el.querySelector('.envelope-reso');
  if (resoEl) {
    const stars = getResonanceStars(ghost);
    if (resoEl.textContent !== stars.text) {
      resoEl.textContent = stars.text;
      resoEl.style.cssText = stars.style;
    }
  }
}

function showEmptyGhostList() {
  if (!_ghostListContainer) return;
  _ghostListContainer.innerHTML = `
    <div style="text-align:center;padding:40px 16px 20px;">
      <div style="font-size:52px;margin-bottom:14px;opacity:.35;">👻</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:var(--ether);margin-bottom:6px;">Aucun fantôme dans ce lieu</div>
      <div style="font-size:12px;color:var(--spirit-dim);margin-bottom:22px;">Soyez le premier à hanter cet endroit.</div>
      <button onclick="showScreen('screenDeposit');setNav('nav-deposit')" class="empty-cta-btn">👻 Déposer un fantôme</button>
    </div>`;
}

function renderGhostList() {
  if (!_ghostListContainer) initGhostListContainer();
  if (!_ghostListContainer) return;
  
  const filtered = getFilteredGhosts();
  
  if (nearbyGhosts.length === 0) {
    showEmptyGhostList();
    _renderedGhostIds = [];
    return;
  }
  
  if (filtered.length === 0) {
    _ghostListContainer.innerHTML = `<div style="text-align:center;padding:30px 0;font-size:13px;color:var(--spirit-dim);">Aucun fantôme dans ce filtre.</div>`;
    _renderedGhostIds = [];
    return;
  }
  
  const newIds = filtered.map(g => g.id);
  const added = newIds.filter(id => !_renderedGhostIds.includes(id));
  const removed = _renderedGhostIds.filter(id => !newIds.includes(id));
  const kept = newIds.filter(id => _renderedGhostIds.includes(id));
  
  removed.forEach(id => {
    const el = _ghostListContainer.querySelector(`.ghost-envelope[data-ghost-id="${id}"]`);
    if (el) el.remove();
  });
  
  added.forEach(id => {
    const ghost = filtered.find(g => g.id === id);
    if (ghost) {
      const el = createGhostElement(ghost);
      _ghostListContainer.appendChild(el);
    }
  });
  
  kept.forEach(id => {
    const ghost = filtered.find(g => g.id === id);
    const el = _ghostListContainer.querySelector(`.ghost-envelope[data-ghost-id="${id}"]`);
    if (ghost && el) updateGhostElement(el, ghost);
  });
  
  _renderedGhostIds = newIds;
}

function skeletonGhostList() {
  const list = document.getElementById('ghostList');
  if (!list) return;
  list.innerHTML = [1, 2, 3].map(() => `
    <div class="ghost-skel">
      <div class="skel-flap"></div>
      <div class="skel-body">
        <div class="skel-emoji"></div>
        <div class="skel-lines">
          <div class="skel-line skel-l1"></div>
          <div class="skel-line skel-l2"></div>
        </div>
        <div class="skel-dist"></div>
      </div>
    </div>`).join('');
}

// ============================================================
// FILTRES
// ============================================================

function getFilteredGhosts() {
  switch (activeFilter) {
    case 'recent': return [...nearbyGhosts].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    case 'photo': return nearbyGhosts.filter(g => g.photoUrl);
    case 'audio': return nearbyGhosts.filter(g => g.audioUrl);
    case 'video': return nearbyGhosts.filter(g => g.videoUrl);
    default: return nearbyGhosts;
  }
}

window.setFilter = (filter, btn) => {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGhostList();
};

// ============================================================
// RADAR DOTS
// ============================================================

function renderRadarDots() {
  const radar = document.getElementById('radarDots');
  if (!radar) return;
  radar.innerHTML = '';
  const maxDist = nearbyGhosts.length > 0 ? Math.max(...nearbyGhosts.slice(0, 8).map(g => g.distance), 100) : 100;
  nearbyGhosts.slice(0, 8).forEach((g, i) => {
    const angle = (i / Math.min(nearbyGhosts.length, 8)) * 2 * Math.PI - Math.PI / 2;
    const r = 15 + (g.distance / maxDist) * 29;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    const dot = document.createElement('div');
    dot.className = 'ghost-dot';
    dot.style.left = x + '%';
    dot.style.top = y + '%';
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
    dot.setAttribute('aria-label', `${escapeHTML(g.location || 'Fantôme')} — ${formatDistance(g.distance)}`);
    dot.onclick = () => openGhost(g.id);
    const emoji = g.secret ? '🔮' : (g.businessMode ? '🏪' : (g.emoji || '👻'));
    const label = escapeHTML(g.location || 'Fantôme');
    const sweepDuration = 4;
    const angleNorm = ((angle + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const delay = -(angleNorm / (2 * Math.PI)) * sweepDuration;
    dot.innerHTML = `
      <div class="ghost-dot-emoji" style="animation-delay:${delay.toFixed(2)}s">${emoji}</div>
      <div class="ghost-dot-inner"></div>
      <div class="ghost-dot-label">${label} · ${formatDistance(g.distance)}</div>
    `;
    radar.appendChild(dot);
  });
}

// ============================================================
// LOCALISATION
// ============================================================

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Géolocalisation non supportée');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; resolve(pos); },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  });
}

// ============================================================
// CHARGEMENT DES FANTÔMES PROCHES
// ============================================================

let _ghostsUnsub = null;

async function loadNearbyGhosts() {
  const refreshBtn = document.querySelector('.refresh-btn');
  if (refreshBtn) refreshBtn.classList.add('spinning');
  const vibeBar = document.querySelector('.vibe-bar');
  if (vibeBar) vibeBar.classList.add('invoking');
  
  skeletonGhostList();
  
  try {
    await getLocation();
  } catch(e) {
    if (!userLat || !userLng) {
      userLat = 46.6034;
      userLng = 1.8883;
    }
  }
  
  try {
    const snap = await WorldService.getVisibleGhosts(userLat, userLng);
    nearbyGhosts = [];
    snap.forEach(d => {
      const g = { id: d.id, ...d.data() };
      if (g.expired) return;
      if (isExpired(g)) {
        updateDoc(doc(db, COLL.GHOSTS, g.id), { expired: true }).catch(() => {});
        return;
      }
      if (g.lat && g.lng) {
        g.distance = distanceMeters(userLat, userLng, g.lat, g.lng);
        if (g.distance <= 5000) nearbyGhosts.push(g);
      }
    });
    nearbyGhosts.sort((a, b) => a.distance - b.distance);
    
    const count = nearbyGhosts.length;
    const gc = document.getElementById('ghostCount');
    if (gc) gc.textContent = count;
    const mc = document.getElementById('mapCount');
    if (mc) mc.textContent = count + ' fantôme(s)';
    
    renderGhostList();
    renderRadarDots();
    
    if (map) { map.remove(); map = null; }
    if (document.getElementById('screenMap')?.classList.contains('active')) {
      renderStaticMap();
    }
    
  } catch(e) {
    console.error('loadNearbyGhosts error:', e);
    showToast('error', t.radar_firestore_err);
  }
  
  if (refreshBtn) refreshBtn.classList.remove('spinning');
  if (vibeBar) vibeBar.classList.remove('invoking');
}

// ============================================================
// OUVERTURE D'UN FANTÔME
// ============================================================

function showBlockedOverlay(result) {
  const overlay = document.getElementById('ghostBlockedOverlay');
  const sealed = document.getElementById('envelopeSealed');
  const icon = document.getElementById('blockedIcon');
  const title = document.getElementById('blockedTitle');
  const sub = document.getElementById('blockedSub');
  const timer = document.getElementById('blockedTimer');
  const timerLbl = document.getElementById('blockedTimerLabel');
  
  icon.textContent = result.icon || '🌙';
  title.textContent = result.title || 'Pas encore accessible';
  sub.textContent = result.sub || '';
  
  if (result.timer) {
    timer.textContent = result.timer;
    timerLbl.textContent = result.timerLabel || '';
    timer.style.display = 'block';
    timerLbl.style.display = 'block';
  } else {
    timer.style.display = 'none';
    timerLbl.style.display = 'none';
  }
  
  overlay.classList.add('show');
  sealed.style.display = 'none';
}

function resetBlockedOverlay() {
  const overlay = document.getElementById('ghostBlockedOverlay');
  const sealed = document.getElementById('envelopeSealed');
  overlay.classList.remove('show');
  sealed.style.display = '';
}

function isConditionMet(ghost) {
  const cond = ghost.openCondition || 'always';
  if (cond === 'always') return { ok: true };
  if (cond === 'night') {
    const h = new Date().getHours();
    if (h >= 22 || h < 6) return { ok: true };
    return { ok: false, icon: '🌙', title: 'Ce fantôme s\'éveille la nuit', sub: 'Il n\'est accessible qu\'entre 22h et 6h.' };
  }
  if (cond === 'hour') {
    const targetTime = ghost.openHour || '20:00';
    const [th, tm] = targetTime.split(':').map(Number);
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const targetMin = th * 60 + tm;
    const diff = Math.abs(nowMin - targetMin);
    const diffAlt = 1440 - diff;
    if (Math.min(diff, diffAlt) <= 15) return { ok: true };
    return { ok: false, icon: '⏰', title: `Rendez-vous à ${targetTime}`, sub: 'Accessible 15 min avant et après.' };
  }
  if (cond === 'after') {
    const reqId = ghost.openAfterGhostId;
    if (!reqId) return { ok: true };
    const already = getDiscoveredIds().includes(reqId);
    if (already) return { ok: true };
    return { ok: false, icon: '🔗', title: 'Un prérequis manque', sub: 'Tu dois d\'abord trouver un autre fantôme.' };
  }
  return { ok: true };
}

function _doOpenEnvelope() {
  if (!isPremium) incrementDailyOpenCount();
  if (selectedGhost) {
    const isNewDisc = addDiscovery(selectedGhost.id);
    const discCount = getDiscoveryCount();
    if (isNewDisc) {
      const firstCount = parseInt(localStorage.getItem('ghostub_first_reader') || '0') + 1;
      localStorage.setItem('ghostub_first_reader', firstCount);
      updateDoc(doc(db, COLL.GHOSTS, selectedGhost.id), { openCount: increment(1) }).catch(() => {});
      if (selectedGhost.authorUid && selectedGhost.authorUid !== currentUser?.uid) {
        addDoc(collection(db, COLL.NOTIFS), {
          type: selectedGhost.businessMode ? 'biz_open' : 'open',
          toUid: selectedGhost.authorUid,
          ghostId: selectedGhost.id,
          ghostLocation: selectedGhost.location || 'ce lieu',
          notified: false,
          createdAt: serverTimestamp()
        }).catch(() => {});
      }
    }
  }
  
  const sealed = document.getElementById('envelopeSealed');
  const revealed = document.getElementById('envelopeContent');
  
  if (navigator.vibrate) navigator.vibrate([10, 30, 20, 40, 10, 30, 250]);
  
  const flash = document.getElementById('sealBreakFlash');
  if (flash) {
    flash.style.animation = 'none';
    flash.offsetHeight;
    flash.style.animation = 'sealFlash 0.9s ease-out forwards';
  }
  
  sealed.classList.add('opening');
  setTimeout(() => {
    sealed.classList.add('opened');
    setTimeout(() => {
      sealed.style.display = 'none';
      revealed.style.display = 'block';
      revealed.style.minHeight = '320px';
      GhostScratch.init(revealed, () => {
        revealed.classList.add('scratch-revealed');
        revealed.style.minHeight = '';
        if (navigator.vibrate) navigator.vibrate([20, 60, 20]);
        const firstFocusable = revealed.querySelector('button, [tabindex]');
        if (firstFocusable) firstFocusable.focus();
      });
    }, 350);
  }, 600);
}

function openEnvelope() {
  if (!selectedGhost) return;
  const revealed = document.getElementById('envelopeContent');
  if (revealed && revealed.style.display !== 'none') return;
  
  const btn = document.getElementById('envelopeOpenBtn');
  const hint = document.getElementById('sealedHint');
  const origHint = hint.textContent;
  
  btn.disabled = true;
  hint.textContent = t.env_gps_checking;
  
  const fallbackTimer = setTimeout(() => {
    btn.disabled = false;
    hint.textContent = t.env_gps_slow;
    setTimeout(() => { hint.textContent = origHint; }, 4000);
  }, 8000);
  
  if (!navigator.geolocation) {
    clearTimeout(fallbackTimer);
    btn.disabled = false;
    hint.textContent = t.env_gps_unavail;
    setTimeout(() => { hint.textContent = origHint; }, 4000);
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      clearTimeout(fallbackTimer);
      btn.disabled = false;
      const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, selectedGhost.lat, selectedGhost.lng);
      const ghostRadius = Math.max(20, parseInt(selectedGhost.radius || '50') || 50);
      if (dist <= ghostRadius) {
        hint.textContent = origHint;
        _doOpenEnvelope();
      } else {
        hint.innerHTML = `<span style="color:rgba(255,120,80,.9);">🌫️ Le sceau résiste encore<br><span style="font-size:11px;">encore ${Math.round(dist)}m à parcourir</span></span>`;
        setTimeout(() => { hint.textContent = origHint; }, 4000);
      }
    },
    () => {
      clearTimeout(fallbackTimer);
      btn.disabled = false;
      if (userLat && userLng) {
        const dist = distanceMeters(userLat, userLng, selectedGhost.lat, selectedGhost.lng);
        const ghostRadius = Math.max(20, parseInt(selectedGhost.radius || '50') || 50);
        if (dist <= ghostRadius) {
          hint.textContent = origHint;
          _doOpenEnvelope();
        } else {
          hint.innerHTML = `<span style="color:rgba(255,120,80,.9);">🌫️ Le sceau résiste encore<br><span style="font-size:11px;">encore ${Math.round(dist)}m à parcourir</span></span>`;
          setTimeout(() => { hint.textContent = origHint; }, 4000);
        }
      } else {
        hint.textContent = t.env_gps_denied;
        setTimeout(() => { hint.textContent = origHint; }, 4000);
      }
    },
    { enableHighAccuracy: true, timeout: 7000, maximumAge: 5000 }
  );
}

window.openEnvelope = openEnvelope;

// ============================================================
// OUVERTURE D'UN FANTÔME PAR ID
// ============================================================

window.openGhost = async (id) => {
  const idx = nearbyGhosts.findIndex(g => g.id === id);
  if (idx !== -1) currentGhostIndex = idx;
  selectedGhost = nearbyGhosts.find(g => g.id === id);
  
  if (!selectedGhost) {
    try {
      const docSnap = await getDoc(doc(db, COLL.GHOSTS, id));
      if (!docSnap.exists()) return;
      selectedGhost = { id: docSnap.id, ...docSnap.data(), distance: 0 };
    } catch(e) { return; }
  }
  
  document.getElementById('detailLocation').textContent = '📍 ' + escapeHTML(selectedGhost.location || 'Lieu inconnu');
  document.getElementById('sealedEmoji').textContent = selectedGhost.secret ? '🔮' : (selectedGhost.businessMode ? '🏪' : (selectedGhost.emoji || '👻'));
  
  const ghostDist = selectedGhost.distance != null ? selectedGhost.distance :
    (selectedGhost.lat && selectedGhost.lng && userLat ? distanceMeters(userLat, userLng, selectedGhost.lat, selectedGhost.lng) : 0);
  
  const authorLabel = selectedGhost.anonymous ? '👻 Anonyme' : escapeHTML(selectedGhost.author || '');
  document.getElementById('sealedHint').textContent = authorLabel + ' · ' + formatDistance(ghostDist);
  document.getElementById('detailDistance').textContent = formatDistance(ghostDist) + ' de vous';
  
  const isOwner = currentUser && selectedGhost.authorUid === currentUser.uid;
  const isLocked = selectedGhost.secret && ghostDist > 3 && !isOwner;
  
  resetBlockedOverlay();
  if (!isOwner) {
    const condCheck = isConditionMet(selectedGhost);
    if (!condCheck.ok) {
      showScreen('screenDetail');
      document.getElementById('detailLocation').textContent = '📍 ' + escapeHTML(selectedGhost.location || 'Lieu inconnu');
      showBlockedOverlay(condCheck);
      return;
    }
  }
  
  if (isLocked) {
    document.getElementById('detailMessage').innerHTML = '🔮 Ce fantôme est secret — approchez-vous à moins de 3m pour le révéler.';
    document.getElementById('detailAudio').innerHTML = '';
    document.getElementById('detailPhoto').innerHTML = '';
    document.getElementById('resonanceBtn').style.display = 'none';
    document.getElementById('secretBtn').style.display = 'none';
    const replyBtn = document.querySelector('#screenDetail .btn-secondary');
    if (replyBtn) replyBtn.style.display = 'none';
  } else {
    document.getElementById('detailMessage').innerHTML = '&ldquo;' + escapeHTML(selectedGhost.message).replace(/&#39;/g, "'") + '&rdquo;';
    document.getElementById('detailAuthor').innerHTML = selectedGhost.anonymous ? getPoeticName(selectedGhost.id) : '🌫️ ' + escapeHTML(selectedGhost.author || '');
    document.getElementById('detailTime').innerHTML = '🕰 ' + timeAgo(selectedGhost.createdAt);
    document.getElementById('detailDuration').innerHTML = '⏳ ' + timeRemaining(selectedGhost);
    document.getElementById('detailRadius').innerHTML = '📡 ' + escapeHTML(selectedGhost.radius || '10m');
    
    const resoBtn = document.getElementById('resonanceBtn');
    if (hasResonatedToday()) {
      resoBtn.classList.add('resonated');
      resoBtn.innerHTML = '✦ Résonance utilisée aujourd\'hui';
      resoBtn.style.cursor = 'default';
    } else {
      resoBtn.classList.remove('resonated');
      resoBtn.innerHTML = `✦ Résonner · ${selectedGhost.resonances || 0} résonances`;
    }
    
    const audioEl = document.getElementById('detailAudio');
    if (selectedGhost.audioUrl) {
      audioEl.innerHTML = `<div style="margin-bottom:12px;"><div style="font-size:10px;text-transform:uppercase;">🎙 Message vocal</div><audio controls src="${escapeHTML(selectedGhost.audioUrl)}" style="width:100%;"></audio></div>`;
    } else { audioEl.innerHTML = ''; }
    
    const photoEl = document.getElementById('detailPhoto');
    if (selectedGhost.photoUrl) {
      photoEl.innerHTML = `<div style="margin-bottom:12px;"><div style="font-size:10px;text-transform:uppercase;">📷 Photo</div><img src="${escapeHTML(selectedGhost.photoUrl)}" style="width:100%;border-radius:12px;"></div>`;
    } else { photoEl.innerHTML = ''; }
  }
  
  const repliesSnap = await getDocs(query(collection(db, COLL.REPLIES), where('ghostId', '==', id), orderBy('createdAt', 'desc')));
  const repliesList = document.getElementById('repliesList');
  repliesList.innerHTML = '';
  if (repliesSnap.empty) {
    repliesList.innerHTML = '<div style="font-size:12px;color:var(--spirit-dim);padding:10px 0;">Aucune réponse — soyez le premier.</div>';
  } else {
    repliesSnap.forEach(d => {
      const r = d.data();
      repliesList.innerHTML += `<div class="reply-item"><div class="reply-text">"${escapeHTML(r.message)}"</div><div class="reply-meta">${r.anonymous ? '👻 Anonyme' : escapeHTML(r.author)} · ${timeAgo(r.createdAt)}</div></div>`;
    });
  }
  
  updateReportBtn(id);
  updateFavoriteBtn();
  showScreen('screenDetail');
  setNav('');
};

// ============================================================
// RÉSONANCE
// ============================================================

function fireResonanceParticles(btn) {
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const wave = document.createElement('div');
  wave.className = 'reso-shockwave';
  wave.style.left = cx + 'px';
  wave.style.top = cy + 'px';
  document.body.appendChild(wave);
  setTimeout(() => wave.remove(), 700);
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'reso-particle';
    const angle = (i / 14) * 2 * Math.PI + (Math.random() - .5) * .4;
    const dist = 40 + Math.random() * 70;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist - 20;
    const size = 8 + Math.random() * 10;
    p.style.cssText = `left:${cx}px;top:${cy}px;--px:${px.toFixed(0)}px;--py:${py.toFixed(0)}px;--dur:${(0.5 + Math.random() * 0.5).toFixed(2)}s;font-size:${size}px;`;
    p.textContent = ['✦', '✦', '✦', '✧', '·', '👻'][Math.floor(Math.random() * 6)];
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
  if (navigator.vibrate) navigator.vibrate([15, 10, 30]);
  btn.classList.add('firing');
  setTimeout(() => btn.classList.remove('firing'), 500);
}

window.resonate = async () => {
  const btn = document.getElementById('resonanceBtn');
  if (btn.classList.contains('resonated') || !selectedGhost) return;
  if (hasResonatedToday()) {
    showToast('info', 'Résonance déjà utilisée aujourd\'hui');
    return;
  }
  fireResonanceParticles(btn);
  btn.classList.add('resonated');
  btn.innerHTML = '✦ Résonance envoyée — merci ✨';
  markResonatedToday(selectedGhost.id);
  await updateDoc(doc(db, COLL.GHOSTS, selectedGhost.id), { resonances: increment(1) });
  if (selectedGhost.authorUid && selectedGhost.authorUid !== currentUser?.uid) {
    setDoc(doc(db, COLL.WHISPERS, selectedGhost.authorUid), {
      lastWhisper: serverTimestamp(),
      ghostId: selectedGhost.id,
      ghostEmoji: selectedGhost.emoji || '👻',
      ghostLocation: selectedGhost.location || '',
      count: increment(1)
    }, { merge: true }).catch(() => {});
  }
};

// ============================================================
// AUTHENTIFICATION
// ============================================================

window.register = async () => {
  const pseudo = document.getElementById('regPseudo').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const err = document.getElementById('regAuthError');
  if (!pseudo || !email || !pass) { err.textContent = t.auth_err_fields; return; }
  if (pass.length < 6) { err.textContent = t.auth_err_short_pass; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = t.auth_err_email; return; }
  if (pseudo.length < 2 || pseudo.length > 30) { err.textContent = 'Pseudo entre 2 et 30 caractères.'; return; }
  err.textContent = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: pseudo });
    showToast('success', 'Compte créé !');
  } catch(e) {
    err.textContent = e.code === 'auth/email-already-in-use' ? 'Email déjà utilisé.' :
                      e.code === 'auth/weak-password' ? 'Mot de passe trop court.' :
                      'Erreur : ' + e.message;
  }
};

window.login = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginAuthError');
  if (!email || !pass) { err.textContent = t.auth_err_fields; return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    err.textContent = t.auth_err_wrong;
  }
};

window.logout = async () => {
  performCleanup();
  _stopNotifIntervals();
  if (_unsubResonances) { _unsubResonances(); _unsubResonances = null; }
  await signOut(auth);
  currentUser = null;
  nearbyGhosts = [];
  selectedGhost = null;
  showScreen('screenAuth');
};

// ============================================================
// NOTIFICATIONS
// ============================================================

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/ghostub/sw2.js');
    window._swReg = reg;
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          const banner = document.getElementById('updateBanner');
          if (banner) banner.style.display = 'flex';
        }
      });
    });
    return reg;
  } catch(e) { return null; }
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

function showNotif(title, body) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, { body, icon: '/ghostub/icon.png', vibrate: [200, 100, 200] });
  });
}

window.enableNotifications = async () => {
  const isEnabled = localStorage.getItem('notif_enabled') === '1';
  if (isEnabled) {
    localStorage.removeItem('notif_enabled');
    showToast('info', 'Notifications désactivées');
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('warning', 'Notifications bloquées — autorisez-les dans les réglages.', 5000);
    return;
  }
  const granted = await requestNotifPermission();
  if (granted) {
    localStorage.setItem('notif_enabled', '1');
    showToast('success', 'Notifications activées !');
    _startNotifIntervals();
  } else {
    showToast('warning', 'Notifications refusées', 5000);
  }
};

let _notifIntervalIds = [];

function _stopNotifIntervals() {
  _notifIntervalIds.forEach(id => clearInterval(id));
  _notifIntervalIds = [];
}

function _startNotifIntervals() {
  if (_notifIntervalsStarted) return;
  _notifIntervalsStarted = true;
  _notifIntervalIds.push(setInterval(checkNewGhosts, 5 * 60 * 1000));
  _notifIntervalIds.push(setInterval(checkResonances, 10 * 60 * 1000));
  _notifIntervalIds.push(setInterval(checkDiscoveries, 3 * 60 * 1000));
}

let notifCheckedGhosts = new Set();

async function checkNewGhosts() {
  if (!currentUser || !userLat) return;
  try {
    const snap = await WorldService.getVisibleGhosts(userLat, userLng);
    snap.forEach(d => {
      const g = { id: d.id, ...d.data() };
      if (notifCheckedGhosts.has(g.id)) return;
      if (isExpired(g)) return;
      const dist = distanceMeters(userLat, userLng, g.lat, g.lng);
      if (dist <= 5000) {
        notifCheckedGhosts.add(g.id);
        if (g.createdAt && (Date.now() - g.createdAt.seconds * 1000) < 600000) {
          showNotif('👻 Nouveau fantôme proche !', `À ${formatDistance(dist)} de vous — ${g.location || 'Lieu inconnu'}`);
        }
      }
    });
  } catch(e) {}
}

async function checkResonances() {
  if (!currentUser) return;
  try {
    const myGhosts = await getDocs(query(collection(db, COLL.GHOSTS), where('authorUid', '==', currentUser.uid), limit(50)));
    myGhosts.forEach(d => {
      const g = d.data();
      const prev = parseInt(localStorage.getItem('prev_reso_' + d.id) || '0');
      const curr = g.resonances || 0;
      if (curr > prev) {
        showNotif('✦ Votre trace a résonné', `Quelqu'un a été touché par votre message à ${g.location || 'ce lieu'}.`);
        localStorage.setItem('prev_reso_' + d.id, curr);
      }
    });
  } catch(e) {}
}

async function checkDiscoveries() {
  if (!currentUser) return;
  try {
    const snap = await getDocs(query(collection(db, COLL.DISCOVERIES), where('authorUid', '==', currentUser.uid), where('notified', '==', false)));
    for (const d of snap.docs) {
      const disc = d.data();
      showNotif('🔮 Votre fantôme secret a été trouvé !', `${disc.discoveredBy} a découvert votre fantôme à "${disc.ghostLocation}"`);
      updateDoc(doc(db, COLL.DISCOVERIES, d.id), { notified: true }).catch(() => {});
    }
  } catch(e) {}
}

// ============================================================
// WATCH RESONANCES
// ============================================================

function watchMyGhostResonances() {
  if (_unsubResonances) { _unsubResonances(); _unsubResonances = null; }
  if (!currentUser) return;
  const q = query(collection(db, COLL.GHOSTS), where('authorUid', '==', currentUser.uid));
  _unsubResonances = onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'modified') {
        const g = change.doc.data();
        const id = change.doc.id;
        const prev = parseInt(localStorage.getItem('prev_reso_' + id) || '0');
        const curr = g.resonances || 0;
        if (curr > prev) {
          showNotif('✦ Votre trace a résonné', `Quelqu'un a été touché par votre message à ${g.location || 'ce lieu'}.`);
          localStorage.setItem('prev_reso_' + id, curr);
        }
      }
    });
  });
  registerCleanup(() => { if (_unsubResonances) { _unsubResonances(); _unsubResonances = null; } });
}

// ============================================================
// GPS WATCH
// ============================================================

function startGpsWatch() {
  if (_gpsUnsub) return;
  LocationService.startWatch();
  _gpsUnsub = LocationService.onPositionUpdate(({ lat, lng, accuracy }) => {
    if (accuracy && accuracy > 5000) return;
    if (window.map) window.map.setView([lat, lng], 16);
    userLat = lat;
    userLng = lng;
    nearbyGhosts.forEach(g => {
      if (g.lat && g.lng) {
        g.distance = distanceMeters(lat, lng, g.lat, g.lng);
        const card = document.querySelector(`[onclick*="${g.id}"]`);
        if (card) {
          const distEl = card.querySelector('.envelope-dist');
          if (distEl) distEl.textContent = formatDistance(g.distance);
        }
      }
    });
    renderGhostList();
    renderRadarDots();
  });
  registerCleanup(() => { if (_gpsUnsub) { _gpsUnsub(); _gpsUnsub = null; } });
}

// ============================================================
// PROFIL STATS
// ============================================================

async function refreshProfileStats() {
  if (!currentUser) return;
  const count = getDiscoveryCount();
  document.getElementById('statDiscovered').textContent = count;
  updateFavoritesCount();
  const firstReaderCount = parseInt(localStorage.getItem('ghostub_first_reader') || '0');
  document.getElementById('statFirstReader').textContent = firstReaderCount;
  try {
    const userSnap = await getDoc(doc(db, COLL.USERS, currentUser.uid));
    const userData = userSnap.exists() ? userSnap.data() : {};
    if (userData.ghostCount != null) {
      document.getElementById('statDeposited').textContent = userData.ghostCount;
    } else {
      const snap = await getDocs(query(collection(db, COLL.GHOSTS), where('authorUid', '==', currentUser.uid), limit(100)));
      document.getElementById('statDeposited').textContent = snap.size;
    }
    if (userData.totalResonances != null) {
      document.getElementById('statResonances').textContent = userData.totalResonances;
    }
  } catch(e) {}
}

// ============================================================
// MISE À JOUR PREMIUM UI
// ============================================================

function updatePremiumUI() {
  const planEl = document.getElementById('planInfo');
  const codeSection = document.getElementById('codeSection');
  const pricingSection = document.getElementById('pricingSection');
  
  if (isPremium) {
    if (planEl) planEl.style.display = 'block';
    if (codeSection) codeSection.style.display = 'none';
    if (pricingSection) pricingSection.style.display = 'none';
    const avatar = document.getElementById('profileAvatar');
    if (avatar) avatar.style.border = '1.5px solid rgba(255,200,80,.6)';
  } else {
    if (planEl) planEl.style.display = 'none';
    if (codeSection) codeSection.style.display = 'block';
    if (pricingSection) pricingSection.style.display = 'block';
  }
}

// ============================================================
// ACTIVATION PREMIUM
// ============================================================

window.activatePremium = async () => {
  const input = document.getElementById('premiumCode');
  const code = input.value.trim().toUpperCase();
  const errEl = document.getElementById('premiumError');
  if (!code) { errEl.textContent = 'Entrez un code.'; return; }
  if (code.length < 4) { errEl.textContent = 'Code trop court.'; return; }
  errEl.textContent = '';
  const btn = document.getElementById('activateBtn');
  btn.textContent = 'Vérification…';
  btn.disabled = true;
  try {
    await runTransaction(db, async (txn) => {
      const codeRef = doc(db, COLL.PREMIUM_CODES, code);
      const codeSnap = await txn.get(codeRef);
      if (!codeSnap.exists()) throw { code: 'not-found' };
      if (codeSnap.data().used) throw { code: 'already-used' };
      const userRef = doc(db, COLL.USERS, currentUser.uid);
      txn.update(codeRef, { used: true, usedBy: currentUser.uid, usedAt: serverTimestamp() });
      txn.set(userRef, { premium: true, premiumSince: serverTimestamp() }, { merge: true });
    });
    isPremium = true;
    updatePremiumUI();
    input.value = '';
    btn.textContent = 'Activé !';
    showToast('success', '👑 Premium activé ! Toutes les fonctionnalités sont débloquées.', 4000);
  } catch(e) {
    if (e.code === 'not-found') errEl.textContent = 'Code invalide.';
    else if (e.code === 'already-used') errEl.textContent = 'Code déjà utilisé.';
    else errEl.textContent = 'Erreur : ' + e.message;
    btn.textContent = 'Activer';
    btn.disabled = false;
  }
};

// ============================================================
// SIGNALEMENT
// ============================================================

const REPORT_THRESHOLD = 3;

function openReportModal() {
  if (!currentUser || !selectedGhost) return;
  const key = 'reported_' + currentUser.uid + '_' + selectedGhost.id;
  if (localStorage.getItem(key)) {
    showToast('info', 'Vous avez déjà signalé ce fantôme.');
    return;
  }
  if (selectedGhost.authorUid === currentUser.uid) {
    showToast('info', 'Vous ne pouvez pas signaler votre propre fantôme.');
    return;
  }
  openModal('reportModal', 'reportBtn');
}

window.openReportModal = openReportModal;

window.submitReport = async (reason) => {
  if (!currentUser || !selectedGhost) return;
  closeModal('reportModal');
  const ghostId = selectedGhost.id;
  const key = 'reported_' + currentUser.uid + '_' + ghostId;
  try {
    await addDoc(collection(db, COLL.REPORTS), {
      ghostId, ghostLocation: selectedGhost.location || '',
      ghostAuthorUid: selectedGhost.authorUid || '', reporterUid: currentUser.uid,
      reason, createdAt: serverTimestamp()
    });
    localStorage.setItem(key, '1');
    showToast('success', '✓ Signalement envoyé — merci');
    await updateDoc(doc(db, COLL.GHOSTS, ghostId), { reportCount: increment(1) });
    const ghostDoc = await getDocs(query(collection(db, COLL.REPORTS), where('ghostId', '==', ghostId)));
    if (ghostDoc.size >= REPORT_THRESHOLD) {
      await deleteDoc(doc(db, COLL.GHOSTS, ghostId));
      showScreen('screenRadar');
      setNav('nav-radar');
      await loadNearbyGhosts();
      showToast('success', 'Fantôme supprimé — merci pour la communauté.');
    }
  } catch(e) {
    showToast('error', 'Erreur — réessayez.');
  }
};

function updateReportBtn(ghostId) {
  const btn = document.getElementById('reportBtn');
  if (!btn || !currentUser) return;
  const key = 'reported_' + currentUser.uid + '_' + ghostId;
  const isOwn = selectedGhost && selectedGhost.authorUid === currentUser.uid;
  if (isOwn) {
    btn.style.display = 'none';
  } else {
    btn.style.display = '';
    if (localStorage.getItem(key)) {
      btn.classList.add('reported');
      btn.innerHTML = '✓ Déjà signalé';
    } else {
      btn.classList.remove('reported');
      btn.innerHTML = t.detail_report_btn;
    }
  }
}

// ============================================================
// MODALES
// ============================================================

function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      modalEl.classList.remove('show');
      document.removeEventListener('keydown', handleKeydown);
      return;
    }
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', handleKeydown);
  modalEl._trapHandler = handleKeydown;
}

function openModal(modalId, triggerId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal._triggerEl = triggerId ? document.getElementById(triggerId) : document.activeElement;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => trapFocus(modal), 50);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('show');
  document.body.style.overflow = '';
  if (modal._trapHandler) {
    document.removeEventListener('keydown', modal._trapHandler);
    delete modal._trapHandler;
  }
  if (modal._triggerEl) {
    modal._triggerEl.focus();
    delete modal._triggerEl;
  }
}

window.closeModal = closeModal;
window.closeReportModal = (e) => {
  if (e && e.target !== document.getElementById('reportModal')) return;
  closeModal('reportModal');
};

// ============================================================
// NAVIGATION ÉCRANS
// ============================================================

function setNav(id) {
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.setAttribute('aria-current', 'false');
  });
  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
    }
  }
}

function showScreen(id, fromPopstate = false) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  
  const scroll = document.querySelector('#' + id + ' .scroll');
  if (scroll) scroll.scrollTop = 0;
  
  if (!fromPopstate) {
    history.pushState({ screen: id }, '', window.location.href.split('?')[0] + window.location.search);
  }
  
  if (id === 'screenMap') setTimeout(() => renderStaticMap(), 50);
  if (id === 'screenProfile') { refreshProfileStats(); loadEmpreinteMap(); }
  if (id === 'screenDetail') {
    const sealed = document.getElementById('envelopeSealed');
    const revealed = document.getElementById('envelopeContent');
    if (sealed) sealed.style.display = '';
    if (sealed) sealed.classList.remove('opening', 'opened');
    if (revealed) revealed.style.display = 'none';
  }
  
  const screenTitles = {
    screenRadar: 'Radar — Ghostub', screenDetail: 'Ghostub',
    screenDeposit: 'Déposer — Ghostub', screenMap: 'Carte — Ghostub',
    screenProfile: 'Mon profil — Ghostub', screenAuth: 'Ghostub',
    screenOnboard: 'Ghostub', screenReply: 'Ghostub'
  };
  document.title = screenTitles[id] || 'Ghostub';
}

window.showScreen = showScreen;
window.setNav = setNav;

// ============================================================
// CARTE LEAFLET
// ============================================================

function buildLeafletMap(centerLat, centerLng, h) {
  const container = document.getElementById('mapContainer');
  if (map && document.getElementById('leafletMap')) {
    try { map.remove(); } catch(e) {}
    map = null;
  }
  container.innerHTML = `<div id="leafletMap" style="width:100%;height:${h}px;"></div>`;
  map = L.map('leafletMap', { zoomControl: true, attributionControl: false }).setView([centerLat, centerLng], 16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
  
  const userIcon = L.divIcon({ html: '<div class="user-map-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8], className: '' });
  L.marker([centerLat, centerLng], { icon: userIcon }).addTo(map).bindPopup('📍 Vous êtes ici');
  
  nearbyGhosts.forEach(g => {
    if (!g.lat || !g.lng) return;
    const emoji = g.secret ? '🔮' : (g.businessMode ? '🏪' : escapeHTML(g.emoji || '👻'));
    const ghostIcon = L.divIcon({
      html: `<div style="font-size:28px;animation:ghostFloat 2.8s ease-in-out infinite;filter:drop-shadow(0 0 10px rgba(168,180,255,0.7));">${emoji}</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20], className: ''
    });
    L.marker([g.lat, g.lng], { icon: ghostIcon }).addTo(map).on('click', () => openGhost(g.id));
  });
}

function renderStaticMap() {
  const centerLat = userLat || 48.8566;
  const centerLng = userLng || 2.3522;
  const container = document.getElementById('mapContainer');
  const h = Math.max(window.innerHeight - 160, 500);
  container.style.height = h + 'px';
  
  if (!document.getElementById('leafletCSS')) {
    const css = document.createElement('link');
    css.id = 'leafletCSS';
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
  }
  
  if (window.L) {
    buildLeafletMap(centerLat, centerLng, h);
  } else {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => buildLeafletMap(centerLat, centerLng, h);
    document.head.appendChild(script);
  }
}

// ============================================================
// CARTE EMPREINTE
// ============================================================

let _empreinteMap = null;

async function loadEmpreinteMap() {
  if (!currentUser) return;
  const container = document.getElementById('empreinteMap');
  const loader = document.getElementById('empreinteLoader');
  if (!container) return;
  
  if (_empreinteMap) { try { _empreinteMap.remove(); } catch(e) {} _empreinteMap = null; }
  if (loader) loader.style.display = 'flex';
  
  await new Promise((resolve) => {
    if (window.L) return resolve();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = resolve;
    document.head.appendChild(s);
    if (!document.getElementById('leafletCSS')) {
      const css = document.createElement('link');
      css.id = 'leafletCSS';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
  });
  
  try {
    const depositSnap = await getDocs(query(collection(db, COLL.GHOSTS), where('authorUid', '==', currentUser.uid), limit(100)));
    const deposits = [];
    depositSnap.forEach(d => {
      const g = d.data();
      if (g.lat && g.lng) deposits.push({ lat: g.lat, lng: g.lng, emoji: g.emoji || '👻', location: g.location || '?' });
    });
    
    const discIds = getDiscoveredIds().slice(-50);
    const discoveries = [];
    discIds.forEach(id => {
      const found = nearbyGhosts.find(g => g.id === id);
      if (found && found.lat && found.lng) {
        discoveries.push({ lat: found.lat, lng: found.lng, emoji: found.emoji || '👁', location: found.location || '?' });
      }
    });
    
    const allPoints = [...deposits, ...discoveries];
    if (loader) loader.style.display = 'none';
    
    if (allPoints.length === 0) {
      if (loader) { loader.style.display = 'flex'; loader.innerHTML = '<div style="font-size:32px;">👻</div><div>Votre empreinte est vide.<br>Déposez ou découvrez des fantômes !</div>'; }
      return;
    }
    
    const centerLat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
    const centerLng = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;
    
    const leafletDiv = document.getElementById('empreinteLeaflet');
    leafletDiv.innerHTML = '';
    _empreinteMap = L.map('empreinteLeaflet', { zoomControl: false, attributionControl: false }).setView([centerLat, centerLng], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(_empreinteMap);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(_empreinteMap);
    
    deposits.forEach(p => {
      const icon = L.divIcon({ html: `<div style="font-size:20px;">${p.emoji}</div>`, iconSize: [28, 28], iconAnchor: [14, 14], className: '' });
      L.marker([p.lat, p.lng], { icon }).addTo(_empreinteMap).bindPopup(`<b>${p.location}</b><br>Votre dépôt`);
    });
    
    discoveries.forEach(p => {
      const icon = L.divIcon({ html: `<div style="width:10px;height:10px;background:rgba(255,200,80,.9);border-radius:50%;"></div>`, iconSize: [10, 10], iconAnchor: [5, 5], className: '' });
      L.marker([p.lat, p.lng], { icon }).addTo(_empreinteMap).bindPopup(`<b>${p.location}</b><br>Découverte`);
    });
    
    setTimeout(() => _empreinteMap.invalidateSize(), 300);
  } catch(e) {
    if (loader) { loader.style.display = 'none'; loader.innerHTML = '<div>Erreur de chargement</div>'; }
  }
}

// ============================================================
// ONBOARDING CAROUSEL
// ============================================================

let obCurrentScene = 0;
const OB_TOTAL = 4;

function goObScene(n) {
  const scenes = document.querySelectorAll('.ob-scene');
  const dots = document.querySelectorAll('.ob-dot');
  scenes[obCurrentScene].classList.remove('active');
  scenes[obCurrentScene].classList.add('exit');
  setTimeout(() => scenes[obCurrentScene].classList.remove('exit'), 450);
  obCurrentScene = n;
  scenes[n].classList.add('active');
  dots.forEach((d, i) => d.classList.toggle('active', i === n));
  const cta = document.getElementById('obCta');
  const hint = document.getElementById('obSwipeHint');
  if (n === OB_TOTAL - 1) {
    cta.classList.add('visible');
    if (hint) hint.style.display = 'none';
  } else {
    cta.classList.remove('visible');
    if (hint) hint.style.display = '';
  }
}

window.goObScene = goObScene;

function goAuth() {
  localStorage.setItem('ghostub_onboard_seen', '1');
  showScreen('screenAuth');
}

window.goAuth = goAuth;

// ============================================================
// DÉPÔT DE FANTÔME
// ============================================================

let _pendingAudioBlob = null;
let _pendingAudioBlobUrl = null;
let _pendingPhotoFile = null;
let _pendingPhotoBlobUrl = null;
let _pendingVideoFile = null;
let _pendingVideoBlobUrl = null;

async function uploadMedia(uid) {
  let audioUrl = null, photoUrl = null, videoUrl = null;
  
  async function uploadToCloudinary(fd, resourceType) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.secure_url || null;
      } catch(e) {
        if (attempt === 1) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  if (_pendingAudioBlob) {
    const fd = new FormData();
    fd.append('file', _pendingAudioBlob, 'audio.webm');
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder', 'ghostub/audio');
    audioUrl = await uploadToCloudinary(fd, 'video');
  }
  if (_pendingPhotoFile) {
    const fd = new FormData();
    fd.append('file', _pendingPhotoFile);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder', 'ghostub/photos');
    photoUrl = await uploadToCloudinary(fd, 'image');
  }
  if (_pendingVideoFile) {
    const fd = new FormData();
    fd.append('file', _pendingVideoFile);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder', 'ghostub/videos');
    videoUrl = await uploadToCloudinary(fd, 'video');
  }
  return { audioUrl, photoUrl, videoUrl };
}

function clearAudio() {
  if (_pendingAudioBlobUrl) { URL.revokeObjectURL(_pendingAudioBlobUrl); _pendingAudioBlobUrl = null; }
  _pendingAudioBlob = null;
  document.getElementById('audioPreview').innerHTML = '';
}

function clearPhoto() {
  if (_pendingPhotoBlobUrl) { URL.revokeObjectURL(_pendingPhotoBlobUrl); _pendingPhotoBlobUrl = null; }
  _pendingPhotoFile = null;
  document.getElementById('photoPreview').innerHTML = '';
  document.getElementById('photoInput').value = '';
}

function clearVideo() {
  if (_pendingVideoBlobUrl) { URL.revokeObjectURL(_pendingVideoBlobUrl); _pendingVideoBlobUrl = null; }
  _pendingVideoFile = null;
  document.getElementById('videoPreview').innerHTML = '';
}

window.clearAudio = clearAudio;
window.clearPhoto = clearPhoto;
window.clearVideo = clearVideo;

window.depositGhost = async () => {
  const message = document.getElementById('depositMsg').value.trim();
  const location = document.getElementById('depositLocation').value.trim();
  const rawEmoji = document.getElementById('depositEmoji').value || '👻';
  const emoji = [...rawEmoji].slice(0, 2).join('');
  const duration = document.querySelector('.dur-btn.active:not([data-maxopen])')?.textContent || '7 jours';
  const maxOpenCount = parseInt(document.querySelector('.dur-btn.active[data-maxopen]')?.dataset.maxopen || '0');
  const radius = document.querySelector('.radius-btn.active')?.textContent || '10m';
  const typeBtns = document.querySelectorAll('#screenDeposit .type-selector');
  const anon = typeBtns[1]?.querySelector('.type-btn.active')?.dataset.val === 'anon';
  const secret = typeBtns[0]?.querySelector('.type-btn.active')?.dataset.val === 'secret';
  const err = document.getElementById('depositError');
  
  if (!message) { err.textContent = 'Écrivez un message.'; document.getElementById('depositMsg').focus(); return; }
  if (message.length > 280) { err.textContent = 'Message trop long (280 caractères max).'; return; }
  if (!userLat) {
    try { await getLocation(); } catch(e) {}
    if (!userLat) { err.textContent = 'Géolocalisation requise.'; return; }
  }
  
  err.textContent = '';
  const depositBtn = document.getElementById('depositBtn');
  setLoading(depositBtn, true);
  
  try {
    const { audioUrl, photoUrl, videoUrl } = await uploadMedia(currentUser.uid + '_' + Date.now());
    
    const ghostData = {
      message, location: location || 'Lieu sans nom', emoji, duration, radius, maxOpenCount: maxOpenCount || 0,
      anonymous: anon, secret: secret || false,
      audioUrl: audioUrl || null, photoUrl: photoUrl || null, videoUrl: videoUrl || null,
      businessMode: false,
    };
    
    const ghostId = await WorldService.createGhost(ghostData, userLat, userLng, {
      uid: currentUser.uid, displayName: currentUser.displayName, email: currentUser.email
    });
    
    document.getElementById('depositMsg').value = '';
    document.getElementById('depositLocation').value = '';
    depositBtn.textContent = '👻 Ancrer ce fantôme';
    depositBtn.disabled = false;
    clearAudio(); clearPhoto(); clearVideo();
    document.getElementById('depositSuccess').classList.add('show');
    
    const _depKey = 'ghostub_total_deposited_' + (currentUser ? currentUser.uid : 'anon');
    localStorage.setItem(_depKey, (parseInt(localStorage.getItem(_depKey) || '0') + 1).toString());
    
    showToast('success', 'Votre trace est ancrée dans ce lieu…');
    
    const successEl = document.getElementById('depositSuccess');
    const dismissSuccess = () => {
      successEl.classList.remove('show');
      successEl.removeEventListener('click', dismissSuccess);
      showScreen('screenRadar');
      setNav('nav-radar');
      setTimeout(() => loadNearbyGhosts().catch(() => {}), 1500);
    };
    successEl.addEventListener('click', dismissSuccess);
    setTimeout(() => dismissSuccess(), 6000);
    
  } catch(e) {
    err.textContent = 'Erreur lors du dépôt — vérifie ta connexion et réessaie.';
    depositBtn.textContent = '👻 Ancrer ce fantôme';
    depositBtn.disabled = false;
  }
};

function setLoading(btn, loading, defaultText) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.origText = btn.textContent;
    btn.textContent = 'En cours…';
  } else {
    btn.disabled = false;
    btn.textContent = defaultText || btn.dataset.origText || btn.textContent;
  }
}

// ============================================================
// SERVICE WORKER & INIT
// ============================================================

registerServiceWorker().then(reg => {
  if (reg && localStorage.getItem('notif_enabled') === '1' && Notification.permission === 'granted') {
    _startNotifIntervals();
  }
});

onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    watchMyGhostResonances();
    startGpsWatch();
    
    const userDoc = await getDoc(doc(db, COLL.USERS, user.uid));
    isPremium = userDoc.exists() && userDoc.data().premium === true;
    updatePremiumUI();
    
    document.getElementById('profileName').textContent = escapeHTML(user.displayName || user.email);
    document.getElementById('profileAvatar').textContent = (user.displayName || user.email).charAt(0).toUpperCase();
    document.getElementById('bottomNav').style.display = 'flex';
    
    await loadNearbyGhosts();
    showScreen('screenRadar');
    setNav('nav-radar');
  } else {
    currentUser = null;
    document.getElementById('bottomNav').style.display = 'none';
    if (localStorage.getItem('ghostub_onboard_seen')) {
      showScreen('screenAuth');
    } else {
      showScreen('screenOnboard');
    }
  }
});

// ============================================================
// UTILITAIRES UI
// ============================================================

function showTab(tab) {
  const loginTab = document.getElementById('tabLogin');
  const registerTab = document.getElementById('tabRegister');
  const loginBtn = document.getElementById('tab-login');
  const registerBtn = document.getElementById('tab-register');
  
  if (tab === 'login') {
    loginTab.style.display = 'flex';
    registerTab.style.display = 'none';
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
  } else {
    loginTab.style.display = 'none';
    registerTab.style.display = 'flex';
    loginBtn.classList.remove('active');
    registerBtn.classList.add('active');
  }
}

window.showTab = showTab;

function updateOnlineStatus() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;
  if (navigator.onLine) {
    banner.style.display = 'none';
  } else {
    banner.style.display = 'flex';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

function applyUpdate() {
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now());
  window.location.replace(url.toString());
}

window.applyUpdate = applyUpdate;

function setWizardStep(n) {
  [1, 2, 3].forEach(i => {
    const step = document.getElementById('wizardStep' + i);
    if (step) step.style.display = i === n ? 'block' : 'none';
    const ws = document.getElementById('ws' + i);
    if (ws) {
      ws.classList.remove('active', 'done');
      if (i === n) ws.classList.add('active');
      else if (i < n) ws.classList.add('done');
    }
  });
}

window.wizardNext = (step) => {
  if (step === 1) setWizardStep(2);
  else if (step === 2) setWizardStep(3);
};

window.wizardBack = (step) => {
  if (step === 2) setWizardStep(1);
  else if (step === 3) setWizardStep(2);
};

function pickEmoji(el, emoji) {
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('depositEmoji').value = emoji;
}

window.pickEmoji = pickEmoji;

function pickEmojiCustom(input) {
  document.querySelectorAll('.emoji-opt:not(.emoji-custom)').forEach(e => e.classList.remove('active'));
}

window.pickEmojiCustom = pickEmojiCustom;

function selectType(el) {
  el.parentElement.querySelectorAll('.type-btn,.radius-btn,.dur-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

window.selectType = selectType;
window.selectDur = selectType;
window._selectRadius = selectType;
window.selectMaxOpen = selectType;

function toggleTheme() {
  const current = localStorage.getItem('ghostub_theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('light-theme', newTheme === 'light');
  localStorage.setItem('ghostub_theme', newTheme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const lbl = document.getElementById('themeToggleLabel');
    if (lbl) lbl.textContent = newTheme === 'light' ? 'Mode nuit' : 'Mode jour';
  }
}

window.toggleTheme = toggleTheme;

// Appliquer le thème
const savedTheme = localStorage.getItem('ghostub_theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
}

// Initialisation DOM
document.addEventListener('DOMContentLoaded', () => {
  initGhostListContainer();
  const emojiInput = document.getElementById('depositEmoji');
  if (emojiInput && !emojiInput.value) emojiInput.value = '👻';
  
  const msg = document.getElementById('depositMsg');
  if (msg) {
    msg.addEventListener('input', () => {
      const len = msg.value.length;
      const counter = document.getElementById('msgCharCount');
      if (counter) counter.textContent = len;
    });
  }
  
  setLang(_currentLang);
  
  // Créer les particules
  const particles = document.getElementById('particles');
  if (particles) {
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      particles.appendChild(p);
    }
  }
});

// Export global pour les appels inline
window.loadNearbyGhosts = loadNearbyGhosts;
window.toggleFavorite = toggleFavorite;
window.refreshProfileStats = refreshProfileStats;
window.loadEmpreinteMap = loadEmpreinteMap;
window.renderStaticMap = renderStaticMap;
