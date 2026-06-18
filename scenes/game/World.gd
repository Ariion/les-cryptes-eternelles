extends Node2D

@onready var dungeon_generator: Node        = $DungeonGenerator
@onready var combat_manager: Node           = $CombatManager
@onready var game_over_screen: CanvasLayer  = $GameOver
@onready var hud: CanvasLayer               = $HUD
@onready var floor_transition: CanvasLayer  = $FloorTransition
@onready var loot_popup: CanvasLayer        = $LootPopup
@onready var inventory_popup: CanvasLayer   = $InventoryPopup
@onready var pause_menu: CanvasLayer        = $PauseMenu
@onready var skills_popup: CanvasLayer      = $SkillsPopup
@onready var enemy_row: Node2D              = $CombatArea/EnemyRow
@onready var player_spot: Node2D            = $CombatArea/PlayerSpot
@onready var dungeon_map_screen: CanvasLayer = $DungeonMap

var player: Node
var dungeon_map: Dictionary = {}

func _ready() -> void:
	player = preload("res://scenes/player/Player.tscn").instantiate()
	player_spot.add_child(player)
	player.player_died.connect(_on_player_died)

	hud.bind_player(player)
	hud.bind_combat_manager(combat_manager)
	hud.set_inventory_popup(inventory_popup)
	hud.set_skills_popup(skills_popup)
	hud.set_pause_menu(pause_menu)
	skills_popup.setup(player)
	skills_popup.skill_selected.connect(_on_skill_selected)
	inventory_popup.setup(player, combat_manager)

	dungeon_map_screen.room_selected.connect(_on_map_room_selected)

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
	dungeon_map = dungeon_generator.generate_map(GameManager.current_floor)
	dungeon_map_screen.setup(dungeon_map)
	_enter_map_node(0)

func _enter_map_node(node_id: int) -> void:
	var node: Dictionary = {}
	for n in dungeon_map["nodes"]:
		if n["id"] == node_id:
			node = n
			break

	dungeon_map["current_node"] = node_id
	var total_layers: int = dungeon_map["layers"].size() - 1
	hud.update_room_info(node["type"], node["layer"], total_layers)
	_clear_enemies()

	match node["type"]:
		DungeonGenerator.RoomType.ENTRANCE:
			_handle_entrance()
		DungeonGenerator.RoomType.COMBAT, DungeonGenerator.RoomType.BOSS:
			_handle_combat_room(node)
		DungeonGenerator.RoomType.TREASURE:
			_handle_treasure_room(node)
		DungeonGenerator.RoomType.REST:
			_handle_rest_room()

func _handle_entrance() -> void:
	hud.show_message("Etage %d — En avant !" % GameManager.current_floor)
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	await get_tree().create_timer(1.2).timeout
	_go_to_map()

func _handle_combat_room(node: Dictionary) -> void:
	if node["cleared"]:
		_go_to_map()
		return

	player.get_node("Body").visible = false

	var is_boss: bool = (node["type"] == DungeonGenerator.RoomType.BOSS)
	if is_boss:
		SoundManager.play_music("boss")

	var enemy_nodes: Array = []
	var enemies_list: Array = node["enemies"]
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
	combat_manager.combat_ended.connect(_on_combat_ended.bind(node), CONNECT_ONE_SHOT)
	combat_manager.start_combat(player, enemy_nodes)

func _handle_treasure_room(node: Dictionary) -> void:
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	var loot: Dictionary = node["loot"]
	var gold: int = int(loot.get("gold", 0))
	var item: String = str(loot.get("item", ""))

	if gold > 0:
		player.collect_gold(gold)
	if item != "":
		player.pick_up_item(item)
	SoundManager.play_sfx("gold")

	loot_popup.show_loot(gold, item, false, func(): _go_to_map())

func _handle_rest_room() -> void:
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	var heal_amount: int = int(int(player.stats.get("max_hp", 100)) * 0.35)
	player.heal(heal_amount)
	hud.show_message("Repos — +%d PV recuperes." % heal_amount)
	await get_tree().create_timer(1.8).timeout
	_go_to_map()

func _on_combat_ended(victory: bool, gold_earned: int, node: Dictionary) -> void:
	hud.show_combat_buttons(false)
	player.get_node("Body").visible = true
	if not victory:
		_on_player_died()
		return

	node["cleared"] = true
	var item_name: String = str(node["loot"].get("item", ""))
	var is_boss: bool = (node["type"] == DungeonGenerator.RoomType.BOSS)

	if item_name != "":
		player.pick_up_item(item_name)
	SoundManager.play_sfx("gold")

	if is_boss:
		loot_popup.show_loot(gold_earned, item_name, true, func():
			GameManager.next_floor()
			floor_transition.play(GameManager.current_floor, _generate_new_floor)
		)
	else:
		loot_popup.show_loot(gold_earned, item_name, false, func(): _go_to_map())

func _go_to_map() -> void:
	var current_id: int = dungeon_map["current_node"]
	var reachable := []
	for edge in dungeon_map["edges"]:
		if edge[0] == current_id:
			reachable.append(edge[1])
	dungeon_map["reachable"] = reachable

	if reachable.is_empty():
		return

	if reachable.size() == 1:
		_enter_map_node(reachable[0])
		return

	dungeon_map_screen.setup(dungeon_map)
	dungeon_map_screen.open()

func _on_map_room_selected(node_id: int) -> void:
	_enter_map_node(node_id)

func _on_skill_selected(skill: Dictionary) -> void:
	combat_manager.player_use_skill(skill)

func _on_player_died() -> void:
	hud.show_combat_buttons(false)
	game_over_screen.show_game_over(player)

func _clear_enemies() -> void:
	for child in enemy_row.get_children():
		child.queue_free()
