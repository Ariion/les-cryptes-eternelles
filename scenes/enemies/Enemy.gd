class_name EnemyEntity
extends Node2D

var enemy_name: String = ""
var stats := {}
var status_effects: Array = []

signal hp_changed(current: int, maximum: int)
signal enemy_died(loot_gold: int)
signal status_applied(effect: StatusEffect)

# ─── Données des ennemis ─────────────────────────────────────────────
# sprite  : clé vers la texture ext_resource de la scène
# color   : modulation de couleur pour différencier les types
# scale   : échelle supplémentaire du sprite (1.0 = par défaut)
const ENEMY_DATA := {
	# ─ Palier 1 (étages 1-2)
	"Goblin":      {"max_hp": 60,  "attack": 7,  "defense": 2,  "gold": 12,  "abilities": ["poison_dart"]},
	"Skeleton":    {"max_hp": 90,  "attack": 11, "defense": 4,  "gold": 18,  "abilities": ["weaken"]},
	# ─ Palier 2 (étages 2-4)
	"Spider":      {"max_hp": 55,  "attack": 10, "defense": 1,  "gold": 15,  "abilities": ["poison_dart", "poison_dart"]},
	"Dark Archer": {"max_hp": 75,  "attack": 15, "defense": 2,  "gold": 22,  "abilities": ["weaken", "poison_dart"]},
	"Orc":         {"max_hp": 140, "attack": 14, "defense": 6,  "gold": 28,  "abilities": ["stun_strike"]},
	# ─ Palier 3 (étages 4-6)
	"Troll":       {"max_hp": 200, "attack": 17, "defense": 9,  "gold": 36,  "abilities": ["regen", "stun_strike"]},
	"Vampire":     {"max_hp": 130, "attack": 20, "defense": 6,  "gold": 44,  "abilities": ["regen", "weaken"]},
	# ─ Palier 4 (étages 6+)
	"Golem":       {"max_hp": 280, "attack": 18, "defense": 15, "gold": 55,  "abilities": ["stun_strike", "defend"]},
	"Demon":       {"max_hp": 170, "attack": 26, "defense": 8,  "gold": 60,  "abilities": ["poison_dart", "stun_strike", "weaken"]},
	# ─ Boss
	"Boss":        {"max_hp": 380, "attack": 22, "defense": 10, "gold": 120, "abilities": ["regen", "stun_strike", "weaken"]},
}

const _DMG_SCRIPT := preload("res://scenes/ui/DamageNumber.gd")

func _ready() -> void:
	queue_redraw()

func _process(_delta: float) -> void:
	queue_redraw()
	if enemy_name != "":
		var lbl = get_node_or_null("NameLabel")
		if lbl and lbl.text != enemy_name:
			lbl.text = enemy_name

func setup(p_name: String, floor_number: int) -> void:
	enemy_name = p_name
	var data: Dictionary = ENEMY_DATA.get(p_name, ENEMY_DATA["Goblin"])

	var base: Dictionary = data.duplicate()
	var difficulty: float = 1.0 + (floor_number - 1) * 0.15
	stats = {
		"hp":        int(int(base.get("max_hp", 30)) * difficulty),
		"max_hp":    int(int(base.get("max_hp", 30)) * difficulty),
		"attack":    int(int(base.get("attack", 8))  * difficulty),
		"defense":   int(int(base.get("defense", 2)) * difficulty),
		"gold":      int(int(base.get("gold", 10))   * difficulty),
		"abilities": base.get("abilities", []),
	}
	var lbl = get_node_or_null("NameLabel")
	if lbl:
		lbl.text = p_name
	var bar = get_node_or_null("HpBar")
	if bar:
		bar.offset_right = 54.0

func take_damage(amount: int, is_crit: bool = false) -> void:
	var reduced: int = max(1, amount - int(stats.get("defense", 0)) - _get_shield_bonus())
	stats["hp"] = max(0, int(stats.get("hp", 0)) - reduced)
	GameManager.run_stats["damage_dealt"] += reduced
	_spawn_damage_number(reduced, is_crit)
	var ratio: float = float(int(stats.get("hp", 0))) / float(max(1, int(stats.get("max_hp", 1))))
	var hp_bar = get_node_or_null("HpBar")
	if hp_bar:
		hp_bar.offset_right = -54.0 + 108.0 * ratio
	emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))
	if int(stats.get("hp", 0)) == 0:
		emit_signal("enemy_died", int(stats.get("gold", 0)))

