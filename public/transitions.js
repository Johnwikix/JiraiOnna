import { getSceneCue } from './visuals.js';

// Authored cuts, indexed against the unchanged 1.1 dialogue slots.
export const transitionLines = {
  'workday:0':'包塞进柜子以后，外面的风声听不见了。\n我在想今天能不能早点收工。',
  'makeover:0':'第二天下午，换好的衣服贴着后背。\n昨晚那些话还没散，我不太想再听一遍。',
  'jealousy:0':'隔了一夜，再走进店里，我先看了眼衣架。\n昨天那点不自在，还留在肩膀上。',
  'jealousyLie:0':'隔了一夜，我以为没接下去的话就算过去了。\n进店前，还是又看了一遍排班。',
  'dinner:0':'忙到收工，我只想快点赶上末班车。\n脚步出了后门，却没有一直快下去。',
  'dinner:5':'食券机前只剩我们两个。\n我想找句轻松的话，想了一路，还是没找到。',
  'river:0':'店门合上，热气留在了身后。\n我还在想刚才那句话，有没有说得太随便。',
  'riverMirror:0':'走到河边，店里的灯已经远了。\n刚才没说完的话，还在心里绕着。',
  'messages:0':'回国的行李收了又拆。\n我想借这几天喘口气，有些消息便迟迟没有点开。',
  'messages:1':'进门后，行李先放在了墙边。\n她问饿不饿，我这才觉得，这几天是真的不用赶着上班。',
  'messages:3':'三天过去，回程的车厢又晃了起来。\n我摸到外套里的饼干，才想起一直没看的工作消息。',
  'messagesReply:0':'回到房间，包还没放稳，我先拿出了手机。\n要解释的话太多，第一句反而写不出来。',
  'messagesReply:8':'隔天换上围裙，我还记得昨夜那张笑脸。\n走进店里，先看了看凛会不会提起照片。',
  'messagesSilence:2':'天亮了。我先摸到手机，又迟了一会儿才睁眼。\n昨晚没回的话，一句也没有少。',
  'incident:0':'接下来的两晚，店里照常忙。\n没有人再提照片，我竟也开始希望它就这样过去。',
  'aftermath:0':'第二晚，我在店门口多站了一会儿。\n昨天墙上的声音，比客人的笑声记得清楚。',
  'aftermathBlind:0':'第二晚，我照常去上班。\n进门前还在想，真说出来，会不会只有我记得那么重。',
  'aftermath:10':'回到公寓，钥匙还攥在手里。\n我把包里的纸都倒出来，想找到自己到底漏过了哪一步。',
  'departure1:8':'回去的车上，我把地址又念了一遍。\n有人陪着，我还是不敢先走到门前。',
  'morning:0':'天快亮时，我在车站找了个隔间。\n门一关上，才看见袖口和鞋子有多脏。',
  'river:13':'走到家，手里的纸巾袋已经空了。\n我把水烧上，想借着等水开的这几分钟，把她说的话理顺。',
  'riverMirror:11':'回到房间，我又把那张照片点开。\n越想看清拍照的人站在哪里，越不愿去想她为什么一直在那里。',
  'knock:0':'回到住处，我把没翻完的材料留在床边。\n眼睛闭上以后，心里还在算面试前剩下的时间。',
  'envelope:0':'回去的路上，我一直在摸口袋里的钥匙。\n门能打开，却不再让我觉得踏实。',
  'endDeparture:0':'两天里，我很少离开新住处。\n第三天要回店收东西，鞋带解开又系了一遍。',
  'rin1:0':'天已经亮了，昨晚却像还没结束。\n我记下学校说的时间，想先找个地方坐一会儿。',
  'rin1:1':'照着地址走到门口，我先隔着玻璃找她。\n看见那两杯饮料，脚步又慢了下来。',
  'rin3:0':'到了晚上，我换了一间临时住处。\n放下包时，先听了听窗外有没有脚步。',
  'rin4:0':'第二天傍晚，手机又响了。\n我看着店长的名字，已经有点不想接。',
  'endRinBad:0':'我跟她回去，一路都在想，拿到那封信就走。\n到了门前，才发现自己又得等她开门。',
  'endRinBad:4':'后来几天，我给能找到的人都打过电话。\n每次等接通，都先在心里重说一遍开头。',
  'endRinBad:5':'再去仓库时，手机贴着工装口袋震。\n我先去看还有多少电，才看今天要搬多少箱。',
  'endRinBad:7':'有天回去，我看见朋友又问了一遍地址。\n那几个字打得很快，我怕自己又拖到明天。',
  'endRinGood:4':'到了出发那天，我还是没把东西全带走。\n背带绕进掌心，勒紧一点，心里才稳一点。',
  'nana1:0':'走到便利店门口，我在玻璃上看见自己的脸。\n要问的话想了一路，进去前又咽回去一句。',
  'nana2:0':'等到傍晚，我又把那几条消息翻了一遍。\n一边盼她真能找到，一边怕她说找不到。',
  'nana3:0':'一周过去，几个日期被我改了又改。\n再去见七濑时，我仍没想好该先说哪一件事。',
  'nana3:2':'胶带没贴好，我还是先出了门。\n走到那张桌前，才发现她这次带来的纸比我想的多。',
  'nana4:0':'到了约好的下午，我比说好的时间早到了。\n文件袋被攥得发热，我换了只手拿。',
  'endNanaGood:2':'等到天快亮，店里的灯终于留在身后。\n坐下来才发现，两条腿都在发酸。',
  'endNanaGood:7':'四个月过去，我还是会先看一眼消息来自谁。\n这次是她的合同。我把照片放大，又看了一遍。',
  'shiori2:0':'下午再见她之前，我先查好了车次。\n明明只是去书店，出门时却又看了一遍手机。',
  'shiori3:0':'那天夜里，电话放下很久，我还坐在桌前。\n有些话说出了口，房间并没有马上安静下来。',
  'shiori3:1':'第二天下午，她把手机递过来。\n我还没看清内容，先注意到她握着手机的手。',
  'endShioriGood:3':'搬走以后，最初几次见面，我总会提前到。\n等得久一点，也比再让她一直看门好。',
  'endShioriGood:6':'入冬后，出门要多穿一件外套了。\n我把画册抱进怀里，去书店的路已经很熟。',
  'endShioriBad:4':'到了第二天，走廊的灯还是一样亮。\n我把手机握得发热，没再看几点了。',
  'qing2:0':'第二天，再拨那个号码前，我先把桌面收了一遍。\n其实不是怕她看见乱，只是不知道该怎么开口。',
  'qing3:0':'天黑以后，我坐回那张椅子。\n手机明明还没响，已经被我翻过来好几次。',
  'qing4:0':'出门打印前，我把能带上的材料都装进包。\n手头的事情做得越细，越怕电话里再漏掉一句。',
  'endQingGood:0':'回去的路上，我没再一遍遍改那段解释。\n见到她以前，反而比在电话里更紧张。',
  'endQingGood:5':'终于坐到同一张桌前，我才发现自己一直没松开肩膀。\n眼前的热气慢慢升起来，有句话又不急着说了。',
  'endQingBad:7':'隔天，我以为删掉的东西已经不会再来。\n屏幕亮起来，我还是下意识先看了一眼名字。',
  'endQingBad:8':'约好的时间一点点近了，我一直没把包拉上。\n窗外开始亮时，才发现那页画还压在膝上。',
  'dawn1:0':'再回店里之前，我把备份点开检查了一遍。\n已经确认过的东西，还是忍不住再确认。',
  'dawn2:0':'搬到新住处，去上班的路也换了。\n我拖着包找出口，暂时顾不上再看手机。',
  'dawn2:1':'收工回来，箱子还堆在墙边。\n我弯腰找充电线，坐下以后，才发现已经不想再起来。',
  'dawn2:6':'要搬走的东西都绑上了推车。\n我把路线再看一遍，怕又从一个没有电梯的出口绕出来。',
  'endDeparture:8':'柜子里的东西终于装回了包。\n新房间空得很，包落在地上，声音比我想的大。',
  'endNanaBad:6':'回去以后，我把事情从头想了一遍。\n想问的越来越多，手机却始终没亮。',
  'endNanaBad:8':'到了走的那天，行李比来时还乱。\n我推着它们往前走，没再回头找熟悉的脸。',
  'endCaptive:7':'不知道什么时候，水声停了，窗外渐渐亮起来。\n我坐着等她先睡，已经记不清等了多久。',
  'endDawn:2':'一个月后，日历上终于多了一个和排班无关的圈。\n出门前，我还是把车次又查了一遍。'
};

