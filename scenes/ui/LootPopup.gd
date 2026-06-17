extends CanvasLayer

@onready var title_label:   Label  = $Panel/VBox/TitleLabel
@onready var gold_label:    Label  = $Panel/VBox/GoldLabel
@onready var item_label:    Label  = $Panel/VBox/ItemLabel
@onready var item_desc:     Label  = $Panel/VBox/ItemDesc
@onready var double_btn:    Button = $Panel/VBox/DoubleBtn
@onready var continue_btn:  Button = $Panel/VBox/ContinueBtn

var _gold_amount: int = 0
var _base_gold: int = 0
var _on_continue: Callable

func show_loot(gold: int, item_name: String, is_boss: bool, on_continue: Callable) -> void:
	_gold_amount = gold
	_base_gold   = gold
	_on_continue = on_continue

	if is_boss:
		title_label.text = "Boss vaincu !"
		title_label.modulate = Color(1, 0.7, 0.1)
	else:
		title_label.text = "Butin !"
		title_label.modulate = Color.WHITE

	gold_label.text    = "+%d or" % gold if gold > 0 else ""
	gold_label.visible = gold > 0

	if item_name != "":
		var data := ItemDatabase.get_item(item_name)
		item_label.text    = item_name
		item_label.modulate = ItemDatabase.get_rarity_color(data.get("rarity", "common"))
		item_desc.text     = data.get("description", "")
		item_label.visible = true
		item_desc.visible  = true
	else:
		item_label.visible = false
		item_desc.visible  = false

	double_btn.visible = gold > 0 and AdManager.can_show_ad()
	double_btn.text    = "Doubler l'or (+%d)" % gold

	show()
	_play_appear()

func _play_appear() -> void:
	$Panel.scale = Vector2(0.75, 0.75)
	$Panel.modulate.a = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property($Panel, "scale", Vector2.ONE, 0.28).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tw.tween_property($Panel, "modulate:a", 1.0, 0.22)

func _on_double_btn_pressed() -> void:
	double_btn.disabled = true
	AdManager.show_rewarded_ad("double_loot", func():
		# Ajoute le montant original une deuxième fois (le premier l'a été via World)
		GameManager.add_gold(_base_gold)
		_gold_amount += _base_gold
		gold_label.text    = "+%d or (doublé !)" % _gold_amount
		gold_label.modulate = Color(1.0, 0.9, 0.1)
		double_btn.hide()
	)

func _on_continue_btn_pressed() -> void:
	GameManager.save_game()
	hide()
	if _on_continue.is_valid():
		_on_continue.call()
