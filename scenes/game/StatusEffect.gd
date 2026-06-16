class_name StatusEffect
extends RefCounted

enum Type { BURN, POISON, STUN, REGEN, SHIELD, WEAKNESS }

var type: Type
var duration: int
var value: int
var label: String

static func create(t: Type, dur: int, val: int) -> StatusEffect:
	var s := StatusEffect.new()
	s.type = t
	s.duration = dur
	s.value = val
	s.label = _get_label(t)
	return s

static func _get_label(t: Type) -> String:
	match t:
		Type.BURN:     return "Brûlure"
		Type.POISON:   return "Poison"
		Type.STUN:     return "Étourdi"
		Type.REGEN:    return "Régénération"
		Type.SHIELD:   return "Bouclier"
		Type.WEAKNESS: return "Faiblesse"
	return "?"

static func get_icon(t: Type) -> String:
	match t:
		Type.BURN:     return "FEU"
		Type.POISON:   return "PSN"
		Type.STUN:     return "ETD"
		Type.REGEN:    return "RGN"
		Type.SHIELD:   return "DEF"
		Type.WEAKNESS: return "AFF"
	return "?"

static func get_color(t: Type) -> Color:
	match t:
		Type.BURN:     return Color(0.95, 0.45, 0.15)
		Type.POISON:   return Color(0.55, 0.85, 0.25)
		Type.STUN:     return Color(0.95, 0.85, 0.30)
		Type.REGEN:    return Color(0.30, 0.85, 0.40)
		Type.SHIELD:   return Color(0.45, 0.65, 0.95)
		Type.WEAKNESS: return Color(0.75, 0.55, 0.85)
	return Color.WHITE

# Appelé à chaque tour ; retourne les dégâts (négatif) ou le soin (positif)
func tick() -> int:
	duration -= 1
	match type:
		Type.BURN, Type.POISON: return -value
		Type.REGEN:             return value
		_:                      return 0

func is_expired() -> bool:
	return duration <= 0

func get_description() -> String:
	match type:
		Type.BURN:     return "Brûlure %d/tour (%d tours)" % [value, duration]
		Type.POISON:   return "Poison %d/tour (%d tours)" % [value, duration]
		Type.STUN:     return "Étourdi (%d tours)" % duration
		Type.REGEN:    return "Regen +%d/tour (%d tours)" % [value, duration]
		Type.SHIELD:   return "Bouclier +%d déf (%d tours)" % [value, duration]
		Type.WEAKNESS: return "Faiblesse -%d atq (%d tours)" % [value, duration]
	return ""
