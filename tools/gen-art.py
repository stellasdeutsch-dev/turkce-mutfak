"""
Фоновая графика в духе N2W: аниме-небо с облаками и «мягкие» зернистые звёзды.
Всё рисуется процедурно (numpy + Pillow), без сторонних картинок.
Запуск:  python3 tools/gen-art.py
"""
import numpy as np
from PIL import Image, ImageFilter
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "media"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(7)


def value_noise(h, w, cell, seed):
    r = np.random.default_rng(seed)
    gh, gw = h // cell + 2, w // cell + 2
    g = r.random((gh, gw))
    y = np.linspace(0, h / cell, h, endpoint=False)
    x = np.linspace(0, w / cell, w, endpoint=False)
    yi, xi = y.astype(int), x.astype(int)
    yf, xf = y - yi, x - xi
    yf = yf * yf * (3 - 2 * yf)
    xf = xf * xf * (3 - 2 * xf)
    a = g[yi][:, xi]; b = g[yi][:, xi + 1]
    c = g[yi + 1][:, xi]; d = g[yi + 1][:, xi + 1]
    top = a + (b - a) * xf[None, :]
    bot = c + (d - c) * xf[None, :]
    return top + (bot - top) * yf[:, None]


def fbm(h, w, base, octaves, seed):
    s, amp, tot = np.zeros((h, w)), 1.0, 0.0
    for o in range(octaves):
        cell = max(2, int(base / (2 ** o)))
        s += amp * value_noise(h, w, cell, seed + o * 31)
        tot += amp; amp *= 0.5
    return s / tot


def sky(name, w=1600, h=1000, seed=3):
    y = np.linspace(0, 1, h)[:, None]
    top = np.array([62, 128, 228]); bot = np.array([146, 192, 246])
    img = top * (1 - y[..., None]) + bot * y[..., None]
    img = np.broadcast_to(img, (h, w, 3)).astype(float).copy()

    n = fbm(h, w, 340, 7, seed)
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(-1, 1, w)[None, :]
    # облака — плотная гряда снизу, отдельные «барашки» выше
    bias = 0.55 * np.clip(yy - 0.25, 0, 1) ** 1.1 + 0.12 * np.abs(xx) ** 2
    d = n + bias
    thr = 0.66
    a = np.clip((d - thr) / 0.05, 0, 1)
    a = a * a * (3 - 2 * a)
    above = np.roll(d, 26, axis=0); above[:26] = d[:26]
    light = np.clip(0.62 + (d - above) * 7.0, 0, 1)
    white = np.array([255, 253, 248]); peach = np.array([242, 176, 162]); lil = np.array([184, 176, 226])
    col = peach * (1 - light[..., None]) + white * light[..., None]
    deep = np.clip((d - thr - 0.08) * 6, 0, 1)
    col = col * (1 - 0.25 * deep[..., None]) + lil * 0.25 * deep[..., None]
    img = img * (1 - a[..., None]) + col * a[..., None]

    # перистые штрихи высоко в небе
    s = fbm(h, w // 6 + 1, 30, 3, seed + 9)
    s = np.repeat(s, 6, axis=1)[:, :w]
    fade = np.clip(1 - yy / 0.5, 0, 1)
    sx = np.clip((s - 0.68) * 5, 0, 1) * fade * (1 - a)
    img = img * (1 - 0.45 * sx[..., None]) + 255 * 0.45 * sx[..., None]

    grain = rng.normal(0, 3, (h, w, 1))
    img = np.clip(img + grain, 0, 255).astype(np.uint8)
    Image.fromarray(img).save(OUT / f"{name}.webp", "WEBP", quality=76, method=6)


def star(name, base_rgb, size=900, arms=5, seed=1):
    """Надутая звезда с зерном, как 3D-«пух» в N2W."""
    h = w = size
    yy, xx = np.mgrid[0:h, 0:w]
    cx = cy = size / 2
    X, Y = (xx - cx) / (size * 0.5), (yy - cy) / (size * 0.5)
    r = np.hypot(X, Y)
    th = np.arctan2(Y, X) + 0.3
    k = (np.cos(arms * th) + 1) / 2
    k = k ** 1.6
    R = 0.36 + 0.5 * k
    inside = R - r
    height = np.clip(inside / 0.42, 0, 1)
    height = np.sqrt(height)  # «надутость»
    hi = Image.fromarray((height * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(size / 90))
    height = np.asarray(hi, float) / 255
    gy, gx = np.gradient(height)
    nz = np.ones_like(height) * 0.02
    nrm = np.sqrt(gx ** 2 + gy ** 2 + nz ** 2)
    L = np.array([-0.5, -0.6, 0.62]); L /= np.linalg.norm(L)
    lam = np.clip((-gx * L[0] - gy * L[1] + nz * L[2]) / nrm, 0, 1)
    light = 0.62 + 0.45 * lam
    base = np.array(base_rgb, float)
    col = base[None, None, :] * light[..., None]
    grain = rng.normal(0, 13, (h, w, 1))
    col = np.clip(col + grain, 0, 255)
    alpha = np.clip(inside * 60, 0, 1) * 255
    rgba = np.dstack([col, alpha]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / f"{name}.webp", "WEBP", quality=80, method=6)


if __name__ == "__main__":
    sky("sky", seed=3)
    sky("sky2", seed=11)
    star("star-cream", (238, 226, 206), seed=1)
    star("star-yellow", (255, 214, 110), seed=2)
    star("star-peach", (250, 176, 140), seed=3)
    print("ok")
