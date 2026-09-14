const assert = require('assert'), fs = require('fs');
const { load } = require('./harness');
const { G, ctx, canvas, C, I } = load(900, 600);
// 1. runs 8 seconds of intro + play without throwing
let t = 0; for (let i = 0; i < 480; i++) { G.update(1 / 60); G.draw(); t += 1 / 60; }
assert(G.state === 'play', 'intro should end');
// 2. player walks
const x0 = G.player.x; I.keys.KeyD = true; for (let i = 0; i < 60; i++) { G.update(1 / 60); } I.keys.KeyD = false;
assert(G.player.x > x0 + 20, 'player should move right'); assert(G.player.facing === 1);
// 3. every posture renders for every archetype and every zoom stop
const archs = Object.keys(ctx.ARCHETYPES); let n = 0;
for (const z of [2.4, 1, .42, .12, .035]) for (const a of archs) for (const p of Object.keys(ctx.POSTURES)) {
  const act = new ctx.Actor(ctx.genCharacter(n++, a)); act.setEmote(p, 5); act.update(.5); act.update(.5);
  const c2 = canvas.getContext('2d'); c2.save(); ctx.inkW(z); act.draw(c2, z); c2.restore();
}
// 4. 400 random characters render without throwing (hats, hair, accessories)
for (let i = 0; i < 400; i++) { const act = new ctx.Actor(ctx.genCharacter(50000 + i)); act.update(.2); act.draw(canvas.getContext('2d'), 1); }
// 5. camera zoom stops
C.setStop(4); for (let i = 0; i < 120; i++) G.update(1 / 60); assert(C.zoom < .08, 'zoomed to district'); G.draw();
C.setStop(1); for (let i = 0; i < 120; i++) G.update(1 / 60); assert(Math.abs(C.zoom - 1) < .05);
// 6. emote + talk
G.emote('armsUp'); G.update(.5); assert(G.player.emote && G.player.emote.name === 'armsUp'); assert(G.player.exprName === 'confused');
G.player.x = G.cartMan.x - 40; G.player.y = G.cartMan.y; G.talk(); assert(G.cartMan.speech, 'cart man should talk');
// 7. time of day palettes
for (let h = 0; h < 24; h += .5) { const p = ctx.dayPalette(h); assert(/^#[0-9a-f]{6}$/.test(p.skyTop)); }
console.log('test1 ok');
