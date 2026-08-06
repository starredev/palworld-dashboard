# Read-only replacement for palworld-save-tools' item_container_slots decoder,
# API-compatible with cheahjs v0.24.0. cheahjs/quadrantbs only decode the
# container "permission" data; the post-"memory optimisation" saves pack the
# real item id + stack count into the slot RawData, so this reads those fields.
# Enabled ONLY for inventory reads (see convert_with_items.py) — for save writes
# the property stays disabled and slots round-trip as raw bytes.
from typing import Any, Optional, Sequence

from palworld_save_tools.archive import *


def decode(reader: FArchiveReader, type_name: str, size: int, path: str) -> dict[str, Any]:
    if type_name != "ArrayProperty":
        raise Exception(f"Expected ArrayProperty, got {type_name}")
    value = reader.property(type_name, size, path, nested_caller_path=path)
    value["value"] = decode_bytes(reader, value["value"]["values"])
    return value


def decode_bytes(
    parent_reader: FArchiveReader, c_bytes: Sequence[int]
) -> Optional[dict[str, Any]]:
    if len(c_bytes) == 0:
        return None
    reader = parent_reader.internal_copy(bytes(c_bytes), debug=False)
    return {
        "slot_index": reader.i32(),
        "count": reader.i32(),
        "item": {
            "static_id": reader.fstring(),
            "dynamic_id": {
                "created_world_id": reader.guid(),
                "local_id_in_created_world": reader.guid(),
            },
        },
        "trailing_bytes": [b for b in reader.read_to_end()],
    }


def encode(writer: Any, property_type: str, properties: dict[str, Any]) -> int:
    # Read-only: writes never enable this property, so this must never run.
    raise NotImplementedError("item_container_slots.encode is read-only here")
