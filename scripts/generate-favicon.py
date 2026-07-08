#!/usr/bin/env python3
"""Render the in-game medic unit as favicon assets."""

import math
from pathlib import Path

import cairo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT

# Match js/game.js UNIT_TYPES.medic and drawSoldier()
MEDIC_COLOR = (96 / 255, 116 / 255, 79 / 255)
HELMET = (221 / 255, 216 / 255, 200 / 255)
CROSS = (184 / 255, 38 / 255, 28 / 255)
GUN = (38 / 255, 38 / 255, 30 / 255)
BG = (20 / 255, 20 / 255, 15 / 255)
SHADOW = (0, 0, 0, 0.25)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def draw_medic(ctx, cx, cy, scale, face=-math.pi / 2):
    fx, fy = math.cos(face), math.sin(face)
    ctx.save()
    ctx.translate(cx, cy)

    # shadow
    ctx.save()
    ctx.scale(scale, scale)
    ctx.set_source_rgba(*SHADOW)
    ctx.save()
    ctx.translate(0, 3)
    ctx.scale(8, 4)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.scale(scale, scale)
    ctx.rotate(face)

    # pistol
    ctx.set_line_width(2)
    ctx.set_source_rgb(*GUN)
    ctx.move_to(fx * 2, fy * 2)
    ctx.line_to(fx * 5, fy * 5)
    ctx.stroke()

    # body
    ctx.save()
    ctx.scale(6.5, 5)
    ctx.set_source_rgb(*MEDIC_COLOR)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # white helmet + red cross
    ctx.set_source_rgb(*HELMET)
    ctx.arc(0, -1, 4.2, 0, 2 * math.pi)
    ctx.fill()
    ctx.set_source_rgba(0, 0, 0, 0.3)
    ctx.set_line_width(1)
    ctx.arc(0, -1, 4.2, 0, 2 * math.pi)
    ctx.stroke()
    ctx.set_source_rgb(*CROSS)
    ctx.rectangle(-2.4, -1.7, 4.8, 1.4)
    ctx.fill()
    ctx.rectangle(-0.7, -3.4, 1.4, 4.8)
    ctx.fill()

    ctx.restore()
    ctx.restore()


def render_png(size):
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surface)
    ctx.set_source_rgb(*BG)
    ctx.paint()
    scale = size / 32
    draw_medic(ctx, size / 2, size / 2 + size * 0.06, scale)
    return surface


def write_png(path, surface):
    surface.write_to_png(str(path))


def write_ico(path, sizes=(16, 32, 48)):
    from PIL import Image

    images = []
    for size in sizes:
        surface = render_png(size)
        buf = surface.get_data()
        stride = surface.get_stride()
        width = surface.get_width()
        height = surface.get_height()
        img = Image.new("RGBA", (width, height))
        px = img.load()
        for y in range(height):
            for x in range(width):
                off = y * stride + x * 4
                b, g, r, a = buf[off], buf[off + 1], buf[off + 2], buf[off + 3]
                px[x, y] = (r, g, b, a)
        images.append(img)

    images[0].save(
        path,
        format="ICO",
        sizes=[(img.width, img.height) for img in images],
        append_images=images[1:],
    )


def write_svg(path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#14140f"/>
  <g transform="translate(32 36) scale(2)">
    <ellipse cx="0" cy="3" rx="8" ry="4" fill="rgba(0,0,0,0.25)"/>
    <g transform="rotate(-90)">
      <line x1="0" y1="-2" x2="0" y2="-5" stroke="#26261e" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="0" cy="0" rx="6.5" ry="5" fill="#60744f"/>
      <circle cx="0" cy="-1" r="4.2" fill="#ddd8c8" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
      <rect x="-2.4" y="-1.7" width="4.8" height="1.4" fill="#b8261c"/>
      <rect x="-0.7" y="-3.4" width="1.4" height="4.8" fill="#b8261c"/>
    </g>
  </g>
</svg>
"""
    path.write_text(svg)


def main():
    write_svg(OUT / "favicon.svg")
    write_png(OUT / "favicon-32.png", render_png(32))
    write_png(OUT / "apple-touch-icon.png", render_png(180))
    write_ico(OUT / "favicon.ico")
    print("Wrote favicon.svg, favicon.ico, favicon-32.png, apple-touch-icon.png")


if __name__ == "__main__":
    main()
