extends Node

# ── Méta-progression (persisté) ───────────────────────────────────
var total_gold: int = 0
var run_count: int = 0
var best_floor: int = 0
var unlocks: Array = []

# ── Run courant ────────────────────────────────────────────────────
var selected_race: String = "Humain"
var selected_class: String = "Guerrier"
var current_floor: int = 1
var gold: int = 0
var hero: Dictionary = {}

signal gold_changed(amount: int)

# ── Navigation ────────────────────────────────────────────────────
func go_main_menu() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")

func go_character_select() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/CharacterSelect.tscn")

func go_game() -> void:
	get_tree().change_scene_to_file("res://scenes/game/World.tscn")

# ── Or ─────────────────────────────────────────────────────────────
func add_gold(amount: int) -> void:
	gold += amount
	total_gold += amount
	emit_signal("gold_changed", gold)

func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	emit_signal("gold_changed", gold)
	return true

# ── Sauvegarde ────────────────────────────────────────────────────
func save() -> void:
	var data := {
		"total_gold": total_gold,
		"run_count": run_count,
		"best_floor": best_floor,
		"unlocks": unlocks,
		"selected_race": selected_race,
		"selected_class": selected_class,
	}
	var f := FileAccess.open("user://save.json", FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))
		f.close()

func load_save() -> void:
	if not FileAccess.file_exists("user://save.json"):
		return
	var f := FileAccess.open("user://save.json", FileAccess.READ)
	if not f:
		return
	var txt := f.get_as_text()
	f.close()
	var parsed = JSON.parse_string(txt)
	if not parsed is Dictionary:
		return
	total_gold    = int(parsed.get("total_gold", 0))
	run_count     = int(parsed.get("run_count", 0))
	best_floor    = int(parsed.get("best_floor", 0))
	unlocks       = parsed.get("unlocks", [])
	selected_race  = str(parsed.get("selected_race", "Humain"))
	selected_class = str(parsed.get("selected_class", "Guerrier"))

func has_save() -> bool:
	return FileAccess.file_exists("user://save.json")

func _ready() -> void:
	load_save()
