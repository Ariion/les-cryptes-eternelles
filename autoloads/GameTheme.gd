extends Node

# Palette médiévale dark-fantasy (Skyrim / The Witcher / Baldur's Gate)
const GOLD        := Color(0.784, 0.588, 0.227)   # or vieilli
const GOLD_BRIGHT := Color(1.0,   0.84,  0.30)    # or brillant (hover)
const BLOOD       := Color(0.545, 0.102, 0.102)   # rouge sang
const BLOOD_DARK  := Color(0.30,  0.05,  0.05)    # fond barre PV
const DARK_BG     := Color(0.051, 0.039, 0.078)   # fond principal (nuit profonde)
const STONE       := Color(0.133, 0.118, 0.157)   # pierre sombre (boutons)
const STONE_LIGHT := Color(0.196, 0.176, 0.235)   # pierre claire (hover)
const CREAM       := Color(0.961, 0.902, 0.784)   # parchemin
const SILVER      := Color(0.753, 0.753, 0.816)   # argent
const RUNIC_BLUE  := Color(0.220, 0.380, 0.620)   # bleu runique (rare)
const EMERALD     := Color(0.094, 0.420, 0.196)   # vert forêt (regen)

func _ready() -> void:
	var theme := _build_theme()
	get_tree().root.theme = theme

func _build_theme() -> Theme:
	var theme := Theme.new()
	theme.default_font_size = 15

	# --- Polices ---
	var font_title := _load_font("res://assets/fonts/Cinzel-Regular.ttf")
	var font_body  := _load_font("res://assets/fonts/EBGaramond-Regular.ttf")
	var font_bold  := _load_font("res://assets/fonts/Cinzel-Bold.ttf")

	if font_body:
		theme.default_font = font_body
	elif font_title:
		theme.default_font = font_title

	# --- Boutons ---
	var btn_n := _make_flat(STONE,       GOLD,        [3,3,3,3], [1,1,1,2])
	var btn_h := _make_flat(STONE_LIGHT, GOLD_BRIGHT, [3,3,3,3], [1,1,1,2])
	var btn_p := _make_flat(Color(0.45, 0.35, 0.12), GOLD, [3,3,3,3], [2,2,2,3])
	var btn_d := _make_flat(Color(0.08, 0.07, 0.09), Color(0.25,0.25,0.25), [3,3,3,3], [1,1,1,1])

	theme.set_stylebox("normal",   "Button", btn_n)
	theme.set_stylebox("hover",    "Button", btn_h)
	theme.set_stylebox("pressed",  "Button", btn_p)
	theme.set_stylebox("disabled", "Button", btn_d)
	theme.set_color("font_color",          "Button", CREAM)
	theme.set_color("font_hover_color",    "Button", GOLD_BRIGHT)
	theme.set_color("font_pressed_color",  "Button", GOLD)
	theme.set_color("font_disabled_color", "Button", Color(0.35, 0.32, 0.28))
	if font_title:
		theme.set_font("font", "Button", font_title)
	theme.set_font_size("font_size", "Button", 16)

	# --- Panneaux ---
	var panel := _make_flat(Color(0.06, 0.045, 0.09), GOLD, [4,4,4,4], [2,2,2,2])
	theme.set_stylebox("panel", "Panel", panel)

	# --- Labels ---
	theme.set_color("font_color", "Label", CREAM)
	if font_body:
		theme.set_font("font", "Label", font_body)

	# --- Barre de PV (ProgressBar) ---
	var bar_bg   := _make_flat(BLOOD_DARK, Color.TRANSPARENT, [4,4,4,4], [0,0,0,0])
	var bar_fill := _make_flat(BLOOD,      Color.TRANSPARENT, [4,4,4,4], [0,0,0,0])
	theme.set_stylebox("background", "ProgressBar", bar_bg)
	theme.set_stylebox("fill",       "ProgressBar", bar_fill)
	theme.set_color("font_color",    "ProgressBar", CREAM)

	# --- Sliders (Paramètres) ---
	var sl_bg   := _make_flat(Color(0.16, 0.14, 0.20), Color.TRANSPARENT, [6,6,6,6], [0,0,0,0])
	var sl_fill := _make_flat(GOLD,                     Color.TRANSPARENT, [6,6,6,6], [0,0,0,0])
	theme.set_stylebox("slider",       "HSlider", sl_bg)
	theme.set_stylebox("grabber_area", "HSlider", sl_fill)

	# --- Séparateurs ---
	var sep := _make_flat(GOLD, Color.TRANSPARENT, [0,0,0,0], [0,0,1,0])
	sep.bg_color = GOLD
	theme.set_stylebox("separator", "HSeparator", sep)

	# --- ScrollContainer ---
	var sc_bg := _make_flat(Color(0.045, 0.034, 0.068), Color.TRANSPARENT, [0,0,0,0], [0,0,0,0])
	theme.set_stylebox("panel", "ScrollContainer", sc_bg)

	# --- CheckButton ---
	theme.set_color("font_color", "CheckButton", CREAM)

	return theme

func _make_flat(bg: Color, border: Color, corners: Array, borders: Array) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.corner_radius_top_left     = corners[0]
	s.corner_radius_top_right    = corners[1]
	s.corner_radius_bottom_left  = corners[2]
	s.corner_radius_bottom_right = corners[3]
	s.border_width_left   = borders[0]
	s.border_width_right  = borders[1]
	s.border_width_top    = borders[2]
	s.border_width_bottom = borders[3]
	s.content_margin_left   = 12.0
	s.content_margin_right  = 12.0
	s.content_margin_top    = 8.0
	s.content_margin_bottom = 8.0
	return s

func _load_font(path: String) -> FontFile:
	if ResourceLoader.exists(path):
		return load(path)
	return null
