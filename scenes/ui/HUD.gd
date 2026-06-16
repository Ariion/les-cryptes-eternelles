extends CanvasLayer

<<<<<<< HEAD
@onready var hp_bar: ProgressBar = $Top/HBox/HpBarWrap/HpBar
@onready var hp_label: Label = $Top/HBox/HpBarWrap/HpBar/HpLabel
@onready var gold_label: Label = $Top/HBox/GoldLabel
@onready var floor_label: Label = $Top/HBox/FloorLabel
@onready var room_label: Label = $RoomBar/RoomLabel
@onready var status_bar: HBoxContainer = $Top/HBox/StatusBar
=======
@onready var hp_bar: ProgressBar = $Top/HBox/HpBar
@onready var hp_label: Label = $Top/HBox/HpBar/HpLabel
@onready var gold_label: Label = $Top/HBox/GoldLabel
@onready var floor_label: Label = $Top/HBox/FloorLabel
>>>>>>> origin/main

@onready var bottom_panel: Panel = $Bottom
@onready var attack_btn: Button = $Bottom/Grid/AttackBtn
@onready var defend_btn: Button = $Bottom/Grid/DefendBtn
@onready var item_btn: Button = $Bottom/Grid/ItemBtn
@onready var flee_btn: Button = $Bottom/Grid/FleeBtn

@onready var message_label: Label = $Middle/MessageLabel
@onready var log_container: VBoxContainer = $Middle/LogScroll/LogContainer
@onready var double_loot_panel: Panel = $Middle/DoubleLootPanel
@onready var enemy_container: HBoxContainer = $Middle/EnemyContainer
<<<<<<< HEAD
=======
@onready var status_bar: HBoxContainer = $Top/HBox/StatusBar
>>>>>>> origin/main

var _double_loot_callback: Callable
var _combat_manager: Node
var _inventory_popup: CanvasLayer

const C_BG       := Color(0.06, 0.03, 0.12, 0.96)   # fond sombre violet
const C_BORDER   := Color(0.35, 0.20, 0.60, 1.0)     # violet clair
const C_HP_FILL  := Color(0.85, 0.12, 0.12, 1.0)
const C_HP_LOW   := Color(1.00, 0.05, 0.05, 1.0)
const C_HP_BG    := Color(0.20, 0.04, 0.04, 1.0)
const C_LOG_BG   := Color(0.03, 0.02, 0.08, 0.82)
const C_ATTACK   := Color(0.80, 0.10, 0.10)
const C_DEFEND   := Color(0.10, 0.30, 0.80)
const C_ITEM     := Color(0.10, 0.55, 0.20)
const C_FLEE     := Color(0.30, 0.30, 0.30)

func _ready() -> void:
	double_loot_panel.hide()
	bottom_panel.hide()
	message_label.text = ""
	_apply_theme()
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.floor_changed.connect(_on_floor_changed)
	_on_gold_changed(GameManager.gold)
	_on_floor_changed(GameManager.current_floor)

func _apply_theme() -> void:
<<<<<<< HEAD
	_panel_style($Top, C_BG, C_BORDER, 0, 2)
	_panel_style($RoomBar, Color(0.10, 0.05, 0.18, 0.90), Color(0.4, 0.25, 0.65), 0, 0)

	var log_style := _make_flat(C_LOG_BG, C_BORDER, 1, 6)
	log_style.content_margin_left = 8
	log_style.content_margin_right = 8
	log_style.content_margin_top = 6
	log_style.content_margin_bottom = 6
	$Middle/LogScroll.add_theme_stylebox_override("panel", log_style)

	_panel_style(combat_panel, C_BG, C_BORDER, 2, 0)

	var hp_fill := _make_flat(C_HP_FILL, Color.TRANSPARENT, 0, 4)
	var hp_bg   := _make_flat(C_HP_BG,   Color.TRANSPARENT, 0, 4)
	hp_bar.add_theme_stylebox_override("fill",       hp_fill)
	hp_bar.add_theme_stylebox_override("background", hp_bg)

	_style_btn(attack_btn, C_ATTACK)
	_style_btn(defend_btn, C_DEFEND)
	_style_btn(item_btn,   C_ITEM)
	_style_btn(flee_btn,   C_FLEE)

