extends Node

# ─────────────────────────── État persistant ────────────────────────
var gold: int = 0
var total_gold_earned: int = 0
var run_count: int = 0
var current_floor: int = 1

var permanent_upgrades := {"max_hp": 0, "attack": 0, "defense": 0}

var level: int = 1
var xp: int = 0

var selected_race: String = "Humain"
var selected_class: String = "Guerrier"

const MARKET_UNLOCK_LEVEL := 2

var equipment := {
	"head": "", "neck": "", "arm_right": "", "arm_left": "",
	"body": "Haillon", "belt": "", "legs": "", "feet": "",
}
var owned_gear: Array = ["Haillon"]

# ─────────────────────────── Stats run en cours ──────────────────────
var run_stats := {"floor": 1, "kills": 0, "gold_collected": 0, "damage_dealt": 0, "damage_taken": 0}

# ─────────────────────────── Signaux ────────────────────────────────
signal gold_changed(new_amount: int)
signal floor_changed(new_floor: int)
signal xp_changed(current_xp: int, needed: int, lvl: int)
signal leveled_up(new_level: int)

# ─────────────────────────── Or ─────────────────────────────────────
func add_gold(amount: int) -> void:
	gold += amount
	total_gold_earned += amount
	run_stats["gold_collected"] += amount
	emit_signal("gold_changed", gold)
	gain_xp(max(1, amount / 3))

func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	emit_signal("gold_changed", gold)
	return true

# ─────────────────────────── Étage ──────────────────────────────────
func next_floor() -> void:
	current_floor += 1
	run_stats["floor"] = current_floor
	emit_signal("floor_changed", current_floor)

func start_new_run() -> void:
	current_floor = 1
	run_count += 1
	run_stats = {"floor": 1, "kills": 0, "gold_collected": 0, "damage_dealt": 0, "damage_taken": 0}

# ─────────────────────────── Niveau / XP ────────────────────────────
func xp_for_level(lvl: int) -> int:
	return int(50 + lvl * 30 + lvl * lvl * 8)

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

# ─────────────────────────── Stats de base joueur ───────────────────
func get_player_base_stats() -> Dictionary:
	var base := CharacterDatabase.get_combined_stats(selected_race, selected_class)
	var bonus := equipment_bonus()
	var lvl_gain := level - 1
	return {
		"max_hp":  base["max_hp"]  + lvl_gain * 8  + permanent_upgrades["max_hp"]  * 10 + bonus["max_hp"],
		"attack":  base["attack"]  + lvl_gain * 2  + permanent_upgrades["attack"]   * 2 + bonus["attack"],
		"defense": base["defense"] + lvl_gain * 1  + permanent_upgrades["defense"]  * 2 + bonus["defense"],
		"xp_bonus": base.get("xp_bonus", 0.0),
	}

# ─────────────────────────── Sauvegarde ─────────────────────────────
func save_game() -> void:
	var save_data := {
		"gold": gold, "total_gold_earned": total_gold_earned,
		"run_count": run_count, "permanent_upgrades": permanent_upgrades,
		"level": level, "xp": xp, "equipment": equipment, "owned_gear": owned_gear,
		"selected_race": selected_race, "selected_class": selected_class,
	}
	var file := FileAccess.open("user://save.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(save_data))

func load_game() -> void:
	if not FileAccess.file_exists("user://save.json"):
		return
	var file := FileAccess.open("user://save.json", FileAccess.READ)
	if not file:
		return
	var data = JSON.parse_string(file.get_as_text())
	if not data is Dictionary:
		return
	gold               = int(data.get("gold", 0))
	total_gold_earned  = int(data.get("total_gold_earned", 0))
	run_count          = int(data.get("run_count", 0))
	permanent_upgrades = data.get("permanent_upgrades", permanent_upgrades)
	level              = int(data.get("level", 1))
	xp                 = int(data.get("xp", 0))
	var saved_equip: Dictionary = data.get("equipment", {})
	for slot in saved_equip:
		if equipment.has(slot):
			equipment[slot] = saved_equip[slot]
	var sg = data.get("owned_gear", [])
	if not sg.is_empty():
		owned_gear = sg
	selected_race  = str(data.get("selected_race", "Humain"))
	selected_class = str(data.get("selected_class", "Guerrier"))

func _ready() -> void:
	load_game()
