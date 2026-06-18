extends CanvasLayer

const C_BG     := Color(0.027, 0.027, 0.067)
const C_CARD   := Color(0.106, 0.098, 0.208)
const C_GOLD   := Color(0.788, 0.647, 0.314)
const C_GOLD_L := Color(0.902, 0.773, 0.475)
const C_TEXT   := Color(0.929, 0.910, 0.875)
const C_DIM    := Color(0.475, 0.467, 0.549)
const C_PURPLE := Color(0.42,  0.25,  0.63)

var _root: Control

func _ready() -> void:
	_root = Control.new()
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	_build_bg()
	_build_title()
	_build_buttons()
	_build_footer()

	_root.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_root, "modulate:a", 1.0, 0.6).set_ease(Tween.EASE_OUT)

# ── Fond ──────────────────────────────────────────────────────────
func _build_bg() -> void:
	var bg := ColorRect.new()
	bg.color = C_BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_root.add_child(bg)

	# Image donjon en fond, très sombre
	var img := TextureRect.new()
	img.texture = load("res://assets/backgrounds/dungeon_room.svg")
	img.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	img.modulate = Color(1, 1, 1, 0.06)
	_root.add_child(img)

	# Dégradé haut violet subtil
	var glow := ColorRect.new()
	glow.color = Color(C_PURPLE.r, C_PURPLE.g, C_PURPLE.b, 0.12)
	glow.size = Vector2(390, 320)
	glow.position = Vector2(0, 0)
	_root.add_child(glow)

	# Dégradé bas vers noir
	var grad := _vgrad(Color(0, 0, 0, 0), Color(0, 0, 0, 0.85), 390, 300)
	grad.position = Vector2(0, 544)
	_root.add_child(grad)

# ── Titre ─────────────────────────────────────────────────────────
func _build_title() -> void:
	# Ornement haut
	var sep_top := _ornament_line(168)
	_root.add_child(sep_top)

	var t1 := _lbl("LES CRYPTES", 42, C_GOLD)
	t1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t1.size = Vector2(390, 56)
	t1.position = Vector2(0, 185)
	_root.add_child(t1)

	var t2 := _lbl("ÉTERNELLES", 32, C_TEXT)
	t2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t2.size = Vector2(390, 44)
	t2.position = Vector2(0, 240)
	_root.add_child(t2)

	var tagline := _lbl("Roguelite · Donjon · Tour par tour", 13, C_DIM)
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tagline.size = Vector2(390, 22)
	tagline.position = Vector2(0, 290)
	_root.add_child(tagline)

	# Ornement bas
	var sep_bot := _ornament_line(326)
	_root.add_child(sep_bot)

# ── Boutons ────────────────────────────────────────────────────────
func _build_buttons() -> void:
	var bw := 290.0
	var bx := (390.0 - bw) / 2.0
	var by := 370.0
	var gap := 16.0

	var btn_play := _btn("⚔   NOUVELLE PARTIE", bw, 62, true)
	btn_play.position = Vector2(bx, by)
	btn_play.pressed.connect(_on_play)
	_root.add_child(btn_play)

	if App.has_save():
		by += 62 + gap
		var btn_cont := _btn("↩   CONTINUER", bw, 52, false)
		btn_cont.position = Vector2(bx, by)
		btn_cont.pressed.connect(_on_continue)
		_root.add_child(btn_cont)
		by += 52 + gap
	else:
		by += 62 + gap

	var btn_hero := _btn("◈   MON HÉROS", bw, 52, false)
	btn_hero.position = Vector2(bx, by)
	btn_hero.pressed.connect(_on_hero)
	_root.add_child(btn_hero)

# ── Footer ─────────────────────────────────────────────────────────
func _build_footer() -> void:
	var stats := ""
	if App.run_count > 0:
		stats = "Runs : %d   •   Meilleur étage : %d" % [App.run_count, App.best_floor]
	else:
		stats = "Descends dans les cryptes si tu l'oses..."

	var footer := _lbl(stats, 11, C_DIM)
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer.size = Vector2(390, 22)
	footer.position = Vector2(0, 800)
	_root.add_child(footer)

# ── Actions ────────────────────────────────────────────────────────
func _on_play() -> void:
	App.go_character_select()

func _on_continue() -> void:
	App.go_game()

func _on_hero() -> void:
	App.go_character_select()

# ── Helpers ────────────────────────────────────────────────────────
func _ornament_line(y: float) -> Control:
	var c := Control.new()
	c.size = Vector2(390, 14)
	c.position = Vector2(0, y)

	var line_l := ColorRect.new()
	line_l.color = Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.3)
	line_l.size = Vector2(148, 1)
	line_l.position = Vector2(16, 6)
	c.add_child(line_l)

	var diamond := _lbl("✦", 11, C_GOLD)
	diamond.position = Vector2(179, 0)
	diamond.size = Vector2(14, 14)
	c.add_child(diamond)

	var line_r := ColorRect.new()
	line_r.color = Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.3)
	line_r.size = Vector2(148, 1)
	line_r.position = Vector2(226, 6)
	c.add_child(line_r)

	return c

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
	b.add_theme_font_size_override("font_size", 16 if primary else 14)

	var border_col := C_GOLD if primary else Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.4)
	var bg_col     := Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.12) if primary else C_CARD

	b.add_theme_stylebox_override("normal",  _sbflat(border_col, bg_col))
	b.add_theme_stylebox_override("hover",   _sbflat(C_GOLD_L,   Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.22)))
	b.add_theme_stylebox_override("pressed", _sbflat(C_GOLD,     Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, 0.06)))
	b.add_theme_stylebox_override("focus",   _sbflat(border_col, bg_col))

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
	s.content_margin_left  = 20
	s.content_margin_right = 20
	return s

func _vgrad(col_top: Color, col_bot: Color, w: float, h: float) -> TextureRect:
	var grad := Gradient.new()
	grad.set_color(0, col_top)
	grad.set_color(1, col_bot)
	var tex := GradientTexture2D.new()
	tex.gradient  = grad
	tex.fill_from = Vector2(0.5, 0.0)
	tex.fill_to   = Vector2(0.5, 1.0)
	tex.fill      = GradientTexture2D.FILL_LINEAR
	tex.width     = 4
	tex.height    = 64
	var tr := TextureRect.new()
	tr.texture      = tex
	tr.size         = Vector2(w, h)
	tr.stretch_mode = TextureRect.STRETCH_SCALE
	return tr
