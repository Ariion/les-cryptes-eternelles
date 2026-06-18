extends CanvasLayer

const C_BG     := Color(0.027, 0.027, 0.067)
const C_CARD   := Color(0.106, 0.098, 0.208)
const C_CARD_S := Color(0.18,  0.14,  0.32)
const C_GOLD   := Color(0.788, 0.647, 0.314)
const C_GOLD_L := Color(0.902, 0.773, 0.475)
const C_PURPLE := Color(0.42,  0.25,  0.63)
const C_TEXT   := Color(0.929, 0.910, 0.875)
const C_DIM    := Color(0.475, 0.467, 0.549)

const RACES := [
	{"id": "Humain",  "icon": "⚔",  "sub": "Équilibré",  "dhp": 0,   "datk": 0,  "ddef": 0},
	{"id": "Elfe",    "icon": "✦",  "sub": "+ATQ −PV",   "dhp": -10, "datk": 2,  "ddef": -1},
	{"id": "Nain",    "icon": "⚒",  "sub": "+PV +DEF",   "dhp": 20,  "datk": -1, "ddef": 3},
	{"id": "Orc",     "icon": "◈",  "sub": "+PV +ATQ",   "dhp": 15,  "datk": 3,  "ddef": -2},
]

const CLASSES := [
	{"id": "Guerrier", "icon": "⚔", "sub": "Solide",   "hp": 100, "atk": 12, "def": 6},
	{"id": "Mage",     "icon": "✧", "sub": "Puissant", "hp": 70,  "atk": 18, "def": 3},
	{"id": "Chasseur", "icon": "◎", "sub": "Rapide",   "hp": 85,  "atk": 14, "def": 4},
	{"id": "Assassin", "icon": "◆", "sub": "Critique", "hp": 75,  "atk": 16, "def": 3},
	{"id": "Prêtre",   "icon": "✚", "sub": "Soigneur", "hp": 90,  "atk": 10, "def": 7},
]

var _race_panels  := {}
var _class_panels := {}
var _stat_labels  := {}
var _root: Control

func _ready() -> void:
	_root = Control.new()
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	_build_bg()
	_build_header()
	_build_race_section()
	_build_class_section()
	_build_stats_panel()
	_build_start_btn()

	_root.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_root, "modulate:a", 1.0, 0.45).set_ease(Tween.EASE_OUT)

	_refresh_selections()

# ── Fond ──────────────────────────────────────────────────────────
func _build_bg() -> void:
	var bg := ColorRect.new()
	bg.color = C_BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_root.add_child(bg)

	var glow := ColorRect.new()
	glow.color = Color(C_PURPLE.r, C_PURPLE.g, C_PURPLE.b, 0.09)
	glow.size = Vector2(390, 200)
	_root.add_child(glow)

# ── En-tête ───────────────────────────────────────────────────────
func _build_header() -> void:
	var back := _btn("←", 48, 48, false)
	back.position = Vector2(12, 14)
	back.pressed.connect(_on_back)
	_root.add_child(back)

	var title := _lbl("FORGE TON HÉROS", 20, C_GOLD)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.size = Vector2(390, 30)
	title.position = Vector2(0, 20)
	_root.add_child(title)

	var line := ColorRect.new()
	line.color = Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.2)
	line.size = Vector2(340, 1)
	line.position = Vector2(25, 60)
	_root.add_child(line)

# ── Races ─────────────────────────────────────────────────────────
func _build_race_section() -> void:
	var lbl := _lbl("— RACE —", 11, C_DIM)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.size = Vector2(390, 18)
	lbl.position = Vector2(0, 70)
	_root.add_child(lbl)

	var cw := 178.0
	var ch := 72.0
	var gap := 10.0
	var ox := (390.0 - cw * 2.0 - gap) / 2.0
	var oy := 92.0

	for i in RACES.size():
		var data: Dictionary = RACES[i]
		var col := i % 2
		var row := i / 2
		var card := _race_card(data, ox + col * (cw + gap), oy + row * (ch + gap), cw, ch)
		_root.add_child(card)

# ── Classes ───────────────────────────────────────────────────────
func _build_class_section() -> void:
	var lbl := _lbl("— CLASSE —", 11, C_DIM)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.size = Vector2(390, 18)
	lbl.position = Vector2(0, 264)
	_root.add_child(lbl)

	var ch := 80.0
	var gap := 8.0
	var oy := 286.0

	# Ligne 1 : 3 classes
	var cw3 := 114.0
	var ox1 := (390.0 - cw3 * 3.0 - gap * 2.0) / 2.0
	for i in 3:
		var card := _class_card(CLASSES[i], ox1 + i * (cw3 + gap), oy, cw3, ch)
		_root.add_child(card)

	# Ligne 2 : 2 classes
	var cw2 := 142.0
	var ox2 := (390.0 - cw2 * 2.0 - gap) / 2.0
	for i in 2:
		var card := _class_card(CLASSES[3 + i], ox2 + i * (cw2 + gap), oy + ch + gap, cw2, ch)
		_root.add_child(card)

