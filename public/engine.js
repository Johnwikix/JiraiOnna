export const SAVE_VERSION = 1;
export const STORY_VERSION = '1.1.0';

export function resolveLine(line, flags = {}) {
  const variant=line.variants?.find(v=>Object.entries(v.when).every(([key,value])=>flags[key]===value));
  return {speaker:variant?.speaker||line.speaker,text:variant?.text??line.text};
}

export function getReadKey(nodeId, index, node, flags = {}) {
  const line=resolveLine(node.lines[index],flags),text=`${line.speaker}\n${line.text}`;
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return `${nodeId}:${index}:${(hash>>>0).toString(16)}`;
}

export function createState(start = 'prologue') {
  return { version: SAVE_VERSION, storyVersion: STORY_VERSION, nodeId: start, line: 0, flags: {}, trail: [], visited: [start], ended: false };
}

export function resolveTarget(target, flags) {
  if (typeof target === 'string') return target;
  return target.find(rule => !rule.when || Object.entries(rule.when).every(([key, value]) => flags[key] === value))?.to;
}

export function advance(state, nodes) {
  const node = nodes[state.nodeId];
  if (state.ended) return state;
  if (state.line < node.lines.length - 1) return { ...state, line: state.line + 1 };
  if (node.ending) return { ...state, ended: true };
  if (node.choices) return state;
  return enter(state, resolveTarget(node.next, state.flags), nodes, null);
}

function enter(state, target, nodes, choice) {
  if (!nodes[target]) throw new Error(`未知剧情节点：${target}`);
  return { ...state, nodeId: target, line: 0, ended: false,
    trail: [...state.trail, { nodeId: state.nodeId, choice }],
    visited: state.visited.includes(target) ? state.visited : [...state.visited, target] };
}

export function choose(state, index, nodes) {
  const node = nodes[state.nodeId];
  if (state.ended || state.line !== node.lines.length - 1) throw new Error('尚未到达选择点');
  const choice = node.choices?.[index];
  if (!choice) throw new Error('无效选项');
  const flags = { ...state.flags, ...choice.set };
  return enter({ ...state, flags }, resolveTarget(choice.next, flags), nodes, index);
}

export function validateState(value, nodes) {
  if (!value || value.version !== SAVE_VERSION || value.storyVersion !== STORY_VERSION || !nodes[value.nodeId]) return false;
  if (!Number.isInteger(value.line) || value.line < 0 || value.line >= nodes[value.nodeId].lines.length) return false;
  if (typeof value.ended !== 'boolean' || !value.flags || typeof value.flags !== 'object' || Array.isArray(value.flags)) return false;
  if (Object.keys(value.flags).length > 40 || Object.values(value.flags).some(v => ![0, 1].includes(v))) return false;
  if (!Array.isArray(value.trail) || value.trail.length > 200 || !Array.isArray(value.visited) || value.visited.length > 200) return false;
  if (value.visited.some(id => typeof id !== 'string' || !nodes[id])) return false;
  if (value.trail.some(item => !item || !nodes[item.nodeId] || (item.choice !== null && (!Number.isInteger(item.choice) || !nodes[item.nodeId].choices?.[item.choice])))) return false;
  if (value.ended && !nodes[value.nodeId].ending) return false;
  // Replay the route: imported saves must describe a real sequence of choices.
  let replay = createState();
  try {
    for (const item of value.trail) {
      if (item.nodeId !== replay.nodeId) return false;
      replay = { ...replay, line: nodes[replay.nodeId].lines.length - 1 };
      replay = item.choice === null ? advance(replay, nodes) : choose(replay, item.choice, nodes);
    }
    return replay.nodeId === value.nodeId && JSON.stringify(replay.flags) === JSON.stringify(value.flags) && JSON.stringify(replay.visited) === JSON.stringify(value.visited);
  } catch { return false; }
}

export function getBacklog(state, nodes) {
  const displayed=lines=>lines.map(line=>resolveLine(line,state.flags));
  return [...state.trail.map(item => ({ nodeId: item.nodeId, choice: item.choice, lines: displayed(nodes[item.nodeId].lines) })),
    { nodeId: state.nodeId, choice: null, lines: displayed(nodes[state.nodeId].lines.slice(0, state.line + 1)) }];
}
