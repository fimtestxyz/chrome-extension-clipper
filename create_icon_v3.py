#!/usr/bin/env python3
"""Generate a polished Gobble Monster-inspired icon — v3."""

from PIL import Image, ImageDraw
import math

SIZE = 1024
BG_CREAM = "#FFF8F0"
TEAL = "#4ECDC4"
TEAL_DARK = "#3DBDB5"
TEAL_DEEP = "#2A9D8F"
TEAL_BELLY = "#C8F0E8"
TEAL_SHADE = "#5DD9D0"
RED = "#E07A5F"
YELLOW = "#FFE66D"
PINK = "#FFB6B9"
WHITE = "#FFFFFF"
BLACK = "#1A1A2E"
ORANGE = "#FF9F1C"
NAVY = "#2C3E6B"
GREEN = "#55B98A"
SCREEN = "#7ED6DF"
WOOD = "#D4A574"
WOOD_DARK = "#B8895A"


def rr(draw, xy, r, fill, outline=BLACK, w=3):
    """Rounded rectangle filled and outlined."""
    x0, y0, x1, y1 = xy
    # Fill interior
    draw.rectangle([x0+r, y0+r, x1-r, y1-r], fill=fill)
    # Edges
    draw.rectangle([x0+r, y0, x1-r, y0+w], fill=fill)
    draw.rectangle([x0+r, y1-w, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x0+w, y1-r], fill=fill)
    draw.rectangle([x1-w, y0+r, x1, y1-r], fill=fill)
    # Corners
    draw.arc([x0, y0, x0+2*r, y0+2*r], 180, 270, fill=outline, width=w)
    draw.arc([x1-2*r, y0, x1, y0+2*r], 270, 360, fill=outline, width=w)
    draw.arc([x0, y1-2*r, x0+2*r, y1], 90, 180, fill=outline, width=w)
    draw.arc([x1-2*r, y1-2*r, x1, y1], 0, 90, fill=outline, width=w)
    # Fill corners on top to patch outline gap
    draw.pieslice([x0, y0, x0+2*r, y0+2*r], 180, 270, fill=fill)
    draw.pieslice([x1-2*r, y0, x1, y0+2*r], 270, 360, fill=fill)
    draw.pieslice([x0, y1-2*r, x0+2*r, y1], 90, 180, fill=fill)
    draw.pieslice([x1-2*r, y1-2*r, x1, y1], 0, 90, fill=fill)
    # Re-outline
    draw.arc([x0, y0, x0+2*r, y0+2*r], 180, 270, fill=outline, width=w)
    draw.arc([x1-2*r, y0, x1, y0+2*r], 270, 360, fill=outline, width=w)
    draw.arc([x0, y1-2*r, x0+2*r, y1], 90, 180, fill=outline, width=w)
    draw.arc([x1-2*r, y1-2*r, x1, y1], 0, 90, fill=outline, width=w)


def star4(draw, cx, cy, s, color):
    pts = [
        (cx, cy-s), (cx+s*0.35, cy-s*0.35), (cx+s, cy),
        (cx+s*0.35, cy+s*0.35), (cx, cy+s), (cx-s*0.35, cy+s*0.35),
        (cx-s, cy), (cx-s*0.35, cy-s*0.35),
    ]
    draw.polygon(pts, fill=color)


def ellipse_f(draw, xy, fill, outline=BLACK, width=3):
    draw.ellipse(xy, fill=fill, outline=outline, width=width)

# Alias for convenience
ell = ellipse_f


img = Image.new("RGBA", (SIZE, SIZE), BG_CREAM + "FF")
d = ImageDraw.Draw(img)

# ===========================
# BORDER FRAME
# ===========================
bp, br = 36, 70
rr(d, (bp, bp, SIZE-bp, SIZE-bp), br, fill=RED, w=6)
rr(d, (52, 52, SIZE-52, SIZE-52), 50, fill=BG_CREAM, w=2)

# Decorative stars
for sx, sy in [
    (bp+26, 512), (SIZE-bp-26, 512), (512, bp+26), (512, SIZE-bp-26),
    (bp+36, bp+36), (SIZE-bp-36, bp+36), (bp+36, SIZE-bp-36), (SIZE-bp-36, SIZE-bp-36),
    (bp+48, 300), (bp+48, 724), (SIZE-bp-48, 300), (SIZE-bp-48, 724),
    (300, bp+48), (724, bp+48), (300, SIZE-bp-48), (724, SIZE-bp-48),
]:
    star4(d, sx, sy, 13, YELLOW)

