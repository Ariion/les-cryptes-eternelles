class_name MonsterDisplay
extends Node2D
## Dessine le monstre entièrement en code — aucun fichier texture requis.
## Utilise uniquement les primitives de dessin de Godot (draw_* dans _draw).

var enemy_type: String = "Goblin"

func setup_type(p_type: String) -> void:
	enemy_type = p_type
	queue_redraw()

func _draw() -> void:
	match enemy_type:
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

# ─── Helpers ────────────────────────────────────────────────────────
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

# ─── GOBELIN ────────────────────────────────────────────────────────
func _draw_goblin() -> void:
	var G  := Color(0.22, 0.58, 0.16)
	var GD := Color(0.13, 0.38, 0.09)
	var YE := Color(1.0,  0.93, 0.0)
	# Jambes
	_ellipse(Vector2(-14, 60), 10, 14, GD)
	_ellipse(Vector2( 14, 60), 10, 14, GD)
	# Corps
	_ellipse(Vector2(0, 22), 28, 32, G)
	# Bras
	_ellipse(Vector2(-38, 18), 10, 20, G)
	_ellipse(Vector2( 38, 18), 10, 20, G)
	# Tête
	_ellipse(Vector2(0, -24), 26, 22, G)
	# Oreilles pointues
	draw_colored_polygon([Vector2(-26,-30), Vector2(-16,-54), Vector2(-8,-22)], GD)
	draw_colored_polygon([Vector2( 26,-30), Vector2( 16,-54), Vector2( 8,-22)], GD)
	# Yeux
	_ellipse(Vector2(-9,-27), 7, 7, YE)
	_ellipse(Vector2( 9,-27), 7, 7, YE)
	_ellipse(Vector2(-9,-27), 3, 4, Color.BLACK)
	_ellipse(Vector2( 9,-27), 3, 4, Color.BLACK)
	# Nez
	_ellipse(Vector2(0, -16), 4, 3, GD)
	# Bouche et dents
	draw_arc(Vector2(0, -8), 12, 0.2, PI - 0.2, 12, Color(0.1,0.2,0.05), 2.5)
	draw_rect(Rect2(-9, -10, 5, 8), Color.WHITE)
	draw_rect(Rect2( 4, -10, 5, 8), Color.WHITE)
	# Dague
	draw_line(Vector2(44, -8), Vector2(40, 28), Color(0.78,0.78,0.82), 4.0)
	draw_line(Vector2(37,  8), Vector2(51, 8), Color(0.5, 0.38, 0.12), 5.0)

# ─── SQUELETTE ──────────────────────────────────────────────────────
func _draw_skeleton() -> void:
	var W  := Color(0.88, 0.88, 0.88)
	var WD := Color(0.65, 0.65, 0.70)
	# Jambes (os)
	draw_line(Vector2(-12, 28), Vector2(-14, 70), W, 8)
	draw_line(Vector2( 12, 28), Vector2( 14, 70), W, 8)
	_ellipse(Vector2(-14, 74), 9, 7, WD)
	_ellipse(Vector2( 14, 74), 9, 7, WD)
	# Bassin
	_ellipse(Vector2(0, 28), 22, 10, WD)
	# Colonne
	draw_line(Vector2(0, 18), Vector2(0, -18), W, 6)
	# Cage thoracique
	_ellipse_outline(Vector2(0, 0), 20, 22, W, 3.0)
	draw_line(Vector2(-18, -8),  Vector2(18, -8),  WD, 2)
	draw_line(Vector2(-18,  2),  Vector2(18,  2),  WD, 2)
	draw_line(Vector2(-18, 12),  Vector2(18, 12),  WD, 2)
	draw_line(Vector2(-16, 18),  Vector2(16, 18),  WD, 2)
	# Bras
	draw_line(Vector2(-20, -14), Vector2(-42, 10), W, 7)
	draw_line(Vector2(-42, 10),  Vector2(-36, 34), W, 6)
	# Bras droit avec épée
	draw_line(Vector2( 20, -14), Vector2( 44, 10), W, 7)
	draw_line(Vector2( 44, 10),  Vector2( 38, 34), W, 6)
	draw_line(Vector2(44, -18),  Vector2(40, 28),  Color(0.75,0.75,0.80), 4)
	draw_line(Vector2(38,  2),   Vector2(52, 2),   Color(0.55,0.45,0.12), 5)
	# Crâne
	_ellipse(Vector2(0, -44), 24, 22, W)
	_ellipse(Vector2(0, -30), 18, 10, WD)
	# Orbites (lueur bleue)
	_ellipse(Vector2(-9, -46), 7, 8, Color(0.08, 0.08, 0.15))
	_ellipse(Vector2( 9, -46), 7, 8, Color(0.08, 0.08, 0.15))
	_ellipse(Vector2(-9, -46), 4, 5, Color(0.4, 0.4, 1.0, 0.85))
	_ellipse(Vector2( 9, -46), 4, 5, Color(0.4, 0.4, 1.0, 0.85))
	# Mâchoire et dents
	draw_line(Vector2(-10, -24), Vector2(10, -24), WD, 3)
	for x in [-8, -2, 4]:
		draw_rect(Rect2(x, -26, 4, 7), W)