func _make_flat(bg: Color, border: Color, border_w: int, radius: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.set_corner_radius_all(radius)
	return s

func _panel_style(panel: Control, bg: Color, border: Color, top_border: int, bot_border: int) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(0)
	s.border_width_top = top_border
	s.border_width_bottom = bot_border
	panel.add_theme_stylebox_override("panel", s)

func _style_btn(btn: Button, color: Color) -> void:
	btn.add_theme_font_size_override("font_size", 18)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", Color(0.45, 0.45, 0.45))

	var normal   := _make_flat(color.darkened(0.55), color, 2, 12)
	var hover    := _make_flat(color.darkened(0.25), color.lightened(0.2), 2, 12)
	var pressed  := _make_flat(color.lightened(0.15), color.lightened(0.4), 2, 12)
	var disabled := _make_flat(Color(0.08, 0.08, 0.10), Color(0.25, 0.25, 0.25), 2, 12)
	for s in [normal, hover, pressed, disabled]:
		s.content_margin_left  = 8
		s.content_margin_right = 8
	btn.add_theme_stylebox_override("normal",   normal)
	btn.add_theme_stylebox_override("hover",    hover)
	btn.add_theme_stylebox_override("pressed",  pressed)
	btn.add_theme_stylebox_override("disabled", disabled)

# ────────────────────────────────────────
=======
	# Top panel — semi-transparent dark
	var top_style := StyleBoxFlat.new()
	top_style.bg_color = Color(0.05, 0.03, 0.1, 0.88)
	top_style.border_color = Color(0.3, 0.2, 0.5, 1)
	top_style.set_border_width_all(0)
	top_style.border_width_bottom = 2
	$Top.add_theme_stylebox_override("panel", top_style)

	# HP bar fill
	var hp_fill := StyleBoxFlat.new()
	hp_fill.bg_color = Color(0.8, 0.15, 0.15, 1)
	hp_fill.set_corner_radius_all(4)
	var hp_bg := StyleBoxFlat.new()
	hp_bg.bg_color = Color(0.2, 0.05, 0.05, 1)
	hp_bg.set_corner_radius_all(4)
	hp_bar.add_theme_stylebox_override("fill", hp_fill)
	hp_bar.add_theme_stylebox_override("background", hp_bg)

	# Log scroll background
	var log_style := StyleBoxFlat.new()
	log_style.bg_color = Color(0.04, 0.02, 0.08, 0.75)
	log_style.set_corner_radius_all(6)
	log_style.content_margin_left = 6.0
	log_style.content_margin_right = 6.0
	log_style.content_margin_top = 4.0
	log_style.content_margin_bottom = 4.0
	$Middle/LogScroll.add_theme_stylebox_override("panel", log_style)

	# Bottom panel
	var bot_style := StyleBoxFlat.new()
	bot_style.bg_color = Color(0.05, 0.03, 0.1, 0.92)
	bot_style.border_color = Color(0.3, 0.2, 0.5, 1)
	bot_style.set_border_width_all(0)
	bot_style.border_width_top = 2
	bottom_panel.add_theme_stylebox_override("panel", bot_style)

	# Buttons
	_style_btn(attack_btn, Color(0.7, 0.1, 0.1), "⚔  Attaquer")
	_style_btn(defend_btn, Color(0.1, 0.3, 0.7), "🛡  Défendre")
	_style_btn(item_btn,   Color(0.1, 0.5, 0.2), "🧪  Objet")
	_style_btn(flee_btn,   Color(0.3, 0.3, 0.3), "💨  Fuir")

func _style_btn(btn: Button, color: Color, label: String) -> void:
	btn.text = label
	btn.add_theme_font_size_override("font_size", 17)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", Color(0.5, 0.5, 0.5, 0.7))

	var normal := StyleBoxFlat.new()
	normal.bg_color = color.darkened(0.5)
	normal.border_color = color
	normal.set_border_width_all(2)
	normal.set_corner_radius_all(10)
	normal.content_margin_left = 8.0
	normal.content_margin_right = 8.0

	var hover := StyleBoxFlat.new()
	hover.bg_color = color.darkened(0.2)
	hover.border_color = color.lightened(0.3)
	hover.set_border_width_all(2)
	hover.set_corner_radius_all(10)
	hover.content_margin_left = 8.0
	hover.content_margin_right = 8.0

	var pressed := StyleBoxFlat.new()
	pressed.bg_color = color.lightened(0.1)
	pressed.border_color = color.lightened(0.4)
	pressed.set_border_width_all(2)
	pressed.set_corner_radius_all(10)
	pressed.content_margin_left = 8.0
	pressed.content_margin_right = 8.0

	var disabled := StyleBoxFlat.new()
	disabled.bg_color = Color(0.1, 0.1, 0.1, 0.5)
	disabled.border_color = Color(0.3, 0.3, 0.3, 0.5)
	disabled.set_border_width_all(2)
	disabled.set_corner_radius_all(10)
	disabled.content_margin_left = 8.0
	disabled.content_margin_right = 8.0

	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("disabled", disabled)

>>>>>>> origin/main
func bind_player(player: Node) -> void:
	player.hp_changed.connect(_on_hp_changed)
	player.player_hit.connect(_on_player_hit)
	player.status_applied.connect(_on_status_applied)
	player.status_removed.connect(_on_status_removed)
	_on_hp_changed(player.stats["hp"], player.stats["max_hp"])

func bind_combat_manager(cm: Node) -> void:
	_combat_manager = cm
	cm.combat_log.connect(_append_log)
	cm.turn_started.connect(_on_turn_started)

func set_inventory_popup(popup: CanvasLayer) -> void:
	_inventory_popup = popup

func update_room_info(room_type: int, index: int, total: int) -> void:
<<<<<<< HEAD
	var names := ["Entrée", "Combat", "Trésor", "Repos", "⚠ BOSS"]
	room_label.text = names[room_type] if room_type < names.size() else "?"
	room_label.add_theme_color_override("font_color",
		Color(1.0, 0.4, 0.4) if room_type == 4 else Color(0.85, 0.75, 1.0))
	floor_label.text = "Étage %d  %d/%d" % [GameManager.current_floor, index + 1, total]
=======
	floor_label.text = "Etage %d  %d/%d" % [GameManager.current_floor, index + 1, total]
>>>>>>> origin/main
	for child in log_container.get_children():
		child.queue_free()

func show_message(text: String) -> void:
	message_label.text = text
	var tween := create_tween()
	tween.tween_interval(2.2)
	tween.tween_callback(func(): message_label.text = "")

func show_double_loot_offer(gold_amount: int, callback: Callable) -> void:
	_double_loot_callback = callback
	double_loot_panel.get_node("VBox/Label").text = "Doubler les %d or ?" % gold_amount
	double_loot_panel.show()

func show_combat_buttons(show: bool) -> void:
	bottom_panel.visible = show

func update_enemy_display(enemies: Array) -> void:
	for child in enemy_container.get_children():
		child.queue_free()
	for enemy in enemies:
		var col := VBoxContainer.new()
<<<<<<< HEAD
		col.custom_minimum_size = Vector2(86, 0)
		col.alignment = BoxContainer.ALIGNMENT_CENTER
		col.theme_override_constants_separation = 4
=======
		col.custom_minimum_size = Vector2(72, 0)
>>>>>>> origin/main

		var name_lbl := Label.new()
		name_lbl.text = enemy.enemy_name
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.add_theme_font_size_override("font_size", 12)
<<<<<<< HEAD
		name_lbl.add_theme_color_override("font_color", Color(1.0, 0.85, 0.55))

		var bar_bg := Panel.new()
		bar_bg.custom_minimum_size = Vector2(82, 12)
		var bar_bg_style := StyleBoxFlat.new()
		bar_bg_style.bg_color = Color(0.18, 0.04, 0.04)
		bar_bg_style.set_corner_radius_all(4)
		bar_bg.add_theme_stylebox_override("panel", bar_bg_style)

		var bar := ColorRect.new()
		bar.color = Color(0.85, 0.12, 0.12)
		bar.set_anchors_preset(Control.PRESET_FULL_RECT)

		bar_bg.add_child(bar)

		var hp_lbl := Label.new()
		hp_lbl.text = "%d/%d" % [enemy.stats["hp"], enemy.stats["max_hp"]]
		hp_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hp_lbl.add_theme_font_size_override("font_size", 10)
		hp_lbl.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75))

		col.add_child(name_lbl)
		col.add_child(bar_bg)
		col.add_child(hp_lbl)
		enemy_container.add_child(col)

		var max_hp: int = enemy.stats["max_hp"]
		enemy.hp_changed.connect(func(cur: int, _max: int) -> void:
			bar.scale.x = float(cur) / float(max(1, max_hp))
			bar.pivot_offset = Vector2.ZERO
			hp_lbl.text = "%d/%d" % [cur, max_hp]
		)