func _spawn_damage_number(amount: int, is_crit: bool) -> void:
	var node := Node2D.new()
	node.set_script(_DMG_SCRIPT)
	get_parent().add_child(node)
	node.global_position = global_position + Vector2(0, -80)
	node.show_damage(amount, is_crit)

func choose_action() -> Dictionary:
	if is_stunned():
		return {"type": "stunned"}

	var hp_ratio: float = float(int(stats.get("hp", 0))) / float(max(1, int(stats.get("max_hp", 1))))
	var abilities: Array = stats.get("abilities", [])

	if abilities.has("regen") and hp_ratio < 0.45 and randf() < 0.35:
		return {"type": "regen", "value": int(int(stats.get("max_hp", 100)) * 0.08)}

	if not abilities.is_empty() and randf() < 0.28:
		var ability: String = str(abilities[randi() % abilities.size()])
		match ability:
			"poison_dart":
				return {"type": "ability", "ability": "poison_dart",
						"status": StatusEffect.create(StatusEffect.Type.POISON, 3, 6)}
			"weaken":
				return {"type": "ability", "ability": "weaken",
						"status": StatusEffect.create(StatusEffect.Type.WEAKNESS, 2, 4)}
			"stun_strike":
				return {"type": "ability", "ability": "stun_strike",
						"status": StatusEffect.create(StatusEffect.Type.STUN, 1, 0),
						"damage": max(1, int(int(stats.get("attack", 10)) * 0.7))}

	if randf() < 0.15:
		return {"type": "defend", "shield": StatusEffect.create(StatusEffect.Type.SHIELD, 1, 5)}

	return {"type": "attack", "value": max(1, int(stats.get("attack", 8)) + randi_range(-2, 2))}

func apply_status(effect: StatusEffect) -> void:
	for existing in status_effects:
		var e: StatusEffect = existing as StatusEffect
		if e.type == effect.type:
			e.duration = effect.duration
			return
	status_effects.append(effect)
	emit_signal("status_applied", effect)

func process_status_effects() -> Array:
	var messages: Array = []
	var to_remove: Array = []
	for item in status_effects:
		var effect: StatusEffect = item as StatusEffect
		var delta: int = effect.tick()
		if delta < 0:
			take_damage(-delta)
			messages.append("%s subit %d dégâts (%s)" % [enemy_name, -delta, effect.label])
		elif delta > 0:
			stats["hp"] = min(int(stats.get("max_hp", 100)), int(stats.get("hp", 0)) + delta)
			emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))
			messages.append("%s récupère %d PV" % [enemy_name, delta])
		if effect.is_expired():
			to_remove.append(effect)
	for e in to_remove:
		status_effects.erase(e)
	return messages

func is_alive() -> bool:
	return int(stats.get("hp", 0)) > 0

func is_stunned() -> bool:
	for item in status_effects:
		var e: StatusEffect = item as StatusEffect
		if e.type == StatusEffect.Type.STUN:
			return true
	return false

func _get_shield_bonus() -> int:
	for item in status_effects:
		var e: StatusEffect = item as StatusEffect
		if e.type == StatusEffect.Type.SHIELD:
			return e.value
	return 0

# ─── Dessin du monstre (primitives Godot, aucune texture) ───────────
func _draw() -> void:
	match enemy_name:
		"Goblin":      _draw_goblin()
		"Skeleton":    _draw_skeleton()
		"Spider":      _draw_spider()
		"Orc":         _draw_orc()
		"Dark Archer": _draw_dark_archer()
		"Troll":       _draw_troll()
		"Vampire":     _draw_vampire()
		"Golem":       _draw_golem()
		"Demon":       _draw_demon()
		"Boss":        _draw_boss()
		_:             _draw_goblin()

func _ellipse(c: Vector2, rx: float, ry: float, col: Color, n: int = 28) -> void:
	var pts := PackedVector2Array()
	for i in n:
		var a := TAU * i / n
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, col)

func _ellipse_outline(c: Vector2, rx: float, ry: float, col: Color, w: float = 2.5, n: int = 28) -> void:
	var pts := PackedVector2Array()
	for i in n + 1:
		var a := TAU * i / n
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_polyline(pts, col, w)

