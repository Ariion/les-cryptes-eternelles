extends CanvasLayer
## Popup de combat : inventaire des objets ramassés en donjon.
## Potions → utiliser (consomme le tour). Armes/boucliers → équiper.
## Passifs → info seule (effet permanent, pas d'action).

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
		var lbl := Label.new()
		lbl.text = "Aucun objet dans l'inventaire."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.modulate = Color(0.6, 0.6, 0.6)
		lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
		item_list.add_child(lbl)
		return

	# Compte les exemplaires de chaque item.
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
		var stack_txt: String = "  x%d" % counts[item_name] if counts[item_name] > 1 else ""
		name_lbl.text = item_name + stack_txt
		name_lbl.modulate = ItemDatabase.get_rarity_color(data.get("rarity", "common"))

		var desc_lbl := Label.new()
		desc_lbl.text = data.get("description", "")
		desc_lbl.modulate = Color(0.65, 0.65, 0.65)
		desc_lbl.add_theme_font_size_override("font_size", 12)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD

		info.add_child(name_lbl)
		info.add_child(desc_lbl)
		row.add_child(info)

		match itype:
			ItemDatabase.ItemType.POTION:
				var btn := Button.new()
				btn.text = "Utiliser"
				btn.custom_minimum_size = Vector2(90, 44)
				btn.pressed.connect(_on_use_item.bind(item_name))
				row.add_child(btn)

			ItemDatabase.ItemType.WEAPON, ItemDatabase.ItemType.SHIELD:
				var slot_key: String = "weapon" if itype == ItemDatabase.ItemType.WEAPON else "shield"
				var is_equipped: bool = _player.equipment.get(slot_key, "") == item_name
				var btn := Button.new()
				btn.text = "[Equipe]" if is_equipped else "Equiper"
				btn.custom_minimum_size = Vector2(90, 44)
				btn.disabled = is_equipped
				if not is_equipped:
					btn.pressed.connect(_on_equip_item.bind(item_name))
				row.add_child(btn)

			ItemDatabase.ItemType.PASSIVE:
				var tag := Label.new()
				tag.text = "Passif"
				tag.modulate = Color(0.6, 0.85, 0.6)
				tag.add_theme_font_size_override("font_size", 11)
				tag.custom_minimum_size = Vector2(60, 44)
				tag.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
				row.add_child(tag)

		item_list.add_child(row)
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