# ─── ARAIGNÉE ───────────────────────────────────────────────────────
func _draw_spider() -> void:
	var P  := Color(0.44, 0.18, 0.62)
	var PD := Color(0.28, 0.10, 0.40)
	var R  := Color(1.0,  0.10, 0.10)
	# Pattes (8)
	for i in 4:
		var side := [-1.0, 1.0]
		for s in side:
			var base_x := s * 22.0
			var spread_x := s * (50.0 + i * 8.0)
			var y1 := -20.0 + i * 14.0
			var y2 := y1 - 18.0 + i * 6.0
			draw_line(Vector2(base_x, y1), Vector2(spread_x, y2), PD, 4.5)
			draw_line(Vector2(spread_x, y2), Vector2(spread_x + s*6.0, y2 + 14.0), PD, 3.5)
	# Abdomen
	_ellipse(Vector2(0, 20), 30, 36, PD)
	# Céphalothorax
	_ellipse(Vector2(0, -18), 26, 24, P)
	# Yeux (rouge)
	for pos in [Vector2(-10,-20), Vector2(0,-22), Vector2(10,-20), Vector2(-16,-14), Vector2(16,-14)]:
		_ellipse(pos, 4, 4, R)
		_ellipse(pos, 2, 2, Color(1,0.6,0.6))
	# Crochets
	draw_line(Vector2(-8, -6), Vector2(-14, 4), PD, 5)
	draw_line(Vector2( 8, -6), Vector2( 14, 4), PD, 5)
	# Motif sablier sur l'abdomen
	_ellipse(Vector2(0, 20), 8, 12, Color(1.0, 0.6, 0.0, 0.8))

# ─── ORC ────────────────────────────────────────────────────────────
func _draw_orc() -> void:
	var G  := Color(0.28, 0.56, 0.18)
	var GD := Color(0.18, 0.38, 0.10)
	var BR := Color(0.34, 0.24, 0.08)
	# Bottes
	_ellipse(Vector2(-16, 74), 14, 10, BR)
	_ellipse(Vector2( 16, 74), 14, 10, BR)
	# Jambières
	_ellipse(Vector2(-16, 56), 13, 22, GD)
	_ellipse(Vector2( 16, 56), 13, 22, GD)
	# Corps (large)
	_ellipse(Vector2(0, 20), 38, 40, G)
	# Plastron
	_ellipse(Vector2(0, 14), 28, 30, BR)
	draw_line(Vector2(0, -16), Vector2(0, 42), Color(0.5,0.38,0.12), 2.5)
	draw_line(Vector2(-26, 0), Vector2(26, 0), Color(0.5,0.38,0.12), 2.5)
	# Épaulières
	_ellipse(Vector2(-42, -8), 16, 12, BR)
	_ellipse(Vector2( 42, -8), 16, 12, BR)
	# Bras épais
	_ellipse(Vector2(-44, 18), 14, 28, G)
	_ellipse(Vector2( 44, 18), 14, 28, G)
	# Poings
	_ellipse(Vector2(-44, 48), 12, 10, GD)
	_ellipse(Vector2( 44, 48), 12, 10, GD)
	# Cou
	_ellipse(Vector2(0, -18), 18, 14, G)
	# Tête
	_ellipse(Vector2(0, -44), 34, 28, G)
	# Mohawk
	draw_colored_polygon([Vector2(-10,-70), Vector2(0,-86), Vector2(10,-70), Vector2(6,-56), Vector2(-6,-56)], GD)
	# Yeux rouges
	_ellipse(Vector2(-12,-46), 8, 7, Color(0.85, 0.0, 0.0))
	_ellipse(Vector2( 12,-46), 8, 7, Color(0.85, 0.0, 0.0))
	_ellipse(Vector2(-12,-46), 4, 4, Color.BLACK)
	_ellipse(Vector2( 12,-46), 4, 4, Color.BLACK)
	# Nez plat
	_ellipse(Vector2(0, -34), 6, 4, GD)
	# Défenses
	draw_rect(Rect2(-16, -20, 7, 14), Color.WHITE)
	draw_rect(Rect2(  9, -20, 7, 14), Color.WHITE)
	# Hache
	draw_line(Vector2(56, -22), Vector2(50, 48), BR, 6)
	draw_colored_polygon([Vector2(46,-30), Vector2(72,-12), Vector2(68, 8), Vector2(50, 4)], Color(0.7,0.72,0.75))
	draw_colored_polygon([Vector2(46,-30), Vector2(36,-8),  Vector2(50, 4)], Color(0.6,0.62,0.65))

