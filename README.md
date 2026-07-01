# Les Cryptes Éternelles

Roguelike heroic-fantasy bilingue (FR/EN), en un seul fichier HTML.

© 2026 Anthony Armand — Tous droits réservés. Voir [LICENSE](LICENSE).
**Licence propriétaire** : ce dépôt n'autorise aucune copie, réutilisation ou
redistribution. Le consulter n'accorde aucun droit.

## Structure

- `web/index.html` — le jeu, **code source lisible** (c'est ici qu'on développe).
- `web/` — manifest PWA, service worker, images.
- `build.js` — génère la version **obfusquée** pour la distribution publique.
- `dist/` — sortie du build (obfusquée). **Non versionnée** — c'est l'artefact à publier.

## Développer

On édite uniquement `web/index.html`. Tout est inline (HTML/CSS/JS).

## Publier (itch.io)

```bash
npm install      # une seule fois
npm run build    # génère dist/index.html (scripts du jeu obfusqués)
```

On envoie le contenu de **`dist/`** sur itch.io (jamais `web/`), en mode
« jouable dans le navigateur » plutôt qu'en téléchargement.

## Tester avec des amis/collègues (Firebase Hosting)

En attendant itch.io, chaque push sur `main` déploie automatiquement (via
GitHub Actions, voir `.github/workflows/firebase-hosting.yml`) sur
**https://cryptes.web.app** — URL fixe, sans mention GitHub, et contrairement
à GitHub Pages (qui sert `web/` en clair) ça sert la version **obfusquée**
de `dist/`. Rien à installer ni lancer en local.

Seule étape à faire une fois (dans un navigateur, aucun terminal requis) :

1. [Console Firebase](https://console.firebase.google.com/project/cryptes/settings/serviceaccounts/adminsdk)
   → *Comptes de service* → **Générer une nouvelle clé privée** (télécharge un
   fichier `.json`).
2. Sur GitHub : `Settings` → `Secrets and variables` → `Actions` →
   **New repository secret** → nom `FIREBASE_SERVICE_ACCOUNT_CRYPTES` →
   colle tout le contenu du fichier `.json` téléchargé → *Add secret*.

Une fois ce secret ajouté, tout push sur `main` republie automatiquement.
Le workflow peut aussi être relancé manuellement depuis l'onglet *Actions*
du repo (`Deploy to Firebase Hosting` → *Run workflow*).

Si un jour tu es sur ta propre machine et que tu préfères déployer à la
main : `npm install -g firebase-tools`, `firebase login`, puis
`npm run deploy` (build + déploiement en une commande).

## Classement mondial

Le bouton **Classement** de l'écran Guilde liste les joueurs connectés avec
Google (CloudSync), triable par niveau ou par étage, avec une fiche
cliquable montrant l'équipement et les talents du run où ils ont fait leur
meilleur score. Stocké dans une collection Firestore **publique**
(`leaderboard/{uid}`, un document par joueur), distincte de la sauvegarde
privée (`users/{uid}/data/...`).

Étape à faire une fois (dans un navigateur, sur la
[console Firebase](https://console.firebase.google.com/project/cryptes/firestore/rules)) :
copier le contenu de `firestore.rules` dans l'onglet *Règles* de Firestore
Database puis **Publier**. Sans ça, Firestore refuse par défaut toute
lecture/écriture en dehors des règles déjà en place — le classement
resterait vide (silencieusement, aucune erreur visible en jeu).

Les règles bornent les écritures (nom ≤ 24 caractères, niveau 1-30, étage
0-6) pour filtrer les valeurs aberrantes, mais restent — comme `Vault` et
`Integrity` — une protection côté client : rien n'empêche un joueur motivé
d'inspecter le réseau et d'écrire directement dans Firestore avec des
valeurs à l'intérieur de ces bornes. Un classement inviolable demanderait
une vraie validation serveur (voir feuille de route).

### Pourquoi obfusquer ?

Tout jeu web est techniquement copiable (le navigateur reçoit le code). On ne
peut pas l'empêcher à 100 %, mais l'obfuscation rend le code illisible et
inexploitable : textes encodés, identifiants brouillés. Ça décourage la
quasi-totalité des tentatives de vol ou de re-upload. Le code source clair
reste privé dans `web/` ; seul `dist/` (chiffré) est distribué.

## Sécurité des sauvegardes

Le module `Vault` signe et obfusque les données du localStorage ; le module
`Integrity` borne les valeurs chargées (anti-triche). Voir le code dans
`web/index.html`. Limite assumée d'un jeu 100 % client : protection forte
contre l'édition naïve, pas inviolable face à un expert (voir aussi
« Classement mondial » ci-dessous pour la même limite côté Firestore).

## Publicité

Le module `Ads` abstrait la régie : simulation sur le web/itch, AdMob natif
sur Android (à brancher lors du wrap Capacitor pour le Play Store). Le code du
jeu n'appelle jamais la régie directement — la migration ne touchera que ce
module.

## Feuille de route

1. Lancement **itch.io** (vitrine + tests).
2. Wrap **Capacitor** → app Android.
3. **Play Store** : AdMob + achats intégrés Google Play.
4. Backend serveur *uniquement si* le classement mondial doit devenir
   inviolable (validation des scores côté serveur).