func _draw_goblin() -> void:
	var G  := Color(0.22, 0.58, 0.16)
	var GD := Color(0.13, 0.38, 0.09)
	var YE := Color(1.0,  0.93, 0.0)
	_ellipse(Vector2(-14, 60), 10, 14, GD)
	_ellipse(Vector2( 14, 60), 10, 14, GD)
	_ellipse(Vector2(0, 22), 28, 32, G)
	_ellipse(Vector2(-38, 18), 10, 20, G)
	_ellipse(Vector2( 38, 18), 10, 20, G)
	_ellipse(Vector2(0, -24), 26, 22, G)
	draw_colored_polygon([Vector2(-26,-30), Vector2(-16,-54), Vector2(-8,-22)], GD)
	draw_colored_polygon([Vector2( 26,-30), Vector2( 16,-54), Vector2( 8,-22)], GD)
	_ellipse(Vector2(-9,-27), 7, 7, YE)
	_ellipse(Vector2( 9,-27), 7, 7, YE)
	_ellipse(Vector2(-9,-27), 3, 4, Color.BLACK)
	_ellipse(Vector2( 9,-27), 3, 4, Color.BLACK)
	_ellipse(Vector2(0, -16), 4, 3, GD)
	draw_arc(Vector2(0, -8), 12, 0.2, PI - 0.2, 12, Color(0.1,0.2,0.05), 2.5)
	draw_rect(Rect2(-9, -10, 5, 8), Color.WHITE)
	draw_rect(Rect2( 4, -10, 5, 8), Color.WHITE)
	draw_line(Vector2(44, -8), Vector2(40, 28), Color(0.78,0.78,0.82), 4.0)
	draw_line(Vector2(37,  8), Vector2(51, 8), Color(0.5, 0.38, 0.12), 5.0)

func _draw_skeleton() -> void:
	var W  := Color(0.88, 0.88, 0.88)
	var WD := Color(0.65, 0.65, 0.70)
	draw_line(Vector2(-12, 28), Vector2(-14, 70), W, 8)
	draw_line(Vector2( 12, 28), Vector2( 14, 70), W, 8)
	_ellipse(Vector2(-14, 74), 9, 7, WD)
	_ellipse(Vector2( 14, 74), 9, 7, WD)
	_ellipse(Vector2(0, 28), 22, 10, WD)
	draw_line(Vector2(0, 18), Vector2(0, -18), W, 6)
	_ellipse_outline(Vector2(0, 0), 20, 22, W, 3.0)
	draw_line(Vector2(-18, -8),  Vector2(18, -8),  WD, 2)
	draw_line(Vector2(-18,  2),  Vector2(18,  2),  WD, 2)
	draw_line(Vector2(-18, 12),  Vector2(18, 12),  WD, 2)
	draw_line(Vector2(-16, 18),  Vector2(16, 18),  WD, 2)
	draw_line(Vector2(-20, -14), Vector2(-42, 10), W, 7)
	draw_line(Vector2(-42, 10),  Vector2(-36, 34), W, 6)
	draw_line(Vector2( 20, -14), Vector2( 44, 10), W, 7)
	draw_line(Vector2( 44, 10),  Vector2( 38, 34), W, 6)
	draw_line(Vector2(44, -18),  Vector2(40, 28),  Color(0.75,0.75,0.80), 4)
	draw_line(Vector2(38,  2),   Vector2(52, 2),   Color(0.55,0.45,0.12), 5)
	_ellipse(Vector2(0, -44), 24, 22, W)
	_ellipse(Vector2(0, -30), 18, 10, WD)
	_ellipse(Vector2(-9, -46), 7, 8, Color(0.08, 0.08, 0.15))
	_ellipse(Vector2( 9, -46), 7, 8, Color(0.08, 0.08, 0.15))
	_ellipse(Vector2(-9, -46), 4, 5, Color(0.4, 0.4, 1.0, 0.85))
	_ellipse(Vector2( 9, -46), 4, 5, Color(0.4, 0.4, 1.0, 0.85))
	draw_line(Vector2(-10, -24), Vector2(10, -24), WD, 3)
	for x in [-8, -2, 4]:
		draw_rect(Rect2(x, -26, 4, 7), W)

