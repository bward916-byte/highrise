// ===== world: the city =====
const GROUND = 0;            // sidewalk back edge (buildings sit here)
const WALK_DEPTH = 42;       // sidewalk depth the player can move within
const ROAD_Y = GROUND + WALK_DEPTH + 6, ROAD_H = 96;
const TOWER = { x: -320, w: 640, floors: 92, name: 'Meridian Tower' };
TOWER.h = TOWER.floors * FLOOR_H;
const FACADE = {
  glass:    { base: '#7f9bb6', win: '#b9d0e3', lit: '#ffe4a8', ink: .9 },
  concrete: { base: '#b3ada2', win: '#6c7a88', lit: '#ffd98c', ink: 1 },
  brick:    { base: '#9c5a45', win: '#5f6a75', lit: '#ffcf85', ink: 1 },
  stone:    { base: '#c9c0ae', win: '#6a7480', lit: '#ffe0a0', ink: 1 },
  dark:     { base: '#3f4653', win: '#8ea2b8', lit: '#ffdd9a', ink: .8 },
  tan:      { base: '#d4b98c', win: '#5b6673', lit: '#ffd88a', ink: 1 },
};
function hash2(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; h ^= h >> 16; return (h >>> 0) / 4294967296; }

// Buildings in a row, side view. x ranges, with gaps for alley & streets.
function buildCity() {
  const r = RNG(1983), B = [];
  const add = (x, w, floors, style, extra) => { const b = Object.assign({ x, w, floors, h: floors * FLOOR_H, style, cols: Math.max(2, Math.round(w / 64)), roof: r.pick(['flat', 'tank', 'ac', 'antenna', 'flat']), id: B.length }, extra); B.push(b); return b; };
  // left of tower
  let x = TOWER.x - 60;
  for (let i = 0; i < 9; i++) { const w = r.int(180, 420), f = r.int(6, 38); x -= w; add(x, w, f, r.pick(Object.keys(FACADE))); x -= r.int(0, 14); }
  // the tower
  add(TOWER.x, TOWER.w, TOWER.floors, 'glass', { tower: true, name: TOWER.name, cols: 10 });
  // alley then neighbours
  const alleyX = TOWER.x + TOWER.w, alleyW = 150;
  x = alleyX + alleyW;
  for (let i = 0; i < 10; i++) { const w = r.int(180, 420), f = r.int(5, 34); add(x, w, f, r.pick(Object.keys(FACADE))); x += w + r.int(0, 14); }
  const cityEnd = x, cityStart = B.reduce((m, b) => Math.min(m, b.x), 1e9);
  // backdrop skyline (parallax, drawn lighter)
  const back = []; let bx = cityStart - 14000;
  while (bx < cityEnd + 14000) { const w = r.int(140, 520), f = r.int(8, 70); back.push({ x: bx, w, h: f * FLOOR_H, style: r.pick(['dark', 'glass', 'concrete']), cols: Math.round(w / 70) }); bx += w + r.int(20, 120); }
  return { buildings: B, alley: { x: alleyX, w: alleyW }, back, x0: cityStart, x1: cityEnd };
}