export function getTransition(previous, next, nodes, media) {
  if (!previous || next.ended || previous.nodeId === next.nodeId && previous.line === next.line) return null;
  const before = getSceneCue(media, previous.nodeId, previous.line);
  const after = getSceneCue(media, next.nodeId, next.line);
  const text = transitionLines[next.nodeId + ':' + next.line] || '';
  const moved = previous.nodeId !== next.nodeId;
  const backgroundChanged = (before.background || nodes[previous.nodeId].bg) !== (after.background || nodes[next.nodeId].bg);
  const cgChanged = (before.cg || '') !== (after.cg || '');
  return moved || backgroundChanged || cgChanged || text ? {text} : null;
}

export class TransitionPlayer {
  constructor(element, reducedMotion = false) {
    this.element = element;
    this.text = element.querySelector('span');
    this.reducedMotion = reducedMotion;
    this.version = 0;
    this.active = false;
    this.animations = [];
  }
  cancel() {
    this.version++;
    clearTimeout(this.timer);
    this.release?.();this.release = null;
    this.animations.splice(0).forEach(animation => animation.cancel());
    this.active = false;this.commit = null;this.done = null;
    this.element.hidden = true;this.element.style.opacity = '0';
    this.element.dataset.phase = '';this.text.textContent = '';
  }
  finish() {
    if (!this.active) return;
    const commit = this.commit, done = this.done;
    this.cancel();
    commit?.();done?.();
  }
  async fade(to, duration) {
    if (!duration) { this.element.style.opacity = String(to); return; }
    const animation = this.element.animate(
      [{opacity:this.element.style.opacity || '0'}, {opacity:to}],
      {duration,easing:'ease-out',fill:'forwards'}
    );
    this.animations.push(animation);
    try { await animation.finished; } catch { return; }
    this.element.style.opacity = String(to);
    animation.cancel();
    this.animations = this.animations.filter(value => value !== animation);
  }
  async play(text, commit, done, fast = false) {
    this.cancel();
    const version = this.version;
    this.active = true;this.commit = commit;this.done = done;
    this.element.hidden = false;this.element.dataset.phase = 'out';
    const duration = this.reducedMotion ? 0 : fast ? 45 : 180;
    await this.fade(1, duration);
    if (version !== this.version) return;
    this.element.dataset.phase = 'hold';this.text.textContent = text;
    const paint = this.commit;this.commit = null;paint?.();
    const hold = text ? fast ? 220 : Math.min(3200,900 + text.length * 38) : fast ? 35 : 100;
    await new Promise(resolve => { this.release=resolve;this.timer=setTimeout(resolve,hold); });
    this.release = null;
    if (version !== this.version) return;
    this.element.dataset.phase = 'in';
    await this.fade(0, duration);
    if (version !== this.version) return;
    this.finish();
  }
}

