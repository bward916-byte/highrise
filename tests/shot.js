const fs = require('fs'); const { load } = require('./harness');
const { G, ctx, canvas, C } = load(1200, 700);
for (let i = 0; i < 480; i++) { G.update(1 / 60); }
const shot = (name, z, y, hour) => { if (hour !== undefined) G.clock = hour; C.snapTo(G.player.x, y === undefined ? G.player.y - 700*.22/z : y, z); C.tzoom = z; G.update(1/60); G.draw(); fs.writeFileSync('/home/claude/highrise/shots/' + name + '.png', canvas.toBuffer('image/png')); };
fs.mkdirSync('/home/claude/highrise/shots', { recursive: true });
G.player.x = G.cartMan.x - 60; G.player.setEmote('armsUp', 9); G.player.say('What is going on?!', 9); G.cartMan.say('You again.', 9); for(let k=0;k<20;k++) G.update(1/60);
shot('close', 2.4);
shot('street', 1.0);
shot('block', .42, -200, 19.5);
C.snapTo(ctx.TOWER.x + 320, -ctx.TOWER.h/2 + 900, .06); C.tzoom=.06; G.clock = 21; G.draw(); fs.writeFileSync('/home/claude/highrise/shots/district.png', canvas.toBuffer('image/png'));
// emote sheet
const { createCanvas } = require('canvas'); const cv = createCanvas(1400, 520), cx = cv.getContext('2d'); cx.fillStyle = '#efe8d8'; cx.fillRect(0,0,1400,520);
const names = Object.keys(ctx.POSTURES); ctx.inkW(2);
names.forEach((p, i) => { const a = new ctx.Actor(ctx.genPlayer()); a.setEmote(p, 9); for (let k=0;k<40;k++) a.update(.05); a.x = 60 + (i % 10) * 135; a.y = 220 + Math.floor(i/10) * 240; cx.save(); cx.translate(a.x, a.y); cx.scale(2,2); cx.translate(-a.x,-a.y); a.draw(cx, 2); cx.restore(); cx.fillStyle='#1c1a17'; cx.font='16px sans-serif'; cx.textAlign='center'; cx.fillText(p, a.x, a.y + 20); });
fs.writeFileSync('/home/claude/highrise/shots/emotes.png', cv.toBuffer('image/png'));
// crowd sheet
const cv2 = createCanvas(1400, 800), c2 = cv2.getContext('2d'); c2.fillStyle = '#efe8d8'; c2.fillRect(0,0,1400,800); ctx.inkW(2);
for (let i = 0; i < 40; i++) { const a = new ctx.Actor(ctx.genCharacter(9000 + i)); a.x = 70 + (i % 10) * 135; a.y = 190 + Math.floor(i/10) * 195; a.vx = 40; for (let k=0;k<20;k++) a.update(.05); c2.save(); c2.translate(a.x,a.y); c2.scale(1.7,1.7); c2.translate(-a.x,-a.y); a.draw(c2, 1.7); c2.restore(); c2.fillStyle='#1c1a17'; c2.font='12px sans-serif'; c2.textAlign='center'; c2.fillText(a.spec.arch + ' ' + a.spec.hat + ' ' + a.spec.hair.style, a.x, a.y + 16); }
fs.writeFileSync('/home/claude/highrise/shots/crowd.png', cv2.toBuffer('image/png'));
console.log('shots done');
