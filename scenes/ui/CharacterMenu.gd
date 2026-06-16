extends Control
## Écran Personnage : trois onglets — STAT (progression au niveau),
## INVENTAIRE (paper-doll avec emplacements autour du héros) et MARCHÉ
## (achat d'équipement, débloqué à partir d'un certain niveau).
## Toute l'apparence vient du thème global (GameTheme) ; on ne construit
## ici que la structure et la logique.

const PLAYER_TEXTURE := preload("res://assets/sprites/player.svg")

var _tabs: TabContainer
var _stat_tab: VBoxContainer
var _inv_tab: Control
var _market_tab: ScrollContainer
var _chooser: Panel

func _ready() -> void:
	_build_header()
	_build_tabs()
	_refresh_all()
	GameManager.xp_changed.connect(func(_a, _b, _c): _refresh_all())

# ─────────────────────────── Structure ──────────────────────────────
func _build_header() -> void:
	var back := Button.new()
	back.text = "‹ Retour"
	back.position = Vector2(12, 12)
	back.custom_minimum_size = Vector2(110, 40)
	back.pressed.connect(func():
		get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn"))
	add_child(back)

	var title := Label.new()
	title.text = "PERSONNAGE"
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color(0.78, 0.59, 0.23))
	title.position = Vector2(0, 18)
	title.size = Vector2(390, 30)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(title)

func _build_tabs() -> void:
	_tabs = TabContainer.new()
	_tabs.set_anchors_preset(Control.PRESET_FULL_RECT)
	_tabs.offset_top = 64
	_tabs.tab_changed.connect(func(_i): _refresh_all())
	add_child(_tabs)

	_stat_tab = VBoxContainer.new()
	_stat_tab.name = "STAT"
	_stat_tab.add_theme_constant_override("separation", 10)
	_tabs.add_child(_stat_tab)

	_inv_tab = Control.new()
	_inv_tab.name = "Inventaire"
	_tabs.add_child(_inv_tab)

	_market_tab = ScrollContainer.new()
	_market_tab.name = "Marché"
	_tabs.add_child(_market_tab)

func _refresh_all() -> void:
	if _tabs == null:
		return
	match _tabs.current_tab:
		0: _build_stat_tab()
		1: _build_inventory_tab()
		2: _build_market_tab()

# ─────────────────────────── Onglet STAT ────────────────────────────
func _build_stat_tab() -> void:
	for c in _stat_tab.get_children():
		c.queue_free()

	var pad := MarginContainer.new()
	pad.add_theme_constant_override("margin_left", 24)
	pad.add_theme_constant_override("margin_right", 24)
	pad.add_theme_constant_override("margin_top", 20)
	_stat_tab.add_child(pad)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	pad.add_child(box)

	var lvl := Label.new()
	lvl.text = "Niveau %d" % GameManager.level
	lvl.add_theme_font_size_override("font_size", 28)
	lvl.add_theme_color_override("font_color", Color(0.85, 0.7, 0.35))
	box.add_child(lvl)

	var xp_bar := ProgressBar.new()
	xp_bar.max_value = GameManager.xp_for_level(GameManager.level)
	xp_bar.value = GameManager.xp
	xp_bar.custom_minimum_size = Vector2(0, 22)
	box.add_child(xp_bar)

	var xp_lbl := Label.new()
	xp_lbl.text = "XP : %d / %d" % [GameManager.xp, GameManager.xp_for_level(GameManager.level)]
	xp_lbl.modulate = Color(0.7, 0.7, 0.7)
	xp_lbl.add_theme_font_size_override("font_size", 12)
	box.add_child(xp_lbl)

	box.add_child(HSeparator.new())

	var stats: Dictionary = GameManager.get_player_base_stats()
	_add_stat_row(box, "PV maximum", stats["max_hp"], Color(0.85, 0.4, 0.4))
	_add_stat_row(box, "Attaque", stats["attack"], Color(0.9, 0.6, 0.3))
	_add_stat_row(box, "Défense", stats["defense"], Color(0.45, 0.65, 0.95))

	box.add_child(HSeparator.new())

	var hint := Label.new()
	hint.text = "Tes stats augmentent à chaque niveau et avec ton équipement."
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD
	hint.modulate = Color(0.6, 0.6, 0.6)
	hint.add_theme_font_size_override("font_size", 12)
	box.add_child(hint)

