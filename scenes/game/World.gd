extends Node2D

@onready var dungeon_generator: Node        = $DungeonGenerator
@onready var combat_manager: Node           = $CombatManager
@onready var game_over_screen: CanvasLayer  = $GameOver
@onready var hud: CanvasLayer               = $HUD
@onready var floor_transition: CanvasLayer  = $FloorTransition
@onready var loot_popup: CanvasLayer        = $LootPopup
@onready var inventory_popup: CanvasLayer   = $InventoryPopup
@onready var pause_menu: CanvasLayer        = $PauseMenu
@onready var enemy_row: Node2D              = $CombatArea/EnemyRow
@onready var player_spot: Node2D            = $CombatArea/PlayerSpot

var player: Node
var rooms: Array = []
var current_room_index := 0

func _ready() -> void:
	player = preload("res://scenes/player/Player.tscn").instantiate()
	player_spot.add_child(player)
	player.player_died.connect(_on_player_died)

	hud.bind_player(player)
	hud.bind_combat_manager(combat_manager)
	hud.set_inventory_popup(inventory_popup)
	hud.set_pause_menu(pause_menu)
	inventory_popup.setup(player, combat_manager)

	GameManager.start_new_run()
	SoundManager.play_music("menu")
	floor_transition.play(GameManager.current_floor, _generate_new_floor)

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and not game_over_screen.visible:
		if pause_menu.visible:
			pause_menu.close()
		else:
			pause_menu.open()

func _generate_new_floor() -> void:
	rooms = dungeon_generator.generate_floor(GameManager.current_floor)
	current_room_index = 0
	_enter_room(rooms[0])

func _enter_room(room: Dictionary) -> void:
	hud.update_room_info(room["type"], current_room_index, rooms.size())
	_clear_enemies()

	match room["type"]:
		DungeonGenerator.RoomType.ENTRANCE:
			_handle_entrance()
		DungeonGenerator.RoomType.COMBAT, DungeonGenerator.RoomType.BOSS:
			_handle_combat_room(room)
		DungeonGenerator.RoomType.TREASURE:
			_handle_treasure_room(room)
		DungeonGenerator.RoomType.REST:
			_handle_rest_room()

func _handle_entrance() -> void:
	hud.show_message("Étage %d — En avant !" % GameManager.current_floor)
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	await get_tree().create_timer(1.2).timeout
	_go_to_next_room()


func _handle_combat_room(room: Dictionary) -> void:
	if room["cleared"]:
		_go_to_next_room()
		return

	player.get_node("Body").visible = false

	var is_boss: bool = (room["type"] == DungeonGenerator.RoomType.BOSS)
	if is_boss:
		SoundManager.play_music("boss")

	var enemy_nodes: Array = []
	var enemies_list: Array = room["enemies"]
	var count: int = enemies_list.size()
	var spacing: float = 120.0
	var start_x: float = -(count - 1) * spacing * 0.5
	for i in range(count):
		var e := preload("res://scenes/enemies/Enemy.tscn").instantiate()
		enemy_row.add_child(e)
		e.position = Vector2(start_x + i * spacing, 0)
		e.setup(str(enemies_list[i]), GameManager.current_floor)
		enemy_nodes.append(e)

	hud.show_combat_buttons(true)
	combat_manager.combat_ended.connect(_on_combat_ended.bind(room), CONNECT_ONE_SHOT)
	combat_manager.start_combat(player, enemy_nodes)

func _handle_treasure_room(room: Dictionary) -> void:
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	var loot: Dictionary = room["loot"]
	var gold: int = int(loot.get("gold", 0))
	var item: String = str(loot.get("item", ""))

	if gold > 0:
		player.collect_gold(gold)
	if item != "":
		player.pick_up_item(item)
	SoundManager.play_sfx("gold")

	loot_popup.show_loot(gold, item, false, func(): _go_to_next_room())

func _handle_rest_room() -> void:
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	var heal_amount: int = int(int(player.stats.get("max_hp", 100)) * 0.35)
	player.heal(heal_amount)
	hud.show_message("Repos — +%d PV récupérés." % heal_amount)
	await get_tree().create_timer(1.8).timeout
	_go_to_next_room()

func _on_combat_ended(victory: bool, gold_earned: int, room: Dictionary) -> void:
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	if not victory:
		_on_player_died()
		return

	room["cleared"] = true
	var item_name: String = str(room["loot"].get("item", ""))
	var is_boss: bool = (room["type"] == DungeonGenerator.RoomType.BOSS)

	if item_name != "":
		player.pick_up_item(item_name)
	SoundManager.play_sfx("gold")

	loot_popup.show_loot(gold_earned, item_name, is_boss, func(): _go_to_next_room())

func _go_to_next_room() -> void:
	current_room_index += 1
	if current_room_index >= rooms.size():
		GameManager.next_floor()
		floor_transition.play(GameManager.current_floor, _generate_new_floor)
	else:
		_enter_room(rooms[current_room_index])

func _on_player_died() -> void:
	hud.show_combat_buttons(false)
	game_over_screen.show_game_over(player)

func _clear_enemies() -> void:
	for child in enemy_row.get_children():
		child.queue_free()
