extends CanvasLayer

# Popup d'inventaire pendant le combat : affiche les items utilisables

@onready var item_list: VBoxContainer = $Panel/Scroll/ItemList
@onready var panel: Panel = $Panel
@onready var close_btn: Button = $Panel/Header/CloseBtn
@onready var title_label: Label = $Panel/Header/TitleLabel

var _player: Node
var _combat_manager: Node

signal item_used(item_name: String)

func setup(player: Node, combat_manager: Node) -> void:
	_player = player
	_combat_manager = combat_manager

func open() -> void:
	_refresh_list()
	show()

func _refresh_list() -> void:
	for child in item_list.get_children():
		child.queue_free()

	if _player.inventory.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "Inventaire vide."
		empty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_lbl.modulate = Color(0.6, 0.6, 0.6)
		item_list.add_child(empty_lbl)
		return

	# Déduplique l'affichage (compte les stacks)
	var counts := {}
	for item in _player.inventory:
		counts[item] = counts.get(item, 0) + 1

	for item_name in counts:
		var data := ItemDatabase.get_item(item_name)
		var row := HBoxContainer.new()
		row.theme_override_constants_separation = 10

		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_lbl := Label.new()
		name_lbl.text = "%s  x%d" % [item_name, counts[item_name]]
		name_lbl.modulate = ItemDatabase.get_rarity_color(data.get("rarity", "common"))

		var desc_lbl := Label.new()
		desc_lbl.text = data.get("description", "")
		desc_lbl.modulate = Color(0.7, 0.7, 0.7)
		desc_lbl.theme_override_font_sizes_font_size = 12

		info.add_child(name_lbl)
		info.add_child(desc_lbl)

		var use_btn := Button.new()
		use_btn.text = "Utiliser"
		use_btn.custom_minimum_size = Vector2(90, 40)
		use_btn.pressed.connect(_on_use_item.bind(item_name))

		row.add_child(info)
		row.add_child(use_btn)
		item_list.add_child(row)
		item_list.add_child(HSeparator.new())

func _on_use_item(item_name: String) -> void:
	hide()
	_combat_manager.player_use_item(item_name)
	emit_signal("item_used", item_name)

func _on_close_btn_pressed() -> void:
	hide()
