extends CanvasLayer

var _selected_race: String = "Humain"
var _selected_class: String = "Guerrier"
var _race_buttons: Dictionary = {}
var _class_buttons: Dictionary = {}
var _stats_label: Label
var _race_desc: Label
var _class_desc: Label
var _skills_label: Label

func _ready() -> void:
	_build_ui()
	_refresh()

func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.04, 0.02, 0.08, 1.0)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var scroll := ScrollContainer.new()
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 16)
	scroll.add_child(vbox)

	_pad(vbox, 24)

	# ── Titre ──
	var title := Label.new()
	title.text = "⚔   Créer votre héros   ⚔"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 26)
	title.add_theme_color_override("font_color", Color(0.95, 0.78, 0.25))
	vbox.add_child(title)

	vbox.add_child(HSeparator.new())

	# ── Race ──
	_section_label(vbox, "Race")

	var race_row := HBoxContainer.new()
	race_row.alignment = BoxContainer.ALIGNMENT_CENTER
	race_row.add_theme_constant_override("separation", 8)
	vbox.add_child(race_row)
	for race in ["Humain", "Elfe", "Nain", "Orc"]:
		var btn := _make_btn(race, 84, 52)
		btn.pressed.connect(_on_race.bind(race))
		race_row.add_child(btn)
		_race_buttons[race] = btn

	_race_desc = _desc_label(vbox)

	vbox.add_child(HSeparator.new())

	# ── Classe ──
	_section_label(vbox, "Classe")

	var row1 := HBoxContainer.new()
	row1.alignment = BoxContainer.ALIGNMENT_CENTER
	row1.add_theme_constant_override("separation", 8)
	vbox.add_child(row1)
	for cls in ["Guerrier", "Mage", "Chasseur"]:
		var btn := _make_btn(cls, 110, 52)
		btn.pressed.connect(_on_class.bind(cls))
		row1.add_child(btn)
		_class_buttons[cls] = btn

	var row2 := HBoxContainer.new()
	row2.alignment = BoxContainer.ALIGNMENT_CENTER
	row2.add_theme_constant_override("separation", 8)
	vbox.add_child(row2)
	for cls in ["Assassin", "Prêtre"]:
		var btn := _make_btn(cls, 110, 52)
		btn.pressed.connect(_on_class.bind(cls))
		row2.add_child(btn)
		_class_buttons[cls] = btn

	_class_desc = _desc_label(vbox)

	vbox.add_child(HSeparator.new())

	# ── Stats ──
	_stats_label = Label.new()
	_stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_stats_label.add_theme_font_size_override("font_size", 15)
	_stats_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))
	vbox.add_child(_stats_label)

	# ── Compétences ──
	_skills_label = Label.new()
	_skills_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_skills_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_skills_label.add_theme_font_size_override("font_size", 12)
	_skills_label.add_theme_color_override("font_color", Color(0.55, 0.85, 0.55))
	vbox.add_child(_skills_label)

	_pad(vbox, 8)

	# ── Bouton Confirmer ──
	var confirm := Button.new()
	confirm.text = "Commencer l'aventure"
	confirm.custom_minimum_size = Vector2(300, 62)
	confirm.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	confirm.add_theme_font_size_override("font_size", 18)
	confirm.pressed.connect(_on_confirm)
	vbox.add_child(confirm)

	_pad(vbox, 24)

# ─── helpers ────────────────────────────────────────────────────────
func _pad(parent: Control, h: int) -> void:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	parent.add_child(c)

func _section_label(parent: Control, text: String) -> void:
	var lbl := Label.new()
	lbl.text = text
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", 17)
	lbl.add_theme_color_override("font_color", Color(0.72, 0.72, 0.95))
	parent.add_child(lbl)

func _desc_label(parent: Control) -> Label:
	var lbl := Label.new()
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	lbl.add_theme_font_size_override("font_size", 13)
	lbl.add_theme_color_override("font_color", Color(0.72, 0.68, 0.65))
	parent.add_child(lbl)
	return lbl

func _make_btn(text: String, w: int, h: int) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(w, h)
	return btn

# ─── callbacks ──────────────────────────────────────────────────────
func _on_race(race: String) -> void:
	_selected_race = race
	_refresh()

func _on_class(cls: String) -> void:
	_selected_class = cls
	_refresh()

func _refresh() -> void:
	var gold := Color(0.95, 0.78, 0.25)
	for race in _race_buttons:
		var btn: Button = _race_buttons[race]
		if race == _selected_race:
			btn.add_theme_color_override("font_color", gold)
		else:
			btn.remove_theme_color_override("font_color")

	for cls in _class_buttons:
		var btn: Button = _class_buttons[cls]
		if cls == _selected_class:
			btn.add_theme_color_override("font_color", gold)
		else:
			btn.remove_theme_color_override("font_color")

	_race_desc.text = str(CharacterDatabase.RACES.get(_selected_race, {}).get("desc", ""))
	_class_desc.text = str(CharacterDatabase.CLASSES.get(_selected_class, {}).get("desc", ""))

	var s := CharacterDatabase.get_combined_stats(_selected_race, _selected_class)
	_stats_label.text = "❤ PV : %d   ⚔ ATQ : %d   🛡 DEF : %d" % [s["max_hp"], s["attack"], s["defense"]]

	var skills := CharacterDatabase.get_skills(_selected_class)
	var lines: Array = []
	for sk in skills:
		lines.append("• %s — %s" % [sk["name"], sk["desc"]])
	_skills_label.text = "\n".join(lines)

func _on_confirm() -> void:
	GameManager.selected_race  = _selected_race
	GameManager.selected_class = _selected_class
	GameManager.start_new_run()
	get_tree().change_scene_to_file("res://scenes/game/World.tscn")
