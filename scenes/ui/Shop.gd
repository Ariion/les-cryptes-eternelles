extends Control

# Boutique de méta-progression entre les runs

const UPGRADES := [
	{
		"id": "max_hp",
		"name": "Vie maximale",
		"description": "+10 PV max par niveau",
		"base_cost": 50,
		"cost_scale": 1.4,
		"max_level": 10,
		"icon": "❤️",
	},
	{
		"id": "attack",
		"name": "Force d'attaque",
		"description": "+2 attaque par niveau",
		"base_cost": 60,
		"cost_scale": 1.4,
		"max_level": 10,
		"icon": "⚔️",
	},
	{
		"id": "defense",
		"name": "Défense",
		"description": "+2 défense par niveau",
		"base_cost": 60,
		"cost_scale": 1.4,
		"max_level": 10,
		"icon": "🛡️",
	},
]

@onready var gold_label: Label = $Top/GoldLabel
@onready var item_container: VBoxContainer = $ScrollContainer/ItemContainer
@onready var back_btn: Button = $Top/BackBtn

func _ready() -> void:
	_update_gold_label()
	_build_upgrade_list()

func _build_upgrade_list() -> void:
	for child in item_container.get_children():
		child.queue_free()

	for upgrade in UPGRADES:
		var current_level: int = GameManager.permanent_upgrades.get(upgrade["id"], 0)
		var cost: int = _get_cost(upgrade, current_level)
		var maxed: bool = current_level >= int(upgrade.get("max_level", 0))

		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)

		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_lbl := Label.new()
		name_lbl.text = "%s  %s  (niv. %d/%d)" % [upgrade["icon"], upgrade["name"], current_level, upgrade["max_level"]]
		name_lbl.add_theme_font_size_override("font_size", 16)

		var desc_lbl := Label.new()
		desc_lbl.text = upgrade["description"]
		desc_lbl.modulate = Color(0.7, 0.7, 0.7)

		info.add_child(name_lbl)
		info.add_child(desc_lbl)

		var buy_btn := Button.new()
		buy_btn.custom_minimum_size = Vector2(120, 50)

		if maxed:
			buy_btn.text = "MAX"
			buy_btn.disabled = true
		else:
			buy_btn.text = "%d or" % cost
			buy_btn.disabled = GameManager.gold < cost
			buy_btn.pressed.connect(_on_buy_pressed.bind(upgrade["id"], cost))

		row.add_child(info)
		row.add_child(buy_btn)

		var separator := HSeparator.new()
		item_container.add_child(row)
		item_container.add_child(separator)

func _on_buy_pressed(upgrade_id: String, cost: int) -> void:
	if not GameManager.spend_gold(cost):
		return
	GameManager.permanent_upgrades[upgrade_id] += 1
	GameManager.save_game()
	_update_gold_label()
	_build_upgrade_list()

func _get_cost(upgrade: Dictionary, current_level: int) -> int:
	return int(upgrade["base_cost"] * pow(upgrade["cost_scale"], current_level))

func _update_gold_label() -> void:
	gold_label.text = "Or : %d" % GameManager.gold

func _on_back_btn_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
