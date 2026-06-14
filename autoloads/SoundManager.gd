extends Node

# Gestion centralisée du son (musique + effets)
# Placer les fichiers audio dans res://assets/audio/

const MUSIC_VOLUME_KEY := "music_volume"
const SFX_VOLUME_KEY := "sfx_volume"

var _music_player: AudioStreamPlayer
var _sfx_player: AudioStreamPlayer

var music_volume: float = 0.8 :
	set(v):
		music_volume = v
		if _music_player:
			_music_player.volume_db = linear_to_db(v)

var sfx_volume: float = 1.0 :
	set(v):
		sfx_volume = v
		if _sfx_player:
			_sfx_player.volume_db = linear_to_db(v)

# Chemins audio (à remplacer par tes fichiers)
const TRACKS := {
	"menu":   "res://assets/audio/music_menu.ogg",
	"dungeon":"res://assets/audio/music_dungeon.ogg",
	"boss":   "res://assets/audio/music_boss.ogg",
}

const SFX := {
	"attack":  "res://assets/audio/sfx_attack.ogg",
	"hit":     "res://assets/audio/sfx_hit.ogg",
	"gold":    "res://assets/audio/sfx_gold.ogg",
	"victory": "res://assets/audio/sfx_victory.ogg",
	"defeat":  "res://assets/audio/sfx_defeat.ogg",
	"button":  "res://assets/audio/sfx_button.ogg",
}

func _ready() -> void:
	_music_player = AudioStreamPlayer.new()
	_music_player.bus = "Music"
	add_child(_music_player)

	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.bus = "SFX"
	add_child(_sfx_player)

	_load_settings()

func play_music(track_name: String) -> void:
	if not TRACKS.has(track_name):
		return
	if not ResourceLoader.exists(TRACKS[track_name]):
		return
	if _music_player.playing and _music_player.stream and \
			_music_player.stream.resource_path == TRACKS[track_name]:
		return
	var tween := create_tween()
	tween.tween_property(_music_player, "volume_db", -40.0, 0.5)
	tween.tween_callback(func():
		_music_player.stream = load(TRACKS[track_name])
		_music_player.play()
		var t2 := create_tween()
		t2.tween_property(_music_player, "volume_db", linear_to_db(music_volume), 0.5)
	)

func play_sfx(sfx_name: String) -> void:
	if not SFX.has(sfx_name):
		return
	if not ResourceLoader.exists(SFX[sfx_name]):
		return
	_sfx_player.stream = load(SFX[sfx_name])
	_sfx_player.play()

func stop_music() -> void:
	var tween := create_tween()
	tween.tween_property(_music_player, "volume_db", -40.0, 0.8)
	tween.tween_callback(_music_player.stop)

func _load_settings() -> void:
	if not FileAccess.file_exists("user://audio.json"):
		return
	var file := FileAccess.open("user://audio.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(file.get_as_text())
	music_volume = data.get(MUSIC_VOLUME_KEY, 0.8)
	sfx_volume = data.get(SFX_VOLUME_KEY, 1.0)

func save_settings() -> void:
	var file := FileAccess.open("user://audio.json", FileAccess.WRITE)
	file.store_string(JSON.stringify({
		MUSIC_VOLUME_KEY: music_volume,
		SFX_VOLUME_KEY: sfx_volume,
	}))
