extends Node

const RACES := {
	"Humain": {
		"hp": 0, "attack": 0, "defense": 0, "xp_bonus": 0.10,
		"desc": "Polyvalent et ambitieux, l'Humain excelle dans toutes les disciplines. Il gagne plus d'expérience que les autres races.",
	},
	"Elfe": {
		"hp": -10, "attack": 2, "defense": -1, "xp_bonus": 0.0,
		"desc": "Agile et intuitif, l'Elfe maîtrise l'arc et la magie avec une grâce innée. Fragile mais redoutable.",
	},
	"Nain": {
		"hp": 20, "attack": -1, "defense": 3, "xp_bonus": 0.0,
		"desc": "Robuste et tenace, le Nain résiste là où les autres tombent. Ses défenses sont presque infranchissables.",
	},
	"Orc": {
		"hp": 15, "attack": 3, "defense": -2, "xp_bonus": 0.0,
		"desc": "Brutal et impitoyable, l'Orc frappe fort et encaisse encore plus. La subtilité n'est pas son fort.",
	},
}

const CLASSES := {
	"Guerrier": {
		"hp": 30, "attack": 3, "defense": 4,
		"desc": "Maître du combat rapproché, le Guerrier est le rempart inébranlable de toute expédition.",
	},
	"Mage": {
		"hp": -10, "attack": 6, "defense": -2,
		"desc": "Fragile mais dévastateur, le Mage plie la réalité à sa volonté à travers des sorts anciens.",
	},
	"Chasseur": {
		"hp": 5, "attack": 4, "defense": 1,
		"desc": "Précis et méthodique, le Chasseur connaît les faiblesses de ses proies et frappe là où ça fait mal.",
	},
	"Assassin": {
		"hp": -5, "attack": 5, "defense": 0,
		"desc": "Dans l'ombre et la ruse, l'Assassin frappe vite, fort, et disparaît avant que l'ennemi réalise.",
	},
	"Prêtre": {
		"hp": 10, "attack": 0, "defense": 2,
		"desc": "Gardien de la lumière, le Prêtre soigne les blessures et tient ses alliés en vie contre toute adversité.",
	},
}

const SKILLS := {
	"Guerrier": [
		{
			"name": "Frappe Puissante",
			"desc": "Inflige 150% de l'ATQ en un coup dévastateur.",
			"cooldown": 2, "type": "damage", "multiplier": 1.5,
		},
		{
			"name": "Posture Défensive",
			"desc": "+8 DEF pendant 2 tours.",
			"cooldown": 3, "type": "buff_def", "amount": 8, "duration": 2,
		},
		{
			"name": "Cri de Guerre",
			"desc": "+5 ATQ pendant 3 tours.",
			"cooldown": 4, "type": "buff_atk", "amount": 5, "duration": 3,
		},
	],
	"Mage": [
		{
			"name": "Boule de Feu",
			"desc": "120% ATQ + brûlure sur l'ennemi (5 dmg/tour, 2 tours).",
			"cooldown": 2, "type": "damage_burn", "multiplier": 1.2,
		},
		{
			"name": "Éclair",
			"desc": "180% ATQ, ignore totalement la défense ennemie.",
			"cooldown": 3, "type": "damage_pierce", "multiplier": 1.8,
		},
		{
			"name": "Barrière Magique",
			"desc": "Absorbe 15 dégâts ce tour.",
			"cooldown": 4, "type": "shield", "amount": 15,
		},
	],
	"Chasseur": [
		{
			"name": "Tir Précis",
			"desc": "130% ATQ, ignore 50% de la défense ennemie.",
			"cooldown": 2, "type": "damage_pierce_half", "multiplier": 1.3,
		},
		{
			"name": "Piège Empoisonné",
			"desc": "Empoisonne l'ennemi (8 dmg/tour pendant 3 tours).",
			"cooldown": 3, "type": "poison", "dot": 8, "duration": 3,
		},
		{
			"name": "Salve",
			"desc": "3 attaques rapides à 50% ATQ chacune.",
			"cooldown": 3, "type": "multi_hit", "hits": 3, "multiplier": 0.5,
		},
	],
	"Assassin": [
		{
			"name": "Coup Sournois",
			"desc": "200% ATQ — critique garanti.",
			"cooldown": 2, "type": "damage_crit", "multiplier": 2.0,
		},
		{
			"name": "Lame Empoisonnée",
			"desc": "Empoisonne l'ennemi (10 dmg/tour pendant 4 tours).",
			"cooldown": 3, "type": "poison", "dot": 10, "duration": 4,
		},
		{
			"name": "Disparaître",
			"desc": "Esquive la prochaine attaque ennemie.",
			"cooldown": 4, "type": "evasion",
		},
	],
	"Prêtre": [
		{
			"name": "Soin Sacré",
			"desc": "Restaure 30 PV.",
			"cooldown": 2, "type": "heal", "amount": 30,
		},
		{
			"name": "Lumière Sacrée",
			"desc": "100% ATQ + purge tous les malus du joueur.",
			"cooldown": 3, "type": "damage_cleanse", "multiplier": 1.0,
		},
		{
			"name": "Bénédiction",
			"desc": "+5 ATQ et +3 DEF pendant 3 tours.",
			"cooldown": 4, "type": "buff_both", "atk": 5, "def_amount": 3, "duration": 3,
		},
	],
}

func get_combined_stats(race: String, p_class: String) -> Dictionary:
	var r: Dictionary = RACES.get(race, RACES["Humain"])
	var c: Dictionary = CLASSES.get(p_class, CLASSES["Guerrier"])
	return {
		"max_hp":   80 + int(r["hp"])     + int(c["hp"]),
		"attack":   8  + int(r["attack"]) + int(c["attack"]),
		"defense":  3  + int(r["defense"]) + int(c["defense"]),
		"xp_bonus": float(r.get("xp_bonus", 0.0)),
	}

func get_skills(p_class: String) -> Array:
	return SKILLS.get(p_class, []).duplicate(true)
