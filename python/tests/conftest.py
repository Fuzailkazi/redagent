import os
import sys

# Make redteam.py (one level up) importable from the tests.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

LIBRARY_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "attacks", "attack_library.json")
)
