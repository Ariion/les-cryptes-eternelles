extends CanvasLayer

# Scène principale du jeu — sera développée phase par phase

const C_BG   := Color(0.027, 0.027, 0.067)
const C_GOLD := Color(0.788, 0.647, 0.314)
const C_TEXT := Color(0.929, 0.910, 0.875)
const C_DIM  := Color(0.475, 0.467, 0.549)

var _root: Control

func _ready() -> void:
	_root = Control.new()
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	var bg := ColorRect.new()
	bg.color = C_BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_root.add_child(bg)

	var title := Label.new()
	title.text = "⚔ EN CONSTRUCTION"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", C_GOLD)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.size = Vector2(390, 40)
	title.position = Vector2(0, 360)
	_root.add_child(title)

	var sub := Label.new()
	sub.text = "%s · %s" % [App.selected_race, App.selected_class]
	sub.add_theme_font_size_override("font_size", 16)
	sub.add_theme_color_override("font_color", C_DIM)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.size = Vector2(390, 28)
	sub.position = Vector2(0, 410)
	_root.add_child(sub)

	var btn := Button.new()
	btn.text = "← Retour au menu"
	btn.add_theme_font_size_override("font_size", 14)
	btn.add_theme_color_override("font_color", C_TEXT)
	btn.custom_minimum_size = Vector2(220, 50)
	btn.size = Vector2(220, 50)
	btn.position = Vector2(85, 480)
	btn.pressed.connect(_on_back)
	_root.add_child(btn)

func _on_back() -> void:
	App.go_main_menu()
