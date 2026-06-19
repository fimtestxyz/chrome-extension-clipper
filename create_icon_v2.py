#!/usr/bin/env python3
"""Generate a refined Gobble Monster-inspired icon using Pillow."""

from PIL import Image, ImageDraw, ImageFont
import math

SIZE = 1024
BG_CREAM = "#FFF8F0"
TEAL_DARK = "#2A9D8F"
TEAL_MAIN = "#4ECDC4"
TEAL_SHADE = "#3DBDB5"
TEAL_BELLY = "#C8F0E8"
RED_BORDER = "#E07A5F"
YELLOW_STAR = "#FFE66D"
PINK_BLUSH = "#FFB6B9"
WHITE = "#FFFFFF"
BLACK = "#1A1A2E"
ORANGE = "#FF9F1C"
NAVY = "#2C3E6B"
GREEN = "#55B98A"
SCREEN_COLOR = "#7ED6DF"
DESK_BROWN = "#D4A574"

img = Image.new("RGBA", (SIZE, SIZE), BG_CREAM + "FF")
draw = ImageDraw.Draw(img)


def draw_ellipse_smooth(draw, xy, fill, outline=BLACK, width=3):
    """Smooth filled ellipse with outline."""
    draw.ellipse(xy, fill=fill, outline=outline, width=width)


def draw_star4(draw, cx, cy, size, color, width=2):
    """4-pointed sparkle star."""
    pts = [
        (cx, cy - size),
        (cx + size * 0.35, cy - size * 0.35),
        (cx + size, cy),
        (cx + size * 0.35, cy + size * 0.35),
        (cx, cy + size),
        (cx - size * 0.35, cy + size * 0.35),
        (cx - size, cy),
        (cx - size * 0.35, cy - size * 0.35),
    ]
    draw.polygon(pts, fill=color, outline=None)


