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

	# Layer definitions: 0=entrance, 1-4=middle, 5=boss
	var layer_type_lists: Array = [
		[RoomType.ENTRANCE],
		_random_layer_types(2, 1, floor_number),
		_random_layer_types(3, 2, floor_number),
		_random_layer_types(2, 3, floor_number),
		_random_layer_types(2, 4, floor_number),
		[RoomType.BOSS],
	]

	# Build nodes
	var nodes: Array = []
	var layers: Array = []
	var nid := 0
	for layer_idx in layer_type_lists.size():
		var layer_ids: Array = []
		for type in layer_type_lists[layer_idx]:
			nodes.append({
				"id": nid, "layer": layer_idx, "type": type,
				"cleared": false,
				"enemies": _generate_enemies(type, floor_number),
				"loot": _generate_loot(type, floor_number),
			})
			layer_ids.append(nid)
			nid += 1
		layers.append(layer_ids)

	# Build edges: each node connects to 1-2 nodes in next layer
	var edges: Array = []
	for layer_idx in range(layers.size() - 1):
		var from_ids: Array = layers[layer_idx]
		var to_ids: Array = layers[layer_idx + 1]
		var covered: Dictionary = {}
		for tid in to_ids:
			covered[tid] = false
		for fid in from_ids:
			var shuffled: Array = to_ids.duplicate()
			shuffled.shuffle()
			var cnt := 1 if to_ids.size() == 1 else _rng.randi_range(1, min(2, to_ids.size()))
			for i in cnt:
				var pair := [fid, shuffled[i]]
				if not pair in edges:
					edges.append(pair)
					covered[shuffled[i]] = true
		# Ensure every target has at least one incoming edge
		for tid in covered:
			if not covered[tid]:
				var fid = from_ids[_rng.randi() % from_ids.size()]
				var pair := [fid, tid]
				if not pair in edges:
					edges.append(pair)

	return {
		"nodes": nodes, "layers": layers, "edges": edges,
		"current_node": -1, "reachable": [layers[0][0]],
	}

func _random_layer_types(count: int, layer: int, floor_number: int) -> Array:
	var out: Array = []
	for i in count:
		out.append(_pick_room_type_for_layer(layer))
	return out

func _pick_room_type_for_layer(layer: int) -> RoomType:
	var r := _rng.randf()
	match layer:
		1, 2:
			return RoomType.COMBAT if r < 0.60 else (RoomType.TREASURE if r < 0.85 else RoomType.REST)
		3:
			return RoomType.COMBAT if r < 0.35 else (RoomType.TREASURE if r < 0.70 else RoomType.REST)
		4:
			return RoomType.REST if r < 0.45 else (RoomType.COMBAT if r < 0.80 else RoomType.TREASURE)
		_:
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
			return {"gold": gold, "item": _random_item(is_rare), "material": "", "material_qty": 0}
		RoomType.BOSS:
			var gold := _rng.randi_range(80 + floor_number * 15, 150 + floor_number * 20)
			return {"gold": gold, "item": _random_item(true), "material": "Essence de boss", "material_qty": 1}
		RoomType.COMBAT:
			var gold := _rng.randi_range(5 + floor_number * 2, 20 + floor_number * 4)
			var mat := ""
			var mat_qty := 0
			if _rng.randf() < 0.40:
				mat = _random_material(floor_number)
				mat_qty = 1
			return {"gold": gold, "material": mat, "material_qty": mat_qty}
		_:
			return {"material": "", "material_qty": 0}

func _random_material(floor_number: int) -> String:
	var tier := min(4, 1 + (floor_number - 1) / 2)
	var r := _rng.randf()
	match tier:
		1, 2:
			return "Minerai de fer" if r < 0.60 else "Cuir tanne"
		3:
			if r < 0.40:
				return "Cristal magique"
			elif r < 0.75:
				return "Minerai de fer"
			else:
				return "Cuir tanne"
		4:
			return "Ecaille de dragon" if r < 0.50 else "Cristal magique"
		_:
			return "Minerai de fer"

func _random_item(is_rare: bool = false) -> String:
	return ItemDatabase.get_random_item(is_rare)
