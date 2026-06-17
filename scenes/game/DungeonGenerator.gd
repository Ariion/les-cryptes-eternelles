class_name DungeonGenerator
extends Node

enum RoomType { ENTRANCE, COMBAT, TREASURE, REST, BOSS }

const ROOMS_PER_FLOOR := 6

var _rng := RandomNumberGenerator.new()

signal dungeon_generated(rooms: Array)

# Pool d'ennemis par palier de difficulté.
const ENEMIES_BY_TIER := {
	1: ["Goblin", "Goblin", "Skeleton"],
	2: ["Goblin", "Skeleton", "Orc", "Spider", "Dark Archer"],
	3: ["Orc", "Spider", "Dark Archer", "Troll", "Vampire"],
	4: ["Troll", "Vampire", "Golem", "Demon"],
}

func generate_floor(floor_number: int) -> Array:
	_rng.randomize()
	var rooms := []

	rooms.append(_make_room(RoomType.ENTRANCE, floor_number))

	var pool := _build_room_pool(floor_number)
	pool.shuffle()
	for type in pool:
		rooms.append(_make_room(type, floor_number))

	rooms.append(_make_room(RoomType.BOSS, floor_number))

	emit_signal("dungeon_generated", rooms)
	return rooms

func _build_room_pool(floor_number: int) -> Array:
	var pool := []
	# 2 combats au premier étage, +1 tous les 2 étages, max 5
	var combat_count := min(5, 2 + (floor_number - 1) / 2)
	var treasure_count := 1 + (1 if floor_number % 3 == 0 else 0)
	var rest_count := max(0, ROOMS_PER_FLOOR - combat_count - treasure_count)

	for i in combat_count:
		pool.append(RoomType.COMBAT)
	for i in treasure_count:
		pool.append(RoomType.TREASURE)
	for i in rest_count:
		pool.append(RoomType.REST)

	return pool

func _make_room(type: RoomType, floor_number: int) -> Dictionary:
	return {
		"type": type,
		"cleared": false,
		"enemies": _generate_enemies(type, floor_number),
		"loot": _generate_loot(type, floor_number),
	}

func _generate_enemies(type: RoomType, floor_number: int) -> Array:
	if type not in [RoomType.COMBAT, RoomType.BOSS]:
		return []

	if type == RoomType.BOSS:
		# Boss + éventuels renforts aux étages élevés
		var minions := []
		if floor_number >= 4:
			var minion_pool := _get_enemy_pool(floor_number)
			minions.append(minion_pool[_rng.randi() % minion_pool.size()])
		return ["Boss"] + minions

	var count := _rng.randi_range(1, 3)
	var pool := _get_enemy_pool(floor_number)
	var enemies := []
	for i in count:
		enemies.append(pool[_rng.randi() % pool.size()])
	return enemies

func _get_enemy_pool(floor_number: int) -> Array:
	var tier := min(4, 1 + (floor_number - 1) / 2)
	return ENEMIES_BY_TIER[tier]

func _generate_loot(type: RoomType, floor_number: int) -> Dictionary:
	match type:
		RoomType.TREASURE:
			var gold := _rng.randi_range(20 + floor_number * 5, 50 + floor_number * 10)
			var is_rare := floor_number >= 3 and _rng.randf() < 0.35
			return {"gold": gold, "item": _random_item(is_rare)}
		RoomType.BOSS:
			var gold := _rng.randi_range(80 + floor_number * 15, 150 + floor_number * 20)
			return {"gold": gold, "item": _random_item(true)}
		RoomType.COMBAT:
			return {"gold": _rng.randi_range(5 + floor_number * 2, 20 + floor_number * 4)}
		_:
			return {}

func _random_item(is_rare: bool = false) -> String:
	return ItemDatabase.get_random_item(is_rare)
