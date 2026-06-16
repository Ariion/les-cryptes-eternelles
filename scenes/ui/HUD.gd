extends CanvasLayer

@onready var hp_bar: ProgressBar = $Top/HpBar
@onready var hp_label: Label = $Top/HpBar/HpLabel
@onready var gold_label: Label = $Top/GoldLabel
@onready var floor_label: Label = $Top/FloorLabel
@onready var room_label: Label = $Top/RoomLabel

@onready var combat_panel: Panel = $Bottom/CombatPanel
@onready var attack_btn: Button = $Bottom/CombatPanel/Grid/AttackBtn
@onready var defend_btn: Button = $Bottom/CombatPanel/Grid/DefendBtn
@onready var item_btn: Button = $Bottom/CombatPanel/Grid/ItemBtn
@onready var flee_btn: Button = $Bottom/CombatPanel/Grid/FleeBtn

@onready var message_label: Label = $Middle/MessageLabel
@onready var log_container: VBoxContainer = $Middle/LogScroll/LogContainer
@onready var double_loot_panel: Panel = $Middle/DoubleLootPanel
@onready var enemy_container: HBoxContainer = $Middle/EnemyContainer
@onready var status_bar: HBoxContainer = $Top/StatusBar

var _double_loot_callback: Callable
var _combat_manager: Node
var _inventory_popup: CanvasLayer

func _ready() -> void:
	double_loot_panel.hide()
	combat_panel.hide()
	message_label.text = ""
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.floor_changed.connect(_on_floor_changed)
	_on_gold_changed(GameManager.gold)
	_on_floor_changed(GameManager.current_floor)

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
	var names := ["Entrée", "Combat", "Trésor", "Repos", "Boss"]
	room_label.text = names[room_type] if room_type < names.size() else "?"
	floor_label.text = "Étage %d — %d/%d" % [GameManager.current_floor, index + 1, total]
	# Vide le log entre les salles
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

func show_combat_buttons(visible: bool) -> void:
	combat_panel.visible = visible

func update_enemy_display(enemies: Array) -> void:
	for child in enemy_container.get_children():
		child.queue_free()
	for enemy in enemies:
		var col := VBoxContainer.new()
		col.custom_minimum_size = Vector2(80, 0)

		var name_lbl := Label.new()
		name_lbl.text = enemy.enemy_name
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.theme_override_font_sizes_font_size = 12

		var bar := ProgressBar.new()
		bar.max_value = enemy.stats["max_hp"]
		bar.value = enemy.stats["hp"]
		bar.custom_minimum_size = Vector2(80, 12)
		bar.show_percentage = false

		var hp_lbl := Label.new()
		hp_lbl.text = "%d/%d" % [enemy.stats["hp"], enemy.stats["max_hp"]]
		hp_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hp_lbl.theme_override_font_sizes_font_size = 11

		col.add_child(name_lbl)
		col.add_child(bar)
		col.add_child(hp_lbl)
		enemy_container.add_child(col)

		enemy.hp_changed.connect(func(cur, max_hp):
			bar.value = cur
			hp_lbl.text = "%d/%d" % [cur, max_hp]
		)

func _append_log(message: String) -> void:
	var lbl := Label.new()
	lbl.text = message
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	lbl.theme_override_font_sizes_font_size = 13
	log_container.add_child(lbl)
	if log_container.get_child_count() > 7:
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
	# Teinte la barre en rouge si < 25% PV
	var ratio := float(current) / float(maximum)
	hp_bar.modulate = Color(1, ratio * 2, ratio * 2) if ratio < 0.5 else Color.WHITE

func _on_player_hit(damage: int) -> void:
	var overlay := ColorRect.new()
	overlay.color = Color(0.9, 0.1, 0.1, 0.35)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)
	var lbl := Label.new()
	lbl.text = "-%d" % damage
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.set_anchors_preset(Control.PRESET_CENTER)
	lbl.add_theme_font_size_override("font_size", 28)
	lbl.add_theme_color_override("font_color", Color(1, 0.3, 0.3))
	add_child(lbl)
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(overlay, "color:a", 0.0, 0.4)
	tween.tween_property(lbl, "modulate:a", 0.0, 0.4).set_delay(0.15)
	tween.chain().tween_callback(func(): overlay.queue_free(); lbl.queue_free())

func _on_gold_changed(amount: int) -> void:
	gold_label.text = "Or: %d" % amount

func _on_floor_changed(floor: int) -> void:
	floor_label.text = "Étage %d" % floor

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
