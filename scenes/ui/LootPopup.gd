extends CanvasLayer

# Popup de butin affiché après un combat ou une salle trésor

@onready var title_label: Label = $Panel/VBox/TitleLabel
@onready var gold_label: Label = $Panel/VBox/GoldLabel
@onready var item_label: Label = $Panel/VBox/ItemLabel
@onready var double_btn: Button = $Panel/VBox/DoubleBtn
@onready var continue_btn: Button = $Panel/VBox/ContinueBtn

var _gold_amount: int = 0
var _on_continue: Callable

func show_loot(gold: int, item_name: String, is_boss: bool, on_continue: Callable) -> void:
	_gold_amount = gold
	_on_continue = on_continue

	title_label.text = "Boss vaincu !" if is_boss else "Butin !"
	title_label.modulate = Color(1, 0.7, 0.1) if is_boss else Color.WHITE

	gold_label.text = "+%d or" % gold if gold > 0 else ""
	gold_label.visible = gold > 0

	item_label.text = "Objet : %s" % item_name if item_name != "" else ""
	item_label.visible = item_name != ""

	double_btn.visible = gold > 0 and AdManager.can_show_ad()
	double_btn.text = "Doubler l'or (+%d) — Voir une pub" % gold

	show()
	_play_appear()

func _play_appear() -> void:
	$Panel.scale = Vector2(0.7, 0.7)
	$Panel.modulate.a = 0.0
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property($Panel, "scale", Vector2.ONE, 0.25).set_ease(Tween.EASE_OUT)
	tween.tween_property($Panel, "modulate:a", 1.0, 0.2)

func _on_double_btn_pressed() -> void:
	double_btn.disabled = true
	AdManager.show_rewarded_ad("double_loot", func():
		_gold_amount *= 2
		gold_label.text = "+%d or (doublé !)" % _gold_amount
		gold_label.modulate = Color(1, 0.9, 0.1)
		double_btn.hide()
		GameManager.add_gold(_gold_amount / 2)  # ajoute la moitié supplémentaire
	)

func _on_continue_btn_pressed() -> void:
	GameManager.save_game()
	hide()
	if _on_continue.is_valid():
		_on_continue.call()