# ===========================
# MONSTER
# ===========================
cx, cy = 512, 512

# Shadow under character
d.ellipse([cx-200, 760, cx+200, 785], fill="#00000020")

# --- Body (smooth rounded blob) ---
# Lower body
ell(d, [cx-150, 440, cx+150, 680], fill=TEAL)
# Upper body / chest
ell(d, [cx-130, 420, cx+130, 560], fill=TEAL)
# Belly
ell(d, [cx-95, 470, cx+95, 640], fill=TEAL_BELLY)

# --- Legs ---
for lx in [cx-70, cx+70]:
    ell(d, [lx-32, 650, lx+32, 700], fill=TEAL)

# --- Head ---
hw, hh = 190, 165
ell(d, [cx-hw, cy-160-hh, cx+hw, cy-160+hh], fill=TEAL)

# --- Hair spikes ---
for i in range(-3, 4):
    sx2 = cx + i * 40
    sh = 32 - abs(i) * 5
    pts = [
        (sx2-14, cy-160-hh+5),
        (sx2, cy-160-hh-sh),
        (sx2+14, cy-160-hh+5),
    ]
    d.polygon(pts, fill=TEAL_SHADE, outline=BLACK, w=2)

# --- Horns ---
# Left horn (dark, curved)
horn_l = [
    (cx-90, cy-160-hh+15),
    (cx-150, cy-160-hh-60),
    (cx-120, cy-160-hh-45),
    (cx-70, cy-160-hh+30),
]
d.polygon(horn_l, fill=BLACK, outline=BLACK, w=3)

# Right horn (teal)
horn_r = [
    (cx+90, cy-160-hh+15),
    (cx+150, cy-160-hh-60),
    (cx+120, cy-160-hh-45),
    (cx+70, cy-160-hh+30),
]
d.polygon(horn_r, fill=TEAL_DEEP, outline=BLACK, w=3)

# --- Eyes (big glossy anime) ---
eye_lx, eye_rx = cx-65, cx+65
eye_y = cy - 160 - 5
er = 38

ellipse_f(d, [eye_lx-er, eye_y-er, eye_lx+er, eye_y+er], fill=WHITE)
ellipse_f(d, [eye_rx-er, eye_y-er, eye_rx+er, eye_y+er], fill=WHITE)

pr = 23
d.ellipse([eye_lx-pr, eye_y-pr, eye_lx+pr, eye_y+pr], fill=BLACK)
d.ellipse([eye_rx-pr, eye_y-pr, eye_rx+pr, eye_y+pr], fill=BLACK)

for ex in [eye_lx, eye_rx]:
    ellipse_f(d, [ex-13-9, eye_y-13-9, ex-13+9, eye_y-13+9], fill=WHITE)
    ellipse_f(d, [ex-4-4, eye_y-4-4, ex-4+4, eye_y-4+4], fill=WHITE)

# --- Blush ---
for bx in [eye_lx-25, eye_rx+25]:
    d.ellipse([bx-20, eye_y+16, bx+20, eye_y+16+26], fill=PINK)

# --- Mouth ---
mx, my = cx, cy-160+35
mw, mh = 30, 20
ell(d, [mx-mw, my-mh, mx+mw, my+mh], fill="#C0392B")
tr2 = 14
d.ellipse([mx-tr2, my+2, mx+tr2, my+2+tr2*2], fill="#FF8A80")

# --- Arms (reaching down toward desk) ---
# Left arm
ell(d, [cx-hw-5, cy-120, cx-hw+55, cy-50], fill=TEAL)
# Right arm
ell(d, [cx+hw-55, cy-120, cx+hw+5, cy-50], fill=TEAL)

# Hands
for hx, hy in [(cx-hw+25, cy-45), (cx+hw-25, cy-45)]:
    ell(d, [hx-16, hy-16, hx+16, hy+16], fill=TEAL)

# ===========================
# DESK SURFACE
# ===========================
desk_y = 590
rr(d, [45, desk_y-12, SIZE-45, desk_y+18], 8, fill=WOOD, outline=WOOD_DARK, w=3)
# Desk edge highlight
d.rectangle([55, desk_y-12, SIZE-55, desk_y-8], fill="#E0BC8C")

# ===========================
# BOOK STACK (left side on desk)
# ===========================
bk_cx = cx - 110
bk_by = desk_y - 3