# ─── ARCHER DES TÉNÈBRES ────────────────────────────────────────────
func _draw_dark_archer() -> void:
	var B  := Color(0.16, 0.22, 0.40)
	var BL := Color(0.26, 0.38, 0.62)
	var GL := Color(0.30, 0.58, 1.0)
	# Jambes
	draw_line(Vector2(-10, 24), Vector2(-12, 68), B, 10)
	draw_line(Vector2( 10, 24), Vector2( 12, 68), B, 10)
	_ellipse(Vector2(-12, 72), 10, 7, BL)
	_ellipse(Vector2( 12, 72), 10, 7, BL)
	# Corps
	_ellipse(Vector2(0, 8), 22, 30, B)
	# Cape
	draw_colored_polygon([Vector2(-22,0), Vector2(22,0), Vector2(28,60), Vector2(-28,60)], Color(0.08,0.10,0.20))
	# Bras
	_ellipse(Vector2(-32, 8), 10, 22, B)
	_ellipse(Vector2( 32, 8), 10, 22, B)
	# Tête/heaume
	_ellipse(Vector2(0, -26), 22, 20, B)
	# Visière lumineuse
	draw_rect(Rect2(-18, -34, 36, 10), Color(0.02,0.04,0.10))
	_ellipse(Vector2(-8,-29), 6, 4, GL)
	_ellipse(Vector2( 8,-29), 6, 4, GL)
	# Arc
	draw_arc(Vector2(-50, 5), 28, -PI*0.6, PI*0.6, 18, BL, 5)
	draw_line(Vector2(-50,-22), Vector2(-50,33), Color(0.70,0.60,0.30), 1.5)
	# Flèche encochée
	draw_line(Vector2(-50, 5), Vector2(40, -6), Color(0.72,0.64,0.32), 2.5)
	draw_colored_polygon([Vector2(40,-6), Vector2(32,-12), Vector2(34,-2)], Color(0.70,0.72,0.76))

# ─── TROLL ──────────────────────────────────────────────────────────
func _draw_troll() -> void:
	var G  := Color(0.35, 0.46, 0.28)
	var GD := Color(0.22, 0.30, 0.16)
	# Pieds énormes
	_ellipse(Vector2(-20, 82), 20, 12, GD)
	_ellipse(Vector2( 20, 82), 20, 12, GD)
	# Jambes courtes et épaisses
	_ellipse(Vector2(-18, 62), 18, 24, G)
	_ellipse(Vector2( 18, 62), 18, 24, G)
	# Corps massif
	_ellipse(Vector2(0, 22), 46, 46, G)
	# Bras (traînent jusqu'en bas)
	_ellipse(Vector2(-54, 30), 14, 36, GD)
	_ellipse(Vector2( 54, 30), 14, 36, GD)
	_ellipse(Vector2(-54, 66), 16, 12, GD)
	_ellipse(Vector2( 54, 66), 16, 12, GD)
	# Tête petite (relative au corps)
	_ellipse(Vector2(0, -30), 30, 26, G)
	# Verrues
	for pos in [Vector2(-18,-22), Vector2(16,-18), Vector2(-6,-8)]:
		_ellipse(pos, 4, 4, GD)
	# Yeux jaune-vert
	_ellipse(Vector2(-10,-32), 8, 7, Color(0.7, 0.9, 0.0))
	_ellipse(Vector2( 10,-32), 8, 7, Color(0.7, 0.9, 0.0))
	_ellipse(Vector2(-10,-32), 4, 4, Color.BLACK)
	_ellipse(Vector2( 10,-32), 4, 4, Color.BLACK)
	# Nez bulbeux
	_ellipse(Vector2(0, -20), 10, 8, GD)
	# Corne sur le nez
	draw_colored_polygon([Vector2(-4,-20), Vector2(4,-20), Vector2(0,-32)], Color(0.75,0.72,0.65))
	# Bouche
	draw_arc(Vector2(0, -12), 16, 0.3, PI-0.3, 10, GD, 4)

