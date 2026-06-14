extends CanvasLayer

@onready var overlay: ColorRect = $Overlay
@onready var floor_label: Label = $Overlay/FloorLabel
@onready var subtitle_label: Label = $Overlay/SubtitleLabel
@onready var rune_label: Label = $Overlay/RuneLabel

signal transition_done()

const RUNES := ["ᚱ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ"]

func _ready() -> void:
	overlay.modulate.a = 0.0
	hide()

func play(floor_number: int, on_done: Callable = Callable()) -> void:
	floor_label.text = "— ÉTAGE  %d —" % floor_number
	subtitle_label.text = _get_subtitle(floor_number)
	rune_label.text = _random_runes(8)
	show()

	var tween := create_tween()
	tween.tween_property(overlay, "modulate:a", 1.0, 0.5)
	tween.tween_interval(1.4)
	tween.tween_callback(func():
		emit_signal("transition_done")
		if on_done.is_valid():
			on_done.call()
	)
	tween.tween_property(overlay, "modulate:a", 0.0, 0.6)
	tween.tween_callback(hide)

func _get_subtitle(floor: int) -> String:
	match floor:
		1:  return "\"La première marche est toujours la plus longue.\""
		2:  return "\"Les murs suintent une humidité ancienne.\""
		3:  return "\"Quelque chose te regarde depuis l'obscurité.\""
		4:  return "\"Tes pas résonnent trop fort dans ce silence.\""
		5:  return "\"Un gardien ancien veille au fond de ces pierres.\""
		6:  return "\"Le sol est jonché d'os — d'autres sont passés ici.\""
		7:  return "\"La magie de ce lieu est corrompue depuis longtemps.\""
		8:  return "\"Tu sens la chaleur avant de voir les flammes.\""
		9:  return "\"L'air lui-même semble vouloir te repousser.\""
		10: return "\"Peu ont atteint cette profondeur. Aucun n'est revenu.\""
		_:
			if floor % 5 == 0:
				return "\"Un pouvoir ancien se réveille à ta présence.\""
			var phrases := [
				"\"Chaque pas en avant est un pas sans retour.\"",
				"\"Les torches s'éteignent d'elles-mêmes ici.\"",
				"\"Les runes sur les murs changent quand tu ne regardes pas.\"",
				"\"Tu entends des voix. Elles t'appellent par ton nom.\"",
			]
			return phrases[floor % phrases.size()]

func _random_runes(count: int) -> String:
	var result := ""
	for _i in count:
		result += RUNES[randi() % RUNES.size()] + " "
	return result.strip_edges()
