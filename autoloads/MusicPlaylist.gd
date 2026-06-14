extends Node

# Playlist médiévale dark-fantasy — Kevin MacLeod (incompetech.com) CC BY 4.0
# Télécharger sur : https://incompetech.com/music/royalty-free/music.html
# Chercher les titres exacts ci-dessous, télécharger en .ogg
# Placer les fichiers dans res://assets/audio/

const PLAYLIST := {
	# -- MENU PRINCIPAL --
	# Ambiance noble, mystérieuse, comme l'écran titre de Skyrim
	"menu": [
		"res://assets/audio/music_menu.ogg",          # → "Enchanted Journey" Kevin MacLeod
	],

	# -- EXPLORATION / DONJON --
	# Tension légère, stones et torches, style Witcher donjons
	"dungeon": [
		"res://assets/audio/music_dungeon_1.ogg",     # → "Gathering Darkness" Kevin MacLeod
		"res://assets/audio/music_dungeon_2.ogg",     # → "Oppressive Gloom" Kevin MacLeod
		"res://assets/audio/music_dungeon_3.ogg",     # → "Ossuary 5 - Rest" Kevin MacLeod
	],

	# -- COMBAT --
	# Orchestre épique, percussions lourdes, style Baldur's Gate
	"combat": [
		"res://assets/audio/music_combat_1.ogg",      # → "Heroic Age" Kevin MacLeod
		"res://assets/audio/music_combat_2.ogg",      # → "Clash Defiant" Kevin MacLeod
	],

	# -- BOSS --
	# Épique et menaçant, style Sauron / Eredin / Gaunter O'Dimm
	"boss": [
		"res://assets/audio/music_boss.ogg",          # → "Dark Times" Kevin MacLeod
	],

	# -- VICTOIRE --
	# Fanfare courte, satisfaction
	"victory": [
		"res://assets/audio/music_victory.ogg",       # → "Fanfare for Space" Kevin MacLeod (court)
	],

	# -- BOUTIQUE / REPOS --
	# Doux et mélancolique, style taverne médiévale
	"tavern": [
		"res://assets/audio/music_tavern.ogg",        # → "Fluffing a Duck" Kevin MacLeod
	],
}

# Crédit obligatoire CC BY 4.0 (à afficher dans les crédits du jeu) :
# Music by Kevin MacLeod (incompetech.com)
# Licensed under Creative Commons: By Attribution 4.0 License
# http://creativecommons.org/licenses/by/4.0/

var _current_context := ""
var _playlist_index := 0

func play_context(context: String) -> void:
	if context == _current_context:
		return
	_current_context = context
	_playlist_index = 0
	_play_next()

func _play_next() -> void:
	var tracks: Array = PLAYLIST.get(_current_context, [])
	if tracks.is_empty():
		return
	var track := tracks[_playlist_index % tracks.size()]
	if ResourceLoader.exists(track):
		SoundManager.play_music_file(track)
		_playlist_index += 1
	else:
		# Fichier manquant → passe au suivant silencieusement
		_playlist_index += 1
		if _playlist_index < tracks.size():
			_play_next()
