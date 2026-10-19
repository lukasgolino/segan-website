"""The SEGAN wordmark and the speech-bubble mark, drawn with PAGAN (SEGAN's sister) on a 5x7 pixel font.
Run from the project folder: python generators/logo.py"""

from pagan import api

GLYPHS = {
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
}
VIOLET = ["4", "5", "6", "7"]  # bottom (violet) -> top (ice): lit from above


def wordmark(text: str, cell: int) -> api.Canvas:
    """Each font pixel is a cell x cell block, shaded top-light to bottom-dark."""
    width = len(text) * 7 * cell - 2 * cell + 2
    height = 7 * cell + 2
    c = api.Canvas(width, height)
    for i, ch in enumerate(text):
        for gy, row in enumerate(GLYPHS[ch]):
            for gx, bit in enumerate(row):
                if bit == "#":
                    for y in range(cell):
                        t = 1 - (gy * cell + y) / (7 * cell - 1)
                        key = api.ramp_pick(VIOLET, t)
                        c.rect(1 + (i * 7 + gx) * cell, 1 + gy * cell + y, 1 + (i * 7 + gx + 1) * cell - 1, 1 + gy * cell + y, key)
    return c


def mark() -> api.Canvas:
    """A speech bubble holding a waveform: "your agent speaks sound"."""
    c = api.Canvas(16, 16)
    c.rect(2, 2, 13, 10, "9")
    c.rect(3, 1, 12, 1, "9")
    c.rect(3, 11, 12, 11, "9")
    c.rect(1, 3, 1, 9, "9")
    c.rect(14, 3, 14, 9, "8")
    c.rect(3, 11, 12, 11, "8")
    c.rect(4, 12, 6, 12, "8")
    c.rect(4, 13, 4, 13, "8")
    c.rect(3, 1, 12, 1, "a")
    c.rect(1, 3, 1, 4, "a")
    c.rect(3, 3, 12, 9, "3")  # the screen the waveform is drawn on
    for i, h in enumerate([1, 3, 5, 7, 5, 3, 1, 3, 5, 3]):  # bar heights, centred on row 6
        x = 3 + i
        top = 6 - h // 2
        c.rect(x, top, x, top + h - 1, "7" if h >= 5 else "6")
    return c


api.write(
    "sprites/logo.sprite.yaml",
    api.sprite_yaml(
        "logo",
        (len("SEGAN") * 7 * 2 - 4 + 2, 7 * 2 + 2),
        {"main": wordmark("SEGAN", 2)},
        description="The SEGAN wordmark: a 5x7 pixel font at 2x, violet-to-ice gradient, dark outline.",
        outline="auto",
        status="draft",
        style_version=1,
        tags=["brand"],
    ),
)
api.write(
    "sprites/mark.sprite.yaml",
    api.sprite_yaml(
        "mark",
        (16, 16),
        {"main": mark()},
        description="Site icon: a blue speech bubble holding a waveform (you speak, your agent speaks SEGAN).",
        outline="auto",
        status="draft",
        style_version=1,
        tags=["brand"],
    ),
)
