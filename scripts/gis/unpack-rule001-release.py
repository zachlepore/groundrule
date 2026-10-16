"""Validate pinned release archive and safely extract only the expected source files."""
import hashlib
import json
import pathlib
import sys
import zipfile

manifest = json.loads(pathlib.Path(__file__).with_name("clearwater-rule001-source.json").read_text())
archive, destination = map(pathlib.Path, sys.argv[1:])
if hashlib.sha256(archive.read_bytes()).hexdigest() != manifest["archiveSha256"]:
    raise ValueError("Release archive SHA256 differs from pinned frozen snapshot")
if destination.exists():
    raise ValueError("Refusing to overwrite existing source directory")
with zipfile.ZipFile(archive) as zipped:
    files = [info for info in zipped.infolist() if not info.is_dir()]
    if len(files) != len(manifest["files"]) or set(i.filename for i in files) != set(manifest["files"]):
        raise ValueError("Unexpected release members or duplicate filenames")
    # Expected paths are pinned, relative, and regular files; never trust ZIP paths.
    for info in files:
        p = pathlib.PurePosixPath(info.filename)
        mode = info.external_attr >> 16
        if p.is_absolute() or ".." in p.parts or (mode & 0o170000) == 0o120000:
            raise ValueError("Unsafe archive member")
        data = zipped.read(info)  # also checks the ZIP CRC
        expected = manifest["files"][info.filename]
        if len(data) != expected["bytes"] or hashlib.sha256(data).hexdigest() != expected["sha256"]:
            raise ValueError(f"Invalid source file: {info.filename}")
    destination.mkdir(parents=True)
    for info in files:
        target = destination / info.filename
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(zipped.read(info))
print("Pinned archive and every source file verified; safe extraction complete")
