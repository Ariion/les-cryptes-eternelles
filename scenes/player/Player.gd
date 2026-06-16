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
	var base: Dictionary = GameManager.get_player_base_stats()
	stats = {
		"hp":      int(base.get("max_hp", 100)),
		"max_hp":  int(base.get("max_hp", 100)),
		"attack":  int(base.get("attack", 10)),
		"defense": int(base.get("defense", 5)),
	}

signal player_hit(damage: int)

func take_damage(amount: int) -> void:
	var shield: int = _get_shield_bonus()
	var reduced: int = max(1, amount - int(stats.get("defense", 0)) - shield)
	stats["hp"] = max(0, int(stats.get("hp", 0)) - reduced)
	emit_signal("player_hit", reduced)
	emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))
	if int(stats.get("hp", 0)) == 0:
		emit_signal("player_died")

func heal(amount: int) -> void:
	stats["hp"] = min(int(stats.get("max_hp", 100)), int(stats.get("hp", 0)) + amount)
	emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))

func attack_enemy(enemy: Node) -> Dictionary:
	var weakness_debuff: int = _get_weakness_penalty()
	var base_dmg: int = int(stats.get("attack", 10)) - weakness_debuff + randi_range(-2, 2)
	var is_crit: bool = randf() < 0.1
	var damage: int = int(base_dmg * 1.5) if is_crit else base_dmg

	var hit_count: int = 1
	if equipment["weapon"] == "Shadow Blade" and randf() < 0.35:
		hit_count = 2

	for _i in hit_count:
		enemy.take_damage(damage)

	if equipment["weapon"] == "Flame Sword":
		enemy.apply_status(StatusEffect.create(StatusEffect.Type.BURN, 3, 5))

	return {"damage": damage * hit_count, "is_crit": is_crit, "hits": hit_count}

func collect_gold(amount: int) -> void:
	var multiplier: float = 1.0
	for item in inventory:
		if item == "Amulet of Fortune":
			multiplier = 1.5
			break
	var final_amount: int = int(amount * multiplier)
	GameManager.add_gold(final_amount)
	emit_signal("gold_collected", final_amount)

func pick_up_item(item_name: String) -> void:
	var data: Dictionary = ItemDatabase.get_item(item_name)
	if data.is_empty():
		return
	inventory.append(item_name)

	var item_type: int = data.get("type", -1)
	if item_type == ItemDatabase.ItemType.WEAPON:
		if equipment["weapon"] == "":
			equipment["weapon"] = item_name
			stats["attack"] = int(stats.get("attack", 10)) + int(data.get("attack_bonus", 0))
	elif item_type == ItemDatabase.ItemType.SHIELD:
		if equipment["shield"] == "":
			equipment["shield"] = item_name
			stats["defense"] = int(stats.get("defense", 5)) + int(data.get("defense_bonus", 0))

func use_item(item_name: String) -> void:
	if not item_name in inventory:
		return
	var data: Dictionary = ItemDatabase.get_item(item_name)
	if data.get("type") == ItemDatabase.ItemType.POTION:
		if data.has("heal"):
			heal(int(data.get("heal", 0)))
		if data.has("attack_bonus"):
			stats["attack"] = int(stats.get("attack", 10)) + int(data.get("attack_bonus", 0))
		if data.get("clears_status", false):
			_clear_negative_statuses()
		inventory.erase(item_name)

func apply_status(effect: StatusEffect) -> void:
	for item in status_effects:
		var existing: StatusEffect = item as StatusEffect
		if existing.type == effect.type:
			existing.duration = effect.duration
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
	for item in status_effects:
		var e: StatusEffect = item as StatusEffect
		if e.type == StatusEffect.Type.STUN:
			return true
	return false

func reflect_damage() -> int:
	if equipment["shield"] == "Mirror Shield" and randf() < 0.2:
		return 3
	if "Ring of Thorns" in inventory:
		return 2
	return 0

func revive_with_half_hp() -> void:
	status_effects.clear()
	stats["hp"] = int(stats.get("max_hp", 100)) / 2
	emit_signal("hp_changed", int(stats.get("hp", 0)), int(stats.get("max_hp", 1)))

func _get_shield_bonus() -> int:
	for item in status_effects:
		var e: StatusEffect = item as StatusEffect
		if e.type == StatusEffect.Type.SHIELD:
			return e.value
	return 0

func _get_weakness_penalty() -> int:
	for item in status_effects:
		var e: StatusEffect = item as StatusEffect
		if e.type == StatusEffect.Type.WEAKNESS:
			return e.value
	return 0

func _clear_negative_statuses() -> void:
	var to_remove: Array = []
	for item in status_effects:
		var e: StatusEffect = item as StatusEffect
		if e.type in [StatusEffect.Type.BURN, StatusEffect.Type.POISON,
				StatusEffect.Type.STUN, StatusEffect.Type.WEAKNESS]:
			to_remove.append(e)
	for e in to_remove:
		status_effects.erase(e)
		emit_signal("status_removed", e)
