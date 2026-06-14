extends Node

var player: Node
var enemies: Array = []
var current_enemy_index := 0
var _player_defending := false
var _turn_count := 0

signal combat_log(message: String)
signal combat_ended(victory: bool, gold_earned: int)
signal turn_started(is_player_turn: bool)
signal status_log(message: String)

enum CombatState { PLAYER_TURN, ENEMY_TURN, ENDED }
var state := CombatState.PLAYER_TURN

func start_combat(p: Node, enemy_list: Array) -> void:
	player = p
	enemies = enemy_list
	current_enemy_index = 0
	_turn_count = 0
	state = CombatState.PLAYER_TURN
	_player_defending = false
	SoundManager.play_music("dungeon")
	emit_signal("turn_started", true)
	emit_signal("combat_log", "Combat commencé ! À toi de jouer.")

# --- Actions du joueur ---

func player_attack() -> void:
	if state != CombatState.PLAYER_TURN:
		return
	if player.is_stunned():
		emit_signal("combat_log", "Tu es étourdi et ne peux pas agir !")
		_start_enemy_turn()
		return

	var enemy := _current_enemy()
	var result := player.attack_enemy(enemy)

	if result["is_crit"]:
		emit_signal("combat_log", "CRITIQUE ! Tu infliges %d dégâts à %s !" % [result["damage"], enemy.enemy_name])
		SoundManager.play_sfx("attack")
	elif result["hits"] > 1:
		emit_signal("combat_log", "Double frappe ! %d dégâts à %s !" % [result["damage"], enemy.enemy_name])
	else:
		emit_signal("combat_log", "Tu infliges %d dégâts à %s." % [result["damage"], enemy.enemy_name])
		SoundManager.play_sfx("attack")

	if not enemy.is_alive():
		_on_enemy_defeated(enemy)
		return

	_start_enemy_turn()

func player_defend() -> void:
	if state != CombatState.PLAYER_TURN:
		return
	_player_defending = true
	player.apply_status(StatusEffect.create(StatusEffect.Type.SHIELD, 1, 5))
	emit_signal("combat_log", "Tu te mets en position défensive (+5 déf ce tour).")
	_start_enemy_turn()

func player_use_item(item_name: String) -> void:
	if state != CombatState.PLAYER_TURN:
		return
	player.use_item(item_name)
	emit_signal("combat_log", "Tu utilises %s." % item_name)
	SoundManager.play_sfx("button")
	_start_enemy_turn()

func player_flee() -> void:
	if state != CombatState.PLAYER_TURN:
		return
	# Fuite plus facile après plusieurs tours (le joueur s'épuise)
	var flee_chance := 0.3 + _turn_count * 0.05
	if randf() < flee_chance:
		emit_signal("combat_log", "Tu t'enfuis du combat !")
		_end_combat(false)
	else:
		emit_signal("combat_log", "Impossible de fuir ! L'ennemi bloque le passage.")
		_start_enemy_turn()

# --- Tour ennemi ---

func _start_enemy_turn() -> void:
	state = CombatState.ENEMY_TURN
	_turn_count += 1
	emit_signal("turn_started", false)

	# Tick des effets du joueur
	var player_msgs := player.process_status_effects()
	for msg in player_msgs:
		emit_signal("combat_log", msg)

	if player.stats["hp"] == 0:
		_end_combat(false)
		return

	await get_tree().create_timer(0.7).timeout
	_process_all_enemies()

func _process_all_enemies() -> void:
	for enemy in enemies:
		if not enemy.is_alive():
			continue
		# Tick des effets de l'ennemi
		var msgs := enemy.process_status_effects()
		for msg in msgs:
			emit_signal("combat_log", msg)
		if not enemy.is_alive():
			_on_enemy_defeated(enemy)
			continue
		await _process_single_enemy(enemy)
		await get_tree().create_timer(0.3).timeout

	if player.stats["hp"] == 0:
		_end_combat(false)
	else:
		_player_defending = false
		_back_to_player_turn()

func _process_single_enemy(enemy: Node) -> void:
	var action := enemy.choose_action()
	match action["type"]:
		"stunned":
			emit_signal("combat_log", "%s est étourdi et perd son tour !" % enemy.enemy_name)

		"attack":
			var damage: int = action["value"]
			if _player_defending:
				damage = int(damage * 0.5)
			var reflect := player.reflect_damage()
			player.take_damage(damage)
			emit_signal("combat_log", "%s t'inflige %d dégâts." % [enemy.enemy_name, damage])
			SoundManager.play_sfx("hit")
			if reflect > 0:
				enemy.take_damage(reflect)
				emit_signal("combat_log", "Riposte ! %s subit %d dégâts en retour." % [enemy.enemy_name, reflect])

		"ability":
			var ability: String = action.get("ability", "")
			match ability:
				"poison_dart":
					player.apply_status(action["status"])
					emit_signal("combat_log", "%s te lance un dard empoisonné !" % enemy.enemy_name)
				"weaken":
					player.apply_status(action["status"])
					emit_signal("combat_log", "%s t'affaiblit ! (-4 attaque)" % enemy.enemy_name)
				"stun_strike":
					player.apply_status(action["status"])
					if action.has("damage"):
						player.take_damage(action["damage"])
					emit_signal("combat_log", "%s te frappe et t'étourdit !" % enemy.enemy_name)

		"regen":
			enemy.apply_status(StatusEffect.create(StatusEffect.Type.REGEN, 2, action["value"]))
			emit_signal("combat_log", "%s se soigne !" % enemy.enemy_name)

		"defend":
			enemy.apply_status(action["shield"])
			emit_signal("combat_log", "%s se met en garde." % enemy.enemy_name)

func _on_enemy_defeated(enemy: Node) -> void:
	emit_signal("combat_log", "%s est vaincu !" % enemy.enemy_name)
	SoundManager.play_sfx("victory")
	player.collect_gold(enemy.stats["gold"])

	var all_dead := enemies.all(func(e): return not e.is_alive())
	if all_dead:
		_end_combat(true)

func _back_to_player_turn() -> void:
	state = CombatState.PLAYER_TURN
	emit_signal("turn_started", true)

func _end_combat(victory: bool) -> void:
	state = CombatState.ENDED
	var total_gold := 0
	if victory:
		for e in enemies:
			total_gold += e.stats.get("gold", 0)
		emit_signal("combat_log", "Victoire !")
		SoundManager.play_sfx("victory")
	else:
		emit_signal("combat_log", "Défaite...")
		SoundManager.play_sfx("defeat")
	emit_signal("combat_ended", victory, total_gold)

func _current_enemy() -> Node:
	# Cible le premier ennemi vivant
	for e in enemies:
		if e.is_alive():
			return e
	return enemies[0]
