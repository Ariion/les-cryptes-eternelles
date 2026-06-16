extends Node

# État global persistant entre les runs
var gold: int = 0
var total_gold_earned: int = 0
var run_count: int = 0
var current_floor: int = 1

# Stats permanentes (débloquées avec l'or entre les runs)
var permanent_upgrades := {
	"max_hp": 0,
	"attack": 0,
	"defense": 0,
}

# Progression du personnage (persistante)
var level: int = 1
var xp: int = 0

# Le Marché n'est accessible qu'à partir de ce niveau.
const MARKET_UNLOCK_LEVEL := 2

# Équipement porté (paper-doll). Le héros commence quasi nu : juste un haillon.
var equipment := {
	"head": "", "neck": "", "arm_right": "", "arm_left": "",
	"body": "Haillon", "belt": "", "legs": "", "feet": "",
}

# Pièces d'équipement possédées (achetées au Marché, hors run).
var owned_gear: Array = ["Haillon"]

signal gold_changed(new_amount: int)
signal floor_changed(new_floor: int)
signal xp_changed(current_xp: int, needed: int, level: int)
signal leveled_up(new_level: int)

func add_gold(amount: int) -> void:
	gold += amount
	total_gold_earned += amount
	emit_signal("gold_changed", gold)
	# L'or gagné nourrit aussi l'expérience du héros.
	gain_xp(amount)

# ─────────────────────────── Niveau / XP ────────────────────────────
func xp_for_level(lvl: int) -> int:
	# Courbe douce : 50, 90, 140, 200, ...
	return int(40 + lvl * 20 + lvl * lvl * 5)

func gain_xp(amount: int) -> void:
	if amount <= 0:
		return
	xp += amount
	while xp >= xp_for_level(level):
		xp -= xp_for_level(level)
		level += 1
		emit_signal("leveled_up", level)
	emit_signal("xp_changed", xp, xp_for_level(level), level)

func market_unlocked() -> bool:
	return level >= MARKET_UNLOCK_LEVEL

# ─────────────────────────── Équipement ─────────────────────────────
func equip_gear(gear_name: String) -> void:
	var data: Dictionary = EquipmentDatabase.get_gear(gear_name)
	if data.is_empty() or not gear_name in owned_gear:
		return
	equipment[data["slot"]] = gear_name
	save_game()

func unequip_slot(slot: String) -> void:
	if equipment.has(slot):
		equipment[slot] = ""
		save_game()

func buy_gear(gear_name: String) -> bool:
	var data: Dictionary = EquipmentDatabase.get_gear(gear_name)
	if data.is_empty() or gear_name in owned_gear:
		return false
	if level < int(data.get("req_level", 1)):
		return false
	if not spend_gold(int(data.get("cost", 0))):
		return false
	owned_gear.append(gear_name)
	save_game()
	return true

# Bonus cumulés de tout l'équipement porté.
func equipment_bonus() -> Dictionary:
	var b := {"max_hp": 0, "attack": 0, "defense": 0}
	for slot in equipment:
		var gear_name: String = equipment[slot]
		if gear_name == "":
			continue
		var data: Dictionary = EquipmentDatabase.get_gear(gear_name)
		b["max_hp"]  += int(data.get("max_hp", 0))
		b["attack"]  += int(data.get("attack", 0))
		b["defense"] += int(data.get("defense", 0))
	return b

func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	emit_signal("gold_changed", gold)
	return true

func next_floor() -> void:
	current_floor += 1
	emit_signal("floor_changed", current_floor)

func start_new_run() -> void:
	current_floor = 1
	run_count += 1

func get_player_base_stats() -> Dictionary:
	var bonus: Dictionary = equipment_bonus()
	# Le niveau du personnage augmente régulièrement les stats de base.
	var lvl_gain: int = level - 1
	return {
		"max_hp": 80 + lvl_gain * 8 + permanent_upgrades["max_hp"] * 10 + bonus["max_hp"],
		"attack": 8 + lvl_gain * 2 + permanent_upgrades["attack"] * 2 + bonus["attack"],
		"defense": 3 + lvl_gain * 1 + permanent_upgrades["defense"] * 2 + bonus["defense"],
	}

func save_game() -> void:
	var save_data := {
		"gold": gold,
		"total_gold_earned": total_gold_earned,
		"run_count": run_count,
		"permanent_upgrades": permanent_upgrades,
		"level": level,
		"xp": xp,
		"equipment": equipment,
		"owned_gear": owned_gear,
	}
	var file := FileAccess.open("user://save.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(save_data))

func load_game() -> void:
	if not FileAccess.file_exists("user://save.json"):
		return
	var file := FileAccess.open("user://save.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(file.get_as_text())
	gold = data.get("gold", 0)
	total_gold_earned = data.get("total_gold_earned", 0)
	run_count = data.get("run_count", 0)
	permanent_upgrades = data.get("permanent_upgrades", permanent_upgrades)
	level = int(data.get("level", 1))
	xp = int(data.get("xp", 0))
	# Fusionne pour rester compatible si de nouveaux slots apparaissent.
	var saved_equip: Dictionary = data.get("equipment", {})
	for slot in saved_equip:
		if equipment.has(slot):
			equipment[slot] = saved_equip[slot]
	owned_gear = data.get("owned_gear", owned_gear)

func _ready() -> void:
	load_game()
