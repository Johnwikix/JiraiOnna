"""Download pinned, public Anima weights into the project-local model directory."""
import concurrent.futures
import hashlib
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = 'circlestone-labs/Anima'
FILES = [
    'split_files/diffusion_models/anima-turbo-v1.1.safetensors',
    'split_files/text_encoders/qwen_3_06b_base.safetensors',
    'split_files/vae/qwen_image_vae.safetensors',
]
def get(url):
    with urllib.request.urlopen(url, timeout=90) as response:
        return json.load(response)

meta = get(f'https://huggingface.co/api/models/{REPO}?blobs=true')
revision = meta['sha']
entries = {item['rfilename']: item for item in meta['siblings']}
manifest = {'repository': REPO, 'revision': revision, 'files': []}

def download(relative):
    entry = entries[relative]
    size = entry.get('size') or entry['lfs']['size']
    expected = entry.get('lfs', {}).get('sha256')
    target = ROOT / '.local' / 'art-models' / pathlib.Path(relative).relative_to('split_files')
    target.parent.mkdir(parents=True, exist_ok=True)
    url = f'https://huggingface.co/{REPO}/resolve/{revision}/{relative}?download=true'
    if not target.exists() or target.stat().st_size != size:
        partial = target.with_suffix('.part')
        offset = partial.stat().st_size if partial.exists() else 0
        request = urllib.request.Request(url, headers={'Range': f'bytes={offset}-'} if offset else {})
        with urllib.request.urlopen(request, timeout=120) as response:
            if offset and response.status != 206:
                offset = 0
            with partial.open('ab' if offset else 'wb') as output:
                last = time.monotonic()
                while True:
                    block = response.read(4 * 1024 * 1024)
                    if not block:
                        break
                    output.write(block)
                    offset += len(block)
                    if time.monotonic() - last > 30:
                        print(f'{target.name}: {offset / size:.0%} ({offset//1048576}/{size//1048576} MiB)', flush=True)
                        last = time.monotonic()
        if partial.stat().st_size != size:
            raise RuntimeError(f'Incomplete download: {relative}')
        partial.replace(target)
    digest = hashlib.file_digest(target.open('rb'), 'sha256').hexdigest()
    if expected and expected != digest:
        raise RuntimeError(f'Checksum mismatch: {relative}')
    print(f'{target.name}: verified {digest[:16]}', flush=True)
    return {'name': relative, 'size': size, 'sha256': digest, 'url': url, 'local': str(target.relative_to(ROOT))}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    manifest['files'] = list(pool.map(download, FILES))
(ROOT / '.local' / 'art-models' / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
