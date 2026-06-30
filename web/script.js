<script>
// ── DATA ─────────────────────────────────────────────────────────
var RACES = [
  { id:'Humain',  icon:'🧑', name:'Humain',  nameEn:'Human',  sub:'Équilibré',   subEn:'Balanced',  dhp:0,   datk:0,  ddef:0,  bonus:'+10% XP',           bonusEn:'+10% XP',            passive:'xp_boost' },
  { id:'Elfe',    icon:'🧝', name:'Elfe',    nameEn:'Elf',    sub:'Agilité',     subEn:'Agility',   dhp:-10, datk:2,  ddef:-1, bonus:'Frappe en premier',  bonusEn:'Strikes first',      passive:'initiative' },
  { id:'Nain',    icon:'⛏',  name:'Nain',    nameEn:'Dwarf',  sub:'Endurance',   subEn:'Endurance', dhp:20,  datk:-1, ddef:3,  bonus:'Résist. poison',    bonusEn:'Poison resist',      passive:'poison_resist' },
  { id:'Orc',     icon:'💪', name:'Orc',     nameEn:'Orc',    sub:'Brutalité',   subEn:'Brutality', dhp:15,  datk:3,  ddef:-2, bonus:'Rage si PV < 30%',  bonusEn:'Rage if HP < 30%',   passive:'rage' },
];
var CLASSES = [
  { id:'Guerrier', icon:'⚔',  name:'Guerrier', nameEn:'Warrior',  sub:'Solide',   subEn:'Sturdy',   hp:100, atk:12, def:6,  spe:'Bouclier',     speEn:'Shield' },
  { id:'Mage',     icon:'🔮', name:'Mage',     nameEn:'Mage',     sub:'Puissant', subEn:'Powerful', hp:70,  atk:18, def:3,  spe:'Boule de feu', speEn:'Fireball' },
  { id:'Chasseur', icon:'🏹', name:'Chasseur', nameEn:'Hunter',   sub:'Rapide',   subEn:'Swift',    hp:85,  atk:14, def:4,  spe:'Double tir',   speEn:'Double shot' },
  { id:'Assassin', icon:'🗡', name:'Assassin', nameEn:'Assassin', sub:'Critique', subEn:'Critical', hp:75,  atk:16, def:3,  spe:'Crit. garanti', speEn:'Guaranteed crit' },
  { id:'Prêtre',   icon:'✚',  name:'Prêtre',   nameEn:'Priest',   sub:'Soigneur', subEn:'Healer',   hp:90,  atk:10, def:7,  spe:'Soin 30%',     speEn:'Heal 30%' },
  { id:'Barbare',  icon:'🪓', name:'Barbare',  nameEn:'Barbarian', sub:'Fureur',  subEn:'Fury',     hp:110, atk:15, def:2,  spe:'Frenésie',     speEn:'Frenzy' },
];

// ── VAULT — couche anti-triche des sauvegardes ───────────────────
// Signe + obfusque les données persistées. Pas de la crypto militaire
// (impossible dans un jeu 100% client), mais assez pour dissuader
// l'édition naïve du localStorage. Les anciennes saves JSON brutes sont
// acceptées et ré-signées silencieusement à la prochaine écriture.
var Vault = (function(){
  var SALT = 'cge¤eternal¤v1¤7a3f9e2b5c8d';
  function hash(str){
    var h = (5381 ^ 0x9e3779b9) >>> 0, s = SALT + '|' + str + '|' + SALT;
    for (var i=0;i<s.length;i++){ h = (((h<<5)+h) ^ s.charCodeAt(i)) >>> 0; }
    return ('00000000'+h.toString(16)).slice(-8);
  }
  function xor(str){
    var out='', kl=SALT.length;
    for (var i=0;i<str.length;i++){ out += String.fromCharCode(str.charCodeAt(i) ^ SALT.charCodeAt(i % kl)); }
    return out;
  }
  function b64e(s){ try { return btoa(unescape(encodeURIComponent(s))); } catch(e){ return ''; } }
  function b64d(s){ try { return decodeURIComponent(escape(atob(s))); } catch(e){ return ''; } }
  return {
    hash: hash,
    pack: function(obj){
      try {
        var json = JSON.stringify(obj);
        return 'V1:' + b64e(xor(hash(json) + '|' + json));
      } catch(e){ return ''; }
    },
    // -> { data, valid, legacy, empty }
    unpack: function(raw){
      if (raw == null || raw === '') return { data:null, valid:false, empty:true, legacy:false };
      if (typeof raw === 'object') return { data:raw, valid:true, legacy:true };
      if (raw.slice(0,3) === 'V1:'){
        var dec = xor(b64d(raw.slice(3)));
        var sep = dec.indexOf('|');
        if (sep < 0) return { data:null, valid:false, legacy:false };
        var sig = dec.slice(0, sep), json = dec.slice(sep+1), data = null;
        try { data = JSON.parse(json); } catch(e){ return { data:null, valid:false, legacy:false }; }
        return { data:data, valid: hash(json) === sig, legacy:false };
      }
      // Ancien format : JSON brut
      try { return { data: JSON.parse(raw), valid:true, legacy:true }; }
      catch(e){ return { data:null, valid:false, legacy:false }; }
    }
  };
})();

function _clampNum(v, lo, hi, dflt){
  v = +v;
  if (!isFinite(v)) return dflt;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

// ── INTEGRITY — borne les données chargées à des valeurs plausibles ─
// Dernier rempart : même signature cassée, les valeurs aberrantes
// (or:99999, niveau:999) sont ramenées dans des limites légitimes.
var Integrity = {
  meta: function(d){
    if (!d || typeof d !== 'object') return d;
    d.totalGold  = _clampNum(d.totalGold, 0, 1e9, 0);
    d.totalKills = _clampNum(d.totalKills, 0, 1e7, 0);
    d.totalRuns  = _clampNum(d.totalRuns, 0, 1e5, 0);
    d.bestFloor  = _clampNum(d.bestFloor, 0, 6, 0);
    d.rank       = _clampNum(d.rank, 0, 20, 0);
    d._align     = _clampNum(d._align, -5, 5, 0);
    var b = d.bonuses;
    if (b && typeof b === 'object') {
      var caps = { atk:500, def:500, hp:3000, potions:50, goldPct:5, crit:1, dodge:0.9, timerBonus:600, lifesteal:1, regenMeta:100, xpPct:10, startGold:1e5 };
      Object.keys(caps).forEach(function(k){ if (b[k] != null) b[k] = _clampNum(b[k], 0, caps[k], 0); });
    }
    return d;
  },
  run: function(d){
    if (!d || typeof d !== 'object') return d;
    d.level   = _clampNum(d.level, 1, 99, 1);
    d.hpMax   = _clampNum(d.hpMax, 1, 1e5, 1);
    d.hp      = _clampNum(d.hp, 0, d.hpMax, d.hpMax);
    d.atk     = _clampNum(d.atk, 0, 5000, 0);
    d.def     = _clampNum(d.def, 0, 5000, 0);
    d.gold    = _clampNum(d.gold, 0, 1e7, 0);
    d.xp      = _clampNum(d.xp, 0, 1e9, 0);
    d.floor   = _clampNum(d.floor, 1, 6, 1);
    if (d.kills != null)   d.kills   = _clampNum(d.kills, 0, 1e6, 0);
    if (d.potions != null) d.potions = _clampNum(d.potions, 0, 99, 0);
    if (d.mana != null)    d.mana    = _clampNum(d.mana, 0, 1e4, 0);
    if (d.manaMax != null) d.manaMax = _clampNum(d.manaMax, 0, 1e4, 0);
    if (d.dodgeBonus != null)    d.dodgeBonus    = _clampNum(d.dodgeBonus, 0, 1, 0);
    if (d.itemLifesteal != null) d.itemLifesteal = _clampNum(d.itemLifesteal, 0, 1, 0);
    if (Array.isArray(d.inventory) && d.inventory.length > 8) d.inventory = d.inventory.slice(0,8);
    return d;
  }
};

var State = {
  race: 'Humain',
  cls:  'Guerrier',
  name: 'Aventurier',
  bag: [],
  inventory: [],
  equipped: {
    heaume:null, arme:null, bouclier:null, gants:null,
    bottes:null, ceinture:null, jambieres:null, collier:null, plastron:null,
    bague_gauche:null, bague_droite:null
  },
  _heroFrom: 'inn-room',
  _currentZone: null,
};

// ── SAVE / LOAD RUN ─────────────────────────────────────────────
State.saveRun = function() {
  try {
    var data = {
      race: State.race, cls: State.cls, name: State.name||'Héros',
      hp: State.hp, hpMax: State.hpMax,
      atk: State.atk, def: State.def,
      floor: State.floor, gold: State.gold,
      kills: State.kills, xp: State.xp, level: State.level,
      potions: State.potions, regenPerFight: State.regenPerFight,
      critBonus: State.critBonus, fleeBonus: State.fleeBonus,
      dodgeBonus: State.dodgeBonus, itemLifesteal: State.itemLifesteal,
      _zoneMod: State._zoneMod, _currentZone: State._currentZone,
      inventory: State.inventory || [],
      equipped: State.equipped || {},
      bag: State.bag || [],
      scrolls: State.scrolls || [],
      mana: State.mana || 0, manaMax: State.manaMax || 0,
      _introChoices: State._introChoices || null,
      _finalChoice: State._finalChoice || null,
    };
    localStorage.setItem('cge_run', Vault.pack(data));
    if (typeof ProfileManager !== 'undefined') ProfileManager.updateActive(undefined, data);
  } catch(e) {}
};

State.loadRun = function() {
  try {
    var d = Vault.unpack(localStorage.getItem('cge_run')).data;
    if (!d || !d.hp) return false;
    d = Integrity.run(d);
    Object.keys(d).forEach(function(k){ State[k] = d[k]; });
    return true;
  } catch(e) { return false; }
};

State.clearSave = function() {
  localStorage.removeItem('cge_run');
};

State.hasSave = function() {
  try {
    var d = Vault.unpack(localStorage.getItem('cge_run')).data;
    return !!(d && d.hp);
  } catch(e) { return false; }
};

// ── AUDIO & SETTINGS ─────────────────────────────────────────────
var Sfx = (function(){
  var AC = null;
  var sfxOn = true, vibOn = true, parOn = true;

  function ctx() {
    if (!AC) { try { AC = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} }
    return AC;
  }

  function tone(freq, type, vol, dur, delay) {
    var c = ctx(); if (!c || !sfxOn) return;
    var g = c.createGain();
    g.gain.setValueAtTime(vol||0.18, c.currentTime + (delay||0));
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (delay||0) + (dur||0.15));
    g.connect(c.destination);
    var o = c.createOscillator();
    o.type = type||'square';
    o.frequency.setValueAtTime(freq, c.currentTime + (delay||0));
    o.connect(g);
    o.start(c.currentTime + (delay||0));
    o.stop(c.currentTime + (delay||0) + (dur||0.15) + 0.05);
  }

  function noise(vol, dur, delay) {
    var c = ctx(); if (!c || !sfxOn) return;
    var buf = c.createBuffer(1, c.sampleRate*0.2, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    g.gain.setValueAtTime(vol||0.1, c.currentTime+(delay||0));
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime+(delay||0)+(dur||0.1));
    src.connect(g); g.connect(c.destination);
    src.start(c.currentTime+(delay||0)); src.stop(c.currentTime+(delay||0)+(dur||0.15));
  }

  function vib(pattern) { if (vibOn && navigator.vibrate) navigator.vibrate(pattern); }

  var pub = {
    sfxOn: true, vibOn: true, parOn: true,

    attack:  function()  { tone(220,'sawtooth',0.16,0.08); tone(330,'sawtooth',0.10,0.07,0.07); vib(18); },
    crit:    function()  { tone(440,'square',0.22,0.06); tone(660,'square',0.18,0.06,0.06); tone(880,'sine',0.12,0.1,0.12); vib([25,8,40]); },
    hit:     function()  { noise(0.12,0.08); tone(110,'sawtooth',0.12,0.1); vib(15); },
    defend:  function()  { tone(196,'sine',0.15,0.12); tone(247,'sine',0.10,0.10,0.08); },
    heal:    function()  { tone(523,'sine',0.12,0.08); tone(659,'sine',0.14,0.10,0.07); tone(784,'sine',0.12,0.12,0.15); },
    skill:   function()  { tone(392,'sawtooth',0.18,0.06); tone(523,'square',0.14,0.08,0.06); tone(659,'sine',0.12,0.12,0.13); vib([10,5,20]); },
    potion:  function()  { tone(440,'sine',0.13,0.06); tone(554,'sine',0.15,0.08,0.06); tone(659,'sine',0.13,0.10,0.13); vib([8,5,12]); },
    death:   function()  { tone(110,'sawtooth',0.20,0.25); noise(0.10,0.2,0.05); vib([30,15,50]); },
    victory: function()  { tone(523,'sine',0.16,0.1); tone(659,'sine',0.18,0.1,0.1); tone(784,'sine',0.20,0.15,0.2); tone(1047,'sine',0.18,0.25,0.35); },
    levelup: function()  { [523,659,784,1047].forEach(function(f,i){ tone(f,'sine',0.16,0.12,i*0.08); }); vib([15,5,15,5,30]); },
    gold:    function()  { tone(880,'sine',0.12,0.06); tone(1108,'sine',0.14,0.08,0.06); },
    nav:     function()  { tone(330,'sine',0.08,0.06); },
    buy:     function()  { tone(440,'sine',0.12,0.07); tone(554,'sine',0.14,0.09,0.07); },
    flee:    function()  { tone(220,'sawtooth',0.10,0.05); tone(180,'sawtooth',0.08,0.08,0.05); },
    gameover:function()  { tone(147,'sawtooth',0.18,0.3); tone(110,'sawtooth',0.14,0.4,0.25); noise(0.08,0.3,0.1); },

    toggleSfx: function() {
      sfxOn = !sfxOn; pub.sfxOn = sfxOn;
      document.getElementById('st-sfx-toggle').classList.toggle('on', sfxOn);
      localStorage.setItem('cge_sfx', sfxOn?'1':'0');
      if (sfxOn) pub.nav();
    },
    toggleVib: function() {
      vibOn = !vibOn; pub.vibOn = vibOn;
      document.getElementById('st-vib-toggle').classList.toggle('on', vibOn);
      localStorage.setItem('cge_vib', vibOn?'1':'0');
    },
    toggleParticles: function() {
      parOn = !parOn; pub.parOn = parOn;
      document.getElementById('st-par-toggle').classList.toggle('on', parOn);
      document.getElementById('particles').style.display = parOn ? '' : 'none';
      localStorage.setItem('cge_par', parOn?'1':'0');
    },
    confirmReset: function() {
      CGEModal.confirm(T('reset.confirm.title'), T('reset.confirm.body'), function() {
        ['cge_meta','cge_run','cge_sfx','cge_vib','cge_par','cge_mus','cge_profiles','cge_active'].forEach(function(k){ localStorage.removeItem(k); });
        Meta.totalGold=0; Meta.totalKills=0; Meta.totalRuns=0; Meta.bestFloor=0;
        Meta.levels={}; Meta.bonuses={atk:0,def:0,hp:0,potions:0,goldPct:0,crit:0};
        Meta.clearedZones={}; Meta.chest=[]; Meta.achievements={};
        State.hp=0; State.hpMax=0; State.name='Aventurier';
        Nav.go('main-menu');
        CGEModal.alert(T('reset.done.title'), T('reset.done.body'));
      });
    },
    load: function() {
      sfxOn = localStorage.getItem('cge_sfx') !== '0';
      vibOn = localStorage.getItem('cge_vib') !== '0';
      parOn = localStorage.getItem('cge_par') !== '0';
      pub.sfxOn = sfxOn; pub.vibOn = vibOn; pub.parOn = parOn;
    },
    applyToggles: function() {
      document.getElementById('st-sfx-toggle').classList.toggle('on', sfxOn);
      document.getElementById('st-vib-toggle').classList.toggle('on', vibOn);
      document.getElementById('st-par-toggle').classList.toggle('on', parOn);
      if (!parOn) document.getElementById('particles').style.display = 'none';
    }
  };
  return pub;
})();

// ── MUSIQUE PROCÉDURALE ──────────────────────────────────────────
var Music = (function(){
  var AC = null, masterGain = null;
  var nodes = [];   // tous les nœuds actifs
  var current = null;
  var musicOn = true;
  var fadeTimer = null;

  function ac() {
    if (!AC) {
      try { AC = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){}
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }

  function master() {
    if (!masterGain) {
      var c = ac(); if (!c) return null;
      masterGain = c.createGain();
      masterGain.gain.setValueAtTime(0, c.currentTime);
      masterGain.connect(c.destination);
    }
    return masterGain;
  }

  function killAll() {
    nodes.forEach(function(n){ try{ n.stop(); }catch(e){} try{ n.disconnect(); }catch(e){} });
    nodes = [];
  }

  function osc(freq, type, vol, dest) {
    var c = ac(); if (!c) return null;
    var g = c.createGain(); g.gain.value = vol;
    g.connect(dest);
    var o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    o.connect(g); o.start();
    nodes.push(o);
    return o;
  }

  function lfo(target, param, rate, depth, base) {
    var c = ac(); if (!c) return;
    var l = c.createOscillator(); l.type = 'sine'; l.frequency.value = rate;
    var lg = c.createGain(); lg.gain.value = depth;
    l.connect(lg); lg.connect(target[param]);
    l.start(); nodes.push(l);
  }

  function reverb(dest, seconds) {
    var c = ac(); if (!c) return dest;
    var len = c.sampleRate * seconds;
    var buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch=0; ch<2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i=0; i<len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.5);
    }
    var conv = c.createConvolver(); conv.buffer = buf;
    var g = c.createGain(); g.gain.value = 0.22;
    conv.connect(g); g.connect(dest);
    return conv;
  }

  // ── MUSIQUES ──
  function playMenu() {
    var c = ac(), m = master(); if (!c || !m) return;
    var rv = reverb(m, 3);
    // Drone de quinte (La + Mi)
    osc(55,   'sine',   0.18, rv);
    osc(82.5, 'sine',   0.10, rv);
    osc(110,  'sine',   0.08, rv);
    // Pad harmonique
    var pad = c.createGain(); pad.gain.value = 0.07; pad.connect(rv);
    [220, 277.2, 329.6, 440].forEach(function(f) {
      var o = c.createOscillator(); o.type='sine'; o.frequency.value=f;
      var g = c.createGain(); g.gain.value=0.22; o.connect(g); g.connect(pad);
      lfo(g, 'gain', 0.13+Math.random()*0.07, 0.10, 0.22);
      o.start(); nodes.push(o);
    });
    // Mélodie lente arpégée (La mineur pentatonique)
    var melody = [220, 261.6, 329.6, 392, 440, 523.2, 392, 329.6];
    var step = 0;
    function nextNote() {
      if (!musicOn || current !== 'menu') return;
      var c2 = ac(); if (!c2) return;
      var g = c2.createGain();
      g.gain.setValueAtTime(0, c2.currentTime);
      g.gain.linearRampToValueAtTime(0.09, c2.currentTime+0.12);
      g.gain.linearRampToValueAtTime(0, c2.currentTime+1.6);
      g.connect(rv);
      var o = c2.createOscillator(); o.type='triangle';
      o.frequency.value = melody[step % melody.length];
      o.connect(g); o.start(); o.stop(c2.currentTime+1.8);
      nodes.push(o);
      step++;
      setTimeout(nextNote, 1400 + Math.random()*600);
    }
    nextNote();
  }

  function playDungeon() {
    var c = ac(), m = master(); if (!c || !m) return;
    var rv = reverb(m, 4);
    // Drone grave oppressant
    osc(36.7, 'sawtooth', 0.06, rv);
    osc(55,   'sine',     0.12, rv);
    osc(73.4, 'sine',     0.05, rv);
    // Battement lent (tension)
    var bNode = c.createGain(); bNode.gain.value = 0.10; bNode.connect(m);
    lfo(bNode, 'gain', 0.07, 0.08, 0.10);
    osc(55, 'triangle', 0.12, bNode);
    // Sons de gouttes / pas (bruit filtré périodique)
    function drip() {
      if (!musicOn || current !== 'dungeon') return;
      var c2 = ac(); if (!c2) return;
      var buf = c2.createBuffer(1, c2.sampleRate*0.05, c2.sampleRate);
      var d = buf.getChannelData(0);
      for (var i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
      var src = c2.createBufferSource(); src.buffer=buf;
      var f = c2.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800+Math.random()*400;
      var g = c2.createGain(); g.gain.value=0.06;
      src.connect(f); f.connect(g); g.connect(rv);
      src.start(); nodes.push(src);
      setTimeout(drip, 2000 + Math.random()*4000);
    }
    drip();
  }

  function playCombat() {
    var c = ac(), m = master(); if (!c || !m) return;
    var rv = reverb(m, 1.5);
    // Basse pulsante (rythme cardiaque)
    function beat() {
      if (!musicOn || current !== 'combat') return;
      var c2 = ac(); if (!c2) return;
      // Kick grave
      var g = c2.createGain();
      g.gain.setValueAtTime(0.25, c2.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime+0.35);
      g.connect(m);
      var o = c2.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(120, c2.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, c2.currentTime+0.3);
      o.connect(g); o.start(); o.stop(c2.currentTime+0.4);
      nodes.push(o);
      // Double battement (lub-dub)
      setTimeout(function(){
        if (!musicOn || current !== 'combat') return;
        var c3 = ac(); if (!c3) return;
        var g2 = c3.createGain();
        g2.gain.setValueAtTime(0.15, c3.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, c3.currentTime+0.25);
        g2.connect(m);
        var o2 = c3.createOscillator(); o2.type='sine';
        o2.frequency.setValueAtTime(90, c3.currentTime);
        o2.frequency.exponentialRampToValueAtTime(35, c3.currentTime+0.2);
        o2.connect(g2); o2.start(); o2.stop(c3.currentTime+0.3);
        nodes.push(o2);
      }, 220);
      setTimeout(beat, 900);
    }
    beat();
    // Pad de tension (quinte augmentée)
    var pad = c.createGain(); pad.gain.value = 0.05; pad.connect(rv);
    lfo(pad, 'gain', 0.09, 0.04, 0.05);
    [110, 164.8, 207.7].forEach(function(f){ osc(f,'sawtooth',0.08,pad); });
    // Mélodie de danger (motif répété)
    var motif = [220,196,220,174.6,220,196,174.6,164.8];
    var mi = 0;
    function mNote() {
      if (!musicOn || current !== 'combat') return;
      var c2 = ac(); if (!c2) return;
      var g = c2.createGain();
      g.gain.setValueAtTime(0, c2.currentTime);
      g.gain.linearRampToValueAtTime(0.06, c2.currentTime+0.04);
      g.gain.linearRampToValueAtTime(0, c2.currentTime+0.18);
      g.connect(rv);
      var o = c2.createOscillator(); o.type='square';
      o.frequency.value = motif[mi % motif.length];
      o.connect(g); o.start(); o.stop(c2.currentTime+0.22);
      nodes.push(o); mi++;
      setTimeout(mNote, 280 + (mi%4===0?160:0));
    }
    mNote();
  }

  // ── API ──
  return {
    play: function(track) {
      if (!musicOn) return;
      if (current === track) return;
      current = track;
      var m = master(); if (!m) return;
      var c = ac(); if (!c) return;
      // Fondu sortant
      m.gain.cancelScheduledValues(c.currentTime);
      m.gain.setValueAtTime(m.gain.value, c.currentTime);
      m.gain.linearRampToValueAtTime(0, c.currentTime+1.2);
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function(){
        killAll();
        if (!musicOn || current !== track) return;
        m.gain.setValueAtTime(0, c.currentTime);
        m.gain.linearRampToValueAtTime(0.7, c.currentTime+2.5);
        if (track==='menu')    playMenu();
        if (track==='dungeon') playDungeon();
        if (track==='combat')  playCombat();
      }, 1300);
    },

    stop: function() {
      current = null;
      var m = master(), c = ac();
      if (m && c) {
        m.gain.cancelScheduledValues(c.currentTime);
        m.gain.setValueAtTime(m.gain.value, c.currentTime);
        m.gain.linearRampToValueAtTime(0, c.currentTime+1.5);
      }
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(killAll, 1600);
    },

    toggleMusic: function() {
      musicOn = !musicOn;
      document.getElementById('st-mus-toggle').classList.toggle('on', musicOn);
      localStorage.setItem('cge_mus', musicOn?'1':'0');
      if (!musicOn) { Music.stop(); }
      else if (current) { var t=current; current=null; Music.play(t); }
    },

    load: function() {
      musicOn = localStorage.getItem('cge_mus') !== '0';
    },

    get on() { return musicOn; }
  };
})();

// ── PROFILS ───────────────────────────────────────────────────────
var ProfileManager = {
  KEY: 'cge_profiles',
  ACTIVE_KEY: 'cge_active',

  getAll: function() {
    var u = Vault.unpack(localStorage.getItem(this.KEY));
    return Array.isArray(u.data) ? u.data : [];
  },
  saveAll: function(list) {
    try { localStorage.setItem(this.KEY, Vault.pack(list)); } catch(e) {}
    if (typeof CloudSync !== 'undefined') CloudSync.syncProfiles(list, this.getActiveId());
  },
  getActiveId: function() { return localStorage.getItem(this.ACTIVE_KEY)||null; },
  setActiveId: function(id) { localStorage.setItem(this.ACTIVE_KEY, id); },
  getActive: function() {
    var id = this.getActiveId();
    if (!id) return null;
    return this.getAll().find(function(p){ return p.id===id; })||null;
  },

  create: function(name, race, cls) {
    var id = Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    var p = { id:id, name:name||'Inconnu', race:race, cls:cls,
              createdAt:Date.now(), lastPlayed:Date.now(), level:1,
              meta:null, run:null };
    var list = this.getAll();
    list.push(p);
    this.saveAll(list);
    this.setActiveId(id);
    return p;
  },

  updateActive: function(metaData, runData) {
    var id = this.getActiveId(); if (!id) return;
    var list = this.getAll();
    var idx = -1;
    for (var i=0;i<list.length;i++) { if (list[i].id===id){ idx=i; break; } }
    if (idx<0) return;
    if (metaData !== undefined && metaData !== null) list[idx].meta = metaData;
    if (runData  !== undefined) list[idx].run = runData; // null efface la save de run
    list[idx].lastPlayed = Date.now();
    if (State.level) list[idx].level = State.level||1;
    this.saveAll(list);
  },

  activateProfile: function(id) {
    var list = this.getAll();
    var p = null;
    for (var i=0;i<list.length;i++){ if (list[i].id===id){ p=list[i]; break; } }
    if (!p) return false;
    this.setActiveId(id);
    // Restore meta
    if (p.meta) { localStorage.setItem('cge_meta', Vault.pack(p.meta)); Meta.load(); }
    else { localStorage.removeItem('cge_meta'); Meta.load(); }
    // Restore run
    if (p.run) { localStorage.setItem('cge_run', Vault.pack(p.run)); }
    else { localStorage.removeItem('cge_run'); }
    // Restore identity
    State.race = p.race || 'Humain';
    State.cls  = p.cls  || 'Guerrier';
    State.name = p.name || 'Héros';
    return p;
  },

  deleteProfile: function(id) {
    var list = this.getAll().filter(function(p){ return p.id!==id; });
    this.saveAll(list);
    if (this.getActiveId()===id) {
      // Profil actif supprimé : purger aussi son meta/run pour ne pas laisser de données orphelines
      localStorage.removeItem(this.ACTIVE_KEY);
      localStorage.removeItem('cge_meta');
      localStorage.removeItem('cge_run');
    }
  },

  exportCode: function(id) {
    var list = this.getAll();
    var p = null;
    for (var i=0;i<list.length;i++){ if (list[i].id===id){ p=Object.assign({},list[i]); break; } }
    if (!p) return null;
    if (this.getActiveId()===id) {
      p.meta = Vault.unpack(localStorage.getItem('cge_meta')).data || null;
      p.run  = Vault.unpack(localStorage.getItem('cge_run')).data || null;
    }
    return Vault.pack(p) || null;
  },

  importCode: function(code) {
    try {
      code = code.trim();
      var u = Vault.unpack(code);
      var p = u.valid ? u.data : null;
      // Repli : ancien code base64 (atob d'un JSON non préfixé V1:)
      if (!p) { try { p = JSON.parse(decodeURIComponent(escape(atob(code)))); } catch(e){} }
      if (!p || !p.name) return null;
      if (p.meta) p.meta = Integrity.meta(p.meta);
      if (p.run)  p.run  = Integrity.run(p.run);
      p.id = Date.now().toString(36)+Math.random().toString(36).slice(2,5);
      p.lastPlayed = Date.now();
      var list = this.getAll();
      list.push(p);
      this.saveAll(list);
      return p;
    } catch(e) { return null; }
  },

  // Migration: if no profiles exist but cge_meta/cge_run do, create a default profile
  migrate: function() {
    var list = this.getAll();
    if (list.length > 0) return;
    var hasMeta = !!localStorage.getItem('cge_meta');
    var hasRun  = !!localStorage.getItem('cge_run');
    if (!hasMeta && !hasRun) return;
    var meta = Vault.unpack(localStorage.getItem('cge_meta')).data;
    var run  = Vault.unpack(localStorage.getItem('cge_run')).data;
    var race = (run&&run.race)||'Humain';
    var cls  = (run&&run.cls)||'Guerrier';
    var id = Date.now().toString(36)+'mig';
    list.push({ id:id, name:'Aventurier', race:race, cls:cls,
                createdAt:Date.now(), lastPlayed:Date.now(),
                level:(run&&run.level)||1, meta:meta, run:run });
    this.saveAll(list);
    this.setActiveId(id);
  },
};

var ProfilesScreen = {
  _exportId: null,
  _mode: 'export', // 'export' or 'import'

  open: function() {
    this.render();
    Nav.go('profiles-screen');
  },

  backFromCreate: function() {
    var list = ProfileManager.getAll();
    if (list.length > 0) { Nav.go('profiles-screen'); } else { Nav.go('main-menu'); }
  },

  _creating: false,
  createNew: function() {
    this._creating = false; // StoryIntro will set it when done
    StoryIntro.start();
  },

  render: function() {
    var list = ProfileManager.getAll();
    var cont = document.getElementById('prof-list');
    if (!cont) return;
    cont.innerHTML = '';
    if (list.length === 0) {
      cont.innerHTML = '<div style="text-align:center;padding:40px 20px;font-family:Crimson Text,serif;font-style:italic;color:rgba(201,165,80,0.35);font-size:14px;">Aucun aventurier pour l\'instant.<br>Crée ton premier héros !</div>';
      return;
    }
    list.forEach(function(p) {
      var r = (typeof RACES !== 'undefined') ? RACES.find(function(x){ return x.id===p.race; }) : null;
      var c = (typeof CLASSES !== 'undefined') ? CLASSES.find(function(x){ return x.id===p.cls; }) : null;
      var avatar = (r&&r.icon)||'⚔';
      var rName  = (r&&(CGE_LANG==='en'&&r.nameEn?r.nameEn:r.name))||p.race||'?';
      var cName  = (c&&(CGE_LANG==='en'&&c.nameEn?c.nameEn:c.name))||p.cls||'?';
      var date   = new Date(p.lastPlayed||p.createdAt||Date.now());
      var dateStr= date.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
      var div = document.createElement('div');
      div.className = 'prof-card';
      div.innerHTML =
        '<div class="prof-card-top">'+
          '<div class="prof-card-avatar">'+avatar+'</div>'+
          '<div class="prof-card-info">'+
            '<div class="prof-card-name">'+p.name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</div>'+
            '<div class="prof-card-sub">'+rName+' · '+cName+'</div>'+
            '<div class="prof-card-meta">'+T('profile.level')+' '+(p.level||1)+' · '+T('profile.lastplayed')+' '+dateStr+'</div>'+
          '</div>'+
          '<div class="prof-card-del" data-id="'+p.id+'">✕</div>'+
        '</div>'+
        '<div class="prof-card-btns">'+
          '<button class="prof-btn-play" data-id="'+p.id+'">⚔ Jouer</button>'+
          '<button class="prof-btn-export" data-id="'+p.id+'" title="Exporter">📤</button>'+
        '</div>';
      cont.appendChild(div);
    });
    // Events
    cont.querySelectorAll('.prof-btn-play').forEach(function(btn){
      btn.addEventListener('click', function(){ ProfilesScreen.selectProfile(btn.dataset.id); });
    });
    cont.querySelectorAll('.prof-btn-export').forEach(function(btn){
      btn.addEventListener('click', function(){ ProfilesScreen.openExport(btn.dataset.id); });
    });
    cont.querySelectorAll('.prof-card-del').forEach(function(btn){
      btn.addEventListener('click', function(){
        CGEModal.confirm(T('delhero.confirm.title'), T('delhero.confirm.body'), function() {
          ProfileManager.deleteProfile(btn.dataset.id);
          ProfilesScreen.render();
        });
      });
    });
  },

  selectProfile: function(id) {
    var p = ProfileManager.activateProfile(id);
    if (!p) return;
    State.name = p.name || 'Aventurier';
    State.race = p.race || 'Humain';
    State.cls  = p.cls  || 'Guerrier';

    // Run sauvegardé ? → continuer
    if (p.run && p.run.hp) {
      // déjà chargé dans localStorage par activateProfile
      if (State.loadRun()) {
        Nav.go('inn-room');
        setTimeout(function(){ InnRoom.enter(); }, 300);
        return;
      }
    }

    // Pas de run → démarrer une nouvelle partie avec ce profil
    var r = RACES.find(function(x){ return x.id===State.race; }) || RACES[0];
    var c = CLASSES.find(function(x){ return x.id===State.cls; }) || CLASSES[0];
    var b = Meta.bonuses;
    State.hp    = c.hp  + r.dhp  + (b.hp||0);
    State.hpMax = c.hp  + r.dhp  + (b.hp||0);
    State.atk   = c.atk + r.datk + (b.atk||0);
    State.def   = c.def + r.ddef + (b.def||0);
    State.floor  = 1; State.gold = (b.startGold||0); State.kills = 0;
    State.xp = 0; State.level = 1;
    State.potions = 2 + (b.potions||0);
    State.regenPerFight = 0; State.critBonus = b.crit||0; State.dodgeBonus = 0; State.itemLifesteal = 0;
    State._zoneMod = { enemyMod:1, goldMod:1 }; State._currentZone = null;
    State.persistentStatuses = [];
    State.bag = []; State.inventory = [];
    State.scrolls = [];
    State.equipped = { heaume:null,arme:null,bouclier:null,gants:null,bottes:null,ceinture:null,jambieres:null,collier:null,plastron:null,bague_gauche:null,bague_droite:null };
    State.fleeBonus = 0;
    Nav.go('inn-room');
    setTimeout(function(){ InnRoom.enter(); }, 300);
  },

  openExport: function(id) {
    this._exportId = id;
    this._mode = 'export';
    var code = ProfileManager.exportCode(id);
    if (!code) { CGEModal.alert(T('code.error.title'), T('code.export.fail')); return; }
    var modal = document.getElementById('code-modal');
    document.getElementById('code-modal-title').textContent = T('code.export.title');
    document.getElementById('code-modal-sub').textContent = T('code.export.sub');
    document.getElementById('code-modal-textarea').value = code;
    document.getElementById('code-modal-textarea').readOnly = true;
    document.getElementById('code-modal-copy').style.display = 'block';
    document.getElementById('code-modal-import').style.display = 'none';
    modal.classList.add('show');
  },

  openImport: function() {
    this._mode = 'import';
    var modal = document.getElementById('code-modal');
    document.getElementById('code-modal-title').textContent = T('code.import.title');
    document.getElementById('code-modal-sub').textContent = T('code.import.sub');
    document.getElementById('code-modal-textarea').value = '';
    document.getElementById('code-modal-textarea').readOnly = false;
    document.getElementById('code-modal-copy').style.display = 'none';
    document.getElementById('code-modal-import').style.display = 'block';
    modal.classList.add('show');
    setTimeout(function(){ document.getElementById('code-modal-textarea').focus(); }, 300);
  },

  copyCode: function() {
    var ta = document.getElementById('code-modal-textarea');
    ta.select();
    try { document.execCommand('copy'); CGEModal.alert(T('code.copied.title'), T('code.copied.body')); }
    catch(e) {
      try { navigator.clipboard.writeText(ta.value).then(function(){ CGEModal.alert(T('code.copied.title'), T('code.copied.body2')); }); }
      catch(e2) { CGEModal.alert(T('code.copymanual.title'), T('code.copymanual.body')); }
    }
  },

  doImport: function() {
    var code = document.getElementById('code-modal-textarea').value.trim();
    if (!code) { CGEModal.alert(T('code.empty.title'), T('code.empty.body')); return; }
    var p = ProfileManager.importCode(code);
    if (!p) { CGEModal.alert(T('code.error.title'), T('code.invalid.body')); return; }
    this.closeModal();
    this.render();
    CGEModal.alert(T('code.imported.title'), T('code.imported.body').replace('{n}', p.name));
  },

  closeModal: function() {
    document.getElementById('code-modal').classList.remove('show');
  },
};

// ── RIPPLE ────────────────────────────────────────────────────────
function spawnRipple(el, e) {
  var r = el.getBoundingClientRect();
  var cx = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - r.left;
  var cy = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - r.top;
  var size = Math.max(r.width, r.height) * 2;
  var rr = document.createElement('span');
  rr.className = 'ripple-wave';
  rr.style.cssText = 'width:'+size+'px;height:'+size+'px;top:'+(cy-size/2)+'px;left:'+(cx-size/2)+'px';
  el.appendChild(rr);
  setTimeout(function(){ if(rr.parentNode) rr.parentNode.removeChild(rr); }, 600);
}
(function attachRipples(){
  document.querySelectorAll('.cb-btn,.lu-card').forEach(function(el){ el.classList.add('ripple-el'); });
  document.addEventListener('touchstart', function(e) {
    var t = e.target.closest('.cb-btn,.lu-card,.hotspot,.hs-btn,button:not([data-no-ripple]),[data-ripple]');
    if (t) { t.classList.add('ripple-el'); spawnRipple(t, e); }
    if (t && typeof Sfx !== 'undefined' && t.tagName === 'BUTTON' && !t.classList.contains('cb-btn')) {
      Sfx.nav();
    }
  }, {passive:true});
})();

// ── STORY INTRO ────────────────────────────────────────────────────
var StoryIntro = (function(){
  var _c = {};   // choices accumulated
  var _idx = 0;

  var SCENES = [
    // 0 — Éveil
    { type:'auto', delay:2800,
      lines:['Noir.','Absolument tout est noir.','Puis... une sensation.'],
      linesEn:['Black.','Absolutely everything is black.','Then... a sensation.'] },
    // 1 — Première sensation
    { type:'choice',
      lines:['La première chose que tu ressens...'],
      linesEn:['The first thing you feel...'],
      choices:[
        { text:'Le froid. Un froid glacial.', textEn:'The cold. A freezing cold.', key:'trait', val:'cold' },
        { text:'La douleur. Partout.', textEn:'The pain. Everywhere.', key:'trait', val:'pain' },
        { text:'Rien. Absolument rien.', textEn:'Nothing. Absolutely nothing.', key:'trait', val:'void' }
      ]
    },
    // 2 — Une voix
    { type:'choice',
      lines:['Une voix. Lointaine.', 'Elle parle de toi.'],
      linesEn:['A voice. Distant.', 'It speaks of you.'],
      choices:[
        { text:'"Il respire encore."', textEn:'"He still breathes."', key:'voice', val:'survivor' },
        { text:'"Par les dieux... réveille-toi."', textEn:'"By the gods... wake up."', key:'voice', val:'divine' },
        { text:'"Quelqu\'un l\'a trouvé."', textEn:'"Someone found him."', key:'voice', val:'found' }
      ]
    },
    // 3 — La lumière
    { type:'auto', delay:3000,
      lines:['La lumière arrive.','Brutalement.','Un plafond de bois. Une bougie vacillante.','Tu ne reconnais rien.'],
      linesEn:['The light comes.','Brutally.','A wooden ceiling. A flickering candle.','You recognize nothing.'] },
    // 4 — Le vide
    { type:'auto', delay:2200,
      lines:['Tu cherches quelque chose.','Un nom.','Il n\'est pas là.'],
      linesEn:['You search for something.','A name.','It is not there.'] },
    // 5 — Race
    { type:'choice',
      lines:['Dans le brouillard de ton esprit...','Une forme. La tienne ?'],
      linesEn:['In the fog of your mind...','A shape. Yours?'],
      choices:[
        { text:'Massive. Rugueuse. Taillée dans la pierre.', textEn:'Massive. Rugged. Carved from stone.', key:'race', val:'Nain' },
        { text:'Fine. Presque transparente. Faite pour disparaître.', textEn:'Slender. Almost transparent. Made to vanish.', key:'race', val:'Elfe' },
        { text:'Large. Puissante. Une rage froide sous la peau.', textEn:'Broad. Powerful. A cold rage beneath the skin.', key:'race', val:'Orc' },
        { text:'Ordinaire. Mais tes yeux — ils observent tout.', textEn:'Ordinary. But your eyes — they see everything.', key:'race', val:'Humain' }
      ]
    },
    // 6 — Classe
    { type:'choice',
      lines:['Un instinct remonte.','Quelque chose que ton corps sait faire.'],
      linesEn:['An instinct surfaces.','Something your body knows how to do.'],
      choices:[
        { text:'Tes mains cherchent une lame. C\'est un réflexe.', textEn:'Your hands reach for a blade. It\'s a reflex.', key:'cls', val:'Guerrier' },
        { text:'Des mots étranges murmurent dans ta tête. Du feu.', textEn:'Strange words whisper in your head. Fire.', key:'cls', val:'Mage' },
        { text:'Tes yeux balaient l\'horizon avant tout le reste.', textEn:'Your eyes sweep the horizon before all else.', key:'cls', val:'Chasseur' },
        { text:'Un coup. Unique. Invisible. C\'est tout ce que tu sais.', textEn:'One strike. Single. Invisible. That\'s all you know.', key:'cls', val:'Assassin' },
        { text:'Tu veux protéger. Avant même de savoir qui.', textEn:'You want to protect. Before even knowing whom.', key:'cls', val:'Prêtre' },
        { text:'Tu souffres. Et tu souris. Ça ne s\'arrête pas.', textEn:'You suffer. And you smile. It never stops.', key:'cls', val:'Barbare' }
      ]
    },
    // 7 — Nom
    { type:'input',
      lines:['Un mot remonte. Juste un.','Comment t\'appelle-t-on ?'],
      linesEn:['One word surfaces. Just one.','What are you called?'] },
    // 8 — Marta (fin)
    { type:'auto', delay:4200, finish:true,
      lines:[
        'Soudain — une voix dans la pièce.',
        'Réelle, cette fois.',
        '"Enfin réveillé ? Vous avez dormi trois jours."',
        'Une femme dans l\'embrasure de la porte.',
        '"Je suis Marta. Et vous me devez de l\'argent."'
      ],
      linesEn:[
        'Suddenly — a voice in the room.',
        'Real, this time.',
        '"Awake at last? You slept for three days."',
        'A woman in the doorway.',
        '"I am Marta. And you owe me money."'
      ]
    }
  ];

  function _clear() {
    var t = document.getElementById('si-text');
    var ch = document.getElementById('si-choices');
    var nw = document.getElementById('si-name-wrap');
    if (t)  t.innerHTML = '';
    if (ch) { ch.innerHTML = ''; ch.classList.remove('show'); }
    if (nw) { nw.classList.remove('show'); document.getElementById('si-name-input').value = ''; }
  }

  function _typeLines(lines, done) {
    var t = document.getElementById('si-text');
    if (!t) return;
    var i = 0;
    function next() {
      if (i >= lines.length) { if (done) done(); return; }
      var line = lines[i++];
      var sp = document.createElement('div');
      sp.className = 'si-line' + (line.charAt(0) === '"' ? ' si-line-em' : '');
      sp.textContent = line;
      t.appendChild(sp);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        sp.classList.add('vis');
        // Delay based on length: short = 1s, long = 1.8s
        var wait = Math.min(1800, Math.max(1000, line.length * 35));
        setTimeout(next, wait + 300);
      }); });
    }
    next();
  }

  function _scene(idx) {
    _idx = idx;
    var sc = SCENES[idx];
    if (!sc) return;
    _clear();
    var _lines = (CGE_LANG === 'en' && sc.linesEn) ? sc.linesEn : sc.lines;
    _typeLines(_lines, function() {
      if (sc.type === 'auto') {
        setTimeout(function(){
          if (sc.finish) _finish(); else _scene(idx+1);
        }, sc.delay || 2000);
      } else if (sc.type === 'choice') {
        var ch = document.getElementById('si-choices');
        ch.innerHTML = '';
        sc.choices.forEach(function(opt) {
          var btn = document.createElement('button');
          btn.className = 'si-choice ripple-el';
          btn.textContent = (CGE_LANG === 'en' && opt.textEn) ? opt.textEn : opt.text;
          btn.addEventListener('click', function(){
            _c[opt.key] = opt.val;
            if (typeof Sfx !== 'undefined') Sfx.nav();
            _scene(idx+1);
          });
          ch.appendChild(btn);
        });
        setTimeout(function(){ ch.classList.add('show'); }, 80);
      } else if (sc.type === 'input') {
        var nw = document.getElementById('si-name-wrap');
        nw.classList.add('show');
        setTimeout(function(){ document.getElementById('si-name-input').focus(); }, 350);
      }
    });
  }

  function _finish() {
    State.race = _c.race || 'Humain';
    State.cls  = _c.cls  || 'Guerrier';
    var heroName = _c.name || 'Étranger';
    var inp = document.getElementById('cs-name-input');
    if (inp) inp.value = heroName;
    State._introChoices = _c;
    State._showMartaIntro = true;
    ProfilesScreen._creating = true;
    App.startRun();
  }

  return {
    start: function() {
      _c = {}; _idx = 0;
      Nav.go('story-intro');
      setTimeout(function(){ _scene(0); }, 500);
    },
    confirmName: function() {
      var val = (document.getElementById('si-name-input').value||'').trim();
      if (!val) { document.getElementById('si-name-input').focus(); return; }
      _c.name = val;
      if (typeof Sfx !== 'undefined') Sfx.nav();
      _scene(_idx + 1);
    },
    skip: function() {
      ProfilesScreen._creating = true;
      Nav.go('char-select');
      buildCharSelect();
      var inp = document.getElementById('cs-name-input');
      if (inp) inp.value = '';
    }
  };
})();

// ── LANGUAGE SYSTEM ───────────────────────────────────────────────
var CGE_LANG = localStorage.getItem('cge_lang') || 'fr';

var STRINGS = {
  fr: {
    // Main menu
    'menu.play': 'Jouer',
    'menu.achievements': 'Succès',
    'menu.settings': '⚙ Paramètres',
    'menu.signin': 'Se connecter avec Google',
    // Settings
    'settings.title': 'Paramètres',
    'settings.music': 'Musique',
    'settings.music.sub': 'Ambiance menu, donjon et combat',
    'settings.sfx': 'Effets sonores',
    'settings.sfx.sub': 'Sons de combat et d\'interface',
    'settings.vibration': 'Vibrations',
    'settings.vibration.sub': 'Retour haptique sur mobile',
    'settings.particles': 'Particules',
    'settings.particles.sub': 'Braises en arrière-plan',
    'settings.language': 'Langue / Language',
    'settings.language.sub': 'Français · English',
    'settings.reset': '⚠ Réinitialiser la progression',
    // Profiles
    'profiles.title': 'Mes Aventuriers',
    'profiles.subtitle': 'Choisis ton héros ou crée-en un nouveau',
    'profiles.new': '＋ Créer un aventurier',
    'profiles.import': '↓ Importer un code de sauvegarde',
    // HUD
    'hud.floor': 'Étage',
    'hud.level': 'Niv.',
    'hud.potions': 'Potions',
    // Modal
    'modal.ok': 'Compris',
    'modal.confirm': 'Confirmer',
    'modal.cancel': 'Annuler',
    // Inn
    'inn.fullhp': 'Vous êtes déjà en pleine forme !',
    'inn.needgold': 'Il vous faut {n} 🪙 pour passer la nuit.',
    'inn.rested': '✨ Repos (15 🪙) — +{n} PV. Pleine forme !',
    'inn.rested.status': '✨ Repos (15 🪙) — Soigné ! Statuts dissipés.',
    // Profile card
    'profile.level': 'Niveau',
    'profile.lastplayed': 'Dernière partie :',
    // Combat
    'combat.attack': 'Attaquer',
    'combat.defend': 'Défendre',
    'combat.skill': 'Compétence',
    'combat.potion': 'Potion',
    'combat.bag': 'Sac',
    'combat.flee': 'Fuir (risqué)',
    'combat.choosespell': 'CHOISIR UN SORT',
    'combat.useitem': 'UTILISER UN OBJET',
    'combat.continue': 'Continuer',
    'combat.victory': 'Victoire !',
    'combat.defeat': 'Défaite',
    // Combat log (fixed lines)
    'cl.tooslow': '⏰ Trop lent ! Le monstre profite de ta lenteur...',
    'cl.stunned': 'Tu es étourdi et perds ton tour !',
    'cl.dodge': '💨 Tu esquives l\'attaque !',
    'cl.defend': 'Tu te mets en garde. (-50% dégâts ce tour)',
    'cl.ragebonus': '🟠 Rage orcque ! ATQ ×1.5',
    'cl.nomana': 'Plus de mana !',
    'cl.notenoughmana': 'Plus assez de mana !',
    'cl.shieldskill': 'Bouclier de fer ! (+8 DEF)',
    'cl.nopotions': 'Plus de potions !',
    'cl.confusion': '🔮 Confusion ! L\'ennemi perd son tour.',
    'cl.flee': 'Tu t\'enfuis dans l\'obscurité !',
    'cl.fleefail': 'Impossible de fuir !',
    // Loot
    'loot.title': 'Victoire !',
    'loot.sub': 'L\'ennemi est vaincu',
    'loot.gold': 'Or gagné',
    // Gameover
    'go.title': 'Défaite',
    'go.inn': '🏠 Retour à l\'auberge',
    'menu.main': 'Menu principal',
    // Rest screen
    'rest.title': 'Feu de camp',
    'rest.desc': 'Tu trouves un abri précaire dans les ténèbres. Le feu crépite doucement.',
    'rest.btn': 'Se reposer →',
    'rest.camp.title': 'Feu de camp',
    'rest.camp.desc': 'Tu trouves un abri précaire dans les ténèbres. Le feu crépite doucement.',
    'rest.camp.btn': 'Se reposer →',
    'rest.mystery.title': 'Salle Mystérieuse',
    'rest.mystery.btn': 'Continuer →',
    'rest.trap.title': 'Piège !',
    'rest.trap.desc': 'Tu déclenches un mécanisme caché. Les lames jaillissent des murs !',
    'rest.trap.btn': 'Affronter l\'ennemi →',
    'shop.inv.full': 'Inventaire plein',
    'shop.inv.full.buy': 'Équipe ou vends un objet avant d\'en acheter un nouveau.',
    'shop.inv.full.unequip': 'Libère une place dans ton sac avant de retirer cet équipement.',
    'shop.inv.full.limit': 'Tu ne peux pas porter plus de 8 objets.',
    'shop.free.title': 'Achat Gratuit !',
    'shop.free.desc': 'Cet achat est remboursé grâce à votre pub !',
    'shop.free.refund': 'Le dernier objet acheté vous est remboursé ! +{n} 🪙',
    'ads.title': 'Publicité',
    'ads.body': 'Une publicité va être diffusée. Confirme pour recevoir ta récompense.',
    'ads.watch': 'Voir la pub',
    'camp.title': '🔥 Feu de camp',
    'camp.desc': 'Un feu de camp fait main crépite juste avant la porte du boss.\n\nTu peux te reposer gratuitement pour récupérer 75% de tes PV, ou continuer directement.',
    'camp.rest': 'Se reposer (+75% PV)',
    'camp.continue': 'Continuer →',
    'camp.rested': 'Tu t\'es reposé près du feu. +{n} PV récupérés.\n\nLa porte du boss t\'attend.',
    'tuto.map.title': '🗺 La carte du donjon',
    'tuto.map.body': 'Touche un nœud accessible (en surbrillance) pour avancer.\n\nLes salles sont cachées : ⚔ ennemi, 🔥 repos, 🛒 boutique, ❓ mystère, ⚠ piège.\nUn 🔥 feu de camp apparaît toujours juste avant le ☠ boss.\n\nChoisis bien ton chemin — chaque nœud compte !',
    'tuto.combat.title': '⚔ Le combat',
    'tuto.combat.body': 'À ton tour, choisis une action :\n\n⚔ Attaquer — inflige des dégâts.\n🛡 Défendre — réduit les dégâts du prochain coup.\n✨ Compétence — pouvoir spécial de ta classe.\n🧪 Potion — restaure tes PV.\n🎒 Sac — utilise un objet.\n🏃 Fuir — tente de quitter le combat (risqué).',
    'passage.label': 'PASSAGE OBSCUR',
    'passage.sub': 'Le mur du fond a toujours été là.',
    'passage.text': 'Tu as déjà été ici. Des dizaines de fois peut-être.\n\nMais aujourd\'hui quelque chose a changé.\n\nLa pierre du fond vibre légèrement. Une fissure. Longue d\'un doigt.\n\nTu la touches.\n\nEt le mur s\'ouvre.',
    // Misc
    'misc.continue_arrow': 'Continuer →',
    // Town
    'town.title': 'Thornwall',
    'town.inn': '🛏 Chambre',
    'town.forge': '⚒ Forge',
    'town.armurerie': '🛡 Armurerie',
    'town.couturier': '🧵 Couturier',
    'town.bijoutier': '💍 Bijoutier',
    'town.temple': '⛪ Église · Boutique',
    'town.guild': 'Guilde',
    'town.adventure': '⚔ Partir à l\'aventure',
    'town.chateau': '🏰 Château',
    'town.taverne': '🍺 Taverne',
    // Inn
    'inn.window': 'Partir à l\'aventure',
    'inn.equip': 'Équipement',
    'inn.chest': 'Coffre',
    'inn.rest': 'Repos (15 🪙)',
    'inn.town': 'Aller en ville',
    // World map
    'wm.title': 'La Région',
    'wm.back': 'Retour',
    // Travel
    'travel.title': 'Carte du Monde',
    'travel.floor': 'Étage',
    'travel.sec.rest': 'Repos & Soins',
    'travel.sec.trade': 'Commerce',
    'travel.sec.dungeons': 'Autres Donjons',
    'travel.town.name': 'Village de Thornwall',
    'travel.town.desc': 'Marchands, forgeron et auberge — dépense ton or judicieusement',
    'travel.town.badge': 'Boutique',
    'travel.cave.name': 'Grotte des Chauves-souris',
    'travel.cave.desc': 'Facile · Ennemis faibles, bon or pour débutants',
    'travel.cave.badge': 'Niv. 1–2',
    'travel.ruins.badge': 'Niv. 3+',
    'travel.abyss.name': 'L\'Abîsse Sans Fond',
    'travel.abyss.desc': 'Extrême · Réservé aux héros légendaires',
    'travel.camp': 'Campement',
    'travel.camp.desc': 'Allume un feu et récupère 35% de tes PV',
    'travel.free': 'Gratuit',
    // Zones
    'zone.grottes': 'Grottes des Ombres',
    'zone.foret': 'Forêt des Âmes Perdues',
    'zone.ruines': 'Ruines d\'Astavar',
    'zone.port': 'Port des Tempêtes',
    'zone.marais': 'Marais de Vaelthar',
    'zone.pics': 'Pics du Néant',
    'zone.volcan': 'Caldera d\'Aszgol',
    'zone.cryptes': 'Les Cryptes Éternelles',
    'zone.chateau_maudit': 'Le Château Maudit',
    'zone.cite_oubliee': 'La Cité Oubliée',
    'zone.gouffre_astral': 'Le Gouffre Astral',
    'zone.cryptes_profondes': 'Les Cryptes Profondes',
    // Hero screen
    'hero.level': 'Niveau',
    'hero.class': 'Classe',
    'hero.race': 'Race',
    'hero.rank': 'Rang Social',
    'hero.stats': 'Statistiques',
    'hero.equip': 'Équipement',
    // Ranks
    'rank.0': 'Inconnu',
    'rank.1': 'Connu',
    'rank.2': 'Respecté',
    'rank.3': 'Honoré',
    'rank.4': 'Légendaire',
    // Shop
    'shop.buy': 'Acheter',
    'shop.sell': 'Vendre',
    'shop.close': 'Fermer',
    // Classes
    'class.guerrier': 'Guerrier',
    'class.mage': 'Mage',
    'class.chasseur': 'Chasseur',
    'class.assassin': 'Assassin',
    'class.pretre': 'Prêtre',
    'class.barbare': 'Barbare',
    // Races
    'race.humain': 'Humain',
    'race.elfe': 'Elfe',
    'race.nain': 'Nain',
    'race.orc': 'Orc',
    // Taverne
    'taverne.title': 'La Lyonnesse',
    // NPC names
    'npc.bertrand': 'Bertrand',
    'npc.oswin': 'Oswin',
    'npc.seraphine': 'Séraphine',
    'npc.marta': 'Marta',
    'npc.aldric': 'Capitaine Aldric',
    'npc.elise': 'Sœur Élise',
    // Quest UI
    'quest.accept': 'Accepter la quête',
    'quest.claim': 'Réclamer la récompense',
    'quest.close': 'Fermer',
    'quest.inprogress': 'En cours : ',
    'quest.reward': 'Récompense : ',
    'final.prompt': '— Tu tiens le cristal de Séraphine. Devant toi, l\'autel. En dessous, le sceau. Et la voix du Dieu de la Mémoire, patiente.\n\n« Tu sais déjà ce que tu es venu faire. Choisis. »',
    'final.gardien': '🛡 Poser le cristal sur l\'autel — renforcer le sceau',
    'final.liberateur': '🗝 Briser le cristal — libérer ce qui dort',
    'final.vide': '💀 Briser le cristal — laisser tout s\'effondrer',
    // Gameover
    'go.victory': 'VICTOIRE !',
    'go.floor': 'Étage atteint',
    'go.gold': 'Or récupéré',
    'go.kills': 'Ennemis vaincus',
    'go.continue': 'Continuer l\'aventure',
    // Achievements screen
    'ach.title': 'Succès',
    'ach.close': 'Fermer',
    // Dungeon map
    'dm.camp': '🗺 Voyager',
    'dm.quests': '📜 Quêtes',
    'dm.carnet': '🔍 Enquête',
    // Misc
    'misc.close': 'Fermer',
    'misc.ok': 'OK',
    'misc.cancel': 'Annuler',
    'misc.available': 'Disponible',
    'misc.loading': 'Chargement...',
    'misc.wind': 'Tout a été nettoyé ici.\n\nIl ne reste plus que le bruit du vent.',
    // Combat extra
    'combat.floor': 'Étage',
    'combat.enemy_turn': 'Tour de l\'ennemi…',
    // Gameover
    'go.defeated': 'DÉFAITE',
    'go.victory': 'VICTOIRE !',
    'go.floor': 'Étage atteint',
    'go.gold': 'Or récupéré',
    'go.kills': 'Ennemis vaincus',
    'go.continue': 'Continuer l\'aventure',
    'go.menu': 'Menu principal',
    // Dungeon map nodes
    'dm.floor': 'Étage',
    'dm.boss': 'Boss',
    'dm.shop': 'Marchand',
    'dm.campfire': 'Camp',
    'dm.mystery': 'Mystère',
    'dm.chest': 'Coffre',
    'dm.passage': 'Passage secret',
    'dm.enter': 'Entrer',
    'dm.hint': 'Touche un nœud accessible pour avancer',
    'dm.nodeinfo': 'Choisis ton chemin…',
    // Character creation
    'create.title': 'Créer un aventurier',
    'create.name': 'Nom',
    'create.class': 'Classe',
    'create.race': 'Race',
    'create.confirm': 'Commencer l\'aventure',
    'create.name.placeholder': 'Ton nom…',
    // Hero screen
    'hero.back': 'Retour',
    'hero.title': 'Aventurier',
    'hero.bonuses': 'Bonus permanents',
    'hero.upgrade': 'Améliorer',
    'hero.xp': 'Expérience',
    'hero.atk': 'Attaque',
    'hero.def': 'Défense',
    'hero.hp': 'PV',
    // Shop
    'shop.title': 'Boutique',
    'shop.tab.buy': 'Acheter',
    'shop.tab.sell': 'Vendre',
    'shop.empty': 'Stock épuisé',
    'shop.cantafford': 'Pas assez d\'or',
    'shop.close': 'Fermer',
    // Chest
    'chest.title': 'Coffre',
    'chest.empty': 'Le coffre est vide',
    'chest.store': 'Stocker',
    'chest.retrieve': 'Récupérer',
    // Inn
    'inn.rest.title': 'Se reposer',
    'inn.rest.confirm': 'Se reposer',
    'inn.rest.full': 'Tu es déjà à pleine santé.',
    // Carnet
    'carnet.title': 'Carnet d\'Enquête',
    'carnet.clue1.name': 'Médaillon Brisé',
    'carnet.clue1.loc': 'Forêt des Âmes Perdues',
    'carnet.clue1.text': '"La vérité git là où tout commence."',
    'carnet.clue2.name': 'Carte Fragmentée',
    'carnet.clue2.loc': 'Ruines d\'Astavar',
    'carnet.clue2.text': 'Un cercle tracé à la main… autour d\'un symbole de grotte.',
    'carnet.clue3.name': 'Journal du Marin',
    'carnet.clue3.loc': 'Port des Tempêtes',
    'carnet.clue3.text': '"J\'ai vu la lumière venir des Grottes, au nord."',
    'carnet.unknown': '??? — Indice non découvert',
    'carnet.deduction': 'Ces trois indices convergent vers un même endroit : les Grottes des Ombres. Un passage doit exister dans les profondeurs.',
    // Memory fragments
    'mem.title': 'Fragment de Mémoire',
    // Run modifiers
    'runmod.title': 'Présages du Destin',
    'runmod.sub': 'Les forces occultes ont façonné cette expédition…',
    'runmod.btn': 'Partir à l\'aventure →',
    // Intro traits
    'intro.trait.void': 'Le Vide',
    'intro.trait.cold': 'Le Froid',
    'intro.trait.pain': 'La Douleur',
    // World map region 2
    'wm2.title': 'Les Terres Maudites',
    // Rewarded ads
    'ad.double_gold': '×2 Or',
    'ad.revive': 'Revivre',
    'ad.double_chest': '×2 Coffre',
    'ad.free_item': 'Objet gratuit',
    'ach.unlocked': 'Débloqué',
    'ach.toast.congrats': 'Félicitations !',
    'ach.locked': 'Verrouillé',
    'quest.done': 'Tu as accompli ce qui t\'était demandé.',
    // Rewarded ad result popups
    'adres.gold.title': 'Or doublé !',
    'adres.gold.body': '×2 ! Vous recevez {n} pièces supplémentaires !',
    'adres.revive.title': 'Résurrection !',
    'adres.revive.body': 'Vous revenez à la vie avec {n} PV !',
    'adres.chest.title': 'Coffre Doublé !',
    'adres.chest.body': '×2 ! +{n} 🪙 et un objet bonus ajouté à l\'inventaire !',
    'adres.free.title': 'Prochain achat gratuit !',
    'adres.free.body': 'Le prochain objet acheté en boutique sera remboursé automatiquement.',
    // Rewarded ad buttons
    'adbtn.revive': '📺 Regarder une pub → Revenir avec 30% HP',
    'adbtn.doublegold': '📺 Pub → ×2 Or gagné',
    'adbtn.chest': '📺 Pub → Coffre Bonus (or + objet)',
    'adbtn.refund': '📺 Pub → Rembourser ce dernier achat',
    // Reset / delete
    'reset.confirm.title': 'Réinitialiser tout ?',
    'reset.confirm.body': 'Tous les aventuriers, méta-progression, donjons nettoyés seront supprimés. Cette action est irréversible.',
    'reset.done.title': 'Réinitialisation',
    'reset.done.body': 'Tout a été réinitialisé. Bonne aventure !',
    'delhero.confirm.title': 'Supprimer ?',
    'delhero.confirm.body': 'Supprimer cet aventurier ? Cette action est irréversible.',
    // Export / import code
    'code.error.title': 'Erreur',
    'code.export.fail': 'Impossible d\'exporter ce profil.',
    'code.export.title': '📤 Code de sauvegarde',
    'code.export.sub': 'Copie ce code et partage-le. Il suffit de le coller dans "Importer" sur un autre appareil.',
    'code.import.title': '↓ Importer un aventurier',
    'code.import.sub': 'Colle ici le code de sauvegarde reçu depuis un autre appareil.',
    'code.copied.title': 'Copié !',
    'code.copied.body': 'Code copié dans le presse-papier.',
    'code.copied.body2': 'Code copié avec succès.',
    'code.copymanual.title': 'Copie manuelle',
    'code.copymanual.body': 'Sélectionne tout le texte ci-dessus et copie-le manuellement.',
    'code.empty.title': 'Champ vide',
    'code.empty.body': 'Colle un code d\'abord !',
    'code.invalid.body': 'Code invalide ou corrompu.',
    'code.imported.title': 'Importé !',
    'code.imported.body': 'Aventurier "{n}" importé avec succès !',
    'code.textarea.ph': 'Colle ton code ici...',
    'code.btn.copy': '📋 Copier le code',
    'code.btn.import': '✓ Importer',
    'code.btn.close': 'Fermer',
    // Level-up overlay
    'levelup.title': '✦ Montée de Niveau ✦',
    'levelup.level': 'Niveau',
    'levelup.sub': 'Choisis ton amélioration',
    // Travel cards
    'travel.ruins.name': 'Ruines Maudites',
    'travel.ruins.desc': 'Difficile · Ennemis d\'élite, trésors rares',
    // Misc UI
    'quest.accepted': 'Quête acceptée. Bonne chance.',
    'loot.tobag': 'Mis dans le sac',
    'loot.none.name': 'Aucun butin',
    'loot.none.desc': 'L\'ennemi n\'avait rien de valeur...',
    'misc.pickup_arrow': 'Récupérer →',
    'misc.continue': 'Continuer',
    'equip.empty': 'Aucun(e)',
    'warn.enter.title': 'Attention, Aventurier',
    'warn.enter.ok': 'Entrer quand même',
    'warn.enter.cancel': 'Reculer',
    'warn.zone.locked': '⚠ Zone non recommandée pour ton niveau de progression.',
    'warn.zone.level': '💀 Niveau conseillé : {rec} (tu es niveau {lvl}).',
  },
  en: {
    // Main menu
    'menu.play': 'Play',
    'menu.achievements': 'Achievements',
    'menu.settings': '⚙ Settings',
    'menu.signin': 'Sign in with Google',
    // Settings
    'settings.title': 'Settings',
    'settings.music': 'Music',
    'settings.music.sub': 'Menu, dungeon and combat ambience',
    'settings.sfx': 'Sound Effects',
    'settings.sfx.sub': 'Combat and interface sounds',
    'settings.vibration': 'Vibrations',
    'settings.vibration.sub': 'Haptic feedback on mobile',
    'settings.particles': 'Particles',
    'settings.particles.sub': 'Embers in the background',
    'settings.language': 'Language / Langue',
    'settings.language.sub': 'English · Français',
    'settings.reset': '⚠ Reset progress',
    // Profiles
    'profiles.title': 'My Adventurers',
    'profiles.subtitle': 'Choose your hero or create a new one',
    'profiles.new': '＋ Create an adventurer',
    'profiles.import': '↓ Import a save code',
    // HUD
    'hud.floor': 'Floor',
    'hud.level': 'Lv.',
    'hud.potions': 'Potions',
    // Modal
    'modal.ok': 'Got it',
    'modal.confirm': 'Confirm',
    'modal.cancel': 'Cancel',
    // Inn
    'inn.fullhp': 'You are already at full health!',
    'inn.needgold': 'You need {n} 🪙 to rest for the night.',
    'inn.rested': '✨ Rest (15 🪙) — +{n} HP. Full health!',
    'inn.rested.status': '✨ Rest (15 🪙) — Healed! Statuses cleared.',
    // Profile card
    'profile.level': 'Level',
    'profile.lastplayed': 'Last played:',
    // Combat
    'combat.attack': 'Attack',
    'combat.defend': 'Defend',
    'combat.skill': 'Skill',
    'combat.potion': 'Potion',
    'combat.bag': 'Bag',
    'combat.flee': 'Flee (risky)',
    'combat.choosespell': 'CHOOSE A SPELL',
    'combat.useitem': 'USE AN ITEM',
    'combat.continue': 'Continue',
    'combat.victory': 'Victory!',
    'combat.defeat': 'Defeat',
    // Combat log (fixed lines)
    'cl.tooslow': '⏰ Too slow! The monster takes advantage of your sluggishness...',
    'cl.stunned': 'You are stunned and lose your turn!',
    'cl.dodge': '💨 You dodge the attack!',
    'cl.defend': 'You raise your guard. (-50% damage this turn)',
    'cl.ragebonus': '🟠 Orcish rage! ATK ×1.5',
    'cl.nomana': 'Out of mana!',
    'cl.notenoughmana': 'Not enough mana!',
    'cl.shieldskill': 'Iron shield! (+8 DEF)',
    'cl.nopotions': 'No potions left!',
    'cl.confusion': '🔮 Confusion! The enemy loses its turn.',
    'cl.flee': 'You flee into the darkness!',
    'cl.fleefail': 'Your escape failed!',
    // Loot
    'loot.title': 'Victory!',
    'loot.sub': 'Enemy defeated',
    'loot.gold': 'Gold gained',
    // Gameover
    'go.title': 'Defeat',
    'go.inn': '🏠 Back to the inn',
    'menu.main': 'Main menu',
    // Rest screen
    'rest.title': 'Campfire',
    'rest.desc': 'You find a precarious shelter in the darkness. The fire crackles softly.',
    'rest.btn': 'Rest →',
    'rest.camp.title': 'Campfire',
    'rest.camp.desc': 'You find a precarious shelter in the darkness. The fire crackles softly.',
    'rest.camp.btn': 'Rest →',
    'rest.mystery.title': 'Mysterious Room',
    'rest.mystery.btn': 'Continue →',
    'rest.trap.title': 'Trap!',
    'rest.trap.desc': 'You trigger a hidden mechanism. Blades shoot from the walls!',
    'rest.trap.btn': 'Face the enemy →',
    'shop.inv.full': 'Inventory full',
    'shop.inv.full.buy': 'Equip or sell an item before buying a new one.',
    'shop.inv.full.unequip': 'Free up a slot in your bag before unequipping this item.',
    'shop.inv.full.limit': 'You cannot carry more than 8 items.',
    'shop.free.title': 'Free Purchase!',
    'shop.free.desc': 'This purchase is refunded thanks to your ad!',
    'shop.free.refund': 'Your last purchase is refunded! +{n} 🪙',
    'ads.title': 'Advertisement',
    'ads.body': 'An ad will be shown. Confirm to receive your reward.',
    'ads.watch': 'Watch ad',
    'camp.title': '🔥 Campfire',
    'camp.desc': 'A hand-made campfire crackles just before the boss door.\n\nYou can rest for free to recover 75% of your HP, or continue right away.',
    'camp.rest': 'Rest (+75% HP)',
    'camp.continue': 'Continue →',
    'camp.rested': 'You rested by the fire. +{n} HP recovered.\n\nThe boss door awaits.',
    'tuto.map.title': '🗺 The dungeon map',
    'tuto.map.body': 'Tap a highlighted node to advance.\n\nRooms are hidden: ⚔ enemy, 🔥 rest, 🛒 shop, ❓ mystery, ⚠ trap.\nA 🔥 campfire always appears right before the ☠ boss.\n\nChoose your path wisely — every node counts!',
    'tuto.combat.title': '⚔ Combat',
    'tuto.combat.body': 'On your turn, choose an action:\n\n⚔ Attack — deal damage.\n🛡 Defend — reduce the next hit.\n✨ Skill — your class\'s special power.\n🧪 Potion — restore HP.\n🎒 Bag — use an item.\n🏃 Flee — try to leave the fight (risky).',
    'passage.label': 'HIDDEN PASSAGE',
    'passage.sub': 'The far wall has always been there.',
    'passage.text': 'You\'ve been here before. Dozens of times perhaps.\n\nBut today something has changed.\n\nThe far stone vibrates slightly. A crack. A finger\'s width long.\n\nYou touch it.\n\nAnd the wall opens.',
    // Misc
    'misc.continue_arrow': 'Continue →',
    // Town
    'town.title': 'Thornwall',
    'town.inn': '🛏 Inn',
    'town.forge': '⚒ Forge',
    'town.armurerie': '🛡 Armoury',
    'town.couturier': '🧵 Tailor',
    'town.bijoutier': '💍 Jeweller',
    'town.temple': '⛪ Church · Shop',
    'town.guild': 'Guild',
    'town.adventure': '⚔ Go adventuring',
    'town.chateau': '🏰 Castle',
    'town.taverne': '🍺 Tavern',
    // Inn
    'inn.window': 'Go adventuring',
    'inn.equip': 'Equipment',
    'inn.chest': 'Chest',
    'inn.rest': 'Rest (15 🪙)',
    'inn.town': 'Go to town',
    // World map
    'wm.title': 'The Region',
    'wm.back': 'Back',
    // Travel
    'travel.title': 'World Map',
    'travel.floor': 'Floor',
    'travel.sec.rest': 'Rest & Healing',
    'travel.sec.trade': 'Trade',
    'travel.sec.dungeons': 'Other Dungeons',
    'travel.town.name': 'Village of Thornwall',
    'travel.town.desc': 'Merchants, blacksmith and inn — spend your gold wisely',
    'travel.town.badge': 'Shop',
    'travel.cave.name': 'Bat Cave',
    'travel.cave.desc': 'Easy · Weak enemies, good gold for beginners',
    'travel.cave.badge': 'Lv. 1–2',
    'travel.ruins.badge': 'Lv. 3+',
    'travel.abyss.name': 'The Bottomless Abyss',
    'travel.abyss.desc': 'Extreme · For legendary heroes only',
    'travel.camp': 'Camp',
    'travel.camp.desc': 'Light a fire and recover 35% HP',
    'travel.free': 'Free',
    // Zones
    'zone.grottes': 'Shadow Caves',
    'zone.foret': 'Forest of Lost Souls',
    'zone.ruines': 'Ruins of Astavar',
    'zone.port': 'Storm Harbour',
    'zone.marais': 'Vaelthar Marshes',
    'zone.pics': 'Peaks of the Void',
    'zone.volcan': 'Caldera of Aszgol',
    'zone.cryptes': 'The Eternal Crypts',
    'zone.chateau_maudit': 'The Cursed Castle',
    'zone.cite_oubliee': 'The Forgotten City',
    'zone.gouffre_astral': 'The Astral Chasm',
    'zone.cryptes_profondes': 'The Deep Crypts',
    // Hero screen
    'hero.level': 'Level',
    'hero.class': 'Class',
    'hero.race': 'Race',
    'hero.rank': 'Social Rank',
    'hero.stats': 'Stats',
    'hero.equip': 'Equipment',
    // Ranks
    'rank.0': 'Unknown',
    'rank.1': 'Known',
    'rank.2': 'Respected',
    'rank.3': 'Honoured',
    'rank.4': 'Legendary',
    // Shop
    'shop.buy': 'Buy',
    'shop.sell': 'Sell',
    'shop.close': 'Close',
    // Classes
    'class.guerrier': 'Warrior',
    'class.mage': 'Mage',
    'class.chasseur': 'Hunter',
    'class.assassin': 'Assassin',
    'class.pretre': 'Priest',
    'class.barbare': 'Barbarian',
    // Races
    'race.humain': 'Human',
    'race.elfe': 'Elf',
    'race.nain': 'Dwarf',
    'race.orc': 'Orc',
    // Taverne
    'taverne.title': 'The Lyonnesse',
    // NPC names
    'npc.bertrand': 'Bertrand',
    'npc.oswin': 'Oswin',
    'npc.seraphine': 'Séraphine',
    'npc.marta': 'Marta',
    'npc.aldric': 'Captain Aldric',
    'npc.elise': 'Sister Elise',
    // Quest UI
    'quest.accept': 'Accept quest',
    'quest.claim': 'Claim reward',
    'quest.close': 'Close',
    'quest.inprogress': 'In progress: ',
    'quest.reward': 'Reward: ',
    'final.prompt': '— You hold Séraphine\'s crystal. Before you, the altar. Beneath it, the seal. And the voice of the God of Memory, patient.\n\n"You already know what you came to do. Choose."',
    'final.gardien': '🛡 Place the crystal on the altar — reinforce the seal',
    'final.liberateur': '🗝 Shatter the crystal — free what sleeps',
    'final.vide': '💀 Shatter the crystal — let everything collapse',
    // Gameover
    'go.victory': 'VICTORY!',
    'go.floor': 'Floor reached',
    'go.gold': 'Gold collected',
    'go.kills': 'Enemies slain',
    'go.continue': 'Continue the adventure',
    // Achievements screen
    'ach.title': 'Achievements',
    'ach.close': 'Close',
    // Dungeon map
    'dm.camp': '🗺 Travel',
    'dm.quests': '📜 Quests',
    'dm.carnet': '🔍 Journal',
    // Misc
    'misc.close': 'Close',
    'misc.ok': 'OK',
    'misc.cancel': 'Cancel',
    'misc.available': 'Available',
    'misc.loading': 'Loading...',
    'misc.wind': 'Everything here has been cleared.\n\nNothing remains but the sound of the wind.',
    // Combat extra
    'combat.floor': 'Floor',
    'combat.enemy_turn': 'Enemy turn…',
    // Gameover
    'go.defeated': 'DEFEAT',
    'go.victory': 'VICTORY!',
    'go.floor': 'Floor reached',
    'go.gold': 'Gold collected',
    'go.kills': 'Enemies slain',
    'go.continue': 'Continue the adventure',
    'go.menu': 'Main menu',
    // Dungeon map nodes
    'dm.floor': 'Floor',
    'dm.boss': 'Boss',
    'dm.shop': 'Merchant',
    'dm.campfire': 'Camp',
    'dm.mystery': 'Mystery',
    'dm.chest': 'Chest',
    'dm.passage': 'Secret passage',
    'dm.enter': 'Enter',
    'dm.hint': 'Tap an available node to advance',
    'dm.nodeinfo': 'Choose your path…',
    // Character creation
    'create.title': 'Create an adventurer',
    'create.name': 'Name',
    'create.class': 'Class',
    'create.race': 'Race',
    'create.confirm': 'Begin the adventure',
    'create.name.placeholder': 'Your name…',
    // Hero screen
    'hero.back': 'Back',
    'hero.title': 'Adventurer',
    'hero.bonuses': 'Permanent bonuses',
    'hero.upgrade': 'Upgrade',
    'hero.xp': 'Experience',
    'hero.atk': 'Attack',
    'hero.def': 'Defence',
    'hero.hp': 'HP',
    // Shop
    'shop.title': 'Shop',
    'shop.tab.buy': 'Buy',
    'shop.tab.sell': 'Sell',
    'shop.empty': 'Out of stock',
    'shop.cantafford': 'Not enough gold',
    'shop.close': 'Close',
    // Chest
    'chest.title': 'Chest',
    'chest.empty': 'The chest is empty',
    'chest.store': 'Store',
    'chest.retrieve': 'Retrieve',
    // Inn
    'inn.rest.title': 'Rest',
    'inn.rest.confirm': 'Rest',
    'inn.rest.full': 'You are already at full health.',
    // Carnet
    'carnet.title': 'Investigation Journal',
    'carnet.clue1.name': 'Broken Medallion',
    'carnet.clue1.loc': 'Forest of Lost Souls',
    'carnet.clue1.text': '"The truth lies where all things begin."',
    'carnet.clue2.name': 'Fragmented Map',
    'carnet.clue2.loc': 'Ruins of Astavar',
    'carnet.clue2.text': 'A hand-drawn circle… around a cave symbol.',
    'carnet.clue3.name': 'Sailor\'s Journal',
    'carnet.clue3.loc': 'Storm Harbour',
    'carnet.clue3.text': '"I saw light coming from the Caves, to the north."',
    'carnet.unknown': '??? — Clue not yet found',
    'carnet.deduction': 'These three clues point to one place: the Shadow Caves. A passage must exist somewhere in the depths.',
    // Memory fragments
    'mem.title': 'Memory Fragment',
    // Run modifiers
    'runmod.title': 'Omens of Fate',
    'runmod.sub': 'Occult forces have shaped this expedition…',
    'runmod.btn': 'Begin the adventure →',
    // Intro traits
    'intro.trait.void': 'The Void',
    'intro.trait.cold': 'The Cold',
    'intro.trait.pain': 'The Pain',
    // World map region 2
    'wm2.title': 'The Cursed Lands',
    // Rewarded ads
    'ad.double_gold': '×2 Gold',
    'ad.revive': 'Revive',
    'ad.double_chest': '×2 Chest',
    'ad.free_item': 'Free Item',
    'ach.unlocked': 'Unlocked',
    'ach.toast.congrats': 'Congratulations!',
    'ach.locked': 'Locked',
    'quest.done': 'You\'ve accomplished what was asked of you.',
    // Rewarded ad result popups
    'adres.gold.title': 'Gold Doubled!',
    'adres.gold.body': '×2! You receive {n} extra coins!',
    'adres.revive.title': 'Resurrection!',
    'adres.revive.body': 'You return to life with {n} HP!',
    'adres.chest.title': 'Chest Doubled!',
    'adres.chest.body': '×2! +{n} 🪙 and a bonus item added to your inventory!',
    'adres.free.title': 'Next Purchase Free!',
    'adres.free.body': 'The next item bought in the shop will be refunded automatically.',
    // Rewarded ad buttons
    'adbtn.revive': '📺 Watch an ad → Return with 30% HP',
    'adbtn.doublegold': '📺 Ad → ×2 Gold earned',
    'adbtn.chest': '📺 Ad → Bonus Chest (gold + item)',
    'adbtn.refund': '📺 Ad → Refund this last purchase',
    // Reset / delete
    'reset.confirm.title': 'Reset everything?',
    'reset.confirm.body': 'All adventurers, meta-progression and cleared dungeons will be deleted. This action is irreversible.',
    'reset.done.title': 'Reset',
    'reset.done.body': 'Everything has been reset. Good adventure!',
    'delhero.confirm.title': 'Delete?',
    'delhero.confirm.body': 'Delete this adventurer? This action is irreversible.',
    // Export / import code
    'code.error.title': 'Error',
    'code.export.fail': 'Unable to export this profile.',
    'code.export.title': '📤 Save Code',
    'code.export.sub': 'Copy this code and share it. Just paste it into "Import" on another device.',
    'code.import.title': '↓ Import an adventurer',
    'code.import.sub': 'Paste the save code received from another device here.',
    'code.copied.title': 'Copied!',
    'code.copied.body': 'Code copied to clipboard.',
    'code.copied.body2': 'Code copied successfully.',
    'code.copymanual.title': 'Manual copy',
    'code.copymanual.body': 'Select all the text above and copy it manually.',
    'code.empty.title': 'Empty field',
    'code.empty.body': 'Paste a code first!',
    'code.invalid.body': 'Invalid or corrupted code.',
    'code.imported.title': 'Imported!',
    'code.imported.body': 'Adventurer "{n}" imported successfully!',
    'code.textarea.ph': 'Paste your code here...',
    'code.btn.copy': '📋 Copy the code',
    'code.btn.import': '✓ Import',
    'code.btn.close': 'Close',
    // Level-up overlay
    'levelup.title': '✦ Level Up ✦',
    'levelup.level': 'Level',
    'levelup.sub': 'Choose your upgrade',
    // Travel cards
    'travel.ruins.name': 'Cursed Ruins',
    'travel.ruins.desc': 'Hard · Elite enemies, rare treasures',
    // Misc UI
    'quest.accepted': 'Quest accepted. Good luck.',
    'loot.tobag': 'Put in the bag',
    'loot.none.name': 'No loot',
    'loot.none.desc': 'The enemy had nothing of value...',
    'misc.pickup_arrow': 'Pick up →',
    'misc.continue': 'Continue',
    'equip.empty': 'None',
    'warn.enter.title': 'Beware, Adventurer',
    'warn.enter.ok': 'Enter anyway',
    'warn.enter.cancel': 'Back off',
    'warn.zone.locked': '⚠ Zone not recommended for your progression level.',
    'warn.zone.level': '💀 Recommended level: {rec} (you are level {lvl}).',
  }
};

var LangSystem = {
  t: function(key) {
    var s = STRINGS[CGE_LANG] || STRINGS['fr'];
    return s[key] || STRINGS['fr'][key] || key;
  },
  set: function(lang) {
    CGE_LANG = lang;
    localStorage.setItem('cge_lang', lang);
    LangSystem.applyAll();
    Nav.go('main-menu');
  },
  applyAll: function() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = LangSystem.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.placeholder = LangSystem.t(el.getAttribute('data-i18n-placeholder'));
    });
  }
};

function T(key) { return LangSystem.t(key); }

// ── NAVIGATION ────────────────────────────────────────────────────
var screens = {};
document.querySelectorAll('.screen').forEach(function(s){ screens[s.id]=s; });

var Nav = {
  current: null,
  go: function(id, skipFade) {
    var prev = Nav.current;
    if (prev === id) return;
    Nav.current = id;
    if (typeof HUD !== 'undefined') { HUD.update(id); HUD.updateGold(); }
    // Auto-save à chaque changement d'écran si un run est actif
    var menuScreens = {'main-menu':1,'title-screen':1,'char-select':1,'profiles-screen':1,'gameover-screen':1,'story-intro':1};
    if (!menuScreens[id] && typeof State !== 'undefined' && State.hp && typeof State.saveRun === 'function') {
      State.saveRun();
    }
    if (prev && typeof Sfx !== 'undefined') Sfx.nav();
    // Musique selon l'écran
    if (typeof Music !== 'undefined') {
      if (id==='combat-screen') Music.play('combat');
      else if (id==='dungeon-map') Music.play('dungeon');
      else if (id==='inn-room') Music.play('menu');
      else if (id==='world-map') { Music.play('dungeon'); if (typeof WorldMap !== 'undefined') WorldMap.updateHotspots(); }
      else if (id==='world-map-2') { Music.play('dungeon'); }
      else if (id==='main-menu'||id==='char-select'||id==='profiles-screen'||id==='title-screen'||id==='story-intro') Music.stop();
      else if (id==='gameover-screen') Music.stop();
    }
    // Stop dungeon map RAF when leaving that screen
    if (prev === 'dungeon-map' && id !== 'dungeon-map' && typeof DungeonMap !== 'undefined') {
      DungeonMap._rafRunning = false;
    }
    if (prev && screens[prev]) {
      var el = screens[prev];
      el.style.transition = 'opacity 0.2s ease';
      el.style.opacity = '0';
      setTimeout(function(){ el.classList.remove('active'); el.style.opacity=''; el.style.transition=''; }, 200);
    }
    setTimeout(function(){
      var next = screens[id];
      if (!next) return;
      next.style.opacity = '0';
      next.classList.add('active');
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        next.style.transition = 'opacity 0.25s ease';
        next.style.opacity = '1';
        setTimeout(function(){ next.style.transition=''; }, 250);
      });});
      if (typeof LangSystem !== 'undefined') LangSystem.applyAll();
      if (id === 'taverne-screen' && typeof Quests !== 'undefined') Quests.refreshBadges();
      if (id === 'dungeon-map') {
        var dmEl = document.getElementById('dungeon-map');
        if (dmEl) { dmEl.className = dmEl.className.replace(/\bzone-\w+\b/g,'').trim(); if (State._currentZone) dmEl.classList.add('zone-'+State._currentZone); }
        // Relancer le rendu de la carte (figé en quittant l'écran) sans régénérer les nœuds
        if (typeof DungeonMap !== 'undefined' && DungeonMap.resume) DungeonMap.resume();
      }
      // hero-screen = équipement + guilde combinés : toujours rafraîchir les DEUX
      // (sinon entrer par la guilde affichait un équipement vide / périmé).
      if (id === 'hero-screen') {
        if (typeof EquipScreen !== 'undefined' && EquipScreen.refresh) EquipScreen.refresh();
        if (typeof Meta !== 'undefined' && Meta.buildScreen) Meta.buildScreen();
      }
      if (typeof Embers !== 'undefined') {
        if (id==='dungeon-map'||id==='inn-room'||id==='combat-screen') Embers.startFor(id);
        else Embers.stop();
      }
    }, prev ? 150 : 0);
  }
};

// ── PARTICULES ────────────────────────────────────────────────────
var canvas = document.getElementById('particles');
var ctx = canvas.getContext('2d');
var pts = [];
function resizeCanvas(){ var s=document.getElementById('phone-screen'); canvas.width=s.offsetWidth; canvas.height=s.offsetHeight; }
resizeCanvas(); window.addEventListener('resize', resizeCanvas);
function mkP(){ return { x:Math.random()*canvas.width, y:canvas.height+8, vx:(Math.random()-0.5)*0.35, vy:-(0.35+Math.random()*0.6), life:0, maxLife:130+Math.random()*160, r:0.8+Math.random()*1.3, hue:22+Math.random()*18 }; }
function tick(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(pts.length<22) pts.push(mkP());
  pts=pts.filter(function(p){ return p.life<p.maxLife; });
  pts.forEach(function(p){
    p.life++; p.x+=p.vx+Math.sin(p.life*0.045)*0.25; p.y+=p.vy;
    var prog=p.life/p.maxLife;
    var a=(prog<0.2?prog/0.2:prog>0.7?1-(prog-0.7)/0.3:1)*0.5;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='hsla('+p.hue+',90%,65%,'+a+')'; ctx.fill();
  });
  requestAnimationFrame(tick);
}

// ── CHARACTER SELECT ──────────────────────────────────────────────
function buildCharSelect() {
  // Races
  var rg = document.getElementById('race-grid');
  rg.innerHTML = '';
  RACES.forEach(function(r) {
    var card = document.createElement('div');
    card.className = 'race-card' + (State.race === r.id ? ' selected' : '');
    card.dataset.id = r.id;
    card.innerHTML =
      '<span class="race-icon">'+r.icon+'</span>' +
      '<div class="race-name">'+(CGE_LANG==='en'&&r.nameEn?r.nameEn:r.name)+'</div>' +
      '<div class="race-sub">'+(CGE_LANG==='en'&&r.subEn?r.subEn:r.sub)+'</div>' +
      '<div class="race-bonus">'+(CGE_LANG==='en'&&r.bonusEn?r.bonusEn:r.bonus)+'</div>';
    card.addEventListener('click', function(){ selectRace(r.id); });
    rg.appendChild(card);
  });

  // Classes
  var cg = document.getElementById('class-grid');
  cg.innerHTML = '';
  CLASSES.forEach(function(c) {
    var card = document.createElement('div');
    card.className = 'class-card' + (State.cls === c.id ? ' selected' : '');
    card.dataset.id = c.id;
    card.innerHTML =
      '<span class="class-icon">'+c.icon+'</span>' +
      '<div class="class-name">'+(CGE_LANG==='en'&&c.nameEn?c.nameEn:c.name)+'</div>' +
      '<div class="class-sub">'+(CGE_LANG==='en'&&c.subEn?c.subEn:c.sub)+'</div>';
    card.addEventListener('click', function(){ selectClass(c.id); });
    cg.appendChild(card);
  });

  updateStats();
}

function selectRace(id) {
  State.race = id;
  document.querySelectorAll('.race-card').forEach(function(c){
    c.classList.toggle('selected', c.dataset.id === id);
  });
  updateStats();
}

function selectClass(id) {
  State.cls = id;
  document.querySelectorAll('.class-card').forEach(function(c){
    c.classList.toggle('selected', c.dataset.id === id);
  });
  updateStats();
}

function updateStats() {
  var r = RACES.find(function(x){ return x.id===State.race; }) || RACES[0];
  var c = CLASSES.find(function(x){ return x.id===State.cls; }) || CLASSES[0];
  document.getElementById('stat-hp').textContent  = c.hp  + r.dhp;
  document.getElementById('stat-atk').textContent = c.atk + r.datk;
  document.getElementById('stat-def').textContent = c.def + r.ddef;
  document.getElementById('stat-spe').textContent = (CGE_LANG==='en'&&c.speEn?c.speEn:c.spe);
  // Couleur selon bonus/malus race
  ['stat-atk','stat-def'].forEach(function(sid){
    var el = document.getElementById(sid);
    el.className = 'stat-value';
    var v = parseInt(el.textContent);
    var base = sid==='stat-atk' ? c.atk : c.def;
    if (v > base) el.classList.add('up');
    else if (v < base) el.classList.add('down');
  });
}

// ── ENNEMIS ───────────────────────────────────────────────────────
// zones: tableau des zones où cet ennemi peut apparaître (vide = toutes)
var ENEMIES = [
  // ── Grottes des Ombres ──────────────────────────────────────────
  { name:'Squelette', nameEn:'Skeleton',            sprite:'💀', hp:60,  atk:14, def:4,  gold:14, xp:18, floor:1, zones:['grottes'] },
  { name:'Slime Corrosif', nameEn:'Corrosive Slime',       sprite:'🟢', hp:50,  atk:12, def:1,  gold:10, xp:12, floor:1, zones:['grottes'] },
  { name:'Gobelin Sauvage', nameEn:'Wild Goblin',      sprite:'👺', hp:65,  atk:16, def:5,  gold:18, xp:22, floor:1, zones:['grottes'] },
  { name:'Chauve-Souris Géante', nameEn:'Giant Bat', sprite:'🦇', hp:55,  atk:15, def:2,  gold:12, xp:15, floor:1, zones:['grottes'] },
  { name:'Rat des Abysses', nameEn:'Abyss Rat',      sprite:'🐀', hp:45,  atk:18, def:0,  gold:8,  xp:10, floor:1, zones:['grottes'] },
  { name:'Golem de Boue', nameEn:'Mud Golem',        sprite:'🪨', hp:90,  atk:16, def:8,  gold:22, xp:28, floor:2, zones:['grottes'] },
  { name:'Orc de Caverne', nameEn:'Cave Orc',       sprite:'👹', hp:100, atk:20, def:7,  gold:26, xp:32, floor:3, zones:['grottes'] },
  { name:'Gardien des Grottes', nameEn:'Cave Guardian',  sprite:'💀', hp:55,  atk:10, def:5,  gold:120,xp:150,floor:4, boss:true, zones:['grottes'] },

  // ── Forêt des Âmes Perdues ──────────────────────────────────────
  { name:'Loup Fantôme', nameEn:'Ghost Wolf',         sprite:'🐺', hp:80,  atk:18, def:5,  gold:22, xp:28, floor:1, zones:['foret'] },
  { name:'Dryade Corrompue', nameEn:'Corrupted Dryad',     sprite:'🌿', hp:70,  atk:20, def:3,  gold:20, xp:25, floor:1, zones:['foret'] },
  { name:'Araignée Géante', nameEn:'Giant Spider',      sprite:'🕷', hp:90,  atk:22, def:6,  gold:28, xp:35, floor:2, zones:['foret'], poison:true },
  { name:'Esprit de la Forêt', nameEn:'Forest Spirit',   sprite:'👻', hp:85,  atk:25, def:4,  gold:30, xp:38, floor:2, zones:['foret'] },
  { name:'Ours Maudit', nameEn:'Cursed Bear',          sprite:'🐻', hp:120, atk:22, def:10, gold:35, xp:45, floor:3, zones:['foret'] },
  { name:'Chasseur de Primes', nameEn:'Bounty Hunter',   sprite:'🏹', hp:95,  atk:28, def:6,  gold:38, xp:48, floor:3, zones:['foret'] },
  { name:'Seigneur de la Forêt', nameEn:'Forest Lord', sprite:'🌳', hp:250, atk:32, def:14, gold:180,xp:200,floor:5, boss:true, zones:['foret'] },

  // ── Ruines d'Astavar ────────────────────────────────────────────
  { name:'Fantôme Affamé', nameEn:'Hungry Ghost',       sprite:'👻', hp:80,  atk:20, def:8,  gold:25, xp:32, floor:1, zones:['ruines'] },
  { name:'Golem de Pierre', nameEn:'Stone Golem',      sprite:'🗿', hp:140, atk:22, def:14, gold:40, xp:50, floor:2, zones:['ruines'] },
  { name:'Nécromant', nameEn:'Necromancer',            sprite:'🧙', hp:110, atk:30, def:5,  gold:50, xp:62, floor:2, zones:['ruines'] },
  { name:'Guerrier Ancien', nameEn:'Ancient Warrior',      sprite:'⚔',  hp:130, atk:26, def:12, gold:45, xp:55, floor:3, zones:['ruines'] },
  { name:'Sphinge Brisée', nameEn:'Broken Sphinx',       sprite:'🦁', hp:150, atk:28, def:10, gold:55, xp:70, floor:4, zones:['ruines'] },
  { name:'Lich Mineure', nameEn:'Minor Lich',         sprite:'💀', hp:300, atk:38, def:15, gold:220,xp:260,floor:5, boss:true, zones:['ruines'] },

  // ── Port des Tempêtes ───────────────────────────────────────────
  { name:'Pirate Maudit', nameEn:'Cursed Pirate',        sprite:'🏴‍☠️',hp:110, atk:26, def:8,  gold:40, xp:50, floor:1, zones:['port'] },
  { name:'Sirène Vengeresse', nameEn:'Vengeful Siren',    sprite:'🧜', hp:100, atk:30, def:5,  gold:45, xp:55, floor:2, zones:['port'] },
  { name:'Kraken Juvénile', nameEn:'Juvenile Kraken',      sprite:'🦑', hp:160, atk:28, def:12, gold:55, xp:68, floor:3, zones:['port'] },
  { name:'Démon des Mers', nameEn:'Sea Demon',       sprite:'😈', hp:130, atk:34, def:10, gold:60, xp:75, floor:3, zones:['port'] },
  { name:'Tempête Incarnée', nameEn:'Living Storm',     sprite:'⛈',  hp:145, atk:32, def:8,  gold:58, xp:72, floor:4, zones:['port'] },
  { name:'Leviathan des Abysses', nameEn:'Abyss Leviathan',sprite:'🌊', hp:380, atk:44, def:18, gold:300,xp:340,floor:5, boss:true, zones:['port'] },

  // ── Pics du Néant ───────────────────────────────────────────────
  { name:'Yéti Déchaîné', nameEn:'Raging Yeti',        sprite:'🏔', hp:160, atk:32, def:14, gold:60, xp:75, floor:1, zones:['pics'] },
  { name:'Griffon de Pierre', nameEn:'Stone Griffon',    sprite:'🦅', hp:140, atk:38, def:10, gold:65, xp:82, floor:2, zones:['pics'] },
  { name:'Géant des Glaces', nameEn:'Ice Giant',     sprite:'❄',  hp:200, atk:35, def:18, gold:75, xp:95, floor:3, zones:['pics'] },
  { name:'Dragon des Pics', nameEn:'Peak Dragon',      sprite:'🐲', hp:180, atk:42, def:12, gold:80, xp:100,floor:4, zones:['pics'] },
  { name:'Ange Déchu', nameEn:'Fallen Angel',           sprite:'👼', hp:220, atk:40, def:15, gold:90, xp:110,floor:4, zones:['pics'] },
  { name:'Seigneur du Néant', nameEn:'Lord of the Void',    sprite:'🌑', hp:500, atk:55, def:22, gold:400,xp:450,floor:6, boss:true, zones:['pics'] },

  // ── Les Cryptes Éternelles ──────────────────────────────────────
  { name:'Vampire Lord', nameEn:'Vampire Lord',         sprite:'🧛', hp:220, atk:44, def:18, gold:90, xp:110,floor:1, zones:['cryptes'] },
  { name:'Ombre Maudite', nameEn:'Cursed Shadow',        sprite:'🌑', hp:200, atk:48, def:12, gold:95, xp:118,floor:2, zones:['cryptes'] },
  { name:'Démon Antique', nameEn:'Ancient Demon',        sprite:'👿', hp:240, atk:46, def:20, gold:100,xp:125,floor:3, zones:['cryptes'] },
  { name:'Spectre Éternel', nameEn:'Eternal Spectre',      sprite:'💀', hp:210, atk:50, def:14, gold:105,xp:130,floor:4, zones:['cryptes'] },
  { name:'Liche Ancienne', nameEn:'Ancient Lich',       sprite:'🧙', hp:280, atk:52, def:18, gold:120,xp:150,floor:4, zones:['cryptes'] },
  { name:'Seigneur des Cryptes', nameEn:'Crypt Lord', sprite:'☠',  hp:400, atk:65, def:28, gold:500,xp:500,floor:6, boss:true, zones:['cryptes'] },
  { name:'Gardien Éternel', nameEn:'Eternal Guardian',      sprite:'⚰',  hp:350, atk:60, def:25, gold:450,xp:460,floor:5, boss:true, zones:['cryptes'] },
  // ── MARAIS DE VAELTHAR (niveau 28-35) ────────────────────────────
  { name:'Crapaud Venimeux', nameEn:'Venomous Toad',     sprite:'🐸', hp:130, atk:28, def:8,  gold:45, xp:55, floor:1, zones:['marais'], poison:true },
  { name:'Sangsue Géante', nameEn:'Giant Leech',       sprite:'🐛', hp:120, atk:30, def:6,  gold:48, xp:60, floor:1, zones:['marais'] },
  { name:'Rôdeur des Brumes', nameEn:'Mist Stalker',    sprite:'👤', hp:145, atk:34, def:10, gold:55, xp:68, floor:2, zones:['marais'] },
  { name:'Crocodile Maudit', nameEn:'Cursed Crocodile',     sprite:'🐊', hp:170, atk:32, def:14, gold:58, xp:72, floor:2, zones:['marais'] },
  { name:'Sorcière des Marais', nameEn:'Swamp Witch',  sprite:'🧙', hp:155, atk:38, def:8,  gold:65, xp:80, floor:3, zones:['marais'], poison:true },
  { name:'Noyé Éternel', nameEn:'Eternal Drowned',        sprite:'🌊', hp:165, atk:36, def:12, gold:62, xp:78, floor:3, zones:['marais'] },
  { name:'Serpent de Boue', nameEn:'Mud Serpent',      sprite:'🐍', hp:180, atk:35, def:10, gold:70, xp:88, floor:4, zones:['marais'], poison:true },
  { name:'Dame des Eaux Noires', nameEn:'Lady of the Black Waters', sprite:'🧜', hp:500, atk:50, def:20, gold:380,xp:420,floor:5, boss:true, zones:['marais'] },
  // ── CALDERA D'ASZGOL (niveau 42-50) ──────────────────────────────
  { name:'Salamandre de Lave', nameEn:'Lava Salamander',   sprite:'🦎', hp:195, atk:42, def:16, gold:80, xp:100,floor:1, zones:['volcan'] },
  { name:'Golem de Pierre Fondue', nameEn:'Molten Stone Golem',sprite:'🪨',hp:220, atk:38, def:24, gold:85, xp:105,floor:2, zones:['volcan'] },
  { name:'Démon Igné', nameEn:'Fire Demon',           sprite:'🔥', hp:200, atk:46, def:14, gold:90, xp:112,floor:2, zones:['volcan'] },
  { name:'Phénix Maudit', nameEn:'Cursed Phoenix',        sprite:'🦅', hp:240, atk:44, def:18, gold:95, xp:120,floor:3, zones:['volcan'] },
  { name:'Wyrm de Cendre', nameEn:'Ash Wyrm',       sprite:'🐉', hp:260, atk:48, def:20, gold:100,xp:125,floor:4, zones:['volcan'] },
  { name:'Cultiste de la Flamme', nameEn:'Flame Cultist',sprite:'🧎', hp:210, atk:52, def:12, gold:105,xp:130,floor:4, zones:['volcan'] },
  { name:'Titan du Volcan', nameEn:'Volcano Titan',      sprite:'🌋', hp:650, atk:70, def:30, gold:500,xp:560,floor:6, boss:true, zones:['volcan'] },
  // ── CHÂTEAU MAUDIT (niveau 55-65) ─────────────────────────────
  { name:'Chevalier Maudit', nameEn:'Cursed Knight',    sprite:'⚔',  hp:300, atk:75, def:35, gold:130,xp:160,floor:1, zones:['chateau_maudit'] },
  { name:'Noble Corrompu', nameEn:'Corrupted Noble',      sprite:'🎩', hp:280, atk:80, def:30, gold:140,xp:175,floor:2, zones:['chateau_maudit'] },
  { name:'Majordome Démoniaque', nameEn:'Demonic Butler',sprite:'🕯', hp:320, atk:72, def:40, gold:135,xp:168,floor:2, zones:['chateau_maudit'] },
  { name:'Armure Animée', nameEn:'Animated Armour',       sprite:'🛡', hp:380, atk:68, def:55, gold:145,xp:180,floor:3, zones:['chateau_maudit'] },
  { name:'Fantôme du Roi', nameEn:'King\'s Ghost',      sprite:'👑', hp:340, atk:85, def:28, gold:150,xp:190,floor:4, zones:['chateau_maudit'] },
  { name:'Reine de Cendres', nameEn:'Ash Queen',    sprite:'🩸', hp:1200,atk:110,def:60, gold:900,xp:1000,floor:7, boss:true, zones:['chateau_maudit'] },
  // ── CITÉ OUBLIÉE (niveau 65-78) ──────────────────────────────
  { name:'Citoyen Pétrifié', nameEn:'Petrified Citizen',   sprite:'🗿', hp:500, atk:95, def:50, gold:180,xp:220,floor:1, zones:['cite_oubliee'] },
  { name:'Juge Ancien', nameEn:'Ancient Judge',         sprite:'⚖', hp:480, atk:100,def:45, gold:190,xp:235,floor:2, zones:['cite_oubliee'] },
  { name:'Sentinelle de Marbre', nameEn:'Marble Sentinel',sprite:'🏛', hp:550, atk:90, def:65, gold:185,xp:228,floor:3, zones:['cite_oubliee'] },
  { name:'Archiviste Corrompu', nameEn:'Corrupted Archivist', sprite:'📜', hp:520, atk:105,def:40, gold:195,xp:242,floor:4, zones:['cite_oubliee'] },
  { name:'Architecte du Vide', nameEn:'Architect of the Void',  sprite:'🌑', hp:2000,atk:140,def:80, gold:1800,xp:2000,floor:8, boss:true, zones:['cite_oubliee'] },
  // ── GOUFFRE ASTRAL (niveau 78-90) ────────────────────────────
  { name:'Écho de Guerrier', nameEn:'Warrior Echo',    sprite:'👤', hp:800, atk:130,def:60, gold:280,xp:340,floor:1, zones:['gouffre_astral'] },
  { name:'Larme de Dieu', nameEn:'Tear of God',       sprite:'💧', hp:750, atk:140,def:50, gold:290,xp:355,floor:2, zones:['gouffre_astral'] },
  { name:'Absence Incarnée', nameEn:'Embodied Absence',    sprite:'🌀', hp:850, atk:135,def:70, gold:285,xp:348,floor:4, zones:['gouffre_astral'] },
  { name:'Phage Mémoriel', nameEn:'Memory Phage',      sprite:'🧠', hp:3500,atk:200,def:120,gold:3000,xp:3500,floor:8, boss:true, zones:['gouffre_astral'] },
  // ── CRYPTES PROFONDES (niveau 90-100) ────────────────────────
  { name:'Gardien du Sceau', nameEn:'Seal Guardian',    sprite:'🔮', hp:1500,atk:200,def:120,gold:500,xp:600,floor:1, zones:['cryptes_profondes'] },
  { name:'Ombre Primordiale', nameEn:'Primordial Shadow',   sprite:'⬛', hp:1600,atk:220,def:100,gold:520,xp:640,floor:3, zones:['cryptes_profondes'] },
  { name:'Éveillé Perdu', nameEn:'Lost Awakened',       sprite:'👁', hp:1800,atk:210,def:130,gold:540,xp:670,floor:5, zones:['cryptes_profondes'] },
  { name:'Fragment de Mémoire', nameEn:'Memory Fragment', sprite:'💎', hp:2000,atk:230,def:140,gold:560,xp:700,floor:7, zones:['cryptes_profondes'] },
  { name:'Le Dieu de la Mémoire', nameEn:'The God of Memory',sprite:'☯', hp:10000,atk:350,def:200,gold:9999,xp:9999,floor:10, boss:true, zones:['cryptes_profondes'] },
];

function getEnemiesForFloor(floor) {
  var zone = State._currentZone;
  // D'abord: ennemis de cette zone jusqu'au floor actuel
  var pool = ENEMIES.filter(function(e){
    return !e.boss && e.floor <= floor &&
           (!e.zones || !e.zones.length || !zone || e.zones.indexOf(zone) >= 0);
  });
  // Fallback: ennemis génériques si pool vide
  if (!pool.length) {
    pool = ENEMIES.filter(function(e){ return !e.boss && e.floor <= floor; });
  }
  if (!pool.length) pool = ENEMIES.slice(0, 5);
  return pool;
}

function getBossForZone(zone, floor) {
  var bosses = ENEMIES.filter(function(e){
    return e.boss && (!e.zones || !e.zones.length || e.zones.indexOf(zone) >= 0);
  });
  // Préfère le boss du floor le plus proche
  bosses.sort(function(a,b){ return Math.abs(a.floor-floor) - Math.abs(b.floor-floor); });
  return bosses[0] || ENEMIES.find(function(e){ return e.boss; });
}

// ── SORTS (Mage & Prêtre) ────────────────────────────────────────
var SPELLS = {
  Mage: [
    { id:'fireball',  ico:'🔥', name:'Boule de Feu',   nameEn:'Fireball',     cost:20, desc:'1.8× ATQ — dégâts de feu',  descEn:'1.8× ATK — fire damage',
      cast:function(enemy){ var d=Math.round(State.atk*1.8); enemy.hp=Math.max(0,enemy.hp-d); return {dmg:d,log:'Boule de feu ! '+d+' dégâts de feu !',logEn:'Fireball! '+d+' fire damage!',crit:true}; } },
    { id:'lightning', ico:'⚡', name:'Éclair',          nameEn:'Lightning',    cost:15, desc:'1.4× ATQ + Étourdi 1 tour',  descEn:'1.4× ATK + Stun 1 turn',
      cast:function(enemy){ var d=Math.round(State.atk*1.4); enemy.hp=Math.max(0,enemy.hp-d); return {dmg:d,log:'Éclair ! '+d+' dégâts + étourdi !',logEn:'Lightning! '+d+' damage + stun!',crit:false,stun:1}; } },
    { id:'blizzard',  ico:'❄', name:'Blizzard',         nameEn:'Blizzard',     cost:32, desc:'2.4× ATQ — dégâts de glace', descEn:'2.4× ATK — ice damage',
      unlockLevel:8,
      cast:function(enemy){ var d=Math.round(State.atk*2.4); enemy.hp=Math.max(0,enemy.hp-d); return {dmg:d,log:'Blizzard ! '+d+' dégâts de glace !',logEn:'Blizzard! '+d+' ice damage!',crit:true}; } },
    { id:'arcane',    ico:'🔮', name:'Tempête Arcane',  nameEn:'Arcane Storm', cost:45, desc:'3.0× ATQ — dégâts purs',    descEn:'3.0× ATK — pure damage',
      unlockLevel:15,
      cast:function(enemy){ var d=Math.round(State.atk*3.0); enemy.hp=Math.max(0,enemy.hp-d); return {dmg:d,log:'Tempête arcane ! '+d+' dégâts purs !',logEn:'Arcane storm! '+d+' pure damage!',crit:true}; } },
  ],
  Prêtre: [
    { id:'heal_sm',   ico:'💚', name:'Soin Léger',      nameEn:'Minor Heal',   cost:12, desc:'Récup 25% PV max',          descEn:'Restore 25% max HP',
      cast:function(){ var h=Math.round(State.hpMax*0.25); State.hp=Math.min(State.hpMax,State.hp+h); return {heal:h,log:'Soin léger ! +'+h+' PV.',logEn:'Minor heal! +'+h+' HP.'}; } },
    { id:'heal_lg',   ico:'💖', name:'Soin Majeur',     nameEn:'Major Heal',   cost:28, desc:'Récup 55% PV max',          descEn:'Restore 55% max HP',
      cast:function(){ var h=Math.round(State.hpMax*0.55); State.hp=Math.min(State.hpMax,State.hp+h); return {heal:h,log:'Soin majeur ! +'+h+' PV !',logEn:'Major heal! +'+h+' HP!'}; } },
    { id:'shield',    ico:'✨', name:'Bouclier Divin',  nameEn:'Divine Shield', cost:18, desc:'+12 DEF pendant 2 tours',  descEn:'+12 DEF for 2 turns',
      cast:function(){ return {log:'Bouclier divin ! +12 DEF pour 2 tours.',logEn:'Divine shield! +12 DEF for 2 turns.',shield:2,shieldDef:12}; } },
    { id:'smite',     ico:'⚡', name:'Jugement',        nameEn:'Judgment',     cost:22, desc:'1.2× ATQ + Brûlure 2 tours', descEn:'1.2× ATK + Burn 2 turns',
      unlockLevel:8,
      cast:function(enemy){ var d=Math.round(State.atk*1.2); enemy.hp=Math.max(0,enemy.hp-d); return {dmg:d,log:'Jugement ! '+d+' dégâts + brûlure !',logEn:'Judgment! '+d+' damage + burn!',burn:2}; } },
  ]
};

// ── COMBAT ────────────────────────────────────────────────────────
var Combat = (function(){
  var enemy = null;
  var playerDef = false;
  var skillCd = 0;
  var turnLocked = false;
  var logLines = [];
  var statuses = []; // { type:'poison'|'burn'|'stun'|'shield', turns, val }
  var enemyStatuses = [];

  function hasMana() { return State.cls === 'Mage' || State.cls === 'Prêtre'; }
  function manaRegen() { return State.cls === 'Mage' ? 12 : State.cls === 'Prêtre' ? 8 : 0; }

  function updateManaBar() {
    var row = document.getElementById('gh-row4');
    if (!row) return;
    if (!hasMana()) { row.classList.remove('show'); return; }
    row.classList.add('show');
    var pct = State.manaMax > 0 ? Math.round((State.mana||0)/State.manaMax*100) : 0;
    var bar = document.getElementById('gh-mana-bar-inner');
    var txt = document.getElementById('gh-mana-text');
    if (bar) bar.style.width = pct+'%';
    if (txt) txt.textContent = (State.mana||0)+'/'+State.manaMax;
  }

  function regenMana() {
    if (!hasMana()) return;
    State.mana = Math.min(State.manaMax, (State.mana||0) + manaRegen());
    updateManaBar();
  }

  function log(msg, type) {
    type = type || 'system';
    logLines.push({ msg:msg, type:type });
    if (logLines.length > 4) logLines.shift();
    var zone = document.getElementById('cb-log-zone');
    zone.innerHTML = '';
    logLines.forEach(function(l) {
      var d = document.createElement('div');
      d.className = 'log-line '+l.type;
      d.textContent = l.msg;
      zone.appendChild(d);
    });
  }

  function updatePlayerUI() {
    if (typeof HUD !== 'undefined') HUD.updateHP();
  }

  function updateEnemyUI() {
    var pct = Math.max(0, Math.min(100, Math.round(enemy.hp/enemy.hpMax*100)));
    document.getElementById('cb-enemy-hp-inner').style.width = pct+'%';
    document.getElementById('cb-enemy-hp-text').textContent = enemy.hp+'/'+enemy.hpMax;
    var bar = document.getElementById('cb-enemy-hp-inner');
    if (pct > 60)      bar.style.background = 'linear-gradient(90deg,#1a6a1a,#2db82d,#50d050)';
    else if (pct > 30) bar.style.background = 'linear-gradient(90deg,#6a6a10,#b8b820,#d0d040)';
    else               bar.style.background = 'linear-gradient(90deg,#6a1a10,#b83020,#d05040)';
  }

  function showHeal(amount) {
    var el = document.getElementById('heal-float');
    if (!el) return;
    el.textContent = '+' + amount;
    el.className = '';
    void el.offsetWidth;
    el.className = 'show';
  }

  function showDmg(amount, isPlayer, isCrit) {
    var el = document.getElementById('dmg-float');
    el.textContent = (isCrit ? '💥 ' : '-') + amount;
    el.style.color = isPlayer ? '#ff6060' : (isCrit ? '#FFD700' : '#ffe060');
    el.className = '';
    void el.offsetWidth;
    el.className = 'show' + (isCrit ? ' crit' : '');
  }

  function hitFlash() {
    var el = document.getElementById('hit-flash');
    el.className = '';
    void el.offsetWidth;
    el.className = 'show';
  }

  function enemyHitAnim() {
    var el = document.getElementById('cb-enemy-sprite');
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
    setTimeout(function(){ el.classList.remove('hit'); }, 400);
  }

  function calcDmg(atk, def, isEnemy) {
    var base = Math.max(1, atk - def);
    // Le bonus de critique du joueur ne s'applique qu'à SES attaques, pas à l'ennemi
    var critChance = isEnemy ? 0.15 : (0.15 + (State.critBonus||0) + ((Meta.bonuses && Meta.bonuses.crit)||0));
    var crit = Math.random() < critChance;
    return { dmg: crit ? Math.round(base*1.5) : base, crit:crit };
  }

  function setButtons(enabled) {
    document.querySelectorAll('.cb-btn').forEach(function(b){
      if (!b.classList.contains('cb-btn-flee')) b.disabled = !enabled;
    });
    if (enabled) startTimer(); else clearTimer();
  }

  function addStatus(list, type, turns, val) {
    var ex = list.find(function(s){ return s.type===type; });
    if (ex) { ex.turns = Math.max(ex.turns, turns); }  // pas de stack : on prolonge seulement
    else {
      list.push({ type:type, turns:turns, val:val||0 });
      // Buff défensif temporaire du joueur : on applique la DEF ici, retirée à l'expiration
      if (list === statuses && (type==='shield' || type==='defend') && val) { State.def += val; }
    }
    renderStatuses();
  }

  function renderStatuses() {
    var row = document.getElementById('cb-status-row');
    row.innerHTML = '';
    statuses.forEach(function(s){
      var d = document.createElement('div');
      d.className = 'status-badge status-'+s.type;
      var icons = { poison:'☠ Poison', burn:'🔥 Brûlure', stun:'⚡ Étourdi', shield:'🛡 Bouclier', defend:'🛡 Garde' };
      d.textContent = (icons[s.type]||s.type)+' ×'+s.turns;
      row.appendChild(d);
    });
  }

  function tickStatuses() {
    // Appliquer et décrémenter
    statuses = statuses.filter(function(s){
      if (s.type==='poison') { var pdmg=s.val; if(getPassive()==='poison_resist') pdmg=Math.ceil(pdmg*0.5); State.hp=Math.max(0,State.hp-pdmg); updatePlayerUI(); log((CGE_LANG==='en'?'☠ Poison: -'+pdmg+' HP'+(pdmg<s.val?' (dwarven resistance)':''):'☠ Poison : -'+pdmg+' PV'+(pdmg<s.val?' (résistance naine)':'')),'enemy'); }
      if (s.type==='burn')   { State.hp=Math.max(0,State.hp-s.val); updatePlayerUI(); log((CGE_LANG==='en'?'🔥 Burn: -'+s.val+' HP':'🔥 Brûlure : -'+s.val+' PV'),'enemy'); }
      s.turns--;
      // Fin d'un buff défensif → on rend la DEF empruntée
      if (s.turns <= 0 && (s.type==='shield' || s.type==='defend') && s.val) { State.def -= s.val; updatePlayerUI(); }
      return s.turns > 0;
    });
    enemyStatuses = enemyStatuses.filter(function(s){
      if (s.type==='poison') { enemy.hp=Math.max(0,enemy.hp-s.val); updateEnemyUI(); log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+' ☠ -'+s.val+(CGE_LANG==='en'?' HP':' PV'),'player'); }
      if (s.type==='burn')   { enemy.hp=Math.max(0,enemy.hp-s.val); updateEnemyUI(); log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+' 🔥 -'+s.val+(CGE_LANG==='en'?' HP':' PV'),'player'); }
      s.turns--;
      return s.turns > 0;
    });
    renderStatuses();
  }

  function updatePotionBtn() {
    var btn = document.getElementById('btn-potion');
    var cnt = document.getElementById('cb-potion-count');
    var n = State.potions||0;
    if (cnt) cnt.textContent = '×'+n;
    if (btn) btn.disabled = (n <= 0);
    if (btn) btn.style.opacity = n <= 0 ? '0.4' : '1';
  }

  function updateSkillBtn() {
    var cd = document.getElementById('skill-cd');
    var btn = document.getElementById('btn-skill');
    if (hasMana()) {
      // Pour Mage/Prêtre : afficher le mana minimum requis
      var spells = (SPELLS[State.cls]||[]).filter(function(s){ return !s.unlockLevel || (State.level||1)>=s.unlockLevel; });
      var minCost = spells.length ? spells.reduce(function(m,s){ return Math.min(m,s.cost); }, 999) : 99;
      var hasMp = (State.mana||0) >= minCost;
      if (cd) cd.textContent = (State.mana||0)+' MP';
      if (btn) btn.disabled = !hasMp;
    } else {
      if (skillCd > 0) {
        if (cd) cd.textContent = skillCd+' tour'+(skillCd>1?'s':'');
        if (btn) btn.disabled = true;
      } else {
        if (cd) cd.textContent = '';
        if (btn) btn.disabled = false;
      }
    }
  }

  // ── COMBAT TIMER ──────────────────────────────────────────────────
  var timerInterval = null;
  var timerSeconds = 5;

  var timerMax = 5;
  function startTimer() {
    clearTimer();
    timerMax = 5 + (Meta.bonuses.timerBonus||0);
    timerSeconds = timerMax;
    updateTimerUI(timerMax);
    timerInterval = setInterval(function() {
      timerSeconds--;
      updateTimerUI(timerSeconds);
      if (timerSeconds <= 0) {
        clearTimer();
        log(T('cl.tooslow'), 'enemy');
        enemyTurn();
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    updateTimerUI(5);
  }

  function updateTimerUI(s) {
    var bar = document.getElementById('cb-timer-bar');
    var txt = document.getElementById('cb-timer-txt');
    if (bar) bar.style.width = Math.max(0, (s/timerMax)*100) + '%';
    if (bar) bar.style.background = s <= 2 ? '#e05050' : s <= 3 ? '#d08020' : '#C9A550';
    if (txt) txt.textContent = Math.max(0, s);
  }

  function endCombat(victory) {
    clearTimer();
    setButtons(false);
    State._inCombat = false;
    // Rendre toute DEF temporaire encore active avant de quitter le combat (sinon fuite permanente)
    statuses.forEach(function(s){ if ((s.type==='shield'||s.type==='defend') && s.val) State.def -= s.val; });
    State.persistentStatuses = statuses.filter(function(s){ return s.type==='poison'||s.type==='burn'; });
    statuses = []; enemyStatuses = []; renderStatuses();
    if (victory) {
      var sprEl = document.getElementById('cb-enemy-sprite');
      if (sprEl) { sprEl.classList.remove('hit'); sprEl.classList.add('dead'); }
      State._lastCombatGold = 0; // or trouvé en donjon, pas en combat
      State._adGoldUsed = false;
      if (typeof HUD !== 'undefined') HUD.updateGold();
      State.kills = (State.kills||0) + 1;
      Meta.totalKills = (Meta.totalKills||0) + 1; // compté à CHAQUE victoire (succès)
      gainXP(enemy.xp||10);
      if (typeof Achievements !== 'undefined') Achievements.check('kill');
      if (Meta.bonuses.regenMeta) {
        State.hp = Math.min(State.hpMax, State.hp + Meta.bonuses.regenMeta);
      }
      if (State.regenPerFight) {
        State.hp = Math.min(State.hpMax, State.hp + State.regenPerFight);
        if (typeof HUD !== 'undefined') HUD.updateHP();
      }
      var wasBoss = !!enemy.boss;
      Sfx.gold();
      setTimeout(function(){
        if (wasBoss) {
          var zd = State._currentZone ? ZONE_DATA[State._currentZone] : null;
          var maxFloor = zd ? zd.floors : 6;
          var isLastFloor = (State.floor||1) >= maxFloor;
          if (isLastFloor) {
            // Donjon terminé → marquer nettoyé, stats meta, mais le perso GARDE tout
            // Clue drops on zone boss kill
            var _clueZone = State._currentZone;
            if (_clueZone === 'foret')  { Meta.clues.medallion = true; }
            if (_clueZone === 'ruines') { Meta.clues.carte = true; }
            if (_clueZone === 'port')   { Meta.clues.journal_marin = true; }
            if (Meta.clues.medallion && Meta.clues.carte && Meta.clues.journal_marin) { Meta.passageFound = true; }
            if (State._currentZone) Meta.clearZone(State._currentZone);
            // Mise à jour stats sans vider l'or (le perso continue sa progression)
            // (totalKills est déjà incrémenté à chaque victoire — pas de double comptage)
            Meta.totalRuns  += 1;
            Meta.bestFloor   = Math.max(Meta.bestFloor, State.floor||1);
            Meta.save();
            if (typeof Achievements !== 'undefined') Achievements.check('zone');
            // Réinitialiser le floor pour le prochain donjon
            State._currentZone = null;
            State.floor = 1;
            State._adGoldUsed = false;
            State.saveRun();
            Sfx.victory();
            document.getElementById('go-skull').textContent = '🏆';
            document.getElementById('go-title').textContent = T('go.victory');
            document.getElementById('go-title').style.color = '#C9A550';
            var _zdLabel = zd ? (CGE_LANG==='en'&&zd.labelEn?zd.labelEn:zd.label) : (CGE_LANG==='en'?'The dungeon':'Le donjon');
            document.getElementById('go-quote').textContent = '"' + _zdLabel + (CGE_LANG==='en'?' is defeated!"':' est vaincu !"');
            document.getElementById('go-floor').textContent = maxFloor;
            document.getElementById('go-gold').textContent  = State.gold||0;
            document.getElementById('go-kills').textContent = State.kills||0;
            var goAdWrap = document.getElementById('go-ad-wrap');
            if (goAdWrap) goAdWrap.innerHTML = '';
            Nav.go('gameover-screen');
          } else {
            // Passer à l'étage suivant du même donjon
            advanceFloor();
          }
        } else {
          Rooms.showLoot(enemy);
        }
      }, 700);
    } else {
      // DÉFAITE → retour auberge avec pénalités
      Sfx.gameover();
      // Appliquer pénalités
      var xpLoss = Math.floor((State.xp||0) * 0.25);
      State.xp = Math.max(0, (State.xp||0) - xpLoss);
      // Dégrader stats (équipements abîmés)
      State.atk = Math.max(1, Math.floor((State.atk||0) * 0.88));
      State.def = Math.max(0, Math.floor((State.def||0) * 0.88));
      // Soigner à 15% des PV max (presque mort mais vivant)
      State.hp = Math.max(1, Math.floor((State.hpMax||1) * 0.15));
      setTimeout(function(){
        document.getElementById('defeat-lines').innerHTML = (CGE_LANG==='en'
          ? '⚔ ATK and DEF reduced (-12%)<br>✦ -' + xpLoss + ' XP<br>❤ Healed to 15% HP'
          : '⚔ ATQ et DEF réduits (-12%)<br>✦ -' + xpLoss + ' XP<br>❤ Soigné à 15% des PV');
        var defeatAdWrap = document.getElementById('defeat-ad-wrap');
        if (defeatAdWrap) {
          defeatAdWrap.innerHTML = !State._adReviveUsed
            ? '<button class="btn-rewarded-ad" onclick="RewardedAds.showRevive()">'+T('adbtn.revive')+'</button>'
            : '';
        }
        document.getElementById('defeat-overlay').classList.add('show');
      }, 700);
    }
  }

  function enemyTurn() {
    if (enemy.hp <= 0) return;
    turnLocked = true;
    setButtons(false);
    setTimeout(function(){
      // Tick statuts
      tickStatuses();
      if (enemy.hp <= 0) { log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' succumbs to poison!':' succombe au poison !'),'system'); endCombat(true); return; }
      if (State.hp <= 0) { endCombat(false); return; }

      // Étourdi ?
      var stunned = statuses.find(function(s){ return s.type==='stun'; });
      if (stunned) { stunned.turns=0; tickStatuses(); log(T('cl.stunned'),'enemy'); turnLocked=false; setButtons(true); return; }

      // IA ennemi simple
      var action = Math.random();
      // Esquive (bonus méta + équipement)
      var _dodge = Math.min(0.9, (Meta.bonuses.dodge||0) + (State.dodgeBonus||0)); // plafonné à 90%
      if (_dodge > 0 && Math.random() < _dodge) {
        log(T('cl.dodge'),'player');
        turnLocked=false; setButtons(true); return;
      }
      var dmgResult = calcDmg(enemy.atk, playerDef ? State.def + 5 : State.def, true);
      playerDef = false;

      // Boss : capacités spéciales
      if (enemy.boss && action < 0.25) {
        var spec = Math.random();
        if (spec < 0.33) {
          addStatus(statuses, 'poison', 3, 5);
          log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' poisons you!':' t\'empoisonne !'),'enemy');
          turnLocked=false; setButtons(true); return;
        } else if (spec < 0.66) {
          addStatus(statuses, 'burn', 2, 8);
          log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' burns you!':' te brûle !'),'enemy');
          turnLocked=false; setButtons(true); return;
        } else {
          addStatus(statuses, 'stun', 1, 0);
          log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' stuns you!':' t\'étourdit !'),'enemy');
          turnLocked=false; setButtons(true); return;
        }
      }

      if (action < 0.15 && enemy.hp < enemy.hpMax * 0.4) {
        // Soin
        var heal = Math.round(enemy.hpMax * 0.15);
        enemy.hp = Math.min(enemy.hpMax, enemy.hp + heal);
        updateEnemyUI();
        log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' heals for '+heal+' HP.':' se soigne de '+heal+' PV.'),'system');
      } else {
        State.hp = Math.max(0, State.hp - dmgResult.dmg);
        updatePlayerUI();
        hitFlash();
        // Screen shake
        var ps = document.getElementById('phone-screen');
        if (ps) { ps.classList.add('shake'); setTimeout(function(){ ps.classList.remove('shake'); }, 350); }
        if (dmgResult.crit) Sfx.crit(); else Sfx.hit();
        log((CGE_LANG==='en'?((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(dmgResult.crit?' lands a CRITICAL HIT for ':' hits you for ')+dmgResult.dmg+' damage!'):(enemy.name+(dmgResult.crit?' inflige un COUP CRITIQUE ':' t\'inflige ')+dmgResult.dmg+' dégâts !')),'enemy');
        showDmg(dmgResult.dmg, true, dmgResult.crit);
      }

      if (State.hp <= 0) { endCombat(false); return; }

      // Cooldown compétence (classes sans mana) + regen mana
      if (!hasMana() && skillCd > 0) skillCd--;
      regenMana();
      updateSkillBtn();

      turnLocked = false;
      setButtons(true);
    }, 900);
  }

  return {
    start: function(enemyData) {
      enemy = Object.assign({}, enemyData, { hpMax: enemyData.hp });
      playerDef = false;
      skillCd = 0;
      turnLocked = false;
      logLines = [];
      // Regen mana partielle entre les combats (50% récupéré)
      if (hasMana() && State.manaMax > 0) {
        State.mana = Math.min(State.manaMax, (State.mana||0) + Math.round(State.manaMax * 0.5));
      }
      updateManaBar();

      var r = RACES.find(function(x){ return x.id===State.race; });
      var c = CLASSES.find(function(x){ return x.id===State.cls; });

      var heroName = State.name && State.name !== 'Aventurier' ? State.name : (r?(CGE_LANG==='en'&&r.nameEn?r.nameEn:r.name):(CGE_LANG==='en'?'Hero':'Héros'));
      document.getElementById('cb-player-name').textContent = heroName + (c?' · '+(CGE_LANG==='en'&&c.nameEn?c.nameEn:c.name):'');
      var sprEl2 = document.getElementById('cb-enemy-sprite');
      sprEl2.classList.remove('hit','dead');
      sprEl2.textContent = enemy.sprite;
      document.getElementById('cb-enemy-name').textContent   = CGE_LANG === 'en' && enemy.nameEn ? enemy.nameEn : enemy.name;
      document.getElementById('cb-floor-num').textContent    = ['I','II','III','IV','V','VI'][(State.floor||1)-1]||'I';
      document.getElementById('btn-skill').querySelector('.cb-ico').textContent = c ? ({'Guerrier':'🛡','Mage':'🔥','Chasseur':'🏹','Assassin':'🗡','Prêtre':'💚','Barbare':'🪓'}[c.id]||'✨') : '✨';
      document.getElementById('combat-result').classList.remove('show');
      statuses = (State.persistentStatuses||[]).map(function(s){ return Object.assign({},s); });
      enemyStatuses = []; renderStatuses();
      if (statuses.length) log((CGE_LANG==='en'?'⚠ You enter combat weakened ('+statuses.map(function(s){return s.type;}).join(', ')+')!':'⚠ Tu entres au combat affaibli ('+statuses.map(function(s){return s.type;}).join(', ')+') !'),'enemy');

      updatePlayerUI();
      updateEnemyUI();
      updateSkillBtn();
      updatePotionBtn();
      setButtons(true);
      log((CGE_LANG==='en'?'⚔ '+(enemy.nameEn||enemy.name)+' emerges from the shadows!':'⚔ '+enemy.name+' surgit de l\'ombre !')+(enemy.boss?' ☠':''),'system');
      // Tutoriel combat — une seule fois
      if (!Meta.tutoCombat) {
        Meta.tutoCombat = true;
        if (typeof Meta.save === 'function') Meta.save();
        setTimeout(function(){ CGEModal.alert(T('tuto.combat.title'), T('tuto.combat.body')); }, 450);
      }
      // Elfe : initiative — frappe en premier
      if (getPassive() === 'initiative') {
        setTimeout(function(){
          var res = calcDmg(State.atk, enemy.def);
          enemy.hp = Math.max(0, enemy.hp - res.dmg);
          enemyHitAnim(); showDmg(res.dmg, false, res.crit); updateEnemyUI();
          log((CGE_LANG==='en'?'🌿 Elven initiative! You strike for '+res.dmg+' damage before the enemy.':'🌿 Initiative elfique ! Tu frappes pour '+res.dmg+' dégâts avant l\'ennemi.'),'player');
          if (enemy.hp <= 0) { log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' is defeated!':' est vaincu !'),'system'); endCombat(true); }
        }, 500);
      }
    },

    updatePlayerUI: function() { updatePlayerUI(); },
    updateEnemyUI:  function() { updateEnemyUI(); },

    playerAttack: function() {
      if (turnLocked) return;
      var atkBonus = (getPassive()==='rage' && State.hp < State.hpMax*0.3) ? 1.5 : 1;
      var res = calcDmg(Math.round(State.atk * atkBonus), enemy.def);
      if (atkBonus > 1) log(T('cl.ragebonus'),'player');
      enemy.hp = Math.max(0, enemy.hp - res.dmg);
      enemyHitAnim();
      showDmg(res.dmg, false, res.crit);
      updateEnemyUI();
      if (res.crit) { Sfx.crit(); log((CGE_LANG==='en'?'CRITICAL HIT! You deal '+res.dmg+' damage to '+(enemy.nameEn||enemy.name)+'!':'CRITIQUE ! Tu infliges '+res.dmg+' dégâts à '+enemy.name+' !'),'player'); }
      else          { Sfx.attack(); log((CGE_LANG==='en'?'You attack '+(enemy.nameEn||enemy.name)+' for '+res.dmg+' damage.':'Tu attaques '+enemy.name+' pour '+res.dmg+' dégâts.'),'player'); }
      // Vampirisme
      var _lifesteal = (Meta.bonuses.lifesteal||0) + (State.itemLifesteal||0);
      if (_lifesteal > 0) {
        var ls = Math.max(1, Math.round(res.dmg * _lifesteal));
        State.hp = Math.min(State.hpMax, State.hp + ls);
        showHeal(ls);
        updatePlayerUI(); log((CGE_LANG==='en'?'🩸 Lifesteal +'+ls+' HP':'🩸 Vampirisme +'+ls+' PV'),'player');
      }
      if (enemy.hp <= 0) { log((CGE_LANG==='en'&&enemy.nameEn?enemy.nameEn:enemy.name)+(CGE_LANG==='en'?' is defeated!':' est vaincu !'),'system'); endCombat(true); return; }
      enemyTurn();
    },

    playerDefend: function() {
      if (turnLocked) return;
      playerDef = true;
      Sfx.defend();
      log(T('cl.defend'),'player');
      enemyTurn();
    },

    playerSkill: function() {
      if (turnLocked) return;
      var c = CLASSES.find(function(x){ return x.id===State.cls; });
      // Mage & Prêtre : ouvrir le sélecteur de sorts
      if (hasMana()) {
        if ((State.mana||0) <= 0) { log(T('cl.nomana'),'system'); return; }
        Combat.openSpells();
        return;
      }
      // Autres classes : cooldown classique
      if (skillCd > 0) return;
      skillCd = 3;
      updateSkillBtn();
      Sfx.skill();
      if (c.id === 'Guerrier') {
        addStatus(statuses, 'defend', 2, 8); playerDef = true;
        log(T('cl.shieldskill'),'player');
        enemyTurn();
      } else if (c.id === 'Chasseur') {
        var d1 = calcDmg(State.atk, enemy.def), d2 = calcDmg(State.atk, enemy.def);
        var total = d1.dmg + d2.dmg;
        enemy.hp = Math.max(0, enemy.hp - total);
        enemyHitAnim(); showDmg(total, false, false); updateEnemyUI();
        log((CGE_LANG==='en'?'Double shot! '+d1.dmg+' + '+d2.dmg+' = '+total+' damage.':'Double tir ! '+d1.dmg+' + '+d2.dmg+' = '+total+' dégâts.'),'player');
        if (enemy.hp <= 0) { endCombat(true); return; }
        enemyTurn();
      } else if (c.id === 'Assassin') {
        var dmg = Math.round(State.atk * 2);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        enemyHitAnim(); showDmg(dmg, false, true); updateEnemyUI();
        log((CGE_LANG==='en'?'Guaranteed critical strike! '+dmg+' damage.':'Frappe critique garantie ! '+dmg+' dégâts.'),'player');
        if (enemy.hp <= 0) { endCombat(true); return; }
        enemyTurn();
      } else if (c.id === 'Barbare') {
        var dmg = Math.round(State.atk * 1.6);
        if (State.hp < State.hpMax * 0.3) dmg = Math.round(dmg * 1.5);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        enemyHitAnim(); showDmg(dmg, false, State.hp < State.hpMax * 0.3); updateEnemyUI();
        log((CGE_LANG==='en'?'Barbarian frenzy! '+dmg+' savage damage.':'Frenésie barbare ! '+dmg+' dégâts sauvages.'),'player');
        if (enemy.hp <= 0) { endCombat(true); return; }
        enemyTurn();
      }
    },

    openSpells: function() {
      var list = document.getElementById('spell-list');
      list.innerHTML = '';
      var spells = (SPELLS[State.cls]||[]);
      spells.forEach(function(sp) {
        var lvlOk = !sp.unlockLevel || (State.level||1) >= sp.unlockLevel;
        var mpOk  = (State.mana||0) >= sp.cost;
        var btn = document.createElement('button');
        btn.className = 'spell-btn ripple-el' + ((!lvlOk || !mpOk) ? ' disabled' : '');
        btn.innerHTML = '<span class="sp-ico">'+sp.ico+'</span>'
          + '<span class="sp-info"><div class="sp-name">'+(CGE_LANG==='en'&&sp.nameEn?sp.nameEn:sp.name)+'</div>'
          + '<div class="sp-desc">'+(lvlOk ? (CGE_LANG==='en'&&sp.descEn?sp.descEn:sp.desc) : (CGE_LANG==='en'?'Unlocked at level '+sp.unlockLevel:'Débloqué niveau '+sp.unlockLevel))+'</div></span>'
          + '<span class="sp-cost">'+sp.cost+' MP</span>';
        if (lvlOk && mpOk) btn.addEventListener('click', function(){ Combat.castSpell(sp); });
        list.appendChild(btn);
      });
      document.getElementById('spell-overlay').classList.add('show');
    },

    closeSpells: function() {
      document.getElementById('spell-overlay').classList.remove('show');
    },

    castSpell: function(sp) {
      Combat.closeSpells();
      if (turnLocked) return;
      if ((State.mana||0) < sp.cost) { log(T('cl.notenoughmana'),'system'); return; }
      State.mana = Math.max(0, (State.mana||0) - sp.cost);
      updateManaBar();
      updateSkillBtn();
      Sfx.skill();
      clearTimer();
      var res = sp.cast(enemy);
      if (res.dmg) { enemyHitAnim(); showDmg(res.dmg, false, res.crit); updateEnemyUI(); }
      if (res.heal) { showHeal(res.heal); updatePlayerUI(); Sfx.heal(); }
      if (res.stun) { addStatus(enemyStatuses, 'stun', res.stun, 0); }
      if (res.burn) { addStatus(enemyStatuses, 'burn', res.burn, Math.round(State.atk*0.3)); }
      if (res.shield) { addStatus(statuses, 'shield', res.shield, res.shieldDef || 12); }
      log((CGE_LANG==='en'&&res.logEn?res.logEn:res.log), res.heal ? 'heal' : 'player');
      if (enemy.hp <= 0) { endCombat(true); return; }
      enemyTurn();
    },

    usePotion: function() {
      if (turnLocked) return;
      if ((State.potions||0) <= 0) { log(T('cl.nopotions'),'system'); return; }
      clearTimer();
      State.potions--;
      var heal = Math.round(State.hpMax * 0.35);
      State.hp = Math.min(State.hpMax, State.hp + heal);
      showHeal(heal);
      State.persistentStatuses = [];
      statuses = statuses.filter(function(s){ return s.type!=='poison'&&s.type!=='burn'; });
      updatePlayerUI(); renderStatuses();
      updatePotionBtn();
      Sfx.potion();
      log((CGE_LANG==='en'?'🧪 Healing potion! +'+heal+' HP. Negative statuses cleared.':'🧪 Potion de soin ! +'+heal+' PV. Statuts négatifs dissipés.'),'heal');
      enemyTurn();
    },

    showItemMenu: function() {
      if (turnLocked) return;
      clearTimer();
      var rows = document.getElementById('item-rows');
      rows.innerHTML = '';
      var hasItems = false;
      // Potions
      if ((State.potions||0) > 0) {
        hasItems = true;
        var div = document.createElement('div');
        div.className = 'item-row';
        div.innerHTML = '<div class="ir-ico">🧪</div><div class="ir-info"><div class="ir-name">'+(CGE_LANG==='en'?'Healing Potion':'Potion de Soin')+'</div><div class="ir-desc">'+(CGE_LANG==='en'?'Restores 35% of HP':'Restaure 35% des PV')+'</div></div><div class="ir-count">×'+(State.potions)+'</div>';
        div.addEventListener('click', function(){
          Combat.closeItemMenu();
          State.potions--;
          var heal = Math.round(State.hpMax * 0.35);
          State.hp = Math.min(State.hpMax, State.hp + heal);
          showHeal(heal);
          updatePlayerUI();
          Sfx.potion();
          log((CGE_LANG==='en'?'Healing potion! +'+heal+' HP.':'Potion de soin ! +'+heal+' PV.'),'heal');
          enemyTurn();
        });
        rows.appendChild(div);
      }
      // Inventory combat consumables
      (State.inventory||[]).forEach(function(item, idx) {
        if (!item.combat) return;
        hasItems = true;
        var div = document.createElement('div');
        div.className = 'item-row';
        div.innerHTML = '<div class="ir-ico">'+item.ico+'</div><div class="ir-info"><div class="ir-name">'+(CGE_LANG==='en'&&item.nameEn?item.nameEn:item.name)+'</div><div class="ir-desc">'+(CGE_LANG==='en'&&item.descEn?item.descEn:item.desc)+'</div></div>';
        div.addEventListener('click', function(){
          Combat.closeItemMenu();
          if (item.effect) item.effect();
          State.inventory.splice(idx, 1);
          updatePlayerUI();
          log((CGE_LANG==='en'&&item.nameEn?item.nameEn:item.name)+(CGE_LANG==='en'?' used!':' utilisé !'), 'heal');
          enemyTurn();
        });
        rows.appendChild(div);
      });
      // Scrolls / Parchemins
      (State.scrolls||[]).forEach(function(scroll, idx) {
        hasItems = true;
        var div = document.createElement('div');
        div.className = 'item-row';
        var scrollDesc = scroll.dmg ? (CGE_LANG==='en'?'Deals '+scroll.dmg+' damage':'Inflige '+scroll.dmg+' dégâts') : (scroll.stun ? (CGE_LANG==='en'?'The enemy skips its turn':'L\'ennemi passe son tour') : '');
        div.innerHTML = '<div class="ir-ico">'+scroll.ico+'</div><div class="ir-info"><div class="ir-name">'+(CGE_LANG==='en'?'Scroll '+(scroll.nameEn||scroll.name):'Parchemin '+scroll.name)+'</div><div class="ir-desc">'+scrollDesc+'</div></div><div class="ir-count">×1</div>';
        div.addEventListener('click', function(){
          Combat.closeItemMenu();
          State.scrolls.splice(idx, 1);
          if (scroll.dmg) {
            enemy.hp = Math.max(0, enemy.hp - scroll.dmg);
            updateEnemyUI();
            log((CGE_LANG==='en'?scroll.ico+' Scroll '+(scroll.nameEn||scroll.name)+'! −'+scroll.dmg+' HP to the enemy.':scroll.ico+' Parchemin '+scroll.name+' ! −'+scroll.dmg+' PV à l\'ennemi.'),'player');
            if (enemy.hp <= 0) { endCombat(true); return; }
          }
          if (scroll.stun) {
            log(T('cl.confusion'),'system');
            // skip enemy turn
            startTimer();
            return;
          }
          enemyTurn();
        });
        rows.appendChild(div);
      });
      if (!hasItems) {
        rows.innerHTML = '<div style="font-family:\'Crimson Text\',serif;font-size:13px;font-style:italic;color:rgba(237,232,223,0.3);text-align:center;padding:10px">'+(CGE_LANG==='en'?'No usable items':'Aucun objet utilisable')+'</div>';
      }
      document.getElementById('item-overlay').classList.add('show');
    },

    closeItemMenu: function() {
      document.getElementById('item-overlay').classList.remove('show');
      if (!turnLocked) startTimer();
    },

    leaveDefeat: function() {
      document.getElementById('defeat-overlay').classList.remove('show');
      InnRoom.enter();
      Nav.go('inn-room');
    },

    playerFlee: function() {
      if (turnLocked) return;
      clearTimer();
      var fleeChance = 0.35 + (State.fleeBonus||0);
      if (Math.random() < fleeChance) {
        Sfx.flee();
        log(T('cl.flee'),'system');
        setTimeout(function(){ Nav.go('dungeon-map'); }, 700);
      } else {
        log(T('cl.fleefail'),'system');
        enemyTurn();
      }
    },

    closeResult: function() {
      document.getElementById('combat-result').classList.remove('show');
      Nav.go('dungeon-map');
    }
  };
})();

// ── ITEMS (butin possible) ────────────────────────────────────────
// slot → équipable dans un emplacement précis
// combat → utilisable dans le menu objet en combat
// stats → { atk, def, hp, flee } appliqués à l'équip, retirés au déséquip
var RARITY_LABELS = { common:'Commun', uncommon:'Peu commun', rare:'Rare', epic:'Épique', legendary:'Légendaire', mythic:'Mythique' };
var RARITY_ORDER  = ['common','uncommon','rare','epic','legendary','mythic'];
var ITEMS = [
  // ── Tier 1 (étages 1-2) ──────────────────────────────────────────
  { ico:'⚔', name:'Épée Rouillée', nameEn:'Rusty Sword',       slot:'arme',      stats:{atk:4},         desc:'+4 ATQ',  descEn:'+4 ATK',           tier:1, rarity:'common' },
  { ico:'🗡', name:'Dague Acérée', nameEn:'Sharp Dagger',        slot:'arme',      stats:{atk:6},         desc:'+6 ATQ',  descEn:'+6 ATK',           tier:1, rarity:'common' },
  { ico:'🛡', name:'Bouclier Brisé', nameEn:'Broken Shield',      slot:'bouclier',  stats:{def:5},         desc:'+5 DEF',  descEn:'+5 DEF',           tier:1, rarity:'common' },
  { ico:'🪖', name:'Casque de Fer', nameEn:'Iron Helm',       slot:'heaume',    stats:{def:4},         desc:'+4 DEF',  descEn:'+4 DEF',           tier:1, rarity:'common' },
  { ico:'🥋', name:'Armure de Cuir', nameEn:'Leather Armour',      slot:'plastron',  stats:{def:6},         desc:'+6 DEF',  descEn:'+6 DEF',           tier:1, rarity:'common' },
  { ico:'🧤', name:'Gants de Feu', nameEn:'Fire Gauntlets',        slot:'gants',     stats:{atk:4},         desc:'+4 ATQ',  descEn:'+4 ATK',           tier:1, rarity:'common' },
  { ico:'🧤', name:'Gantelets Lourds', nameEn:'Heavy Gauntlets',    slot:'gants',     stats:{def:4},         desc:'+4 DEF',  descEn:'+4 DEF',           tier:1, rarity:'common' },
  { ico:'👢', name:'Bottes Légères', nameEn:'Light Boots',      slot:'bottes',    stats:{flee:0.15},     desc:'+15% fuite', descEn:'+15% flee',     tier:1, rarity:'uncommon' },
  { ico:'🪢', name:'Ceinture Renforcée', nameEn:'Reinforced Belt',  slot:'ceinture',  stats:{def:5},         desc:'+5 DEF',  descEn:'+5 DEF',           tier:1, rarity:'common' },
  { ico:'🦵', name:'Jambières de Cuir', nameEn:'Leather Greaves',   slot:'jambieres', stats:{def:4},         desc:'+4 DEF',  descEn:'+4 DEF',           tier:1, rarity:'common' },
  { ico:'📿', name:'Collier de Dents', nameEn:'Tooth Necklace',    slot:'collier',   stats:{atk:3,def:3},   desc:'+3 ATQ +3 DEF', descEn:'+3 ATK +3 DEF', tier:1, rarity:'uncommon' },
  // ── Tier 2 (étages 3-4) ──────────────────────────────────────────
  { ico:'⚔', name:'Épée de Chevalier', nameEn:'Knight\'s Sword',   slot:'arme',      stats:{atk:10},        desc:'+10 ATQ', descEn:'+10 ATK',          tier:2, rarity:'uncommon' },
  { ico:'🪄', name:'Baguette Arcane', nameEn:'Arcane Wand',     slot:'arme',      stats:{atk:12},        desc:'+12 ATQ mag.', descEn:'+12 mag. ATK', tier:2, rarity:'rare' },
  { ico:'🪓', name:'Hache Barbare', nameEn:'Barbarian Axe',       slot:'arme',      stats:{atk:14},        desc:'+14 ATQ brut', descEn:'+14 raw ATK',  tier:2, rarity:'rare' },
  { ico:'🛡', name:'Écu de Chevalier', nameEn:'Knight\'s Shield',    slot:'bouclier',  stats:{def:9},         desc:'+9 DEF',  descEn:'+9 DEF',           tier:2, rarity:'uncommon' },
  { ico:'🪖', name:'Heaume Enchanté', nameEn:'Enchanted Helm',     slot:'heaume',    stats:{def:7,hp:10},   desc:'+7 DEF +10 PV', descEn:'+7 DEF +10 HP', tier:2, rarity:'rare' },
  { ico:'🥋', name:'Plastron d\'Acier', nameEn:'Steel Breastplate',   slot:'plastron',  stats:{def:10},        desc:'+10 DEF', descEn:'+10 DEF',          tier:2, rarity:'uncommon' },
  { ico:'👢', name:'Bottes de Guerre', nameEn:'War Boots',    slot:'bottes',    stats:{def:3,atk:2},   desc:'+3 DEF +2 ATQ', descEn:'+3 DEF +2 ATK', tier:2, rarity:'uncommon' },
  { ico:'🪢', name:'Ceinture de Force', nameEn:'Belt of Strength',   slot:'ceinture',  stats:{atk:3,hp:15},   desc:'+3 ATQ +15 PV', descEn:'+3 ATK +15 HP', tier:2, rarity:'rare' },
  { ico:'🦵', name:'Cuissardes d\'Acier', nameEn:'Steel Cuisses', slot:'jambieres', stats:{def:7},         desc:'+7 DEF',  descEn:'+7 DEF',           tier:2, rarity:'uncommon' },
  { ico:'💎', name:'Amulette Vitale', nameEn:'Vital Amulet',     slot:'collier',   stats:{hp:30},         desc:'+30 PV max', descEn:'+30 max HP',    tier:2, rarity:'rare' },
  // ── Tier 3 (étages 5-6) ──────────────────────────────────────────
  { ico:'⚔', name:'Épée de Sang', nameEn:'Blood Sword',        slot:'arme',      stats:{atk:18},        desc:'+18 ATQ', descEn:'+18 ATK',          tier:3, rarity:'rare' },
  { ico:'🪄', name:'Sceptre des Âmes', nameEn:'Soul Sceptre',   slot:'arme',      stats:{atk:22,hp:-20}, desc:'+22 ATQ −20 PV', descEn:'+22 ATK −20 HP', tier:3, rarity:'epic' },
  { ico:'🛡', name:'Bouclier Enchanté', nameEn:'Enchanted Shield',  slot:'bouclier',  stats:{def:16},        desc:'+16 DEF', descEn:'+16 DEF',          tier:3, rarity:'rare' },
  { ico:'🛡', name:'Égide de Lumière', nameEn:'Aegis of Light',   slot:'bouclier',  stats:{def:20,hp:15},  desc:'+20 DEF +15 PV', descEn:'+20 DEF +15 HP', tier:3, rarity:'epic' },
  { ico:'🪖', name:'Heaume de Fer Noir', nameEn:'Black Iron Helm', slot:'heaume',    stats:{def:14,atk:3},  desc:'+14 DEF +3 ATQ', descEn:'+14 DEF +3 ATK', tier:3, rarity:'rare' },
  { ico:'🥋', name:'Plastron des Rois', nameEn:'King\'s Breastplate',  slot:'plastron',  stats:{def:18},        desc:'+18 DEF', descEn:'+18 DEF',          tier:3, rarity:'rare' },
  { ico:'🥋', name:'Cuirasse Maudite', nameEn:'Cursed Cuirass',   slot:'plastron',  stats:{def:22,hp:-15}, desc:'+22 DEF −15 PV', descEn:'+22 DEF −15 HP', tier:3, rarity:'epic' },
  { ico:'🧤', name:'Gants du Titan', nameEn:'Titan Gauntlets',     slot:'gants',     stats:{atk:10,def:5},  desc:'+10 ATQ +5 DEF', descEn:'+10 ATK +5 DEF', tier:3, rarity:'epic' },
  { ico:'👢', name:'Bottes des Ombres', nameEn:'Shadow Boots',  slot:'bottes',    stats:{flee:0.3,atk:5},desc:'+30% fuite +5 ATQ', descEn:'+30% flee +5 ATK', tier:3, rarity:'epic' },
  { ico:'🪢', name:'Ceinture Abyssale', nameEn:'Abyssal Belt',  slot:'ceinture',  stats:{hp:40,def:6},   desc:'+40 PV +6 DEF', descEn:'+40 HP +6 DEF',  tier:3, rarity:'rare' },
  { ico:'🦵', name:'Cuissardes Runiques', nameEn:'Runic Cuisses',slot:'jambieres', stats:{def:12,atk:4},  desc:'+12 DEF +4 ATQ', descEn:'+12 DEF +4 ATK', tier:3, rarity:'epic' },
  { ico:'💎', name:'Rubis du Néant', nameEn:'Ruby of the Void',     slot:'collier',   stats:{atk:14,def:8},  desc:'+14 ATQ +8 DEF', descEn:'+14 ATK +8 DEF', tier:3, rarity:'epic' },
  { ico:'💎', name:'Saphir Éternel', nameEn:'Eternal Sapphire',     slot:'collier',   stats:{hp:60,def:10},  desc:'+60 PV +10 DEF', descEn:'+60 HP +10 DEF', tier:3, rarity:'legendary' },
  // ── Anneaux / Bagues ──────────────────────────────────────────────
  { ico:'💍', name:'Anneau de Cuivre', nameEn:'Copper Ring',   slot:'bague', stats:{atk:3},        desc:'+3 ATQ', descEn:'+3 ATK',          tier:1, rarity:'common' },
  { ico:'💍', name:'Anneau Défensif', nameEn:'Defensive Ring',    slot:'bague', stats:{def:4},        desc:'+4 DEF', descEn:'+4 DEF',          tier:1, rarity:'common' },
  { ico:'💍', name:'Anneau de Vigueur', nameEn:'Ring of Vigour',  slot:'bague', stats:{hp:20},        desc:'+20 PV max', descEn:'+20 max HP',  tier:1, rarity:'common' },
  { ico:'💎', name:'Anneau Enchanté', nameEn:'Enchanted Ring',    slot:'bague', stats:{atk:5,def:3},  desc:'+5 ATQ +3 DEF', descEn:'+5 ATK +3 DEF', tier:2, rarity:'uncommon' },
  { ico:'💎', name:'Bague du Survivant', nameEn:'Survivor\'s Ring', slot:'bague', stats:{hp:40,def:5},  desc:'+40 PV +5 DEF', descEn:'+40 HP +5 DEF', tier:2, rarity:'rare' },
  { ico:'🔮', name:'Anneau de Puissance', nameEn:'Ring of Power',slot:'bague', stats:{atk:10,hp:30}, desc:'+10 ATQ +30 PV', descEn:'+10 ATK +30 HP', tier:3, rarity:'epic' },
  { ico:'⭐', name:'Anneau Légendaire', nameEn:'Legendary Ring',  slot:'bague', stats:{atk:12,def:12,hp:50}, desc:'+12 ATQ +12 DEF +50 PV', descEn:'+12 ATK +12 DEF +50 HP', tier:3, rarity:'legendary' },
  // ── Légendaires rares (drop boss uniquement) ──────────────────────
  { ico:'⚔', name:'Lame de l\'Aube', nameEn:'Blade of Dawn',    slot:'arme',      stats:{atk:28},        desc:'+28 ATQ', descEn:'+28 ATK',          tier:3, rarity:'legendary' },
  { ico:'🥋', name:'Armure des Cryptes', nameEn:'Crypt Armour', slot:'plastron',  stats:{def:30,atk:8},  desc:'+30 DEF +8 ATQ', descEn:'+30 DEF +8 ATK', tier:3, rarity:'legendary' },
  { ico:'💍', name:'Anneau du Chaos', nameEn:'Ring of Chaos',    slot:'bague',     stats:{atk:18,def:12}, desc:'+18 ATQ +12 DEF', descEn:'+18 ATK +12 DEF', tier:3, rarity:'mythic' },
  // ── Consommables ─────────────────────────────────────────────────
  { ico:'🧪', name:'Potion de Force', nameEn:'Strength Potion',    combat:true, stats:{atk:6}, desc:'+6 ATQ (ce combat)', descEn:'+6 ATK (this combat)', rarity:'common', effect:function(){ State.atk+=6; setTimeout(function(){ State.atk=Math.max(0,State.atk-6); },30000); } },
  { ico:'💊', name:'Herbes Médicinales', nameEn:'Medicinal Herbs', combat:true, desc:'+25% PV', descEn:'+25% HP', rarity:'common', effect:function(){ var h=Math.round(State.hpMax*0.25); State.hp=Math.min(State.hpMax,State.hp+h); } },
  { ico:'📜', name:'Parchemin de Soin', nameEn:'Healing Scroll',  desc:'+1 Potion', descEn:'+1 Potion', rarity:'common', effect:function(){ State.potions=(State.potions||0)+1; } },
];

// Appliquer les stats d'un item équipé
// ── STATS D'ÉQUIPEMENT ────────────────────────────────────────────
// Métadonnées : ordre d'affichage, icône, libellé FR/EN, valeur en %.
var STAT_META = {
  atk:       { ico:'⚔', fr:'ATQ',     en:'ATK',     pct:false },
  def:       { ico:'🛡', fr:'DEF',     en:'DEF',     pct:false },
  hp:        { ico:'❤', fr:'PV',      en:'HP',      pct:false },
  crit:      { ico:'✨', fr:'CRIT',    en:'CRIT',    pct:true  },
  dodge:     { ico:'💨', fr:'ESQ',     en:'DODGE',   pct:true  },
  lifesteal: { ico:'🩸', fr:'VOL VIE', en:'LEECH',   pct:true  },
  flee:      { ico:'🏃', fr:'FUITE',   en:'FLEE',    pct:true  },
};
var STAT_ORDER = ['atk','def','hp','crit','dodge','lifesteal','flee'];

function fmtStatVal(k, v) {
  var m = STAT_META[k]; if (!m) return '';
  return m.pct ? '+'+Math.round(v*100)+'%' : '+'+Math.round(v);
}
function formatStats(stats, lang) {
  lang = lang || CGE_LANG;
  if (!stats) return '';
  var parts = [];
  STAT_ORDER.forEach(function(k){
    if (!stats[k]) return;
    var m = STAT_META[k];
    parts.push(fmtStatVal(k, stats[k]) + ' ' + (lang==='en'?m.en:m.fr));
  });
  return parts.join(' · ');
}

// Libellés de slot (globaux — utilisés par l'inventaire ET la boutique)
var SLOT_LABELS = {
  arme:'Arme', bouclier:'Bouclier', heaume:'Heaume', plastron:'Plastron',
  gants:'Gantelets', ceinture:'Ceinture', jambieres:'Jambières', bottes:'Bottes',
  collier:'Collier', bague_gauche:'Bague gauche', bague_droite:'Bague droite'
};
var SLOT_LABELS_EN = {
  arme:'Weapon', bouclier:'Shield', heaume:'Helmet', plastron:'Breastplate',
  gants:'Gauntlets', ceinture:'Belt', jambieres:'Greaves', bottes:'Boots',
  collier:'Necklace', bague_gauche:'Left Ring', bague_droite:'Right Ring'
};
function getSlotLabel(slot) {
  return (CGE_LANG==='en' ? SLOT_LABELS_EN[slot] : SLOT_LABELS[slot]) || slot;
}

// Compare les stats d'un objet vs UN slot équipé précis. Renvoie un bloc HTML.
function _compareOne(item, equipSlot, title) {
  var equipped = (State.equipped||{})[equipSlot];
  var ns = item.stats||{}, es = (equipped && equipped.stats)||{};
  var rows = [];
  STAT_ORDER.forEach(function(k){
    var m = STAT_META[k];
    var d = (ns[k]||0) - (es[k]||0);
    var num = m.pct ? Math.round(d*100) : Math.round(d);
    if (num === 0) return;
    var val = (num>0?'+':'') + num + (m.pct?'%':'');
    rows.push('<span class="eq-cmp '+(num>0?'cmp-up':'cmp-down')+'">'+m.ico+' '+val+' '+(CGE_LANG==='en'?m.en:m.fr)+'</span>');
  });
  var lbl = title || (equipped ? (CGE_LANG==='en'?'vs equipped':'vs équipé')
                               : (CGE_LANG==='en'?'vs empty slot':'vs emplacement vide'));
  if (equipped && !rows.length) return '<div class="eq-cmp-title">'+lbl+' · '+(CGE_LANG==='en'?'identical':'identique')+'</div>';
  return '<div class="eq-cmp-title">'+lbl+'</div><div class="eq-cmp-row">'+rows.join('')+'</div>';
}

// Compare un objet avec l'équipement actuel. Les anneaux (slot 'bague') sont
// comparés aux DEUX bagues équipées (gauche + droite). Partagé inventaire + boutique.
function buildCompareHtml(item, slot) {
  if (slot === 'bague') {
    return _compareOne(item, 'bague_gauche', CGE_LANG==='en'?'vs left ring':'vs bague gauche')
         + _compareOne(item, 'bague_droite', CGE_LANG==='en'?'vs right ring':'vs bague droite');
  }
  return _compareOne(item, slot, null);
}

// Stats secondaires « façon MMORPG » : à haut niveau, les objets gagnent des
// bonus un peu partout (ATQ/DEF/PV/crit/esquive/vol de vie), selon niveau+rareté.
// Retourne un NOUVEL objet stats — ne mute jamais le modèle d'origine.
function rollSecondaryStats(template, level) {
  var stats = {};
  var base = template.stats || {};
  for (var k in base) stats[k] = base[k];
  level = level || 1;
  if (level < 10) return stats; // bas niveau : objets simples (mono-stat)
  var rarBonus = { common:0, uncommon:0, rare:1, epic:2, legendary:2 }[template.rarity||'common'] || 0;
  var n = Math.min(4, Math.floor((level - 10) / 15) + 1 + rarBonus); // 1..4 stats en plus
  var pool = ['atk','def','hp','crit','dodge','lifesteal'];
  for (var i=0;i<n;i++){
    var key = pool[(Math.random()*pool.length)|0];
    var add;
    if (key === 'hp') add = 6 + Math.round(level*1.0 + Math.random()*level*0.6);
    else if (key === 'atk' || key === 'def') add = 1 + Math.round(level*0.18 + Math.random()*level*0.15);
    else add = Math.round((0.015 + Math.random()*0.035) * 1000) / 1000; // 1.5%–5%
    stats[key] = Math.round(((stats[key]||0) + add) * 1000) / 1000;
  }
  return stats;
}

function applyItemStats(item, sign) {
  if (!item || !item.stats) return;
  var s = item.stats;
  if (s.atk)  State.atk  = Math.max(0, (State.atk||0)  + sign*(s.atk||0));
  if (s.def)  State.def  = Math.max(0, (State.def||0)  + sign*(s.def||0));
  if (s.hp)  { State.hpMax = Math.max(1,(State.hpMax||1)+sign*(s.hp||0)); State.hp=Math.min(State.hpMax,(State.hp||0)+sign*(s.hp||0)); }
  if (s.crit)      State.critBonus     = Math.max(0,(State.critBonus||0)    +sign*(s.crit||0));
  if (s.dodge)     State.dodgeBonus    = Math.max(0,(State.dodgeBonus||0)   +sign*(s.dodge||0));
  if (s.lifesteal) State.itemLifesteal = Math.max(0,(State.itemLifesteal||0)+sign*(s.lifesteal||0));
  if (s.flee)      State.fleeBonus     = Math.max(0,(State.fleeBonus||0)    +sign*(s.flee||0));
}

// ── ROOMS ─────────────────────────────────────────────────────────
var Rooms = {
  _lastEnemy: null,

  showLoot: function(e) {
    Rooms._lastEnemy = e;
    // Créditer réellement l'or du combat (il était affiché mais jamais ajouté).
    var goldGain = e.gold || 0;
    State.gold = (State.gold||0) + goldGain;
    Meta.totalGold = (Meta.totalGold||0) + goldGain;
    State._lastCombatGold = goldGain; // base pour la pub ×2
    if (typeof HUD !== 'undefined') HUD.updateGold();
    document.getElementById('loot-gold-val').textContent = '+'+goldGain;
    var wrap = document.getElementById('loot-item-wrap');
    var btn  = document.getElementById('btn-loot-cont');
    // Taux de drop plus élevé pour les boss
    var dropRate = e.boss ? 0.95 : 0.65;
    if (Math.random() < dropRate) {
      // Sélection d'item par tier basé sur l'étage du donjon
      var floor = State.floor || 1;
      var maxTier = floor <= 2 ? 1 : (floor <= 4 ? 2 : 3);
      var equipItems = ITEMS.filter(function(it){ return it.slot; });
      // 80% items du tier max, 15% tier inférieur, 5% tier supérieur (si existe)
      var roll = Math.random();
      var pool;
      if (roll < 0.05 && maxTier < 3) {
        pool = equipItems.filter(function(it){ return (it.tier||1) === maxTier+1; });
      } else if (roll < 0.20 && maxTier > 1) {
        pool = equipItems.filter(function(it){ return (it.tier||1) === maxTier-1; });
      } else {
        pool = equipItems.filter(function(it){ return (it.tier||1) === maxTier; });
      }
      if (!pool.length) pool = equipItems.filter(function(it){ return (it.tier||1) <= maxTier; });
      if (!pool.length) pool = equipItems;
      // Consommables rares (10%)
      if (Math.random() < 0.1) pool = ITEMS.filter(function(it){ return !it.slot; });
      var template = pool[Math.floor(Math.random()*pool.length)] || ITEMS[0];
      // Cloner le modèle pour ne pas le muter, et générer des stats secondaires
      // selon le niveau (objet d'équipement uniquement, pas les consommables).
      var item = Object.assign({}, template);
      if (item.slot) {
        item.stats  = rollSecondaryStats(template, State.level||1);
        item.desc   = formatStats(item.stats, 'fr');
        item.descEn = formatStats(item.stats, 'en');
      }
      document.getElementById('loot-item-ico').textContent  = item.ico;
      document.getElementById('loot-item-name').textContent = CGE_LANG === 'en' && item.nameEn ? item.nameEn : item.name;
      var rar = item.rarity||'common';
      var rarLabel = (RARITY_LABELS||{})[rar]||rar;
      wrap.className = wrap.className.replace(/rarity-\w+/g,'').trim() + ' rarity-'+rar;
      if (item.equip) {
        document.getElementById('loot-item-desc').innerHTML = (CGE_LANG === 'en' && item.descEn ? item.descEn : item.desc) + ' · ' + T('loot.tobag') + '<br><span class="rarity-badge '+rar+'">'+rarLabel+'</span>';
        Rooms._pendingItem = item;
        if (btn) btn.textContent = T('misc.pickup_arrow');
      } else {
        document.getElementById('loot-item-desc').innerHTML = (CGE_LANG === 'en' && item.descEn ? item.descEn : item.desc)+'<br><span class="rarity-badge '+rar+'">'+rarLabel+'</span>';
        Rooms._pendingItem = item;
        if (btn) btn.textContent = T('misc.continue_arrow');
      }
      wrap.classList.remove('hidden');
      wrap.classList.remove('show');
      setTimeout(function(){ wrap.classList.add('show'); }, 50);
    } else {
      wrap.classList.remove('hidden');
      wrap.classList.add('show');
      document.getElementById('loot-item-ico').textContent  = '🍃';
      document.getElementById('loot-item-name').textContent = T('loot.none.name');
      document.getElementById('loot-item-desc').textContent = T('loot.none.desc');
      Rooms._pendingItem = null;
      if (btn) btn.textContent = T('misc.continue_arrow');
    }
    // Boutons pub rewarded — une fois par combat
    var adWrap = document.getElementById('loot-ad-wrap');
    if (adWrap) {
      adWrap.innerHTML = '';
      var adBtns = [];
      if (!State._adGoldUsed)
        adBtns.push('<button class="btn-rewarded-ad" onclick="RewardedAds.showDoubleGold()">'+T('adbtn.doublegold')+'</button>');
      if (!State._adChestUsed && e.boss)
        adBtns.push('<button class="btn-rewarded-ad" onclick="RewardedAds.showDoubleChest()">'+T('adbtn.chest')+'</button>');
      adWrap.innerHTML = adBtns.join('');
    }
    Nav.go('loot-screen');
  },

  lootContinue: function() {
    var item = Rooms._pendingItem;
    if (item) {
      Rooms._pendingItem = null;
      if (item.slot) {
        State.inventory = State.inventory || [];
        if (State.inventory.length < 8) {
          State.inventory.push(item);
        } else {
          // Full: auto-discard oldest to chest if possible
          var discarded = State.inventory.shift();
          if (Meta.chest.length < 20) Meta.chest.push(discarded);
          Meta.save();
          State.inventory.push(item);
        }
      } else if (item.effect) {
        item.effect();
      }
    }
    updateMapHpBar();
    Nav.go('dungeon-map');
  },

  showRest: function() {
    var heal = Math.round(State.hpMax * 0.35);
    var actual = Math.min(heal, State.hpMax - State.hp);
    Rooms._healAmt = actual;
    document.getElementById('rest-icon').textContent     = '🔥';
    document.getElementById('rest-title').textContent    = T('rest.camp.title');
    document.getElementById('rest-desc').textContent     = T('rest.camp.desc');
    document.getElementById('rest-heal-val').textContent = '+'+actual+' '+T('hero.hp');
    document.getElementById('rest-heal-val').style.color = '';
    document.getElementById('btn-rest-cont').textContent = T('rest.camp.btn');
    Nav.go('rest-screen');
  },

  showMystery: function() {
    var floor = State.floor || 1;
    var events = [
      function(){ State.atk += 6; return { ico:'🌟', label:'+6 ATQ', msg:'Un esprit guerrier renforce ton bras !' }; },
      function(){ State.def += 5; return { ico:'🛡', label:'+5 DEF', msg:'Une armure spectrale enveloppe ton corps.' }; },
      function(){ var g=40+floor*20; State.gold=(State.gold||0)+g; return { ico:'🪙', label:'+'+g+' 🪙', msg:'Un trésor oublié dissimulé derrière une dalle !' }; },
      function(){ State.hp=State.hpMax; return { ico:'💧', label:'PV au maximum !', msg:'Une fontaine de vie restaure toutes tes forces.' }; },
      function(){ State.potions=(State.potions||0)+2; return { ico:'🧪', label:'+2 Potions', msg:'Une cache de potions abandonnée par un aventurier.' }; },
      function(){ State.hpMax+=20; State.hp=Math.min(State.hpMax,State.hp+20); return { ico:'❤', label:'+20 PV max', msg:'Une relique ancienne augmente ton endurance.' }; },
      function(){ State.def=Math.max(0,(State.def||0)-4); return { ico:'💀', label:'-4 DEF', msg:'Une malédiction s\'accroche à ton armure...' }; },
      function(){ var xpg=30+floor*15; gainXP(xpg); return { ico:'✨', label:'+'+xpg+' XP', msg:'Un grimoire antique transmet ses connaissances.' }; },
      function(){ State.atk+=3; State.def+=3; return { ico:'⚖', label:'+3 ATQ +3 DEF', msg:'Une balance mystique équilibre tes forces.' }; },
      function(){ var g=20+floor*10; State.gold=(State.gold||0)+g; State.potions=(State.potions||0)+1; return { ico:'🎒', label:'+'+g+' 🪙 +1 🧪', msg:'Un sac d\'aventurier abandonné sur le sol !' }; },
      function(){ State.hp=Math.max(1,State.hp-Math.round(State.hpMax*0.1)); State.atk+=8; return { ico:'🩸', label:'-10% PV / +8 ATQ', msg:'Un pacte de sang avec une entité sombre...' }; },
      function(){ State.potions=(State.potions||0)+1; State.hp=Math.min(State.hpMax,State.hp+Math.round(State.hpMax*0.2)); return { ico:'🌿', label:'+1 Potion +20% PV', msg:'Un sanctuaire de la nature t\'offre ses bienfaits.' }; },
      function(){ State.hpMax+=30; State.hp=Math.min(State.hpMax,State.hp+30); return { ico:'💎', label:'+30 PV max', msg:'Un cristal de vie amplifie ton essence vitale.' }; },
      function(){ State.atk+=4; State.def=Math.max(0,(State.def||0)-2); return { ico:'⚔', label:'+4 ATQ -2 DEF', msg:'Un guerrier fantôme partage ses secrets offensifs... au prix de ta garde.' }; },
      function(){ if((State.persistentStatuses||[]).length){ State.persistentStatuses=[]; return { ico:'✨', label:'Statuts dissipés !', msg:'Une lumière dorée dissipe tous tes maux.' }; } else { State.gold=(State.gold||0)+floor*30; return { ico:'🪙', label:'+'+floor*30+' 🪙', msg:'L\'air de la salle sent l\'or et la fortune.' }; } },
    ];
    var ev = events[Math.floor(Math.random()*events.length)]();
    if (typeof HUD !== 'undefined') HUD.updateGold();
    document.getElementById('rest-icon').textContent     = ev.ico;
    document.getElementById('rest-title').textContent    = T('rest.mystery.title');
    document.getElementById('rest-desc').textContent     = ev.msg;
    document.getElementById('rest-heal-val').textContent = ev.label;
    document.getElementById('btn-rest-cont').textContent = T('rest.mystery.btn');
    Nav.go('rest-screen');
  },

  showTrap: function(onContinue) {
    var dmg = Math.round(State.hpMax * 0.15);
    State.hp = Math.max(1, State.hp - dmg);
    document.getElementById('rest-icon').textContent     = '⚠';
    document.getElementById('rest-title').textContent    = T('rest.trap.title');
    document.getElementById('rest-desc').textContent     = T('rest.trap.desc');
    document.getElementById('rest-heal-val').textContent = '-'+dmg+' '+T('hero.hp');
    document.getElementById('rest-heal-val').style.color = '#e05050';
    document.getElementById('btn-rest-cont').textContent = T('rest.trap.btn');
    Rooms._trapCallback = onContinue;
    Nav.go('rest-screen');
  },

  _trapCallback: null,

  restContinue: function() {
    document.getElementById('rest-heal-val').style.color = '';
    if (Rooms._trapCallback) {
      var cb = Rooms._trapCallback;
      Rooms._trapCallback = null;
      cb();
      return;
    }
    State.hp = Math.min(State.hpMax, State.hp + (Rooms._healAmt||0));
    updateMapHpBar();
    Nav.go('dungeon-map');
  },

  _pendingItem: null,
  _healAmt: 0
};

// ── XP & NIVEAU ──────────────────────────────────────────────────
var XP_PER_LEVEL = [
  0,   // niveau 1
  40,  // niveau 2
  90,  // niveau 3
  150, // niveau 4
  230, // niveau 5
  330, // niveau 6
  450, // niveau 7
  600, // niveau 8
  780, // niveau 9
  990, // niveau 10
  1240,// niveau 11
  1530,// niveau 12
  1870,// niveau 13
  2260,// niveau 14
  2710,// niveau 15
  3230,// niveau 16
  3830,// niveau 17
  4520,// niveau 18
  5310,// niveau 19
  6210,// niveau 20
  7230,// niveau 21
  8380,// niveau 22
  9670,// niveau 23
  11120,// niveau 24
  12740,// niveau 25
  14550,// niveau 26
  16560,// niveau 27
  18790,// niveau 28
  21260,// niveau 29
  24000 // niveau 30
];

var LEVEL_UP_CHOICES = [
  { ico:'⚔', name:'Tranchant',       nameEn:'Sharpened',        desc:'+4 ATQ',           descEn:'+4 ATK',           effect:function(){ State.atk+=4; } },
  { ico:'🛡', name:'Endurci',        nameEn:'Hardened',         desc:'+5 DEF',           descEn:'+5 DEF',           effect:function(){ State.def+=5; } },
  { ico:'❤', name:'Vigueur',         nameEn:'Vigor',            desc:'+25 PV max + soin',descEn:'+25 max HP + heal',effect:function(){ State.hpMax+=25; State.hp=Math.min(State.hpMax, State.hp+25); } },
  { ico:'⚡', name:'Rapidité',       nameEn:'Quickness',        desc:'+3 ATQ +2 DEF',    descEn:'+3 ATK +2 DEF',    effect:function(){ State.atk+=3; State.def+=2; } },
  { ico:'🧪', name:'Alchimiste',     nameEn:'Alchemist',        desc:'+2 Potions',       descEn:'+2 Potions',       effect:function(){ State.potions=(State.potions||0)+2; } },
  { ico:'🩸', name:'Soif de sang',   nameEn:'Bloodthirst',      desc:'+6 ATQ −3 DEF',    descEn:'+6 ATK −3 DEF',    effect:function(){ State.atk+=6; State.def=Math.max(0,State.def-3); } },
  { ico:'🔮', name:'Arcane',         nameEn:'Arcane',           desc:'+8 ATQ (fragile)', descEn:'+8 ATK (fragile)', effect:function(){ State.atk+=8; State.hpMax=Math.max(10,State.hpMax-10); } },
  { ico:'🌿', name:'Régénération',   nameEn:'Regeneration',     desc:'+3 PV après chaque combat', descEn:'+3 HP after each fight', effect:function(){ State.regenPerFight=(State.regenPerFight||0)+3; } },
  { ico:'🎯', name:'Précision',      nameEn:'Precision',        desc:'Crit +10%',        descEn:'Crit +10%',        effect:function(){ State.critBonus=(State.critBonus||0)+0.1; } },
  { ico:'💪', name:'Force brute',     nameEn:'Brute Force',      desc:'+6 ATQ',              descEn:'+6 ATK',            effect:function(){ State.atk+=6; } },
  { ico:'🏰', name:'Fortifié',        nameEn:'Fortified',        desc:'+8 DEF',              descEn:'+8 DEF',            effect:function(){ State.def+=8; } },
  { ico:'🌊', name:'Flux vital',      nameEn:'Life Flow',        desc:'+40 PV max',          descEn:'+40 max HP',        effect:function(){ State.hpMax+=40; State.hp=Math.min(State.hpMax,State.hp+20); } },
  { ico:'⚗', name:'Grand Alchimiste',nameEn:'Grand Alchemist',  desc:'+3 Potions',          descEn:'+3 Potions',        effect:function(){ State.potions=(State.potions||0)+3; } },
  { ico:'🔥', name:'Embrasement',     nameEn:'Conflagration',    desc:'+10 ATQ −10 PV max',  descEn:'+10 ATK −10 max HP', effect:function(){ State.atk+=10; State.hpMax=Math.max(20,State.hpMax-10); } },
  { ico:'🧿', name:'Œil du destin',  nameEn:'Eye of Fate',      desc:'Crit +15%',           descEn:'Crit +15%',         effect:function(){ State.critBonus=(State.critBonus||0)+0.15; } },
  { ico:'🩸', name:'Vampirisme',      nameEn:'Vampirism',        desc:'Vol de vie +15%',     descEn:'Lifesteal +15%',    effect:function(){ Meta.bonuses.lifesteal=(Meta.bonuses.lifesteal||0)+0.15; } },
  { ico:'🌑', name:'Ombre',           nameEn:'Shadow',           desc:'+5 ATQ +5 DEF +30 PV',descEn:'+5 ATK +5 DEF +30 HP',effect:function(){ State.atk+=5;State.def+=5;State.hpMax+=30; } },
];

function refreshCombatHp() {
  if (typeof HUD !== 'undefined') HUD.updateHP();
}

function getPassive() {
  var r = RACES.find(function(x){ return x.id===State.race; });
  return r ? r.passive : null;
}

function gainXP(amount) {
  // Humain : +10% XP
  if (getPassive() === 'xp_boost') amount = Math.round(amount * 1.1);
  // Meta bonus XP
  if (Meta.bonuses.xpPct) amount = Math.round(amount * (1 + Meta.bonuses.xpPct));
  State.xp = (State.xp||0) + amount;
  State.level = State.level||1;
  var threshold = XP_PER_LEVEL[Math.min(State.level, XP_PER_LEVEL.length-1)];
  updateXPBar();
  if (State.xp >= threshold && State.level < 30) {
    State.xp -= threshold;
    State.level++;
    triggerLevelUp();
    if (typeof Achievements !== 'undefined') Achievements.check('level');
  }
}

function updateXPBar() {
  if (typeof HUD !== 'undefined') HUD.updateXP();
}

function triggerLevelUp() {
  Sfx.levelup();
  var pool = LEVEL_UP_CHOICES.slice().sort(function(){ return Math.random()-0.5; }).slice(0,3);
  document.getElementById('lu-level-num').textContent = State.level;
  var cards = document.getElementById('lu-cards');
  cards.innerHTML = '';
  pool.forEach(function(choice) {
    var d = document.createElement('div');
    d.className = 'lu-card';
    d.innerHTML = '<span class="lu-ico">'+choice.ico+'</span><div><div class="lu-name">'+(CGE_LANG==='en'&&choice.nameEn?choice.nameEn:choice.name)+'</div><div class="lu-desc">'+(CGE_LANG==='en'&&choice.descEn?choice.descEn:choice.desc)+'</div></div>';
    d.addEventListener('click', function(){
      try { choice.effect(); } catch(e){}
      try { refreshCombatHp(); } catch(e){}
      document.getElementById('levelup-overlay').classList.remove('show');
      updateXPBar();
    });
    cards.appendChild(d);
  });
  // Particle burst
  var overlay = document.getElementById('levelup-overlay');
  for (var _i=0; _i<22; _i++) {
    (function(i){
      setTimeout(function(){
        var p = document.createElement('div');
        p.className = 'lu-particle';
        var angle = (i/22)*Math.PI*2;
        var dist = 80 + Math.random()*80;
        var tx = Math.cos(angle)*dist, ty = Math.sin(angle)*dist - 40;
        var dur = 0.6 + Math.random()*0.5;
        p.style.cssText = 'left:50%;top:50%;margin:-3px;--tx:'+tx+'px;--ty:'+ty+'px;--dur:'+dur+'s';
        overlay.appendChild(p);
        setTimeout(function(){ if(p.parentNode) p.parentNode.removeChild(p); }, dur*1000+100);
      }, i*18);
    })(_i);
  }
  overlay.classList.add('show');
}

// ── MÉTA-PROGRESSION ─────────────────────────────────────────────
var META_UPGRADES = [
  { id:'atk',    ico:'⚔', name:'Forge du Héros',   nameEn:'Hero\'s Forge',      desc:'+2 ATQ de base',       descEn:'+2 base ATK',        max:5, cost:60,  effect:function(){ Meta.bonuses.atk+=2; } },
  { id:'def',    ico:'🛡', name:'Armure Ancestrale',nameEn:'Ancestral Armor',    desc:'+3 DEF de base',       descEn:'+3 base DEF',        max:5, cost:60,  effect:function(){ Meta.bonuses.def+=3; } },
  { id:'hp',     ico:'❤', name:'Constitution',     nameEn:'Constitution',       desc:'+20 PV de base',       descEn:'+20 base HP',        max:5, cost:50,  effect:function(){ Meta.bonuses.hp+=20; } },
  { id:'potion', ico:'🧪', name:'Alchimie',         nameEn:'Alchemy',            desc:'+1 Potion de départ',  descEn:'+1 starting Potion', max:3, cost:80,  effect:function(){ Meta.bonuses.potions+=1; } },
  { id:'gold',   ico:'🪙', name:'Commerce',         nameEn:'Commerce',           desc:'+20% or gagné',        descEn:'+20% gold earned',   max:3, cost:100, effect:function(){ Meta.bonuses.goldPct+=0.2; } },
  { id:'crit',   ico:'🎯', name:'Instinct Meurtrier',nameEn:'Killer Instinct',   desc:'+5% chance critique',  descEn:'+5% crit chance',    max:4, cost:90,  effect:function(){ Meta.bonuses.crit+=0.05; } },
  { id:'dodge',  ico:'💨', name:'Esquive',           nameEn:'Evasion',           desc:'+5% esquiver une attaque', descEn:'+5% chance to dodge an attack', max:3, cost:100, effect:function(){ Meta.bonuses.dodge=(Meta.bonuses.dodge||0)+0.05; } },
  { id:'timer',  ico:'⏱', name:'Réflexes',          nameEn:'Reflexes',          desc:'+1s au chrono de combat',  descEn:'+1s on the combat timer', max:3, cost:80,  effect:function(){ Meta.bonuses.timerBonus=(Meta.bonuses.timerBonus||0)+1; } },
  { id:'lifesteal',ico:'🩸',name:'Vampirisme',       nameEn:'Vampirism',         desc:'Récupère 10% des dégâts infligés', descEn:'Recover 10% of damage dealt', max:3, cost:120, effect:function(){ Meta.bonuses.lifesteal=(Meta.bonuses.lifesteal||0)+0.10; } },
  { id:'regen',  ico:'🌿', name:'Régénération',      nameEn:'Regeneration',      desc:'+3 PV après chaque victoire', descEn:'+3 HP after each victory', max:5, cost:60, effect:function(){ Meta.bonuses.regenMeta=(Meta.bonuses.regenMeta||0)+3; } },
  { id:'xpBoost',ico:'✨', name:'Sagesse',           nameEn:'Wisdom',            desc:'+10% XP par combat',       descEn:'+10% XP per fight',  max:3, cost:90,  effect:function(){ Meta.bonuses.xpPct=(Meta.bonuses.xpPct||0)+0.10; } },
  { id:'startGold',ico:'💰',name:'Fortune',          nameEn:'Fortune',           desc:'+25 or au départ',         descEn:'+25 starting gold',  max:4, cost:80,  effect:function(){ Meta.bonuses.startGold=(Meta.bonuses.startGold||0)+25; } },
];

// ── QUESTS ────────────────────────────────────────────────────────
// ── MODIFICATEURS DE RUN ─────────────────────────────────────────
var RUN_MODIFIERS = [
  { id:'curse_atk',  ico:'💀', name:'Malédiction de faiblesse', nameEn:'Curse of Weakness',   desc:'-20% ATQ ce run',        descEn:'-20% ATK this run',      bad:true,  apply:function(){ State.atk=Math.max(1,Math.round(State.atk*0.8)); } },
  { id:'curse_def',  ico:'💀', name:'Armure maudite',           nameEn:'Cursed Armor',        desc:'-20% DEF ce run',        descEn:'-20% DEF this run',      bad:true,  apply:function(){ State.def=Math.max(0,Math.round(State.def*0.8)); } },
  { id:'curse_hp',   ico:'💀', name:'Cœur fragile',             nameEn:'Fragile Heart',       desc:'-15% PV max ce run',     descEn:'-15% max HP this run',   bad:true,  apply:function(){ State.hpMax=Math.max(10,Math.round(State.hpMax*0.85)); State.hp=Math.min(State.hp,State.hpMax); } },
  { id:'curse_flee', ico:'🔒', name:'Pas de fuite',             nameEn:'No Escape',           desc:'Impossible de fuir',     descEn:'Cannot flee',            bad:true,  apply:function(){ State.fleeBonus=-1; } },
  { id:'curse_shop', ico:'💸', name:'Marché maudit',            nameEn:'Cursed Market',       desc:'Shops 50% plus chers',   descEn:'Shops 50% more expensive', bad:true,  apply:function(){ State._shopMod=(State._shopMod||1)*1.5; } },
  { id:'bless_gold', ico:'🪙', name:'Fortune',                  nameEn:'Fortune',             desc:'+60% or ce run',         descEn:'+60% gold this run',     bad:false, apply:function(){ State._runGoldBonus=(State._runGoldBonus||1)*1.6; } },
  { id:'bless_atk',  ico:'⚔', name:'Rage guerrière',           nameEn:'Battle Rage',         desc:'+20% ATQ ce run',        descEn:'+20% ATK this run',      bad:false, apply:function(){ State.atk=Math.round(State.atk*1.2); } },
  { id:'bless_xp',   ico:'✨', name:'Illumination',             nameEn:'Enlightenment',       desc:'+30% XP ce run',         descEn:'+30% XP this run',       bad:false, apply:function(){ State._runXpBonus=(State._runXpBonus||1)*1.3; } },
  { id:'bless_pot',  ico:'🧪', name:'Alchimiste inspiré',       nameEn:'Inspired Alchemist',  desc:'+2 Potions de départ',   descEn:'+2 starting Potions',    bad:false, apply:function(){ State.potions=(State.potions||0)+2; } },
  { id:'bless_hp',   ico:'❤', name:'Vitalité débordante',      nameEn:'Overflowing Vitality',desc:'+20% PV max ce run',     descEn:'+20% max HP this run',   bad:false, apply:function(){ State.hpMax=Math.round(State.hpMax*1.2); State.hp=State.hpMax; } },
  { id:'bless_crit', ico:'🎯', name:'Vision critique',          nameEn:'Critical Vision',     desc:'+10% chances critique',  descEn:'+10% crit chance',       bad:false, apply:function(){ State.critBonus=(State.critBonus||0)+0.1; } },
];

var RunMods = (function(){
  var _onConfirm = null;
  return {
    roll: function(onConfirm) {
      _onConfirm = onConfirm;
      var bad  = RUN_MODIFIERS.filter(function(m){ return m.bad; });
      var good = RUN_MODIFIERS.filter(function(m){ return !m.bad; });
      var picked = [];
      if (bad.length)  picked.push(bad[Math.floor(Math.random()*bad.length)]);
      if (good.length) picked.push(good[Math.floor(Math.random()*good.length)]);
      var list = document.getElementById('runmod-list');
      if (!list) { if (onConfirm) onConfirm(); return; }
      list.innerHTML = '';
      var _rmTitle = document.getElementById('runmod-title'); if (_rmTitle) _rmTitle.textContent = '⚠ ' + T('runmod.title');
      var _rmSub = document.getElementById('runmod-subtitle'); if (_rmSub) _rmSub.textContent = T('runmod.sub');
      var _rmBtn = document.getElementById('runmod-btn'); if (_rmBtn) _rmBtn.textContent = T('runmod.btn');
      picked.forEach(function(m){
        var d = document.createElement('div');
        d.className = 'runmod-card '+(m.bad?'bad':'good');
        d.innerHTML = '<div class="runmod-ico">'+m.ico+'</div><div><div class="runmod-name">'+(CGE_LANG==='en'&&m.nameEn?m.nameEn:m.name)+'</div><div class="runmod-desc">'+(CGE_LANG==='en'&&m.descEn?m.descEn:m.desc)+'</div></div>';
        list.appendChild(d);
      });
      var ov = document.getElementById('runmod-overlay');
      ov.style.display = 'flex'; ov.style.opacity = '0';
      setTimeout(function(){ ov.style.opacity='1'; }, 20);
      RunMods._picked = picked;
    },
    confirm: function() {
      var ov = document.getElementById('runmod-overlay');
      ov.style.opacity = '0';
      setTimeout(function(){ ov.style.display='none'; }, 300);
      (RunMods._picked||[]).forEach(function(m){ try{ m.apply(); }catch(e){} });
      RunMods._picked = [];
      if (_onConfirm) { var cb=_onConfirm; _onConfirm=null; cb(); }
    },
  };
})();

// ── STORY QUESTS (débloquées uniquement via PNJ / déclencheurs) ────
var QUEST_DEFS = [

  // ═══ ACTE I — L'ÉTRANGER ═══════════════════════════════════════

  // Marta (auto-déclenchée à la première arrivée)
  { id:'marta_debt', npc:'marta', act:1,
    title:'La Dette', titleEn:'The Debt',
    desc:'Marta t\'a soigné trois jours. Tu lui dois 50 pièces d\'or.\nRends-lui ce que tu lui dois.',
    descEn:'Marta nursed you for three days. You owe her 50 gold.\nRepay what you owe.',
    check:function(){ return (State.gold||0)>=50; },
    reward:{ gold:0, _deduct:50 },
    rewardTxt:'Ta liberté — et peut-être une piste.',
    rewardTxtEn:'Your freedom — and perhaps a lead.',
    claimText:'Marta hoche la tête, soulagée. "Bien. Je me demandais si tu allais fuir comme les autres."\nElle se penche vers toi, voix basse.\n"La Lyonnesse — la taverne en face. Il y a des gens là-bas qui t\'ont demandé. Des gens qui te connaissent, apparemment."\nElle marque une pause.\n"Ou qui prétendent te connaître."'
  },

  // Bertrand — chap 1 : la rencontre
  { id:'bertrand_1', npc:'bertrand', act:1,
    title:'Méfiance', titleEn:'Mistrust',
    desc:'Bertrand affirme t\'avoir vu sur la route de Thornwall il y a trois semaines — tu courais. Mais il n\'a pas l\'air prêt à tout dire. Prouve que tu sais survivre.\n→ Tue 25 créatures.',
    descEn:'Bertrand claims to have seen you on the road to Thornwall three weeks ago — you were running. But he\'s not ready to talk. Prove you can survive.\n→ Kill 25 creatures.',
    check:function(){ return (Meta.totalKills||0)>=25; },
    reward:{ gold:30 },
    rewardTxt:'30 🪙',
    rewardTxtEn:'30 🪙',
    claimText:'"Pas mal. Tu sais te battre."\nIl s\'assoit en face de toi et baisse la voix.\n"Je t\'ai vu il y a trois semaines. Sur la Route des Pierres. Tu courais vers la ville, sans arme, sans manteau. Tu regardais derrière toi comme si le diable te poursuivait."\n\n"Quand tu t\'es écroulé devant L\'Écu Brisé... on a pensé que tu étais mort."\n\n"Ce qui me trouble... c\'est que dans ta main serrée, tu tenais un parchemin. Marta l\'a gardé quelque part."\n\nNouvelle quête disponible : parle à Oswin.'
  },

  // Oswin — chap 1 : la prophétie
  { id:'oswin_1', npc:'oswin', act:1,
    unlockAfter:'bertrand_1',
    title:'L\'Éveillé', titleEn:'The Awakened',
    desc:'Oswin dit avoir une chanson sur toi — une prophétie ancienne qui parle d\'un étranger sans mémoire.\nPour savoir si c\'est bien toi : atteins l\'étage 5 d\'un donjon et complète 3 runs.',
    descEn:'Oswin claims to have a song about you — an ancient prophecy of a stranger with no memory.\nTo know if it\'s really you: reach floor 5 and complete 3 runs.',
    check:function(){ return (Meta.bestFloor||0)>=5 && (Meta.totalRuns||0)>=3; },
    reward:{ gold:60 },
    rewardTxt:'60 🪙',
    rewardTxtEn:'60 🪙',
    claimText:'"Tu es revenu. Bien."\nOswin pose sa luth et te regarde différemment — plus de sourire.\n"La chanson s\'appelle *La Ballade de l\'Éveillé*. Elle date de cent ans. Elle décrit quelqu\'un qui revient d\'entre les morts, sans nom, sans passé."\n\n"Elle décrit aussi les Cryptes Éternelles — les vraies, pas les vieilles caves que tu arpentes. Des Cryptes qui respirent. Qui se souviennent."\n\n"Il y a une femme ici qui en sait plus que moi. Séraphine. Elle t\'observe depuis ton arrivée."'
  },

  // Séraphine — chap 1 : l'aura
  { id:'seraphine_1', npc:'seraphine', act:1,
    unlockAfter:'oswin_1',
    title:'Le Fragment d\'Âme', titleEn:'The Soul Fragment',
    desc:'Séraphine affirme détecter quelque chose d\'anormal dans ton aura — une signature magique qui ne devrait plus exister depuis cent ans.\nPour qu\'elle puisse l\'analyser : nettoie 2 zones entières.',
    descEn:'Séraphine claims to detect something abnormal in your aura — a magical signature that should not exist anymore.\nFor her to analyse it: clear 2 full zones.',
    check:function(){ return Object.keys(Meta.clearedZones||{}).length>=2; },
    reward:{ gold:100 }, alignReward:+1,
    rewardTxt:'100 🪙 + une vérité',
    rewardTxtEn:'100 🪙 + a truth',
    claimText:'"Je m\'en doutais."\nSéraphine referme son grimoire et te fixe.\n"L\'aura que tu portes... elle appartient à quelqu\'un qui est mort il y a exactement cent ans. Quelqu\'un qui s\'appelait l\'Éveillé — comme dans la chanson d\'Oswin."\n\n"Ce n\'est pas une coïncidence. Tu portes un fragment de son âme. Peut-être tout son être, transféré dans un nouveau corps."\n\nElle hésite.\n"Si c\'est vrai... alors tu te rappelles peut-être des choses, sans savoir d\'où elles viennent. Des réflexes. Des peurs irrationnelles. Des visages que tu n\'as jamais vus."\n\n"Et si c\'est vrai... quelqu\'un d\'autre le sait aussi. Et cette personne ne veut pas que tu descendes dans les vraies Cryptes."'
  },

  // ═══ ACTE II — LE FILS DU NÉANT ═════════════════════════════════

  // Bertrand — chap 2 : le passé qui revient
  { id:'bertrand_2', npc:'bertrand', act:2,
    unlockAfter:'seraphine_1',
    title:'La Mémoire des Pierres', titleEn:'The Memory of Stones',
    desc:'Bertrand a quelque chose à te montrer — le parchemin qu\'on a trouvé dans ta main à ton arrivée. Mais d\'abord il veut savoir si tu peux vraiment survivre aux profondeurs.\n→ Atteins l\'étage 8 d\'un donjon et accomplis 8 expéditions.',
    descEn:'Bertrand has something to show you — the parchment found in your hand when you arrived. But first he wants to know you can truly survive the depths.\n→ Reach floor 8 and complete 8 expeditions.',
    check:function(){ return (Meta.bestFloor||0)>=8 && (Meta.totalRuns||0)>=8; },
    reward:{ gold:150 },
    rewardTxt:'150 🪙 + le parchemin',
    rewardTxtEn:'150 🪙 + the scroll',
    claimText:'"Tu es allé au bout. Bien."\nBertrand sort un petit rouleau de parchemin froissé, jauni.\n"On l\'a trouvé dans ta main. On ne comprend pas l\'écriture — ce n\'est pas une langue connue."\n\nTu le déplie. Et quelque chose en toi... reconnaît les symboles. Pas consciemment. Mais tes yeux s\'arrêtent sur une phrase, et sans même réfléchir tu murmures :\n\n*"Le sceau tient encore. Pour combien de temps ?"*\n\n"Tu viens de lire ça ?", dit Bertrand, blême.\n\n"Je... je ne sais pas comment."'
  },

  // Oswin — chap 2 : le livre
  { id:'oswin_2', npc:'oswin', act:2,
    unlockAfter:'bertrand_2',
    title:'La Ballade des Ruines', titleEn:'The Ballad of the Ruins',
    desc:'Oswin a retrouvé des archives dans les Ruines de l\'Ancien Monde — il prétend y avoir vu un portrait qui te ressemble.\nNettoie les Ruines pour confirmer.',
    descEn:'Oswin found archives in the Ruins of the Old World — he claims to have seen a portrait that looks like you.\nClear the Ruins to confirm.',
    check:function(){ return !!(Meta.clearedZones||{})['ruines']; },
    reward:{ gold:200 },
    rewardTxt:'200 🪙 + une révélation',
    rewardTxtEn:'200 🪙 + a revelation',
    claimText:'"Tu l\'as vu, n\'est-ce pas ?"\nOswin sort un carnet couvert de notes.\n"Le portrait dans la bibliothèque des Ruines. *Il te ressemble trait pour trait.*"\n\n"Le titre du livre sous le portrait : *Mémoires de l\'Éveillé, gardien du Sceau, an 847.*"\n\n"Nous sommes en 947. Il y a cent ans exactement."\n\nOswin marque une pause. Il n\'a plus du tout l\'air d\'un barde joyeux.\n\n"Il y a quelque chose que je ne t\'ai pas dit. Quelque chose que... tu mérites de savoir. Mais pas ici. Pas maintenant. Viens me voir quand tu auras parlé à Séraphine."'
  },

  // Séraphine — chap 2 : la prison
  { id:'seraphine_2', npc:'seraphine', act:2,
    unlockAfter:'oswin_2',
    title:'Ce Qui Est Enfermé', titleEn:'What Lies Imprisoned',
    desc:'Séraphine a trouvé quelque chose dans les archives secrètes de la Guilde des Mages — quelque chose sur les vraies Cryptes Éternelles.\nAccomplis 20 expéditions pour gagner sa confiance totale.',
    descEn:'Séraphine found something in the secret archives of the Mage Guild — something about the true Eternal Crypts.\nComplete 20 expeditions to earn her full trust.',
    check:function(){ return (Meta.totalRuns||0)>=20; },
    reward:{ gold:300 },
    rewardTxt:'300 🪙 + la vérité',
    rewardTxtEn:'300 🪙 + the truth',
    claimText:'"Assieds-toi. Ce que je vais te dire ne quitte pas cette table."\n\nSéraphine te verse du vin.\n\n"Les Cryptes Éternelles ne sont pas un donjon. Ce sont les fondations d\'une PRISON. Construite il y a mille ans pour enfermer quelque chose que les gens appelaient le Dieu de la Mémoire."\n\n"Un être qui se nourrissait des souvenirs. Des identités. Il pouvait effacer une civilisation entière — pas en la tuant, mais en lui faisant oublier qu\'elle avait existé."\n\n"L\'Éveillé du siècle passé a renforcé le sceau au prix de sa propre existence. Il est devenu *une partie du verrou*."\n\n"Toi... tu es soit son successeur désigné. Soit la clé que quelqu\'un utilise pour l\'ouvrir."\n\nElle te regarde dans les yeux.\n\n"Et je commence à penser qu\'Oswin n\'est pas vraiment un barde."'
  },

  // ═══ ACTE III — LA VÉRITÉ ════════════════════════════════════════

  // Bertrand — chap 3 : l'héritage
  { id:'bertrand_3', npc:'bertrand', act:3,
    unlockAfter:'seraphine_2',
    title:'Le Sang des Gardiens', titleEn:'Blood of the Wardens',
    desc:'Bertrand a quelque chose à avouer — sur sa famille et les Cryptes. Mais d\'abord il veut voir si tu peux t\'en sortir contre les créatures les plus redoutables.\n→ Tue 200 monstres.',
    descEn:'Bertrand has a confession — about his family and the Crypts. But first he wants to see if you can handle the most fearsome creatures.\n→ Kill 200 monsters.',
    check:function(){ return (Meta.totalKills||0)>=200; },
    reward:{ gold:400 }, alignReward:+1,
    rewardTxt:'400 🪙',
    rewardTxtEn:'400 🪙',
    claimText:'"Mon grand-père était gardien des Cryptes. Un des derniers."\nBertrand s\'essuie les mains sur son tablier, nerveux.\n"Il m\'a dit, avant de mourir : *si un étranger arrive sans mémoire, fuis. Ou aide-le. Les deux sont dangereux.*"\n\n"Je suis resté. J\'ai choisi de t\'aider."\n\n"Il m\'a dit aussi autre chose. Que le Dieu de la Mémoire a des *Voix* dans le monde — des agents qui servent depuis des siècles, qui ne vieillissent pas, qui préparent sa libération."\n\n"Ces Voix... elles se font passer pour des gens ordinaires. Des aubergistes. Des marchands. Des bardes."\n\nIl te regarde droit dans les yeux.\n\n"Fais attention à Oswin."'
  },

  // Oswin — chap 3 : le masque
  { id:'oswin_3', npc:'oswin', act:3,
    unlockAfter:'bertrand_3',
    title:'La Voix du Dieu', titleEn:'The Voice of the God',
    desc:'Oswin t\'a demandé de venir le voir. Mais quelque chose a changé dans son regard.\nAffronte-toi à toi-même : nettoie 5 zones différentes et accomplis 30 expéditions.',
    descEn:'Oswin has asked you to come see him. But something has changed in his gaze.\nConfront yourself: clear 5 different zones and complete 30 expeditions.',
    check:function(){ return Object.keys(Meta.clearedZones||{}).length>=5 && (Meta.totalRuns||0)>=30; },
    reward:{ gold:0 }, alignReward:-1,
    rewardTxt:'Une révélation',
    rewardTxtEn:'A revelation',
    claimText:'"Tu commences à comprendre."\nOswin ne joue plus la comédie. Sa voix a changé — plus profonde, presque distante.\n"Oui. Je suis une Voix. Je sers depuis cent quarante ans."\n\n"Mais écoute-moi avant de te mettre en colère."\n\n"Je ne suis pas ton ennemi. Je suis... las. Cent quarante ans à servir un dieu que je n\'ai jamais vu. Je voulais juste... que quelqu\'un descende dans les Cryptes et règle ça. Dans un sens ou dans l\'autre."\n\n"La vérité : tu peux renforcer le sceau, comme l\'Éveillé du passé. Ou tu peux libérer le Dieu de la Mémoire — et il nous effacera tous. Ou peut-être qu\'il sera différent maintenant. Peut-être qu\'une prison d\'un siècle l\'a changé."\n\n"Séraphine te dira quoi faire. Moi... je suis fatigué de choisir pour les autres."'
  },

  // Séraphine — chap 3 : le dernier choix
  { id:'seraphine_3', npc:'seraphine', act:3,
    unlockAfter:'oswin_3',
    title:'Le Verrou ou la Clé', titleEn:'The Lock or the Key',
    desc:'Séraphine sait comment descendre dans les vraies Cryptes Éternelles. Mais le chemin demande une préparation totale.\n→ Atteins le niveau 25, nettoie 6 zones et accomplis 20 expéditions.',
    descEn:'Séraphine knows how to descend into the true Eternal Crypts. But the path requires total preparation.\n→ Reach level 25, clear 6 zones and complete 20 expeditions.',
    check:function(){ return (State.level||1)>=25 && Object.keys(Meta.clearedZones||{}).length>=6 && (Meta.totalRuns||0)>=20; },
    reward:{ gold:1000 }, alignReward:+1,
    rewardTxt:'1000 🪙 + accès aux Cryptes',
    rewardTxtEn:'1000 🪙 + access to the Crypts',
    claimText: function() {
      var ch = State._introChoices || {};
      var closing = ch.trait === 'void'
        ? '"Toi qui ne ressens rien... peut-être que c\'est une force. Pas une faiblesse."'
        : ch.trait === 'cold'
        ? '"Toi qui portes le froid en toi... les Cryptes ne te feront pas peur. Elles t\'appartiennent presque déjà."'
        : '"Toi qui as souffert dès le premier instant... tu sais déjà quel prix ça coûte de tenir."';
      return '"Tu es prêt."\nSéraphine sort un cristal noir de son manteau.\n"Ceci ouvre le dernier niveau des Cryptes. Là où l\'Éveillé a tout sacrifié."\n\n"Quand tu descendras, des souvenirs te reviendront. Pas les tiens — les siens. Les tiens sont peut-être les mêmes."\n\n"À un moment, tu auras le choix : poser le cristal sur l\'autel et renforcer le sceau, ou le briser et libérer ce qui est en dessous."\n\n"Je t\'ai tout dit ce que je sais. Le reste... c\'est à toi."\n\nElle pose sa main sur ton épaule.\n'+closing;
    }
  },

  // ═══ ACTE IV — L'ÉVEILLÉ ════════════════════════════════════════
  // Quête spéciale : retourner dans les Grottes pour trouver le passage
  { id:'retour_grottes', npc:'seraphine', act:4,
    unlockAfter:'seraphine_3',
    title:'Le Début de Tout', titleEn:'Where It All Began',
    desc:'Séraphine pressent quelque chose — là où tout a commencé pour toi, un secret que tu n\'as pas encore percé.\nRetourne à l\'endroit de ton premier éveil. Cherche ce qui ne devrait pas être là.\n→ Cherche le passage caché.',
    descEn:'Séraphine senses something — where it all began for you, a secret not yet uncovered.\nReturn to the place of your first awakening. Look for what should not be there.\n→ Find the hidden passage.',
    check:function(){ return !!(Meta.passageFound); },
    reward:{ gold:0 },
    rewardTxt:'Le passage',
    rewardTxtEn:'The passage',
    claimText:'"Tu l\'as trouvé."\nSéraphine ferme les yeux un instant.\n"J\'ai cherché pendant vingt ans ce que tu as trouvé en quelques minutes. Peut-être que certaines portes ne s\'ouvrent que pour les bonnes personnes."\n\nElle te regarde.\n\n"Qu\'est-ce qu\'il y a de l\'autre côté ?"'
  },

  // ═══ QUÊTES DE CLASSE ════════════════════════════════════════════

  // Guerrier
  { id:'guerrier_1', npc:'aldric', act:1,
    title:'L\'Épreuve du Guerrier',
    desc:'Capitaine Aldric veut voir si tu tiens la ligne.\n→ Tue 30 créatures.',
    condition:function(){ return State.cls==='Guerrier'; },
    check:function(){ return (Meta.totalKills||0)>=30; },
    reward:{ gold:40 }, rankReward:1,
    rewardTxt:'40 🪙 + Reconnaissance',
    rewardTxtEn:'40 🪙 + Gratitude',
    claimText:'"Pas mal. Tu sais te battre comme un vrai soldat."\nAldric t\'évalue du regard.\n"La ville commence à te connaître. C\'est un début."'
  },
  { id:'guerrier_2', npc:'aldric', act:2,
    unlockAfter:'guerrier_1',
    title:'Le Défenseur',
    desc:'Aldric te confie une mission plus difficile.\n→ Tue 100 créatures.',
    condition:function(){ return State.cls==='Guerrier'; },
    check:function(){ return (Meta.totalKills||0)>=100; },
    reward:{ gold:120 }, rankReward:1,
    rewardTxt:'120 🪙 + Honneur',
    rewardTxtEn:'120 🪙 + Honor',
    claimText:'"Tu mérites ce titre." Il pose la main sur ton épaule.\n"Les gens te respectent maintenant. Ça compte plus que tu ne le crois."'
  },

  // Mage
  { id:'mage_1', npc:'elise', act:1,
    title:'L\'Arcaniste',
    desc:'Sœur Élise veut voir la portée de tes pouvoirs.\n→ Tue 20 créatures.',
    condition:function(){ return State.cls==='Mage'; },
    check:function(){ return (Meta.totalKills||0)>=20; },
    reward:{ gold:40 }, rankReward:1,
    rewardTxt:'40 🪙 + Reconnaissance',
    rewardTxtEn:'40 🪙 + Gratitude',
    claimText:'"Tes pouvoirs sont réels."\nÉlise croise les mains.\n"L\'Église note ceux qui agissent avec force et discernement."'
  },
  { id:'mage_2', npc:'elise', act:2,
    unlockAfter:'mage_1',
    title:'Le Maître des Arcanes',
    desc:'Élise souhaite voir jusqu\'où tu peux aller.\n→ Tue 80 créatures.',
    condition:function(){ return State.cls==='Mage'; },
    check:function(){ return (Meta.totalKills||0)>=80; },
    reward:{ gold:100 }, rankReward:1,
    rewardTxt:'100 🪙 + Honneur',
    rewardTxtEn:'100 🪙 + Honor',
    claimText:'"La ville parle de toi."\nElle sourit légèrement.\n"Tu t\'es fait un nom. Protège-le."'
  },

  // Chasseur
  { id:'chasseur_1', npc:'bertrand', act:1,
    title:'Le Traqueur',
    desc:'Bertrand veut voir si tu peux naviguer les zones dangereuses.\n→ Tue 25 créatures.',
    condition:function(){ return State.cls==='Chasseur'; },
    check:function(){ return (Meta.totalKills||0)>=25; },
    reward:{ gold:35 }, rankReward:1,
    rewardTxt:'35 🪙 + Reconnaissance',
    rewardTxtEn:'35 🪙 + Gratitude',
    claimText:'"Un chasseur qui revient toujours."\nBertrand approuve.\n"Les gens commencent à te voir différemment."'
  },
  { id:'chasseur_2', npc:'bertrand', act:2,
    unlockAfter:'chasseur_1',
    title:'Le Grand Chasseur',
    desc:'Bertrand veut te confier une mission d\'envergure.\n→ Tue 90 créatures.',
    condition:function(){ return State.cls==='Chasseur'; },
    check:function(){ return (Meta.totalKills||0)>=90; },
    reward:{ gold:110 }, rankReward:1,
    rewardTxt:'110 🪙 + Honneur',
    rewardTxtEn:'110 🪙 + Honor',
    claimText:'"On parle de toi dans les tavernes voisines."\nIl lève son verre.\n"Tu mérites ça."'
  },

  // Assassin
  { id:'assassin_1', npc:'oswin', act:1,
    title:'L\'Ombre',
    desc:'Oswin a entendu des choses sur toi. Il veut des preuves.\n→ Tue 20 créatures.',
    condition:function(){ return State.cls==='Assassin'; },
    check:function(){ return (Meta.totalKills||0)>=20; },
    reward:{ gold:35 }, rankReward:1,
    rewardTxt:'35 🪙 + Reconnaissance',
    rewardTxtEn:'35 🪙 + Gratitude',
    claimText:'"*sifflote doucement*\nLes rumeurs sont vraies, alors."\nOswin te regarde différemment.\n"Tu commences à exister aux yeux de cette ville. Dangereusement."'
  },
  { id:'assassin_2', npc:'oswin', act:2,
    unlockAfter:'assassin_1',
    title:'La Lame dans l\'Ombre',
    desc:'Oswin veut voir jusqu\'où tu peux aller.\n→ Tue 85 créatures.',
    condition:function(){ return State.cls==='Assassin'; },
    check:function(){ return (Meta.totalKills||0)>=85; },
    reward:{ gold:105 }, rankReward:1,
    rewardTxt:'105 🪙 + Honneur',
    rewardTxtEn:'105 🪙 + Honor',
    claimText:'"Les gens chuchotent ton nom."\nIl reprend sa luth.\n"Certains avec admiration. D\'autres avec peur. Les deux font une réputation."'
  },

  // Prêtre
  { id:'pretre_1', npc:'elise', act:1,
    title:'Le Serviteur de la Lumière',
    desc:'Sœur Élise te confie une mission de purification.\n→ Tue 15 créatures.',
    condition:function(){ return State.cls==='Prêtre' || State.cls==='Pretre'; },
    check:function(){ return (Meta.totalKills||0)>=15; },
    reward:{ gold:30 }, rankReward:1,
    rewardTxt:'30 🪙 + Reconnaissance',
    rewardTxtEn:'30 🪙 + Gratitude',
    claimText:'"La lumière t\'a guidé."\nÉlise pose les mains ensemble.\n"L\'Église reconnaît ton service. La ville aussi."'
  },
  { id:'pretre_2', npc:'elise', act:2,
    unlockAfter:'pretre_1',
    title:'Le Gardien des Âmes',
    desc:'Élise te confie une mission plus grande encore.\n→ Tue 75 créatures.',
    condition:function(){ return State.cls==='Prêtre' || State.cls==='Pretre'; },
    check:function(){ return (Meta.totalKills||0)>=75; },
    reward:{ gold:95 }, rankReward:1,
    rewardTxt:'95 🪙 + Honneur',
    rewardTxtEn:'95 🪙 + Honor',
    claimText:'"Tu protèges ceux qui ne peuvent pas se défendre."\nSon regard est doux mais ferme.\n"C\'est pour cela qu\'on te respecte."'
  },

  // Barbare
  { id:'barbare_1', npc:'aldric', act:1,
    title:'La Fureur des Plaines',
    desc:'Aldric veut voir si tu peux contrôler ta rage.\n→ Tue 35 créatures.',
    condition:function(){ return State.cls==='Barbare'; },
    check:function(){ return (Meta.totalKills||0)>=35; },
    reward:{ gold:45 }, rankReward:1,
    rewardTxt:'45 🪙 + Reconnaissance',
    rewardTxtEn:'45 🪙 + Gratitude',
    claimText:'"J\'ai vu des guerriers s\'effondrer là où tu tiens."\nAldric croise les bras.\n"La ville parle de toi. Pas toujours avec douceur. Mais elle parle."'
  },
  { id:'barbare_2', npc:'aldric', act:2,
    unlockAfter:'barbare_1',
    title:'Le Seigneur de la Fureur',
    desc:'Aldric veut que tu prouves que tu es une légende vivante.\n→ Tue 110 créatures.',
    condition:function(){ return State.cls==='Barbare'; },
    check:function(){ return (Meta.totalKills||0)>=110; },
    reward:{ gold:130 }, rankReward:1,
    rewardTxt:'130 🪙 + Honneur',
    rewardTxtEn:'130 🪙 + Honor',
    claimText:'"Les chansons qu\'on compose sur les barbares parlent rarement de quelqu\'un de vivant."\nIl te serre la main fermement.\n"Tu mérites ton rang."'
  },

  // Cryptes finales (débloqué après retour_grottes)
  { id:'cryptes_final', npc:'bertrand', act:4,
    unlockAfter:'retour_grottes',
    title:'Les Cryptes Éternelles', titleEn:'The Eternal Crypts',
    desc:'Tu as le cristal de Séraphine. Le chemin vers les vraies Cryptes est ouvert.\nDescends jusqu\'au dernier étage.\n→ Accomplis 30 expéditions et atteins le niveau 30.',
    descEn:'You have Séraphine\'s crystal. The path to the true Crypts is open.\nDescend to the final floor.\n→ Complete 30 expeditions and reach level 30.',
    check:function(){ return (Meta.totalRuns||0)>=30 && (State.level||1)>=30; },
    reward:{ gold:2000, potions:10 },
    rewardTxt:'2000 🪙 + 10 🧪 + la fin de l\'histoire',
    rewardTxtEn:'2000 🪙 + 10 🧪 + the end of the story',
    claimText: function() {
      var ch = State._introChoices || {};
      var race = State.race || 'Humain';
      var align = Meta.computeAlign();
      var choice = State._finalChoice || (align >= 2 ? 'gardien' : align <= -2 ? 'vide' : 'liberateur');

      // ── FIN : LE GARDIEN ───────────────────────────────────────────
      if (choice === 'gardien') {
        var gardienRace = race === 'Orc'
          ? '"Un Orc qui choisit de protéger. Ça, personne ne l\'avait prédit."'
          : race === 'Elfe'
          ? '"La prophétie disait qu\'un Elfe reviendrait. Elle ne disait pas qu\'il choisirait de rester."'
          : race === 'Nain'
          ? '"Les anciens de ta montagne auraient été fiers. Quelqu\'un des profondeurs — pour garder ce que les autres oublient."'
          : '"Tu n\'avais rien quand tu es arrivé. Et tu as quand même choisi de tout donner."';
        return '— Le Dieu de la Mémoire lève les yeux sur toi. Sa voix est calme, presque douce.\n\n"Tu n\'as pas changé. Tu t\'es juste souvenu."\n\nIl se tait un instant.\n\n"L\'Éveillé du siècle passé a fait le même choix. Dans la même pièce. Avec les mêmes mains qui tremblaient."\n\n"Pose le cristal sur l\'autel. Le sceau tiendra cent ans de plus. Et quelqu\'un d\'autre viendra après toi — comme tu es venu après lui."\n\nBertrand lève son verre, seul dans la taverne.\n\n'+gardienRace+'\n\n"À l\'Éveillé. Le Gardien."';
      }

      // ── FIN : LE VIDE ──────────────────────────────────────────────
      if (choice === 'vide') {
        var videRace = race === 'Orc'
          ? '"On dit que les Orcs ne ressentent rien. Je savais que c\'était faux. Mais toi... tu l\'as peut-être cru."'
          : race === 'Elfe'
          ? '"Les Elfes vivent si longtemps qu\'ils finissent par oublier pourquoi. Je comprends."'
          : race === 'Nain'
          ? '"Les profondeurs t\'ont pris quelque chose. Avant même que tu arrives ici."'
          : '"Tu n\'es pas venu chercher des réponses. Tu le sais maintenant."';
        return '— Le Dieu de la Mémoire te regarde longuement. Pas avec colère. Avec quelque chose qui ressemble à de la reconnaissance.\n\n"Tu n\'es pas revenu pour des réponses."\n\nIl se lève lentement.\n\n"Tu es revenu pour finir ce que tu avais commencé. Mourir vraiment."\n\n"L\'Éveillé du siècle passé avait la même chose dans les yeux, à la fin. Ce vide."\n\n"Brise le cristal. Laisse le sceau s\'effondrer. Ça n\'a plus d\'importance pour toi — et peut-être que c\'est la seule honnêteté qui reste."\n\nBertrand fixe son verre vide sans rien dire.\n\n'+videRace+'\n\n"Il est parti. Comme il était venu."';
      }

      // ── FIN : LE LIBÉRATEUR (align entre -1 et +1) ─────────────────
      var libRace = race === 'Orc'
        ? '"Un Orc qui libère ce que les humains avaient emprisonné. Je ne sais pas si c\'est de la sagesse ou de la folie."'
        : race === 'Elfe'
        ? '"Tu as entendu quelque chose dans le silence des Cryptes. Quelque chose que les autres n\'entendaient pas."'
        : race === 'Nain'
        ? '"Les profondeurs t\'ont parlé. Et tu as écouté — pas par obéissance. Par curiosité."'
        : '"Tu n\'es venu ni pour protéger ni pour détruire. Tu es venu parce que tu voulais savoir."';
      return '— Le Dieu de la Mémoire incline légèrement la tête.\n\n"Tu n\'es pas venu pour protéger. Tu es venu pour ouvrir."\n\nIl sourit — pas comme un dieu. Comme quelqu\'un qui attendait depuis longtemps.\n\n"J\'ai passé cent ans dans cette prison. J\'ai eu le temps de réfléchir à ce que j\'avais fait."\n\n"Peut-être que je suis différent maintenant. Peut-être pas. Mais toi... tu as choisi de ne pas décider à ma place."\n\n"Brise le cristal. Et on verra ensemble ce qui arrive."\n\nBertrand lève son verre lentement.\n\n'+libRace+'\n\n"À l\'Éveillé. Celui qui a choisi l\'inconnu."';
    }
  },
];

// English claimText for quests (kept separate to avoid bloating QUEST_DEFS)
var QUEST_CLAIM_EN = {
  marta_debt: 'Marta nods, relieved. "Good. I was wondering if you\'d run like the others."\nShe leans toward you, voice low.\n"The Lyonnesse — the tavern across the way. There are people there who asked about you. People who apparently know you."\nShe pauses.\n"Or who claim to know you."',
  bertrand_1: '"Not bad. You know how to fight."\nHe sits down across from you and lowers his voice.\n"I saw you three weeks ago. On the Stone Road. You were running toward the town, no weapon, no cloak. Looking behind you as if the devil was chasing you."\n\n"When you collapsed in front of The Broken Shield... we thought you were dead."\n\n"What troubles me... is that in your clenched hand, you were holding a scroll. Marta kept it somewhere."\n\nNew quest available: talk to Oswin.',
  oswin_1: '"You came back. Good."\nOswin sets down his lute and looks at you differently — no more smiling.\n"The song is called *The Ballad of the Awakened*. It\'s a hundred years old. It describes someone who returns from the dead, with no name, no past."\n\n"It also describes the Eternal Crypts — the real ones, not the old caves you\'ve been exploring. Crypts that breathe. That remember."\n\n"There\'s a woman here who knows more than I do. Séraphine. She\'s been watching you since you arrived."',
  seraphine_1: '"I suspected as much."\nSéraphine closes her grimoire and fixes you with her gaze.\n"The aura you carry... it belongs to someone who died exactly a hundred years ago. Someone called the Awakened — like in Oswin\'s song."\n\n"This is no coincidence. You carry a fragment of their soul. Perhaps their entire being, transferred into a new body."\n\nShe hesitates.\n"If that\'s true... then you may remember things without knowing where they come from. Reflexes. Irrational fears. Faces you\'ve never seen."\n\n"And if that\'s true... someone else knows it too. And that someone does not want you descending into the true Crypts."',
  bertrand_2: '"You went all the way. Good."\nBertrand produces a small crumpled, yellowed scroll.\n"We found it in your hand. We can\'t make out the writing — it\'s not a known language."\n\nYou unfold it. And something in you... recognises the symbols. Not consciously. But your eyes stop on one phrase, and without even thinking you whisper:\n\n*"The seal still holds. For how long?"*\n\n"You just read that?", says Bertrand, pale.\n\n"I... I don\'t know how."',
  oswin_2: '"You found it, didn\'t you?"\nOswin pulls out a notebook covered in notes.\n"The portrait in the Ruins library. *It looks exactly like you.*"\n\n"The title of the book beneath the portrait: *Memoirs of the Awakened, Guardian of the Seal, year 847.*"\n\n"We are in 947. Exactly a hundred years ago."\n\nOswin pauses. He no longer looks like a cheerful bard at all.\n\n"There\'s something I haven\'t told you. Something that... you deserve to know. But not here. Not now. Come see me once you\'ve spoken to Séraphine."',
  seraphine_2: '"Sit down. What I\'m about to tell you does not leave this table."\n\nSéraphine pours you wine.\n\n"The Eternal Crypts are not a dungeon. They are the foundations of a PRISON. Built a thousand years ago to contain something people called the God of Memory."\n\n"A being that fed on memories. On identities. It could erase an entire civilisation — not by killing it, but by making it forget it had ever existed."\n\n"The Awakened of the past century reinforced the seal at the cost of their own existence. They became *part of the lock*."\n\n"You... are either their designated successor. Or the key someone is using to open it."\n\nShe looks you in the eyes.\n\n"And I\'m beginning to think Oswin isn\'t really a bard."',
  bertrand_3: '"My grandfather was a guardian of the Crypts. One of the last."\nBertrand wipes his hands on his apron, nervous.\n"He told me, before he died: *if a stranger arrives with no memory, flee. Or help them. Both are dangerous.*"\n\n"I stayed. I chose to help you."\n\n"He also told me something else. That the God of Memory has *Voices* in the world — agents who have served for centuries, who don\'t age, who prepare his liberation."\n\n"These Voices... they pass themselves off as ordinary people. Innkeepers. Merchants. Bards."\n\nHe looks you straight in the eye.\n\n"Watch out for Oswin."',
  oswin_3: '"You\'re starting to understand."\nOswin drops the act. His voice has changed — deeper, almost distant.\n"Yes. I am a Voice. I\'ve been serving for a hundred and forty years."\n\n"But listen to me before you get angry."\n\n"I\'m not your enemy. I\'m... tired. A hundred and forty years serving a god I\'ve never seen. I just wanted... someone to descend into the Crypts and settle it. One way or another."\n\n"The truth: you can reinforce the seal, like the Awakened of the past. Or you can free the God of Memory — and he\'ll erase us all. Or maybe he\'ll be different now. Maybe a century of imprisonment has changed him."\n\n"Séraphine will tell you what to do. Me... I\'m tired of choosing for others."',
  retour_grottes: '"You found it."\nSéraphine closes her eyes for a moment.\n"I spent twenty years searching for what you found in minutes. Perhaps certain doors only open for the right people."\n\nShe looks at you.\n\n"What\'s on the other side?"',
  guerrier_1: '"Not bad. You know how to fight like a real soldier."\nAldric sizes you up.\n"The town is starting to know who you are. It\'s a beginning."',
  guerrier_2: '"You deserve this title." He places a hand on your shoulder.\n"People respect you now. That means more than you think."',
  mage_1: '"Your powers are real."\nÉlise folds her hands.\n"The Church takes note of those who act with force and discernment."',
  mage_2: '"The town is talking about you."\nShe smiles slightly.\n"You\'ve made a name for yourself. Protect it."',
  chasseur_1: '"A hunter who always comes back."\nBertrand nods approvingly.\n"People are starting to see you differently."',
  chasseur_2: '"They\'re talking about you in the neighbouring taverns."\nHe raises his glass.\n"You\'ve earned it."',
  assassin_1: '"*whistles softly*\nThe rumours are true, then."\nOswin looks at you differently.\n"You\'re starting to exist in the eyes of this town. Dangerously so."',
  assassin_2: '"People are whispering your name."\nHe picks up his lute again.\n"Some with admiration. Others with fear. Both make a reputation."',
  pretre_1: '"Light guided you."\nÉlise places her hands together.\n"The Church acknowledges your service. And so does the town."',
  pretre_2: '"You protect those who cannot protect themselves."\nHer gaze is gentle but firm.\n"That is why people respect you."',
  barbare_1: '"I\'ve seen warriors crumble where you hold firm."\nAldric crosses his arms.\n"The town is talking about you. Not always gently. But it\'s talking."',
  barbare_2: '"The songs written about barbarians rarely feature someone still living."\nHe shakes your hand firmly.\n"You\'ve earned your rank."',
  seraphine_3: function() {
    var ch = State._introChoices || {};
    var closing = ch.trait === 'void'
      ? '"You who feel nothing... perhaps that\'s a strength. Not a weakness."'
      : ch.trait === 'cold'
      ? '"You who carry coldness within you... the Crypts won\'t frighten you. They almost belong to you already."'
      : '"You who suffered from the very first moment... you already know what it costs to hold on."';
    return '"You\'re ready."\nSéraphine draws a black crystal from her cloak.\n"This opens the final level of the Crypts. Where the Awakened sacrificed everything."\n\n"When you descend, memories will return to you. Not yours — theirs. Yours may be the same."\n\n"At some point, you will have a choice: place the crystal on the altar and reinforce the seal, or shatter it and free what lies beneath."\n\n"I\'ve told you everything I know. The rest... is up to you."\n\nShe places her hand on your shoulder.\n'+closing;
  },
  cryptes_final: function() {
    var race = State.race || 'Humain';
    var align = Meta.computeAlign();
    var choice = State._finalChoice || (align >= 2 ? 'gardien' : align <= -2 ? 'vide' : 'liberateur');
    if (choice === 'gardien') {
      var gRace = race === 'Orc'
        ? '"An Orc who chooses to protect. No one predicted that."'
        : race === 'Elfe'
        ? '"The prophecy said an Elf would return. It didn\'t say they would choose to stay."'
        : race === 'Nain'
        ? '"The elders of your mountain would have been proud. Someone from the depths — to guard what others forget."'
        : '"You had nothing when you arrived. And you chose to give everything anyway."';
      return '— The God of Memory raises his eyes to you. His voice is calm, almost gentle.\n\n"You haven\'t changed. You just remembered."\n\nHe falls silent for a moment.\n\n"The Awakened of the past century made the same choice. In the same room. With the same trembling hands."\n\n"Place the crystal on the altar. The seal will hold for another hundred years. And someone else will come after you — as you came after them."\n\nBertrand raises his glass, alone in the tavern.\n\n'+gRace+'\n\n"To the Awakened. The Guardian."';
    }
    if (choice === 'vide') {
      var vRace = race === 'Orc'
        ? '"They say Orcs feel nothing. I knew that was false. But you... perhaps you believed it."'
        : race === 'Elfe'
        ? '"Elves live so long they eventually forget why. I understand."'
        : race === 'Nain'
        ? '"The depths took something from you. Before you even arrived here."'
        : '"You didn\'t come looking for answers. You know that now."';
      return '— The God of Memory watches you for a long time. Not with anger. With something resembling recognition.\n\n"You didn\'t come back for answers."\n\nHe rises slowly.\n\n"You came back to finish what you started. To truly die."\n\n"The Awakened of the past century had the same thing in their eyes, at the end. That void."\n\n"Shatter the crystal. Let the seal collapse. It no longer matters to you — and perhaps that\'s the only honesty that remains."\n\nBertrand stares at his empty glass in silence.\n\n'+vRace+'\n\n"They\'re gone. As they came."';
    }
    var lRace = race === 'Orc'
      ? '"An Orc freeing what humans had imprisoned. I don\'t know if that\'s wisdom or madness."'
      : race === 'Elfe'
      ? '"You heard something in the silence of the Crypts. Something the others couldn\'t hear."'
      : race === 'Nain'
      ? '"The depths spoke to you. And you listened — not out of obedience. Out of curiosity."'
      : '"You came neither to protect nor to destroy. You came because you wanted to know."';
    return '— The God of Memory tilts his head slightly.\n\n"You didn\'t come to protect. You came to open."\n\nHe smiles — not like a god. Like someone who has waited a long time.\n\n"I spent a hundred years in this prison. I had time to think about what I had done."\n\n"Perhaps I\'m different now. Perhaps not. But you... you chose not to decide for me."\n\n"Shatter the crystal. And we\'ll see together what happens."\n\nBertrand raises his glass slowly.\n\n'+lRace+'\n\n"To the Awakened. The one who chose the unknown."';
  },
};

// Resolve claimText with EN support
function resolveClaimText(def) {
  if (CGE_LANG === 'en') {
    var enFn = def.claimTextEn;
    if (typeof enFn === 'function') return enFn();
    if (typeof enFn === 'string') return enFn;
    var enStr = QUEST_CLAIM_EN[def.id];
    if (typeof enStr === 'function') return enStr();
    if (typeof enStr === 'string') return enStr;
  }
  return typeof def.claimText === 'function' ? def.claimText() : (def.claimText || T('quest.done'));
}

// Quelles quêtes sont débloquées (visibles au PNJ) ?
function isQuestUnlocked(q) {
  if (!q.unlockAfter) return true;
  return !!((Meta.completedQuests||{})[q.unlockAfter]);
}

var NPC_DATA = {
  bertrand: {
    name:'Bertrand',
    dialogue: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        if (race === 'Orc') return '"Hé. On sert tout le monde ici, c\'est la règle."\nIl te regarde par-dessus son verre.\n"Mais je te surveille."';
        if (race === 'Elfe') return '"Un Elfe, dans cette taverne."\nIl incline la tête légèrement.\n"Ça fait longtemps que votre peuple n\'est pas venu par ici."';
        if (race === 'Nain') return '"Un Nain ! Excellent. Qu\'est-ce que tu veux boire ?"\nIl claque la table.\n"J\'ai du brassin des mines du Nord."';
        return '"Tu es nouveau en ville ? Commande quelque chose ou laisse ta place."';
      }
      if (!done['bertrand_1']) {
        if (race === 'Orc') return '"Je t\'ai vu. Sur la route — un Orc qui court seul, de nuit."\nIl plisse les yeux.\n"Quelqu\'un te poursuivait ? Ou tu fuyais quelque chose d\'autre ?\n\nProuve-moi que tu n\'es pas comme les autres."';
        if (race === 'Elfe') return '"Je t\'ai reconnu. Tes yeux. J\'ai vu ce regard une fois, sur une Elfe mourante dans les Cryptes."\n\n"Elle m\'a dit quelque chose avant de mourir. Prouve-moi que tu mérites que je te le répète."';
        if (race === 'Nain') return '"Bon, tu traînes encore ici."\nIl lève son verre avec un sourire.\n"Un Nain qui survit dans ces cryptes, ça mérite le respect. Montre-moi que t\'es sérieux."';
        return '"Je t\'ai vu quelque part. Sur la route, il y a trois semaines. Tu courais."\n\nIl marque une pause, vous étudie.\n\n"Je te parlerai davantage quand tu me prouveras que tu n\'es pas un lâche."';
      }
      if (!done['oswin_1'])    return '"Vas parler à Oswin. Il a l\'air idiot mais il sait des choses."';
      if (!done['seraphine_1'])return '"Séraphine te cherchait tout à l\'heure. Elle a l\'air de te connaître."';
      if (!done['bertrand_2']) return '"Tu progresses. Reviens quand tu auras vu le fond d\'un vrai donjon. J\'ai quelque chose pour toi."';
      if (!done['oswin_2'])    return '"Parle à Oswin. Il a trouvé quelque chose dans les ruines."';
      if (!done['seraphine_2'])return '"Séraphine peut t\'expliquer ce que signifie ce parchemin. Fais-lui confiance."';
      if (!done['bertrand_3']) return '"Mon grand-père disait que les vrais ennemis sourient le plus."';
      if (!done['oswin_3'])    return '"Fais attention à Oswin. Ce n\'est pas ce qu\'il prétend être."';
      if (!done['seraphine_3'])return '"Séraphine peut t\'ouvrir le chemin. Va lui parler."';
      if (!done['retour_grottes']) return '"Séraphine dit qu\'il faut retourner là où tu as commencé."\n\nIl baisse la voix.\n\n"Je sais, tu connais déjà ces endroits. Mais... cherche ce que tu n\'as pas encore cherché. Il y a quelque chose que tu as manqué."';
      if (!done['cryptes_final']) return '"Tu l\'as trouvé ? Le passage ?"\n\nIl se lève.\n\n"Alors va. Ce que tu feras là-bas... ça nous concerne tous."';
      return '"Tu as accompli ce que personne n\'osait faire, ami. Je lèverai mon verre à ta santé pour le reste de mes jours."';
    },
    dialogueEn: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        if (race === 'Orc') return '"Hey. We serve everyone here, that\'s the rule."\nHe eyes you over his glass.\n"But I\'m watching you."';
        if (race === 'Elfe') return '"An Elf, in this tavern."\nHe tilts his head slightly.\n"It\'s been a long time since your people passed through here."';
        if (race === 'Nain') return '"A Dwarf! Excellent. What will you have?"\nHe slaps the table.\n"I\'ve got a brew from the Northern mines."';
        return '"New in town? Order something or give up your seat."';
      }
      if (!done['bertrand_1']) {
        if (race === 'Orc') return '"I saw you. On the road — an Orc running alone, at night."\nHe narrows his eyes.\n"Was someone chasing you? Or were you running from something else?\n\nProve to me you\'re not like the others."';
        if (race === 'Elfe') return '"I recognised you. Your eyes. I\'ve seen that look once before, on a dying Elf in the Crypts."\n\n"She told me something before she died. Prove to me you deserve to hear it."';
        if (race === 'Nain') return '"Still hanging around, are you."\nHe raises his glass with a smile.\n"A Dwarf who survives these crypts deserves respect. Show me you\'re serious."';
        return '"I\'ve seen you somewhere. On the road, three weeks ago. You were running."\n\nHe pauses, studying you.\n\n"I\'ll say more when you prove you\'re not a coward."';
      }
      if (!done['oswin_1'])    return '"Go talk to Oswin. He seems like a fool but he knows things."';
      if (!done['seraphine_1'])return '"Séraphine was looking for you earlier. She seems to know you."';
      if (!done['bertrand_2']) return '"You\'re progressing. Come back once you\'ve reached the depths of a real dungeon. I have something for you."';
      if (!done['oswin_2'])    return '"Talk to Oswin. He found something in the ruins."';
      if (!done['seraphine_2'])return '"Séraphine can explain what that scroll means. Trust her."';
      if (!done['bertrand_3']) return '"My grandfather used to say that real enemies smile the most."';
      if (!done['oswin_3'])    return '"Be careful with Oswin. He\'s not what he claims to be."';
      if (!done['seraphine_3'])return '"Séraphine can open the way for you. Go talk to her."';
      if (!done['retour_grottes']) return '"Séraphine says you need to return to where you started."\n\nHe lowers his voice.\n\n"I know, you already know those places. But... look for what you haven\'t found yet. There\'s something you missed."';
      if (!done['cryptes_final']) return '"You found it? The passage?"\n\nHe stands up.\n\n"Then go. What you do in there... it concerns all of us."';
      return '"You\'ve done what no one else dared, friend. I\'ll raise my glass to you for the rest of my days."';
    }
  },
  oswin: {
    name:'Oswin',
    dialogue: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        if (race === 'Orc') return '"*continue à jouer sans lever les yeux*\nUn Orc dans une taverne. Rien d\'inhabituel.\n\n*une note fausse*\n\nSi. Un peu."';
        if (race === 'Elfe') return '"*s\'arrête de jouer*\nTu entends la musique différemment, n\'est-ce pas ?\nLes Elfes l\'entendent toujours différemment."';
        if (race === 'Nain') return '"*joue plus fort*\nPour toi, ami Nain ! Les chansons des mines méritent d\'être honorées !"';
        return '"*accorde sa luth sans te regarder*\nJe joue, tu écoutes. C\'est comme ça que ça marche."';
      }
      if (!done['bertrand_1']) {
        if (race === 'Orc') return '"*te regarde par-dessus sa luth*\nBertrand t\'a parlé ? Bien.\nIl y a quelque chose en toi qui transcende la race, ami. Je ne sais pas encore quoi."';
        if (race === 'Elfe') return '"Tu sais... la chanson dont je parle — elle était écrite en elfique.\nIl y a cent ans, quelqu\'un l\'a traduite. Elle parle de toi, je crois."';
        if (race === 'Nain') return '"Bertrand t\'a orienté vers moi ? Il a du flair.\nJe connais une chanson naine. Très ancienne. Elle mentionne les Cryptes — et quelqu\'un comme toi."';
        return '"*te regarde longuement*\nIl y a quelque chose dans tes yeux. Quelque chose que je reconnais sans savoir d\'où."\n\nIl replonge dans sa musique, pensif.';
      }
      if (!done['oswin_1'])     return '"Tu viens de la part de Bertrand ? Bien."\n\nIl baisse sa luth.\n\n"J\'ai une chanson. Vieille de cent ans. Elle parle de quelqu\'un qui ressemble étrangement à toi."';
      if (!done['seraphine_1']) return '"Tu devrais aller voir Séraphine. Elle a l\'air bizarre, oui. Mais elle sait des choses sur les Cryptes que personne d\'autre ne sait."';
      if (!done['bertrand_2'])  return '"*joue doucement*\nLe parchemin que Bertrand garde... demande-le lui. Il est temps."';
      if (!done['oswin_2'])     return '"Je suis allé dans les Ruines. J\'ai vu quelque chose qui m\'a troublé. Reviens me voir quand tu les auras nettoyées."';
      if (!done['seraphine_2']) return '"Ce que j\'ai à te dire peut attendre que Séraphine t\'ait tout expliqué."';
      if (!done['bertrand_3'])  return '"Bertrand sait plus qu\'il ne dit. Sa famille est liée à tout ça."';
      if (!done['oswin_3'])     return '"*te regarde dans les yeux sans sourire*\nIl est temps que je sois honnête avec toi."';
      if (!done['retour_grottes']) {
        return '"*pose sa luth*\nTu veux savoir où aller maintenant ?"\n\nIl hésite longuement, regardant ses mains.\n\n"Pense à ton premier pas sur cette terre. Ce que tu portais. Ce que tu fuyais."\n\n"La réponse est dans les fondations. Cherche ce que tu n\'aurais pas pu voir avant."';
      }
      if (!done['cryptes_final']) return '"*hoche la tête*\nTu l\'as trouvé. Bien.\n\nJe joue une dernière chanson ce soir — pour toi. Pour ce que tu vas faire."';
      return '"*soupir*\nJe suis fatigué, ami. Cent quarante ans de mensonges, c\'est long.\nJe joue juste de la musique maintenant. Vraiment."';
    },
    dialogueEn: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        if (race === 'Orc') return '"*keeps playing without looking up*\nAn Orc in a tavern. Nothing unusual.\n\n*a wrong note*\n\nWell. A little."';
        if (race === 'Elfe') return '"*stops playing*\nYou hear music differently, don\'t you?\nElves always hear it differently."';
        if (race === 'Nain') return '"*plays louder*\nFor you, friend Dwarf! The songs of the mines deserve to be honoured!"';
        return '"*tunes his lute without looking at you*\nI play, you listen. That\'s how it works."';
      }
      if (!done['bertrand_1']) {
        if (race === 'Orc') return '"*looks at you over his lute*\nBertrand spoke to you? Good.\nThere\'s something in you that transcends race, friend. I don\'t know what yet."';
        if (race === 'Elfe') return '"You know... the song I\'m talking about — it was written in Elvish.\nA hundred years ago, someone translated it. It speaks of you, I think."';
        if (race === 'Nain') return '"Bertrand sent you to me? He has a good nose.\nI know a Dwarven song. Very old. It mentions the Crypts — and someone like you."';
        return '"*watches you for a long moment*\nThere\'s something in your eyes. Something I recognise without knowing where from."\n\nHe drifts back into his music, thoughtful.';
      }
      if (!done['oswin_1'])     return '"You come from Bertrand? Good."\n\nHe lowers his lute.\n\n"I have a song. A hundred years old. It speaks of someone who looks strangely like you."';
      if (!done['seraphine_1']) return '"You should go see Séraphine. She seems odd, yes. But she knows things about the Crypts that no one else does."';
      if (!done['bertrand_2'])  return '"*plays softly*\nThe scroll Bertrand keeps... ask him for it. It\'s time."';
      if (!done['oswin_2'])     return '"I went to the Ruins. I saw something that troubled me. Come back once you\'ve cleared them."';
      if (!done['seraphine_2']) return '"What I have to tell you can wait until Séraphine has explained everything."';
      if (!done['bertrand_3'])  return '"Bertrand knows more than he lets on. His family is tied to all of this."';
      if (!done['oswin_3'])     return '"*looks you in the eyes without smiling*\nIt\'s time I was honest with you."';
      if (!done['retour_grottes']) {
        return '"*sets down his lute*\nYou want to know where to go now?"\n\nHe hesitates, looking at his hands.\n\n"Think of your first step on this earth. What you carried. What you were running from."\n\n"The answer is in the foundations. Look for what you couldn\'t have seen before."';
      }
      if (!done['cryptes_final']) return '"*nods*\nYou found it. Good.\n\nI\'ll play one last song tonight — for you. For what you\'re about to do."';
      return '"*sighs*\nI\'m tired, friend. A hundred and forty years of lies is a long time.\nI\'m just playing music now. Really."';
    }
  },
  marta: {
    name:'Marta',
    dialogue: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        var gold = State.gold||0;
        if (gold >= 50) {
          if (race === 'Orc') return '"Tu as les 50 pièces ? Bien."\nElle recule d\'un pas en prenant l\'argent.\n"Je n\'ai rien contre votre peuple. Juste... faites attention à ce que les autres voient."';
          if (race === 'Elfe') return '"Tu as les pièces ? Inattendu."\nElle accepte avec un regard méfiant.\n"Les Elfes règlent toujours leurs dettes. Je vais me souvenir de ça."';
          if (race === 'Nain') return '"Bien, bien ! Un Nain qui honore sa parole — comme toujours."\nElle prend les pièces avec un sourire.\n"Ta réputation te précède."';
          return '"Tu as les 50 pièces ?"\nElle tend la main.\n"Bien. Et maintenant... laisse-moi te dire quelque chose."';
        }
        if (race === 'Orc') return '"Je sais pas pourquoi je t\'ai gardé ici. Les autres clients posent des questions."\nElle baisse la voix.\n"Tu me dois '+(50-gold)+' pièces. Reviens vite."';
        if (race === 'Elfe') return '"Un Elfe en dette... on m\'avait prévenue."\nElle t\'observe.\n"'+(50-gold)+' pièces. Et la prochaine fois, tu paies d\'avance."';
        if (race === 'Nain') return '"Un Nain qui ne paie pas ? Ça m\'étonne."\nElle sourit malgré elle.\n"Il te manque '+(50-gold)+' pièces, ami. Va les gagner."';
        return '"Toujours en dette, je vois. Tu me dois '+(50-gold)+' pièces de plus.\nVa gagner de quoi payer. L\'auberge n\'est pas une charité."';
      }
      if (race === 'Orc') return '"Tu as remboursé. Ça mérite le respect."\nElle te sert sans rechigner.\n"Les autres se calmeront. Donne-leur du temps."';
      if (race === 'Elfe') return '"Ta dette est effacée. Et... tu as été à la hauteur."\nElle te regarde différemment.\n"La Lyonnesse — Bertrand te connaît peut-être."';
      return '"Tu n\'as plus de dette ici. Tu peux rester aussi longtemps que tu veux."\nElle essuie le comptoir.\n"La Lyonnesse, en face. Si quelqu\'un te connaît... ils seront là-bas."';
    },
    dialogueEn: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        var gold = State.gold||0;
        if (gold >= 50) {
          if (race === 'Orc') return '"You have the 50 coins? Good."\nShe takes a step back as she takes the money.\n"I have nothing against your people. Just... be mindful of what others see."';
          if (race === 'Elfe') return '"You have the coins? Unexpected."\nShe accepts with a wary look.\n"Elves always settle their debts. I\'ll remember that."';
          if (race === 'Nain') return '"Good, good! A Dwarf who honours his word — as always."\nShe takes the coins with a smile.\n"Your reputation precedes you."';
          return '"You have the 50 coins?"\nShe holds out her hand.\n"Good. Now... let me tell you something."';
        }
        if (race === 'Orc') return '"I don\'t know why I kept you here. The other guests are asking questions."\nShe lowers her voice.\n"You owe me '+(50-gold)+' coins. Come back soon."';
        if (race === 'Elfe') return '"An Elf in debt... I was warned."\nShe watches you.\n"'+(50-gold)+' coins. And next time, you pay in advance."';
        if (race === 'Nain') return '"A Dwarf who doesn\'t pay? That surprises me."\nShe smiles despite herself.\n"You\'re '+(50-gold)+' coins short, friend. Go earn them."';
        return '"Still in debt, I see. You owe me '+(50-gold)+' more coins.\nGo earn enough to pay. The inn is not a charity."';
      }
      if (race === 'Orc') return '"You paid up. That deserves respect."\nShe serves you without complaint.\n"The others will come around. Give them time."';
      if (race === 'Elfe') return '"Your debt is cleared. And... you lived up to it."\nShe looks at you differently.\n"The Lyonnesse — Bertrand might know you."';
      return '"You have no debt here anymore. You can stay as long as you like."\nShe wipes the counter.\n"The Lyonnesse, across the way. If anyone knows you... they\'ll be there."';
    }
  },
  seraphine: {
    name:'Séraphine',
    dialogue: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        if (race === 'Orc') return '"*sans lever les yeux*\nL\'aura d\'un Orc est toujours plus... brute.\n\nMais la tienne...\n\n*enfin, elle te regarde*\n\nInattendue."';
        if (race === 'Elfe') return '"*se lève immédiatement*\nTu es Elfe. Et tu portes quelque chose d\'ancien.\n\nAssieds-toi. Je dois vérifier quelque chose."';
        if (race === 'Nain') return '"*consulte son grimoire sans s\'arrêter*\nLes Nains ont une résonance particulière avec les pierres des Cryptes.\nC\'est probablement pourquoi tu es encore en vie."';
        return '"*lève à peine les yeux de son grimoire*\nTu es celui dont parle Oswin ? Intéressant. Reviens quand tu seras moins... vague."';
      }
      if (!done['bertrand_1']) {
        if (race === 'Orc') return '"Je sens quelque chose sur toi. Une aura ancienne — pas humaine, pas elfique.\n\nOrque ?\nOui. Mais altérée. Par quelque chose que tu n\'as pas encore compris."';
        if (race === 'Elfe') return '"Cette aura — je l\'ai lue dans un vieux texte.\nIl parlait d\'un Elfe qui revenait.\n\nPas réincarné. Rappelé. C\'est différent."';
        return '"Je sens quelque chose sur toi. Une aura ancienne. Mais je ne peux pas encore en parler.\nParle aux autres d\'abord."';
      }
      if (!done['oswin_1'])     return '"Oswin t\'a-t-il parlé de la prophétie ? Non ? Va le voir."';
      if (!done['seraphine_1']) {
        var frag = race === 'Orc' ? 'un fragment des Cryptes — les Orcs ont un lien naturel avec les pierres profondes. Tu reconnaîtras ce que tu cherches.'
          : race === 'Elfe' ? 'un fragment des Cryptes. Ton sang elfe te guidera vers lui — écoute ce que les pierres chantent.'
          : race === 'Nain' ? 'un fragment des Cryptes. Creuse. Ton instinct nain te dira où chercher.'
          : 'un fragment des Cryptes. Nettoie une zone entière.';
        return '"Bien. Oswin m\'a prévenue que tu viendrais."\n\n"L\'aura que tu dégages... elle n\'appartient pas à ce siècle. Je dois l\'analyser."\n\n"Rapporte-moi '+frag+'"';
      }
      if (!done['bertrand_2'])  return '"Bertrand détient quelque chose d\'important. Il est temps qu\'il te fasse confiance."';
      if (!done['oswin_2'])     return '"Oswin a parlé d\'un portrait dans les Ruines. Je pense savoir ce que c\'est. Va l\'aider à vérifier."';
      if (!done['seraphine_2']) return '"Ce que j\'ai découvert dans les archives... c\'est plus grave que ce que je pensais.\nReviens me voir quand Oswin t\'aura tout dit sur le livre."';
      if (!done['bertrand_3'])  return '"Il faut que Bertrand te parle de sa famille. C\'est important pour comprendre l\'histoire complète."';
      if (!done['oswin_3'])     return '"*voix grave*\nOswin est une Voix du Dieu. Tu le sais maintenant.\nMais laisse-lui le temps de se confesser lui-même."';
      if (!done['seraphine_3']) return '"Tu es prêt à entendre la suite ?"';
      if (!done['retour_grottes']) return '"Je sens que la réponse n\'est pas ici."\n\nElle ferme les yeux, concentrée.\n\n"Il y a un endroit... là où tout a commencé pour toi. Quelque chose n\'était pas visible avant. Retournes-y. Cherche ce que tu n\'aurais pas pu voir la première fois."';
      if (!done['cryptes_final']) return '"Tu l\'as trouvé."\n\nElle souffle lentement.\n\n"Va. Ne t\'arrête pas. Ce qui t\'attend là-bas... c\'est pour ça que tu t\'es réveillé ici il y a tout ce temps."';
      var ending = race === 'Orc' ? 'Ta force a toujours été réelle. C\'est ta brutalité qui était un mensonge qu\'on t\'avait enseigné.'
        : race === 'Elfe' ? 'Tu es revenu comme prévu. Mais tu as choisi différemment. C\'est ça qui change tout.'
        : race === 'Nain' ? 'Les anciens de ta montagne avaient raison. Il fallait que ce soit quelqu\'un des profondeurs.'
        : 'Tu n\'étais personne de particulier. Et tu as quand même réussi. C\'est peut-être ça, le vrai miracle.';
      return '"Le cristal est dans tes mains maintenant. Le reste t\'appartient."\n\nElle te regarde avec quelque chose qui ressemble à de la fierté.\n\n"'+ending+'"';
    },
    dialogueEn: function() {
      var done = Meta.completedQuests||{};
      var race = State.race||'Humain';
      if (!done['marta_debt']) {
        if (race === 'Orc') return '"*without looking up*\nAn Orc\'s aura is always more... raw.\n\nBut yours...\n\n*she finally looks at you*\n\nUnexpected."';
        if (race === 'Elfe') return '"*stands up immediately*\nYou\'re an Elf. And you carry something ancient.\n\nSit down. I need to verify something."';
        if (race === 'Nain') return '"*consults her grimoire without stopping*\nDwarves have a particular resonance with the stones of the Crypts.\nIt\'s probably why you\'re still alive."';
        return '"*barely looks up from her grimoire*\nYou\'re the one Oswin speaks of? Interesting. Come back when you\'re less... vague."';
      }
      if (!done['bertrand_1']) {
        if (race === 'Orc') return '"I sense something on you. An ancient aura — not human, not elven.\n\nOrc?\nYes. But altered. By something you haven\'t understood yet."';
        if (race === 'Elfe') return '"This aura — I read it in an old text.\nIt spoke of an Elf who returned.\n\nNot reincarnated. Recalled. It\'s different."';
        return '"I sense something on you. An ancient aura. But I can\'t speak of it yet.\nTalk to the others first."';
      }
      if (!done['oswin_1'])     return '"Has Oswin told you about the prophecy? No? Go see him."';
      if (!done['seraphine_1']) {
        var frag = race === 'Orc' ? 'a fragment of the Crypts — Orcs have a natural bond with the deep stones. You\'ll recognise what you\'re looking for.'
          : race === 'Elfe' ? 'a fragment of the Crypts. Your elven blood will guide you — listen to what the stones sing.'
          : race === 'Nain' ? 'a fragment of the Crypts. Dig. Your Dwarven instinct will tell you where.'
          : 'a fragment of the Crypts. Clear an entire zone.';
        return '"Good. Oswin warned me you would come."\n\n"The aura you carry... it doesn\'t belong to this century. I need to analyse it."\n\n"Bring me '+frag+'"';
      }
      if (!done['bertrand_2'])  return '"Bertrand holds something important. It\'s time he trusted you."';
      if (!done['oswin_2'])     return '"Oswin mentioned a portrait in the Ruins. I think I know what it is. Go help him verify."';
      if (!done['seraphine_2']) return '"What I discovered in the archives... it\'s more serious than I thought.\nCome back once Oswin has told you everything about the book."';
      if (!done['bertrand_3'])  return '"Bertrand needs to tell you about his family. It\'s important to understand the full story."';
      if (!done['oswin_3'])     return '"*grave voice*\nOswin is a Voice of the God. You know that now.\nBut give him time to confess it himself."';
      if (!done['seraphine_3']) return '"Are you ready to hear the rest?"';
      if (!done['retour_grottes']) return '"I sense the answer isn\'t here."\n\nShe closes her eyes, concentrating.\n\n"There\'s a place... where everything began for you. Something wasn\'t visible before. Go back. Look for what you couldn\'t have seen the first time."';
      if (!done['cryptes_final']) return '"You found it."\n\nShe exhales slowly.\n\n"Go. Don\'t stop. What awaits you there... that\'s why you woke up here all that time ago."';
      var ending = race === 'Orc' ? 'Your strength was always real. It was your brutality that was a lie they taught you.'
        : race === 'Elfe' ? 'You came back as foreseen. But you chose differently. That\'s what changes everything.'
        : race === 'Nain' ? 'The elders of your mountain were right. It had to be someone from the depths.'
        : 'You were nobody special. And you succeeded anyway. Maybe that\'s the real miracle.';
      return '"The crystal is in your hands now. The rest belongs to you."\n\nShe looks at you with something resembling pride.\n\n"'+ending+'"';
    }
  },
  aldric: {
    name:'Capitaine Aldric',
    dialogue: function() {
      var done = Meta.completedQuests||{};
      var cls = State.cls||'Guerrier';
      if (cls === 'Guerrier' || cls === 'Barbare') {
        if (!done['guerrier_1'] && !done['barbare_1']) return '"Hmm. Un combattant, à ce que je vois.\nMontrez-moi de quoi vous êtes capable avant qu\'on parle."';
        return '"Vous avancez bien. La ville vous respecte davantage chaque jour."';
      }
      return '"Je ne traite pas avec n\'importe qui. Revenez quand vous aurez fait vos preuves."';
    },
    dialogueEn: function() {
      var done = Meta.completedQuests||{};
      var cls = State.cls||'Guerrier';
      if (cls === 'Guerrier' || cls === 'Barbare') {
        if (!done['guerrier_1'] && !done['barbare_1']) return '"Hmm. A fighter, I see.\nShow me what you\'re made of before we talk."';
        return '"You\'re progressing well. The town respects you more each day."';
      }
      return '"I don\'t deal with just anyone. Come back when you\'ve proven yourself."';
    }
  },
  elise: {
    name:'Sœur Élise',
    dialogue: function() {
      var done = Meta.completedQuests||{};
      var cls = State.cls||'Guerrier';
      if (cls === 'Mage' || cls === 'Prêtre' || cls === 'Pretre') {
        if (!done['mage_1'] && !done['pretre_1']) return '"La lumière guide ceux qui agissent avec sagesse.\nProuvez-moi la vôtre."';
        return '"Vos actes parlent pour vous. L\'Église vous reconnaît."';
      }
      return '"Toutes les âmes peuvent trouver leur chemin. Peut-être pas ici, pas encore."';
    },
    dialogueEn: function() {
      var done = Meta.completedQuests||{};
      var cls = State.cls||'Guerrier';
      if (cls === 'Mage' || cls === 'Prêtre' || cls === 'Pretre') {
        if (!done['mage_1'] && !done['pretre_1']) return '"Light guides those who act with wisdom.\nProve yours to me."';
        return '"Your deeds speak for you. The Church acknowledges your service."';
      }
      return '"Every soul can find its path. Perhaps not here. Not yet."';
    }
  },
};

var Quests = (function(){
  var _currentNpc = null;
  var _currentQuest = null;

  function getCompletedQuests(){ return Meta.completedQuests||{}; }
  function getActiveQuest(npc){ return (Meta.activeQuests||{})[npc]||null; }

  function getNextQuest(npc) {
    var done = getCompletedQuests();
    var defs = QUEST_DEFS.filter(function(q){
      return q.npc===npc && !done[q.id] && isQuestUnlocked(q) && (!q.condition || q.condition());
    });
    return defs[0]||null;
  }

  return {
    openNpc: function(npc) {
      _currentNpc = npc;
      _currentQuest = null;
      var nd = NPC_DATA[npc];
      // Portrait : juste le nom, plus d'icône emoji
      var portIco = document.getElementById('npc-portrait-ico');
      var _npcIcons = {bertrand:'🍺',oswin:'🎵',marta:'🏠',seraphine:'🔮',aldric:'⚔',elise:'✨'};
      if (portIco) portIco.textContent = _npcIcons[npc] || '👤';
      document.getElementById('npc-portrait-name').textContent = T('npc.' + npc);
      document.getElementById('npc-btn-accept').style.display  = 'none';
      document.getElementById('npc-btn-claim').style.display   = 'none';
      document.getElementById('npc-quest-info').style.display  = 'none';
      document.getElementById('npc-final-choice').style.display = 'none';

      // Dialogue contextuel basé sur la progression narrative
      var speechText = (CGE_LANG==='en' && typeof nd.dialogueEn==='function') ? nd.dialogueEn() : (typeof nd.dialogue==='function' ? nd.dialogue() : '');

      // Quête active en cours pour ce PNJ ?
      var active = getActiveQuest(npc);
      if (active) {
        var def = QUEST_DEFS.find(function(q){ return q.id===active; });
        if (def && def.check && def.check()) {
          _currentQuest = def;
          document.getElementById('npc-quest-title').textContent  = '✅ ' + (CGE_LANG==='en'&&def.titleEn?def.titleEn:def.title);
          document.getElementById('npc-quest-desc').textContent   = (CGE_LANG==='en'&&def.descEn?def.descEn:def.desc);
          document.getElementById('npc-quest-reward').textContent = T('quest.reward') + ((CGE_LANG==='en'&&def.rewardTxtEn)?def.rewardTxtEn:def.rewardTxt);
          document.getElementById('npc-quest-info').style.display = '';
          if (def.id === 'cryptes_final' && !State._finalChoice) {
            // Le moment du choix final — 3 voies explicites offertes au joueur
            document.getElementById('npc-speech').textContent = T('final.prompt');
            document.getElementById('npc-final-choice').style.display = '';
            document.getElementById('npc-btn-claim').style.display  = 'none';
          } else {
            document.getElementById('npc-speech').textContent = resolveClaimText(def);
            document.getElementById('npc-final-choice').style.display = 'none';
            document.getElementById('npc-btn-claim').style.display  = '';
          }
        } else if (def) {
          var _qt = CGE_LANG==='en'&&def.titleEn?def.titleEn:def.title;
          var _qd = CGE_LANG==='en'&&def.descEn?def.descEn:def.desc;
          document.getElementById('npc-speech').textContent = speechText + '\n\n— '+(CGE_LANG==='en'?'In progress: ':'En cours : ')+ _qt + '\n' + _qd;
          document.getElementById('npc-quest-title').textContent  = '🗺 '+(CGE_LANG==='en'?'In progress: ':'En cours : ')+ _qt;
          document.getElementById('npc-quest-desc').textContent   = _qd;
          document.getElementById('npc-quest-reward').textContent = T('quest.reward') + ((CGE_LANG==='en'&&def.rewardTxtEn)?def.rewardTxtEn:def.rewardTxt);
          document.getElementById('npc-quest-info').style.display = '';
        } else {
          document.getElementById('npc-speech').textContent = speechText;
        }
      } else {
        // Chercher la prochaine quête débloquée pour ce PNJ
        var done = Meta.completedQuests||{};
        var next = QUEST_DEFS.find(function(q){ return q.npc===npc && !done[q.id] && isQuestUnlocked(q) && (!q.condition || q.condition()); });
        if (next) {
          _currentQuest = next;
          document.getElementById('npc-speech').textContent = speechText;
          document.getElementById('npc-quest-title').textContent  = '📜 ' + (CGE_LANG==='en'&&next.titleEn?next.titleEn:next.title);
          document.getElementById('npc-quest-desc').textContent   = (CGE_LANG==='en'&&next.descEn?next.descEn:next.desc);
          document.getElementById('npc-quest-reward').textContent = T('quest.reward') + ((CGE_LANG==='en'&&next.rewardTxtEn)?next.rewardTxtEn:next.rewardTxt);
          document.getElementById('npc-quest-info').style.display = '';
          document.getElementById('npc-btn-accept').style.display = '';
        } else {
          document.getElementById('npc-speech').textContent = speechText;
        }
      }

      var ov = document.getElementById('npc-overlay');
      ov.style.display = 'flex';
      setTimeout(function(){ ov.style.opacity='1'; },10);
    },

    accept: function() {
      if (!_currentQuest || !_currentNpc) return;
      if (!Meta.activeQuests) Meta.activeQuests = {};
      Meta.activeQuests[_currentNpc] = _currentQuest.id;
      Meta.save();
      document.getElementById('npc-btn-accept').style.display = 'none';
      document.getElementById('npc-speech').textContent = T('quest.accepted');
    },

    chooseFinal: function(path) {
      State._finalChoice = path;
      if (typeof State.saveRun === 'function') State.saveRun();
      document.getElementById('npc-final-choice').style.display = 'none';
      document.getElementById('npc-speech').textContent = _currentQuest ? resolveClaimText(_currentQuest) : '';
      document.getElementById('npc-btn-claim').style.display = '';
    },

    claim: function() {
      if (!_currentQuest || !_currentNpc) return;
      var r = _currentQuest.reward;
      if (r.gold && r.gold > 0) { Meta.totalGold=(Meta.totalGold||0)+r.gold; State.gold=(State.gold||0)+r.gold; if(typeof HUD!=='undefined') HUD.updateGold(); }
      if (r._deduct) { State.gold = Math.max(0, (State.gold||0)-r._deduct); if(typeof HUD!=='undefined') HUD.updateGold(); }
      if (r.potions) { State.potions=(State.potions||0)+r.potions; }
      if (_currentQuest.rankReward) { Meta.rank = (Meta.rank||0) + _currentQuest.rankReward; }
      // Alignement : payer Marta vite (< 5 runs) = Gardien ; quêtes de classe = Libérateur
      if (_currentQuest.id === 'marta_debt' && (Meta.totalRuns||0) <= 4) Meta.nudgeAlign(+1);
      if (_currentQuest.alignReward) Meta.nudgeAlign(_currentQuest.alignReward);
      if (!Meta.completedQuests) Meta.completedQuests = {};
      Meta.completedQuests[_currentQuest.id] = true;
      if (Meta.activeQuests) delete Meta.activeQuests[_currentNpc];
      // Auto-activer la quête suivante si elle est chaînée
      var claimedId = _currentQuest.id;
      QUEST_DEFS.forEach(function(q) {
        if (q.unlockAfter === claimedId && isQuestUnlocked(q)) {
          if (!Meta.activeQuests) Meta.activeQuests = {};
          if (!Meta.completedQuests[q.id]) Meta.activeQuests[q.npc] = q.id;
        }
      });
      Meta.save(); State.saveRun();
      document.getElementById('npc-btn-claim').style.display = 'none';
      document.getElementById('npc-quest-info').style.display = 'none';
      document.getElementById('npc-speech').textContent = '✅ ' + ((CGE_LANG==='en'&&_currentQuest.rewardTxtEn)?_currentQuest.rewardTxtEn:_currentQuest.rewardTxt);
      _currentQuest = null;
    },

    close: function() {
      var ov = document.getElementById('npc-overlay');
      ov.style.display = 'none';
    },
    refreshBadges: function() {
      var cont = document.getElementById('tav-quest-badges');
      if (!cont) return;
      cont.innerHTML = '';
      var npcs = ['bertrand','oswin','seraphine'];
      npcs.forEach(function(npc) {
        var active = (Meta.activeQuests||{})[npc];
        if (!active) {
          var next = QUEST_DEFS.find(function(q){ return q.npc===npc && !((Meta.completedQuests||{})[q.id]) && (!q.condition || q.condition()); });
          if (next) {
            var b = document.createElement('div');
            b.className = 'tav-quest-badge';
            b.textContent = '📜 ' + NPC_DATA[npc].name.split(' ')[0];
            cont.appendChild(b);
          }
        } else {
          var def = QUEST_DEFS.find(function(q){ return q.id===active; });
          if (def) {
            var b = document.createElement('div');
            b.className = 'tav-quest-badge' + (def.check() ? ' completable' : '');
            b.textContent = (def.check() ? '✅ ' : '🗺 ') + NPC_DATA[npc].name.split(' ')[0];
            cont.appendChild(b);
          }
        }
      });
    },
  };
})();

var Meta = {
  totalGold: 0,
  totalKills: 0,
  totalRuns: 0,
  bestFloor: 0,
  levels: {},
  bonuses: { atk:0, def:0, hp:0, potions:0, goldPct:0, crit:0, dodge:0, timerBonus:0, lifesteal:0, regenMeta:0, xpPct:0, startGold:0 },
  clearedZones: {},
  activeQuests: {},
  completedQuests: {},
  clues: {},
  rank: 0,
  passageFound: false,
  _align: 0,   // hidden: <0=Vide, 0±1=Libérateur, >=2=Gardien
  achievements: {},
  tutoMap: false,
  tutoCombat: false,
  chest: [],          // persistent cross-run storage (max 20 items)
  ZONE_ORDER: ['grottes','foret','ruines','port','marais','pics','volcan','cryptes'],

  load: function() {
    try {
      var d = Integrity.meta(Vault.unpack(localStorage.getItem('cge_meta')).data) || {};
      Meta.totalGold   = d.totalGold||0;
      Meta.totalKills  = d.totalKills||0;
      Meta.totalRuns   = d.totalRuns||0;
      Meta.bestFloor   = d.bestFloor||0;
      Meta.levels      = d.levels||{};
      var db = d.bonuses||{};
      Meta.bonuses = { atk:db.atk||0, def:db.def||0, hp:db.hp||0, potions:db.potions||0, goldPct:db.goldPct||0, crit:db.crit||0, dodge:db.dodge||0, timerBonus:db.timerBonus||0, lifesteal:db.lifesteal||0, regenMeta:db.regenMeta||0, xpPct:db.xpPct||0, startGold:db.startGold||0 };
      Meta.clearedZones    = d.clearedZones||{};
      Meta.activeQuests    = d.activeQuests||{};
      Meta.completedQuests = d.completedQuests||{};
      Meta.clues           = d.clues||{};
      Meta.rank            = d.rank||0;
      Meta.passageFound    = d.passageFound||false;
      Meta._align          = d._align||0;
      Meta.chest           = d.chest||[];
      Meta.achievements    = d.achievements||{};
      Meta.tutoMap         = d.tutoMap||false;
      Meta.tutoCombat      = d.tutoCombat||false;
    } catch(e){}
  },

  save: function() {
    var data = {
      totalGold:    Meta.totalGold,
      totalKills:   Meta.totalKills,
      totalRuns:    Meta.totalRuns,
      bestFloor:    Meta.bestFloor,
      levels:       Meta.levels,
      bonuses:        Meta.bonuses,
      clearedZones:   Meta.clearedZones,
      activeQuests:   Meta.activeQuests,
      completedQuests:Meta.completedQuests,
      clues:          Meta.clues,
      rank:           Meta.rank,
      passageFound:   Meta.passageFound,
      _align:         Meta._align,
      chest:          Meta.chest,
      achievements:   Meta.achievements,
      tutoMap:        Meta.tutoMap,
      tutoCombat:     Meta.tutoCombat,
    };
    localStorage.setItem('cge_meta', Vault.pack(data));
    if (typeof ProfileManager !== 'undefined') ProfileManager.updateActive(data, undefined);
  },

  nudgeAlign: function(delta) {
    Meta._align = Math.max(-5, Math.min(5, (Meta._align||0) + delta));
  },

  computeAlign: function() {
    // Recalcule l'alignement à partir de l'état global — appelé à la fin
    var a = Meta._align || 0;
    var done = Meta.completedQuests || {};
    var ch = State._introChoices || {};
    // Trait d'intro
    if (ch.trait === 'void') a -= 1;
    // Rang social élevé → Gardien
    if ((Meta.rank||0) >= 3) a += 1;
    // Toutes les quêtes principales complétées → Gardien
    var mainQuests = ['marta_debt','bertrand_1','oswin_1','seraphine_1','bertrand_2','oswin_2','seraphine_2','bertrand_3','oswin_3','seraphine_3'];
    var doneCount = mainQuests.filter(function(id){ return done[id]; }).length;
    if (doneCount >= 9) a += 1;
    else if (doneCount <= 4) a -= 1;
    // Beaucoup de zones nettoyées → Libérateur (explorateur)
    var zones = Object.keys(Meta.clearedZones||{}).length;
    if (zones >= 8) a += 1;
    // Classe offensive → léger penchant Libérateur
    var cls = State.cls || '';
    if (cls === 'assassin' || cls === 'barbare') a -= 0;  // neutre
    return Math.max(-5, Math.min(5, a));
  },

  clearZone: function(zoneId) {
    Meta.clearedZones[zoneId] = true;
    Meta.save();
    WorldMap.updateHotspots();
  },

  isZoneUnlocked: function(zoneId) {
    var order = Meta.ZONE_ORDER;
    var idx = order.indexOf(zoneId);
    if (idx <= 0) return true; // grottes always unlocked
    // unlocked if previous zone is cleared
    return !!Meta.clearedZones[order[idx-1]];
  },

  addRunResult: function() {
    Meta.totalGold  += State.gold||0;
    Meta.totalKills += State.kills||0;
    Meta.totalRuns  += 1;
    Meta.bestFloor   = Math.max(Meta.bestFloor, State.floor||1);
    Meta.save();
  },

  buildScreen: function() {
    var _gTotal = Meta.totalGold + (State.gold||0);
    var _rankNames = ['Inconnu','Connu','Respecté','Honoré','Légendaire'];
    var _rankEl = document.getElementById('hs-rank-val');
    if (_rankEl) _rankEl.textContent = _rankNames[Math.min(Meta.rank||0, _rankNames.length-1)];
    var _elGold = document.getElementById('hs-gold-val'); if (_elGold) _elGold.textContent = _gTotal;
    var _elRuns = document.getElementById('hs-runs');     if (_elRuns) _elRuns.textContent = Meta.totalRuns;
    var _elBest = document.getElementById('hs-best');     if (_elBest) _elBest.textContent = Meta.bestFloor;
    var _elKills= document.getElementById('hs-kills');    if (_elKills) _elKills.textContent = Meta.totalKills;
    var cont = document.getElementById('hs-upgrades');
    if (!cont) return;
    cont.innerHTML = '';
    META_UPGRADES.forEach(function(u) {
      var lvl   = Meta.levels[u.id]||0;
      var maxed = lvl >= u.max;
      var cost  = u.cost + lvl*20;
      var canBuy= !maxed && (Meta.totalGold+(State.gold||0)) >= cost;
      var card  = document.createElement('div');
      card.className = 'upgrade-card'+(maxed?' maxed':(!canBuy?' cant-afford':''));
      card.innerHTML =
        '<span class="uc-ico">'+u.ico+'</span>'+
        '<div class="uc-info">'+
          '<div class="uc-name">'+(CGE_LANG==='en'&&u.nameEn?u.nameEn:u.name)+'</div>'+
          '<div class="uc-desc">'+(CGE_LANG==='en'&&u.descEn?u.descEn:u.desc)+'</div>'+
          '<div class="uc-prog">'+(CGE_LANG==='en'?'Level ':'Niveau ')+lvl+' / '+u.max+(maxed?(CGE_LANG==='en'?' — MAXED':' — MAXÉ'):'')+'</div>'+
        '</div>'+
        (maxed ? '' : '<div class="uc-cost">'+cost+'</div>');
      if (!maxed) {
        card.addEventListener('click', function(){
          var c2 = u.cost + (Meta.levels[u.id]||0)*20;
          var _avail = Meta.totalGold + (State.gold||0);
          if (_avail < c2) return;
          var _fromRun = Math.min(State.gold||0, c2);
          State.gold = (State.gold||0) - _fromRun;
          Meta.totalGold -= (c2 - _fromRun);
          Meta.levels[u.id] = (Meta.levels[u.id]||0)+1;
          u.effect();
          Meta.save();
          Meta.buildScreen();
        });
      }
      cont.appendChild(card);
    });
  }
};

// ── BOUTIQUE ──────────────────────────────────────────────────────
// SHOP_POOL : items disponibles en boutique
// slot → va dans l'inventaire (équipable); effect → appliqué immédiatement
var SHOP_POOL = [
  // Consommables
  { ico:'💊', name:'Potion Suprême',     desc:'+2 Potions',      cost:20,  rarity:'common',    effect:function(){ State.potions=(State.potions||0)+2; } },
  { ico:'🩹', name:'Soin Immédiat',      desc:'Récup 50% PV',    cost:25,  rarity:'common',    effect:function(){ State.hp=Math.min(State.hpMax,State.hp+Math.round(State.hpMax*0.5)); } },
  { ico:'💧', name:'Fiole de Mana',      desc:'Récup 30 mana (Mage/Prêtre)', cost:20, rarity:'common', effect:function(){ if(State.manaMax>0) State.mana=Math.min(State.manaMax,(State.mana||0)+30); }, condition:function(){ return State.manaMax>0; } },
  { ico:'🔷', name:'Cristal de Mana',    desc:'Mana au maximum',   cost:40,  rarity:'rare',      effect:function(){ if(State.manaMax>0) State.mana=State.manaMax; }, condition:function(){ return State.manaMax>0; } },
  { ico:'🧪', name:'Élixir de Force',    desc:'+1 Potion force',  cost:35,  rarity:'uncommon',  combat:true, effect:function(){ State.potions=(State.potions||0)+1; } },
  // Équipements communs / peu communs
  { ico:'⚔', name:'Épée du Marché',     desc:'+5 ATQ',           cost:30,  rarity:'common',    slot:'arme',      stats:{atk:5} },
  { ico:'🛡', name:'Écu Renforcé',      desc:'+6 DEF',           cost:30,  rarity:'common',    slot:'bouclier',  stats:{def:6} },
  { ico:'💎', name:'Pierre de Vie',     desc:'+35 PV max',       cost:45,  rarity:'uncommon',  slot:'collier',   stats:{hp:35} },
  { ico:'📿', name:'Amulette du Chaos', desc:'+7 ATQ -3 DEF',    cost:35,  rarity:'uncommon',  slot:'collier',   stats:{atk:7, def:-3} },
  { ico:'🪖', name:'Casque de Combat',  desc:'+5 DEF',           cost:32,  rarity:'common',    slot:'heaume',    stats:{def:5} },
  { ico:'🥋', name:'Gambison Épais',    desc:'+8 DEF',           cost:40,  rarity:'uncommon',  slot:'plastron',  stats:{def:8} },
  { ico:'🧤', name:'Gants de Mage',     desc:'+5 ATQ',           cost:35,  rarity:'common',    slot:'gants',     stats:{atk:5} },
  { ico:'👢', name:'Sandales Agiles',   desc:'+20% fuite',       cost:28,  rarity:'common',    slot:'bottes',    stats:{flee:0.2} },
  { ico:'🪢', name:'Ceinture de Cuir',   desc:'+4 DEF',           cost:28,  rarity:'common',    slot:'ceinture',  stats:{def:4} },
  { ico:'🪢', name:'Ceinture de Bataille',desc:'+5 DEF +3 ATQ',   cost:65,  rarity:'uncommon',  slot:'ceinture',  stats:{def:5,atk:3} },
  { ico:'🪢', name:'Ceinture Abyssale',   desc:'+8 DEF +30 PV',   cost:150, rarity:'rare',      slot:'ceinture',  stats:{def:8,hp:30} },
  { ico:'🦵', name:'Jambières de Cuir',   desc:'+4 DEF',           cost:30,  rarity:'common',    slot:'jambieres', stats:{def:4} },
  { ico:'🦵', name:'Cuissardes d\'Acier', desc:'+8 DEF',           cost:70,  rarity:'uncommon',  slot:'jambieres', stats:{def:8} },
  { ico:'🦵', name:'Cuissardes Runiques', desc:'+12 DEF +4 ATQ · Épique', cost:280, rarity:'epic', slot:'jambieres', stats:{def:12,atk:4} },
  { ico:'🗡', name:'Stylet Empoisonné', desc:'+3 ATQ',           cost:40,  rarity:'uncommon',  slot:'arme',      stats:{atk:3} },
  // ── Rares ──────────────────────────────────────────────────────────
  { ico:'⚔', name:'Épée de Feu',       desc:'+12 ATQ · Rare',   cost:120, rarity:'rare',      slot:'arme',      stats:{atk:12} },
  { ico:'🛡', name:'Bouclier Runique',  desc:'+14 DEF · Rare',   cost:130, rarity:'rare',      slot:'bouclier',  stats:{def:14} },
  { ico:'💎', name:'Orbe de Vie',       desc:'+50 PV · Rare',    cost:150, rarity:'rare',      slot:'collier',   stats:{hp:50} },
  // ── Épiques ────────────────────────────────────────────────────────
  { ico:'⚔', name:'Lame de l\'Aube',   desc:'+22 ATQ · Épique', cost:280, rarity:'epic',      slot:'arme',      stats:{atk:22} },
  { ico:'🛡', name:'Égide Royale',      desc:'+20 DEF · Épique', cost:260, rarity:'epic',      slot:'bouclier',  stats:{def:20} },
  { ico:'💎', name:'Cristal Éternel',   desc:'+80 PV +12 DEF · Épique', cost:380, rarity:'epic', slot:'collier', stats:{hp:80,def:12} },
  { ico:'🪖', name:'Heaume du Paladin', desc:'+15 DEF +8 ATQ · Épique', cost:360, rarity:'epic', slot:'heaume',  stats:{def:15,atk:8} },
  // ── Légendaires ───────────────────────────────────────────────────
  { ico:'⚔', name:'Épée de l\'Éternité', desc:'+35 ATQ · Légendaire',   cost:620, rarity:'legendary', slot:'arme',     stats:{atk:35} },
  { ico:'🥋', name:'Armure des Cryptes',  desc:'+30 DEF +10 ATQ · Légendaire', cost:680, rarity:'legendary', slot:'plastron', stats:{def:30,atk:10} },
  // ── Bijoutier : Anneaux / Bagues ─────────────────────────────────
  { ico:'💍', name:'Anneau de Cuivre',   desc:'+3 ATQ',                    cost:25,  rarity:'common',    slot:'bague', stats:{atk:3} },
  { ico:'💍', name:'Anneau Défensif',    desc:'+4 DEF',                    cost:25,  rarity:'common',    slot:'bague', stats:{def:4} },
  { ico:'💎', name:'Anneau Enchanté',    desc:'+5 ATQ +3 DEF',             cost:80,  rarity:'uncommon',  slot:'bague', stats:{atk:5,def:3} },
  { ico:'💎', name:'Bague du Survivant', desc:'+40 PV +5 DEF · Rare',      cost:145, rarity:'rare',      slot:'bague', stats:{hp:40,def:5} },
  { ico:'🔮', name:'Anneau de Puissance',desc:'+10 ATQ +30 PV · Épique',   cost:290, rarity:'epic',      slot:'bague', stats:{atk:10,hp:30} },
  { ico:'⭐', name:'Anneau Légendaire',  desc:'+12/+12/+50 · Légendaire',  cost:650, rarity:'legendary', slot:'bague', stats:{atk:12,def:12,hp:50} },
  // ── Mythique ──────────────────────────────────────────────────────
  { ico:'💍', name:'Anneau du Chaos',     desc:'+15 ATQ +15 DEF · Mythique', cost:999, rarity:'mythic', slot:'bague', stats:{atk:15,def:15} },
  // ── Église : potions, sorts, parchemins ──────────────────────────
  { ico:'🧴', name:'Petite Potion',       desc:'+1 Potion',         cost:12,  rarity:'common',    slot:'eglise', effect:function(){ State.potions=(State.potions||0)+1; } },
  { ico:'💊', name:'Grande Potion',       desc:'+2 Potions',        cost:22,  rarity:'uncommon',  slot:'eglise', effect:function(){ State.potions=(State.potions||0)+2; } },
  { ico:'✨', name:'Élixir Sacré',        desc:'Soin complet',      cost:45,  rarity:'rare',      slot:'eglise', effect:function(){ State.hp=State.hpMax; } },
  { ico:'📜', name:'Parchemin de Feu',    desc:'Inflige 20 dégâts en combat', cost:18, rarity:'common',   slot:'eglise', scroll:'feu',   effect:function(){ State.scrolls=(State.scrolls||[]);State.scrolls.push({name:'Feu',dmg:20,ico:'🔥'}); } },
  { ico:'📜', name:'Parchemin de Glace',  desc:'Inflige 15 dégâts + ralentit', cost:20, rarity:'uncommon', slot:'eglise', scroll:'glace', effect:function(){ State.scrolls=(State.scrolls||[]);State.scrolls.push({name:'Glace',dmg:15,slow:true,ico:'❄'}); } },
  { ico:'📜', name:'Parchemin Sacré',     desc:'Inflige 30 dégâts · Rare', cost:55, rarity:'rare',     slot:'eglise', scroll:'sacre', effect:function(){ State.scrolls=(State.scrolls||[]);State.scrolls.push({name:'Sacré',dmg:30,ico:'✨'}); } },
  { ico:'🔮', name:'Sort de Confusion',   desc:'L\'ennemi passe un tour', cost:30, rarity:'uncommon',  slot:'eglise', effect:function(){ State.scrolls=(State.scrolls||[]);State.scrolls.push({name:'Confusion',stun:true,ico:'🔮'}); } },
  { ico:'🕯', name:'Bénédiction',         desc:'+5 ATQ pour ce run', cost:60, rarity:'rare',       slot:'eglise', effect:function(){ State.atk=(State.atk||0)+5; } },
];

Rooms._shopTab = 'buy';

Rooms.showShop = function(fromScreen, category) {
  State._shopFrom = fromScreen || 'dungeon-map';
  State._shopCategory = category || null;
  Rooms._shopTab = 'buy';
  document.getElementById('stab-buy').classList.add('active');
  document.getElementById('stab-sell').classList.remove('active');
  // Filtrer par catégorie si spécifiée
  var SLOT_MAP = {
    forge:     ['arme'],
    armurerie: ['plastron','bouclier','heaume'],
    couturier: ['ceinture','jambieres','bottes','gants'],
    bijoutier: ['collier','bague','bague_gauche','bague_droite'],
    eglise:    ['eglise']
  };
  var TITLE_MAP = {
    forge:     '⚒ Forge',
    armurerie: '🛡 Armurerie',
    couturier: '🧵 Couturier',
    bijoutier: '💍 Bijoutier',
    eglise:    '⛪ Église · Boutique'
  };
  var slots = category && SLOT_MAP[category];
  var pool = slots ? SHOP_POOL.filter(function(i){ return slots.indexOf(i.slot)!==-1; }) : SHOP_POOL.slice();
  pool.sort(function(){ return Math.random()-0.5; });
  var items = pool.slice(0, slots ? pool.length : 4);
  State._shopItems = items;
  document.getElementById('shop-title').textContent = (category && TITLE_MAP[category]) || '🏪 Marchand Obscur';
  var _sgv = document.getElementById('shop-gold-val'); if (_sgv) _sgv.textContent = State.gold||0;
  Rooms._renderShopBuy();
  Nav.go('shop-screen');
};

Rooms._renderShopBuy = function() {
  var items = State._shopItems || [];
  var cont = document.getElementById('shop-items');
  cont.innerHTML = '';
  items.forEach(function(item, idx) {
    if (item.condition && !item.condition()) return;
    var div = document.createElement('div');
    var rar2 = item.rarity||'common';
    var displayCost = Rooms._racePriceMod(item.cost);
    div.className = 'shop-item rarity-'+rar2 + ((State.gold||0) < displayCost ? ' cant-afford' : '');
    div.dataset.idx = idx;
    var rarLabel2 = (RARITY_LABELS||{})[rar2]||rar2;
    var priceHtml = displayCost !== item.cost
      ? '<div class="si-price race-tax">'+displayCost+'<span class="orig-price">'+item.cost+'</span></div>'
      : '<div class="si-price">'+displayCost+'</div>';
    div.innerHTML =
      '<span class="si-ico">'+item.ico+'</span>'+
      '<div class="si-info"><div class="si-name">'+item.name+'</div><div class="si-desc">'+item.desc+'</div><span class="rarity-badge '+rar2+'">'+rarLabel2+'</span></div>'+
      priceHtml;
    div.addEventListener('click', function(){ Rooms.shopItemDetail(idx); });
    cont.appendChild(div);
  });
};

Rooms._renderShopSell = function() {
  var cont = document.getElementById('shop-items');
  cont.innerHTML = '';
  var inv = State.inventory || [];
  // Also sellable: equipped items
  var allSellable = [];
  inv.forEach(function(it,i){ allSellable.push({ item:it, src:'inv', idx:i }); });
  Object.keys(State.equipped||{}).forEach(function(slot){
    if (State.equipped[slot]) allSellable.push({ item:State.equipped[slot], src:'slot', idx:slot });
  });
  if (allSellable.length === 0) {
    cont.innerHTML = '<div style="font-family:\'Crimson Text\',serif;font-style:italic;font-size:13px;color:rgba(237,232,223,0.3);text-align:center;padding:20px">Rien à vendre...</div>';
    return;
  }
  allSellable.forEach(function(entry, i) {
    var it = entry.item;
    var sellPrice = Rooms._sellPrice(it);
    var div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML =
      '<span class="si-ico">'+it.ico+'</span>'+
      '<div class="si-info"><div class="si-name">'+it.name+(entry.src==='slot'?' [équipé]':'')+'</div><div class="si-desc">'+it.desc+'</div></div>'+
      '<div class="si-price" style="color:#50c870">+'+sellPrice+'</div>';
    div.addEventListener('click', function(){
      State.gold = (State.gold||0) + sellPrice;
      var _sgv = document.getElementById('shop-gold-val'); if (_sgv) _sgv.textContent = State.gold;
      if (typeof HUD !== 'undefined') HUD.updateGold();
      if (entry.src === 'inv') {
        State.inventory.splice(entry.idx, 1);
      } else {
        applyItemStats(it, -1);
        State.equipped[entry.idx] = null;
        State.hp = Math.min(State.hp, State.hpMax);
      }
      Sfx.gold && Sfx.gold();
      Rooms._renderShopSell();
    });
    cont.appendChild(div);
  });
};

Rooms._sellPrice = function(item) {
  // Sell for ~40% of buy price based on stats
  if (!item) return 0;
  var base = 10;
  if (item.stats) {
    base += (item.stats.atk||0)*3 + (item.stats.def||0)*2 + (item.stats.hp||0);
  }
  return Math.max(5, Math.round(base * 0.5));
};

Rooms.shopTab = function(tab) {
  Rooms._shopTab = tab;
  document.getElementById('stab-buy').classList.toggle('active', tab==='buy');
  document.getElementById('stab-sell').classList.toggle('active', tab==='sell');
  if (tab==='buy') Rooms._renderShopBuy(); else Rooms._renderShopSell();
};

// Race tax: Orcs pay 20% more, Elfes pay 10% more (distrusted), Nains get 10% off
Rooms._racePriceMod = function(base) {
  var r = State.race;
  if (r === 'Orc')    return Math.ceil(base * 1.20);
  if (r === 'Elfe')   return Math.ceil(base * 1.10);
  if (r === 'Nain')   return Math.floor(base * 0.90);
  return base;
};

// Détail d'un objet de boutique AVANT achat : stats + comparaison vs équipé + bouton Acheter.
Rooms.shopItemDetail = function(idx) {
  var item = State._shopItems[idx];
  if (!item) return;
  var cost = Rooms._racePriceMod(item.cost);
  var rar = item.rarity||'common';
  var rarLabel = (RARITY_LABELS||{})[rar]||rar;
  var name = (CGE_LANG==='en'&&item.nameEn?item.nameEn:item.name);
  var html = '<div style="text-align:left">'+
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'+
      '<span style="font-size:34px">'+item.ico+'</span>'+
      '<div><div style="font-family:\'Cinzel\',serif;font-size:14px;font-weight:700;color:#EAD79A">'+name+'</div>'+
      '<div style="font-size:10px;color:rgba(237,232,223,0.55);letter-spacing:1px;text-transform:uppercase">'+
        (item.slot?getSlotLabel(item.slot)+' · ':'')+'<span class="rarity-badge '+rar+'">'+rarLabel+'</span></div></div>'+
    '</div>';
  if (item.stats) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
    STAT_ORDER.forEach(function(k){ if(!item.stats[k])return; var m=STAT_META[k];
      html += '<div class="eq-ds">'+m.ico+' <span>'+fmtStatVal(k,item.stats[k])+'</span> <span style="font-size:9px;opacity:0.5">'+(CGE_LANG==='en'?m.en:m.fr)+'</span></div>'; });
    html += '</div>';
    if (item.slot) html += '<div class="eq-cmp-wrap">'+buildCompareHtml(item, item.slot)+'</div>';
  } else {
    html += '<div style="font-family:\'Crimson Text\',serif;font-size:14px;color:rgba(237,232,223,0.7);margin-top:4px">'+(CGE_LANG==='en'&&item.descEn?item.descEn:item.desc)+'</div>';
  }
  html += '</div>';
  var afford = (State.gold||0) >= cost;
  CGEModal.show({
    title: '',
    html: html,
    okLabel: (CGE_LANG==='en'?'Buy':'Acheter')+' · '+cost+' 🪙',
    cancelLabel: T('misc.close'),
    onOk: function(){
      if (afford) Rooms.shopBuy(idx);
      else CGEModal.alert(T('shop.title'), T('shop.cantafford'));
    }
  });
};

Rooms.shopBuy = function(idx) {
  var item = State._shopItems[idx];
  if (!item) return;
  var cost = Rooms._racePriceMod(item.cost);
  if ((State.gold||0) < cost) return;
  State.gold -= cost;
  // If item has a slot → add to inventory; otherwise apply effect
  if (item.slot) {
    State.inventory = State.inventory || [];
    item = Object.assign({}, item); // cloner pour éviter les références partagées entre achats
    if (State.inventory.length < 8) {
      State.inventory.push(item);
    } else {
      CGEModal.alert(T('shop.inv.full'), T('shop.inv.full.buy'));
      State.gold += cost; return;
    }
  } else if (item.effect) {
    item.effect();
  }
  // Remboursement si pub "achat gratuit" activée
  if (State._adShopFreeNext) {
    State._adShopFreeNext = false;
    State.gold += cost;
    CGEModal.alert(T('shop.free.title'), T('shop.free.desc'));
  }
  State._lastShopCost = cost;
  Sfx.buy && Sfx.buy();
  var _sgv2 = document.getElementById('shop-gold-val'); if (_sgv2) _sgv2.textContent = State.gold;
  if (typeof HUD !== 'undefined') HUD.updateGold();
  var cards = document.querySelectorAll('.shop-item');
  if (cards[idx]) cards[idx].classList.add('sold');
  document.querySelectorAll('.shop-item:not(.sold)').forEach(function(c){
    var base = State._shopItems[c.dataset.idx]&&State._shopItems[c.dataset.idx].cost||999;
    var cost2 = Rooms._racePriceMod(base);
    c.classList.toggle('cant-afford', (State.gold||0) < cost2);
  });
  // Bouton pub "rembourser cet achat" — une fois par run
  var shopAd = document.getElementById('shop-ad-wrap');
  if (shopAd && !State._adShopUsed) {
    shopAd.innerHTML = '<button class="btn-rewarded-ad" onclick="RewardedAds.showFreeShopItem()">'+T('adbtn.refund')+'</button>';
  }
};

Rooms.shopLeave = function() {
  var dest = State._shopFrom || 'dungeon-map';
  if (dest === 'dungeon-map') updateMapHpBar();
  Nav.go(dest);
};

// ── TRANSITION ÉTAGE ──────────────────────────────────────────────
var FLOOR_QUOTES = [
  'Les murs suintent l\'obscurité...',
  'L\'air se fait plus froid et plus lourd...',
  'Les ténèbres s\'épaississent...',
  'Tu sens une présence ancienne...',
  'La mort rôde dans ces couloirs...',
  'Tu touches le fond de l\'abîsse...',
];
var FLOOR_QUOTES_EN = [
  'The walls seep with darkness...',
  'The air grows colder and heavier...',
  'The shadows thicken...',
  'You sense an ancient presence...',
  'Death lurks in these corridors...',
  'You touch the bottom of the abyss...',
];
function getFloorQuote(idx) {
  var arr = CGE_LANG === 'en' ? FLOOR_QUOTES_EN : FLOOR_QUOTES;
  return arr[Math.min(idx, arr.length-1)];
}

// Fragments de mémoire — révélés dans les Cryptes après seraphine_3
// Chaque fragment est un souvenir de l'Éveillé du siècle passé
var MEMORY_FRAGMENTS = [
  { id:'mem_01', title:'Fragment I — L\'Arrivée',
    titleEn:'Fragment I — The Arrival',
    text:'Un homme marche seul sur une route de nuit. Il tient un parchemin. Il se retourne — quelque chose le suit depuis des semaines. Il ne sait pas encore ce que c\'est.\n\nIl sait juste que tant qu\'il marche vers les Cryptes, ça ne s\'approche pas.',
    textEn:'A man walks alone on a night road. He holds a scroll. He looks back — something has been following him for weeks. He doesn\'t know what it is yet.\n\nHe only knows that as long as he walks toward the Crypts, it doesn\'t come closer.' },
  { id:'mem_02', title:'Fragment II — La Taverne',
    titleEn:'Fragment II — The Tavern',
    text:'Une femme derrière un comptoir. Elle lui sert à boire sans poser de questions. Il paie. Il part.\n\nTrois ans plus tard, quand tout est terminé, il revient pour régler sa dette.\n\nLa taverne n\'existait plus.',
    textEn:'A woman behind a counter. She serves him a drink without asking questions. He pays. He leaves.\n\nThree years later, when it is all over, he returns to settle his debt.\n\nThe tavern was gone.' },
  { id:'mem_03', title:'Fragment III — Le Barde',
    titleEn:'Fragment III — The Bard',
    text:'Il savait depuis le début. Le barde jouait trop bien, souriait trop peu quand personne ne regardait.\n\nMais il avait besoin de lui. Et le barde avait besoin d\'une fin.\n\nCertains mensonges sont plus utiles que certaines vérités.',
    textEn:'He knew from the beginning. The bard played too well, smiled too little when no one was watching.\n\nBut he needed him. And the bard needed an ending.\n\nSome lies are more useful than some truths.' },
  { id:'mem_04', title:'Fragment IV — La Sorcière',
    titleEn:'Fragment IV — The Witch',
    text:'"Tu ne reviendras pas," lui dit-elle.\n\nIl répondit : "Je sais."\n\n"Alors pourquoi ?"\n\nIl n\'avait pas de réponse. Pas une qu\'il puisse formuler. Certaines décisions existent avant les mots.',
    textEn:'"You won\'t come back," she told him.\n\nHe replied: "I know."\n\n"Then why?"\n\nHe had no answer. Not one he could put into words. Some decisions exist before language.' },
  { id:'mem_05', title:'Fragment V — Le Sceau',
    titleEn:'Fragment V — The Seal',
    text:'Les runes brillaient d\'une lumière qui n\'éclairait pas. Il posa les mains sur la pierre.\n\nDe l\'autre côté, quelque chose bougea. Quelque chose d\'immense et de patient.\n\n"Je t\'attendais," dit la voix.\n\n"Je sais," dit-il. "C\'est pour ça que je suis venu moi-même."',
    textEn:'The runes glowed with a light that gave no illumination. He placed his hands on the stone.\n\nOn the other side, something moved. Something immense and patient.\n\n"I\'ve been waiting for you," said the voice.\n\n"I know," he said. "That\'s why I came myself."' },
  { id:'mem_06', title:'Fragment VI — Le Prix',
    titleEn:'Fragment VI — The Price',
    text:'Ce qu\'il a sacrifié n\'était pas sa vie. La mort, ça finit.\n\nCe qu\'il a sacrifié, c\'est tout le reste. Les souvenirs. Le nom. La continuité d\'exister tel qu\'il était.\n\nIl est devenu une partie du verrou.\n\nEt quelque part, cent ans plus tard, quelqu\'un se réveille sans se souvenir de rien.',
    textEn:'What he sacrificed was not his life. Death has an end.\n\nWhat he sacrificed was everything else. The memories. The name. The continuity of existing as he was.\n\nHe became part of the lock.\n\nAnd somewhere, a hundred years later, someone wakes up remembering nothing.' },
  { id:'mem_07', title:'Fragment VII — Le Retour',
    titleEn:'Fragment VII — The Return',
    text:'La pierre se souvient de lui. Les Cryptes se souviennent de lui.\n\nTout le monde a oublié.\n\nSauf peut-être... une chanson. Vieille de cent ans. Que personne ne se rappelle avoir composée.',
    textEn:'The stone remembers him. The Crypts remember him.\n\nEveryone has forgotten.\n\nExcept perhaps... a song. A hundred years old. That no one recalls composing.' },
  { id:'mem_08', title:'Fragment VIII — Le Choix',
    titleEn:'Fragment VIII — The Choice',
    text:'Il aurait pu briser le sceau. Libérer le Dieu de la Mémoire — cet être qui efface les identités, qui dévore les civilisations en leur faisant oublier qu\'elles ont existé.\n\nMais peut-être qu\'une prison d\'un siècle l\'avait changé. Peut-être qu\'il souffrait, là-dedans.\n\nIl ne le saura jamais. Il a choisi le verrou.\n\nToi... tu dois encore choisir.',
    textEn:'He could have broken the seal. Released the God of Memory — that being who erases identities, who devours civilizations by making them forget they ever existed.\n\nBut perhaps a century of imprisonment had changed it. Perhaps it suffered, in there.\n\nHe will never know. He chose the lock.\n\nYou... still have to choose.' },
];

function advanceFloor() {
  State.floor = (State.floor||1) + 1;
  var labels = ['I','II','III','IV','V','VI'];
  var ft = document.getElementById('floor-transition');
  document.getElementById('ft-num').textContent = labels[State.floor-1]||String(State.floor);

  // Fragments de mémoire dans les Cryptes après acte III
  var done = Meta.completedQuests||{};
  var memIdx = (Meta.totalRuns||0) % MEMORY_FRAGMENTS.length;
  var mem = done['seraphine_3'] ? MEMORY_FRAGMENTS[memIdx] : null;
  var ftSub = document.getElementById('ft-sub');
  var ftMem = document.getElementById('ft-memory');

  if (mem && ftMem) {
    ftSub.textContent = CGE_LANG==='en' ? (mem.titleEn||mem.title) : mem.title;
    ftMem.textContent = CGE_LANG==='en' ? (mem.textEn||mem.text) : mem.text;
    ftMem.classList.add('show');
  } else {
    ftSub.textContent = getFloorQuote(State.floor-1);
    if (ftMem) { ftMem.textContent = ''; ftMem.classList.remove('show'); }
  }

  ft.classList.add('show');
  var delay = mem ? 4500 : 2200;
  setTimeout(function(){
    ft.classList.remove('show');
    Nav.go('dungeon-map');
    setTimeout(function(){ DungeonMap.init(State.floor, State.hp, State.hpMax); }, 80);
  }, delay);
}

function updateMapHpBar() {
  if (typeof HUD !== 'undefined') HUD.updateHP();
}

// ── DUNGEON MAP ───────────────────────────────────────────────────
// Facteur global d'or gagné en combat (ajuster pour l'équilibrage économique)
var GOLD_FACTOR = 0.5;
// Difficulté de zone — rampe DOUCE (remplace l'ancienne courbe explosive de PV).
// Sert au scaling relatif au joueur dans startCombat (TTK borné).
var ZONE_DIFF = {
  grottes:1.0, foret:1.12, ruines:1.24, port:1.36, marais:1.48, pics:1.6,
  volcan:1.74, cryptes:1.9, chateau_maudit:2.05, cite_oubliee:2.2,
  gouffre_astral:2.4, cryptes_profondes:2.6,
};
var DungeonMap = (function() {
  var mc, mctx, W, H;
  var torchT = 0;
  var _rafRunning = false;

  // Disposition des nœuds : 6 rangées, 1-2 nœuds par rangée, branchements
  // Chaque nœud : { id, row, col, x, y, parents[], state:'locked'|'available'|'done'|'current' }
  var LAYOUTS = [
    // Rangée 0 (bas) : entrée
    [{ id:0, row:0, col:0 }],
    // Rangée 1 : 2 chemins
    [{ id:1, row:1, col:-1 }, { id:2, row:1, col:1 }],
    // Rangée 2 : 3 chemins
    [{ id:3, row:2, col:-2 }, { id:4, row:2, col:0 }, { id:5, row:2, col:2 }],
    // Rangée 3 : 2 chemins
    [{ id:6, row:3, col:-1 }, { id:7, row:3, col:1 }],
    // Rangée 4 : 2 chemins
    [{ id:8, row:4, col:-1 }, { id:9, row:4, col:1 }],
    // Rangée 5 (haut) : boss
    [{ id:10, row:5, col:0 }],
  ];

  // Connexions : [parent_id, child_id]
  var EDGES = [
    [0,1],[0,2],
    [1,3],[1,4],[2,4],[2,5],
    [3,6],[4,6],[4,7],[5,7],
    [6,8],[6,9],[7,8],[7,9],
    [8,10],[9,10],
  ];

  // Types de salles cachés
  var ROOM_TYPES = ['combat','combat','elite','rest','shop','mystery','mystery','trap','combat','combat'];

  var nodes = [];
  var runSeed = 0;

  function seededRand(seed, i) {
    var x = Math.sin(seed * 9301 + i * 49297 + 233720) * 93701;
    return x - Math.floor(x);
  }

  function initMap(floor, hp, hpMax) {
    runSeed = Date.now() + floor * 137;
    nodes = [];
    LAYOUTS.forEach(function(row, ri) {
      row.forEach(function(nd) {
        var type = nd.id === 0 ? 'start' :
                   nd.id === 10 ? 'boss' :
                   ROOM_TYPES[Math.floor(seededRand(runSeed, nd.id) * ROOM_TYPES.length)];
        nodes.push({
          id: nd.id, row: nd.row, col: nd.col,
          type: type,
          state: nd.id === 0 ? 'done' : 'locked',
          x: 0, y: 0,
        });
      });
    });
    // Feu de camp garanti juste avant le boss (rangée 4 → nœuds 8 et 9)
    nodes.forEach(function(n){ if (n.id === 8 || n.id === 9) n.type = 'campfire'; });
    // Débloque les voisins du nœud de départ
    unlockChildren(0);
    // Passage secret dans les Grottes
    if (State._currentZone === 'grottes' && Meta.completedQuests && Meta.completedQuests['seraphine_3']) {
      nodes.push({ id:99, row:0, col:0, type:'passage', state:'available', x:28, y:28 });
    }
    // Décors aléatoires
    DungeonMap._decors = buildDecors();
    updateFloorUI(floor, hp, hpMax);
    render();
    maybeTutoMap();
  }

  // Feu de camp avant le boss — choix : se reposer (gratuit, +75% PV) ou continuer
  function showCampfire() {
    CGEModal.show({
      title: T('camp.title'),
      text: T('camp.desc'),
      okLabel: T('camp.rest'),
      cancelLabel: T('camp.continue'),
      onOk: function() {
        var before = State.hp || 0;
        State.hp = Math.min(State.hpMax, before + Math.round(State.hpMax * 0.75));
        var gained = State.hp - before;
        if (typeof HUD !== 'undefined') HUD.updateHP();
        if (typeof State.saveRun === 'function') State.saveRun();
        CGEModal.alert(T('camp.title'), T('camp.rested').replace('{n}', gained));
      },
      onCancel: function() {}
    });
  }

  // Tutoriel carte — une seule fois (première expédition)
  function maybeTutoMap() {
    if (Meta.tutoMap) return;
    Meta.tutoMap = true;
    if (typeof Meta.save === 'function') Meta.save();
    setTimeout(function() {
      CGEModal.alert(T('tuto.map.title'), T('tuto.map.body'));
    }, 700);
  }

  function unlockChildren(nodeId) {
    EDGES.forEach(function(e) {
      if (e[0] === nodeId) {
        var child = nodes.find(function(n){ return n.id === e[1]; });
        if (child && child.state === 'locked') child.state = 'available';
      }
    });
  }

  function getParents(nodeId) {
    var parents = [];
    EDGES.forEach(function(e){ if (e[1]===nodeId) parents.push(e[0]); });
    return parents;
  }

  function buildDecors() {
    var decors = [];
    var count = 28;
    for (var i = 0; i < count; i++) {
      var type = Math.floor(seededRand(runSeed+1, i) * 4); // 0=rock,1=rock,2=bush,3=skull
      decors.push({
        fx: seededRand(runSeed+2, i),   // 0..1 relatif à W
        fy: seededRand(runSeed+3, i),   // 0..1 relatif à H
        type: type,
        size: 0.5 + seededRand(runSeed+4, i) * 0.8,
        angle: seededRand(runSeed+5, i) * Math.PI * 2,
      });
    }
    return decors;
  }

  function computePositions() {
    var rows = 6;
    var padT = 32, padB = 28, padL = 28, padR = 28;
    var rowH = (H - padT - padB) / (rows - 1);
    nodes.forEach(function(n) {
      if (n.id === 99) { n.x = 28; n.y = 28; return; }
      var unitX = n.col / 2.5; // -1..+1
      n.x = W/2 + unitX * (W/2 - padL - 8);
      n.y = H - padB - n.row * rowH;
    });
  }

  function nodeRadius(n) {
    return n.id === 10 ? 22 : (n.id === 0 ? 16 : 14);
  }

  function updateFloorUI(floor, hp, hpMax) {
    State.hp = hp; State.hpMax = hpMax;
    if (typeof HUD !== 'undefined') HUD.update('dungeon-map');
  }

  function drawPath(ax,ay,bx,by,done) {
    mctx.save();
    mctx.beginPath();
    // Chemin courbe
    var mx = (ax+bx)/2 + (((ax*13+bx*7)%10)-5);
    var my = (ay+by)/2;
    mctx.moveTo(ax,ay);
    mctx.quadraticCurveTo(mx, my, bx, by);
    mctx.strokeStyle = done ? 'rgba(201,165,80,0.55)' : 'rgba(120,90,50,0.3)';
    mctx.lineWidth = done ? 2.5 : 1.5;
    mctx.setLineDash(done ? [] : [5,5]);
    mctx.lineCap = 'round';
    mctx.stroke();
    mctx.setLineDash([]);
    mctx.restore();
  }

  function drawDecor(d) {
    var x = d.fx * W, y = d.fy * H;
    var s = d.size;
    mctx.save();
    mctx.translate(x, y);
    mctx.rotate(d.angle);
    mctx.globalAlpha = 0.18 + s * 0.12;

    if (d.type <= 1) {
      // Rocher
      mctx.fillStyle = '#5a4a38';
      mctx.beginPath();
      mctx.ellipse(0, 0, 9*s, 6*s, 0, 0, Math.PI*2);
      mctx.fill();
      mctx.fillStyle = '#7a6a55';
      mctx.beginPath();
      mctx.ellipse(-2*s, -2*s, 5*s, 3*s, -0.3, 0, Math.PI*2);
      mctx.fill();
      if (s > 0.9) {
        mctx.fillStyle = '#4a3a28';
        mctx.beginPath();
        mctx.ellipse(5*s, 2*s, 4*s, 3*s, 0.4, 0, Math.PI*2);
        mctx.fill();
      }
    } else if (d.type === 2) {
      // Buisson/Herbe sombre
      mctx.fillStyle = '#2a3a1a';
      for (var i = 0; i < 3; i++) {
        mctx.beginPath();
        mctx.arc(i*5*s-4*s, 0, 5*s, 0, Math.PI*2);
        mctx.fill();
      }
    } else {
      // Crâne
      mctx.fillStyle = '#8a7a6a';
      mctx.beginPath();
      mctx.arc(0, 0, 5*s, 0, Math.PI*2);
      mctx.fill();
      mctx.fillStyle = '#06050f';
      mctx.beginPath(); mctx.arc(-2*s, 0, 1.5*s, 0, Math.PI*2); mctx.fill();
      mctx.beginPath(); mctx.arc(2*s,  0, 1.5*s, 0, Math.PI*2); mctx.fill();
    }
    mctx.restore();
  }

  function drawNode(n) {
    var x = n.x, y = n.y;
    var r = nodeRadius(n);
    var flicker = Math.sin(torchT * 0.07 + n.id) * 0.06;

    mctx.save();

    // Passage secret
    if (n.type === 'passage') {
      if (n.state === 'done') {
        // Portail sombre
        mctx.beginPath(); mctx.arc(x,y,r+6,0,Math.PI*2);
        mctx.fillStyle='rgba(10,0,30,0.9)'; mctx.fill();
        mctx.strokeStyle='rgba(144,96,208,0.5)'; mctx.lineWidth=2; mctx.stroke();
        mctx.fillStyle='rgba(80,40,160,0.7)';
        mctx.font='bold '+(r*1.2)+'px serif';
        mctx.textAlign='center'; mctx.textBaseline='middle';
        mctx.fillText('⬡', x, y+1);
      } else {
        // Lueur violette pulsante
        var pGlow = r + 10 + Math.sin(torchT * 0.05) * 6;
        var pGrad = mctx.createRadialGradient(x,y,0,x,y,pGlow);
        pGrad.addColorStop(0,'rgba(144,96,208,0.35)');
        pGrad.addColorStop(1,'rgba(144,96,208,0)');
        mctx.beginPath(); mctx.arc(x,y,pGlow,0,Math.PI*2);
        mctx.fillStyle=pGrad; mctx.fill();

        mctx.beginPath(); mctx.arc(x,y,r,0,Math.PI*2);
        var pStone = mctx.createRadialGradient(x-r*0.3,y-r*0.3,0,x,y,r);
        pStone.addColorStop(0,'#1a0a2e');
        pStone.addColorStop(1,'#06030f');
        mctx.fillStyle=pStone; mctx.fill();
        mctx.strokeStyle='rgba(144,96,208,0.8)'; mctx.lineWidth=2; mctx.stroke();

        // Fissure (lignes canvas)
        mctx.strokeStyle='rgba(180,120,255,0.9)'; mctx.lineWidth=1.2;
        mctx.beginPath(); mctx.moveTo(x-4,y-5); mctx.lineTo(x+1,y); mctx.lineTo(x-2,y+5); mctx.stroke();
        mctx.beginPath(); mctx.moveTo(x+1,y); mctx.lineTo(x+4,y+2); mctx.stroke();

        // Particules violettes
        for (var pi=0; pi<4; pi++) {
          var pAngle = (torchT*0.04 + pi * Math.PI/2);
          var pr = r + 4 + Math.sin(torchT*0.06+pi)*3;
          var px2 = x + Math.cos(pAngle)*pr;
          var py2 = y + Math.sin(pAngle)*pr;
          mctx.beginPath(); mctx.arc(px2,py2,1.2,0,Math.PI*2);
          mctx.fillStyle='rgba(180,120,255,'+(0.4+Math.sin(torchT*0.08+pi)*0.3)+')';
          mctx.fill();
        }
      }
      mctx.restore();
      return;
    }


    if (n.state === 'done') {
      // Nœud visité — teinte or foncé
      mctx.beginPath(); mctx.arc(x,y,r+4,0,Math.PI*2);
      mctx.fillStyle = 'rgba(80,60,10,0.3)'; mctx.fill();
      mctx.beginPath(); mctx.arc(x,y,r,0,Math.PI*2);
      mctx.fillStyle = 'rgba(60,45,10,0.85)'; mctx.fill();
      mctx.strokeStyle = 'rgba(201,165,80,0.6)'; mctx.lineWidth=1.5;
      mctx.stroke();
      // Icône ✓
      mctx.fillStyle = 'rgba(201,165,80,0.5)';
      mctx.font = 'bold '+(r*0.9)+'px serif';
      mctx.textAlign='center'; mctx.textBaseline='middle';
      mctx.fillText('✓', x, y+1);

    } else if (n.state === 'available') {
      // Nœud dispo — lueur animée
      var glow = r + 8 + flicker * 12;
      var grad = mctx.createRadialGradient(x,y,0,x,y,glow);
      grad.addColorStop(0,'rgba(201,165,80,0.25)');
      grad.addColorStop(1,'rgba(201,165,80,0)');
      mctx.beginPath(); mctx.arc(x,y,glow,0,Math.PI*2);
      mctx.fillStyle=grad; mctx.fill();

      // Pierre taillée
      mctx.beginPath(); mctx.arc(x,y,r,0,Math.PI*2);
      var stoneGrad = mctx.createRadialGradient(x-r*0.3,y-r*0.3,0,x,y,r);
      stoneGrad.addColorStop(0,'#3a2e1a');
      stoneGrad.addColorStop(1,'#1a1208');
      mctx.fillStyle=stoneGrad; mctx.fill();
      mctx.strokeStyle='rgba(201,165,80,0.9)'; mctx.lineWidth=2;
      mctx.stroke();

      // ? (ou 🔥 pour le feu de camp avant-boss)
      if (n.type === 'campfire') {
        mctx.font = (r*1.2)+'px serif';
        mctx.textAlign='center'; mctx.textBaseline='middle';
        mctx.fillText('🔥', x, y+1);
      } else {
        mctx.fillStyle='#C9A550';
        mctx.font='bold '+(r*1.1)+'px Cinzel,serif';
        mctx.textAlign='center'; mctx.textBaseline='middle';
        mctx.fillText('?', x, y+1);
      }

      // Boss ou start : icône spéciale
      if (n.id===10) {
        mctx.font='bold '+(r*1.1)+'px serif';
        mctx.fillText('☠', x, y+1);
      }

    } else if (n.id === 0 && n.state === 'done') {
      // Entrée
    } else {
      // Locked — pierre sombre
      mctx.beginPath(); mctx.arc(x,y,r,0,Math.PI*2);
      mctx.fillStyle='rgba(20,15,8,0.7)'; mctx.fill();
      mctx.strokeStyle='rgba(80,60,30,0.2)'; mctx.lineWidth=1;
      mctx.stroke();
    }

    // Label spécial boss
    if (n.id === 10 && n.state === 'available') {
      mctx.font = 'bold 10px Cinzel,serif';
      mctx.fillStyle = 'rgba(220,80,80,0.8)';
      mctx.textAlign='center'; mctx.textBaseline='top';
      mctx.fillText('BOSS', x, y+r+4);
    }
    // Label feu de camp
    if (n.type === 'campfire' && n.state === 'available') {
      mctx.font = 'bold 9px Cinzel,serif';
      mctx.fillStyle = 'rgba(230,150,80,0.9)';
      mctx.textAlign='center'; mctx.textBaseline='top';
      mctx.fillText(CGE_LANG==='en'?'REST':'REPOS', x, y+r+4);
    }

    mctx.restore();
  }

  function drawTorch(x, y) {
    // Flamme animée sur le nœud actif (dernière salle visitée)
    var flicker = Math.sin(torchT * 0.11) * 3;
    mctx.save();
    mctx.globalAlpha = 0.85;
    var grad = mctx.createRadialGradient(x, y-20, 0, x, y-20, 18+flicker);
    grad.addColorStop(0,'rgba(255,200,60,0.7)');
    grad.addColorStop(0.5,'rgba(255,100,20,0.35)');
    grad.addColorStop(1,'rgba(255,50,0,0)');
    mctx.beginPath(); mctx.arc(x, y-20, 18+flicker, 0, Math.PI*2);
    mctx.fillStyle = grad; mctx.fill();
    mctx.restore();
  }

  function render() {
    if (!mc || !mctx || !_rafRunning) return;
    torchT++;
    mctx.clearRect(0,0,W,H);

    computePositions();

    // Fond légèrement teinté — laisse passer l'image de zone
    var bgGrad = mctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.7);
    bgGrad.addColorStop(0,'rgba(6,3,1,0.22)');
    bgGrad.addColorStop(1,'rgba(2,1,0,0.38)');
    mctx.fillStyle = bgGrad;
    mctx.fillRect(0,0,W,H);

    // Grille vieille carte
    mctx.save();
    mctx.globalAlpha = 0.04;
    mctx.strokeStyle = '#8a6a30';
    mctx.lineWidth = 1;
    for(var gx=0;gx<W;gx+=20){ mctx.beginPath(); mctx.moveTo(gx,0); mctx.lineTo(gx,H); mctx.stroke(); }
    for(var gy=0;gy<H;gy+=20){ mctx.beginPath(); mctx.moveTo(0,gy); mctx.lineTo(W,gy); mctx.stroke(); }
    mctx.restore();

    // Décors
    if (DungeonMap._decors) DungeonMap._decors.forEach(drawDecor);

    // Chemins
    EDGES.forEach(function(e) {
      var a = nodes.find(function(n){ return n.id===e[0]; });
      var b = nodes.find(function(n){ return n.id===e[1]; });
      if (!a||!b) return;
      var done = a.state==='done' && b.state==='done';
      drawPath(a.x,a.y,b.x,b.y,done);
    });

    // Torche sur dernier nœud visité
    var lastDone = null;
    nodes.forEach(function(n){ if(n.state==='done') lastDone=n; });
    if (lastDone && lastDone.id > 0) drawTorch(lastDone.x, lastDone.y);

    // Nœuds
    nodes.forEach(drawNode);

    if (_rafRunning) requestAnimationFrame(render);
  }

  function onTap(evt) {
    evt.preventDefault();
    var rect = mc.getBoundingClientRect();
    var touch = evt.touches ? evt.touches[0] : evt;
    var tx = (touch.clientX - rect.left) * (W / rect.width);
    var ty = (touch.clientY - rect.top)  * (H / rect.height);

    var hit = null;
    nodes.forEach(function(n) {
      if (n.state !== 'available') return;
      var dx = tx-n.x, dy = ty-n.y;
      var r = nodeRadius(n) + 10; // zone tap élargie
      if (dx*dx+dy*dy < r*r) hit = n;
    });
    if (!hit) return;

    if (hit.type === 'passage') {
      hit.state = 'done';
      DungeonMap.enterPassage();
      return;
    }

    document.getElementById('dm-node-info').textContent = 'En route...';
    hit.state = 'done';
    unlockChildren(hit.id);

    // Feedback vibration
    if (navigator.vibrate) navigator.vibrate(30);

    setTimeout(function(){
      document.getElementById('dm-node-info').textContent = T('dm.nodeinfo');
      State.potions = State.potions !== undefined ? State.potions : 2;
      var type = hit.type;
      if (type === 'rest') {
        Rooms.showRest();
      } else if (type === 'shop') {
        Rooms.showShop();
      } else if (type === 'mystery') {
        Rooms.showMystery();
      } else if (type === 'trap') {
        Rooms.showTrap(function() { startCombat('combat'); });
      } else if (type === 'campfire') {
        showCampfire();
      } else {
        startCombat(type);
      }
    }, 500);

    function startCombat(type) {
        // combat / elite / boss → ennemi
        var zone = State._currentZone;
        var pool = type === 'boss'
          ? ENEMIES.filter(function(e){ return e.boss && (!e.zones||!e.zones.length||!zone||e.zones.indexOf(zone)>=0); })
          : getEnemiesForFloor(State.floor||1);
        if (!pool.length) pool = ENEMIES.filter(function(e){ return !e.boss; });
        var enemyData = pool[Math.floor(Math.random()*pool.length)];
        var zm = State._zoneMod || { hpMult:1, atkMult:1, defMult:1, goldMult:1 };
        // ── ÉQUILIBRAGE RELATIF AU JOUEUR (TTK borné) ──────────────────
        // L'ancienne courbe de PV était exponentielle (×1 → ×15000) alors que les
        // dégâts du joueur n'augmentent qu'additivement → ennemis-éponges injouables.
        // On dimensionne désormais PV/dégâts ennemis PAR RAPPORT au joueur : un
        // nombre de coups cible (TTK) + des dégâts en % des PV max. Combats nerveux
        // quel que soit le niveau/équipement, et plus jamais de boss à 200 coups.
        var diff = (ZONE_DIFF[zone] || 1) * (1 + ((State.floor||1)-1) * 0.06);
        var pAtk = Math.max(1, State.atk||1);
        var pMax = Math.max(1, State.hpMax||100);
        var eDef = Math.round(pAtk * 0.10 * (type==='boss'?1.3:1));
        var pDmg = Math.max(1, pAtk - eDef);            // dégâts par coup du joueur
        var targetHits = type==='boss' ? 15 : (type==='elite' ? 9 : 5);
        var hpRamp = 1 + (diff - 1) * 0.3;              // léger allongement en zone tardive
        var eHP  = Math.max(2, Math.round(pDmg * targetHits * hpRamp));
        var dmgPct = type==='boss' ? 0.18 : (type==='elite' ? 0.22 : 0.16);
        var eAtk = Math.min(Math.round(pMax * dmgPct * (1 + (diff-1)*0.15)), Math.round(pMax * 0.36));
        eAtk = Math.max(1, eAtk);
        var eGold = Math.round((enemyData.gold||5) * diff * (type==='boss'?5:(type==='elite'?1.6:1)) * GOLD_FACTOR);
        enemyData = Object.assign({}, enemyData, {
          hp:   eHP,
          atk:  eAtk,
          def:  eDef,
          gold: eGold,
          boss: type==='boss',
          name: type==='boss' ? '☠ '+enemyData.name : (type==='elite' ? '★ '+enemyData.name : enemyData.name),
        });
        State._inCombat = true;
        Nav.go('combat-screen');
        setTimeout(function(){ Combat.start(enemyData); }, 350);
    }
  }  // close onTap

  return {
    _decors: null,
    get _rafRunning() { return _rafRunning; },
    set _rafRunning(v) { _rafRunning = v; },
    // Relance la boucle de rendu en revenant sur la carte (ex. après un combat)
    // sans régénérer les nœuds — préserve la progression de l'étage.
    resume: function() {
      if (!mc || !mctx || _rafRunning) return;
      _rafRunning = true;
      requestAnimationFrame(render);
    },
    init: function(floor, hp, hpMax) {
      mc = document.getElementById('map-canvas');
      var wrap = document.getElementById('dm-canvas-wrap');
      W = wrap.offsetWidth - 0;
      H = wrap.offsetHeight - 0;
      mc.width = W; mc.height = H;
      mctx = mc.getContext('2d');
      mc.removeEventListener('click', onTap);
      mc.removeEventListener('touchstart', onTap);
      mc.addEventListener('click', onTap);
      mc.addEventListener('touchstart', onTap, { passive:false });
      _rafRunning = true;
      requestAnimationFrame(render);
      initMap(floor, hp, hpMax);
      // Passage hint visibility
      var hint = document.getElementById('passage-hint');
      if (hint) {
        var showHint = State._currentZone === 'grottes' && Meta.completedQuests && Meta.completedQuests['seraphine_3'];
        hint.style.opacity = showHint ? '1' : '0';
      }
    },
    enterPassage: function() {
      var ft = document.getElementById('floor-transition');
      var ftLabel = document.getElementById('ft-label');
      var ftNum = document.getElementById('ft-num');
      var ftSub = document.getElementById('ft-sub');
      var ftMem = document.getElementById('ft-memory');

      ftLabel.textContent = T('passage.label');
      ftNum.textContent = '⬡';
      ftSub.textContent = T('passage.sub');
      ftMem.textContent = T('passage.text');
      ftMem.classList.add('show');
      ft.classList.add('show');
      ft.style.background = 'radial-gradient(ellipse at center, #1a0a2e 0%, #06030f 100%)';
      ftNum.style.color = '#9060d0';

      setTimeout(function(){
        ft.classList.remove('show');
        ft.style.background = '';
        ftNum.style.color = '';
        ftMem.classList.remove('show');
        Meta.passageFound = true;
        Meta.save();
        Nav.go('world-map-2');
      }, 5000);
    }
  };
})();

// ── EQUIP SCREEN ─────────────────────────────────────────────────
var SLOT_DEFAULTS = {
  heaume:'🪖', arme:'⚔', bouclier:'🛡', gants:'🧤',
  bottes:'👢', ceinture:'🪢', jambieres:'🦵', collier:'📿', plastron:'🥋',
  bague_gauche:'💍', bague_droite:'💍'
};

var EquipScreen = (function() {
  var _from = 'inn-room';
  var _detail = null; // { item, slot, src } — currently shown in detail panel

  var SLOT_DEFAULT_ICO = {
    arme:'⚔', bouclier:'🛡', heaume:'🪖', plastron:'🥋',
    gants:'🧤', ceinture:'➰', jambieres:'🦵', bottes:'👢',
    collier:'📿', bague_gauche:'💍', bague_droite:'💍'
  };

  function _statSummary(item) {
    return (item && item.stats) ? formatStats(item.stats) : '';
  }

  // Comparaison des stats vs équipement actuel — délègue au helper global partagé.
  function _comparisonHtml(item, slot) { return buildCompareHtml(item, slot); }

  function _refreshSlots() {
    var eq = State.equipped || {};
    var slots = ['arme','bouclier','heaume','plastron','gants','ceinture','jambieres','bottes','collier','bague_gauche','bague_droite'];
    slots.forEach(function(slot) {
      var item = eq[slot];
      var row  = document.getElementById('eq-row-'+slot);
      var ico  = document.getElementById('eq-ico-'+slot);
      var name = document.getElementById('eq-name-'+slot);
      var stat = document.getElementById('eq-stat-'+slot);
      if (!row) return;
      if (item) {
        row.classList.add('has-item');
        if (ico)  { ico.textContent = item.ico || SLOT_DEFAULT_ICO[slot] || '?'; }
        if (name) { name.textContent = item.name; name.className = 'eq-slot-item-name'; }
        if (stat) { stat.textContent = _statSummary(item); }
      } else {
        row.classList.remove('has-item');
        if (ico)  { ico.textContent = SLOT_DEFAULT_ICO[slot] || '?'; }
        if (name) { name.textContent = T('equip.empty'); name.className = 'eq-slot-item-name eq-slot-empty'; }
        if (stat) { stat.textContent = ''; }
      }
    });

    // Stats bar
    var atkEl = document.getElementById('eqs-atk');
    var defEl = document.getElementById('eqs-def');
    var hpEl  = document.getElementById('eqs-hp');
    var lvlEl = document.getElementById('eqs-lvl');
    if (atkEl) atkEl.textContent = State.atk || 0;
    if (defEl) defEl.textContent = State.def || 0;
    if (hpEl)  hpEl.textContent  = (State.hp||0)+'/'+( State.hpMax||0);
    if (lvlEl) lvlEl.textContent = State.level || 1;
    var manaEl = document.getElementById('eqs-mana');
    var manaPill = document.getElementById('eqs-mana-pill');
    if (manaPill) manaPill.style.display = (State.manaMax||0) > 0 ? '' : 'none';
    if (manaEl) manaEl.textContent = (State.mana||0)+'/'+( State.manaMax||0);

    // Inventory
    _refreshInventory();
  }

  function _refreshInventory() {
    var inv  = State.inventory || [];
    var grid = document.getElementById('eq-inv-grid');
    var cnt  = document.getElementById('eq-inv-count');
    if (!grid) return;
    if (cnt) cnt.textContent = inv.length;
    grid.innerHTML = '';
    var total = Math.max(8, inv.length + (inv.length < 8 ? 8 - inv.length : 0));
    for (var i = 0; i < 8; i++) {
      var card = document.createElement('div');
      if (i < inv.length) {
        var it = inv[i];
        var idx = i;
        card.className = 'eq-inv-card rarity-'+(it.rarity||'common');
        card.innerHTML =
          '<div class="card-ico">'+it.ico+'</div>'+
          '<div class="card-name">'+it.name+'</div>'+
          '<div class="card-stat">'+_statSummary(it)+'</div>';
        (function(item, ii) {
          card.addEventListener('click', function() {
            showDetail({ item:item, src:'inv', idx:ii });
          });
        })(it, idx);
      } else {
        card.className = 'eq-inv-card empty';
        card.innerHTML = '<div style="font-size:20px;opacity:0.2">+</div>';
      }
      grid.appendChild(card);
    }
  }

  function showDetail(ctx) {
    // ctx = { item, slot (if equipped), src ('slot'|'inv'), idx }
    _detail = ctx;
    var item = ctx.item;
    var panel = document.getElementById('eq-detail-panel');
    var overlay = document.getElementById('eq-detail-overlay');

    document.getElementById('eq-detail-ico').textContent  = item.ico || '?';
    document.getElementById('eq-detail-name').textContent = item.name || '—';
    document.getElementById('eq-detail-slot').textContent = getSlotLabel(item.slot || ctx.slot);
    document.getElementById('eq-detail-desc').textContent = item.desc || '';

    // Stats chips (toutes les stats de l'objet)
    var statsDiv = document.getElementById('eq-detail-stats');
    statsDiv.innerHTML = '';
    if (item.stats) {
      STAT_ORDER.forEach(function(k) {
        if (!item.stats[k]) return;
        var m = STAT_META[k];
        var chip = document.createElement('div');
        chip.className = 'eq-ds';
        chip.innerHTML = m.ico+' <span>'+fmtStatVal(k, item.stats[k])+'</span> <span style="font-size:9px;opacity:0.5">'+(CGE_LANG==='en'?m.en:m.fr)+'</span>';
        statsDiv.appendChild(chip);
      });
      // Comparaison avec l'équipement actuel (objets d'inventaire uniquement)
      if (ctx.src === 'inv' && (item.slot || ctx.slot)) {
        var cmp = document.createElement('div');
        cmp.className = 'eq-cmp-wrap';
        cmp.innerHTML = _comparisonHtml(item, item.slot || ctx.slot);
        statsDiv.appendChild(cmp);
      }
    }

    var equipBtn  = document.getElementById('eq-detail-equip');
    var removeBtn = document.getElementById('eq-detail-remove');
    if (ctx.src === 'slot') {
      // Equipped item — show Remove
      equipBtn.style.display  = 'none';
      removeBtn.style.display = '';
    } else {
      // Inventory item — show Equip
      equipBtn.style.display  = '';
      removeBtn.style.display = 'none';
    }

    panel.classList.add('open');
    overlay.classList.add('open');
  }

  function closeDetail() {
    _detail = null;
    document.getElementById('eq-detail-panel').classList.remove('open');
    document.getElementById('eq-detail-overlay').classList.remove('open');
  }

  // Équipe réellement l'objet courant (_detail) dans un slot précis.
  function _doEquip(targetSlot) {
    var item = _detail.item;
    var inv  = State.inventory || [];
    if (State.equipped[targetSlot]) {           // slot occupé → renvoyer l'ancien au sac
      var old = State.equipped[targetSlot];
      applyItemStats(old, -1);
      inv.splice(_detail.idx, 1, old);
    } else {
      inv.splice(_detail.idx, 1);
    }
    State.equipped[targetSlot] = item;
    applyItemStats(item, 1);
    State.hp = Math.min(State.hp, State.hpMax);
    State.inventory = inv;
    closeDetail();
    _refreshSlots();
    if (typeof State.saveRun === 'function') State.saveRun();
  }

  function detailEquip() {
    if (!_detail || _detail.src !== 'inv') return;
    var item = _detail.item;
    // Anneaux : choisir quelle bague remplacer si les DEUX sont occupées
    if (item.slot === 'bague') {
      var lg = State.equipped.bague_gauche, rd = State.equipped.bague_droite;
      if (!lg) { _doEquip('bague_gauche'); return; }
      if (!rd) { _doEquip('bague_droite'); return; }
      // les deux occupées → demander
      var en = CGE_LANG === 'en';
      CGEModal.show({
        title: en ? 'Replace which ring?' : 'Remplacer quelle bague ?',
        html: '<div style="text-align:left;font-size:12px;color:rgba(237,232,223,0.7)">'+
              '💍 '+(en?'Left':'Gauche')+' : <b>'+lg.name+'</b> <span style="opacity:.6">'+_statSummary(lg)+'</span><br>'+
              '💍 '+(en?'Right':'Droite')+' : <b>'+rd.name+'</b> <span style="opacity:.6">'+_statSummary(rd)+'</span></div>',
        okLabel: '💍 '+(en?'Replace Left':'Remplacer gauche'),
        cancelLabel: '💍 '+(en?'Replace Right':'Remplacer droite'),
        onOk:     function(){ _doEquip('bague_gauche'); },
        onCancel: function(){ _doEquip('bague_droite'); }
      });
      return;
    }
    _doEquip(item.slot);
  }

  function detailRemove() {
    if (!_detail || _detail.src !== 'slot') return;
    var slot = _detail.slot || (_detail.item && _detail.item.slot);
    var item = State.equipped[slot];
    if (!item) return;
    State.inventory = State.inventory || [];
    if (State.inventory.length >= 8) {
      CGEModal.alert(T('shop.inv.full'), T('shop.inv.full.unequip'));
      return;
    }
    applyItemStats(item, -1);
    State.equipped[slot] = null;
    State.hp = Math.min(State.hp, State.hpMax);
    State.inventory.push(item);
    closeDetail();
    _refreshSlots();
    if (typeof State.saveRun === 'function') State.saveRun();
  }

  function tapSlot(slot) {
    var item = (State.equipped || {})[slot];
    if (item) {
      showDetail({ item:item, slot:slot, src:'slot' });
    }
    // If empty slot, do nothing (or could show inventory filtered by slot)
  }

  return {
    open: function(from) {
      _from = from || 'inn-room';
      State._heroFrom = _from;
      _refreshSlots();
      Nav.go('hero-screen');
    },
    close: function() {
      closeDetail();
      // Utiliser State._heroFrom (mis à jour par TOUTES les entrées : équipement,
      // guilde, etc.) — _from seul pouvait être périmé (ex. 'dungeon-map').
      Nav.go(State._heroFrom || _from || 'inn-room');
    },
    tapSlot: tapSlot,
    showDetail: showDetail,
    closeDetail: closeDetail,
    detailEquip: detailEquip,
    detailRemove: detailRemove,
    refresh: _refreshSlots
  };
})();

// ── CHEST SCREEN ─────────────────────────────────────────────────
var ChestScreen = {
  _tab: 'chest',

  open: function() {
    ChestScreen._tab = 'chest';
    ChestScreen.render();
    Nav.go('chest-screen');
  },

  close: function() {
    Nav.go('inn-room');
  },

  showTab: function(tab) {
    ChestScreen._tab = tab;
    document.getElementById('chest-tab-chest').classList.toggle('active', tab==='chest');
    document.getElementById('chest-tab-inv').classList.toggle('active', tab==='inv');
    ChestScreen.render();
  },

  render: function() {
    var chest = Meta.chest || [];
    var inv   = State.inventory || [];
    document.getElementById('chest-used').textContent = chest.length;
    var chestGrid = document.getElementById('chest-grid');
    var invGrid   = document.getElementById('chest-inv-grid');
    chestGrid.style.display = ChestScreen._tab==='chest' ? 'grid' : 'none';
    invGrid.style.display   = ChestScreen._tab==='inv'   ? 'grid' : 'none';

    // Chest tab: 20 slots
    if (ChestScreen._tab === 'chest') {
      chestGrid.innerHTML = '';
      for (var i = 0; i < 20; i++) {
        var div = document.createElement('div');
        div.className = 'chest-slot' + (chest[i] ? ' occupied' : '');
        if (chest[i]) {
          var it = chest[i];
          div.innerHTML = '<div class="cs-ico">'+it.ico+'</div><div class="cs-name">'+it.name+'</div><div class="cs-stat">'+it.desc+'</div>';
          (function(idx){
            div.addEventListener('click', function(){
              // Move chest → inventory
              var item = Meta.chest[idx];
              if (!item) return;
              if ((State.inventory||[]).length >= 8) { CGEModal.alert(T('shop.inv.full'), T('shop.inv.full.limit')); return; }
              Meta.chest.splice(idx, 1);
              State.inventory.push(item);
              Meta.save();
              ChestScreen.render();
            });
          })(i);
        }
        chestGrid.appendChild(div);
      }
    }
    // Inv tab: player's current inventory
    if (ChestScreen._tab === 'inv') {
      invGrid.innerHTML = '';
      var maxInv = 8;
      for (var j = 0; j < maxInv; j++) {
        var div2 = document.createElement('div');
        div2.className = 'chest-slot' + (inv[j] ? ' occupied' : '');
        if (inv[j]) {
          var it2 = inv[j];
          div2.innerHTML = '<div class="cs-ico">'+it2.ico+'</div><div class="cs-name">'+it2.name+'</div><div class="cs-stat">'+it2.desc+'</div>';
          (function(jdx){
            div2.addEventListener('click', function(){
              // Move inv → chest
              var item = (State.inventory||[])[jdx];
              if (!item) return;
              if ((Meta.chest||[]).length >= 20) { CGEModal.alert('Coffre plein', 'Le coffre ne peut contenir plus de 20 objets.'); return; }
              State.inventory.splice(jdx, 1);
              Meta.chest.push(item);
              Meta.save();
              ChestScreen.render();
            });
          })(j);
        }
        invGrid.appendChild(div2);
      }
    }
  },
};

// ── INTRO ─────────────────────────────────────────────────────────
var menuShown = false;

function runIntro() {
  tick();
  Nav.current = 'title-screen';
  // Forcer HUD caché sur title screen
  var hud = document.getElementById('global-hud');
  if (hud) hud.style.display = 'none';
  // Lancer les animations CSS après un court délai
  setTimeout(function(){
    var ts = screens['title-screen'];
    if (ts) ts.classList.add('active');
  }, 100);
  // Activer tap après les animations
  setTimeout(function(){
    if (menuShown) return;
    screens['title-screen'].addEventListener('click', goToMenu, { once:true });
    screens['title-screen'].addEventListener('touchend', goToMenu, { once:true });
  }, 2000);
  setTimeout(goToMenu, 14000);
}

function goToMenu() {
  if (menuShown) return; menuShown = true;
  screens['title-screen'].removeEventListener('click', goToMenu);
  screens['title-screen'].removeEventListener('touchend', goToMenu);
  // Stats méta dans le menu
  var metaEl = document.getElementById('menu-stats');
  if (metaEl) metaEl.textContent = Meta.totalRuns > 0
    ? 'Runs : '+Meta.totalRuns+'  ·  Meilleur étage : '+Meta.bestFloor : '';
  // Toujours proposer le choix de la langue au lancement (la langue sauvegardée
  // est pré-appliquée pour l'affichage)
  var savedLang = localStorage.getItem('cge_lang');
  if (savedLang) { CGE_LANG = savedLang; LangSystem.applyAll(); }
  Nav.go('lang-screen');
  buildCharSelect();
}

// ── APP ───────────────────────────────────────────────────────────
// ── VOYAGE ───────────────────────────────────────────────────────
var Travel = {
  openMap: function() {
    document.getElementById('tv-floor-num').textContent =
      ['I','II','III','IV','V','VI'][(State.floor||1)-1]||'I';
    // Verrouiller l'Abîsse avant étage 5
    var abyss = document.getElementById('tv-abyss');
    if ((State.floor||1) < 5) {
      abyss.classList.add('locked');
      document.getElementById('tv-abyss-lock').textContent = T('hud.floor')+' 5+';
    } else {
      abyss.classList.remove('locked');
      document.getElementById('tv-abyss-lock').textContent = T('misc.available');
    }
    Nav.go('travel-screen');
  },

  goCamp: function() {
    var heal = Math.round(State.hpMax * 0.35);
    State.hp = Math.min(State.hpMax, (State.hp||0) + heal);
    Sfx.heal();
    Nav.go('rest-screen');
    document.getElementById('rest-heal-val').textContent = '+'+heal+' '+T('hero.hp');
    updateMapHpBar();
  },

  goTown: function() {
    Rooms.showShop();
  },

  goAlternateDungeon: function(type) {
    var modifiers = {
      cave:  { floorMod:0, atkMod:0.7,  defMod:0.7,  goldMod:0.8,  label:'Grotte' },
      ruins: { floorMod:2, atkMod:1.4,  defMod:1.2,  goldMod:1.5,  label:'Ruines' },
      abyss: { floorMod:4, atkMod:2.0,  defMod:1.8,  goldMod:2.5,  label:'Abîsse' },
    };
    var mod = modifiers[type];
    State._dungeonMod = mod;
    State.floor = 1;
    Nav.go('dungeon-map');
    setTimeout(function(){
      DungeonMap.init(1 + mod.floorMod, State.hp, State.hpMax);
    }, 300);
  },
};

// ── INN ROOM ───────────────────────────────────────────────────────
var InnRoom = {
  enter: function() {
    var r = RACES.find(function(x){ return x.id===State.race; })||RACES[0];
    var c = CLASSES.find(function(x){ return x.id===State.cls; })||CLASSES[0];
    var el = document.getElementById('inn-hero-name');
    var heroName = State.name && State.name !== 'Aventurier' ? State.name + ' · ' : '';
    if (el) el.textContent = heroName + (r.icon||'') + ' ' + (CGE_LANG==='en'&&r.nameEn?r.nameEn:r.name) + ' ' + (CGE_LANG==='en'&&c.nameEn?c.nameEn:c.name);
    InnRoom.updateHp();
    if (typeof HUD !== 'undefined') HUD.updateHP();
    State.saveRun(); // auto-save à chaque retour à l'auberge
    // Dialogue Marta — première arrivée
    if (State._showMartaIntro) {
      State._showMartaIntro = false;
      State.saveRun();
      setTimeout(function(){
        var trait = (State._introChoices || {}).trait;
        var en = CGE_LANG === 'en';
        var opener = en
          ? (trait === 'cold' ? 'You were shivering when they found you. Like a dead man.'
            : trait === 'pain' ? 'You were moaning in your sleep. Three days.'
            : 'You didn\'t make a sound. We wondered if you\'d ever wake up.')
          : (trait === 'cold' ? 'Tu frissonnais quand on t\'a trouvé. Comme un mort.'
            : trait === 'pain' ? 'Tu gémissais dans ton sommeil. Trois jours.'
            : 'Tu n\'as pas fait un bruit. On se demandait si tu allais te réveiller.');
        var martaText = en
          ? opener + '\n\n"I\'m Marta, the landlady of The Broken Shield. Someone brought you here unconscious three days ago. You owe me 50 coins for the room and care.\n\nIf you want to know where you come from... try the tavern. The people who remember you — if there are any — hang around there."'
          : opener + '\n\n"Je suis Marta, l\'hôtesse de L\'Écu Brisé. Quelqu\'un t\'a amené ici inconscient il y a trois jours. Tu dois me 50 pièces pour la chambre et les soins.\n\nSi tu veux savoir d\'où tu viens... essaie la taverne. Les gens qui se souviennent de toi — si tant est qu\'il y en ait — traînent là-bas."';
        CGEModal.show({
          title: 'Marta',
          text: martaText,
          okLabel: T('modal.ok'),
          onOk: function() {
            // Première quête : payer Marta
            if (typeof Meta !== 'undefined' && !(Meta.completedQuests||{})['marta_debt']) {
              Meta.activeQuests = Meta.activeQuests || {};
              Meta.activeQuests['marta_debt'] = true;
              Meta.save();
            }
          }
        });
      }, 600);
    }
  },
  updateHp: function() {
    var hp = State.hp||0, hpMax = State.hpMax||1;
    var fill = document.getElementById('inn-hp-bar-fill');
    var txt  = document.getElementById('inn-hp-text');
    if (fill) fill.style.width = Math.max(0, Math.min(100, hp/hpMax*100)) + '%';
    if (txt)  txt.textContent = hp + ' / ' + hpMax + ' ' + T('hero.hp');
  },
  rest: function() {
    var cost = 15;
    var wasMaxHp = (State.hp||0) >= (State.hpMax||1);
    var hadStatuses = (State.persistentStatuses||[]).length > 0;
    if (wasMaxHp && !hadStatuses) { InnRoom.showStatusBanner(T('inn.fullhp')); return; }
    if ((State.gold||0) < cost) {
      InnRoom.showStatusBanner(T('inn.needgold').replace('{n}', cost));
      return;
    }
    State.gold -= cost;
    var heal = (State.hpMax||1) - (State.hp||0);
    State.hp = State.hpMax;
    State.persistentStatuses = [];
    InnRoom.updateHp();
    InnRoom.showStatusBanner(hadStatuses ? T('inn.rested.status') : T('inn.rested').replace('{n}', heal));
    if (typeof HUD !== 'undefined') { HUD.updateGold(); HUD.updateHP(); }
    if (typeof Sfx !== 'undefined' && Sfx.heal) Sfx.heal();
  },
  showStatusBanner: function(msg) {
    var b = document.getElementById('inn-status-banner');
    if (!b) return;
    b.textContent = msg;
    b.classList.add('show');
    setTimeout(function(){ b.classList.remove('show'); }, 2500);
  },
  showChest: function() {
    var gold = State.gold||0;
    var potions = State.potions||0;
    CGEModal.alert('Inventaire', 'Or : ' + gold + '  •  Potions : ' + potions + '\nATQ : ' + (State.atk||0) + '  •  DEF : ' + (State.def||0));
  },
};

// ── ADS — couche d'abstraction publicité ─────────────────────────
// API unique pour tout le jeu : Ads.showRewarded(onReward, onSkip).
// - Web / itch.io : pas de vraie régie (iframe sandboxée) → simulation.
// - Android (Capacitor + AdMob) : brancher l'appel natif dans _native().
// Le code du jeu n'appelle JAMAIS de régie directement → passer au Play
// Store ne demande de modifier QUE ce module.
var Ads = (function(){
  function _isNative(){
    return typeof window !== 'undefined' && window.Capacitor &&
           typeof window.Capacitor.isNativePlatform === 'function' &&
           window.Capacitor.isNativePlatform();
  }
  // Backend web/itch : simulation via modale
  function _web(onReward, onSkip){
    CGEModal.show({
      title: T('ads.title'),
      text: T('ads.body'),
      okLabel: T('ads.watch'),
      cancelLabel: T('modal.cancel'),
      onOk: function(){ setTimeout(function(){ onReward && onReward(); }, 500); },
      onCancel: function(){ onSkip && onSkip(); }
    });
  }
  // Backend natif AdMob — à brancher lors du wrap Capacitor.
  // En attendant, repli sur la simulation pour ne jamais bloquer le joueur.
  function _native(onReward, onSkip){
    // TODO Play Store : AdMob.prepareRewardVideoAd({adId:'...'})
    //   .then(function(){ return AdMob.showRewardVideoAd(); })
    //   .then(function(){ onReward(); }).catch(function(){ onSkip && onSkip(); });
    _web(onReward, onSkip);
  }
  return {
    isNative: _isNative,
    showRewarded: function(onReward, onSkip){
      try { _isNative() ? _native(onReward, onSkip) : _web(onReward, onSkip); }
      catch(e){ if (onSkip) onSkip(); }
    }
  };
})();

// ── REWARDED ADS ──────────────────────────────────────────────────
var RewardedAds = (function(){
  // Délègue à la couche Ads (web simulé aujourd'hui, AdMob natif demain)
  function _mockAd(callback) {
    Ads.showRewarded(callback);
  }
  return {
    showDoubleGold: function() {
      if (State._adGoldUsed) return;
      _mockAd(function(){
        var bonus = State._lastCombatGold || 0;
        State.gold = (State.gold||0) + bonus;
        State._adGoldUsed = true;
        document.querySelectorAll('.btn-rewarded-ad').forEach(function(b){ b.remove(); });
        CGEModal.alert(T('adres.gold.title'), T('adres.gold.body').replace('{n}', bonus));
        document.getElementById('shop-gold-val') && (document.getElementById('shop-gold-val').textContent = State.gold);
        if (typeof HUD !== 'undefined') HUD.updateGold();
      });
    },
    showRevive: function() {
      if (State._adReviveUsed) return;
      _mockAd(function(){
        State._adReviveUsed = true;
        var reviveHp = Math.floor((State.hpMax||30) * 0.3);
        State.hp = reviveHp;
        State.dead = false;
        document.getElementById('defeat-overlay') && document.getElementById('defeat-overlay').classList.remove('show');
        Nav.go('dungeon-map');
        CGEModal.alert(T('adres.revive.title'), T('adres.revive.body').replace('{n}', reviveHp));
        if (typeof HUD !== 'undefined') HUD.updateHP();
      });
    },
    showDoubleChest: function() {
      if (State._adChestUsed) return;
      _mockAd(function(){
        State._adChestUsed = true;
        document.querySelectorAll('.btn-rewarded-ad').forEach(function(b){ b.remove(); });
        // Double le gold actuel de la salle et force un item bonus
        var bonusGold = Math.floor(20 + (State.floor||1) * 8);
        State.gold = (State.gold||0) + bonusGold;
        if (typeof HUD !== 'undefined') HUD.updateGold();
        // Ajoute un item bonus dans l'inventaire (pool de l'étage actuel)
        var floor = State.floor || 1;
        var maxTier = floor <= 2 ? 1 : (floor <= 4 ? 2 : 3);
        var pool = (typeof ITEMS !== 'undefined' ? ITEMS : []).filter(function(it){ return it.slot && (it.tier||1) <= maxTier; });
        if (pool.length) {
          var bonus = pool[Math.floor(Math.random()*pool.length)];
          State.inventory = State.inventory || [];
          if (State.inventory.length < 8) State.inventory.push(bonus);
        }
        CGEModal.alert(T('adres.chest.title'), T('adres.chest.body').replace('{n}', bonusGold));
      });
    },
    showFreeShopItem: function() {
      if (State._adShopUsed) return;
      _mockAd(function(){
        State._adShopUsed = true;
        document.querySelectorAll('.btn-rewarded-ad').forEach(function(b){ b.remove(); });
        // Rembourse le dernier achat en boutique (coût sauvegardé dans State._lastShopCost)
        var refund = State._lastShopCost || 0;
        if (refund > 0) {
          State.gold = (State.gold||0) + refund;
          State._lastShopCost = 0;
          if (typeof HUD !== 'undefined') HUD.updateGold();
          var sv = document.getElementById('shop-gold-val'); if (sv) sv.textContent = State.gold;
          CGEModal.alert(T('shop.free.title'), T('shop.free.refund').replace('{n}', refund));
        } else {
          CGEModal.alert(T('adres.free.title'), T('adres.free.body'));
          State._adShopFreeNext = true;
        }
      });
    }
  };
})();

// ── ACHIEVEMENTS ─────────────────────────────────────────────────
var ACHIEVEMENT_DEFS = [
  // Exploration
  { id:'first_kill',   ico:'⚔', title:'Premier Sang',      titleEn:'First Blood',     desc:'Vaincre ton premier ennemi',              descEn:'Defeat your first enemy',                check:function(){ return (Meta.totalKills||0)>=1; } },
  { id:'kills_25',     ico:'💀', title:'Chasseur',           titleEn:'Hunter',          desc:'Vaincre 25 ennemis',                      descEn:'Defeat 25 enemies',                        check:function(){ return (Meta.totalKills||0)>=25; } },
  { id:'kills_100',    ico:'🩸', title:'Boucher',            titleEn:'Butcher',         desc:'Vaincre 100 ennemis',                     descEn:'Defeat 100 enemies',                       check:function(){ return (Meta.totalKills||0)>=100; } },
  { id:'kills_500',    ico:'☠',  title:'Fléau des Cryptes', titleEn:'Crypt Scourge',   desc:'Vaincre 500 ennemis',                      descEn:'Defeat 500 enemies',                        check:function(){ return (Meta.totalKills||0)>=500; } },
  // Runs
  { id:'runs_1',       ico:'🏃', title:'Aventurier',        titleEn:'Adventurer',      desc:'Compléter un run',                         descEn:'Complete one run',                           check:function(){ return (Meta.totalRuns||0)>=1; } },
  { id:'runs_10',      ico:'🔁', title:'Vétéran',           titleEn:'Veteran',         desc:'Compléter 10 runs',                        descEn:'Complete 10 runs',                          check:function(){ return (Meta.totalRuns||0)>=10; } },
  { id:'runs_50',      ico:'🌀', title:'Éternel',           titleEn:'Eternal',         desc:'Compléter 50 runs',                        descEn:'Complete 50 runs',                          check:function(){ return (Meta.totalRuns||0)>=50; } },
  // Zones
  { id:'zone_grottes', ico:'🪨', title:'Spéléologue',       titleEn:'Spelunker',       desc:'Nettoyer les Grottes des Ombres',          descEn:'Clear the Shadow Caves',            check:function(){ return !!(Meta.clearedZones||{})['grottes']; } },
  { id:'zone_foret',   ico:'🌲', title:'Traqueur',          titleEn:'Tracker',         desc:'Nettoyer la Forêt des Âmes Perdues',       descEn:'Clear the Forest of Lost Souls',         check:function(){ return !!(Meta.clearedZones||{})['foret']; } },
  { id:'zone_ruines',  ico:'🏚', title:'Archéologue',       titleEn:'Archaeologist',   desc:'Nettoyer les Ruines d\'Astavar',           descEn:'Clear the Ruins of Astavar',             check:function(){ return !!(Meta.clearedZones||{})['ruines']; } },
  { id:'zone_port',    ico:'⚓', title:'Marin des Abysses', titleEn:'Abyss Sailor',    desc:'Nettoyer le Port des Tempêtes',            descEn:'Clear Storm Harbour',              check:function(){ return !!(Meta.clearedZones||{})['port']; } },
  { id:'zone_marais',  ico:'🌿', title:'Marcheur des Brumes',titleEn:'Mist Walker',    desc:'Nettoyer les Marais de Vaelthar',          descEn:'Clear the Vaelthar Marshes',           check:function(){ return !!(Meta.clearedZones||{})['marais']; } },
  { id:'zone_pics',    ico:'🏔', title:'Conquérant',        titleEn:'Conqueror',       desc:'Nettoyer les Pics du Néant',               descEn:'Clear the Peaks of the Void',                 check:function(){ return !!(Meta.clearedZones||{})['pics']; } },
  { id:'zone_volcan',  ico:'🌋', title:'Dompteur de Flammes',titleEn:'Flame Tamer',    desc:'Nettoyer la Caldera d\'Aszgol',           descEn:'Clear the Caldera of Aszgol',             check:function(){ return !!(Meta.clearedZones||{})['volcan']; } },
  { id:'zone_cryptes', ico:'⚰', title:'Seigneur des Cryptes',titleEn:'Crypt Lord',     desc:'Nettoyer les Cryptes Éternelles',          descEn:'Clear the Eternal Crypts',          check:function(){ return !!(Meta.clearedZones||{})['cryptes']; } },
  // Progression
  { id:'level_10',     ico:'✨', title:'Prometteur',        titleEn:'Promising',       desc:'Atteindre le niveau 10',                   descEn:'Reach level 10',                     check:function(){ return (State.level||1)>=10; } },
  { id:'level_30',     ico:'⚡', title:'Chevalier',         titleEn:'Knight',          desc:'Atteindre le niveau 30',                   descEn:'Reach level 30',                     check:function(){ return (State.level||1)>=30; } },
  { id:'level_60',     ico:'🔮', title:'Maître',            titleEn:'Master',          desc:'Atteindre le niveau 60',                   descEn:'Reach level 60',                     check:function(){ return (State.level||1)>=60; } },
  { id:'level_100',    ico:'👑', title:'Légendaire',        titleEn:'Legendary',       desc:'Atteindre le niveau 100',                  descEn:'Reach level 100',                    check:function(){ return (State.level||1)>=100; } },
  // Histoire
  { id:'quest_act1',   ico:'📜', title:'L\'Éveillé',        titleEn:'The Awakened',   desc:'Compléter l\'Acte I de l\'histoire',       descEn:'Complete Act I of the story',         check:function(){ return !!(Meta.completedQuests||{})['seraphine_1']; } },
  { id:'quest_act2',   ico:'📖', title:'Fils du Néant',     titleEn:'Son of the Void', desc:'Compléter l\'Acte II',                     descEn:'Complete Act II',                       check:function(){ return !!(Meta.completedQuests||{})['seraphine_2']; } },
  { id:'quest_act3',   ico:'📚', title:'La Vérité',         titleEn:'The Truth',       desc:'Compléter l\'Acte III',                    descEn:'Complete Act III',                      check:function(){ return !!(Meta.completedQuests||{})['seraphine_3']; } },
  { id:'quest_final',  ico:'🏆', title:'L\'Éveillé Éternel',titleEn:'The Eternal Awakened', desc:'Compléter l\'histoire',               descEn:'Complete the story',                      check:function(){ return !!(Meta.completedQuests||{})['cryptes_final']; } },
  // Secrets
  { id:'rich',         ico:'🪙', title:'Négociant',         titleEn:'Merchant',        desc:'Accumuler 1000 pièces d\'or',              descEn:'Accumulate 1000 gold coins',                check:function(){ return (State.gold||0)>=1000; } },
  { id:'no_potion',    ico:'💪', title:'Dur à Cuire',       titleEn:'Tough as Nails',  desc:'Battre un boss sans utiliser de potion',   descEn:'Defeat a boss without using a potion',     check:function(){ return !!(Meta.achievements||{})['no_potion']; } },
];

var Achievements = (function(){
  function _unlocked() { return Meta.achievements || {}; }

  function check(hint) {
    var done = _unlocked();
    var newOnes = [];
    ACHIEVEMENT_DEFS.forEach(function(a) {
      if (done[a.id]) return;
      try { if (a.check()) { done[a.id] = Date.now(); newOnes.push(a); } } catch(e) {}
    });
    if (newOnes.length) {
      Meta.achievements = done;
      Meta.save();
      // Une popup « Félicitations » par succès, espacées pour ne pas se chevaucher
      newOnes.forEach(function(a, i) {
        setTimeout(function(){ _toast(a); }, i * 3600);
      });
    }
  }

  function _toast(a) {
    var t = document.createElement('div');
    t.className = 'achievement-toast';
    t.innerHTML =
      '<span class="at-ico">'+a.ico+'</span>'+
      '<div class="at-body">'+
        '<div class="at-header">'+T('ach.toast.congrats')+'</div>'+
        '<div class="at-title">'+(CGE_LANG === 'en' && a.titleEn ? a.titleEn : a.title)+'</div>'+
      '</div>';
    document.body.appendChild(t);
    try { if (typeof Sfx !== 'undefined' && Sfx.victory) Sfx.victory(); } catch(e) {}
    setTimeout(function(){ t.classList.add('show'); }, 50);
    setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 500); }, 3400);
  }

  function showAll() {
    var done = _unlocked();
    var total = ACHIEVEMENT_DEFS.length;
    var count = ACHIEVEMENT_DEFS.filter(function(a){ return !!done[a.id]; }).length;
    var pct = total ? Math.round(count / total * 100) : 0;
    var rows = ACHIEVEMENT_DEFS.map(function(a) {
      var u = !!done[a.id];
      var title = (CGE_LANG === 'en' && a.titleEn ? a.titleEn : a.title);
      var desc  = (CGE_LANG === 'en' && a.descEn ? a.descEn : a.desc);
      return '<div class="ach-row'+(u?' ach-done':'')+'">'+
        '<span class="ach-ico">'+(u ? a.ico : '🔒')+'</span>'+
        '<div class="ach-info">'+
          '<div class="ach-title">'+title+'</div>'+
          '<div class="ach-desc">'+desc+'</div>'+
        '</div>'+
        (u ? '<span class="ach-check">✓</span>' : '')+
      '</div>';
    }).join('');
    var html =
      '<div class="ach-progress-wrap">'+
        '<div class="ach-progress-label">'+count+' / '+total+' '+T('ach.unlocked')+'</div>'+
        '<div class="ach-progress-bar"><div class="ach-progress-fill" style="width:'+pct+'%"></div></div>'+
      '</div>'+
      '<div class="ach-list">'+rows+'</div>';
    CGEModal.show({ title: '🏆 '+T('ach.title'), text: '', html: html, okLabel: T('misc.close') });
  }

  return { check: check, showAll: showAll };
})();

// ── TOWN SCREEN ───────────────────────────────────────────────────
var TownScreen = {
  goInn: function() {
    // Retourne à la chambre d'auberge pour se reposer
    Nav.go('inn-room');
    InnRoom.enter();
  },
  goShop: function(type) {
    Rooms.showShop('town-screen', type);
  },
  goTemple: function() {
    // Boutique de consommables de l'Église
    Rooms.showShop('town-screen', 'eglise');
  },
  goChateau: function() {
    var done = Meta.completedQuests||{};
    var race = State.race||'Humain';
    var act4 = !!done['cryptes_final'];
    var act3 = !!done['seraphine_3'];
    var act2 = !!done['seraphine_2'];
    var en = CGE_LANG === 'en';

    // Act IV — château ouvert à tous, mais épilogue racial
    if (act4) {
      var txt = race === 'Orc'
        ? (en ? 'The guards part slowly. One of them lowers their eyes.\n\n"Enter, Lord of the Crypts."\n\nThe first time an Orc has passed through these gates in a hundred years.'
               : 'Les gardes s\'écartent lentement. L\'un d\'eux baisse les yeux.\n\n"Entrez, Seigneur des Cryptes."\n\nLa première fois qu\'un Orc franchit ces grilles depuis cent ans.')
        : race === 'Elfe'
        ? (en ? 'The gates open without a word. As if they were waiting for you.\n\nA guard whispers to the other: "It\'s the Elf of the prophecy."'
               : 'Les grilles s\'ouvrent sans un mot. Comme si elles t\'attendaient.\n\nUn garde chuchote à l\'autre : « C\'est l\'Elfe de la prophétie. »')
        : race === 'Nain'
        ? (en ? 'The captain of the guard salutes you with a fist to his chest.\n\n"The Lord of the Crypts. The Castle\'s forges are at your disposal."'
               : 'Le capitaine de garde te salue du poing sur la poitrine.\n\n"Le Seigneur des Cryptes. Les forges du Château sont à ta disposition."')
        : (en ? 'The guard recognises you and bows.\n\n"The Lord of the Crypts. His Grace was expecting you."'
               : 'Le garde te reconnaît et s\'incline.\n\n"Le Seigneur des Cryptes. Sa Grâce vous attendait."');
      CGEModal.alert(en ? 'The Castle' : 'Le Château', txt);
      return;
    }

    // Act III — accès limité
    if (act3) {
      if (race === 'Orc') {
        CGEModal.alert(en ? 'Conditional Access' : 'Accès Conditionnel',
          en ? 'A guard raises his halberd.\n\n"We were warned. Séraphine vouched for your conduct."\n\nHe hesitates for a long moment.\n\n"One visit. Under escort."'
             : 'Un garde lève sa hallebarde.\n\n"On nous a prévenus. Séraphine a garanti ta conduite."\n\nIl hésite longuement.\n\n"Une visite. Sous escorte."');
      } else if (race === 'Elfe') {
        CGEModal.alert(en ? 'The Castle' : 'Le Château',
          en ? 'The guards instinctively step back.\n\n"An Elf... they said you would return."\n\nThey let you in, unsettled.'
             : 'Les gardes reculent instinctivement.\n\n"Un Elfe... on disait que vous reviendriez."\n\nIls te laissent entrer, troublés.');
      } else {
        CGEModal.alert(en ? 'The Castle' : 'Le Château',
          en ? 'The guard consults a list, nods.\n\n"Séraphine recommended you. Enter — the Counsellor will receive you."'
             : 'Le garde consulte une liste, hoche la tête.\n\n"Séraphine vous a recommandé. Entrez — le Conseiller vous reçoit."');
      }
      return;
    }

    // Act II — accès refusé
    if (act2) {
      if (race === 'Orc') {
        CGEModal.alert(en ? 'Access Denied' : 'Accès Refusé',
          en ? 'The guard takes a step back, hand on his sword.\n\n"An Orc does not pass through these gates."\n\nHe doesn\'t let you finish.\n\n"Leave. Now."'
             : 'Le garde fait un pas en arrière, main sur son épée.\n\n"Un Orc ne franchit pas ces grilles."\n\nIl ne te laisse pas finir.\n\n"Partez. Maintenant."');
      } else if (race === 'Elfe') {
        CGEModal.alert(en ? 'Access Denied' : 'Accès Refusé',
          en ? 'The guard watches you for a long time with suspicion.\n\n"Elves have not been welcome at the Castle since... the incident."\n\nHe doesn\'t specify which one.\n\n"Come back with a letter from the Counsellor."'
             : 'Le garde t\'observe longuement avec méfiance.\n\n"Les Elfes ne sont pas les bienvenus au Château depuis... l\'incident."\n\nIl ne précise pas lequel.\n\n"Revenez avec une lettre du Conseiller."');
      } else if (race === 'Nain') {
        CGEModal.alert(en ? 'Access Denied' : 'Accès Refusé',
          en ? '"Dwarf or not, rules are rules."\n\nHe softens his tone.\n\n"You\'re not yet well known to His Grace. Make yourself noticed and that will change."'
             : '"Nain ou pas, les règles sont les règles."\n\nIl adoucit le ton.\n\n"Vous n\'êtes pas encore assez connus de Sa Grâce. Faites-vous remarquer et ça changera."');
      } else {
        CGEModal.alert(en ? 'Access Denied' : 'Accès Refusé',
          en ? '"You\'re making progress, adventurer. But something is still missing."\n\nHe taps his halberd on the cobblestones.\n\n"Come back once Séraphine has approved your file."'
             : '"Vous progressez, aventurier. Mais il vous manque encore quelque chose."\n\nIl tape sa hallebarde sur les pavés.\n\n"Revenez quand Séraphine aura validé votre dossier."');
      }
      return;
    }

    // Accès early game
    var lvl2 = State.level||1;
    var rank2 = Meta.rank||0;
    if (lvl2 >= 10 && rank2 >= 1) {
      WorldMap.enter('chateau_maudit');
      return;
    }
    if (rank2 < 1) {
      CGEModal.alert(en ? 'No Entry' : 'Accès Interdit',
        en ? 'The guard looks you up and down.\n\n"You have no reputation in this town. Come back when people know who you are."'
           : 'Le garde vous regarde de haut en bas.\n\n"Vous n\'avez pas de réputation dans cette ville. Revenez quand les gens vous connaîtront."');
    } else if (race === 'Orc') {
      CGEModal.alert(en ? 'No Entry' : 'Accès Interdit',
        en ? 'The guard steps back fully, hand on his sword.\n\n"An Orc. Here."\n\nHe looks around for backup.\n\n"Move along. Now."'
           : 'Le garde recule d\'un pas complet, la main sur son épée.\n\n"Un Orc. Ici."\n\nIl appelle du renfort du regard.\n\n"Éloignez-vous. Maintenant."');
    } else if (race === 'Elfe') {
      CGEModal.alert(en ? 'No Entry' : 'Accès Interdit',
        en ? 'The guard sizes you up.\n\n"Elf. Half-blood or pure-blood?"\n\nHe doesn\'t wait for your answer.\n\n"No matter. The Castle is closed to... non-residents."'
           : 'Le garde te jauge de haut en bas.\n\n"Elfe. Demi-sang ou pur sang ?"\n\nIl n\'attend pas ta réponse.\n\n"Peu importe. Le Château est fermé aux... non-résidents."');
    } else if (race === 'Nain') {
      CGEModal.alert(en ? 'No Entry' : 'Accès Interdit',
        en ? 'The guard shrugs.\n\n"Sorry, friend. Council rules. No adventurers, whatever the size."\n\nHe adds with a half-smile:\n\n"Bad joke. Come back later."'
           : 'Le garde hausse les épaules.\n\n"Désolé, ami. Règles du Conseil. Pas d\'aventuriers, quelle que soit la taille."\n\nIl ajoute avec un demi-sourire :\n\n"Mauvaise blague. Revenez plus tard."');
    } else {
      CGEModal.alert(en ? 'No Entry' : 'Accès Interdit',
        en ? 'Two guards cross their halberds.\n\n"The Castle remains closed to adventurers of unknown rank. Come back when you\'ve proven your worth."'
           : 'Deux gardes croisent leurs hallebardes.\n\n"Le Château reste fermé aux aventuriers de rang inconnu. Revenez quand vous aurez prouvé votre valeur."');
    }
  },
};

// ── WORLD MAP ──────────────────────────────────────────────────────
var ZONE_DATA = {
  // hpMult / atkMult / defMult : multiplicateurs appliqués sur les stats de base des ennemis
  // goldMult : multiplicateur sur l'or
  grottes: { hpMult:1,    atkMult:1,   defMult:1,   goldMult:1,    floors:4, minLevel:1,  label:'Grottes des Ombres', labelEn:'Shadow Caves' },
  foret:   { hpMult:5,    atkMult:3,   defMult:2.5, goldMult:4,    floors:5, minLevel:5,  label:'Forêt des Âmes Perdues', labelEn:'Forest of Lost Souls' },
  ruines:  { hpMult:18,   atkMult:9,   defMult:7,   goldMult:15,   floors:5, minLevel:10, label:'Ruines d\'Astavar', labelEn:'Ruins of Astavar' },
  port:    { hpMult:55,   atkMult:22,  defMult:18,  goldMult:45,   floors:5, minLevel:20, label:'Port des Tempêtes', labelEn:'Storm Harbour' },
  marais:  { hpMult:100,  atkMult:38,  defMult:30,  goldMult:90,   floors:5, minLevel:28, label:'Marais de Vaelthar', labelEn:'Vaelthar Marshes' },
  pics:    { hpMult:180,  atkMult:65,  defMult:55,  goldMult:150,  floors:6, minLevel:35, label:'Pics du Néant', labelEn:'Peaks of the Void' },
  volcan:  { hpMult:420,  atkMult:145, defMult:115, goldMult:380,  floors:6, minLevel:42, label:'Caldera d\'Aszgol', labelEn:'Caldera of Aszgol' },
  cryptes: { hpMult:700,  atkMult:220, defMult:180, goldMult:600,  floors:6, minLevel:50, label:'Les Cryptes Éternelles', labelEn:'The Eternal Crypts' },
  chateau_maudit:   { hpMult:1200, atkMult:380, defMult:300, goldMult:1000, floors:7, minLevel:55, label:'Le Château Maudit', labelEn:'The Cursed Castle' },
  cite_oubliee:     { hpMult:2500, atkMult:750, defMult:600, goldMult:2200, floors:8, minLevel:65, label:'La Cité Oubliée', labelEn:'The Forgotten City' },
  gouffre_astral:   { hpMult:6000, atkMult:1800, defMult:1400, goldMult:5500, floors:8, minLevel:78, label:'Le Gouffre Astral', labelEn:'The Astral Chasm' },
  cryptes_profondes:{ hpMult:15000, atkMult:4500, defMult:3500, goldMult:14000, floors:10, minLevel:90, label:'Les Cryptes Profondes', labelEn:'The Deep Crypts' },
};

var WorldMap = {
  enter: function(zoneId) {
    var zone = ZONE_DATA[zoneId];
    if (!zone) return;
    var lvl = State.level||1;
    var done = Meta.completedQuests||{};

    // Zones nettoyées — bloquées définitivement, sauf exception Grottes
    if (Meta.clearedZones[zoneId]) {
      var isGrottesReturn = zoneId === 'grottes' && done['seraphine_3'] && !done['retour_grottes'] && Meta.passageFound;
      if (isGrottesReturn) {
        // Cas unique : retour dans les Grottes pour trouver le passage
        CGEModal.show({
          title: 'Quelque chose a changé',
          text: 'Tu t\'approches de l\'entrée des Grottes.\n\nLe silence est différent. Pas le silence du vide — le silence de quelque chose qui attend.\n\nUne fissure dans la pierre que tu n\'avais jamais remarquée...',
          okLabel: 'Entrer',
          cancelLabel: 'Partir',
          onOk: function() {
            State._zoneMod = { hpMult:1, atkMult:1, defMult:1, goldMult:1, enemyMod:1, goldMod:1 };
            State._currentZone = zoneId;
            State.floor = 1;
            State._runGoldBonus = 1;
            Nav.go('dungeon-map');
            setTimeout(function(){ DungeonMap.init(1, State.hp, State.hpMax); }, 350);
          }
        });
      } else {
        CGEModal.alert(
          T('zone.' + zoneId) || (ZONE_DATA[zoneId]||{}).label || 'Donjon',
          T('misc.wind')
        );
      }
      return;
    }

    var warnings = [];
    if (!Meta.isZoneUnlocked(zoneId)) warnings.push(T('warn.zone.locked'));
    if (lvl < zone.minLevel) warnings.push(T('warn.zone.level').replace('{rec}', zone.minLevel).replace('{lvl}', lvl));
    function doEnter() {
      State._zoneMod = {
        hpMult:   zone.hpMult||1,
        atkMult:  zone.atkMult||1,
        defMult:  zone.defMult||1,
        goldMult: zone.goldMult||1,
        // legacy compat
        enemyMod: zone.hpMult||1,
        goldMod:  zone.goldMult||1,
      };
      var resumeFloor = (State._currentZone === zoneId && (State.floor||1) > 1) ? (State.floor||1) : 1;
      State._currentZone = zoneId;
      State.floor = resumeFloor;
      State._runGoldBonus = State._runGoldBonus || 1;
      Nav.go('dungeon-map');
      if (resumeFloor === 1) {
        setTimeout(function(){
          RunMods.roll(function(){ DungeonMap.init(1, State.hp, State.hpMax); });
        }, 350);
      } else {
        setTimeout(function(){ DungeonMap.init(resumeFloor, State.hp, State.hpMax); }, 300);
      }
    }

    if (warnings.length) {
      CGEModal.show({
        title: T('warn.enter.title'),
        text: warnings.join('\n\n'),
        okLabel: T('warn.enter.ok'),
        cancelLabel: T('warn.enter.cancel'),
        onOk: doEnter
      });
      return;
    }
    doEnter();
  },

  updateHotspots: function() {
    // One-to-one mapping: only zones that have a dedicated hotspot element
    var hsMap = {
      grottes: 'hs-reg-peaks',
      foret:   'hs-reg-forest',
      ruines:  'hs-reg-ruins',
      port:    'hs-reg-port',
      marais:  'hs-reg-marais',
      pics:    'hs-reg-pics',
      volcan:  'hs-reg-volcan',
      cryptes: 'hs-reg-cave',
    };
    Object.keys(hsMap).forEach(function(id) {
      var el = document.getElementById(hsMap[id]);
      if (!el) return;
      var cleared = !!(Meta.clearedZones||{})[id];
      el.classList.toggle('cleared', cleared);
      el.style.opacity = '';
      el.style.pointerEvents = '';
    });
  },
};

var HUD = (function(){
  var SHOWN_SCREENS = {
    'dungeon-map':1,'combat-screen':1,'shop-screen':1,
    'inn-room':1,'town-screen':1,'world-map':1,'world-map-2':1,
    'taverne-screen':1,'equip-screen':1,'chest-screen':1,
    'hero-screen':1,'rest-screen':1,'loot-screen':1
  };
  var FLOOR_LABELS = ['I','II','III','IV','V','VI'];

  function _refresh(screenId) {
    var hdr = document.getElementById('game-header');
    if (!hdr) return;
    var show = SHOWN_SCREENS[screenId];
    if (show) {
      if (hdr.style.display === 'none') {
        hdr.style.display = 'flex';
        hdr.classList.remove('entering');
        void hdr.offsetWidth;
        hdr.classList.add('entering');
        setTimeout(function(){ hdr.classList.remove('entering'); }, 400);
      } else {
        hdr.style.display = 'flex';
      }
    } else {
      hdr.style.display = 'none';
    }
    if (!show) return;

    // Name
    var nm = document.getElementById('gh-name');
    if (nm) nm.textContent = (State && State.name) ? State.name.toUpperCase() : 'AVENTURIER';

    // Floor badge (only in dungeon)
    var fb = document.getElementById('gh-floor-badge');
    if (fb) {
      if (screenId === 'dungeon-map' && State && State.floor) {
        fb.textContent = T('hud.floor') + ' ' + (FLOOR_LABELS[State.floor-1] || State.floor);
        fb.style.display = 'block';
      } else {
        fb.style.display = 'none';
      }
    }

    // Level
    var lv = document.getElementById('gh-level');
    if (lv) lv.textContent = T('hud.level') + ' ' + ((State && State.level) || 1);

    // HP bar
    var pct = (State && State.hpMax) ? Math.max(0, Math.min(100, Math.round((State.hp / State.hpMax) * 100))) : 100;
    var bar = document.getElementById('gh-hp-bar-inner');
    if (bar) bar.style.width = pct + '%';
    var txt = document.getElementById('gh-hp-text');
    if (txt) txt.textContent = (State ? (State.hp||0) : 0) + '/' + (State ? (State.hpMax||0) : 0);

    // Gold
    var gv = document.getElementById('hud-gold-val');
    if (gv) gv.textContent = (State && State.gold) ? State.gold : 0;

    // XP bar
    if (typeof XP_PER_LEVEL !== 'undefined' && State) {
      var lvl2 = State.level||1;
      var thr = XP_PER_LEVEL[Math.min(lvl2, XP_PER_LEVEL.length-1)];
      var xpPct = thr > 0 ? Math.min(100, Math.round((State.xp||0)/thr*100)) : 100;
      var xpBar = document.getElementById('gh-xp-bar-inner');
      if (xpBar) xpBar.style.width = xpPct+'%';
    }
  }

  function _updateXP() {
    if (typeof XP_PER_LEVEL === 'undefined' || !State) return;
    var lvl2 = State.level||1;
    var thr = XP_PER_LEVEL[Math.min(lvl2, XP_PER_LEVEL.length-1)];
    var xpPct = thr > 0 ? Math.min(100, Math.round((State.xp||0)/thr*100)) : 100;
    var xpBar = document.getElementById('gh-xp-bar-inner');
    if (xpBar) { xpBar.style.width = xpPct+'%'; xpBar.classList.remove('hdr-val-flash'); void xpBar.offsetWidth; xpBar.classList.add('hdr-val-flash'); }
    var lv = document.getElementById('gh-level');
    if (lv) lv.textContent = T('hud.level')+' '+lvl2;
  }

  return {
    update: function(screenId) { _refresh(screenId); },
    updateGold: function() {
      var gv = document.getElementById('hud-gold-val');
      if (gv) { gv.textContent = (State && State.gold) ? State.gold : 0; gv.classList.remove('hdr-val-flash'); void gv.offsetWidth; gv.classList.add('hdr-val-flash'); }
    },
    updateHP: function() {
      var pct = (State && State.hpMax) ? Math.max(0, Math.min(100, Math.round((State.hp / State.hpMax) * 100))) : 100;
      var bar = document.getElementById('gh-hp-bar-inner');
      if (bar) {
        bar.style.width = pct + '%';
        if (pct > 60)      bar.style.background = 'linear-gradient(90deg,#7a1010,#c83030,#e05050)';
        else if (pct > 30) bar.style.background = 'linear-gradient(90deg,#8a5000,#d08000,#e0a020)';
        else               bar.style.background = 'linear-gradient(90deg,#5a0000,#a00000,#cc2020)';
      }
      var txt = document.getElementById('gh-hp-text');
      if (txt) { txt.textContent = (State.hp||0) + '/' + (State.hpMax||0); txt.classList.remove('hdr-val-flash'); void txt.offsetWidth; txt.classList.add('hdr-val-flash'); }
    },
    updateXP: function() { _updateXP(); },
    showQuests: function() {
      var modal = document.getElementById('gh-quest-modal');
      var list  = document.getElementById('gh-quest-list');
      if (!modal || !list) return;
      var html = '';
      if (typeof QUEST_DEFS !== 'undefined' && typeof Meta !== 'undefined') {
        // N'afficher que les quêtes activement acceptées
        var activeIds = Object.values(Meta.activeQuests||{});
        var active = QUEST_DEFS.filter(function(q){ return activeIds.indexOf(q.id) !== -1; });
        if (active.length === 0) {
          html = '<div style="color:rgba(255,255,255,0.4);text-align:center;font-family:Crimson Text,serif;font-style:italic;padding:12px">Aucune quête en cours.<br><span style="font-size:11px">Parle aux habitants de la ville.</span></div>';
        } else {
          active.forEach(function(q){
            var done = q.check ? q.check() : false;
            html += '<div style="padding:8px;border:1px solid rgba(201,165,80,'+(done?'0.5':'0.15')+');border-radius:6px">'
              + '<div style="color:#C9A550;font-size:12px;font-family:Cinzel,serif">'+(done?'✅ ':'📜 ')+q.title+'</div>'
              + '<div style="font-size:12px;margin-top:4px;white-space:pre-line">'+q.desc+'</div>'
              + (done ? '<div style="font-size:11px;color:#50d090;margin-top:4px">✓ Objectif accompli — retourne voir le PNJ</div>' : '')
              + '</div>';
          });
        }
      }
      list.innerHTML = html;
      modal.classList.add('show');
    }
  };
})();

var CarnetEnquete = {
  open: function() {
    var clues = Meta.clues || {};
    var items = [];
    var foundBy = CGE_LANG === 'en' ? 'Found in ' : 'Trouvé dans ';
    if (clues.medallion) {
      items.push('<div class="carnet-clue"><b>'+T('carnet.clue1.name')+'</b><br>'+foundBy+T('carnet.clue1.loc')+'. '+T('carnet.clue1.text')+'</div>');
    } else {
      items.push('<div class="carnet-clue carnet-unknown">'+T('carnet.unknown')+'</div>');
    }
    if (clues.carte) {
      items.push('<div class="carnet-clue"><b>'+T('carnet.clue2.name')+'</b><br>'+foundBy+T('carnet.clue2.loc')+'. '+T('carnet.clue2.text')+'</div>');
    } else {
      items.push('<div class="carnet-clue carnet-unknown">'+T('carnet.unknown')+'</div>');
    }
    if (clues.journal_marin) {
      items.push('<div class="carnet-clue"><b>'+T('carnet.clue3.name')+'</b><br>'+foundBy+T('carnet.clue3.loc')+'. '+T('carnet.clue3.text')+'</div>');
    } else {
      items.push('<div class="carnet-clue carnet-unknown">'+T('carnet.unknown')+'</div>');
    }
    if (clues.medallion && clues.carte && clues.journal_marin) {
      items.push('<div class="carnet-deduction"><b>'+(CGE_LANG==='en'?'Deduction:':'Déduction :')+'</b> '+T('carnet.deduction')+'</div>');
    }
    document.getElementById('gh-carnet-list').innerHTML = items.join('');
    document.getElementById('gh-carnet-modal').classList.add('show');
  }
};

var Embers = (function(){
  var timers = [];
  function spawnEmber(container) {
    if (!container) return;
    var e = document.createElement('div');
    e.className = 'ember-particle';
    var x = Math.random() * 90 + 5;
    var dur = 2.5 + Math.random() * 2.5;
    var delay = Math.random() * dur;
    e.style.cssText = 'left:'+x+'%;bottom:'+( Math.random()*20)+'px;animation-duration:'+dur+'s;animation-delay:-'+delay+'s;';
    container.appendChild(e);
    setTimeout(function(){ if(e.parentNode) e.parentNode.removeChild(e); }, (dur+0.5)*1000);
  }
  function startFor(screenId) {
    stop();
    var screen = document.getElementById(screenId);
    if (!screen) return;
    // Spawn immédiat
    for (var i=0;i<5;i++) spawnEmber(screen);
    // Timer récurrent
    timers.push(setInterval(function(){
      if (document.getElementById(screenId) && document.getElementById(screenId).classList.contains('active')) {
        spawnEmber(document.getElementById(screenId));
      }
    }, 600));
  }
  function stop() {
    timers.forEach(function(t){ clearInterval(t); }); timers = [];
    document.querySelectorAll('.ember-particle').forEach(function(e){ e.remove(); });
  }
  return { startFor:startFor, stop:stop };
})();

// ── FIREBASE / CLOUD SYNC ─────────────────────────────────────────────────
var CloudSync = (function() {
  var _app = null, _auth = null, _db = null, _user = null;
  var _inited = false;

  function init() {
    if (_inited) return;
    _inited = true;
    try {
      _app  = firebase.initializeApp({
        apiKey: "AIzaSyDzNop_dvwgXWAs1dAmz0-2L9KQWyBDuso",
        authDomain: "cryptes.firebaseapp.com",
        projectId: "cryptes",
        storageBucket: "cryptes.firebasestorage.app",
        messagingSenderId: "49876231280",
        appId: "1:49876231280:web:1e76b4ee2f252f967e80b5"
      });
      _auth = firebase.auth();
      _db   = firebase.firestore();
      _auth.onAuthStateChanged(function(user) {
        _user = user;
        if (user) {
          _onSignIn(user);
        } else {
          _onSignOut();
        }
        _renderAccountUI();
      });
    } catch(e) { console.warn('[CGE] Firebase init error:', e); }
  }

  function signIn() {
    if (!_auth) return;
    var provider = new firebase.auth.GoogleAuthProvider();
    _auth.signInWithPopup(provider).catch(function(e){ console.warn('[CGE] Sign-in error:', e); });
  }

  function signOut() {
    if (!_auth) return;
    _auth.signOut();
  }

  function getUser() { return _user; }

  function _onSignIn(user) {
    // Fusionne cloud + local SANS écraser : pour chaque profil (par id) on garde
    // la version la plus récemment jouée (lastPlayed). Les profils locaux jamais
    // synchronisés sont conservés. Évite la perte de progression hors-ligne.
    _db.collection('users').doc(user.uid).collection('data').doc('profiles').get().then(function(doc) {
      var cloud = (doc.exists && doc.data() && Array.isArray(doc.data().profiles)) ? doc.data().profiles : [];
      var cloudActive = (doc.exists && doc.data()) ? doc.data().activeId : null;
      if (!cloud.length) { _pushProfiles(); if (typeof ProfilesScreen !== 'undefined') ProfilesScreen.render(); return; }

      var local = ProfileManager.getAll();
      var byId = {};
      local.forEach(function(p){ if (p && p.id) byId[p.id] = p; });
      cloud.forEach(function(p){
        if (!p || !p.id) return;
        var ex = byId[p.id];
        // Le plus récemment joué gagne ; un profil cloud inconnu en local est ajouté
        if (!ex || (p.lastPlayed||0) >= (ex.lastPlayed||0)) byId[p.id] = p;
      });
      var merged = Object.keys(byId).map(function(k){ return byId[k]; });
      localStorage.setItem('cge_profiles', Vault.pack(merged));

      // Garde l'actif local s'il existe encore, sinon retombe sur celui du cloud
      var activeId = localStorage.getItem('cge_active');
      if ((!activeId || !merged.some(function(p){ return p.id===activeId; })) && cloudActive) {
        localStorage.setItem('cge_active', cloudActive);
      }
      // Repousse l'état fusionné pour faire converger cloud et local
      _pushProfiles();
      if (typeof ProfilesScreen !== 'undefined') ProfilesScreen.render();
    }).catch(function(e){ console.warn('[CGE] Firestore read error:', e); });
  }

  function _onSignOut() {
    // Nothing special — keep local data
  }

  function _pushProfiles() {
    if (!_user || !_db) return;
    var profiles = ProfileManager.getAll();
    var activeId = localStorage.getItem('cge_active') || null;
    _db.collection('users').doc(_user.uid).collection('data').doc('profiles').set({
      profiles: profiles,
      activeId: activeId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.warn('[CGE] Firestore write error:', e); });
  }

  // Called by ProfileManager.saveAll — sync to cloud after every local save
  function syncProfiles(profiles, activeId) {
    if (!_user || !_db) return;
    _db.collection('users').doc(_user.uid).collection('data').doc('profiles').set({
      profiles: profiles,
      activeId: activeId || localStorage.getItem('cge_active') || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.warn('[CGE] Firestore sync error:', e); });
  }

  function _renderAccountUI() {
    var btn = document.getElementById('btn-google-signin');
    var info = document.getElementById('google-user-info');
    if (!btn || !info) return;
    if (_user) {
      btn.style.display = 'none';
      info.style.display = 'flex';
      var avatar = document.getElementById('google-avatar');
      var name   = document.getElementById('google-name');
      if (avatar) avatar.src = _user.photoURL || '';
      if (name)   name.textContent = _user.displayName || _user.email || 'Connecté';
    } else {
      btn.style.display = 'flex';
      info.style.display = 'none';
    }
  }

  return { init:init, signIn:signIn, signOut:signOut, getUser:getUser, syncProfiles:syncProfiles, renderAccountUI:_renderAccountUI };
})();

// ── CUSTOM MODAL ──────────────────────────────────────────────────────────
var CGEModal = (function() {
  function show(opts) {
    // opts: { title, text, img, okLabel, cancelLabel, onOk, onCancel }
    var overlay = document.getElementById('cge-modal-overlay');
    var imgEl   = document.getElementById('cge-modal-img');
    var titleEl = document.getElementById('cge-modal-title');
    var textEl  = document.getElementById('cge-modal-text');
    var okBtn   = document.getElementById('cge-modal-ok');
    var cancelBtn = document.getElementById('cge-modal-cancel');

    titleEl.textContent = opts.title || '';
    if (opts.html) { textEl.innerHTML = opts.html; }
    else { textEl.textContent = opts.text || ''; }

    if (opts.img) {
      imgEl.src = opts.img;
      imgEl.className = 'visible';
    } else {
      imgEl.src = '';
      imgEl.className = '';
    }

    okBtn.textContent = opts.okLabel || T('misc.continue');
    okBtn.onclick = function() { close(); if (opts.onOk) opts.onOk(); };

    if (opts.cancelLabel) {
      cancelBtn.style.display = '';
      cancelBtn.textContent = opts.cancelLabel;
      cancelBtn.onclick = function() { close(); if (opts.onCancel) opts.onCancel(); };
    } else {
      cancelBtn.style.display = 'none';
    }

    overlay.classList.add('open');
  }

  function close() {
    document.getElementById('cge-modal-overlay').classList.remove('open');
  }

  // Drop-in replacements
  function alert(title, text, img) {
    show({ title:title, text:text, img:img||null, okLabel:T('modal.ok') });
  }

  function confirm(title, text, onOk, onCancel, img) {
    show({ title:title, text:text, img:img||null, okLabel:T('modal.confirm'), cancelLabel:T('modal.cancel'), onOk:onOk, onCancel:onCancel });
  }

  return { show:show, close:close, alert:alert, confirm:confirm };
})();

var App = {
  startRun: function() {
    // Récupère le nom saisi, crée ou met à jour le profil
    var inp = document.getElementById('cs-name-input');
    var heroName = (inp && inp.value.trim()) ? inp.value.trim() : T('create.name.placeholder');
    State.name = heroName;
    // Créer un nouveau profil si aucun actif, ou si on vient du flux "créer un nouveau perso"
    if (!ProfileManager.getActiveId() || !ProfileManager.getActive() || ProfilesScreen._creating) {
      ProfilesScreen._creating = false;
      ProfileManager.create(heroName, State.race, State.cls);
      // Réinitialiser la méta pour ce nouveau perso (pas de donjons déjà nettoyés)
      Meta.clearedZones = {};
      Meta.chest = [];
      Meta.totalGold = 0; Meta.totalKills = 0; Meta.totalRuns = 0; Meta.bestFloor = 0;
      Meta.levels = {}; Meta.bonuses = {atk:0,def:0,hp:0,potions:0,goldPct:0,crit:0,dodge:0,timerBonus:0,lifesteal:0,regenMeta:0,xpPct:0,startGold:0};
      Meta.activeQuests = {}; Meta.completedQuests = {};
      Meta.save();
    } else {
      ProfilesScreen._creating = false;
    }
    State.clearSave(); // efface toute save précédente
    var r = RACES.find(function(x){ return x.id===State.race; });
    var c = CLASSES.find(function(x){ return x.id===State.cls; });
    var b = Meta.bonuses;
    State.hp    = c.hp  + r.dhp  + (b.hp||0);
    State.hpMax = c.hp  + r.dhp  + (b.hp||0);
    State.atk   = c.atk + r.datk + (b.atk||0);
    State.def   = c.def + r.ddef + (b.def||0);
    State.floor  = 1;
    State.gold   = (b.startGold||0);
    State.kills  = 0;
    State.xp     = 0;
    State.level  = 1;
    State.potions = 2 + (b.potions||0);
    State.regenPerFight = 0;
    State.critBonus = b.crit||0;
    State._zoneMod = { enemyMod:1, goldMod:1 };
    State._currentZone = null;
    State.persistentStatuses = [];
    State.bag = []; State.inventory = [];
    State.scrolls = [];
    State.equipped = { heaume:null,arme:null,bouclier:null,gants:null,bottes:null,ceinture:null,jambieres:null,collier:null,plastron:null,bague_gauche:null,bague_droite:null };
    State.fleeBonus = 0;
    // Mana (Mage & Prêtre uniquement)
    if (State.cls === 'Mage')   { State.manaMax = 60; State.mana = 60; }
    else if (State.cls === 'Prêtre') { State.manaMax = 50; State.mana = 50; }
    else { State.manaMax = 0; State.mana = 0; }
    Nav.go('inn-room');
    setTimeout(function(){ InnRoom.enter(); }, 300);
  },
  continueGame: function() {
    if (!State.loadRun()) {
      // Essayer de charger depuis le profil actif
      var p = ProfileManager.getActive();
      if (p && p.run) {
        localStorage.setItem('cge_run', Vault.pack(p.run));
        if (!State.loadRun()) { ProfilesScreen.open(); return; }
      } else { ProfilesScreen.open(); return; }
    }
    if (State.name === undefined) State.name = T('create.name.placeholder');
    Nav.go('inn-room');
    setTimeout(function(){ InnRoom.enter(); }, 300);
  },
  showHero: function(){ State._heroFrom='inn-room'; Meta.buildScreen(); Nav.go('hero-screen'); },
  showSettings: function(){ Sfx.nav(); Nav.go('settings-screen'); },
  continueAfterVictory: function() {
    // Le perso garde tout — on retourne juste à l'auberge
    Nav.go('inn-room');
    setTimeout(function(){ InnRoom.enter(); }, 300);
  },
  retryRun: function() {
    var r = RACES.find(function(x){ return x.id===State.race; })||RACES[0];
    var c = CLASSES.find(function(x){ return x.id===State.cls; })||CLASSES[0];
    var b = Meta.bonuses;
    State.hp    = c.hp  + r.dhp  + (b.hp||0);
    State.hpMax = c.hp  + r.dhp  + (b.hp||0);
    State.atk   = c.atk + r.datk + (b.atk||0);
    State.def   = c.def + r.ddef + (b.def||0);
    State.floor  = 1;
    State.gold   = (b.startGold||0);
    State.kills  = 0;
    State.xp     = 0;
    State.level  = 1;
    State.potions = 2 + (b.potions||0);
    State.regenPerFight = 0;
    State.critBonus = b.crit||0;
    State._zoneMod = { enemyMod:1, goldMod:1 };
    State._currentZone = null;
    State.persistentStatuses = [];
    State.bag = []; State.inventory = [];
    State.scrolls = [];
    State.equipped = { heaume:null,arme:null,bouclier:null,gants:null,bottes:null,ceinture:null,jambieres:null,collier:null,plastron:null,bague_gauche:null,bague_droite:null };
    State.fleeBonus = 0; State.dodgeBonus = 0; State.itemLifesteal = 0;
    State._adReviveUsed = false;
    State._adGoldUsed = false;
    State._adChestUsed = false;
    State._adShopUsed = false;
    State._adShopFreeNext = false;
    State._lastCombatGold = 0;
    State._lastShopCost = 0;
    State.clearSave();
    if (typeof ProfileManager !== 'undefined') ProfileManager.updateActive(undefined, null);
    Nav.go('inn-room');
    setTimeout(function(){ InnRoom.enter(); }, 300);
  },
};

window.addEventListener('load', function(){
  Meta.load();
  ProfileManager.migrate(); // migration depuis ancien système si besoin
  Music.load();
  Sfx.load();
  Sfx.applyToggles();
  document.getElementById('st-mus-toggle').classList.toggle('on', Music.on);
  WorldMap.updateHotspots();

  // Enregistrement Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
      // Vérifier si une mise à jour est disponible
      reg.onupdatefound = function() {
        var sw = reg.installing;
        sw.onstatechange = function() {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // Ne pas recharger en pleine partie
            if (!State || !State._inCombat) {
              window.location.reload();
            }
          }
        };
      };
    }).catch(function(e){ console.warn('[CGE] SW:', e); });
  }

  CloudSync.init();
  runIntro();
});
</script>