# ── Panel stats ───────────────────────────────────────────────────
func _build_stats_panel() -> void:
	var panel := ColorRect.new()
	panel.color = Color(C_CARD.r, C_CARD.g, C_CARD.b, 0.9)
	panel.size = Vector2(350, 68)
	panel.position = Vector2(20, 484)
	_root.add_child(panel)

	var border := Panel.new()
	border.size = Vector2(350, 68)
	border.position = Vector2(20, 484)
	border.add_theme_stylebox_override("panel", _sbflat(Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.2), Color(0, 0, 0, 0)))
	_root.add_child(border)

	var stats := [
		{"key": "pv",  "label": "PV",  "x": 65.0},
		{"key": "atk", "label": "ATQ", "x": 195.0},
		{"key": "def", "label": "DEF", "x": 325.0},
	]
	for sd in stats:
		var name_lbl := _lbl(sd["label"], 11, C_DIM)
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.size = Vector2(40, 16)
		name_lbl.position = Vector2(sd["x"] - 20, 493)
		_root.add_child(name_lbl)

		var val_lbl := _lbl("—", 24, C_TEXT)
		val_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		val_lbl.size = Vector2(60, 32)
		val_lbl.position = Vector2(sd["x"] - 30, 510)
		_root.add_child(val_lbl)
		_stat_labels[sd["key"]] = val_lbl

# ── Bouton départ ─────────────────────────────────────────────────
func _build_start_btn() -> void:
	var bw := 320.0
	var btn := _btn("⚔   ENTRER DANS LE DONJON", bw, 62, true)
	btn.position = Vector2((390.0 - bw) / 2.0, 572)
	btn.pressed.connect(_on_start)
	_root.add_child(btn)

	var hint := _lbl("Étage 1 / 6  •  Roguelite tour par tour", 11, C_DIM)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.size = Vector2(390, 20)
	hint.position = Vector2(0, 646)
	_root.add_child(hint)

# ── Cartes race ───────────────────────────────────────────────────
func _race_card(data: Dictionary, x: float, y: float, w: float, h: float) -> Control:
	var c := Control.new()
	c.size = Vector2(w, h)
	c.position = Vector2(x, y)

	var bg := Panel.new()
	bg.size = Vector2(w, h)
	bg.add_theme_stylebox_override("panel", _sbflat(Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.25), C_CARD))
	c.add_child(bg)
	_race_panels[data["id"]] = bg

	var icon := _lbl(data["icon"], 22, C_GOLD)
	icon.position = Vector2(12, (h - 30.0) / 2.0)
	icon.size = Vector2(30, 30)
	c.add_child(icon)

	var name_lbl := _lbl(data["id"], 14, C_TEXT)
	name_lbl.position = Vector2(48, 14)
	name_lbl.size = Vector2(w - 52, 20)
	c.add_child(name_lbl)

	var sub := _lbl(data["sub"], 11, C_DIM)
	sub.position = Vector2(48, 36)
	sub.size = Vector2(w - 52, 18)
	c.add_child(sub)

	var btn := Button.new()
	btn.flat = true
	btn.size = Vector2(w, h)
	btn.add_theme_stylebox_override("normal",  _sbflat(Color(0,0,0,0), Color(0,0,0,0)))
	btn.add_theme_stylebox_override("hover",   _sbflat(Color(C_GOLD.r,C_GOLD.g,C_GOLD.b,0.5), Color(C_GOLD.r,C_GOLD.g,C_GOLD.b,0.08)))
	btn.add_theme_stylebox_override("pressed", _sbflat(Color(0,0,0,0), Color(0,0,0,0)))
	btn.add_theme_stylebox_override("focus",   _sbflat(Color(0,0,0,0), Color(0,0,0,0)))
	btn.pressed.connect(_select_race.bind(data["id"]))
	c.add_child(btn)

	return c

