extends Node

var stats := {}
var inventory: Array = []
var equipment := {"weapon": "", "shield": ""}
var status_effects: Array = []

signal hp_changed(current: int, maximum: int)
signal player_died()
signal gold_collected(amount: int)
signal status_applied(effect: StatusEffect)
signal status_removed(effect: StatusEffect)

func _ready() -> void:
	var base := GameManager.get_player_base_stats()
	stats = {
		"hp":      base["max_hp"],
		"max_hp":  base["max_hp"],
		"attack":  base["attack"],
		"defense": base["defense"],
	}

func take_damage(amount: int) -> void:
	var shield := _get_shield_bonus()
	var reduced := max(1, amount - stats["defense"] - shield)
	stats["hp"] = max(0, stats["hp"] - reduced)
	emit_signal("hp_changed", stats["hp"], stats["max_hp"])
	if stats["hp"] == 0:
		emit_signal("player_died")

func heal(amount: int) -> void:
	stats["hp"] = min(stats["max_hp"], stats["hp"] + amount)
	emit_signal("hp_changed", stats["hp"], stats["max_hp"])

func attack_enemy(enemy: Node) -> Dictionary:
	var weakness_debuff := _get_weakness_penalty()
	var base_dmg := stats["attack"] - weakness_debuff + randi_range(-2, 2)
	var is_crit := randf() < 0.1
	var damage := int(base_dmg * 1.5) if is_crit else base_dmg

	# On-hit : double strike (Shadow Blade)
	var hit_count := 1
	if equipment["weapon"] == "Shadow Blade" and randf() < 0.35:
		hit_count = 2

	for _i in hit_count:
		enemy.take_damage(damage)

	# On-hit : brûlure (Flame Sword)
	if equipment["weapon"] == "Flame Sword":
		enemy.apply_status(StatusEffect.create(StatusEffect.Type.BURN, 3, 5))

	return {"damage": damage * hit_count, "is_crit": is_crit, "hits": hit_count}

func collect_gold(amount: int) -> void:
	# Bonus de l'Amulet of Fortune
	var multiplier := 1.0
	for item in inventory:
		if item == "Amulet of Fortune":
			multiplier = 1.5
			break
	GameManager.add_gold(int(amount * multiplier))
	emit_signal("gold_collected", int(amount * multiplier))

func pick_up_item(item_name: String) -> void:
	var data := ItemDatabase.get_item(item_name)
	if data.is_empty():
		return
	inventory.append(item_name)

	match data.get("type", -1):
		ItemDatabase.ItemType.WEAPON:
			if equipment["weapon"] == "":
				equipment["weapon"] = item_name
				stats["attack"] += data.get("attack_bonus", 0)
		ItemDatabase.ItemType.SHIELD:
			if equipment["shield"] == "":
				equipment["shield"] = item_name
				stats["defense"] += data.get("defense_bonus", 0)

func use_item(item_name: String) -> void:
	if not item_name in inventory:
		return
	var data := ItemDatabase.get_item(item_name)
	if data.get("type") == ItemDatabase.ItemType.POTION:
		if data.has("heal"):
			heal(data["heal"])
		if data.has("attack_bonus"):
			stats["attack"] += data["attack_bonus"]
		if data.get("clears_status", false):
			_clear_negative_statuses()
		inventory.erase(item_name)

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
			messages.append("%s : %d dégâts" % [effect.label, -delta])
		elif delta > 0:
			heal(delta)
			messages.append("Regen : +%d PV" % delta)
		if effect.is_expired():
			to_remove.append(effect)
	for e in to_remove:
		status_effects.erase(e)
		emit_signal("status_removed", e)
	return messages

func is_stunned() -> bool:
	return status_effects.any(func(e): return e.type == StatusEffect.Type.STUN)

func reflect_damage() -> int:
	if equipment["shield"] == "Mirror Shield" and randf() < 0.2:
		return 3
	if "Ring of Thorns" in inventory:
		return 2
	return 0

func revive_with_half_hp() -> void:
	status_effects.clear()
	stats["hp"] = stats["max_hp"] / 2
	emit_signal("hp_changed", stats["hp"], stats["max_hp"])

func _get_shield_bonus() -> int:
	for effect in status_effects:
		if effect.type == StatusEffect.Type.SHIELD:
			return effect.value
	return 0

func _get_weakness_penalty() -> int:
	for effect in status_effects:
		if effect.type == StatusEffect.Type.WEAKNESS:
			return effect.value
	return 0

func _clear_negative_statuses() -> void:
	var to_remove := status_effects.filter(func(e):
		return e.type in [StatusEffect.Type.BURN, StatusEffect.Type.POISON, StatusEffect.Type.STUN, StatusEffect.Type.WEAKNESS]
	)
	for e in to_remove:
		status_effects.erase(e)
		emit_signal("status_removed", e)
