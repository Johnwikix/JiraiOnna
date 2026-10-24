import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMedia } from '../scripts/check-media.js';

const report = inspectMedia();

test('实际媒体清单覆盖全部剧情背景与衣装，所有 CG 正文可达且产物和侧录完整', () => {
  assert.deepEqual(report.errors, [], report.errors.join('\n'));
  assert.ok(report.requiredBackgrounds > 0);
  assert.equal(report.backgrounds, report.requiredBackgrounds);
  assert.ok(report.requiredWardrobes > 0);
  assert.equal(report.wardrobes, report.requiredWardrobes);
  assert.ok(report.cgs > 0);
  assert.equal(report.cgs, report.requiredCGs);
  assert.equal(report.reachableCGs, report.cgs);
  assert.equal(report.assets, report.backgrounds + report.requiredWardrobes + report.cgs, '背景、衣装、CG 应分别指向独立产物');
  assert.equal(report.productionPNGs, report.assets, '所有生产图片均应登记且具备侧录');
  assert.ok(report.cues >= report.cgs);
});

test('全部衣装全身立绘含真实透明像素、透明四角和清晰主体', () => {
  assert.equal(report.portraits.length, report.requiredWardrobes);
  for (const portrait of report.portraits) {
    assert.ok(portrait.height > portrait.width, portrait.src);
    assert.ok(portrait.alpha, `${portrait.src} 缺少 RGBA 像素`);
    assert.equal(portrait.alpha.min, 0, portrait.src);
    assert.ok(portrait.alpha.max >= 250, portrait.src);
    assert.ok(portrait.alpha.corners.every(value => value <= 2), portrait.src);
    assert.ok(portrait.alpha.transparentRatio >= 0.15, portrait.src);
    assert.ok(portrait.alpha.opaqueRatio >= 0.03, portrait.src);
  }
});