# ── Cartes classe ─────────────────────────────────────────────────
func _class_card(data: Dictionary, x: float, y: float, w: float, h: float) -> Control:
	var c := Control.new()
	c.size = Vector2(w, h)
	c.position = Vector2(x, y)

	var bg := Panel.new()
	bg.size = Vector2(w, h)
	bg.add_theme_stylebox_override("panel", _sbflat(Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.25), C_CARD))
	c.add_child(bg)
	_class_panels[data["id"]] = bg

	var icon := _lbl(data["icon"], 20, C_GOLD)
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon.size = Vector2(w, 26)
	icon.position = Vector2(0, 10)
	c.add_child(icon)

	var name_lbl := _lbl(data["id"], 12, C_TEXT)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.size = Vector2(w, 18)
	name_lbl.position = Vector2(0, 36)
	c.add_child(name_lbl)

	var sub := _lbl(data["sub"], 10, C_DIM)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.size = Vector2(w, 16)
	sub.position = Vector2(0, 56)
	c.add_child(sub)

	var btn := Button.new()
	btn.flat = true
	btn.size = Vector2(w, h)
	btn.add_theme_stylebox_override("normal",  _sbflat(Color(0,0,0,0), Color(0,0,0,0)))
	btn.add_theme_stylebox_override("hover",   _sbflat(Color(C_GOLD.r,C_GOLD.g,C_GOLD.b,0.5), Color(C_GOLD.r,C_GOLD.g,C_GOLD.b,0.08)))
	btn.add_theme_stylebox_override("pressed", _sbflat(Color(0,0,0,0), Color(0,0,0,0)))
	btn.add_theme_stylebox_override("focus",   _sbflat(Color(0,0,0,0), Color(0,0,0,0)))
	btn.pressed.connect(_select_class.bind(data["id"]))
	c.add_child(btn)

	return c

# ── Sélection ─────────────────────────────────────────────────────
func _select_race(id: String) -> void:
	App.selected_race = id
	_refresh_selections()

func _select_class(id: String) -> void:
	App.selected_class = id
	_refresh_selections()

func _refresh_selections() -> void:
	for rid in _race_panels:
		var sel := rid == App.selected_race
		var border := C_GOLD if sel else Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.25)
		var bg_col := C_CARD_S if sel else C_CARD
		_race_panels[rid].add_theme_stylebox_override("panel", _sbflat(border, bg_col))

	for cid in _class_panels:
		var sel := cid == App.selected_class
		var border := C_GOLD if sel else Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.25)
		var bg_col := C_CARD_S if sel else C_CARD
		_class_panels[cid].add_theme_stylebox_override("panel", _sbflat(border, bg_col))

	_update_stats()

func _update_stats() -> void:
	var rd: Dictionary = {}
	for r in RACES:
		if r["id"] == App.selected_race:
			rd = r
			break
	var cd: Dictionary = {}
	for c in CLASSES:
		if c["id"] == App.selected_class:
			cd = c
			break
	if rd.is_empty() or cd.is_empty():
		return

	var pv  := int(cd["hp"])  + int(rd["dhp"])
	var atk := int(cd["atk"]) + int(rd["datk"])
	var def := int(cd["def"]) + int(rd["ddef"])

	if _stat_labels.has("pv"):
		_stat_labels["pv"].text  = str(pv)
	if _stat_labels.has("atk"):
		_stat_labels["atk"].text = str(atk)
	if _stat_labels.has("def"):
		_stat_labels["def"].text = str(def)

# ── Actions ────────────────────────────────────────────────────────
func _on_back() -> void:
	App.go_main_menu()

func _on_start() -> void:
	App.save()
	App.go_game()

# ── Helpers ────────────────────────────────────────────────────────
func _lbl(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l

func _btn(text: String, w: float, h: float, primary: bool) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(w, h)
	b.size = Vector2(w, h)
	b.add_theme_font_size_override("font_size", 15 if primary else 13)
	var border := C_GOLD if primary else Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.4)
	var bg     := Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.12) if primary else C_CARD
	b.add_theme_stylebox_override("normal",  _sbflat(border, bg))
	b.add_theme_stylebox_override("hover",   _sbflat(C_GOLD_L, Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.22)))
	b.add_theme_stylebox_override("pressed", _sbflat(C_GOLD,   Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.06)))
	b.add_theme_stylebox_override("focus",   _sbflat(border, bg))
	var tc := C_GOLD if primary else C_TEXT
	b.add_theme_color_override("font_color",         tc)
	b.add_theme_color_override("font_hover_color",   C_GOLD_L)
	b.add_theme_color_override("font_pressed_color", tc)
	b.add_theme_color_override("font_focus_color",   tc)
	return b

func _sbflat(border: Color, bg: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(8)
	s.content_margin_left  = 8
	s.content_margin_right = 8
	return s
