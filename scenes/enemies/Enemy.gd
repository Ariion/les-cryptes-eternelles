class_name EnemyEntity
extends Node

var enemy_name: String = ""
var stats := {}
var status_effects: Array = []

signal hp_changed(current: int, maximum: int)
signal enemy_died(loot_gold: int)
signal status_applied(effect: StatusEffect)

const ENEMY_DATA := {
	"Goblin":   {"max_hp": 30,  "attack": 8,  "defense": 2,  "gold": 10,  "abilities": ["poison_dart"]},
	"Skeleton": {"max_hp": 45,  "attack": 12, "defense": 4,  "gold": 15,  "abilities": ["weaken"]},
	"Orc":      {"max_hp": 70,  "attack": 15, "defense": 6,  "gold": 25,  "abilities": ["stun_strike"]},
	"Boss":     {"max_hp": 200, "attack": 25, "defense": 10, "gold": 100, "abilities": ["regen", "stun_strike", "weaken"]},
}

const SPRITE_PATHS := {
	"Goblin":   "res://assets/sprites/goblin.svg",
	"Skeleton": "res://assets/sprites/skeleton.svg",
	"Orc":      "res://assets/sprites/orc.svg",
	"Boss":     "res://assets/sprites/boss.svg",
}

func setup(p_name: String, floor_number: int) -> void:
	enemy_name = p_name
	if has_node("Body"):
		var sprite_path: String = SPRITE_PATHS.get(p_name, SPRITE_PATHS["Goblin"])
		$Body.texture = load(sprite_path)
	var base: Dictionary = (ENEMY_DATA.get(p_name, ENEMY_DATA["Goblin"]) as Dictionary).duplicate()
	var scale: float = 1.0 + (floor_number - 1) * 0.15
	stats = {
		"hp":        int(int(base.get("max_hp", 30)) * scale),
		"max_hp":    int(int(base.get("max_hp", 30)) * scale),
		"attack":    int(int(base.get("attack", 8))  * scale),
		"defense":   int(int(base.get("defense", 2)) * scale),
		"gold":      int(int(base.get("gold", 10))   * scale),
		"abilities": base.get("abilities", []),
	}

func take_damage(amount: int) -> void:
	var reduced: int = max(1, amount - int(stats.get("defense", 0)) - _get_shield_bonus())
	stats["hp"] = max(0, int(stats.get("hp", 0)) - reduced)
	if has_node("HpBar"):
		var ratio: float = float(int(stats.get("hp", 0))) / float(int(stats.get("max_hp", 1)))
		$HpBar.scale.x = ratio
	emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))
	if int(stats.get("hp", 0)) == 0:
		emit_signal("enemy_died", int(stats.get("gold", 0)))

func choose_action() -> Dictionary:
	if is_stunned():
		return {"type": "stunned"}

	var hp_ratio: float = float(int(stats.get("hp", 0))) / float(max(1, int(stats.get("max_hp", 1))))
	var abilities: Array = stats.get("abilities", [])

	if abilities.has("regen") and hp_ratio < 0.5 and randf() < 0.3:
		return {"type": "regen", "value": int(int(stats.get("max_hp", 100)) * 0.08)}

	if not abilities.is_empty() and randf() < 0.25:
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
						"damage": int(int(stats.get("attack", 10)) * 0.6)}

	if randf() < 0.18:
		return {"type": "defend", "shield": StatusEffect.create(StatusEffect.Type.SHIELD, 1, 4)}
	return {"type": "attack", "value": int(stats.get("attack", 8)) + randi_range(-2, 2)}

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
