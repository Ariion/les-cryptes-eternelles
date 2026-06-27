# Prompts d'images — Les Cryptes Éternelles

Décors de donjon manquants, à générer dans le **même style** que les fonds
existants (`grottes`, `foret`, `ruines`, `port`, `pics`) : peinture numérique
dark fantasy, atmosphérique, désaturée, profonde, **sans personnage, sans
texte, sans interface**.

## ⚙️ Réglages communs (à appliquer à TOUTES les images)

- **Format** : portrait vertical mobile **9:16** (ex. 1080×1920). Le jeu
  affiche en `background-size:cover`, donc cadre l'action au centre/haut.
- **Composition** : profondeur verticale — un premier plan sombre en bas, un
  point de fuite / source de lumière vers le haut (les nœuds du donjon se
  superposent dessus). Pas d'élément important dans les coins.
- **Pas de** : personnage, créature au premier plan, visage, texte, logo,
  interface, cadre, watermark, signature.
- **Style** : digital painting, dark fantasy, cinematic, volumetric fog,
  dramatic rim light, highly detailed, muted desaturated palette, painterly,
  artstation, moody atmosphere.
- **Suffixe négatif** (Stable Diffusion) :
  `text, watermark, signature, ui, hud, people, character, face, frame, border, cartoon, low detail, oversaturated`
- **Midjourney** : ajouter `--ar 9:16 --style raw --q 2` (et `--no text, people, watermark`).

Nom de fichier exact attendu par le jeu = titre de chaque section. Déposer
dans `web/images/`.

---

## 1. `cryptes.jpg` — Les Cryptes Éternelles (PRIORITÉ — zone finale)

> A vast ancient underground crypt, the final eternal tomb. Towering black
> stone pillars carved with glowing crimson runes fading into darkness. A long
> processional path of cracked flagstones leads toward a distant altar bathed
> in a faint blood-red glow. Hanging chains, shattered sarcophagi, drifting
> dust and embers. Oppressive sacred silence, the resting place of a sealed
> god. Deep blacks with dark crimson accents (#0c0008), single eerie red light
> source far ahead. Digital painting, dark fantasy, cinematic, volumetric fog,
> dramatic rim light, highly detailed, painterly, vertical composition.

## 2. `marais.jpg` — Le Marais Putride

> A fetid haunted swamp at dusk. Twisted dead trees rising from black stagnant
> water, thick low-lying green mist, glowing wisps and bioluminescent fungi.
> A half-sunken stone causeway winds into the distance toward a rotting
> ruined shrine. Bubbling muck, hanging moss, a sickly luminous haze. Putrid
> green and cold teal palette (#070d08), murky and damp. Digital painting,
> dark fantasy, cinematic, volumetric fog, eerie glow, highly detailed,
> painterly, vertical composition.

## 3. `volcan.jpg` — Le Volcan Ardent (Caldera d'Aszgol)

> The throat of an active volcano, a hellish caldera. Rivers of molten lava
> cutting through black basalt, glowing orange fissures, rising ash and floating
> embers, smoke-choked red sky above. A narrow obsidian ledge path leads upward
> toward a fiery summit. Intense heat haze, falling cinders. Deep black rock
> with searing orange-red glow (#140503). Digital painting, dark fantasy,
> cinematic, volumetric smoke, dramatic fiery rim light, highly detailed,
> painterly, vertical composition.

## 4. `chateau_maudit.jpg` — Le Château Maudit (Acte IV)

> A cursed gothic castle interior, grand and decayed. Towering broken arches,
> tattered banners, cobwebbed chandeliers with guttering ghostly candles, a
> sweeping ruined staircase ascending into shadow. Pale moonlight through a
> shattered stained-glass window casting cold blue light. Spectral, haunted,
> aristocratic decay. Desaturated indigo and violet-black palette (#0a0810).
> Digital painting, dark fantasy, cinematic, volumetric fog, cold rim light,
> highly detailed, painterly, vertical composition.

## 5. `cite_oubliee.jpg` — La Cité Oubliée (Acte IV)

> A vast forgotten underground city swallowed by darkness. Colossal ancient
> stone architecture, crumbling temples and toppled statues of a forgotten
> civilization, half-buried streets fading into black void. A faint pale
> phosphorescent light reveals weathered carvings. Silent, monumental, lost to
> memory. Cold grey-blue near-black palette (#06080c), immense scale. Digital
> painting, dark fantasy, cinematic, volumetric haze, soft eerie glow, highly
> detailed, painterly, vertical composition.

## 6. `gouffre_astral.jpg` — Le Gouffre Astral (Acte IV — mythique)

> A surreal astral abyss, a rift between worlds. Floating fragments of broken
> stone suspended in a starless cosmic void, threads of violet and indigo
> nebula light, a distant impossible structure glowing at the center. Reality
> bending, weightless ruins, swirling stardust. Deep cosmic violet-black
> palette (#080610), otherworldly and vast. Digital painting, dark fantasy,
> cosmic horror, cinematic, volumetric light, ethereal glow, highly detailed,
> painterly, vertical composition.

## 7. `cryptes_profondes.jpg` — Les Cryptes Profondes (Acte IV — finale ultime)

> The deepest heart of the eternal crypts, where the God of Memory is sealed.
> An immense abyssal chamber, a colossal ancient sealing door covered in
> dimly pulsing crimson runes at the far end, vast chains anchoring it, an
> altar before it. Crushing darkness, faint heartbeat-red glow, drifting ash,
> overwhelming dread and finality. Pure black with deep blood-crimson accents
> (#0c0006), epic and sacred. Digital painting, dark fantasy, cinematic,
> heavy volumetric fog, ominous red rim light, highly detailed, painterly,
> vertical composition.

---

## (Optionnel) Visuels secondaires utiles plus tard

- **Portraits PNJ** (carré 1:1) : Bertrand (tavernier bourru), Séraphine
  (sorcière mystique), Oswin (barde trop souriant), Marta (aubergiste),
  Capitaine Aldric (garde), Sœur Élise (prêtresse). Style portrait peint,
  buste, fond sombre uni, cohérent avec l'UI dorée/sombre.
- **Bannière itch.io** (paysage 630×500 et capsule 315×250) : titre
  « Les Cryptes Éternelles », ambiance crypte rouge-noir, lisible en petit.

> Astuce cohérence : génère d'abord `cryptes.jpg`, puis réutilise une même
> *seed* / *style reference* pour les 3 zones profondes afin qu'elles forment
> une famille visuelle homogène pour l'Acte IV.
