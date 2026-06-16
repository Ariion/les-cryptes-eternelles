extends CanvasLayer

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

	_add_section_header("Equipement")
	_add_equipment_slot("Arme", _player.equipment.get("weapon", ""), ItemDatabase.ItemType.WEAPON)
	_add_equipment_slot("Bouclier", _player.equipment.get("shield", ""), ItemDatabase.ItemType.SHIELD)

	_add_section_header("Inventaire")

	if _player.inventory.is_empty():
		var lbl := Label.new()
		lbl.text = "Inventaire vide."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.modulate = Color(0.6, 0.6, 0.6)
		item_list.add_child(lbl)
		return

	var counts := {}
	for item in _player.inventory:
		counts[item] = counts.get(item, 0) + 1

	for item_name in counts:
		var data: Dictionary = ItemDatabase.get_item(item_name)
		var itype: int = data.get("type", -1)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)

		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_lbl := Label.new()
		name_lbl.text = "%s  x%d" % [item_name, counts[item_name]]
		name_lbl.modulate = ItemDatabase.get_rarity_color(data.get("rarity", "common"))

		var desc_lbl := Label.new()
		desc_lbl.text = data.get("description", "")
		desc_lbl.modulate = Color(0.7, 0.7, 0.7)
		desc_lbl.add_theme_font_size_override("font_size", 12)

		info.add_child(name_lbl)
		info.add_child(desc_lbl)
		row.add_child(info)

		if itype == ItemDatabase.ItemType.POTION:
			var btn := Button.new()
			btn.text = "Utiliser"
			btn.custom_minimum_size = Vector2(90, 40)
			btn.pressed.connect(_on_use_item.bind(item_name))
			row.add_child(btn)
		elif itype in [ItemDatabase.ItemType.WEAPON, ItemDatabase.ItemType.SHIELD]:
			var slot_key: String = "weapon" if itype == ItemDatabase.ItemType.WEAPON else "shield"
			var is_equipped: bool = _player.equipment.get(slot_key, "") == item_name
			var btn := Button.new()
			btn.text = "Equipe" if not is_equipped else "[Equipe]"
			btn.custom_minimum_size = Vector2(90, 40)
			btn.disabled = is_equipped
			if not is_equipped:
				btn.pressed.connect(_on_equip_item.bind(item_name))
			row.add_child(btn)

		item_list.add_child(row)
		item_list.add_child(HSeparator.new())

func _add_section_header(text: String) -> void:
	var lbl := Label.new()
	lbl.text = "— %s —" % text
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.modulate = Color(0.78, 0.68, 0.45)
	lbl.add_theme_font_size_override("font_size", 14)
	item_list.add_child(lbl)

func _add_equipment_slot(label: String, equipped_name: String, _itype: int) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)

	var slot_lbl := Label.new()
	slot_lbl.text = label + " :"
	slot_lbl.custom_minimum_size = Vector2(80, 0)
	slot_lbl.modulate = Color(0.75, 0.75, 0.75)

	var val_lbl := Label.new()
	if equipped_name == "":
		val_lbl.text = "Aucun"
		val_lbl.modulate = Color(0.5, 0.5, 0.5)
	else:
		var data: Dictionary = ItemDatabase.get_item(equipped_name)
		val_lbl.text = equipped_name
		val_lbl.modulate = ItemDatabase.get_rarity_color(data.get("rarity", "common"))
	val_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	row.add_child(slot_lbl)
	row.add_child(val_lbl)
	item_list.add_child(row)

	var stat_lbl := Label.new()
	stat_lbl.text = "  ATK %d  |  DEF %d" % [_player.stats.get("attack", 0), _player.stats.get("defense", 0)]
	stat_lbl.modulate = Color(0.6, 0.8, 0.6)
	stat_lbl.add_theme_font_size_override("font_size", 12)
	if label == "Bouclier":
		item_list.add_child(stat_lbl)
		item_list.add_child(HSeparator.new())

func _on_use_item(item_name: String) -> void:
	hide()
	_combat_manager.player_use_item(item_name)
	emit_signal("item_used", item_name)

func _on_equip_item(item_name: String) -> void:
	_player.equip_item(item_name)
	_refresh_list()

func _on_close_btn_pressed() -> void:
	hide()