# ─── VAMPIRE ────────────────────────────────────────────────────────
func _draw_vampire() -> void:
	var V  := Color(0.28, 0.08, 0.42)
	var VD := Color(0.16, 0.04, 0.24)
	var PK := Color(0.88, 0.60, 0.72)
	# Cape (s'élargit vers le bas)
	draw_colored_polygon([Vector2(-20,-10), Vector2(20,-10), Vector2(40,70), Vector2(-40,70)], VD)
	# Corps
	_ellipse(Vector2(0, 18), 22, 34, V)
	# Bras
	_ellipse(Vector2(-30, 14), 10, 26, V)
	_ellipse(Vector2( 30, 14), 10, 26, V)
	# Mains griffues
	for ox in [-30, 30]:
		draw_line(Vector2(ox, 38), Vector2(ox-6, 52), PK, 3)
		draw_line(Vector2(ox, 38), Vector2(ox,   54), PK, 3)
		draw_line(Vector2(ox, 38), Vector2(ox+6, 52), PK, 3)
	# Tête
	_ellipse(Vector2(0, -26), 22, 20, PK)
	# Cheveux / pic
	draw_colored_polygon([Vector2(-22,-26), Vector2(-14,-60), Vector2(-4,-30)], VD)
	draw_colored_polygon([Vector2( 22,-26), Vector2( 14,-60), Vector2( 4,-30)], VD)
	draw_colored_polygon([Vector2(-6,-40), Vector2(0,-62), Vector2(6,-40)], VD)
	# Yeux (violet incandescent)
	_ellipse(Vector2(-8,-28), 6, 6, Color(0.8, 0.0, 0.9))
	_ellipse(Vector2( 8,-28), 6, 6, Color(0.8, 0.0, 0.9))
	_ellipse(Vector2(-8,-28), 3, 3, Color(1.0, 0.6, 1.0))
	_ellipse(Vector2( 8,-28), 3, 3, Color(1.0, 0.6, 1.0))
	# Sourire avec crocs
	draw_arc(Vector2(0,-16), 10, 0.25, PI-0.25, 10, Color(0.6,0.0,0.2), 2.5)
	draw_rect(Rect2(-6, -18, 4, 8), Color.WHITE)
	draw_rect(Rect2( 2, -18, 4, 8), Color.WHITE)

