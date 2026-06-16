extends Node
## Base de données de l'équipement porté par le personnage (paper-doll).
## Distinct des consommables de combat (ItemDatabase) : ici ce sont les
## pièces d'armure / armes persistantes qui définissent la silhouette et
## les stats du héros, achetables au Marché et améliorées au fil des niveaux.

# Emplacements du personnage, dans l'ordre d'affichage.
const SLOTS := ["head", "neck", "arm_right", "arm_left", "body", "belt", "legs", "feet"]

const SLOT_LABELS := {
	"head":      "Tête",
	"neck":      "Collier",
	"arm_right": "Arme",
	"arm_left":  "Bouclier",
	"body":      "Torse",
	"belt":      "Ceinture",
	"legs":      "Jambes",
	"feet":      "Pieds",
}

# Chaque pièce : slot, bonus de stats, rareté, coût (Marché) et niveau requis.
const GEAR := {
	# --- Tenue de départ : le héros commence quasi nu ---
	"Haillon": {
		"slot": "body", "max_hp": 0, "attack": 0, "defense": 1,
		"rarity": "common", "cost": 0, "req_level": 1,
		"desc": "Un simple bout de tissu déchiré.",
	},

	# --- Torse ---
	"Tunique de cuir": {
		"slot": "body", "max_hp": 10, "attack": 0, "defense": 4,
		"rarity": "common", "cost": 60, "req_level": 1,
		"desc": "Une protection légère mais honnête.",
	},
	"Cotte de mailles": {
		"slot": "body", "max_hp": 25, "attack": 0, "defense": 9,
		"rarity": "rare", "cost": 200, "req_level": 3,
		"desc": "Des anneaux de fer entrelacés.",
	},
	"Plastron de plates": {
		"slot": "body", "max_hp": 45, "attack": 0, "defense": 16,
		"rarity": "epic", "cost": 500, "req_level": 6,
		"desc": "Une armure forgée pour les chevaliers déchus.",
	},

	# --- Tête ---
	"Capuche élimée": {
		"slot": "head", "max_hp": 5, "attack": 0, "defense": 2,
		"rarity": "common", "cost": 40, "req_level": 1,
		"desc": "Garde la pluie hors des yeux.",
	},
	"Heaume de fer": {
		"slot": "head", "max_hp": 15, "attack": 0, "defense": 6,
		"rarity": "rare", "cost": 160, "req_level": 4,
		"desc": "Lourd, mais rassurant.",
	},

	# --- Arme (bras droit) ---
	"Gourdin": {
		"slot": "arm_right", "max_hp": 0, "attack": 4, "defense": 0,
		"rarity": "common", "cost": 50, "req_level": 1,
		"desc": "Un bout de bois noueux.",
	},
	"Épée courte": {
		"slot": "arm_right", "max_hp": 0, "attack": 9, "defense": 0,
		"rarity": "rare", "cost": 180, "req_level": 3,
		"desc": "Acier équilibré, fiable.",
	},
	"Lame runique": {
		"slot": "arm_right", "max_hp": 0, "attack": 18, "defense": 0,
		"rarity": "epic", "cost": 520, "req_level": 7,
		"desc": "Les runes pulsent d'une lueur affamée.",
	},

	# --- Bouclier (bras gauche) ---
	"Écu de bois": {
		"slot": "arm_left", "max_hp": 0, "attack": 0, "defense": 4,
		"rarity": "common", "cost": 45, "req_level": 1,
		"desc": "Mieux que rien.",
	},
	"Bouclier d'acier": {
		"slot": "arm_left", "max_hp": 10, "attack": 0, "defense": 9,
		"rarity": "rare", "cost": 190, "req_level": 4,
		"desc": "Renvoie les coups les plus lourds.",
	},

	# --- Collier ---
	"Amulette de pierre": {
		"slot": "neck", "max_hp": 20, "attack": 0, "defense": 0,
		"rarity": "common", "cost": 70, "req_level": 2,
		"desc": "Une vieille pierre percée d'un trou.",
	},
	"Pendentif du dragon": {
		"slot": "neck", "max_hp": 35, "attack": 5, "defense": 3,
		"rarity": "epic", "cost": 480, "req_level": 6,
		"desc": "On dit qu'il bat encore.",
	},

	# --- Ceinture ---
	"Ceinturon usé": {
		"slot": "belt", "max_hp": 8, "attack": 0, "defense": 2,
		"rarity": "common", "cost": 35, "req_level": 1,
		"desc": "Tient le reste en place.",
	},
	"Ceinture de force": {
		"slot": "belt", "max_hp": 0, "attack": 6, "defense": 1,
		"rarity": "rare", "cost": 170, "req_level": 5,
		"desc": "Décuple la puissance des bras.",
	},

	# --- Jambes ---
	"Pantalon rapiécé": {
		"slot": "legs", "max_hp": 6, "attack": 0, "defense": 2,
		"rarity": "common", "cost": 40, "req_level": 1,
		"desc": "Plus de coutures que de tissu.",
	},
	"Jambières de mailles": {
		"slot": "legs", "max_hp": 15, "attack": 0, "defense": 6,
		"rarity": "rare", "cost": 150, "req_level": 4,
		"desc": "Protège des morsures basses.",
	},

	# --- Pieds ---
	"Sandales": {
		"slot": "feet", "max_hp": 0, "attack": 0, "defense": 1,
		"rarity": "common", "cost": 25, "req_level": 1,
		"desc": "À peine des chaussures.",
	},
	"Bottes ferrées": {
		"slot": "feet", "max_hp": 10, "attack": 2, "defense": 4,
		"rarity": "rare", "cost": 140, "req_level": 5,
		"desc": "Chaque pas résonne dans le donjon.",
	},
}

func get_gear(gear_name: String) -> Dictionary:
	return GEAR.get(gear_name, {})

func slot_label(slot: String) -> String:
	return SLOT_LABELS.get(slot, slot)

# Toutes les pièces d'un emplacement donné.
func gear_for_slot(slot: String) -> Array:
	var out: Array = []
	for k in GEAR:
		if GEAR[k]["slot"] == slot:
			out.append(k)
	return out

func rarity_color(rarity: String) -> Color:
	match rarity:
		"common": return Color(0.78, 0.78, 0.78)
		"rare":   return Color(0.30, 0.65, 1.0)
		"epic":   return Color(0.75, 0.35, 1.0)
		_:        return Color.WHITE
