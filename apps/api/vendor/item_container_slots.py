# Item-container SLOT decoder/encoder, API-compatible with cheahjs
# palworld-save-tools v0.24.0. cheahjs/quadrantbs only decode the container
# "permission" data; post-"memory optimisation" saves pack the real item id +
# stack count into the slot RawData, so this reads/writes those fields (matching
# the oMaN-Rod fork, ported to the v0.24.0 archive API — no coerce_bytes /
# without_custom_type helpers which don't exist here). Registered as a
# (decode, encode) pair; only enabled for inventory reads/gives — normal save
# writes leave the property disabled and slots round-trip as raw bytes.
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


def encode(writer: FArchiveWriter, property_type: str, properties: dict[str, Any]) -> int:
    if property_type != "ArrayProperty":
        raise Exception(f"Expected ArrayProperty, got {property_type}")
    del properties["custom_type"]
    encoded_bytes = encode_bytes(properties["value"])
    properties["value"] = {"values": [b for b in encoded_bytes]}
    return writer.property_inner(property_type, properties)


def encode_bytes(p: Optional[dict[str, Any]]) -> bytes:
    if p is None:
        return bytes()
    writer = FArchiveWriter()
    writer.i32(p["slot_index"])
    writer.i32(p["count"])
    writer.fstring(p["item"]["static_id"])
    writer.guid(p["item"]["dynamic_id"]["created_world_id"])
    writer.guid(p["item"]["dynamic_id"]["local_id_in_created_world"])
    writer.write(bytes(p["trailing_bytes"]))
    return writer.bytes()
