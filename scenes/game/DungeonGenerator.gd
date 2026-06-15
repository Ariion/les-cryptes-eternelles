class_name DungeonGenerator
extends Node

# Génère une séquence de salles pour un étage complet
# Structure : Entrée → [Salles] → Boss

enum RoomType { ENTRANCE, COMBAT, TREASURE, REST, BOSS }

const ROOMS_PER_FLOOR := 5  # salles entre entrée et boss

var _rng := RandomNumberGenerator.new()

signal dungeon_generated(rooms: Array)

func generate_floor(floor_number: int) -> Array:
	_rng.randomize()
	var rooms := []

	rooms.append(_make_room(RoomType.ENTRANCE))

	# Distribution des salles intermédiaires
	var pool := _build_room_pool(floor_number)
	pool.shuffle()

	for type in pool:
		rooms.append(_make_room(type))

	rooms.append(_make_room(RoomType.BOSS))

	emit_signal("dungeon_generated", rooms)
	return rooms

func _build_room_pool(floor_number: int) -> Array:
	# Plus on avance, plus il y a de salles de combat
	var pool := []
	var combat_count := 2 + floor_number / 2
	var treasure_count := 1
	var rest_count := ROOMS_PER_FLOOR - combat_count - treasure_count

	for i in combat_count:
		pool.append(RoomType.COMBAT)
	for i in treasure_count:
		pool.append(RoomType.TREASURE)
	for i in max(0, rest_count):
		pool.append(RoomType.REST)

	return pool

func _make_room(type: RoomType) -> Dictionary:
	return {
		"type": type,
		"cleared": false,
		"enemies": _generate_enemies(type),
		"loot": _generate_loot(type),
	}

func _generate_enemies(type: RoomType) -> Array:
	if type not in [RoomType.COMBAT, RoomType.BOSS]:
		return []

	var count := 3 if type == RoomType.BOSS else _rng.randi_range(1, 3)
	var enemies := []
	var pool := ["Goblin", "Skeleton", "Orc"] if type != RoomType.BOSS else ["Boss"]

	for i in count:
		enemies.append(pool[_rng.randi() % pool.size()])

	return enemies

func _generate_loot(type: RoomType) -> Dictionary:
	match type:
		RoomType.TREASURE:
			return {"gold": _rng.randi_range(20, 50), "item": _random_item()}
		RoomType.BOSS:
			return {"gold": _rng.randi_range(80, 150), "item": _random_item(true)}
		RoomType.COMBAT:
			return {"gold": _rng.randi_range(5, 20)}
		_:
			return {}

func _random_item(is_rare: bool = false) -> String:
	var common := ["Health Potion", "Iron Sword", "Leather Shield"]
	var rare := ["Flame Sword", "Dragon Shield", "Elixir of Power"]
	var pool := rare if is_rare else common
	return pool[_rng.randi() % pool.size()]
