class_name EnemyEntity
extends Node

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

func setup(p_name: String, floor_number: int) -> void:
	enemy_name = p_name
	var data: Dictionary = ENEMY_DATA.get(p_name, ENEMY_DATA["Goblin"])

	if has_node("Display"):
		$Display.setup_type(p_name)

	if has_node("NameLabel"):
		$NameLabel.text = p_name

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

func take_damage(amount: int, is_crit: bool = false) -> void:
	var reduced: int = max(1, amount - int(stats.get("defense", 0)) - _get_shield_bonus())
	stats["hp"] = max(0, int(stats.get("hp", 0)) - reduced)
	GameManager.run_stats["damage_dealt"] += reduced
	_spawn_damage_number(reduced, is_crit)
	if has_node("HpBar"):
		var ratio: float = float(int(stats.get("hp", 0))) / float(max(1, int(stats.get("max_hp", 1))))
		$HpBar.offset_right = -54.0 + 108.0 * ratio
	emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))
	if int(stats.get("hp", 0)) == 0:
		emit_signal("enemy_died", int(stats.get("gold", 0)))

func _spawn_damage_number(amount: int, is_crit: bool) -> void:
	var node := Node2D.new()
	node.set_script(_DMG_SCRIPT)
	get_parent().add_child(node)
	node.global_position = (self as Node2D).global_position + Vector2(0, -80)
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
