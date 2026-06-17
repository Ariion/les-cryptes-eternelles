extends Node

enum ItemType { WEAPON, SHIELD, POTION, PASSIVE }

const ITEMS: Dictionary = {
	# ─── Armes ───────────────────────────────────────────────────────
	"Iron Sword": {
		"type": ItemType.WEAPON, "rarity": "common",
		"description": "Une épée en fer rouillée. Fiable.",
		"attack_bonus": 5, "defense_bonus": 0,
	},
	"Flame Sword": {
		"type": ItemType.WEAPON, "rarity": "rare",
		"description": "Brûle les ennemis à chaque frappe.",
		"attack_bonus": 14, "defense_bonus": 0, "on_hit": "burn",
	},
	"Shadow Blade": {
		"type": ItemType.WEAPON, "rarity": "rare",
		"description": "35% de chance de frapper deux fois.",
		"attack_bonus": 10, "defense_bonus": 0, "on_hit": "double_strike",
	},
	"Thunder Axe": {
		"type": ItemType.WEAPON, "rarity": "rare",
		"description": "Frappe violente avec +3 dégâts critiques.",
		"attack_bonus": 12, "defense_bonus": 0,
	},
	"Cursed Dagger": {
		"type": ItemType.WEAPON, "rarity": "epic",
		"description": "Rapide et tranchante. Empoisonne à chaque coup.",
		"attack_bonus": 8, "defense_bonus": 0, "on_hit": "poison",
	},
	# ─── Boucliers ───────────────────────────────────────────────────
	"Leather Shield": {
		"type": ItemType.SHIELD, "rarity": "common",
		"description": "Protection légère en cuir tanné.",
		"attack_bonus": 0, "defense_bonus": 3,
	},
	"Dragon Shield": {
		"type": ItemType.SHIELD, "rarity": "rare",
		"description": "Résiste à la magie et au feu.",
		"attack_bonus": 0, "defense_bonus": 10, "passive": "magic_resist",
	},
	"Mirror Shield": {
		"type": ItemType.SHIELD, "rarity": "rare",
		"description": "20% de chance de renvoyer les dégâts.",
		"attack_bonus": 0, "defense_bonus": 6, "passive": "reflect",
	},
	"Tower Shield": {
		"type": ItemType.SHIELD, "rarity": "epic",
		"description": "Massif. Réduit tous les dégâts subis de 3.",
		"attack_bonus": 0, "defense_bonus": 14,
	},
	# ─── Potions ─────────────────────────────────────────────────────
	"Health Potion": {
		"type": ItemType.POTION, "rarity": "common",
		"description": "Restaure 35 PV.",
		"heal": 35,
	},
	"Greater Potion": {
		"type": ItemType.POTION, "rarity": "rare",
		"description": "Restaure 70 PV.",
		"heal": 70,
	},
	"Elixir of Power": {
		"type": ItemType.POTION, "rarity": "rare",
		"description": "Restaure 50 PV et booste l'attaque de +5.",
		"heal": 50, "attack_bonus": 5,
	},
	"Antidote": {
		"type": ItemType.POTION, "rarity": "common",
		"description": "Soigne poisons, brûlures et malédictions.",
		"heal": 15, "clears_status": true,
	},
	"Berserker Flask": {
		"type": ItemType.POTION, "rarity": "rare",
		"description": "Aucun soin mais +10 attaque pour ce run.",
		"heal": 0, "attack_bonus": 10,
	},
	# ─── Passifs ─────────────────────────────────────────────────────
	"Amulet of Fortune": {
		"type": ItemType.PASSIVE, "rarity": "rare",
		"description": "+50% d'or ramassé dans ce run.",
		"gold_multiplier": 1.5,
	},
	"Ring of Thorns": {
		"type": ItemType.PASSIVE, "rarity": "rare",
		"description": "Renvoie 2 dégâts à chaque attaque reçue.",
		"reflect_damage": 2,
	},
	"Philosopher's Stone": {
		"type": ItemType.PASSIVE, "rarity": "epic",
		"description": "Régénère 3 PV à chaque tour de combat.",
		"regen_per_turn": 3,
	},
	"War Banner": {
		"type": ItemType.PASSIVE, "rarity": "epic",
		"description": "+3 attaque permanent pour ce run.",
		"attack_bonus": 3,
	},
}

func get_item(name: String) -> Dictionary:
	return ITEMS.get(name, {})

func get_rarity_color(rarity: String) -> Color:
	match rarity:
		"common": return Color(0.80, 0.80, 0.80)
		"rare":   return Color(0.30, 0.65, 1.00)
		"epic":   return Color(0.80, 0.35, 1.00)
		_:        return Color.WHITE

func get_random_item(is_rare: bool = false) -> String:
	var common := ["Health Potion", "Health Potion", "Antidote", "Iron Sword",
				   "Leather Shield", "Amulet of Fortune", "Ring of Thorns"]
	var rare   := ["Flame Sword", "Shadow Blade", "Thunder Axe", "Dragon Shield",
				   "Mirror Shield", "Elixir of Power", "Greater Potion",
				   "Berserker Flask", "Cursed Dagger", "Philosopher's Stone",
				   "Tower Shield", "War Banner"]
	var pool := rare if is_rare else common
	return pool[randi() % pool.size()]
