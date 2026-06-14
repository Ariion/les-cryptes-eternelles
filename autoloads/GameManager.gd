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

signal gold_changed(new_amount: int)
signal floor_changed(new_floor: int)

func add_gold(amount: int) -> void:
	gold += amount
	total_gold_earned += amount
	emit_signal("gold_changed", gold)

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
	return {
		"max_hp": 100 + permanent_upgrades["max_hp"] * 10,
		"attack": 10 + permanent_upgrades["attack"] * 2,
		"defense": 5 + permanent_upgrades["defense"] * 2,
	}

func save_game() -> void:
	var save_data := {
		"gold": gold,
		"total_gold_earned": total_gold_earned,
		"run_count": run_count,
		"permanent_upgrades": permanent_upgrades,
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

func _ready() -> void:
	load_game()
