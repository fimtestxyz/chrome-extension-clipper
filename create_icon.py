#!/usr/bin/env python3
"""Generate a Gobble Monster-inspired icon using Pillow."""

from PIL import Image, ImageDraw, ImageFont
import math

SIZE = 1024
BG_CREAM = "#FFF5E1"
TEAL_DARK = "#2A9D8F"
TEAL_LIGHT = "#4ECDC4"
TEAL_BELLY = "#B5EAD7"
TEAL_BODY = "#5DBDB6"
TEAL_HAIR = "#45B5AA"
HORN_DARK = "#2D3436"
HORN_TEAL = "#3D8B84"
RED_BORDER = "#E17055"
YELLOW_STAR = "#FFEAA7"
PINK_BLUSH = "#FFB6B9"
WHITE = "#FFFFFF"
BLACK = "#1A1A2E"
ORANGE_ACCENT = "#FF9F1C"
DESK_SURFACE = "#DFE6E9"
BOOK_NAVY = "#2C3E6B"
BOOK_GREEN = "#55B98A"
SCREEN_TEAL = "#7ED6DF"

img = Image.new("RGBA", (SIZE, SIZE), BG_CREAM + "00")
draw = ImageDraw.Draw(img)

# --- Rounded rectangle border with stars ---
def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

# Draw outer red border
border_pad = 32
border_radius = 64
draw_rounded_rect(draw, (border_pad, border_pad, SIZE - border_pad, SIZE - border_pad),
                  border_radius, fill=RED_BORDER)

# Inner cream area
inner_pad = 48
inner_radius = 48
draw_rounded_rect(draw, (inner_pad, inner_pad, SIZE - inner_pad, SIZE - inner_pad),
                  inner_radius, fill=BG_CREAM)

# Draw decorative stars along the border
def draw_star(draw, cx, cy, size, color):
    """Draw a 4-pointed sparkle star."""
    points = [
        (cx, cy - size),
        (cx + size * 0.3, cy - size * 0.3),
        (cx + size, cy),
        (cx + size * 0.3, cy + size * 0.3),
        (cx, cy + size),
        (cx - size * 0.3, cy + size * 0.3),
        (cx - size, cy),
        (cx - size * 0.3, cy - size * 0.3),
    ]
    draw.polygon(points, fill=color)

star_positions = [
    (border_pad + 30, 512),
    (SIZE - border_pad - 30, 512),
    (512, border_pad + 30),
    (512, SIZE - border_pad - 30),
    (border_pad + 40, border_pad + 40),
    (SIZE - border_pad - 40, border_pad + 40),
    (border_pad + 40, SIZE - border_pad - 40),
    (SIZE - border_pad - 40, SIZE - border_pad - 40),
]
for sx, sy in star_positions:
    draw_star(draw, sx, sy, 12, YELLOW_STAR)

# --- Draw the monster character ---
center_x = SIZE // 2
center_y = SIZE // 2

# Body (rounded blob shape)
body_center_x = center_x
body_center_y = center_y + 100
body_w = 280
body_h = 320

