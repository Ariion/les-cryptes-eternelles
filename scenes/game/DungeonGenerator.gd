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

func generate_map(floor_number: int) -> Dictionary:
	_rng.randomize()
	var nodes := []
	var layers := []
	var edges := []

	# Layer 0: entrance
	var node_id := 0
	var layer0_node := {
		"id": 0,
		"layer": 0,
		"type": RoomType.ENTRANCE,
		"cleared": false,
		"enemies": [],
		"loot": {},
	}
	nodes.append(layer0_node)
	layers.append([0])
	node_id = 1

	# Layers 1-4: 2-3 nodes each
	for layer in range(1, 5):
		var count := _rng.randi_range(2, 3)
		var layer_ids := []
		for _i in range(count):
			var t := _pick_type_for_layer(layer, floor_number)
			var n := {
				"id": node_id,
				"layer": layer,
				"type": t,
				"cleared": false,
				"enemies": _generate_enemies(t, floor_number),
				"loot": _generate_loot(t, floor_number),
			}
			nodes.append(n)
			layer_ids.append(node_id)
			node_id += 1
		layers.append(layer_ids)

	# Layer 5: boss
	var boss_node := {
		"id": node_id,
		"layer": 5,
		"type": RoomType.BOSS,
		"cleared": false,
		"enemies": _generate_enemies(RoomType.BOSS, floor_number),
		"loot": _generate_loot(RoomType.BOSS, floor_number),
	}
	nodes.append(boss_node)
	layers.append([node_id])

	# Edge generation
	for layer in range(0, 5):
		var from_ids: Array = layers[layer]
		var to_ids: Array = layers[layer + 1]

		var to_covered := {}
		for tid in to_ids:
			to_covered[tid] = false

		var edge_set := {}
		for fid in from_ids:
			var shuffled_to := to_ids.duplicate()
			shuffled_to.shuffle()
			var num_connections := _rng.randi_range(1, min(2, to_ids.size()))
			for k in range(num_connections):
				var tid = shuffled_to[k]
				var key = str(fid) + "_" + str(tid)
				if not edge_set.has(key):
					edge_set[key] = true
					edges.append([fid, tid])
					to_covered[tid] = true

		# Ensure all to_ids have at least one incoming edge
		for tid in to_ids:
			if not to_covered[tid]:
				var fid = from_ids[_rng.randi() % from_ids.size()]
				var key = str(fid) + "_" + str(tid)
				if not edge_set.has(key):
					edge_set[key] = true
					edges.append([fid, tid])

	return {
		"nodes": nodes,
		"layers": layers,
		"edges": edges,
		"current_node": 0,
		"reachable": [0],
	}

func _pick_type_for_layer(layer: int, _floor: int) -> RoomType:
	var r := _rng.randf()
	match layer:
		1, 2:
			if r < 0.60:
				return RoomType.COMBAT
			elif r < 0.85:
				return RoomType.TREASURE
			else:
				return RoomType.REST
		3:
			if r < 0.35:
				return RoomType.COMBAT
			elif r < 0.70:
				return RoomType.TREASURE
			else:
				return RoomType.REST
		4:
			if r < 0.45:
				return RoomType.REST
			elif r < 0.80:
				return RoomType.COMBAT
			else:
				return RoomType.TREASURE
	return RoomType.COMBAT

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
