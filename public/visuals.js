import { resolveLine } from './engine.js';

export function getPortraitAsset(media, character, outfit = 'casual') {
  const entry = media.portraits?.[character];
  return typeof entry === 'string' ? entry : entry?.[outfit] || entry?.default || '';
}

export function getSceneCue(media, nodeId, line) {
  return media.scenes?.[nodeId]?.find(cue => line >= cue.from && line <= cue.to) || {};
}

export function getStagePortrait(media, nodeId, node, line, characters, flags = {}) {
  const cue = getSceneCue(media, nodeId, line);
  if (cue.cg || cue.hidePortrait) return null;
  if (cue.photo) {
    const { character:key, outfit } = cue.photo, src = getPortraitAsset(media, key, outfit);
    return src ? { key, outfit, src, mode:'photo', label:'手机里的照片' } : null;
  }
  for (let i = line; i >= 0; i--) {
    const { speaker } = resolveLine(node.lines[i], flags);
    if (speaker === '许砚') continue;
    const key = characters[speaker]?.portrait;
    if (!key) continue;
    if (node.remoteSpeakers?.includes(speaker)) return null;
    const outfit = cue.outfits?.[key] || node.outfits?.[key] || 'casual';
    const src = getPortraitAsset(media, key, outfit);
    return src ? { key, outfit, src, mode:'stage', label:speaker } : null;
  }
  return null;
}

// Derive memories from the existing read log so exports and older saves retain them.
export function getSeenCgs(media, readKeys) {
  const seen = new Set();
  for (const key of readKeys) {
    const [nodeId, index] = key.split(':'), line = Number(index);
    if (!Number.isInteger(line)) continue;
    const cue = getSceneCue(media, nodeId, line);
    if (cue.cg && media.cgs?.[cue.cg]) seen.add(cue.cg);
  }
  return seen;
}