func _draw_spider() -> void:
	var P  := Color(0.44, 0.18, 0.62)
	var PD := Color(0.28, 0.10, 0.40)
	var R  := Color(1.0,  0.10, 0.10)
	for i in 4:
		var side := [-1.0, 1.0]
		for s in side:
			var base_x := s * 22.0
			var spread_x := s * (50.0 + i * 8.0)
			var y1 := -20.0 + i * 14.0
			var y2 := y1 - 18.0 + i * 6.0
			draw_line(Vector2(base_x, y1), Vector2(spread_x, y2), PD, 4.5)
			draw_line(Vector2(spread_x, y2), Vector2(spread_x + s*6.0, y2 + 14.0), PD, 3.5)
	_ellipse(Vector2(0, 20), 30, 36, PD)
	_ellipse(Vector2(0, -18), 26, 24, P)
	for pos in [Vector2(-10,-20), Vector2(0,-22), Vector2(10,-20), Vector2(-16,-14), Vector2(16,-14)]:
		_ellipse(pos, 4, 4, R)
		_ellipse(pos, 2, 2, Color(1,0.6,0.6))
	draw_line(Vector2(-8, -6), Vector2(-14, 4), PD, 5)
	draw_line(Vector2( 8, -6), Vector2( 14, 4), PD, 5)
	_ellipse(Vector2(0, 20), 8, 12, Color(1.0, 0.6, 0.0, 0.8))

func _draw_orc() -> void:
	var G  := Color(0.28, 0.56, 0.18)
	var GD := Color(0.18, 0.38, 0.10)
	var BR := Color(0.34, 0.24, 0.08)
	_ellipse(Vector2(-16, 74), 14, 10, BR)
	_ellipse(Vector2( 16, 74), 14, 10, BR)
	_ellipse(Vector2(-16, 56), 13, 22, GD)
	_ellipse(Vector2( 16, 56), 13, 22, GD)
	_ellipse(Vector2(0, 20), 38, 40, G)
	_ellipse(Vector2(0, 14), 28, 30, BR)
	draw_line(Vector2(0, -16), Vector2(0, 42), Color(0.5,0.38,0.12), 2.5)
	draw_line(Vector2(-26, 0), Vector2(26, 0), Color(0.5,0.38,0.12), 2.5)
	_ellipse(Vector2(-42, -8), 16, 12, BR)
	_ellipse(Vector2( 42, -8), 16, 12, BR)
	_ellipse(Vector2(-44, 18), 14, 28, G)
	_ellipse(Vector2( 44, 18), 14, 28, G)
	_ellipse(Vector2(-44, 48), 12, 10, GD)
	_ellipse(Vector2( 44, 48), 12, 10, GD)
	_ellipse(Vector2(0, -18), 18, 14, G)
	_ellipse(Vector2(0, -44), 34, 28, G)
	draw_colored_polygon([Vector2(-10,-70), Vector2(0,-86), Vector2(10,-70), Vector2(6,-56), Vector2(-6,-56)], GD)
	_ellipse(Vector2(-12,-46), 8, 7, Color(0.85, 0.0, 0.0))
	_ellipse(Vector2( 12,-46), 8, 7, Color(0.85, 0.0, 0.0))
	_ellipse(Vector2(-12,-46), 4, 4, Color.BLACK)
	_ellipse(Vector2( 12,-46), 4, 4, Color.BLACK)
	_ellipse(Vector2(0, -34), 6, 4, GD)
	draw_rect(Rect2(-16, -20, 7, 14), Color.WHITE)
	draw_rect(Rect2(  9, -20, 7, 14), Color.WHITE)
	draw_line(Vector2(56, -22), Vector2(50, 48), BR, 6)
	draw_colored_polygon([Vector2(46,-30), Vector2(72,-12), Vector2(68, 8), Vector2(50, 4)], Color(0.7,0.72,0.75))
	draw_colored_polygon([Vector2(46,-30), Vector2(36,-8),  Vector2(50, 4)], Color(0.6,0.62,0.65))