# Bottom book (navy)
rr(d, [bk_cx-115, bk_by-48, bk_cx+115, bk_by+48], 7, fill=NAVY, outline=BLACK, w=3)
# Spine tab
d.rectangle([bk_cx-115+5, bk_by-8, bk_cx-115+17, bk_by+8], fill=ORANGE, outline=BLACK, w=2)

# Middle book
rr(d, [bk_cx-110, bk_by-85, bk_cx+110, bk_by-48], 6, fill="#3D5280", outline=BLACK, w=2)

# Top book (green, tilted slightly — drawn as rotated rect)
tb_cx = bk_cx + 5
tb_cy = bk_by - 100
# Tilted book polygon
tb_top = [
    (tb_cx-105, tb_cy-42),
    (tb_cx+105, tb_cy-38),
    (tb_cx+110, tb_cy+10),
    (tb_cx-100, tb_cy+12),
]
d.polygon(tb_top, fill=GREEN, outline=BLACK, w=3)

# Lines on top book (text)
for i in range(-2, 3):
    ly = tb_cy + i * 10 - 5
    lx1 = tb_cx - 85 + abs(i)*4
    lx2 = tb_cx + 90 - abs(i)*4
    d.line([(lx1, ly), (lx2, ly)], fill=WHITE, width=2)

# Small food circle icon on book
ell(d, [tb_cx-88, tb_cy-30, tb_cx-70, tb_cy-12], fill=WHITE)
ell(d, [tb_cx-82, tb_cy-24, tb_cx-72, tb_cy-14], fill=ORANGE)

# ===========================
# RETRO COMPUTER (right side)
# ===========================
comp_x = cx + 160
comp_y = desk_y + 3
cw, ch = 65, 50

rr(d, [comp_x-cw, comp_y-ch, comp_x+cw, comp_y], 5, fill="#636E72", outline=BLACK, w=3)
sp2 = 5
rr(d, [comp_x-cw+sp2, comp_y-ch+sp2, comp_x+cw-sp2, comp_y-10], 3, fill=SCREEN, outline=BLACK, w=2)

# Screen content
rr(d, [comp_x-22, comp_y-ch+10, comp_x+8, comp_y-16], 2, fill=WHITE, outline=BLACK, w=1)
d.rounded_rectangle([comp_x-18, comp_y-ch+14, comp_x-6, comp_y-ch+26], radius=2, fill=ORANGE, outline=BLACK, w=1)

# Stand
rr(d, [comp_x-10, comp_y-3, comp_x+10, comp_y+8], 2, fill="#636E72", outline=BLACK, w=2)
rr(d, [comp_x-22, comp_y+6, comp_x+22, comp_y+12], 2, fill="#636E72", outline=BLACK, w=2)

# ===========================
# DECORATIVE FLOATING ELEMENTS
# ===========================
def plus(draw, cx, cy, s, color, w=3):
    draw.line([(cx-s, cy), (cx+s, cy)], fill=color, width=w)
    draw.line([(cx, cy-s), (cx, cy+s)], fill=color, width=w)

floats = [
    (155, 175, 13, YELLOW),
    (865, 215, 11, ORANGE),
    (175, 740, 13, TEAL),
    (835, 695, 15, YELLOW),
    (125, 475, 9, PINK),
    (875, 415, 12, YELLOW),
    (275, 135, 10, ORANGE),
    (715, 155, 13, TEAL),
    (395, 115, 9, YELLOW),
    (560, 125, 11, PINK),
    (480, 150, 10, YELLOW),
]
for fx, fy, fs, fc in floats:
    plus(d, fx, fy, fs, fc)

# Dots
for dx, dy in [(165, 340), (845, 570), (245, 670), (770, 310), (430, 140), (580, 130)]:
    d.ellipse([dx-5, dy-5, dx+5, dy+5], fill=TEAL)

# Code symbols
for sx, sy in [(195, 295), (815, 345)]:
    # <
    d.line([(sx+10, sy-10), (sx-10, sy), (sx+10, sy+10)], fill=RED, width=3)
for sx, sy in [(145, 595), (865, 545)]:
    # >
    d.line([(sx-10, sy-10), (sx+10, sy), (sx-10, sy+10)], fill=NAVY, width=3)

# Save
out = "/Volumes/wwk_nvme/Users/wwkoon/.openclaw/workspace/chrome_extension_clipper/gobble_monster_icon_v3.png"
img.save(out, "PNG")
print(f"Saved: {out}")
