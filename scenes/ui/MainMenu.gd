extends Control

@onready var play_btn: Button    = $VBox/PlayBtn
@onready var shop_btn: Button    = $VBox/ShopBtn
@onready var settings_btn: Button = $VBox/SettingsBtn
@onready var gold_label: Label   = $VBox/GoldLabel
@onready var runs_label: Label   = $VBox/RunsLabel
@onready var title_label: Label  = $VBox/TitleLabel
@onready var subtitle_label: Label = $VBox/SubtitleLabel
@onready var vignette: ColorRect = $Vignette

const SUBTITLES := [
	"Le donjon n'a pas de mémoire. Les morts, si.",
	"Chaque torche que tu allumes en éteint une autre.",
	"Les anciens dieux dorment. Pour l'instant.",
	"L'or brille dans l'obscurité — mais il attire aussi les ombres.",
	"Tu n'es pas le premier à descendre. Tu pourrais être le dernier.",
	"Les morts gardent leurs secrets. Vole les leurs.",
]

func _ready() -> void:
	MusicPlaylist.play_context("menu")
	gold_label.text = "Trésor : %d pièces d'or" % GameManager.gold
	runs_label.text = "Expéditions : %d" % GameManager.run_count
	subtitle_label.text = SUBTITLES[randi() % SUBTITLES.size()]

	_style_play_btn(play_btn)
	_style_secondary_btn(shop_btn)
	_style_secondary_btn(settings_btn)

	# Pulsation dorée du titre
	var tween := create_tween().set_loops()
	tween.tween_property(title_label, "modulate", Color(1.0, 0.84, 0.30), 2.0).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(title_label, "modulate", Color(0.78, 0.59, 0.23), 2.0).set_ease(Tween.EASE_IN_OUT)

	# Vignette qui respire (ambiance vivante)
	var v_tween := create_tween().set_loops()
	v_tween.tween_property(vignette, "modulate:a", 0.6, 3.0).set_ease(Tween.EASE_IN_OUT)
	v_tween.tween_property(vignette, "modulate:a", 0.4, 3.0).set_ease(Tween.EASE_IN_OUT)

func _style_play_btn(btn: Button) -> void:
	btn.add_theme_font_size_override("font_size", 18)
	btn.add_theme_color_override("font_color", Color(0.08, 0.04, 0.02))
	var gold := Color(0.85, 0.65, 0.15)
	var n := _flat(gold.darkened(0.1), Color(1.0, 0.82, 0.30), 2, 14)
	var h := _flat(gold.lightened(0.2), Color(1.0, 0.9, 0.5), 2, 14)
	var p := _flat(gold.darkened(0.3), Color(0.9, 0.7, 0.1), 2, 14)
	btn.add_theme_stylebox_override("normal",  n)
	btn.add_theme_stylebox_override("hover",   h)
	btn.add_theme_stylebox_override("pressed", p)

func _style_secondary_btn(btn: Button) -> void:
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_color_override("font_color", Color(0.85, 0.80, 1.0))
	var purple := Color(0.35, 0.18, 0.62)
	var n := _flat(Color(0.10, 0.06, 0.18), purple, 1, 10)
	var h := _flat(purple.darkened(0.3), purple.lightened(0.2), 1, 10)
	var p := _flat(purple.darkened(0.5), purple, 1, 10)
	btn.add_theme_stylebox_override("normal",  n)
	btn.add_theme_stylebox_override("hover",   h)
	btn.add_theme_stylebox_override("pressed", p)

func _flat(bg: Color, border: Color, border_w: int, radius: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.set_corner_radius_all(radius)
	s.content_margin_left  = 12
	s.content_margin_right = 12
	return s

func _on_play_btn_pressed() -> void:
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.4)
	tween.tween_callback(func():
		get_tree().change_scene_to_file("res://scenes/game/World.tscn")
	)

func _on_shop_btn_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/Shop.tscn")

func _on_settings_btn_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/Settings.tscn")
