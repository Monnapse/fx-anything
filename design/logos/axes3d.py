# Renders three square beams crossing at the origin (an X/Y/Z "axis jack") as a flat-shaded 3D SVG.
import math
import sys


def norm(v):
    m = math.sqrt(sum(c * c for c in v))
    return [c / m for c in v]


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def lerp_hex(c0, c1, t):
    a = [int(c0[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(a, b))


def shade(palette, t):
    t = max(0.0, min(1.0, t))
    n = len(palette) - 1
    i = min(int(t * n), n - 1)
    return lerp_hex(palette[i], palette[i + 1], t * n - i)


def render(out, axes, yaw, pitch, half_width=0.11, palettes=None, dist=7.0, light=(-0.5, 0.75, 0.6), size=1024, margin=70, notch=0.0):
    """axes: list of (direction xyz, length_pos, length_neg)."""
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))

    def to_cam(v):
        x, y, z = v
        x, z = x * cy + z * sy, -x * sy + z * cy          # yaw around Y
        y, z = y * cp - z * sp, y * sp + z * cp           # pitch around X
        return [x, y, z]

    def project(v):
        x, y, z = to_cam(v)
        s = dist / (dist - z)                              # +z toward the viewer
        return (x * s, -y * s, z)

    L = norm(list(light))
    faces = []
    for idx, (d, lpos, lneg) in enumerate(axes):
        a = norm(d)
        helper = [0, 1, 0] if abs(a[1]) < 0.9 else [1, 0, 0]
        p = norm(cross(a, helper))
        q = norm(cross(a, p))
        pal = palettes[idx % len(palettes)]
        for t0, t1 in ((0.0, lpos), (0.0, -lneg)):
            corners = []
            for t in (t0, t1):
                for sp_, sq_ in ((1, 1), (1, -1), (-1, -1), (-1, 1)):
                    corners.append([a[k] * t + p[k] * sp_ * half_width + q[k] * sq_ * half_width for k in range(3)])
            quads = [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
            for qd in quads:
                pts3 = [corners[i] for i in qd]
                cam = [to_cam(v) for v in pts3]
                n = norm(cross([cam[1][k] - cam[0][k] for k in range(3)], [cam[2][k] - cam[0][k] for k in range(3)]))
                centre = [sum(c[k] for c in cam) / 4 for k in range(3)]
                to_eye = norm([-centre[0], -centre[1], dist - centre[2]])
                if dot(n, to_eye) < 0:
                    n = [-c for c in n]
                    if dot(n, to_eye) <= 1e-6:
                        continue
                # only keep faces whose outward normal faces the eye (cull by geometry of the box)
                mid3 = [sum(v[k] for v in pts3) / 4 for k in range(3)]
                box_mid = [a[k] * (t0 + t1) / 2 for k in range(3)]
                outward = [mid3[k] - box_mid[k] for k in range(3)]
                outward_cam = to_cam([box_mid[k] + outward[k] for k in range(3)])
                bm_cam = to_cam(box_mid)
                ow = norm([outward_cam[k] - bm_cam[k] for k in range(3)])
                if dot(ow, to_eye) <= 0.02:
                    continue
                lum = 0.18 + 0.82 * max(0.0, dot(ow, L))
                proj = [project(v) for v in pts3]
                depth = centre[2]
                faces.append((depth, proj, shade(pal, lum)))
    faces.sort(key=lambda f: f[0])
    xs = [p[0] for f in faces for p in f[1]]
    ys = [p[1] for f in faces for p in f[1]]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    scale = (size - 2 * margin) / max(w, h)
    ox = size / 2 - (min(xs) + w / 2) * scale
    oy = size / 2 - (min(ys) + h / 2) * scale
    polys = ''
    for _, proj, col in faces:
        pts = ' '.join(f'{x * scale + ox:.1f},{y * scale + oy:.1f}' for x, y, _ in proj)
        polys += f'<polygon points="{pts}" fill="{col}" stroke="{col}" stroke-width="1.5" stroke-linejoin="round"/>'
    open(out, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">{polys}</svg>\n')


AMBER = ['#5a2703', '#a24c08', '#e57c10', '#ffb52e', '#ffe39a']
AMBER_B = ['#4d2202', '#8e4206', '#d06e0c', '#f8a224', '#ffd77a']
AMBER_C = ['#3f1c02', '#7a3905', '#bd620a', '#ee951c', '#ffcb5c']

if __name__ == '__main__':
    outdir = sys.argv[1]
    X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
    render(f'{outdir}/A-axes-amber.svg', [(Y, 1.0, 1.0), (X, 1.0, 1.0), (Z, 1.0, 1.0)], yaw=-28, pitch=-14, palettes=[AMBER])
    render(f'{outdir}/B-axes-three-tones.svg', [(Y, 1.0, 1.0), (X, 1.0, 1.0), (Z, 1.0, 1.0)], yaw=-28, pitch=-14, palettes=[AMBER, AMBER_B, AMBER_C])
    render(f'{outdir}/C-axes-thick.svg', [(Y, 1.0, 1.0), (X, 1.0, 1.0), (Z, 1.0, 1.0)], yaw=-28, pitch=-14, half_width=0.15, palettes=[AMBER, AMBER_B, AMBER_C])
    render(f'{outdir}/D-axes-from-above.svg', [(Y, 1.0, 1.0), (X, 1.0, 1.0), (Z, 1.0, 1.0)], yaw=-32, pitch=18, half_width=0.13, palettes=[AMBER, AMBER_B, AMBER_C])
