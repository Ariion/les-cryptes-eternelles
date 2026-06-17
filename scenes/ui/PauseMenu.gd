extends CanvasLayer

signal resume_requested()

func open() -> void:
	show()
	get_tree().paused = true

func close() -> void:
	hide()
	get_tree().paused = false

func _on_resume() -> void:
	close()
	emit_signal("resume_requested")

func _on_menu() -> void:
	get_tree().paused = false
	GameManager.save_game()
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
