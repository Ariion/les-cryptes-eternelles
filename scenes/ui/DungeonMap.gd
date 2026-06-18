extends CanvasLayer

signal room_selected(node_id: int)

const ROOM_COLORS := {
	0: Color(0.5, 0.5, 0.5),          # ENTRANCE - gray
	1: Color(0.85, 0.22, 0.22),       # COMBAT - red
	2: Color(0.85, 0.68, 0.1),        # TREASURE - gold
	3: Color(0.18, 0.72, 0.38),       # REST - green
	4: Color(1.0, 0.38, 0.0),         # BOSS - orange
}

const ROOM_LABELS := {
	0: "E",
	1: "C",
	2: "T",
	3: "R",
	4: "B",
}

const ROOM_NAMES := {
	0: "Entree",
	1: "Combat",
	2: "Tresor",
	3: "Repos",
	4: "BOSS",
}

const LAYER_Y := {
	0: 760.0,
	1: 632.0,
	2: 504.0,
	3: 376.0,
	4: 248.0,
	5: 80.0,
}

const X_BY_COUNT := {
	1: [195.0],
	2: [120.0, 270.0],
	3: [85.0, 195.0, 305.0],
}

const NODE_RADIUS := 28.0
const VIEWPORT_W := 390.0

var _map_data: Dictionary = {}
var _node_positions: Dictionary = {}  # node_id -> Vector2
var _added_nodes: Array = []

func setup(map_data: Dictionary) -> void:
	_map_data = map_data

func open() -> void:
	_rebuild()
	show()

func close() -> void:
	hide()

func _rebuild() -> void:
	# Clear previously added children
	for child in _added_nodes:
		if is_instance_valid(child):
			child.queue_free()
	_added_nodes.clear()
	_node_positions.clear()

	if _map_data.is_empty():
		return

	var floor_num: int = 1
	if GameManager.has_method("get") or "current_floor" in GameManager:
		floor_num = GameManager.current_floor

	# Background
	var bg := ColorRect.new()
	bg.color = Color(0.0, 0.0, 0.0, 0.82)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	_added_nodes.append(bg)

	# Title
	var title := Label.new()
	title.text = "Carte du Donjon — Etage %d" % floor_num
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_TOP_WIDE)
	title.position = Vector2(0, 10)
	title.size = Vector2(VIEWPORT_W, 40)
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", Color.WHITE)
	add_child(title)
	_added_nodes.append(title)

	# Compute node positions
	var layers: Array = _map_data["layers"]
	for layer_idx in range(layers.size()):
		var ids: Array = layers[layer_idx]
		var y: float = LAYER_Y.get(layer_idx, 400.0)
		var xs: Array = X_BY_COUNT.get(ids.size(), [VIEWPORT_W * 0.5])
		for i in range(ids.size()):
			_node_positions[ids[i]] = Vector2(xs[i], y)

	# Draw edges as Line2D
	for edge in _map_data["edges"]:
		var from_id: int = edge[0]
		var to_id: int = edge[1]
		if not _node_positions.has(from_id) or not _node_positions.has(to_id):
			continue
		var line := Line2D.new()
		line.add_point(_node_positions[from_id])
		line.add_point(_node_positions[to_id])
		line.width = 2.0
		line.default_color = Color(0.6, 0.6, 0.6, 0.7)
		add_child(line)
		_added_nodes.append(line)

	# Draw room nodes
	var current_id: int = _map_data.get("current_node", 0)
	var reachable: Array = _map_data.get("reachable", [])

	for node in _map_data["nodes"]:
		var nid: int = node["id"]
		var ntype: int = node["type"]
		var pos: Vector2 = _node_positions.get(nid, Vector2(195, 422))
		var color: Color = ROOM_COLORS.get(ntype, Color.GRAY)
		var is_reachable: bool = nid in reachable
		var is_current: bool = nid == current_id

		if is_reachable and not is_current:
			# Clickable button
			var btn := Button.new()
			btn.custom_minimum_size = Vector2(NODE_RADIUS * 2, NODE_RADIUS * 2)
			btn.position = pos - Vector2(NODE_RADIUS, NODE_RADIUS)
			btn.text = ROOM_LABELS.get(ntype, "?")

			var style_normal := StyleBoxFlat.new()
			style_normal.bg_color = color
			style_normal.corner_radius_top_left = int(NODE_RADIUS)
			style_normal.corner_radius_top_right = int(NODE_RADIUS)
			style_normal.corner_radius_bottom_left = int(NODE_RADIUS)
			style_normal.corner_radius_bottom_right = int(NODE_RADIUS)
			style_normal.border_width_left = 3
			style_normal.border_width_right = 3
			style_normal.border_width_top = 3
			style_normal.border_width_bottom = 3
			style_normal.border_color = Color.WHITE
			btn.add_theme_stylebox_override("normal", style_normal)

			var style_hover := style_normal.duplicate()
			style_hover.border_color = Color.YELLOW
			btn.add_theme_stylebox_override("hover", style_hover)

			btn.add_theme_color_override("font_color", Color.WHITE)
			btn.add_theme_font_size_override("font_size", 16)

			var captured_id := nid
			btn.pressed.connect(func(): _on_room_pressed(captured_id))
			add_child(btn)
			_added_nodes.append(btn)
		else:
			# Non-clickable panel
			var panel := Panel.new()
			panel.custom_minimum_size = Vector2(NODE_RADIUS * 2, NODE_RADIUS * 2)
			panel.position = pos - Vector2(NODE_RADIUS, NODE_RADIUS)

			var style := StyleBoxFlat.new()
			if is_current:
				style.bg_color = color
				style.border_width_left = 4
				style.border_width_right = 4
				style.border_width_top = 4
				style.border_width_bottom = 4
				style.border_color = Color.YELLOW
			else:
				style.bg_color = Color(color.r * 0.4, color.g * 0.4, color.b * 0.4, 0.6)
				style.border_width_left = 1
				style.border_width_right = 1
				style.border_width_top = 1
				style.border_width_bottom = 1
				style.border_color = Color(0.4, 0.4, 0.4)
			style.corner_radius_top_left = int(NODE_RADIUS)
			style.corner_radius_top_right = int(NODE_RADIUS)
			style.corner_radius_bottom_left = int(NODE_RADIUS)
			style.corner_radius_bottom_right = int(NODE_RADIUS)
			panel.add_theme_stylebox_override("panel", style)

			# Label inside
			var inner_lbl := Label.new()
			inner_lbl.text = ROOM_LABELS.get(ntype, "?")
			inner_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			inner_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			inner_lbl.set_anchors_preset(Control.PRESET_FULL_RECT)
			inner_lbl.add_theme_color_override("font_color", Color.WHITE if is_current else Color(0.6, 0.6, 0.6))
			inner_lbl.add_theme_font_size_override("font_size", 16)
			panel.add_child(inner_lbl)

			add_child(panel)
			_added_nodes.append(panel)

		# Room name label below node
		var name_lbl := Label.new()
		name_lbl.text = ROOM_NAMES.get(ntype, "")
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.position = pos + Vector2(-40, NODE_RADIUS + 2)
		name_lbl.size = Vector2(80, 20)
		name_lbl.add_theme_font_size_override("font_size", 11)
		name_lbl.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85) if (is_reachable or is_current) else Color(0.45, 0.45, 0.45))
		add_child(name_lbl)
		_added_nodes.append(name_lbl)

func _on_room_pressed(node_id: int) -> void:
	emit_signal("room_selected", node_id)
	close()