func _add_stat_row(parent: Node, label: String, value: int, color: Color) -> void:
	var row := HBoxContainer.new()
	var l := Label.new()
	l.text = label
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.add_theme_font_size_override("font_size", 18)
	var v := Label.new()
	v.text = str(value)
	v.add_theme_font_size_override("font_size", 18)
	v.add_theme_color_override("font_color", color)
	row.add_child(l)
	row.add_child(v)
	parent.add_child(row)

# ───────────────────────── Onglet INVENTAIRE ────────────────────────
func _build_inventory_tab() -> void:
	for c in _inv_tab.get_children():
		c.queue_free()

	# Sprite du héros au centre.
	var hero := TextureRect.new()
	hero.texture = PLAYER_TEXTURE
	hero.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	hero.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	hero.custom_minimum_size = Vector2(120, 220)
	hero.position = Vector2(135, 90)
	hero.size = Vector2(120, 220)
	hero.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_inv_tab.add_child(hero)

	# Emplacements de chaque côté.
	var left_slots := ["head", "neck", "body", "belt"]
	var right_slots := ["arm_right", "arm_left", "legs", "feet"]
	for i in left_slots.size():
		_add_slot_button(left_slots[i], Vector2(12, 90 + i * 72))
	for i in right_slots.size():
		_add_slot_button(right_slots[i], Vector2(258, 90 + i * 72))

	# Stats apportées par l'équipement.
	var bonus: Dictionary = GameManager.equipment_bonus()
	var summary := Label.new()
	summary.text = "Équipement : +%d PV   +%d ATK   +%d DEF" % [bonus["max_hp"], bonus["attack"], bonus["defense"]]
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	summary.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	summary.add_theme_font_size_override("font_size", 13)
	summary.position = Vector2(0, 400)
	summary.size = Vector2(390, 24)
	_inv_tab.add_child(summary)

	var hint := Label.new()
	hint.text = "Touche un emplacement pour changer d'équipement."
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.modulate = Color(0.55, 0.55, 0.55)
	hint.add_theme_font_size_override("font_size", 11)
	hint.position = Vector2(0, 428)
	hint.size = Vector2(390, 20)
	_inv_tab.add_child(hint)

func _add_slot_button(slot: String, pos: Vector2) -> void:
	var equipped: String = GameManager.equipment.get(slot, "")
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(120, 62)
	btn.position = pos
	btn.size = Vector2(120, 62)
	btn.clip_text = true
	btn.autowrap_mode = TextServer.AUTOWRAP_WORD
	var slot_name: String = EquipmentDatabase.slot_label(slot)
	if equipped == "":
		btn.text = "%s\n(vide)" % slot_name
		btn.add_theme_color_override("font_color", Color(0.55, 0.55, 0.55))
	else:
		var data: Dictionary = EquipmentDatabase.get_gear(equipped)
		btn.text = "%s\n%s" % [slot_name, equipped]
		btn.add_theme_color_override("font_color", EquipmentDatabase.rarity_color(data.get("rarity", "common")))
	btn.pressed.connect(_open_chooser.bind(slot))
	_inv_tab.add_child(btn)