# Main body ellipse
draw.ellipse([body_center_x - body_w, body_center_y - body_h // 2,
              body_center_x + body_w, body_center_y + body_h // 2],
             fill=TEAL_BODY, outline=BLACK, width=4)

# Belly patch
belly_x = body_center_x
belly_y = body_center_y + 40
belly_w = 180
belly_h = 160
draw.ellipse([belly_x - belly_w, belly_y - belly_h,
              belly_x + belly_w, belly_y + belly_h],
             fill=TEAL_BELLY, outline=BLACK, width=3)

# --- Head ---
head_center_x = center_x
head_center_y = center_y - 80
head_w = 260
head_h = 220

draw.ellipse([head_center_x - head_w, head_center_y - head_h,
              head_center_x + head_w, head_center_y + head_h],
             fill=TEAL_BODY, outline=BLACK, width=4)

# --- Horns ---
# Left horn (dark)
horn_l_points = [
    (head_center_x - 120, head_center_y - head_h + 20),
    (head_center_x - 180, head_center_y - head_h - 80),
    (head_center_x - 140, head_center_y - head_h - 60),
    (head_center_x - 80, head_center_y - head_h + 40),
]
draw.polygon(horn_l_points, fill=HORN_DARK, outline=BLACK, width=3)

# Right horn (teal)
horn_r_points = [
    (head_center_x + 120, head_center_y - head_h + 20),
    (head_center_x + 180, head_center_y - head_h - 80),
    (head_center_x + 140, head_center_y - head_h - 60),
    (head_center_x + 80, head_center_y - head_h + 40),
]
draw.polygon(horn_r_points, fill=HORN_TEAL, outline=BLACK, width=3)

# --- Hair spikes on top of head ---
for i in range(-2, 3):
    spike_x = head_center_x + i * 50
    spike_h = 40 - abs(i) * 8
    spike_points = [
        (spike_x - 20, head_center_y - head_h + 10),
        (spike_x, head_center_y - head_h - spike_h),
        (spike_x + 20, head_center_y - head_h + 10),
    ]
    draw.polygon(spike_points, fill=TEAL_HAIR, outline=BLACK, width=2)

# --- Eyes (big, cute, glossy) ---
eye_left_x = head_center_x - 80
eye_right_x = head_center_x + 80
eye_y = head_center_y - 10
eye_r = 45

# Left eye white
draw.ellipse([eye_left_x - eye_r, eye_y - eye_r,
              eye_left_x + eye_r, eye_y + eye_r],
             fill=WHITE, outline=BLACK, width=3)
# Right eye white
draw.ellipse([eye_right_x - eye_r, eye_y - eye_r,
              eye_right_x + eye_r, eye_y + eye_r],
             fill=WHITE, outline=BLACK, width=3)

# Left pupil
pupil_r = 28
draw.ellipse([eye_left_x - pupil_r, eye_y - pupil_r,
              eye_left_x + pupil_r, eye_y + pupil_r],
             fill=BLACK)
# Right pupil
draw.ellipse([eye_right_x - pupil_r, eye_y - pupil_r,
              eye_right_x + pupil_r, eye_y + pupil_r],
             fill=BLACK)

# Eye highlights (glossy anime look)
hl_r = 12
draw.ellipse([eye_left_x - 15 - hl_r, eye_y - 15 - hl_r,
              eye_left_x - 15 + hl_r, eye_y - 15 + hl_r],
             fill=WHITE)
draw.ellipse([eye_left_x - 5 - hl_r // 2, eye_y - 5 - hl_r // 2,
              eye_left_x - 5 + hl_r // 2, eye_y - 5 + hl_r // 2],
             fill=WHITE)

draw.ellipse([eye_right_x - 15 - hl_r, eye_y - 15 - hl_r,
              eye_right_x - 15 + hl_r, eye_y - 15 + hl_r],
             fill=WHITE)
draw.ellipse([eye_right_x - 5 - hl_r // 2, eye_y - 5 - hl_r // 2,
              eye_right_x - 5 + hl_r // 2, eye_y - 5 + hl_r // 2],
             fill=WHITE)

# --- Blush marks ---
blush_r = 25
draw.ellipse([eye_left_x - 30 - blush_r, eye_y + 20,
              eye_left_x - 30 + blush_r, eye_y + 20 + blush_r * 2],
             fill=PINK_BLUSH)
draw.ellipse([eye_right_x + 30 - blush_r, eye_y + 20,
              eye_right_x + 30 + blush_r, eye_y + 20 + blush_r * 2],
             fill=PINK_BLUSH)

# --- Mouth (open, happy) ---
mouth_x = head_center_x
mouth_y = head_center_y + 40
mouth_w = 35
mouth_h = 25

# Open mouth ellipse
draw.ellipse([mouth_x - mouth_w, mouth_y - mouth_h,
              mouth_x + mouth_w, mouth_y + mouth_h],
             fill="#C0392B", outline=BLACK, width=3)

# Tongue
tongue_r = 18
draw.ellipse([mouth_x - tongue_r, mouth_y + 5,
              mouth_x + tongue_r, mouth_y + 5 + tongue_r * 2],
             fill="#FF8A80")

# --- Arms ---
# Left arm (holding books)
arm_l_center_x = head_center_x - head_w + 20
arm_l_center_y = head_center_y + 60
draw.ellipse([arm_l_center_x - 40, arm_l_center_y - 30,
              arm_l_center_x + 40, arm_l_center_y + 30],
             fill=TEAL_BODY, outline=BLACK, width=3)

# Right arm
arm_r_center_x = head_center_x + head_w - 20
arm_r_center_y = head_center_y + 60
draw.ellipse([arm_r_center_x - 40, arm_r_center_y - 30,
              arm_r_center_x + 40, arm_r_center_y + 30],
             fill=TEAL_BODY, outline=BLACK, width=3)

# --- Books in left hand ---
book_center_x = arm_l_center_x - 20
book_center_y = arm_l_center_y + 80
book_w = 140
book_h = 100

# Bottom book (navy)
draw_rounded_rect(draw, [book_center_x - book_w, book_center_y - book_h // 2,
                         book_center_x + book_w, book_center_y + book_h // 2],
                  10, fill=BOOK_NAVY, outline=BLACK, width=3)
# Book spine detail
draw.rectangle([book_center_x - book_w + 5, book_center_y - 10,
                book_center_x - book_w + 20, book_center_y + 10],
               fill=ORANGE_ACCENT, outline=BLACK, width=2)

# Top book (green cover)
top_book_y = book_center_y - 25
draw_rounded_rect(draw, [book_center_x - book_w + 5, top_book_y - book_h // 2,
                         book_center_x + book_w - 5, top_book_y + book_h // 2],
                  10, fill=BOOK_GREEN, outline=BLACK, width=3)

# Lines on top book (text representation)
for i in range(-2, 3):
    ly = top_book_y + i * 14
    draw.line([(book_center_x - book_w + 20, ly),
               (book_center_x + book_w - 20, ly)],
              fill=WHITE, width=2)

# Small green circle icon on top book
icon_r = 12
draw.ellipse([book_center_x - book_w + 15 - icon_r, top_book_y - 30 - icon_r,
              book_center_x - book_w + 15 + icon_r, top_book_y - 30 + icon_r],
             fill=WHITE, outline=BLACK, width=2)

# --- Retro computer in bottom-right ---
comp_x = SIZE - inner_pad - 100
comp_y = SIZE - inner_pad - 100
comp_w = 80
comp_h = 65

# Monitor body
draw_rounded_rect(draw, [comp_x - comp_w, comp_y - comp_h,
                         comp_x + comp_w, comp_y],
                  8, fill="#636E72", outline=BLACK, width=3)
# Screen
screen_pad = 8
draw_rounded_rect(draw, [comp_x - comp_w + screen_pad, comp_y - comp_h + screen_pad,
                         comp_x + comp_w - screen_pad, comp_y - 15],
                  4, fill=SCREEN_TEAL, outline=BLACK, width=2)
# Screen content (small orange square = file icon)
sq_r = 10
draw.rounded_rectangle([comp_x - 15, comp_y - comp_h + 20,
                        comp_x + 15, comp_y - comp_h + 50],
                       radius=3, fill=ORANGE_ACCENT, outline=BLACK, width=2)
# Monitor stand
draw.rectangle([comp_x - 15, comp_y - 5, comp_x + 15, comp_y + 10],
               fill="#636E72", outline=BLACK, width=2)
draw.rectangle([comp_x - 30, comp_y + 8, comp_x + 30, comp_y + 14],
               fill="#636E72", outline=BLACK, width=2)

# --- Feet ---
foot_l_x = body_center_x - 80
foot_r_x = body_center_x + 80
foot_y = body_center_y + body_h // 2 - 20
foot_r = 30

draw.ellipse([foot_l_x - foot_r, foot_y - foot_r // 2,
              foot_l_x + foot_r, foot_y + foot_r // 2],
             fill=TEAL_BODY, outline=BLACK, width=3)
draw.ellipse([foot_r_x - foot_r, foot_y - foot_r // 2,
              foot_r_x + foot_r, foot_y + foot_r // 2],
             fill=TEAL_BODY, outline=BLACK, width=3)

# --- Floating decorative elements ---
# Plus signs
def draw_plus(draw, cx, cy, size, color, width=3):
    draw.line([(cx - size, cy), (cx + size, cy)], fill=color, width=width)
    draw.line([(cx, cy - size), (cx, cy + size)], fill=color, width=width)

floating_elements = [
    (150, 200, 15, YELLOW_STAR),
    (850, 250, 12, ORANGE_ACCENT),
    (200, 800, 14, TEAL_LIGHT),
    (800, 750, 16, YELLOW_STAR),
    (120, 500, 10, PINK_BLUSH),
    (900, 450, 13, YELLOW_STAR),
    (300, 150, 11, ORANGE_ACCENT),
    (700, 180, 14, TEAL_LIGHT),
]
for fx, fy, fs, fc in floating_elements:
    draw_plus(draw, fx, fy, fs, fc)

# Small dots
dot_r = 6
for dx, dy in [(180, 350), (830, 600), (250, 700), (750, 350), (400, 150)]:
    draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r],
                 fill=TEAL_LIGHT)

# --- Subtle shadow under character ---
shadow_y = body_center_y + body_h // 2 + 10
draw.ellipse([body_center_x - 200, shadow_y,
              body_center_x + 200, shadow_y + 25],
             fill="#00000040")

# Save
output_path = "/Volumes/wwk_nvme/Users/wwkoon/.openclaw/workspace/chrome_extension_clipper/gobble_monster_icon.png"
img.save(output_path, "PNG")
print(f"Saved icon to {output_path}")
print(f"Image size: {img.size}")