func _draw_dark_archer() -> void:
	var B  := Color(0.16, 0.22, 0.40)
	var BL := Color(0.26, 0.38, 0.62)
	var GL := Color(0.30, 0.58, 1.0)
	draw_line(Vector2(-10, 24), Vector2(-12, 68), B, 10)
	draw_line(Vector2( 10, 24), Vector2( 12, 68), B, 10)
	_ellipse(Vector2(-12, 72), 10, 7, BL)
	_ellipse(Vector2( 12, 72), 10, 7, BL)
	_ellipse(Vector2(0, 8), 22, 30, B)
	draw_colored_polygon([Vector2(-22,0), Vector2(22,0), Vector2(28,60), Vector2(-28,60)], Color(0.08,0.10,0.20))
	_ellipse(Vector2(-32, 8), 10, 22, B)
	_ellipse(Vector2( 32, 8), 10, 22, B)
	_ellipse(Vector2(0, -26), 22, 20, B)
	draw_rect(Rect2(-18, -34, 36, 10), Color(0.02,0.04,0.10))
	_ellipse(Vector2(-8,-29), 6, 4, GL)
	_ellipse(Vector2( 8,-29), 6, 4, GL)
	draw_arc(Vector2(-50, 5), 28, -PI*0.6, PI*0.6, 18, BL, 5)
	draw_line(Vector2(-50,-22), Vector2(-50,33), Color(0.70,0.60,0.30), 1.5)
	draw_line(Vector2(-50, 5), Vector2(40, -6), Color(0.72,0.64,0.32), 2.5)
	draw_colored_polygon([Vector2(40,-6), Vector2(32,-12), Vector2(34,-2)], Color(0.70,0.72,0.76))

func _draw_troll() -> void:
	var G  := Color(0.35, 0.46, 0.28)
	var GD := Color(0.22, 0.30, 0.16)
	_ellipse(Vector2(-20, 82), 20, 12, GD)
	_ellipse(Vector2( 20, 82), 20, 12, GD)
	_ellipse(Vector2(-18, 62), 18, 24, G)
	_ellipse(Vector2( 18, 62), 18, 24, G)
	_ellipse(Vector2(0, 22), 46, 46, G)
	_ellipse(Vector2(-54, 30), 14, 36, GD)
	_ellipse(Vector2( 54, 30), 14, 36, GD)
	_ellipse(Vector2(-54, 66), 16, 12, GD)
	_ellipse(Vector2( 54, 66), 16, 12, GD)
	_ellipse(Vector2(0, -30), 30, 26, G)
	for pos in [Vector2(-18,-22), Vector2(16,-18), Vector2(-6,-8)]:
		_ellipse(pos, 4, 4, GD)
	_ellipse(Vector2(-10,-32), 8, 7, Color(0.7, 0.9, 0.0))
	_ellipse(Vector2( 10,-32), 8, 7, Color(0.7, 0.9, 0.0))
	_ellipse(Vector2(-10,-32), 4, 4, Color.BLACK)
	_ellipse(Vector2( 10,-32), 4, 4, Color.BLACK)
	_ellipse(Vector2(0, -20), 10, 8, GD)
	draw_colored_polygon([Vector2(-4,-20), Vector2(4,-20), Vector2(0,-32)], Color(0.75,0.72,0.65))
	draw_arc(Vector2(0, -12), 16, 0.3, PI-0.3, 10, GD, 4)

func _draw_vampire() -> void:
	var V  := Color(0.28, 0.08, 0.42)
	var VD := Color(0.16, 0.04, 0.24)
	var PK := Color(0.88, 0.60, 0.72)
	draw_colored_polygon([Vector2(-20,-10), Vector2(20,-10), Vector2(40,70), Vector2(-40,70)], VD)
	_ellipse(Vector2(0, 18), 22, 34, V)
	_ellipse(Vector2(-30, 14), 10, 26, V)
	_ellipse(Vector2( 30, 14), 10, 26, V)
	for ox in [-30, 30]:
		draw_line(Vector2(ox, 38), Vector2(ox-6, 52), PK, 3)
		draw_line(Vector2(ox, 38), Vector2(ox,   54), PK, 3)
		draw_line(Vector2(ox, 38), Vector2(ox+6, 52), PK, 3)
	_ellipse(Vector2(0, -26), 22, 20, PK)
	draw_colored_polygon([Vector2(-22,-26), Vector2(-14,-60), Vector2(-4,-30)], VD)
	draw_colored_polygon([Vector2( 22,-26), Vector2( 14,-60), Vector2( 4,-30)], VD)
	draw_colored_polygon([Vector2(-6,-40), Vector2(0,-62), Vector2(6,-40)], VD)
	_ellipse(Vector2(-8,-28), 6, 6, Color(0.8, 0.0, 0.9))
	_ellipse(Vector2( 8,-28), 6, 6, Color(0.8, 0.0, 0.9))
	_ellipse(Vector2(-8,-28), 3, 3, Color(1.0, 0.6, 1.0))
	_ellipse(Vector2( 8,-28), 3, 3, Color(1.0, 0.6, 1.0))
	draw_arc(Vector2(0,-16), 10, 0.25, PI-0.25, 10, Color(0.6,0.0,0.2), 2.5)
	draw_rect(Rect2(-6, -18, 4, 8), Color.WHITE)
	draw_rect(Rect2( 2, -18, 4, 8), Color.WHITE)

