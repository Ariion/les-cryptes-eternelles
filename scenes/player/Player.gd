extends Node

var stats := {}
var inventory: Array = []
var equipment := {"weapon": "", "shield": ""}
var status_effects: Array = []
var skills: Array = []
var skill_cooldowns: Dictionary = {}
var active_buffs: Array = []
var has_evasion: bool = false

signal hp_changed(current: int, maximum: int)
signal player_died()
signal gold_collected(amount: int)
signal status_applied(effect: StatusEffect)
signal status_removed(effect: StatusEffect)
signal player_hit(damage: int)

func _ready() -> void:
	var base: Dictionary = GameManager.get_player_base_stats()
	stats = {
		"hp":      int(base.get("max_hp", 100)),
		"max_hp":  int(base.get("max_hp", 100)),
		"attack":  int(base.get("attack", 10)),
		"defense": int(base.get("defense", 5)),
	}
	skills = CharacterDatabase.get_skills(GameManager.selected_class)
	for skill in skills:
		skill_cooldowns[str(skill["name"])] = 0

func get_skill_cooldown(skill_name: String) -> int:
	return int(skill_cooldowns.get(skill_name, 0))

func tick_skill_cooldowns() -> void:
	for k in skill_cooldowns:
		if skill_cooldowns[k] > 0:
			skill_cooldowns[k] -= 1
	var to_remove: Array = []
	for buff in active_buffs:
		buff["turns"] -= 1
		if buff["turns"] <= 0:
			to_remove.append(buff)
	for b in to_remove:
		active_buffs.erase(b)

func get_effective_attack() -> int:
	var atk: int = int(stats.get("attack", 10))
	for buff in active_buffs:
		if str(buff.get("stat", "")) == "attack":
			atk += int(buff.get("amount", 0))
	return atk

func get_effective_defense() -> int:
	var def_val: int = int(stats.get("defense", 5))
	for buff in active_buffs:
		if str(buff.get("stat", "")) == "defense":
			def_val += int(buff.get("amount", 0))
	return def_val

func use_skill(skill: Dictionary, enemy: Node) -> Dictionary:
	var skill_type: String = str(skill.get("type", ""))
	var base_atk: int = get_effective_attack()
	var msg: String = ""

	match skill_type:
		"damage":
			var dmg := max(1, int(base_atk * float(skill.get("multiplier", 1.0))))
			enemy.take_damage(dmg, false)
			msg = "%s — %d dégâts !" % [skill["name"], dmg]

		"damage_crit":
			var dmg := max(1, int(base_atk * float(skill.get("multiplier", 2.0))))
			enemy.take_damage(dmg, true)
			msg = "CRITIQUE ! %s — %d dégâts !" % [skill["name"], dmg]

		"damage_burn":
			var dmg := max(1, int(base_atk * float(skill.get("multiplier", 1.2))))
			enemy.take_damage(dmg, false)
			enemy.apply_status(StatusEffect.create(StatusEffect.Type.BURN, 2, 5))
			msg = "%s — %d dégâts + brûlure !" % [skill["name"], dmg]

		"damage_pierce":
			var dmg := max(1, int(base_atk * float(skill.get("multiplier", 1.8))))
			enemy.take_damage(dmg, false)
			msg = "%s — %d dégâts (perce la défense) !" % [skill["name"], dmg]

		"damage_pierce_half":
			var dmg := max(1, int(base_atk * float(skill.get("multiplier", 1.3))))
			enemy.take_damage(dmg, false)
			msg = "%s — %d dégâts !" % [skill["name"], dmg]

		"damage_cleanse":
			var dmg := max(1, int(base_atk * float(skill.get("multiplier", 1.0))))
			enemy.take_damage(dmg, false)
			_clear_negative_statuses()
			msg = "%s — %d dégâts + malus purgés !" % [skill["name"], dmg]

		"multi_hit":
			var hits: int = int(skill.get("hits", 3))
			var dmg_per: int = max(1, int(base_atk * float(skill.get("multiplier", 0.5))))
			for _i in hits:
				if enemy.is_alive():
					enemy.take_damage(dmg_per, false)
			msg = "%s — %d × %d dégâts !" % [skill["name"], hits, dmg_per]

		"heal":
			var amount: int = int(skill.get("amount", 30))
			heal(amount)
			msg = "%s — +%d PV restaurés !" % [skill["name"], amount]

		"shield":
			var amount: int = int(skill.get("amount", 15))
			apply_status(StatusEffect.create(StatusEffect.Type.SHIELD, 1, amount))
			msg = "%s — Bouclier de %d absorbé !" % [skill["name"], amount]

		"buff_atk":
			active_buffs.append({"stat": "attack", "amount": int(skill.get("amount", 5)), "turns": int(skill.get("duration", 2))})
			msg = "%s — +%d ATQ pendant %d tours !" % [skill["name"], skill.get("amount", 5), skill.get("duration", 2)]

		"buff_def":
			active_buffs.append({"stat": "defense", "amount": int(skill.get("amount", 8)), "turns": int(skill.get("duration", 2))})
			msg = "%s — +%d DEF pendant %d tours !" % [skill["name"], skill.get("amount", 8), skill.get("duration", 2)]

		"buff_both":
			active_buffs.append({"stat": "attack",  "amount": int(skill.get("atk", 5)),        "turns": int(skill.get("duration", 3))})
			active_buffs.append({"stat": "defense", "amount": int(skill.get("def_amount", 3)), "turns": int(skill.get("duration", 3))})
			msg = "%s — +%d ATQ et +%d DEF !" % [skill["name"], skill.get("atk", 5), skill.get("def_amount", 3)]

		"poison":
			var dot: int = int(skill.get("dot", 8))
			var dur: int = int(skill.get("duration", 3))
			enemy.apply_status(StatusEffect.create(StatusEffect.Type.POISON, dur, dot))
			msg = "%s — Poison appliqué (%d dmg/tour) !" % [skill["name"], dot]

		"evasion":
			has_evasion = true
			msg = "%s — Tu te fondes dans l'ombre !" % skill["name"]

		_:
			msg = "%s utilisé !" % skill.get("name", "Compétence")

	return {"message": msg}

