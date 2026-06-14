extends Node

# Intégration AdMob (plugin Godot AdMob requis)
# https://github.com/Poing-Studios/godot-admob-plugin

const REWARDED_AD_ID_ANDROID := "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
const REWARDED_AD_ID_IOS := "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"

var _ad_loaded := false
var _pending_callback: Callable

signal ad_reward_earned(type: String)
signal ad_failed()

func _ready() -> void:
	# En mode debug/PC, on simule les pubs
	if OS.has_feature("editor"):
		_ad_loaded = true
		return
	_load_rewarded_ad()

func _load_rewarded_ad() -> void:
	# À connecter au plugin AdMob réel
	# MobileAds.load_rewarded_ad(REWARDED_AD_ID_ANDROID)
	_ad_loaded = true

func show_rewarded_ad(reward_type: String, on_reward: Callable) -> void:
	_pending_callback = on_reward
	if OS.has_feature("editor"):
		# Simulation en éditeur : récompense immédiate
		await get_tree().create_timer(0.5).timeout
		on_reward.call()
		emit_signal("ad_reward_earned", reward_type)
		return

	if not _ad_loaded:
		emit_signal("ad_failed")
		return

	# MobileAds.show_rewarded_ad()
	# Connecter le signal de récompense au callback

func can_show_ad() -> bool:
	return _ad_loaded
