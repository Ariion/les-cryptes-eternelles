extends Node

const BUILD_NUMBER = 0
const _API_URL = "https://api.github.com/repos/ariion/les-cryptes-eternelles/releases/latest"

var _http: HTTPRequest

func _ready() -> void:
	if BUILD_NUMBER == 0:
		return
	_http = HTTPRequest.new()
	add_child(_http)
	_http.request_completed.connect(_on_response)
	_http.request(_API_URL, ["User-Agent: GodotGame"])

func _on_response(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if code != 200:
		return
	var json: Variant = JSON.parse_string(body.get_string_from_utf8())
	if not json is Dictionary:
		return
	var tag: String = str(json.get("tag_name", ""))
	var parts := tag.split("-")
	if parts.size() < 2 or not parts[1].is_valid_int():
		return
	var latest: int = int(parts[1])
	if latest > BUILD_NUMBER:
		var dl_url: String = str(json.get("assets", [{}])[0].get("browser_download_url", ""))
		if dl_url.is_empty():
			dl_url = str(json.get("html_url", ""))
		_show_banner(latest, dl_url)

func _show_banner(latest: int, url: String) -> void:
	var layer := CanvasLayer.new()
	layer.layer = 100
	get_tree().root.add_child(layer)

	var panel := Panel.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_top = -80.0
	panel.offset_bottom = 0.0
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.05, 0.18, 0.96)
	style.border_color = Color(0.5, 0.3, 0.9)
	style.set_border_width_all(0)
	style.border_width_top = 2
	panel.add_theme_stylebox_override("panel", style)
	layer.add_child(panel)

	var hbox := HBoxContainer.new()
	hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	hbox.offset_left = 12.0
	hbox.offset_right = -12.0
	hbox.offset_top = 8.0
	hbox.offset_bottom = -8.0
	hbox.theme_override_constants_separation = 12
	panel.add_child(hbox)

	var lbl := Label.new()
	lbl.text = "Mise a jour disponible (build %d)" % latest
	lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lbl.add_theme_font_size_override("font_size", 13)
	lbl.add_theme_color_override("font_color", Color(0.85, 0.85, 1.0))
	hbox.add_child(lbl)

	var btn := Button.new()
	btn.text = "Telecharger"
	btn.add_theme_font_size_override("font_size", 14)
	var btn_style := StyleBoxFlat.new()
	btn_style.bg_color = Color(0.35, 0.1, 0.7)
	btn_style.set_corner_radius_all(8)
	btn_style.set_border_width_all(1)
	btn_style.border_color = Color(0.6, 0.3, 1.0)
	btn.add_theme_stylebox_override("normal", btn_style)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.pressed.connect(func(): OS.shell_open(url))
	hbox.add_child(btn)

	var close_btn := Button.new()
	close_btn.text = "X"
	close_btn.add_theme_font_size_override("font_size", 14)
	var close_style := StyleBoxFlat.new()
	close_style.bg_color = Color(0.2, 0.1, 0.3)
	close_style.set_corner_radius_all(8)
	close_btn.add_theme_stylebox_override("normal", close_style)
	close_btn.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	close_btn.pressed.connect(func(): layer.queue_free())
	hbox.add_child(close_btn)