=======
		name_lbl.add_theme_color_override("font_color", Color(1, 0.85, 0.6))

		var bar := ProgressBar.new()
		bar.max_value = enemy.stats["max_hp"]
		bar.value = enemy.stats["hp"]
		bar.custom_minimum_size = Vector2(72, 10)
		bar.show_percentage = false
		var bar_fill := StyleBoxFlat.new()
		bar_fill.bg_color = Color(0.85, 0.15, 0.15)
		bar_fill.set_corner_radius_all(3)
		var bar_bg := StyleBoxFlat.new()
		bar_bg.bg_color = Color(0.2, 0.05, 0.05)
		bar_bg.set_corner_radius_all(3)
		bar.add_theme_stylebox_override("fill", bar_fill)
		bar.add_theme_stylebox_override("background", bar_bg)

		col.add_child(name_lbl)
		col.add_child(bar)
		enemy_container.add_child(col)

		enemy.hp_changed.connect(func(cur, _max): bar.value = cur)
>>>>>>> origin/main

func _append_log(message: String) -> void:
	var lbl := Label.new()
	lbl.text = "▸ " + message
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	lbl.add_theme_font_size_override("font_size", 13)
<<<<<<< HEAD
	lbl.add_theme_color_override("font_color", Color(0.82, 0.82, 0.95))
	log_container.add_child(lbl)
	if log_container.get_child_count() > 9:
