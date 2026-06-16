extends CanvasLayer
## Interface de jeu. Toute l'apparence (boutons, panneaux, barres) vient du
## thème global défini dans l'autoload GameTheme — ce script ne fait que de
## la logique : brancher les signaux et mettre à jour les textes.

@onready var hp_bar: ProgressBar      = $Top/HBox/HpBar
@onready var hp_label: Label          = $Top/HBox/HpBar/HpLabel
@onready var gold_label: Label        = $Top/HBox/GoldLabel
@onready var floor_label: Label       = $Top/HBox/FloorLabel
@onready var status_bar: HBoxContainer = $Top/HBox/StatusBar
@onready var room_label: Label        = $RoomBar/RoomLabel
@onready var message_label: Label     = $MessageLabel
@onready var log_panel: Panel         = $LogPanel
@onready var log_scroll: ScrollContainer = $LogPanel/LogScroll
@onready var log_container: VBoxContainer = $LogPanel/LogScroll/LogContainer
@onready var double_loot_panel: Panel = $DoubleLootPanel
@onready var combat_panel: Panel      = $Bottom
@onready var attack_btn: Button       = $Bottom/Grid/AttackBtn
@onready var defend_btn: Button       = $Bottom/Grid/DefendBtn
@onready var item_btn: Button         = $Bottom/Grid/ItemBtn
@onready var flee_btn: Button         = $Bottom/Grid/FleeBtn

const ROOM_NAMES := ["Entrée", "Combat", "Trésor", "Repos", "BOSS"]

var _double_loot_callback: Callable
var _combat_manager: Node
var _inventory_popup: CanvasLayer

func _ready() -> void:
	double_loot_panel.hide()
	combat_panel.hide()
	log_panel.hide()
	message_label.text = ""
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.floor_changed.connect(_on_floor_changed)
	_on_gold_changed(GameManager.gold)
	_on_floor_changed(GameManager.current_floor)

# ─────────────────────────── Branchements ───────────────────────────
func bind_player(player: Node) -> void:
	player.hp_changed.connect(_on_hp_changed)
	player.player_hit.connect(_on_player_hit)
	player.status_applied.connect(_on_status_applied)
	player.status_removed.connect(_on_status_removed)
	_on_hp_changed(int(player.stats["hp"]), int(player.stats["max_hp"]))

func bind_combat_manager(cm: Node) -> void:
	_combat_manager = cm
	cm.combat_log.connect(_append_log)
	cm.turn_started.connect(_on_turn_started)

func set_inventory_popup(popup: CanvasLayer) -> void:
	_inventory_popup = popup

# ─────────────────────────── Salles & messages ──────────────────────
func update_room_info(room_type: int, index: int, total: int) -> void:
	var is_boss := room_type == DungeonGenerator.RoomType.BOSS
	room_label.text = ROOM_NAMES[room_type] if room_type < ROOM_NAMES.size() else "?"
	room_label.add_theme_color_override("font_color",
		Color(1.0, 0.4, 0.4) if is_boss else Color(0.85, 0.78, 1.0))
	floor_label.text = "Étage %d   %d/%d" % [GameManager.current_floor, index + 1, total]
	for child in log_container.get_children():
		child.queue_free()

func show_message(text: String) -> void:
	message_label.text = text
	message_label.modulate.a = 1.0
	var tween := create_tween()
	tween.tween_interval(2.0)
	tween.tween_property(message_label, "modulate:a", 0.0, 0.5)

func show_combat_buttons(visible: bool) -> void:
	combat_panel.visible = visible
	log_panel.visible = visible

func show_double_loot_offer(gold_amount: int, callback: Callable) -> void:
	_double_loot_callback = callback
	double_loot_panel.get_node("VBox/Label").text = "Doubler les %d or ?" % gold_amount
	double_loot_panel.show()

# ─────────────────────────── Journal de combat ──────────────────────
func _append_log(message: String) -> void:
	var lbl := Label.new()
	lbl.text = "›  " + message
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	lbl.add_theme_font_size_override("font_size", 13)
	lbl.add_theme_color_override("font_color", Color(0.86, 0.82, 0.74))
	log_container.add_child(lbl)
	while log_container.get_child_count() > 8:
		log_container.get_child(0).free()
	await get_tree().process_frame
	log_scroll.scroll_vertical = int(log_scroll.get_v_scroll_bar().max_value)

# ─────────────────────────── Statuts du joueur ──────────────────────
func _on_status_applied(effect: StatusEffect) -> void:
	var chip := Label.new()
	chip.name = "status_%d" % effect.type
	chip.text = StatusEffect.get_icon(effect.type)
	chip.tooltip_text = effect.get_description()
	chip.add_theme_font_size_override("font_size", 11)
	chip.add_theme_color_override("font_color", StatusEffect.get_color(effect.type))
	status_bar.add_child(chip)

func _on_status_removed(effect: StatusEffect) -> void:
	var node := status_bar.get_node_or_null("status_%d" % effect.type)
	if node:
		node.queue_free()

# ─────────────────────────── PV du joueur ───────────────────────────
func _on_hp_changed(current: int, maximum: int) -> void:
	hp_bar.max_value = maximum
	hp_bar.value = current
	hp_label.text = "%d / %d" % [current, maximum]
	var ratio := float(current) / float(max(1, maximum))
	hp_bar.modulate = Color(1, 1, 1) if ratio > 0.3 else Color(1.0, 0.55, 0.55)

func _on_player_hit(damage: int) -> void:
	# Flash rouge plein écran + chiffre des dégâts subis.
	var flash := ColorRect.new()
	flash.color = Color(0.8, 0.05, 0.05, 0.28)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(flash)

	var lbl := Label.new()
	lbl.text = "-%d" % damage
	lbl.set_anchors_preset(Control.PRESET_CENTER)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", 40)
	lbl.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	lbl.position = Vector2(-40, -60)
	add_child(lbl)

	var tw := create_tween().set_parallel(true)
	tw.tween_property(flash, "color:a", 0.0, 0.5)
	tw.tween_property(lbl, "position:y", lbl.position.y - 36, 0.6).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(lbl, "modulate:a", 0.0, 0.6).set_delay(0.2)
	tw.chain().tween_callback(func() -> void:
		flash.queue_free()
		lbl.queue_free())

# ─────────────────────────── Or / étage ─────────────────────────────
func _on_gold_changed(amount: int) -> void:
	gold_label.text = "Or : %d" % amount

func _on_floor_changed(floor_num: int) -> void:
	floor_label.text = "Étage %d" % floor_num

# ─────────────────────────── Tour de jeu ────────────────────────────
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
