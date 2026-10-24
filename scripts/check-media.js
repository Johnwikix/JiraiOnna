import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { nodes, story } from '../public/story.js';
import { createState, advance, choose } from '../public/engine.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const productionRoot = join(publicRoot, 'art', 'production');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = value => typeof value === 'string' && value.trim().length > 0;

function readPNG(file) {
  const data = readFileSync(file);
  if (data.length < 33 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('不是 PNG 文件');
  const chunks = [];
  let header, ended = false;
  for (let offset = 8; offset + 12 <= data.length;) {
    const length = data.readUInt32BE(offset), type = data.toString('ascii', offset + 4, offset + 8);
    if (offset + length + 12 > data.length) throw new Error('PNG 数据块截断');
    const bytes = data.subarray(offset + 8, offset + 8 + length);
    if (!header && type !== 'IHDR') throw new Error('PNG 缺少首个 IHDR');
    if (type === 'IHDR') {
      if (header || length !== 13) throw new Error('PNG IHDR 无效');
      header = { width: bytes.readUInt32BE(0), height: bytes.readUInt32BE(4), depth: bytes[8], colorType: bytes[9], compression: bytes[10], filter: bytes[11], interlace: bytes[12] };
      if (!header.width || !header.height || header.width > 8192 || header.height > 8192 || header.width * header.height > 20_000_000) throw new Error('PNG 尺寸异常');
    } else if (type === 'IDAT') chunks.push(bytes);
    else if (type === 'IEND') { ended = true; break; }
    offset += length + 12;
  }
  if (!header || !chunks.length || !ended) throw new Error('PNG 结构不完整');
  return { ...header, chunks };
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Reconstruct native PNG rows for inspection only; no pixels or files are changed.
function inspectAlpha(png) {
  const { width, height, depth, colorType, compression, filter, interlace } = png;
  if (depth !== 8 || colorType !== 6 || compression !== 0 || filter !== 0 || interlace !== 0) throw new Error('立绘必须是非交错 RGBA8 PNG');
  const stride = width * 4, expected = (stride + 1) * height;
  const packed = inflateSync(Buffer.concat(png.chunks), { maxOutputLength: expected });
  if (packed.length !== expected) throw new Error('PNG 像素长度与 IHDR 不符');
  let previous = Buffer.alloc(stride), row = Buffer.alloc(stride), min = 255, max = 0, transparentPixels = 0, opaquePixels = 0;
  const corners = [];
  for (let y = 0, offset = 0; y < height; y++) {
    const kind = packed[offset++];
    if (kind > 4) throw new Error(`不支持的 PNG 行滤镜 ${kind}`);
    for (let x = 0; x < stride; x++) {
      const raw = packed[offset++], left = x >= 4 ? row[x - 4] : 0, up = previous[x], upperLeft = x >= 4 ? previous[x - 4] : 0;
      const prediction = kind === 0 ? 0 : kind === 1 ? left : kind === 2 ? up : kind === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft);
      row[x] = (raw + prediction) & 255;
      if ((x & 3) === 3) {
        const alpha = row[x];
        min = Math.min(min, alpha); max = Math.max(max, alpha);
        if (alpha <= 2) transparentPixels++;
        if (alpha >= 250) opaquePixels++;
      }
    }
    if (y === 0 || y === height - 1) corners.push(row[3], row[stride - 1]);
    [previous, row] = [row, previous];
  }
  const pixels = width * height;
  return { min, max, corners, transparentPixels, opaquePixels, transparentRatio: transparentPixels / pixels, opaqueRatio: opaquePixels / pixels };
}

function reachableNodes(errors) {
  const queue = [createState(story.start)], seen = new Set(), reachable = new Set();
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i], key = JSON.stringify([state.nodeId, state.flags]);
    if (seen.has(key)) continue;
    seen.add(key);
    const node = nodes[state.nodeId];
    if (!node) { errors.push(`剧情路径引用未知节点 ${state.nodeId}`); continue; }
    reachable.add(state.nodeId);
    if (node.ending) continue;
    const atChoice = { ...state, line: node.lines.length - 1 };
    try {
      if (node.choices) node.choices.forEach((_, choice) => queue.push(choose(atChoice, choice, nodes)));
      else queue.push(advance(atChoice, nodes));
    } catch (error) { errors.push(`剧情路径 ${state.nodeId}: ${error.message}`); }
  }
  return reachable;
}

