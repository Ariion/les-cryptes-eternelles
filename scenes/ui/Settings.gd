extends Control

@onready var music_slider: HSlider = $VBox/MusicSection/MusicSlider
@onready var sfx_slider: HSlider = $VBox/SfxSection/SfxSlider
@onready var music_label: Label = $VBox/MusicSection/MusicLabel
@onready var sfx_label: Label = $VBox/SfxSection/SfxLabel
@onready var back_btn: Button = $VBox/BackBtn
@onready var vibration_check: CheckButton = $VBox/VibrationCheck

var _vibration_enabled: bool = true

func _ready() -> void:
	music_slider.value = SoundManager.music_volume
	sfx_slider.value = SoundManager.sfx_volume
	_load_prefs()
	_update_labels()

func _load_prefs() -> void:
	if not FileAccess.file_exists("user://prefs.json"):
		return
	var file := FileAccess.open("user://prefs.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(file.get_as_text())
	_vibration_enabled = data.get("vibration", true)
	vibration_check.button_pressed = _vibration_enabled

func _save_prefs() -> void:
	var file := FileAccess.open("user://prefs.json", FileAccess.WRITE)
	file.store_string(JSON.stringify({"vibration": _vibration_enabled}))

func _update_labels() -> void:
	music_label.text = "Musique : %d%%" % int(music_slider.value * 100)
	sfx_label.text = "Effets sonores : %d%%" % int(sfx_slider.value * 100)

func _on_music_slider_value_changed(value: float) -> void:
	SoundManager.music_volume = value
	_update_labels()
	SoundManager.save_settings()

func _on_sfx_slider_value_changed(value: float) -> void:
	SoundManager.sfx_volume = value
	_update_labels()
	SoundManager.play_sfx("button")
	SoundManager.save_settings()

func _on_vibration_check_toggled(pressed: bool) -> void:
	_vibration_enabled = pressed
	_save_prefs()

func _on_back_btn_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
