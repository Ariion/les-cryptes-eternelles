extends CanvasLayer

@onready var hp_bar: ProgressBar = $Top/HBox/HpBar
@onready var hp_label: Label = $Top/HBox/HpBar/HpLabel
@onready var gold_label: Label = $Top/HBox/GoldLabel
@onready var floor_label: Label = $Top/HBox/FloorLabel

@onready var bottom_panel: Panel = $Bottom
@onready var attack_btn: Button = $Bottom/Grid/AttackBtn
@onready var defend_btn: Button = $Bottom/Grid/DefendBtn
@onready var item_btn: Button = $Bottom/Grid/ItemBtn
@onready var flee_btn: Button = $Bottom/Grid/FleeBtn

@onready var message_label: Label = $Middle/MessageLabel
@onready var log_container: VBoxContainer = $Middle/LogScroll/LogContainer
@onready var double_loot_panel: Panel = $Middle/DoubleLootPanel
@onready var enemy_container: HBoxContainer = $Middle/EnemyContainer
@onready var status_bar: HBoxContainer = $Top/HBox/StatusBar

var _double_loot_callback: Callable
var _combat_manager: Node
var _inventory_popup: CanvasLayer

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

func bind_player(player: Node) -> void:
	player.hp_changed.connect(_on_hp_changed)
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
	floor_label.text = "Etage %d  %d/%d" % [GameManager.current_floor, index + 1, total]
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
		col.custom_minimum_size = Vector2(72, 0)

		var name_lbl := Label.new()
		name_lbl.text = enemy.enemy_name
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.add_theme_font_size_override("font_size", 12)
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

func _append_log(message: String) -> void:
	var lbl := Label.new()
	lbl.text = message
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	lbl.add_theme_font_size_override("font_size", 13)
	lbl.add_theme_color_override("font_color", Color(0.85, 0.85, 0.95))
	log_container.add_child(lbl)
	if log_container.get_child_count() > 8:
		log_container.get_child(0).queue_free()

func _on_status_applied(effect: StatusEffect) -> void:
	var lbl := Label.new()
	lbl.name = "status_%d" % effect.type
	lbl.text = StatusEffect.get_icon(effect.type)
	lbl.tooltip_text = effect.get_description()
	status_bar.add_child(lbl)

func _on_status_removed(effect: StatusEffect) -> void:
	var node := status_bar.get_node_or_null("status_%d" % effect.type)
	if node:
		node.queue_free()

func _on_hp_changed(current: int, maximum: int) -> void:
	hp_bar.max_value = maximum
	hp_bar.value = current
	hp_label.text = "%d / %d" % [current, maximum]
	var ratio := float(current) / float(maximum)
	var fill := StyleBoxFlat.new()
	fill.set_corner_radius_all(4)
	fill.bg_color = Color(0.8, 0.15, 0.15) if ratio > 0.25 else Color(0.95, 0.05, 0.05)
	hp_bar.add_theme_stylebox_override("fill", fill)

func _on_gold_changed(amount: int) -> void:
	gold_label.text = "Or: %d" % amount

func _on_floor_changed(floor_num: int) -> void:
	floor_label.text = "Etage %d" % floor_num

func _on_turn_started(is_player: bool) -> void:
	attack_btn.disabled = not is_player
	defend_btn.disabled = not is_player
	item_btn.disabled = not is_player
	flee_btn.disabled = not is_player

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