# ─── GOLEM ──────────────────────────────────────────────────────────
func _draw_golem() -> void:
	var S  := Color(0.52, 0.52, 0.54)
	var SD := Color(0.32, 0.32, 0.34)
	var LG := Color(0.20, 0.80, 0.90, 0.85)
	# Pieds
	draw_rect(Rect2(-28, 64, 24, 18), SD)
	draw_rect(Rect2(  4, 64, 24, 18), SD)
	# Jambes
	draw_rect(Rect2(-24, 30, 20, 38), S)
	draw_rect(Rect2(  4, 30, 20, 38), S)
	# Jointures genoux
	_ellipse(Vector2(-14, 30), 12, 9, SD)
	_ellipse(Vector2( 14, 30), 12, 9, SD)
	# Corps (bloc)
	draw_rect(Rect2(-36, -20, 72, 54), S)
	# Lignes de pierre
	draw_line(Vector2(-36, 10), Vector2(36, 10), SD, 3)
	draw_line(Vector2(-36,-8),  Vector2(36,-8),  SD, 3)
	draw_line(Vector2(0, -20),  Vector2(0, 34),  SD, 3)
	# Bras (blocs)
	draw_rect(Rect2(-60, -16, 24, 44), SD)
	draw_rect(Rect2( 36, -16, 24, 44), SD)
	# Poings
	draw_rect(Rect2(-62, 26, 28, 26), S)
	draw_rect(Rect2( 34, 26, 28, 26), S)
	# Tête (bloc carré)
	draw_rect(Rect2(-28,-58, 56, 42), S)
	# Rune centrale (lueur)
	_ellipse(Vector2(0,-36), 14, 14, Color(0.05,0.08,0.14))
	_ellipse(Vector2(0,-36), 8, 8, LG)
	_ellipse(Vector2(0,-36), 4, 4, Color.WHITE)
	# Yeux (lumière magique)
	_ellipse(Vector2(-12,-40), 7, 6, Color(0.05,0.08,0.14))
	_ellipse(Vector2( 12,-40), 7, 6, Color(0.05,0.08,0.14))
	_ellipse(Vector2(-12,-40), 4, 4, LG)
	_ellipse(Vector2( 12,-40), 4, 4, LG)

# ─── DÉMON ──────────────────────────────────────────────────────────
func _draw_demon() -> void:
	var R  := Color(0.60, 0.06, 0.06)
	var RD := Color(0.38, 0.02, 0.02)
	var OR := Color(1.0,  0.36, 0.0)
	# Queue
	draw_line(Vector2(0,60), Vector2(28,80), RD, 6)
	draw_line(Vector2(28,80), Vector2(36,70), RD, 5)
	draw_colored_polygon([Vector2(34,66), Vector2(44,62), Vector2(40,74)], OR)
	# Jambes
	_ellipse(Vector2(-16, 58), 13, 20, RD)
	_ellipse(Vector2( 16, 58), 13, 20, RD)
	# Sabots
	_ellipse(Vector2(-16, 76), 10, 8, Color.BLACK)
	_ellipse(Vector2( 16, 76), 10, 8, Color.BLACK)
	# Corps
	_ellipse(Vector2(0, 18), 32, 38, R)
	# Ailes (derrière)
	draw_colored_polygon([Vector2(-32,-10), Vector2(-72,-40), Vector2(-58,-2), Vector2(-40, 20)], Color(0.25,0.02,0.02))
	draw_colored_polygon([Vector2( 32,-10), Vector2( 72,-40), Vector2( 58,-2), Vector2( 40, 20)], Color(0.25,0.02,0.02))
	_ellipse_outline(Vector2(-62,-22), 14, 22, Color(0.5,0.02,0.02), 2.5)
	_ellipse_outline(Vector2( 62,-22), 14, 22, Color(0.5,0.02,0.02), 2.5)
	# Bras
	_ellipse(Vector2(-42, 14), 12, 28, RD)
	_ellipse(Vector2( 42, 14), 12, 28, RD)
	# Griffes
	for ox in [-42, 42]:
		var s := -1 if ox < 0 else 1
		draw_line(Vector2(ox, 40), Vector2(ox + s*8, 54), OR, 3.5)
		draw_line(Vector2(ox, 40), Vector2(ox, 56), OR, 3.5)
		draw_line(Vector2(ox, 40), Vector2(ox - s*8, 54), OR, 3.5)
	# Tête
	_ellipse(Vector2(0, -28), 26, 22, R)
	# Cornes
	draw_colored_polygon([Vector2(-22,-38), Vector2(-28,-74), Vector2(-12,-36)], RD)
	draw_colored_polygon([Vector2( 22,-38), Vector2( 28,-74), Vector2( 12,-36)], RD)
	draw_colored_polygon([Vector2(-20,-38), Vector2(-24,-66), Vector2(-10,-36)], OR)
	draw_colored_polygon([Vector2( 20,-38), Vector2( 24,-66), Vector2( 10,-36)], OR)
	# Yeux (feu)
	_ellipse(Vector2(-9,-30), 8, 7, Color(0.05,0.02,0.02))
	_ellipse(Vector2( 9,-30), 8, 7, Color(0.05,0.02,0.02))
	_ellipse(Vector2(-9,-30), 5, 5, OR)
	_ellipse(Vector2( 9,-30), 5, 5, OR)
	_ellipse(Vector2(-9,-30), 2, 2, Color.WHITE)
	_ellipse(Vector2( 9,-30), 2, 2, Color.WHITE)
	# Bouche dentée
	draw_arc(Vector2(0,-18), 12, 0.2, PI-0.2, 10, RD, 3)
	for x in range(-10, 12, 5):
		draw_line(Vector2(x, -18), Vector2(x + 2, -10), OR, 2.5)