function productionPNGs(folder, errors) {
  try {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? productionPNGs(join(folder, entry.name), errors) : entry.name.toLowerCase().endsWith('.png') ? [join(folder, entry.name)] : []);
  } catch (error) { errors.push(`无法读取产物目录 ${relative(publicRoot, folder)}: ${error.message}`); return []; }
}

export function inspectMedia() {
  const errors = [], assets = new Map(), portraitFiles = new Set();
  let media;
  try { media = JSON.parse(readFileSync(join(publicRoot, 'media.json'), 'utf8')); }
  catch (error) { return { errors: [`media.json: ${error.message}`], backgrounds: 0, wardrobes: 0, cgs: 0, reachableCGs: 0, cues: 0, assets: 0, portraits: [] }; }
  if (!isRecord(media)) return { errors: ['media.json 必须是对象'], portraits: [] };
  for (const section of ['backgrounds', 'portraits', 'cgs', 'scenes']) if (!isRecord(media[section])) { errors.push(`media.${section} 必须是对象`); media[section] = {}; }

  function inspectSource(src, kind, label) {
    const directory = kind === 'portrait' ? 'portraits' : kind === 'cg' ? 'cgs' : 'backgrounds';
    if (typeof src !== 'string' || !src.startsWith(`/art/production/${directory}/`) || !/^\/art\/production\/[a-z]+\/[A-Za-z0-9/_-]+\.png$/.test(src)) { errors.push(`${label} 不是有效的本地产物 PNG 路径`); return; }
    const file = resolve(publicRoot, `.${src}`), rel = relative(publicRoot, file);
    if (rel.startsWith(`..${sep}`) || rel === '..') { errors.push(`${label} 越出 public 目录`); return; }
    let asset = assets.get(src);
    if (!asset) {
      try {
        const png = readPNG(file);
        asset = { src, file, width: png.width, height: png.height, colorType: png.colorType };
        if (kind === 'portrait') asset.alpha = inspectAlpha(png);
        assets.set(src, asset);
      } catch (error) { errors.push(`${label}: ${error.message}`); return; }
    }
    if (kind === 'portrait') {
      portraitFiles.add(src);
      if (asset.width >= asset.height || asset.width < 512 || asset.height < 1024) errors.push(`${label} 必须是足够清晰的全身竖图`);
      const alpha = asset.alpha;
      if (!alpha || alpha.min !== 0 || alpha.max < 250 || alpha.corners.some(value => value > 2) || alpha.transparentRatio < 0.15 || alpha.opaqueRatio < 0.03) errors.push(`${label} 缺少透明四周或清晰不透明主体`);
    } else if (asset.width <= asset.height || asset.width < 1024 || asset.height < 576) errors.push(`${label} 必须是足够清晰的横向背景/CG`);
    return asset;
  }

  const requiredBackgrounds = new Set(Object.values(nodes).map(node => node.bg));
  for (const cues of Object.values(media.scenes)) {
    if (!Array.isArray(cues)) continue;
    for (const cue of cues) if (isRecord(cue) && hasText(cue.background)) requiredBackgrounds.add(cue.background);
  }
  for (const id of requiredBackgrounds) if (!media.backgrounds[id]) errors.push(`缺少剧情背景 ${id}`);
  for (const [id, src] of Object.entries(media.backgrounds)) inspectSource(src, 'background', `背景 ${id}`);

  let wardrobeCount = 0;
  for (const [person, wardrobe] of Object.entries(story.wardrobes)) {
    const mapped = media.portraits[person];
    if (!isRecord(mapped)) { errors.push(`缺少角色衣装映射 ${person}`); continue; }
    for (const outfit of Object.keys(wardrobe)) {
      wardrobeCount++;
      if (!mapped[outfit]) errors.push(`缺少衣装立绘 ${person}/${outfit}`);
    }
    for (const [outfit, src] of Object.entries(mapped)) {
      if (outfit !== 'default' && !Object.hasOwn(wardrobe, outfit)) errors.push(`未知角色衣装 ${person}/${outfit}`);
      inspectSource(src, 'portrait', `立绘 ${person}/${outfit}`);
    }
  }
  for (const person of Object.keys(media.portraits)) if (!story.wardrobes[person]) errors.push(`未知立绘角色 ${person}`);

  const cgIds = Object.keys(media.cgs), requiredCGs = new Set(), reachedCGs = new Set(), reachable = reachableNodes(errors);
  if (!cgIds.length) errors.push('媒体清单缺少 CG');
  for (const [id, cg] of Object.entries(media.cgs)) {
    if (!isRecord(cg) || !hasText(cg.title) || !hasText(cg.alt)) { errors.push(`CG ${id} 缺少 src/title/alt`); continue; }
    inspectSource(cg.src, 'cg', `CG ${id}`);
  }

  function checkOutfit(person, outfit, label) {
    if (!story.wardrobes[person]?.[outfit] || !media.portraits[person]?.[outfit]) errors.push(`${label} 引用不存在的衣装 ${person}/${outfit}`);
  }
  let cueCount = 0;
  for (const [nodeId, cues] of Object.entries(media.scenes)) {
    const node = nodes[nodeId];
    if (!node || !Array.isArray(cues)) { errors.push(`场景 ${nodeId} 节点或 cue 列表无效`); continue; }
    let previousEnd = -1;
    const sorted = [...cues].sort((a, b) => (a?.from ?? -1) - (b?.from ?? -1));
    for (const [index, cue] of sorted.entries()) {
      cueCount++;
      const label = `场景 ${nodeId} cue ${index}`;
      if (!isRecord(cue)) { errors.push(`${label} 必须是对象`); continue; }
      const validRange = Number.isInteger(cue.from) && Number.isInteger(cue.to) && cue.from >= 0 && cue.to >= cue.from && cue.to < node.lines.length;
      if (!validRange) errors.push(`${label} 正文区间无效`);
      else {
        if (cue.from <= previousEnd) errors.push(`${label} 与前一闭区间重叠`);
        previousEnd = Math.max(previousEnd, cue.to);
      }
      if (cue.cg !== undefined) {
        requiredCGs.add(cue.cg);
        if (!Object.hasOwn(media.cgs, cue.cg)) errors.push(`${label} 引用未知 CG ${cue.cg}`);
        else if (validRange && reachable.has(nodeId)) reachedCGs.add(cue.cg);
      }
      if (cue.background !== undefined && !Object.hasOwn(media.backgrounds, cue.background)) errors.push(`${label} 引用未知背景 ${cue.background}`);
      if (cue.hidePortrait !== undefined && typeof cue.hidePortrait !== 'boolean') errors.push(`${label} hidePortrait 必须是布尔值`);
      if (cue.photo !== undefined) {
        if (!isRecord(cue.photo)) errors.push(`${label} photo 必须是对象`);
        else checkOutfit(cue.photo.character, cue.photo.outfit, `${label} photo`);
      }
      if (cue.outfits !== undefined) {
        if (!isRecord(cue.outfits)) errors.push(`${label} outfits 必须是对象`);
        else for (const [person, outfit] of Object.entries(cue.outfits)) checkOutfit(person, outfit, label);
      }
    }
  }
  for (const id of cgIds) if (!reachedCGs.has(id)) errors.push(`CG ${id} 没有可达的正文 cue`);

  const productionFiles = productionPNGs(productionRoot, errors);
  const expectedAssets = Object.keys(media.backgrounds).length + wardrobeCount + cgIds.length;
  if (assets.size !== expectedAssets) errors.push(`背景、衣装和 CG 应分别指向独立产物：应有 ${expectedAssets} 个，当前 ${assets.size}`);
  for (const file of productionFiles) {
    const label = relative(publicRoot, file);
    const src = `/${label.split(sep).join('/')}`;
    if (!assets.has(src)) errors.push(`产物 ${label} 未登记在媒体清单中`);
    try {
      const metadata = JSON.parse(readFileSync(`${file}.json`, 'utf8'));
      if (!isRecord(metadata) || !hasText(metadata.prompt) || !hasText(metadata.tool) || !Array.isArray(metadata.references)) errors.push(`${label}.json 必须有完整 prompt、tool、references`);
      else for (const reference of metadata.references) if (!isRecord(reference) || !hasText(reference.path) || !hasText(reference.role ?? reference.purpose)) errors.push(`${label}.json 的图像参考缺少 path 和用途`);
    } catch (error) { errors.push(`${label}.json: ${error.message}`); }
  }

  return {
    errors, backgrounds: Object.keys(media.backgrounds).length, requiredBackgrounds: requiredBackgrounds.size,
    wardrobes: wardrobeCount, requiredWardrobes: Object.values(story.wardrobes).reduce((sum, outfits) => sum + Object.keys(outfits).length, 0),
    cgs: cgIds.length, requiredCGs: requiredCGs.size, reachableCGs: reachedCGs.size, cues: cueCount, assets: assets.size, expectedAssets, productionPNGs: productionFiles.length,
    portraits: [...portraitFiles].map(src => assets.get(src)),
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const report = inspectMedia();
  console.log(JSON.stringify({ ...report, portraits: report.portraits?.map(({ file, ...portrait }) => portrait) }, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
