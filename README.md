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
contre l'édition naïve, pas inviolable face à un expert. Un classement en
ligne nécessiterait une validation côté serveur.

## Publicité

Le module `Ads` abstrait la régie : simulation sur le web/itch, AdMob natif
sur Android (à brancher lors du wrap Capacitor pour le Play Store). Le code du
jeu n'appelle jamais la régie directement — la migration ne touchera que ce
module.

## Feuille de route

1. Lancement **itch.io** (vitrine + tests).
2. Wrap **Capacitor** → app Android.
3. **Play Store** : AdMob + achats intégrés Google Play.
4. Backend serveur *uniquement si* classement en ligne / sauvegarde cloud.