func take_damage(amount: int) -> void:
	if has_evasion:
		has_evasion = false
		emit_signal("player_hit", 0)
		return
	var shield: int = _get_shield_bonus()
	var reduced: int = max(1, amount - get_effective_defense() - shield)
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
	var base_dmg: int = max(1, get_effective_attack() - weakness_debuff + randi_range(-2, 2))
	var is_crit: bool = randf() < 0.12
	var damage: int = max(1, int(base_dmg * 1.5)) if is_crit else base_dmg

	var hit_count: int = 1
	if equipment["weapon"] == "Shadow Blade" and randf() < 0.35:
		hit_count = 2

	for _i in hit_count:
		enemy.take_damage(damage, is_crit)

	match equipment["weapon"]:
		"Flame Sword":
			enemy.apply_status(StatusEffect.create(StatusEffect.Type.BURN, 3, 5))
		"Cursed Dagger":
			enemy.apply_status(StatusEffect.create(StatusEffect.Type.POISON, 3, 6))

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

func equip_item(item_name: String) -> void:
	if not item_name in inventory:
		return
	var data: Dictionary = ItemDatabase.get_item(item_name)
	if data.is_empty():
		return
	var item_type: int = data.get("type", -1)
	if item_type == ItemDatabase.ItemType.WEAPON:
		if equipment["weapon"] != "":
			var old: Dictionary = ItemDatabase.get_item(equipment["weapon"])
			stats["attack"] = int(stats.get("attack", 10)) - int(old.get("attack_bonus", 0))
		equipment["weapon"] = item_name
		stats["attack"] = int(stats.get("attack", 10)) + int(data.get("attack_bonus", 0))
	elif item_type == ItemDatabase.ItemType.SHIELD:
		if equipment["shield"] != "":
			var old: Dictionary = ItemDatabase.get_item(equipment["shield"])
			stats["defense"] = int(stats.get("defense", 5)) - int(old.get("defense_bonus", 0))
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

func _get_passive_regen() -> int:
	for item in inventory:
		var d := ItemDatabase.get_item(str(item))
		if d.has("regen_per_turn"):
			return int(d["regen_per_turn"])
	return 0

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
