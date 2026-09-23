"""
Озвучка сайта «На кухне по-турецки».
Голос — системный Yelda (tr_TR) из macOS, то есть синтез, а не живой человек.

Запуск:  python3 tools/gen-audio.py
Нужны: macOS `say`, ffmpeg, node (чтобы прочитать data.js).

Хочешь живой голос — запиши mp3 с тем же именем и положи в audio/.
Сайт сначала берёт файл, и только если его нет — синтез речи браузера.
"""
import json, subprocess, tempfile, os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "audio"
OUT.mkdir(exist_ok=True)

data = json.loads(subprocess.check_output(
    ["node", "-e", "global.window={};require('./data.js');process.stdout.write(JSON.stringify(window.KITCHEN))"],
    cwd=ROOT))

jobs = {}
for w in data["words"]:
    jobs[w["id"]] = w["tr"]
    jobs[w["id"] + "-ex"] = w["ex"][0]
for p in data["phrases"]:
    jobs[p["id"]] = p["tr"]
for x in data["extra"]:
    jobs[x["id"]] = x["tr"]
for l in data["lik"]:
    jobs[l["id"]] = l["form"]
for c in data["compounds"]:
    jobs[c["id"]] = c["form"]
for pl in data["places"]:
    jobs[pl["id"]] = pl["form"]
for t in data["things"]:
    jobs[t["id"]] = t["tr"]
    jobs["q-" + t["id"][2:]] = f'{t["tr"]} nerede?'
    for pl in data["places"]:
        jobs[f's-{t["id"][2:]}-{pl["id"][2:]}'] = f'{t["tr"]} {pl["form"]}.'


def render(item):
    key, text = item
    dst = OUT / f"{key}.mp3"
    if dst.exists():
        return
    with tempfile.TemporaryDirectory() as td:
        aiff = os.path.join(td, "a.aiff")
        subprocess.run(["say", "-v", "Yelda", "-r", "155", "-o", aiff, text], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", aiff,
                        "-af", "silenceremove=start_periods=1:start_threshold=-50dB,apad=pad_dur=0.12",
                        "-ac", "1", "-ar", "44100", "-b:a", "64k", str(dst)], check=True)


with ThreadPoolExecutor(8) as ex:
    list(ex.map(render, jobs.items()))
print(len(jobs), "files")
