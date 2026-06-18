extends CanvasLayer

signal room_selected(node_id: int)

var _map_data: Dictionary = {}
var _node_positions: Dictionary = {}
var _added_nodes: Array = []

const ROOM_LABELS := ["Entree", "Combat", "Tresor", "Repos", "BOSS"]
const ROOM_ABBR   := ["E",      "C",      "T",      "R",     "B"]
const ROOM_COLORS := [
	Color(0.50, 0.50, 0.55),
	Color(0.85, 0.22, 0.22),
	Color(0.85, 0.68, 0.10),
	Color(0.18, 0.72, 0.38),
	Color(1.00, 0.38, 0.00),
]

func setup(map_data: Dictionary) -> void:
	_map_data = map_data

func open() -> void:
	_rebuild()
	show()

func close() -> void:
	hide()

func _ready() -> void:
	hide()

# ─── Layout ───────────────────────────────────────────────────────────────────

func _compute_positions() -> void:
	_node_positions.clear()
	var layers: Array = _map_data.get("layers", [])
	var total: int = layers.size()
	if total < 2:
		return
	var top_y    := 90.0
	var bottom_y := 770.0
	for layer_idx in total:
		var ids: Array = layers[layer_idx]
		var count: int = ids.size()
		var t: float = layer_idx / float(total - 1)
		var y: float = bottom_y - t * (bottom_y - top_y)
		for i in count:
			var x: float
			match count:
				1: x = 195.0
				2: x = 110.0 + i * 170.0
				_: x = 75.0  + i * 120.0
			_node_positions[ids[i]] = Vector2(x, y)

# ─── Build ────────────────────────────────────────────────────────────────────

func _rebuild() -> void:
	for n in _added_nodes:
		if is_instance_valid(n):
			n.queue_free()
	_added_nodes.clear()

	var bg := ColorRect.new()
	bg.color = Color(0.04, 0.02, 0.08, 0.96)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	_spawn(bg)

	var title := Label.new()
	title.text = "Carte du Donjon  —  Etage %d" % GameManager.current_floor
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", Color(0.95, 0.78, 0.25))
	title.set_anchors_preset(Control.PRESET_TOP_WIDE)
	title.offset_top  = 16.0
	title.offset_bottom = 52.0
	_spawn(title)

	if _map_data.is_empty():
		return

	_compute_positions()

	var current_id: int = int(_map_data.get("current_node", -1))
	var reachable: Array = _map_data.get("reachable", [])
	var nodes: Array    = _map_data.get("nodes", [])
	var edges: Array    = _map_data.get("edges", [])

	# Edges (Line2D — rendered first so buttons appear on top)
	for edge in edges:
		var fid: int = edge[0]
		var tid: int = edge[1]
		if not (_node_positions.has(fid) and _node_positions.has(tid)):
			continue
		var line := Line2D.new()
		line.width = 3.0
		var is_active: bool = tid in reachable
		line.default_color = Color(0.70, 0.62, 0.32, 0.80) if is_active else Color(0.30, 0.30, 0.30, 0.45)
		line.add_point(_node_positions[fid])
		line.add_point(_node_positions[tid])
		_spawn(line)

	# Room nodes
	for node in nodes:
		var nid: int  = int(node["id"])
		if not _node_positions.has(nid):
			continue
		var pos: Vector2  = _node_positions[nid]
		var type: int     = int(node["type"])
		var cleared: bool = bool(node.get("cleared", false))
		var is_cur: bool  = nid == current_id
		var reachable_and_not_cleared: bool = (nid in reachable) and not cleared
		_add_room_node(nid, pos, type, cleared, is_cur, reachable_and_not_cleared)

