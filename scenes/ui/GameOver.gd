extends CanvasLayer

@onready var revive_button: Button = $Panel/VBox/ReviveButton
@onready var quit_button: Button   = $Panel/VBox/QuitButton
@onready var stats_label: Label    = $Panel/VBox/StatsLabel
@onready var title_label: Label    = $Panel/VBox/TitleLabel

var _player: Node

func show_game_over(player: Node) -> void:
	_player = player
	var s := GameManager.run_stats
	stats_label.text = (
		"Étage %d  ·  Ennemis vaincus : %d\nOr collecté : %d  ·  Dégâts reçus : %d"
		% [s["floor"], s["kills"], s["gold_collected"], s["damage_taken"]]
	)
	revive_button.disabled = not AdManager.can_show_ad()
	_play_appear()
	show()

func _play_appear() -> void:
	$Panel.modulate.a = 0.0
	$Panel.scale = Vector2(0.85, 0.85)
	var tw := create_tween().set_parallel(true)
	tw.tween_property($Panel, "modulate:a", 1.0, 0.4)
	tw.tween_property($Panel, "scale", Vector2.ONE, 0.35).set_ease(Tween.EASE_OUT)

func _on_revive_button_pressed() -> void:
	revive_button.disabled = true
	AdManager.show_rewarded_ad("revive", func():
		_player.revive_with_half_hp()
		hide()
		GameManager.save_game()
	)

func _on_quit_button_pressed() -> void:
	GameManager.save_game()
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
