# Convert a .sav to JSON like convert.py, but with the item-container SLOT
# decoder ENABLED (cheahjs keeps it in DISABLED_PROPERTIES). Used only for
# read-only inventory reads — never for save writes.
import json
import sys

from palworld_save_tools.gvas import GvasFile
from palworld_save_tools.json_tools import CustomEncoder
from palworld_save_tools.palsav import decompress_sav_to_gvas
from palworld_save_tools.paltypes import (
    DISABLED_PROPERTIES,
    PALWORLD_CUSTOM_PROPERTIES,
    PALWORLD_TYPE_HINTS,
)

SLOTS_KEY = ".worldSaveData.ItemContainerSaveData.Value.Slots.Slots.RawData"


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    with open(src, "rb") as f:
        raw_gvas, _ = decompress_sav_to_gvas(f.read())
    # Default custom decoders (all minus DISABLED) PLUS the item-slot decoder.
    custom = {
        k: v
        for k, v in PALWORLD_CUSTOM_PROPERTIES.items()
        if k not in DISABLED_PROPERTIES or k == SLOTS_KEY
    }
    gvas = GvasFile.read(raw_gvas, PALWORLD_TYPE_HINTS, custom, allow_nan=True)
    with open(out, "w", encoding="utf8") as f:
        json.dump(gvas.dump(), f, cls=CustomEncoder, allow_nan=True)


if __name__ == "__main__":
    main()