def draw_rounded_rect(draw, xy, radius, fill, outline=BLACK, width=3):
    x0, y0, x1, y1 = xy
    r = radius
    # Corners
    draw.arc([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=outline, width=width)
    draw.arc([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=outline, width=width)
    draw.arc([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=outline, width=width)
    draw.arc([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=outline, width=width)
    # Edges
    draw.line([(x0 + r, y0), (x1 - r, y0)], fill=fill)
    draw.line([(x0 + r, y1), (x1 - r, y1)], fill=fill)
    draw.line([(x0, y0 + r), (x0, y1 - r)], fill=fill)
    draw.line([(x1, y0 + r), (x1, y1 - r)], fill=fill)
    # Fill interior
    draw.rectangle([(x0 + r, y0 + r), (x1 - r, y1 - r)], fill=fill)
    # Re-outline corners on top
    draw.arc([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=outline, width=width)
    draw.arc([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=outline, width=width)
    draw.arc([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=outline, width=width)
    draw.arc([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=outline, width=width)


# === Border ===
bp = 36
br = 72
# Red rounded border
draw_rounded_rect(draw, (bp, bp, SIZE-bp, SIZE-bp), br, fill=RED_BORDER, width=6)
# Inner cream
ip = 52
draw_rounded_rect(draw, (ip, ip, SIZE-ip, SIZE-ip), br-16, fill=BG_CREAM, width=2)

# Stars on border
star_ps = [
    (bp+28, 512), (SIZE-bp-28, 512),
    (512, bp+28), (512, SIZE-bp-28),
    (bp+38, bp+38), (SIZE-bp-38, bp+38),
    (bp+38, SIZE-bp-38), (SIZE-bp-38, SIZE-bp-38),
    (bp+50, 300), (bp+50, 720),
    (SIZE-bp-50, 300), (SIZE-bp-50, 720),
]
for sx, sy in star_ps:
    draw_star4(draw, sx, sy, 14, YELLOW_STAR)


# === Monster Character ===
cx = SIZE // 2
cy = SIZE // 2

# Shadow under character
draw.ellipse([cx-220, 780, cx+220, 810], fill="#00000025")

# --- Body ---
body_cx, body_cy = cx, 560
# Torso
draw.ellipse([body_cx-160, body_cy-100, body_cx+160, body_cy+160],
             fill=TEAL_MAIN, outline=BLACK, width=4)
# Belly
draw.ellipse([body_cx-110, body_cy-20, body_cx+110, body_cy+120],
             fill=TEAL_BELLY, outline=BLACK, width=3)

# --- Head ---
head_cx, head_cy = cx, 340
head_w, head_h = 200, 175
draw.ellipse([head_cx-head_w, head_cy-head_h, head_cx+head_w, head_cy+head_h],
             fill=TEAL_MAIN, outline=BLACK, width=4)

# --- Hair spikes on top ---
for i in range(-3, 4):
    sx_pos = head_cx + i * 42
    sh = 35 - abs(i) * 6
    pts = [
        (sx_pos-16, head_cy-head_h+5),
        (sx_pos, head_cy-head_h-sh),
        (sx_pos+16, head_cy-head_h+5),
    ]
    draw.polygon(pts, fill=TEAL_SHADE, outline=BLACK, width=2)

# --- Horns ---
# Left horn (dark)
horn_l = [
    (head_cx-100, head_cy-head_h+15),
    (head_cx-155, head_cy-head_h-70),
    (head_cx-130, head_cy-head_h-55),
    (head_cx-75, head_cy-head_h+30),
]
draw.polygon(horn_l, fill=BLACK, outline=BLACK, width=3)

# Right horn (teal)
horn_r = [
    (head_cx+100, head_cy-head_h+15),
    (head_cx+155, head_cy-head_h-70),
    (head_cx+130, head_cy-head_h-55),
    (head_cx+75, head_cy-head_h+30),
]
draw.polygon(horn_r, fill=TEAL_DARK, outline=BLACK, width=3)

# --- Eyes ---
eye_l_x, eye_r_x = head_cx-70, head_cx+70
eye_y = head_cy-10
eye_r = 40

# Eye whites
draw_ellipse_smooth(draw, [eye_l_x-eye_r, eye_y-eye_r, eye_l_x+eye_r, eye_y+eye_r],
                    fill=WHITE)
draw_ellipse_smooth(draw, [eye_r_x-eye_r, eye_y-eye_r, eye_r_x+eye_r, eye_y+eye_r],
                    fill=WHITE)

# Pupils
pr = 25
draw.ellipse([eye_l_x-pr, eye_y-pr, eye_l_x+pr, eye_y+pr], fill=BLACK)
draw.ellipse([eye_r_x-pr, eye_y-pr, eye_r_x+pr, eye_y+pr], fill=BLACK)

# Glossy highlights
for ex in [eye_l_x, eye_r_x]:
    # Big highlight
    draw.ellipse([ex-14-10, eye_y-14-10, ex-14+10, eye_y-14+10], fill=WHITE)
    # Small highlight
    draw.ellipse([ex-5-5, eye_y-5-5, ex-5+5, eye_y-5+5], fill=WHITE)

# --- Blush ---
for bx in [eye_l_x-25, eye_r_x+25]:
    draw.ellipse([bx-22, eye_y+18, bx+22, eye_y+18+28], fill=PINK_BLUSH)

# --- Mouth (open, happy with tongue) ---
mouth_x, mouth_y = head_cx, head_cy + 45
mw, mh = 32, 22
# Mouth opening
draw.ellipse([mouth_x-mw, mouth_y-mh, mouth_x+mw, mouth_y+mh],
             fill="#C0392B", outline=BLACK, width=3)
# Tongue
tr = 15
draw.ellipse([mouth_x-tr, mouth_y+2, mouth_x+tr, mouth_y+2+tr*2],
             fill="#FF8A80")

# --- Arms ---
# Left arm reaching forward
draw.ellipse([head_cx-head_w-10, head_cy+30, head_cx-head_w+50, head_cy+90],
             fill=TEAL_MAIN, outline=BLACK, width=3)
# Right arm
draw.ellipse([head_cx+head_w-50, head_cy+30, head_cx+head_w+10, head_cy+90],
             fill=TEAL_MAIN, outline=BLACK, width=3)

# Hands
hand_l = (head_cx - head_w + 20, head_cy + 60)
hand_r = (head_cx + head_w - 20, head_cy + 60)
for hx, hy in [hand_l, hand_r]:
    draw.ellipse([hx-18, hy-18, hx+18, hy+18], fill=TEAL_MAIN, outline=BLACK, width=3)

# --- Desk surface ---
desk_y = 620
draw_rounded_rect(draw, [52, desk_y-15, SIZE-52, desk_y+20], 8,
                  fill=DESK_BROWN, outline="#8B6914", width=3)

# --- Books on desk (left side) ---
book_cx = cx - 120
book_base_y = desk_y - 5
bw, bh = 130, 90

# Bottom book (navy, lying flat)
draw_rounded_rect(draw, [book_cx-bw, book_base_y-bh//2, book_cx+bw, book_base_y+bh//2],
                  8, fill=NAVY, outline=BLACK, width=3)
# Spine detail
draw.rectangle([book_cx-bw+6, book_base_y-8, book_cx-bw+18, book_base_y+8],
               fill=ORANGE, outline=BLACK, width=2)

# Top book tilted (green cover with "COOKING TIPS")
top_book_y = book_base_y - bh//2 - 8
# Draw as rotated rect by drawing manually
tb_cx = book_cx - 5
tb_top = [
    (tb_cx-115, top_book_y-55),
    (tb_cx+115, top_book_y-50),
    (tb_cx+120, top_book_y+15),
    (tb_cx-110, top_book_y+10),
]
draw.polygon(tb_top, fill=GREEN, outline=BLACK, width=3)

# Title text area on book (approximate lines)
for i in range(-2, 3):
    ly = top_book_y + i * 11 - 5
    lx1 = tb_cx - 90 + abs(i)*5
    lx2 = tb_cx + 95 - abs(i)*5
    draw.line([(lx1, ly), (lx2, ly)], fill=WHITE, width=2)

# Small food icon on book
draw.ellipse([tb_cx-95, top_book_y-30, tb_cx-75, top_book_y-10],
             fill=WHITE, outline=BLACK, width=2)
# Little dish circle
draw.ellipse([tb_cx-85, top_book_y-22, tb_cx-73, top_book_y-10],
             fill=ORANGE, outline=BLACK, width=1)

# --- Retro computer (right side on desk) ---
comp_x = cx + 180
comp_y = desk_y + 5
cw, ch = 70, 55

# Monitor body
draw_rounded_rect(draw, [comp_x-cw, comp_y-ch, comp_x+cw, comp_y],
                  6, fill="#636E72", outline=BLACK, width=3)
# Screen
sp = 6
draw_rounded_rect(draw, [comp_x-cw+sp, comp_y-ch+sp, comp_x+cw-sp, comp_y-12],
                  3, fill=SCREEN_COLOR, outline=BLACK, width=2)
# Screen content - small window
draw_rounded_rect(draw, [comp_x-25, comp_y-ch+14, comp_x+10, comp_y-20],
                  2, fill=WHITE, outline=BLACK, width=1)
# Orange square on screen
draw.rounded_rectangle([comp_x-20, comp_y-ch+18, comp_x-8, comp_y-ch+30],
                       radius=1, fill=ORANGE, outline=BLACK, width=1)
# Stand
draw.rectangle([comp_x-12, comp_y-4, comp_x+12, comp_y+8],
               fill="#636E72", outline=BLACK, width=2)
draw.rectangle([comp_x-25, comp_y+6, comp_x+25, comp_y+12],
               fill="#636E72", outline=BLACK, width=2)

# --- Feet ---
for fx in [body_cx-70, body_cx+70]:
    draw.ellipse([fx-25, body_cy+130, fx+25, body_cy+160],
                 fill=TEAL_MAIN, outline=BLACK, width=3)

# --- Floating decorative elements ---
# Plus signs
def draw_plus(draw, cx, cy, s, color, w=3):
    draw.line([(cx-s, cy), (cx+s, cy)], fill=color, width=w)
    draw.line([(cx, cy-s), (cx, cy+s)], fill=color, width=w)

floats = [
    (160, 180, 14, YELLOW_STAR),
    (860, 220, 12, ORANGE),
    (180, 750, 14, TEAL_MAIN),
    (830, 700, 16, YELLOW_STAR),
    (130, 480, 10, PINK_BLUSH),
    (880, 420, 13, YELLOW_STAR),
    (280, 140, 11, ORANGE),
    (720, 160, 14, TEAL_MAIN),
    (400, 120, 10, YELLOW_STAR),
    (600, 130, 12, PINK_BLUSH),
]
for fx, fy, fs, fc in floats:
    draw_plus(draw, fx, fy, fs, fc)

# Small dots
for dx, dy in [(170, 350), (840, 580), (250, 680), (760, 320), (450, 150), (550, 140)]:
    draw.ellipse([dx-5, dy-5, dx+5, dy+5], fill=TEAL_MAIN)

# Code-like symbols (angle brackets as decoration)
def draw_lt(draw, x, y, s, color):
    """Draw < symbol"""
    draw.line([(x+s, y-s), (x-s, y), (x+s, y+s)], fill=color, width=3)

def draw_gt(draw, x, y, s, color):
    """Draw > symbol"""
    draw.line([(x-s, y-s), (x+s, y), (x-s, y+s)], fill=color, width=3)

draw_lt(draw, 200, 300, 12, RED_BORDER)
draw_gt(draw, 820, 350, 12, RED_BORDER)
draw_lt(draw, 150, 600, 10, NAVY)
draw_gt(draw, 870, 550, 10, NAVY)

# Save
out = "/Volumes/wwk_nvme/Users/wwkoon/.openclaw/workspace/chrome_extension_clipper/gobble_monster_icon_v2.png"
img.save(out, "PNG")
print(f"Saved: {out}")
print(f"Size: {img.size}")
