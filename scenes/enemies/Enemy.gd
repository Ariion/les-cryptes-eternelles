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

func setup(name: String, floor_number: int) -> void:
	enemy_name = name
	var base: Dictionary = ENEMY_DATA.get(name, ENEMY_DATA["Goblin"]).duplicate()
	var scale := 1.0 + (floor_number - 1) * 0.15
	stats = {
		"hp":        int(base["max_hp"] * scale),
		"max_hp":    int(base["max_hp"] * scale),
		"attack":    int(base["attack"] * scale),
		"defense":   int(base["defense"] * scale),
		"gold":      int(base["gold"] * scale),
		"abilities": base.get("abilities", []),
	}

func take_damage(amount: int) -> void:
	var reduced := max(1, amount - stats["defense"] - _get_shield_bonus())
	stats["hp"] = max(0, stats["hp"] - reduced)
	# Met à jour la barre de vie visuelle si elle existe
	if has_node("HpBar"):
		var ratio := float(stats["hp"]) / float(stats["max_hp"])
		$HpBar.scale.x = ratio
	emit_signal("hp_changed", stats["hp"], stats["max_hp"])
	if stats["hp"] == 0:
		emit_signal("enemy_died", stats["gold"])

func choose_action() -> Dictionary:
	# Vérifie d'abord si l'ennemi est étourdi
	if is_stunned():
		return {"type": "stunned"}

	var hp_ratio := float(stats["hp"]) / float(stats["max_hp"])
	var abilities: Array = stats.get("abilities", [])

	# Le boss utilise la régénération si < 50% PV
	if "regen" in abilities and hp_ratio < 0.5 and randf() < 0.3:
		return {"type": "regen", "value": int(stats["max_hp"] * 0.08)}

	# Capacités spéciales (20% de chance chacune)
	if not abilities.is_empty() and randf() < 0.25:
		var ability := abilities[randi() % abilities.size()]
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
						"damage": int(stats["attack"] * 0.6)}

	# Attaque normale, parfois défend
	if randf() < 0.18:
		return {"type": "defend", "shield": StatusEffect.create(StatusEffect.Type.SHIELD, 1, 4)}
	return {"type": "attack", "value": stats["attack"] + randi_range(-2, 2)}

func apply_status(effect: StatusEffect) -> void:
	for existing in status_effects:
		if existing.type == effect.type:
			existing.duration = effect.duration
			return
	status_effects.append(effect)
	emit_signal("status_applied", effect)

func process_status_effects() -> Array:
	var messages := []
	var to_remove := []
	for effect in status_effects:
		var delta := effect.tick()
		if delta < 0:
			take_damage(-delta)
			messages.append("%s subit %d dégâts (%s)" % [enemy_name, -delta, effect.label])
		elif delta > 0:
			stats["hp"] = min(stats["max_hp"], stats["hp"] + delta)
			emit_signal("hp_changed", stats["hp"], stats["max_hp"])
			messages.append("%s récupère %d PV" % [enemy_name, delta])
		if effect.is_expired():
			to_remove.append(effect)
	for e in to_remove:
		status_effects.erase(e)
	return messages

func is_alive() -> bool:
	return stats["hp"] > 0

func is_stunned() -> bool:
	return status_effects.any(func(e): return e.type == StatusEffect.Type.STUN)

func _get_shield_bonus() -> int:
	for effect in status_effects:
		if effect.type == StatusEffect.Type.SHIELD:
			return effect.value
	return 0