=======
	lbl.add_theme_color_override("font_color", Color(0.85, 0.85, 0.95))
	log_container.add_child(lbl)
	if log_container.get_child_count() > 8:
>>>>>>> origin/main
		log_container.get_child(0).queue_free()

func _on_status_applied(effect: StatusEffect) -> void:
	var lbl := Label.new()
	lbl.name = "status_%d" % effect.type
	lbl.text = StatusEffect.get_icon(effect.type)
	lbl.tooltip_text = effect.get_description()
	lbl.add_theme_font_size_override("font_size", 18)
	status_bar.add_child(lbl)

func _on_status_removed(effect: StatusEffect) -> void:
	var node := status_bar.get_node_or_null("status_%d" % effect.type)
	if node:
		node.queue_free()

func _on_hp_changed(current: int, maximum: int) -> void:
	hp_bar.max_value = maximum
	hp_bar.value = current
	hp_label.text = "%d / %d" % [current, maximum]
<<<<<<< HEAD
	var ratio := float(current) / float(max(1, maximum))
	var fill := _make_flat(C_HP_LOW if ratio < 0.3 else C_HP_FILL, Color.TRANSPARENT, 0, 4)
	hp_bar.add_theme_stylebox_override("fill", fill)

func _on_player_hit(damage: int) -> void:
	var overlay := ColorRect.new()
	overlay.color = Color(0.85, 0.05, 0.05, 0.30)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)
	var lbl := Label.new()
	lbl.text = "-%d" % damage
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.set_anchors_preset(Control.PRESET_CENTER)
	lbl.add_theme_font_size_override("font_size", 36)
	lbl.add_theme_color_override("font_color", Color(1.0, 0.25, 0.25))
	lbl.position = Vector2(-60, -40)
	add_child(lbl)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(overlay, "color:a", 0.0, 0.5)
	tw.tween_property(lbl, "position:y", lbl.position.y - 30, 0.5).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(lbl, "modulate:a", 0.0, 0.5).set_delay(0.2)
	tw.chain().tween_callback(func(): overlay.queue_free(); lbl.queue_free())
=======
	var ratio := float(current) / float(maximum)
	var fill := StyleBoxFlat.new()
	fill.set_corner_radius_all(4)
	fill.bg_color = Color(0.8, 0.15, 0.15) if ratio > 0.25 else Color(0.95, 0.05, 0.05)
	hp_bar.add_theme_stylebox_override("fill", fill)
>>>>>>> origin/main

func _on_gold_changed(amount: int) -> void:
	gold_label.text = str(amount)

func _on_floor_changed(floor_num: int) -> void:
<<<<<<< HEAD
	floor_label.text = "Étage %d" % floor_num
=======
	floor_label.text = "Etage %d" % floor_num
>>>>>>> origin/main

func _on_turn_started(is_player: bool) -> void:
	attack_btn.disabled = not is_player
	defend_btn.disabled = not is_player
	item_btn.disabled   = not is_player
	flee_btn.disabled   = not is_player

func _on_attack_btn_pressed() -> void:
	SoundManager.play_sfx("button")
	_combat_manager.player_attack()

func _on_defend_btn_pressed() -> void:
	SoundManager.play_sfx("button")
	_combat_manager.player_defend()

func _on_item_btn_pressed() -> void:
	SoundManager.play_sfx("button")
	if _inventory_popup:
		_inventory_popup.open()

func _on_flee_btn_pressed() -> void:
	SoundManager.play_sfx("button")
	_combat_manager.player_flee()

func _on_watch_ad_btn_pressed() -> void:
	double_loot_panel.hide()
	if _double_loot_callback.is_valid():
		_double_loot_callback.call()

func _on_skip_btn_pressed() -> void:
	double_loot_panel.hide()
	get_parent()._go_to_next_room()
