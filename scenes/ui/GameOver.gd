extends CanvasLayer

# Écran de game over avec option pub pour revivre

@onready var revive_button: Button = $Panel/VBox/ReviveButton
@onready var quit_button: Button = $Panel/VBox/QuitButton
@onready var gold_label: Label = $Panel/VBox/GoldLabel

var _player: Node

func show_game_over(player: Node) -> void:
	_player = player
	gold_label.text = "Or collecté : %d" % GameManager.gold
	revive_button.disabled = not AdManager.can_show_ad()
	show()

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
