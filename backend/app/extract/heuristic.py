"""Cheap extraction first (no LLM call). Handles 'key: value | key: value' lines.
Returns rows of {field: (value, evidence_snippet)}."""

Row = dict[str, tuple[str, str]]


def extract_kv(text: str, fields: list[str]) -> list[Row]:
    rows: list[Row] = []
    for line in text.splitlines():
        if "|" not in line:
            continue
        row: Row = {}
        for part in line.split("|"):
            if ":" not in part:
                continue
            key, val = part.split(":", 1)
            key = key.strip().lower().replace(" ", "_")
            if key in fields and val.strip():
                row[key] = (val.strip(), line.strip())
        if len(row) >= 2:
            rows.append(row)
    return rows
