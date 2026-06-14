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

	# Pulsation dorée du titre
	var tween := create_tween().set_loops()
	tween.tween_property(title_label, "modulate", Color(1.0, 0.84, 0.30), 2.0).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(title_label, "modulate", Color(0.78, 0.59, 0.23), 2.0).set_ease(Tween.EASE_IN_OUT)

	# Vignette qui respire (ambiance vivante)
	var v_tween := create_tween().set_loops()
	v_tween.tween_property(vignette, "modulate:a", 0.6, 3.0).set_ease(Tween.EASE_IN_OUT)
	v_tween.tween_property(vignette, "modulate:a", 0.4, 3.0).set_ease(Tween.EASE_IN_OUT)

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
