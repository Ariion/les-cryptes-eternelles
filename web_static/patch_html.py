import sys

path = sys.argv[1]
html = open(path).read()
sw_script = (
    '<script>\n'
    "if ('serviceWorker' in navigator) {\n"
    "  navigator.serviceWorker.register('coi-serviceworker.js');\n"
    "  if (!crossOriginIsolated) {\n"
    '    navigator.serviceWorker.ready.then(() => location.reload());\n'
    '  }\n'
    '}\n'
    '</script>\n'
)
html = html.replace('<head>', '<head>\n' + sw_script, 1)
open(path, 'w').write(html)
