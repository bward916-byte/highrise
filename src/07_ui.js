// ===== UI / HUD =====
const EMOTES = [
  { key: '1', name: 'armsUp', label: 'Huh?' }, { key: '2', name: 'headDown', label: 'Sad' }, { key: '3', name: 'shrug', label: 'Shrug' },
  { key: '4', name: 'wave', label: 'Wave' }, { key: '5', name: 'think', label: 'Hmm' }, { key: '6', name: 'point', label: 'Point' },
  { key: '7', name: 'cheer', label: 'Yes!' }, { key: '8', name: 'facepalm', label: 'Ugh' }, { key: '9', name: 'nod', label: 'Nod' }, { key: '0', name: 'no', label: 'No' },
];
const UI = {
  buttons: [], hint: '', hintT: 0, toast: null, panelOpen: false,
  setHint(t, dur) { this.hint = t; this.hintT = dur || 2.5; },
  say(t, dur) { this.toast = { t, life: dur || 3 }; },
  update(dt) { if (this.hintT > 0) this.hintT -= dt; if (this.toast) { this.toast.life -= dt; if (this.toast.life <= 0) this.toast = null; } },
  panel(ctx, x, y, w, h, r) { ctx.fillStyle = 'rgba(239,232,216,.92)'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, r || 8); ctx.fill(); ctx.stroke(); },
  button(ctx, id, x, y, w, h, label, small) {
    this.buttons.push({ id, x, y, w, h });
    this.panel(ctx, x, y, w, h, 7); ctx.fillStyle = INK; ctx.font = `${small ? 12 : 15}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  },
  hit(p) { for (const b of this.buttons) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.id; return null; },
  draw(ctx, G) {
    this.buttons = []; const W = Camera.w, H = Camera.h, mobile = W < 700;
    ctx.save(); ctx.textBaseline = 'middle';
    // cash + clock
    this.panel(ctx, 12, 12, 150, 38); ctx.fillStyle = INK; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('$' + G.cash.toLocaleString(), 24, 31);
    const hr = Math.floor(G.clock % 24), mn = Math.floor((G.clock % 1) * 60); const ampm = hr >= 12 ? 'pm' : 'am';
    ctx.font = `13px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(`${((hr + 11) % 12) + 1}:${mn < 10 ? '0' : ''}${mn}${ampm}`, 152, 31);
    // location / zoom
    this.panel(ctx, W - 172, 12, 160, 38); ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText(`${G.where}  ·  ${Camera.stopName()}`, W - 92, 31);
    // inventory slots
    const n = G.inv.length, sw = mobile ? 40 : 46, gap = 6, ix = W / 2 - (n * sw + (n - 1) * gap) / 2, iy = H - sw - 14;
    for (let i = 0; i < n; i++) { const x = ix + i * (sw + gap); this.panel(ctx, x, iy, sw, sw, 6); const it = G.inv[i]; if (it) { ctx.fillStyle = it.col || '#3d4150'; ctx.beginPath(); ctx.roundRect(x + 8, iy + 8, sw - 16, sw - 16, 4); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = INK; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(it.name, x + sw / 2, iy + sw - 7); } }
    // zoom buttons (right)
    const bx = W - 56, by = H - 190;
    this.button(ctx, 'zoomIn', bx, by, 44, 44, '+'); this.button(ctx, 'zoomOut', bx, by + 52, 44, 44, '–'); this.button(ctx, 'zoomFit', bx, by + 104, 44, 44, '⌖');
    // talk / emote toggle (left)
    this.button(ctx, 'talk', 12, H - 62, 78, 44, this.panelOpen ? 'Close' : 'Talk');
    if (this.panelOpen) {
      const px = 12, py = H - 62 - 10 - (mobile ? 2 : 1) * 46; const cols = mobile ? 5 : 10, bw = mobile ? 56 : 62;
      EMOTES.forEach((e, i) => { const r = Math.floor(i / cols), c = i % cols; this.button(ctx, 'emote:' + e.name, px + c * (bw + 5), py + r * 46, bw, 40, e.label, true); });
    }
    // hint
    if (this.hintT > 0 && this.hint) { ctx.globalAlpha = Math.min(1, this.hintT * 2); ctx.font = `15px ${FONT}`; const w = ctx.measureText(this.hint).width + 28; this.panel(ctx, W / 2 - w / 2, 62, w, 34, 17); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(this.hint, W / 2, 79); ctx.globalAlpha = 1; }
    if (this.toast) { ctx.font = `14px ${FONT}`; const w = ctx.measureText(this.toast.t).width + 28; this.panel(ctx, W / 2 - w / 2, H - 120, w, 32, 16); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(this.toast.t, W / 2, H - 104); }
    ctx.restore();
  },
  // comic-panel title card
  title(ctx, text, sub, alpha) {
    const W = Camera.w, H = Camera.h; ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(W / 2 - 200, H * .18, 400, 96, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold 34px ${FONT}`; ctx.fillText(text, W / 2, H * .18 + 38);
    ctx.font = `15px ${FONT}`; ctx.fillText(sub, W / 2, H * .18 + 72); ctx.restore();
  }
};