# Sélecteur d'équipement pour un emplacement.
func _open_chooser(slot: String) -> void:
	if _chooser:
		_chooser.queue_free()

	_chooser = Panel.new()
	_chooser.custom_minimum_size = Vector2(320, 360)
	_chooser.size = Vector2(320, 360)
	_chooser.position = Vector2(35, 200)
	add_child(_chooser)

	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 6)
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	_chooser.add_child(margin)
	margin.add_child(vbox)

	var header := Label.new()
	header.text = EquipmentDatabase.slot_label(slot)
	header.add_theme_font_size_override("font_size", 18)
	header.add_theme_color_override("font_color", Color(0.85, 0.7, 0.35))
	vbox.add_child(header)

	# Option « Retirer ».
	if GameManager.equipment.get(slot, "") != "":
		var remove_btn := Button.new()
		remove_btn.text = "Retirer"
		remove_btn.pressed.connect(func():
			GameManager.unequip_slot(slot)
			_close_chooser()
			_build_inventory_tab())
		vbox.add_child(remove_btn)

	# Pièces possédées pour cet emplacement.
	var owned_for_slot := GameManager.owned_gear.filter(func(g):
		return EquipmentDatabase.get_gear(g).get("slot", "") == slot)

	if owned_for_slot.is_empty():
		var empty := Label.new()
		empty.text = "Aucune pièce possédée.\nVa au Marché !"
		empty.modulate = Color(0.6, 0.6, 0.6)
		vbox.add_child(empty)
	else:
		for gear_name in owned_for_slot:
			var data: Dictionary = EquipmentDatabase.get_gear(gear_name)
			var btn := Button.new()
			btn.text = "%s  (+%d/%d/%d)" % [gear_name, data.get("max_hp", 0), data.get("attack", 0), data.get("defense", 0)]
			btn.add_theme_color_override("font_color", EquipmentDatabase.rarity_color(data.get("rarity", "common")))
			if GameManager.equipment.get(slot, "") == gear_name:
				btn.disabled = true
			else:
				btn.pressed.connect(func():
					GameManager.equip_gear(gear_name)
					_close_chooser()
					_build_inventory_tab())
			vbox.add_child(btn)

	var close := Button.new()
	close.text = "Fermer"
	close.pressed.connect(_close_chooser)
	vbox.add_child(close)

func _close_chooser() -> void:
	if _chooser:
		_chooser.queue_free()
		_chooser = null

# ─────────────────────────── Onglet MARCHÉ ──────────────────────────
func _build_market_tab() -> void:
	for c in _market_tab.get_children():
		c.queue_free()

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_top", 12)
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_market_tab.add_child(margin)
	margin.add_child(box)

	if not GameManager.market_unlocked():
		var locked := Label.new()
		locked.text = "Marché verrouillé.\nReviens au niveau %d." % GameManager.MARKET_UNLOCK_LEVEL
		locked.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		locked.autowrap_mode = TextServer.AUTOWRAP_WORD
		locked.modulate = Color(0.7, 0.5, 0.5)
		locked.add_theme_font_size_override("font_size", 16)
		box.add_child(locked)
		return

	var gold_lbl := Label.new()
	gold_lbl.text = "Ton or : %d" % GameManager.gold
	gold_lbl.add_theme_color_override("font_color", Color(0.85, 0.7, 0.35))
	gold_lbl.add_theme_font_size_override("font_size", 16)
	box.add_child(gold_lbl)
	box.add_child(HSeparator.new())

	for gear_name in EquipmentDatabase.GEAR:
		if gear_name in GameManager.owned_gear:
			continue
		var data: Dictionary = EquipmentDatabase.GEAR[gear_name]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)

		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_lbl := Label.new()
		name_lbl.text = "%s  [%s]" % [gear_name, EquipmentDatabase.slot_label(data["slot"])]
		name_lbl.add_theme_color_override("font_color", EquipmentDatabase.rarity_color(data.get("rarity", "common")))
		var desc_lbl := Label.new()
		desc_lbl.text = "%s  (+%d PV +%d ATK +%d DEF)" % [data.get("desc", ""), data.get("max_hp", 0), data.get("attack", 0), data.get("defense", 0)]
		desc_lbl.modulate = Color(0.65, 0.65, 0.65)
		desc_lbl.add_theme_font_size_override("font_size", 11)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
		info.add_child(name_lbl)
		info.add_child(desc_lbl)

		var buy := Button.new()
		buy.custom_minimum_size = Vector2(96, 50)
		var req_level: int = int(data.get("req_level", 1))
		if GameManager.level < req_level:
			buy.text = "Niv. %d" % req_level
			buy.disabled = true
		else:
			buy.text = "%d or" % int(data.get("cost", 0))
			buy.disabled = GameManager.gold < int(data.get("cost", 0))
			buy.pressed.connect(func():
				if GameManager.buy_gear(gear_name):
					SoundManager.play_sfx("gold")
					_build_market_tab())

		row.add_child(info)
		row.add_child(buy)
		box.add_child(row)
		box.add_child(HSeparator.new())
