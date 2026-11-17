# Renders every SVG in a round folder into a comparison sheet (sizes x backgrounds) via headless Chrome.
import glob
import html
import os
import pathlib
import subprocess
import sys

rnd = sys.argv[1]
files = sorted(glob.glob(os.path.join(rnd, '*.svg')))
rows = ''
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]
    svg = open(f, encoding='utf-8').read()
    cells = ''
    for bg in ('#111213', '#f2f1ed'):
        sizes = ''.join(f'<div class="s" style="width:{s}px;height:{s}px">{svg}</div>' for s in (192, 64, 32, 16))
        cells += f'<div class="bg" style="background:{bg}">{sizes}</div>'
    rows += f'<div class="row"><div class="lab">{html.escape(name)}</div>{cells}</div>'

page = f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#1b1c1e;font:600 18px Segoe UI,sans-serif;color:#ddd}}
.row{{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid #2a2b2e}}
.lab{{width:170px}}.bg{{display:flex;align-items:center;gap:22px;padding:14px 22px;border-radius:12px}}
.s svg{{width:100%;height:100%;display:block}}</style></head><body>{rows}</body></html>'''

out_html = pathlib.Path(rnd, 'sheet.html').resolve()
out_html.write_text(page, encoding='utf-8')
png = pathlib.Path(rnd, 'sheet.png').resolve()
height = 20 + len(files) * 241
chrome = pathlib.Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
subprocess.run(
    [str(chrome), '--headless=new', '--disable-gpu', '--hide-scrollbars',
     f'--screenshot={png}', f'--window-size=1060,{height}', out_html.as_uri()],
    check=True, capture_output=True, timeout=90,
)
print(png)
