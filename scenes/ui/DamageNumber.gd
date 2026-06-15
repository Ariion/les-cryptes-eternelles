extends Node2D

func show_damage(amount: int, is_crit: bool = false, is_heal: bool = false) -> void:
	var lbl := Label.new()
	lbl.text = ("+" if is_heal else "-") + str(amount)
	lbl.add_theme_font_size_override("font_size", 22 if is_crit else 16)
	if is_heal:
		lbl.add_theme_color_override("font_color", Color(0.3, 1.0, 0.4))
	elif is_crit:
		lbl.add_theme_color_override("font_color", Color(1.0, 0.9, 0.1))
	else:
		lbl.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	lbl.position = Vector2(-20, 0)
	add_child(lbl)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(lbl, "position", Vector2(-20, -60), 0.8).set_trans(Tween.TRANS_CUBIC)
	tween.tween_property(lbl, "modulate:a", 0.0, 0.8).set_delay(0.3)
	tween.chain().tween_callback(queue_free)
