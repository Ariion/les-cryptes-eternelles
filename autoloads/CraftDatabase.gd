extends Node

const MATERIALS := {
	"Minerai de fer":    {"rarity": "common", "desc": "Extrait des profondeurs du donjon."},
	"Cuir tanne":        {"rarity": "common", "desc": "Souple et resistant aux entailles."},
	"Cristal magique":   {"rarity": "rare",   "desc": "Pulse d'une energie arcanique."},
	"Ecaille de dragon": {"rarity": "rare",   "desc": "Aussi dure que la legende."},
	"Essence de boss":   {"rarity": "epic",   "desc": "L'echo d'une puissance vaincue."},
}

const RECIPES := [
	{
		"name": "Epee courte",
		"result": "Épée courte",
		"ingredients": {"Minerai de fer": 3},
		"desc": "Une lame simple mais efficace.",
	},
	{
		"name": "Cotte de mailles",
		"result": "Cotte de mailles",
		"ingredients": {"Minerai de fer": 4, "Cuir tanne": 2},
		"desc": "Anneaux entrelaces a la main.",
	},
	{
		"name": "Heaume de fer",
		"result": "Heaume de fer",
		"ingredients": {"Minerai de fer": 3, "Cuir tanne": 1},
		"desc": "Protege les tetes qui savent reflechir.",
	},
	{
		"name": "Jambières de mailles",
		"result": "Jambières de mailles",
		"ingredients": {"Minerai de fer": 2, "Cuir tanne": 2},
		"desc": "Protege des morsures basses.",
	},
	{
		"name": "Bouclier d'acier",
		"result": "Bouclier d'acier",
		"ingredients": {"Minerai de fer": 4, "Cuir tanne": 2},
		"desc": "Renvoie les coups les plus lourds.",
	},
	{
		"name": "Lame runique",
		"result": "Lame runique",
		"ingredients": {"Minerai de fer": 4, "Cristal magique": 2},
		"desc": "Les runes gravees pulsent d'un feu interieur.",
	},
	{
		"name": "Pendentif du dragon",
		"result": "Pendentif du dragon",
		"ingredients": {"Ecaille de dragon": 2, "Cristal magique": 1},
		"desc": "Forge a partir d'ecailles du dragon ecarlate.",
	},
	{
		"name": "Plastron de plates",
		"result": "Plastron de plates",
		"ingredients": {"Minerai de fer": 6, "Essence de boss": 1},
		"desc": "Une armure digne des chevaliers anciens.",
	},
	{
		"name": "Bottes ferrees",
		"result": "Bottes ferrées",
		"ingredients": {"Minerai de fer": 2, "Cuir tanne": 1},
		"desc": "Chaque pas resonne dans le donjon.",
	},
]

func material_rarity_color(mat_name: String) -> Color:
	var rarity: String = str(MATERIALS.get(mat_name, {}).get("rarity", "common"))
	match rarity:
		"common": return Color(0.78, 0.78, 0.78)
		"rare":   return Color(0.30, 0.65, 1.0)
		"epic":   return Color(0.75, 0.35, 1.0)
	return Color.WHITE