func _draw_golem() -> void:
	var S  := Color(0.52, 0.52, 0.54)
	var SD := Color(0.32, 0.32, 0.34)
	var LG := Color(0.20, 0.80, 0.90, 0.85)
	draw_rect(Rect2(-28, 64, 24, 18), SD)
	draw_rect(Rect2(  4, 64, 24, 18), SD)
	draw_rect(Rect2(-24, 30, 20, 38), S)
	draw_rect(Rect2(  4, 30, 20, 38), S)
	_ellipse(Vector2(-14, 30), 12, 9, SD)
	_ellipse(Vector2( 14, 30), 12, 9, SD)
	draw_rect(Rect2(-36, -20, 72, 54), S)
	draw_line(Vector2(-36, 10), Vector2(36, 10), SD, 3)
	draw_line(Vector2(-36,-8),  Vector2(36,-8),  SD, 3)
	draw_line(Vector2(0, -20),  Vector2(0, 34),  SD, 3)
	draw_rect(Rect2(-60, -16, 24, 44), SD)
	draw_rect(Rect2( 36, -16, 24, 44), SD)
	draw_rect(Rect2(-62, 26, 28, 26), S)
	draw_rect(Rect2( 34, 26, 28, 26), S)
	draw_rect(Rect2(-28,-58, 56, 42), S)
	_ellipse(Vector2(0,-36), 14, 14, Color(0.05,0.08,0.14))
	_ellipse(Vector2(0,-36), 8, 8, LG)
	_ellipse(Vector2(0,-36), 4, 4, Color.WHITE)
	_ellipse(Vector2(-12,-40), 7, 6, Color(0.05,0.08,0.14))
	_ellipse(Vector2( 12,-40), 7, 6, Color(0.05,0.08,0.14))
	_ellipse(Vector2(-12,-40), 4, 4, LG)
	_ellipse(Vector2( 12,-40), 4, 4, LG)

func _draw_demon() -> void:
	var R  := Color(0.60, 0.06, 0.06)
	var RD := Color(0.38, 0.02, 0.02)
	var OR := Color(1.0,  0.36, 0.0)
	draw_line(Vector2(0,60), Vector2(28,80), RD, 6)
	draw_line(Vector2(28,80), Vector2(36,70), RD, 5)
	draw_colored_polygon([Vector2(34,66), Vector2(44,62), Vector2(40,74)], OR)
	_ellipse(Vector2(-16, 58), 13, 20, RD)
	_ellipse(Vector2( 16, 58), 13, 20, RD)
	_ellipse(Vector2(-16, 76), 10, 8, Color.BLACK)
	_ellipse(Vector2( 16, 76), 10, 8, Color.BLACK)
	_ellipse(Vector2(0, 18), 32, 38, R)
	draw_colored_polygon([Vector2(-32,-10), Vector2(-72,-40), Vector2(-58,-2), Vector2(-40, 20)], Color(0.25,0.02,0.02))
	draw_colored_polygon([Vector2( 32,-10), Vector2( 72,-40), Vector2( 58,-2), Vector2( 40, 20)], Color(0.25,0.02,0.02))
	_ellipse_outline(Vector2(-62,-22), 14, 22, Color(0.5,0.02,0.02), 2.5)
	_ellipse_outline(Vector2( 62,-22), 14, 22, Color(0.5,0.02,0.02), 2.5)
	_ellipse(Vector2(-42, 14), 12, 28, RD)
	_ellipse(Vector2( 42, 14), 12, 28, RD)
	for ox in [-42, 42]:
		var s := -1 if ox < 0 else 1
		draw_line(Vector2(ox, 40), Vector2(ox + s*8, 54), OR, 3.5)
		draw_line(Vector2(ox, 40), Vector2(ox, 56), OR, 3.5)
		draw_line(Vector2(ox, 40), Vector2(ox - s*8, 54), OR, 3.5)
	_ellipse(Vector2(0, -28), 26, 22, R)
	draw_colored_polygon([Vector2(-22,-38), Vector2(-28,-74), Vector2(-12,-36)], RD)
	draw_colored_polygon([Vector2( 22,-38), Vector2( 28,-74), Vector2( 12,-36)], RD)
	draw_colored_polygon([Vector2(-20,-38), Vector2(-24,-66), Vector2(-10,-36)], OR)
	draw_colored_polygon([Vector2( 20,-38), Vector2( 24,-66), Vector2( 10,-36)], OR)
	_ellipse(Vector2(-9,-30), 8, 7, Color(0.05,0.02,0.02))
	_ellipse(Vector2( 9,-30), 8, 7, Color(0.05,0.02,0.02))
	_ellipse(Vector2(-9,-30), 5, 5, OR)
	_ellipse(Vector2( 9,-30), 5, 5, OR)
	_ellipse(Vector2(-9,-30), 2, 2, Color.WHITE)
	_ellipse(Vector2( 9,-30), 2, 2, Color.WHITE)
	draw_arc(Vector2(0,-18), 12, 0.2, PI-0.2, 10, RD, 3)
	for x in range(-10, 12, 5):
		draw_line(Vector2(x, -18), Vector2(x + 2, -10), OR, 2.5)

