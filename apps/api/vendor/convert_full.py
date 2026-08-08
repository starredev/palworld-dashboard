# Convert a .sav to JSON like convert.py, but with ALL custom decoders ENABLED —
# including MapObjectSaveData, which cheahjs keeps in DISABLED_PROPERTIES for
# speed. Needed to read/edit map-object data such as a chest's PasswordLock
# module. The default `convert --from-json` write path already re-encodes these
# (it writes with the full PALWORLD_CUSTOM_PROPERTIES map), so edits round-trip.
# Heavier than the default convert; only used for the chest features.
import json
import sys

from palworld_save_tools.gvas import GvasFile
from palworld_save_tools.json_tools import CustomEncoder
from palworld_save_tools.palsav import decompress_sav_to_gvas
from palworld_save_tools.paltypes import (
    PALWORLD_CUSTOM_PROPERTIES,
    PALWORLD_TYPE_HINTS,
)


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    with open(src, "rb") as f:
        raw_gvas, _ = decompress_sav_to_gvas(f.read())
    # Every known custom decoder — including the ones cheahjs DISABLES by default
    # (MapObjectSaveData, item slots, base-camp modules). We want the whole thing
    # decoded so map-object modules are editable JSON, not opaque bytes.
    gvas = GvasFile.read(
        raw_gvas, PALWORLD_TYPE_HINTS, dict(PALWORLD_CUSTOM_PROPERTIES), allow_nan=True
    )
    with open(out, "w", encoding="utf8") as f:
        json.dump(gvas.dump(), f, cls=CustomEncoder, allow_nan=True)


if __name__ == "__main__":
    main()