func _add_room_node(nid: int, pos: Vector2, type: int, cleared: bool, is_cur: bool, clickable: bool) -> void:
	const R := 28.0

	# Glow for current / reachable
	if is_cur or clickable:
		var glow_color := Color(1.0, 0.85, 0.2, 0.18) if is_cur else Color(0.9, 0.9, 0.9, 0.10)
		var glow := _make_circle_panel(pos, R + 10.0, glow_color, Color(0, 0, 0, 0))
		glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_spawn(glow)

	# Pick color
	var base_col: Color = ROOM_COLORS[type] if type < ROOM_COLORS.size() else Color.WHITE
	if cleared:
		base_col = Color(base_col.r * 0.35, base_col.g * 0.35, base_col.b * 0.35, 0.55)
	elif not clickable and not is_cur:
		base_col = Color(0.20, 0.20, 0.25, 0.80)

	var border_col := Color(1.0, 0.9, 0.3, 0.9) if is_cur else (Color(1, 1, 1, 0.55) if clickable else Color(0.25, 0.25, 0.25, 0.6))

	if clickable:
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(R * 2, R * 2)
		btn.position = pos - Vector2(R, R)
		var sty := _make_circle_style(R, base_col, border_col)
		btn.add_theme_stylebox_override("normal",   sty)
		btn.add_theme_stylebox_override("hover",    _make_circle_style(R, base_col.lightened(0.15), border_col))
		btn.add_theme_stylebox_override("pressed",  _make_circle_style(R, base_col.darkened(0.15), border_col))
		btn.add_theme_stylebox_override("disabled", sty)
		var lbl := Label.new()
		lbl.text = ROOM_ABBR[type] if type < ROOM_ABBR.size() else "?"
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.vertical_alignment   = VERTICAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 18)
		lbl.set_anchors_preset(Control.PRESET_FULL_RECT)
		lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		btn.add_child(lbl)
		var captured := nid
		btn.pressed.connect(func(): emit_signal("room_selected", captured); close())
		_spawn(btn)
	else:
		var panel := _make_circle_panel(pos, R, base_col, border_col)
		panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var lbl := Label.new()
		var abbr: String = "v" if cleared else (ROOM_ABBR[type] if type < ROOM_ABBR.size() else "?")
		lbl.text = abbr
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.vertical_alignment   = VERTICAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 18)
		lbl.add_theme_color_override("font_color", Color(0.55, 0.55, 0.55) if (not is_cur and not clickable) else Color.WHITE)
		lbl.set_anchors_preset(Control.PRESET_FULL_RECT)
		lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		panel.add_child(lbl)
		_spawn(panel)

	# Label below node
	var name_lbl := Label.new()
	name_lbl.text = "OK" if cleared else (ROOM_LABELS[type] if type < ROOM_LABELS.size() else "?")
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.add_theme_font_size_override("font_size", 11)
	var lbl_col: Color
	if is_cur:
		lbl_col = Color(1.0, 0.9, 0.3)
	elif cleared:
		lbl_col = Color(0.4, 0.4, 0.4)
	elif clickable:
		lbl_col = Color(0.85, 0.85, 0.85)
	else:
		lbl_col = Color(0.45, 0.45, 0.45)
	name_lbl.add_theme_color_override("font_color", lbl_col)
	name_lbl.position = pos + Vector2(-40.0, R + 2.0)
	name_lbl.custom_minimum_size = Vector2(80, 18)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_spawn(name_lbl)

# ─── Helpers ──────────────────────────────────────────────────────────────────

func _make_circle_style(r: float, bg: Color, border: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	var ri := int(r)
	s.corner_radius_top_left     = ri
	s.corner_radius_top_right    = ri
	s.corner_radius_bottom_left  = ri
	s.corner_radius_bottom_right = ri
	s.bg_color       = bg
	s.border_width_left   = 2
	s.border_width_top    = 2
	s.border_width_right  = 2
	s.border_width_bottom = 2
	s.border_color = border
	return s

func _make_circle_panel(pos: Vector2, r: float, bg: Color, border: Color) -> Panel:
	var p := Panel.new()
	p.custom_minimum_size = Vector2(r * 2, r * 2)
	p.position = pos - Vector2(r, r)
	p.add_theme_stylebox_override("panel", _make_circle_style(r, bg, border))
	return p

func _spawn(node: Node) -> void:
	add_child(node)
	_added_nodes.append(node)