func _draw_boss() -> void:
	var D  := Color(0.08, 0.04, 0.16)
	var P  := Color(0.30, 0.06, 0.56)
	var PP := Color(0.65, 0.14, 0.90)
	draw_colored_polygon([Vector2(-30,-10), Vector2(30,-10), Vector2(48,86), Vector2(-48,86)], Color(0.04,0.02,0.08))
	draw_line(Vector2(-30,-10), Vector2(-48,86), PP, 2)
	draw_line(Vector2( 30,-10), Vector2( 48,86), PP, 2)
	_ellipse(Vector2(0, 20), 30, 38, D)
	_ellipse(Vector2(0, 14), 22, 28, Color(0.12,0.06,0.22))
	_ellipse(Vector2(0, 14), 8, 8, PP)
	_ellipse(Vector2(0, 14), 4, 4, Color(0.88,0.44,1.0))
	_ellipse(Vector2(-44, -2), 16, 12, Color(0.12,0.06,0.22))
	_ellipse(Vector2( 44, -2), 16, 12, Color(0.12,0.06,0.22))
	_ellipse(Vector2(-44, 20), 13, 30, D)
	_ellipse(Vector2( 44, 20), 13, 30, D)
	draw_line(Vector2(-52, 48), Vector2(-44, -30), P, 6)
	_ellipse(Vector2(-46, -34), 14, 14, D)
	_ellipse(Vector2(-46, -34), 8, 8, PP)
	_ellipse(Vector2(-46, -34), 4, 4, Color(0.88,0.44,1.0, 0.9))
	_ellipse(Vector2(52, 44), 16, 16, Color(0.12,0.04,0.22))
	_ellipse(Vector2(52, 44), 10, 10, PP)
	_ellipse(Vector2(52, 44), 5, 5, Color(1.0, 0.5, 1.0))
	_ellipse(Vector2(0, -36), 28, 26, D)
	draw_colored_polygon([Vector2(-24,-46), Vector2(-30,-78), Vector2(-16,-44)], Color(0.12,0.06,0.22))
	draw_colored_polygon([Vector2( 24,-46), Vector2( 30,-78), Vector2( 16,-44)], Color(0.12,0.06,0.22))
	draw_colored_polygon([Vector2(-26,-48), Vector2(-18,-62), Vector2(-10,-50),
		Vector2(0,-66), Vector2(10,-50), Vector2(18,-62), Vector2(26,-48)], P)
	for px in [-18, 0, 18]:
		_ellipse(Vector2(px, -62), 4, 4, PP)
	draw_rect(Rect2(-22,-46, 44, 14), Color(0.02,0.01,0.04))
	_ellipse(Vector2(-9,-40), 7, 5, PP)
	_ellipse(Vector2( 9,-40), 7, 5, PP)
	_ellipse(Vector2(-9,-40), 4, 3, Color(1.0, 0.6, 1.0))
	_ellipse(Vector2( 9,-40), 4, 3, Color(1.0, 0.6, 1.0))
	for i in 6:
		var angle := TAU * i / 6
		var r := 68.0 + i * 4.0
		_ellipse(Vector2(cos(angle)*r, sin(angle)*r - 10), 4, 4, Color(0.4, 0.1, 0.7, 0.5))