# ─── BOSS ───────────────────────────────────────────────────────────
func _draw_boss() -> void:
	var D  := Color(0.08, 0.04, 0.16)
	var P  := Color(0.30, 0.06, 0.56)
	var PP := Color(0.65, 0.14, 0.90)
	var GW := Color(0.88, 0.88, 0.95)
	# Cape longue
	draw_colored_polygon([Vector2(-30,-10), Vector2(30,-10), Vector2(48,86), Vector2(-48,86)], Color(0.04,0.02,0.08))
	# Liseré de cape
	draw_line(Vector2(-30,-10), Vector2(-48,86), PP, 2)
	draw_line(Vector2( 30,-10), Vector2( 48,86), PP, 2)
	# Corps
	_ellipse(Vector2(0, 20), 30, 38, D)
	# Armure runique (chest)
	_ellipse(Vector2(0, 14), 22, 28, Color(0.12,0.06,0.22))
	_ellipse(Vector2(0, 14), 8, 8, PP)
	_ellipse(Vector2(0, 14), 4, 4, Color(0.88,0.44,1.0))
	# Bras + épaulières
	_ellipse(Vector2(-44, -2), 16, 12, Color(0.12,0.06,0.22))
	_ellipse(Vector2( 44, -2), 16, 12, Color(0.12,0.06,0.22))
	_ellipse(Vector2(-44, 20), 13, 30, D)
	_ellipse(Vector2( 44, 20), 13, 30, D)
	# Bâton (gauche)
	draw_line(Vector2(-52, 48), Vector2(-44, -30), P, 6)
	_ellipse(Vector2(-46, -34), 14, 14, D)
	_ellipse(Vector2(-46, -34), 8, 8, PP)
	_ellipse(Vector2(-46, -34), 4, 4, Color(0.88,0.44,1.0, 0.9))
	# Orbe magique (droite)
	_ellipse(Vector2(52, 44), 16, 16, Color(0.12,0.04,0.22))
	_ellipse(Vector2(52, 44), 10, 10, PP)
	_ellipse(Vector2(52, 44), 5, 5, Color(1.0, 0.5, 1.0))
	# Tête + heaume sombre
	_ellipse(Vector2(0, -36), 28, 26, D)
	# Cornes du heaume
	draw_colored_polygon([Vector2(-24,-46), Vector2(-30,-78), Vector2(-16,-44)], Color(0.12,0.06,0.22))
	draw_colored_polygon([Vector2( 24,-46), Vector2( 30,-78), Vector2( 16,-44)], Color(0.12,0.06,0.22))
	# Couronne
	draw_colored_polygon([Vector2(-26,-48), Vector2(-18,-62), Vector2(-10,-50),
		Vector2(0,-66), Vector2(10,-50), Vector2(18,-62), Vector2(26,-48)], P)
	for px in [-18, 0, 18]:
		_ellipse(Vector2(px, -62), 4, 4, PP)
	# Visière sombre
	draw_rect(Rect2(-22,-46, 44, 14), Color(0.02,0.01,0.04))
	# Yeux (lueur violette)
	_ellipse(Vector2(-9,-40), 7, 5, PP)
	_ellipse(Vector2( 9,-40), 7, 5, PP)
	_ellipse(Vector2(-9,-40), 4, 3, Color(1.0, 0.6, 1.0))
	_ellipse(Vector2( 9,-40), 4, 3, Color(1.0, 0.6, 1.0))
	# Aura de particules
	for i in 6:
		var angle := TAU * i / 6
		var r := 68.0 + i * 4.0
		_ellipse(Vector2(cos(angle)*r, sin(angle)*r - 10), 4, 4, Color(0.4, 0.1, 0.7, 0.5))
