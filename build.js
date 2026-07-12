#!/usr/bin/env node
/*
 * Build de production OBFUSQUÉ pour itch.io / distribution publique.
 *
 * Lit  web/index.html  (code source lisible — celui sur lequel on travaille)
 * Écrit dist/index.html (scripts du jeu obfusqués — celui qu'on PUBLIE)
 *
 * Le but : développer en clair, ne distribuer que du code illisible.
 * Usage : npm run build
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Obfuscator = require('javascript-obfuscator');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'web', 'index.html');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

// Options volontairement CONSERVATRICES : protection forte sans casser le jeu.
const OBF_OPTS = {
  compact: true,
  controlFlowFlattening: false, // trop lent + risqué pour un jeu temps réel
  deadCodeInjection: false,     // alourdit inutilement
  stringArray: true,            // ← protection principale : textes encodés
  stringArrayThreshold: 0.8,
  stringArrayEncoding: ['base64'],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: false,
  renameGlobals: false,         // CRITIQUE : les onclick="X()" inline utilisent les globales
  transformObjectKeys: false,   // CRITIQUE : le jeu fait State[k], STRINGS[lang][key]...
  identifierNamesGenerator: 'mangled-shuffled',
  selfDefending: false,         // peut casser selon l'environnement
  debugProtection: false,
  numbersToExpressions: false,
  simplify: true,
  unicodeEscapeSequence: false
};

function obfuscateInlineScripts(html) {
  let count = 0, before = 0, after = 0;
  const out = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, function (full, attrs, body) {
    if (/\bsrc\s*=/.test(attrs)) return full;   // script externe (Firebase) → intact
    if (!body.trim()) return full;              // script vide → intact
    before += body.length;
    let obf;
    try {
      obf = Obfuscator.obfuscate(body, OBF_OPTS).getObfuscatedCode();
    } catch (e) {
      console.error('✗ Obfuscation échouée :', e.message);
      process.exit(1);
    }
    try { new Function(obf); }                  // garde-fou : la sortie doit parser
    catch (e) {
      console.error('✗ La sortie obfusquée ne parse pas :', e.message);
      process.exit(1);
    }
    after += obf.length;
    count++;
    return '<script' + attrs + '>' + obf + '</script>';
  });
  return { out, count, before, after };
}

function copyAssets() {
  ['manifest.json', 'sw.js'].forEach(function (f) {
    const s = path.join(ROOT, 'web', f);
    if (fs.existsSync(s)) fs.copyFileSync(s, path.join(OUT_DIR, f));
  });
  const imgSrc = path.join(ROOT, 'web', 'images');
  if (fs.existsSync(imgSrc)) {
    const imgOut = path.join(OUT_DIR, 'images');
    if (!fs.existsSync(imgOut)) fs.mkdirSync(imgOut, { recursive: true });
    fs.readdirSync(imgSrc).forEach(function (f) {
      fs.copyFileSync(path.join(imgSrc, f), path.join(imgOut, f));
    });
  }
  // web/data/ : fichiers de contenu (ex. positions des hotspots) édités via
  // l'outil externe web/editor/. Lu par le jeu au démarrage.
  const dataSrc = path.join(ROOT, 'web', 'data');
  if (fs.existsSync(dataSrc)) {
    const dataOut = path.join(OUT_DIR, 'data');
    if (!fs.existsSync(dataOut)) fs.mkdirSync(dataOut, { recursive: true });
    fs.readdirSync(dataSrc).forEach(function (f) {
      fs.copyFileSync(path.join(dataSrc, f), path.join(dataOut, f));
    });
  }
  // web/editor/ : outil d'édition interne (non lié depuis le jeu, pas dans les
  // menus) — copié dans dist/editor/ uniquement pour y avoir un accès web
  // (ex. depuis mobile), sans lien public ni référence dans l'app du jeu.
  const editorSrc = path.join(ROOT, 'web', 'editor');
  if (fs.existsSync(editorSrc)) {
    const editorOut = path.join(OUT_DIR, 'editor');
    if (!fs.existsSync(editorOut)) fs.mkdirSync(editorOut, { recursive: true });
    fs.readdirSync(editorSrc).forEach(function (f) {
      fs.copyFileSync(path.join(editorSrc, f), path.join(editorOut, f));
    });
  }
}

function main() {
  const html = fs.readFileSync(SRC, 'utf8');
  const { out, count, before, after } = obfuscateInlineScripts(html);
  // Build PROPRE : on vide dist/ pour ne pas embarquer d'anciens assets (ex. vieux .jpg lourds)
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, out, 'utf8');
  copyAssets();
  console.log('✓ Build obfusqué terminé');
  console.log('  Scripts traités : ' + count);
  console.log('  JS ' + (before / 1024).toFixed(0) + ' Ko → ' + (after / 1024).toFixed(0) + ' Ko obfusqué');
  console.log('  Sortie : dist/index.html (+ images, manifest, sw)');
  console.log('  → C\'est CE dossier dist/ qu\'on publie sur itch.io.');
}

main();
