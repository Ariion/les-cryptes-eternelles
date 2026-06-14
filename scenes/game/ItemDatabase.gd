extends Node

# Base de données centralisée de tous les items du jeu

enum ItemType { WEAPON, SHIELD, POTION, PASSIVE }

const ITEMS: Dictionary = {
	# --- Armes ---
	"Iron Sword": {
		"type": ItemType.WEAPON,
		"description": "Une épée en fer rouillée.",
		"attack_bonus": 5,
		"defense_bonus": 0,
		"rarity": "common",
	},
	"Flame Sword": {
		"type": ItemType.WEAPON,
		"description": "Brûle les ennemis à chaque frappe.",
		"attack_bonus": 14,
		"defense_bonus": 0,
		"rarity": "rare",
		"on_hit": "burn",
	},
	"Shadow Blade": {
		"type": ItemType.WEAPON,
		"description": "Chance de frapper deux fois.",
		"attack_bonus": 10,
		"defense_bonus": 0,
		"rarity": "rare",
		"on_hit": "double_strike",
	},

	# --- Boucliers ---
	"Leather Shield": {
		"type": ItemType.SHIELD,
		"description": "Protection basique en cuir.",
		"attack_bonus": 0,
		"defense_bonus": 3,
		"rarity": "common",
	},
	"Dragon Shield": {
		"type": ItemType.SHIELD,
		"description": "Résiste à la magie et au feu.",
		"attack_bonus": 0,
		"defense_bonus": 10,
		"rarity": "rare",
		"passive": "magic_resist",
	},
	"Mirror Shield": {
		"type": ItemType.SHIELD,
		"description": "20% de chance de renvoyer les dégâts.",
		"attack_bonus": 0,
		"defense_bonus": 6,
		"rarity": "rare",
		"passive": "reflect",
	},

	# --- Potions ---
	"Health Potion": {
		"type": ItemType.POTION,
		"description": "Restaure 30 PV.",
		"heal": 30,
		"rarity": "common",
	},
	"Elixir of Power": {
		"type": ItemType.POTION,
		"description": "Restaure 50 PV et booste l'attaque.",
		"heal": 50,
		"attack_bonus": 5,
		"rarity": "rare",
	},
	"Antidote": {
		"type": ItemType.POTION,
		"description": "Soigne les effets de statut.",
		"heal": 10,
		"clears_status": true,
		"rarity": "common",
	},

	# --- Passifs ---
	"Amulet of Fortune": {
		"type": ItemType.PASSIVE,
		"description": "+50% d'or ramassé.",
		"gold_multiplier": 1.5,
		"rarity": "rare",
	},
	"Ring of Thorns": {
		"type": ItemType.PASSIVE,
		"description": "Renvoie 2 dégâts à chaque attaque reçue.",
		"reflect_damage": 2,
		"rarity": "rare",
	},
}

func get_item(name: String) -> Dictionary:
	return ITEMS.get(name, {})

func get_rarity_color(rarity: String) -> Color:
	match rarity:
		"common": return Color(0.8, 0.8, 0.8)
		"rare":   return Color(0.2, 0.6, 1.0)
		"epic":   return Color(0.7, 0.2, 1.0)
		_:        return Color.WHITE

func get_random_item(rarity_filter: String = "") -> String:
	var pool := ITEMS.keys().filter(func(k):
		return rarity_filter == "" or ITEMS[k]["rarity"] == rarity_filter
	)
	if pool.is_empty():
		return "Health Potion"
	return pool[randi() % pool.size()]
