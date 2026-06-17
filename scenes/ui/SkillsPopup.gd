extends CanvasLayer

signal skill_selected(skill: Dictionary)

var _player: Node
var _list: VBoxContainer

func setup(player: Node) -> void:
	_player = player

func open() -> void:
	_rebuild()
	show()

func close() -> void:
	hide()

func _ready() -> void:
	hide()
	_build_shell()

func _build_shell() -> void:
	var overlay := ColorRect.new()
	overlay.color = Color(0, 0, 0, 0.65)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)

	var panel := Panel.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left  = -170
	panel.offset_top   = -220
	panel.offset_right =  170
	panel.offset_bottom =  220
	add_child(panel)

	_list = VBoxContainer.new()
	_list.add_theme_constant_override("separation", 10)
	_list.set_anchors_preset(Control.PRESET_FULL_RECT)
	_list.offset_left   = 14
	_list.offset_top    = 14
	_list.offset_right  = -14
	_list.offset_bottom = -14
	panel.add_child(_list)

func _rebuild() -> void:
	for c in _list.get_children():
		c.queue_free()
	if not _player:
		return

	var title := Label.new()
	title.text = "⚡  Compétences"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color(0.95, 0.78, 0.25))
	_list.add_child(title)

	_list.add_child(HSeparator.new())

	for skill in _player.skills:
		var cd: int = _player.get_skill_cooldown(str(skill["name"]))
		var ready_text := "Prêt" if cd == 0 else "%d tour(s)" % cd
		var btn := Button.new()
		btn.text = "%s  [%s]" % [skill["name"], ready_text]
		btn.disabled = cd > 0
		btn.tooltip_text = str(skill.get("desc", ""))
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var captured_skill := skill
		btn.pressed.connect(func():
			emit_signal("skill_selected", captured_skill)
			close()
		)
		_list.add_child(btn)

		var desc := Label.new()
		desc.text = str(skill.get("desc", ""))
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD
		desc.add_theme_font_size_override("font_size", 11)
		desc.add_theme_color_override("font_color", Color(0.65, 0.65, 0.65))
		_list.add_child(desc)

	_list.add_child(HSeparator.new())

	var close_btn := Button.new()
	close_btn.text = "Fermer"
	close_btn.pressed.connect(close)
	_list.add_child(close_btn)