// ---------- drawing ----------
function drawSky(ctx, pal, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, cam.h);
  // higher camera => darker top (thin air)
  const alt = clamp(-cam.y / 12000, 0, 1);
  g.addColorStop(0, mix(pal.skyTop, '#050814', alt * .7)); g.addColorStop(1, pal.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cam.w, cam.h);
  // sun / moon
  const hr = pal.hour, sunA = ((hr - 6) / 12) * Math.PI;
  if (hr > 5.5 && hr < 18.5) { const sx = cam.w * (.15 + .7 * (hr - 6) / 12), sy = cam.h * .75 - Math.sin(sunA) * cam.h * .6; ctx.fillStyle = mix('#fff2c0', '#ff9a4a', 1 - Math.sin(sunA)); ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  if (pal.night > .3) {
    ctx.fillStyle = '#f5f0d8'; ctx.globalAlpha = pal.night;
    for (let i = 0; i < 70; i++) { const sx = hash2(i, 7) * cam.w, sy = hash2(i, 11) * cam.h * .6; ctx.fillRect(sx, sy, 1.5, 1.5); }
    ctx.beginPath(); ctx.arc(cam.w * .8, cam.h * .18, 20, 0, TAU); ctx.fill(); ctx.fillStyle = mix(pal.skyTop, '#000', .2); ctx.beginPath(); ctx.arc(cam.w * .8 - 9, cam.h * .18 - 4, 17, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  // clouds (inked, slow drift)
  ctx.globalAlpha = .85 * (1 - pal.night * .7); const t = (typeof Game !== 'undefined' ? Game.clock : 0) * 6;
  for (let i = 0; i < 5; i++) { const cx = ((hash2(i, 3) * cam.w * 1.5 + t * (.4 + hash2(i, 5))) % (cam.w * 1.5)) - cam.w * .25, cy = cam.h * (.1 + hash2(i, 9) * .3), s = 40 + hash2(i, 2) * 60;
    ctx.fillStyle = mix(pal.skyBot, '#fff', .7); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, s * .5, 0, TAU); ctx.arc(cx + s * .55, cy - s * .1, s * .42, 0, TAU); ctx.arc(cx + s * 1.05, cy + s * .05, s * .38, 0, TAU); ctx.arc(cx + s * .5, cy + s * .25, s * .4, 0, TAU); ctx.fill(); ctx.globalAlpha *= .5; ctx.stroke(); ctx.globalAlpha /= .5; }
  ctx.globalAlpha = 1;
}
function drawBackdrop(ctx, city, cam, pal) {
  // parallax: move at 0.35 of camera in x, 0.5 in y
  ctx.save();
  const px = cam.x * .35, py = cam.y;
  ctx.translate(cam.w / 2, cam.h / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-px, -py + GROUND * 0);
  const b = cam.bounds(); const haze = mix(pal.skyBot, '#6f7c8c', .5);
  ctx.globalAlpha = .55;
  for (const k of city.back) {
    if (k.x + k.w < px - cam.w / cam.zoom || k.x > px + cam.w / cam.zoom) continue;
    ctx.fillStyle = mix(haze, FACADE[k.style].base, .35); ctx.fillRect(k.x, -k.h, k.w, k.h);
    if (cam.zoom > .06 && pal.night > .2) { ctx.fillStyle = '#ffe0a0'; ctx.globalAlpha = .35 * pal.night; const rows = Math.floor(k.h / FLOOR_H); for (let f = 0; f < rows; f += 2) for (let c = 0; c < k.cols; c++) if (hash2(k.x + c, f) < .4) ctx.fillRect(k.x + 10 + c * (k.w / k.cols), -f * FLOOR_H - FLOOR_H * .6, 10, 12); ctx.globalAlpha = .55; }
  }
  ctx.restore();
}
function drawBuilding(ctx, b, pal, zoom, isPlayerFloor) {
  const F = FACADE[b.style], tint = pal.tint, tk = pal.tintK;
  const base = mix(F.base, tint, tk * .8), win = mix(F.win, tint, tk * .6), lit = F.lit;
  const ink = Math.max(1.2, 1 / zoom);
  ctx.fillStyle = base; ctx.fillRect(b.x, -b.h, b.w, b.h);
  // depth hatch on the shadow side + vertical ink edge
  ctx.strokeStyle = INK; ctx.lineWidth = ink; ctx.strokeRect(b.x, -b.h, b.w, b.h);
  const winW = b.w / b.cols;
  const detail = FLOOR_H * zoom;      // screen px per floor
  if (detail < 2.2) {
    // far LOD: horizontal banding only
    ctx.fillStyle = win; ctx.globalAlpha = .5; for (let f = 0; f < b.floors; f += 3) ctx.fillRect(b.x + winW * .2, -f * FLOOR_H - FLOOR_H * 1.6, b.w - winW * .4, FLOOR_H * 1.2); ctx.globalAlpha = 1;
    if (pal.night > .3) { ctx.fillStyle = lit; ctx.globalAlpha = pal.night * .6; for (let f = 0; f < b.floors; f += 2) for (let c = 0; c < b.cols; c++) if (hash2(b.id * 97 + c, f) < pal.glow) ctx.fillRect(b.x + c * winW + winW * .25, -f * FLOOR_H - FLOOR_H * .7, winW * .5, FLOOR_H * .45); ctx.globalAlpha = 1; }
  } else {
    const wW = winW * .55, wH = FLOOR_H * .5, ox = winW * .225, oy = FLOOR_H * .3;
    const style = b.style;
    for (let f = 0; f < b.floors; f++) {
      const y = -f * FLOOR_H - FLOOR_H + oy;
      if (f === 0 && !b.tower) continue; // ground floor handled by storefront
      for (let c = 0; c < b.cols; c++) {
        const x = b.x + c * winW + ox;
        const on = hash2(b.id * 97 + c, f) < pal.glow || (isPlayerFloor && f === PLAYER_FLOOR - 1 && c === 3);
        ctx.fillStyle = on ? lit : win; ctx.fillRect(x, y, wW, wH);
        if (detail > 9) { ctx.strokeStyle = INK; ctx.lineWidth = ink * .7; ctx.strokeRect(x, y, wW, wH); if (style === 'glass') { ctx.beginPath(); ctx.moveTo(x, y + wH * .5); ctx.lineTo(x + wW, y + wH * .5); ctx.stroke(); } }
        if (detail > 20 && !on && hash2(c + 3, f + b.id) < .25) { ctx.fillStyle = shade(win, .75); ctx.fillRect(x, y, wW, wH * .45); } // blinds
      }
      if (style === 'brick' && detail > 14) { ctx.strokeStyle = INK; ctx.globalAlpha = .18; ctx.lineWidth = ink * .5; ctx.beginPath(); ctx.moveTo(b.x, y - oy + FLOOR_H); ctx.lineTo(b.x + b.w, y - oy + FLOOR_H); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    if (style === 'glass' && detail > 6) { ctx.strokeStyle = INK; ctx.globalAlpha = .25; ctx.lineWidth = ink * .6; ctx.beginPath(); for (let c = 1; c < b.cols; c++) { ctx.moveTo(b.x + c * winW, -b.h); ctx.lineTo(b.x + c * winW, 0); } ctx.stroke(); ctx.globalAlpha = 1; }
  }
  // shadow side hatch
  ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = INK; ctx.fillRect(b.x + b.w - Math.min(14, b.w * .06), -b.h, Math.min(14, b.w * .06), b.h); ctx.restore();
  // roof stuff
  if (zoom > .06) {
    ctx.fillStyle = shade(base, .8); ctx.strokeStyle = INK; ctx.lineWidth = ink;
    if (b.roof === 'tank') { ctx.beginPath(); ctx.rect(b.x + b.w * .6, -b.h - 60, 36, 44); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(b.x + b.w * .6, -b.h - 60); ctx.lineTo(b.x + b.w * .6 + 18, -b.h - 76); ctx.lineTo(b.x + b.w * .6 + 36, -b.h - 60); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(b.x + b.w * .6 + 6, -b.h - 16); ctx.lineTo(b.x + b.w * .6 + 6, -b.h); ctx.moveTo(b.x + b.w * .6 + 30, -b.h - 16); ctx.lineTo(b.x + b.w * .6 + 30, -b.h); ctx.stroke(); }
    if (b.roof === 'ac') for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(b.x + 20 + i * 44, -b.h - 18, 30, 18); ctx.fill(); ctx.stroke(); }
    if (b.roof === 'antenna' || b.tower) { ctx.beginPath(); ctx.moveTo(b.x + b.w * .5, -b.h); ctx.lineTo(b.x + b.w * .5, -b.h - (b.tower ? 260 : 70)); ctx.stroke(); if (b.tower) { ctx.fillStyle = pal.night > .3 ? '#ff3a3a' : '#b0413e'; ctx.beginPath(); ctx.arc(b.x + b.w * .5, -b.h - 262, 5, 0, TAU); ctx.fill(); } }
    ctx.beginPath(); ctx.rect(b.x - 4, -b.h - 6, b.w + 8, 8); ctx.fill(); ctx.stroke(); // parapet
  }
  // ground floor
  if (zoom > .1) drawGroundFloor(ctx, b, pal, zoom, base, win, ink);
}
function drawGroundFloor(ctx, b, pal, zoom, base, win, ink) {
  const gh = FLOOR_H * 1.15;
  ctx.fillStyle = shade(base, .9); ctx.fillRect(b.x, -gh, b.w, gh); ctx.strokeStyle = INK; ctx.lineWidth = ink; ctx.strokeRect(b.x, -gh, b.w, gh);
  if (b.tower) {
    // glass lobby with double doors and canopy
    ctx.fillStyle = mix('#a9c4d8', pal.tint, pal.tintK * .5); ctx.fillRect(b.x + 20, -gh + 12, b.w - 40, gh - 12); ctx.strokeRect(b.x + 20, -gh + 12, b.w - 40, gh - 12);
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(b.x + 20 + (b.w - 40) * i / 8, -gh + 12); ctx.lineTo(b.x + 20 + (b.w - 40) * i / 8, 0); ctx.stroke(); }
    const dx = b.x + b.w / 2 - 44; ctx.fillStyle = '#e8e0d0'; ctx.fillRect(dx, -FLOOR_H * .95, 88, FLOOR_H * .95); ctx.strokeRect(dx, -FLOOR_H * .95, 88, FLOOR_H * .95); ctx.beginPath(); ctx.moveTo(dx + 44, -FLOOR_H * .95); ctx.lineTo(dx + 44, 0); ctx.stroke();
    ctx.fillStyle = '#2b2f3a'; ctx.fillRect(b.x + b.w / 2 - 110, -gh - 6, 220, 12); ctx.strokeRect(b.x + b.w / 2 - 110, -gh - 6, 220, 12);
    ctx.fillStyle = PAPER; ctx.font = `bold ${16}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2, -gh + 3);
    ctx.fillStyle = INK; ctx.fillRect(b.x + b.w / 2 - 44, -FLOOR_H * .95, 3, FLOOR_H * .95);
    b.door = { x: dx, w: 88 };
  } else {
    // storefronts: awning, window, door
    const n = Math.max(1, Math.round(b.w / 200)); const sw = b.w / n;
    for (let i = 0; i < n; i++) {
      const x = b.x + i * sw; const col = ['#b0413e', '#3e8a5b', '#2f6f9f', '#d9b23a', '#5a4a9f', '#2a8a8a'][Math.floor(hash2(b.id, i) * 6)];
      ctx.fillStyle = mix('#9fb3c4', pal.tint, pal.tintK * .5); ctx.fillRect(x + 14, -gh + 34, sw * .55, gh - 48); ctx.strokeRect(x + 14, -gh + 34, sw * .55, gh - 48);
      ctx.fillStyle = shade(col, .8); ctx.fillRect(x + sw * .72, -FLOOR_H * .85, 40, FLOOR_H * .85); ctx.strokeRect(x + sw * .72, -FLOOR_H * .85, 40, FLOOR_H * .85); ctx.fillStyle = INK; ctx.fillRect(x + sw * .72 + 30, -FLOOR_H * .42, 5, 3);
      if (hash2(i, b.id + 5) < .7) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + 6, -gh + 34); ctx.lineTo(x + sw - 6, -gh + 34); ctx.lineTo(x + sw - 16, -gh + 10); ctx.lineTo(x + 16, -gh + 10); ctx.closePath(); ctx.fill(); ctx.stroke(); for (let s = 0; s < 6; s++) { ctx.beginPath(); ctx.moveTo(x + 16 + (sw - 32) * s / 6, -gh + 10); ctx.lineTo(x + 6 + (sw - 12) * s / 6, -gh + 34); ctx.stroke(); } }
      if (pal.night > .3) { ctx.fillStyle = '#ffd98c'; ctx.globalAlpha = pal.night * .5; ctx.fillRect(x + 14, -gh + 34, sw * .55, gh - 48); ctx.globalAlpha = 1; }
    }
  }
}
function drawAlley(ctx, city, pal, zoom) {
  const a = city.alley, gh = FLOOR_H * 1.15;
  // dark recess between tower and neighbour
  ctx.fillStyle = mix('#2a2a30', pal.tint, pal.tintK * .5); ctx.fillRect(a.x, -gh * 1.3, a.w, gh * 1.3);
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1 / zoom); ctx.strokeRect(a.x, -gh * 1.3, a.w, gh * 1.3);
  hatch(ctx, a.x + 4, -gh * 1.25, a.w * .5, gh * 1.2, 8, .5, .35);
  // dumpster, fire escape, boxes
  ctx.fillStyle = '#3e6a5b'; ctx.beginPath(); ctx.roundRect(a.x + 10, -52, 62, 52, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2f5548'; ctx.fillRect(a.x + 8, -58, 66, 10); ctx.strokeRect(a.x + 8, -58, 66, 10);
  ctx.strokeStyle = INK; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(a.x + 20, -gh * 1.3 + 20 + i * 30); ctx.lineTo(a.x + a.w - 20, -gh * 1.3 + 20 + i * 30); ctx.stroke(); }
  ctx.fillStyle = '#b0413e'; ctx.beginPath(); ctx.rect(a.x + 88, -13, 26, 13); ctx.fill(); ctx.stroke(); hatch(ctx, a.x + 90, -11, 22, 9, 3, 0, .5);
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(a.x + a.w - 44, -28, 30, 28); ctx.strokeRect(a.x + a.w - 44, -28, 30, 28); ctx.fillRect(a.x + a.w - 40, -50, 24, 22); ctx.strokeRect(a.x + a.w - 40, -50, 24, 22);
}
function drawStreet(ctx, city, pal, zoom, cam) {
  const b = cam.bounds(), x0 = Math.max(b.x0, city.x0 - 4000), x1 = Math.min(b.x1, city.x1 + 4000);
  // sidewalk
  ctx.fillStyle = mix('#c4bcae', pal.tint, pal.tintK * .7); ctx.fillRect(x0, GROUND, x1 - x0, WALK_DEPTH + 6);
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1 / zoom); ctx.beginPath(); ctx.moveTo(x0, GROUND); ctx.lineTo(x1, GROUND); ctx.moveTo(x0, ROAD_Y); ctx.lineTo(x1, ROAD_Y); ctx.stroke();
  if (zoom > .3) { ctx.globalAlpha = .35; ctx.beginPath(); for (let x = Math.floor(x0 / 96) * 96; x < x1; x += 96) { ctx.moveTo(x, GROUND); ctx.lineTo(x - 10, ROAD_Y); } ctx.stroke(); ctx.globalAlpha = 1; }
  // road
  ctx.fillStyle = mix('#4c5058', pal.tint, pal.tintK * .5); ctx.fillRect(x0, ROAD_Y, x1 - x0, ROAD_H);
  ctx.strokeStyle = '#e8d98a'; ctx.lineWidth = 3; ctx.setLineDash([40, 30]); ctx.beginPath(); ctx.moveTo(x0, ROAD_Y + ROAD_H / 2); ctx.lineTo(x1, ROAD_Y + ROAD_H / 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = mix('#a9a396', pal.tint, pal.tintK * .7); ctx.fillRect(x0, ROAD_Y + ROAD_H, x1 - x0, 30);
  ctx.fillStyle = mix('#2f2b28', pal.tint, pal.tintK * .4); ctx.fillRect(b.x0 - 10, ROAD_Y + ROAD_H + 30, b.x1 - b.x0 + 20, 40000); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x0, ROAD_Y + ROAD_H); ctx.lineTo(x1, ROAD_Y + ROAD_H); ctx.stroke();
  // street furniture along the sidewalk back edge
  if (zoom > .18) for (let x = Math.floor(x0 / 420) * 420; x < x1; x += 420) {
    const k = hash2(x, 1);
    if (k < .5) { // lamp post
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, ROAD_Y - 4); ctx.lineTo(x, -150); ctx.quadraticCurveTo(x, -178, x + 26, -176); ctx.stroke();
      ctx.fillStyle = pal.night > .3 ? '#ffe9a8' : '#e8e3d6'; ctx.beginPath(); ctx.ellipse(x + 30, -172, 12, 7, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      if (pal.night > .3) { ctx.globalAlpha = .12 * pal.night; ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.moveTo(x + 30, -165); ctx.lineTo(x - 70, 40); ctx.lineTo(x + 130, 40); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    } else if (k < .7) { // tree in grate
      ctx.strokeStyle = INK; ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.moveTo(x - 5, ROAD_Y - 6); ctx.lineTo(x - 3, -70); ctx.lineTo(x + 3, -70); ctx.lineTo(x + 5, ROAD_Y - 6); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = mix('#4f8a4a', pal.tint, pal.tintK * .5); ctx.beginPath(); ctx.arc(x, -100, 34, 0, TAU); ctx.arc(x - 22, -80, 24, 0, TAU); ctx.arc(x + 24, -84, 26, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (k < .82) { // hydrant
      ctx.fillStyle = '#b0413e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x - 6, ROAD_Y - 30, 12, 26, 3); ctx.fill(); ctx.stroke(); ctx.fillRect(x - 10, ROAD_Y - 18, 20, 5); ctx.strokeRect(x - 10, ROAD_Y - 18, 20, 5);
    } else if (k < .92) { // bench
      ctx.fillStyle = '#6b4726'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.fillRect(x - 30, 8, 60, 6); ctx.strokeRect(x - 30, 8, 60, 6); ctx.fillRect(x - 30, -4, 60, 5); ctx.strokeRect(x - 30, -4, 60, 5); ctx.beginPath(); ctx.moveTo(x - 26, 14); ctx.lineTo(x - 26, 26); ctx.moveTo(x + 26, 14); ctx.lineTo(x + 26, 26); ctx.stroke();
    } else { // trash can
      ctx.fillStyle = '#3d4150'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x - 9, ROAD_Y - 32, 18, 30, 2); ctx.fill(); ctx.stroke(); hatch(ctx, x - 7, ROAD_Y - 28, 14, 22, 4, 0, .3);
    }
  }
}
// ---------- cars ----------
const CAR_COL = ['#b0413e', '#e8e3d6', '#2b2f3a', '#3d4150', '#2f6f9f', '#d9b23a', '#8a8e96', '#3e8a5b', '#5a4a3a'];
class Car {
  constructor(lane, x, seed) { const r = RNG(seed); this.lane = lane; this.x = x; this.dir = lane === 0 ? -1 : 1; this.v = r.range(180, 300); this.col = r.pick(CAR_COL); this.kind = r.weighted([['sedan', 5], ['suv', 3], ['taxi', 2], ['van', 1.5], ['truck', .7]]); if (this.kind === 'taxi') this.col = '#e8c22a'; this.len = this.kind === 'truck' ? 150 : this.kind === 'van' ? 120 : 100; }
  get y() { return this.lane === 0 ? ROAD_Y + ROAD_H * .3 : ROAD_Y + ROAD_H * .78; }
  update(dt, x0, x1) { this.x += this.v * this.dir * dt; if (this.dir > 0 && this.x > x1) this.x = x0 - 200; if (this.dir < 0 && this.x < x0) this.x = x1 + 200; }
  draw(ctx, pal, zoom) {
    const L = this.len, s = this.lane === 0 ? .86 : 1;
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.dir * s, s);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1.2 / zoom); ctx.lineJoin = 'round';
    ctx.fillStyle = mix(this.col, pal.tint, pal.tintK * .5); ctx.beginPath();
    if (this.kind === 'sedan' || this.kind === 'taxi') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -18); ctx.lineTo(-L * .3, -22); ctx.lineTo(-L * .2, -38); ctx.lineTo(L * .2, -38); ctx.lineTo(L * .32, -22); ctx.lineTo(L / 2, -18); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'suv') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -24); ctx.lineTo(-L * .3, -28); ctx.lineTo(-L * .25, -44); ctx.lineTo(L * .3, -44); ctx.lineTo(L * .4, -28); ctx.lineTo(L / 2, -24); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'van') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -46); ctx.lineTo(L * .3, -46); ctx.lineTo(L * .45, -28); ctx.lineTo(L / 2, -20); ctx.lineTo(L / 2, 0); }
    else { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -52); ctx.lineTo(L * .25, -52); ctx.lineTo(L * .25, -40); ctx.lineTo(L * .4, -40); ctx.lineTo(L / 2, -22); ctx.lineTo(L / 2, 0); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // windows
    ctx.fillStyle = mix('#b9d0e3', pal.skyBot, .4);
    if (this.kind === 'sedan' || this.kind === 'taxi') { ctx.beginPath(); ctx.moveTo(-L * .27, -23); ctx.lineTo(-L * .18, -35); ctx.lineTo(L * .18, -35); ctx.lineTo(L * .28, -23); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, -35); ctx.stroke(); }
    else if (this.kind === 'suv') { ctx.beginPath(); ctx.moveTo(-L * .27, -29); ctx.lineTo(-L * .22, -41); ctx.lineTo(L * .27, -41); ctx.lineTo(L * .35, -29); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(L * .26, -43); ctx.lineTo(L * .38, -30); ctx.lineTo(L * .26, -30); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (this.kind === 'taxi') { ctx.fillStyle = INK; ctx.fillRect(-14, -46, 28, 8); ctx.fillStyle = PAPER; ctx.font = `bold 7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, -39); }
    // wheels
    ctx.fillStyle = INK; for (const wx of [-L * .3, L * .3]) { ctx.beginPath(); ctx.arc(wx, 0, 11, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a8e96'; ctx.beginPath(); ctx.arc(wx, 0, 5, 0, TAU); ctx.fill(); ctx.fillStyle = INK; }
    // lights
    ctx.fillStyle = pal.night > .3 ? '#fff6c0' : '#e8e3d6'; ctx.fillRect(L / 2 - 6, -16, 6, 5); ctx.fillStyle = '#c0392b'; ctx.fillRect(-L / 2, -16, 6, 5);
    if (pal.night > .3) { ctx.globalAlpha = .15 * pal.night; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.moveTo(L / 2, -16); ctx.lineTo(L / 2 + 120, -30); ctx.lineTo(L / 2 + 120, 6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}
