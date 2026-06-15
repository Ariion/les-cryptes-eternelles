extends Node2D

@onready var dungeon_generator: Node = $DungeonGenerator
@onready var combat_manager: Node = $CombatManager
@onready var game_over_screen: CanvasLayer = $GameOver
@onready var hud: CanvasLayer = $HUD
@onready var floor_transition: CanvasLayer = $FloorTransition
@onready var loot_popup: CanvasLayer = $LootPopup
@onready var inventory_popup: CanvasLayer = $InventoryPopup
@onready var enemy_row: Node2D = $CombatArea/EnemyRow
@onready var player_spot: Node2D = $CombatArea/PlayerSpot
@onready var room_name_label: Label = $CombatArea/RoomNameLabel

var player: Node
var rooms: Array = []
var current_room_index := 0

func _ready() -> void:
	player = preload("res://scenes/player/Player.tscn").instantiate()
	player_spot.add_child(player)
	player.player_died.connect(_on_player_died)

	hud.bind_player(player)
	hud.bind_combat_manager(combat_manager)
	inventory_popup.setup(player, combat_manager)
	hud.set_inventory_popup(inventory_popup)

	GameManager.start_new_run()
	SoundManager.play_music("menu")
	floor_transition.play(GameManager.current_floor, _generate_new_floor)

func _generate_new_floor() -> void:
	rooms = dungeon_generator.generate_floor(GameManager.current_floor)
	current_room_index = 0
	_enter_room(rooms[0])

func _enter_room(room: Dictionary) -> void:
	hud.update_room_info(room["type"], current_room_index, rooms.size())
	_update_room_label(room["type"])
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
	await get_tree().create_timer(1.2).timeout
	_go_to_next_room()

func _handle_combat_room(room: Dictionary) -> void:
	if room["cleared"]:
		_go_to_next_room()
		return

	var is_boss: bool = (room["type"] == DungeonGenerator.RoomType.BOSS)
	if is_boss:
		SoundManager.play_music("boss")

	var enemy_nodes: Array = []
	var count: int = room["enemies"].size()
	var spacing: float = 90.0
	var start_x: float = -(count - 1) * spacing * 0.5
	for i in range(count):
		var e: EnemyEntity = preload("res://scenes/enemies/Enemy.tscn").instantiate() as EnemyEntity
		e.position = Vector2(start_x + i * spacing, 0)
		enemy_row.add_child(e)
		e.setup(str(room["enemies"][i]), GameManager.current_floor)
		enemy_nodes.append(e)

	hud.update_enemy_display(enemy_nodes)
	hud.show_combat_buttons(true)

	combat_manager.combat_ended.connect(_on_combat_ended.bind(room), CONNECT_ONE_SHOT)
	combat_manager.start_combat(player, enemy_nodes)

func _handle_treasure_room(room: Dictionary) -> void:
	hud.show_combat_buttons(false)
	var loot: Dictionary = room["loot"]
	var gold: int = int(loot.get("gold", 0))
	var item: String = str(loot.get("item", ""))

	if gold > 0:
		player.collect_gold(gold)
	if item != "":
		player.pick_up_item(item)
	SoundManager.play_sfx("gold")

	loot_popup.show_loot(gold, item, false, func():
		_go_to_next_room()
	)

func _handle_rest_room() -> void:
	hud.show_combat_buttons(false)
	var heal_amount: int = int(int(player.stats.get("max_hp", 100)) * 0.3)
	player.heal(heal_amount)
	hud.show_message("Tu te reposes et récupères %d PV." % heal_amount)
	await get_tree().create_timer(1.8).timeout
	_go_to_next_room()

func _on_combat_ended(victory: bool, gold_earned: int, room: Dictionary) -> void:
	hud.show_combat_buttons(false)
	if not victory:
		_on_player_died()
		return

	room["cleared"] = true
	var item_name: String = str(room["loot"].get("item", ""))
	var is_boss: bool = (room["type"] == DungeonGenerator.RoomType.BOSS)

	if item_name != "":
		player.pick_up_item(item_name)
	SoundManager.play_sfx("gold")

	loot_popup.show_loot(gold_earned, item_name, is_boss, func():
		_go_to_next_room()
	)

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

func _update_room_label(type: int) -> void:
	var names := ["Entrée", "Combat", "Trésor", "Repos", "BOSS"]
	room_name_label.text = names[type] if type < names.size() else ""
	room_name_label.modulate = Color(1, 0.4, 0.4) if type == DungeonGenerator.RoomType.BOSS else Color.WHITE
