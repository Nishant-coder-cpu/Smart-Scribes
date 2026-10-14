import re

import manim2

VALID_SCENE = """from manim import *

class Intro(Scene):
    def construct(self):
        dot = Dot()
        dot.move_to(dot.get_center())
        positions = [UP, DOWN]
        self.play(Create(Circle()))
"""


def _blocked(code):
    return any(re.search(p, code, re.MULTILINE) for p in manim2.FORBIDDEN_CODE_PATTERNS)


def test_valid_manim_code_is_allowed():
    # "positions." and ".get_center(" used to trip the old "os\\." / substring filters.
    assert not _blocked(VALID_SCENE + "        print(positions.count(UP))\n")


def test_obvious_escapes_are_blocked():
    for snippet in [
        "import os\n",
        "from subprocess import run\n",
        "x = __import__('os')\n",
        "data = open('/etc/passwd').read()\n",
        "    import socket\n",
        "eval('1+1')\n",
    ]:
        assert _blocked(snippet), snippet


def test_render_env_drops_secrets():
    env = manim2.render_env({
        "PATH": "/usr/bin",
        "HOME": "/home/scribe",
        "GEMINI_API_KEY": "secret",
        "SUPABASE_SERVICE_ROLE_KEY": "secret",
        "GOOGLE_APPLICATION_CREDENTIALS": "/run/secrets/key.json",
    })
    assert env == {"PATH": "/usr/bin", "HOME": "/home/scribe"}
