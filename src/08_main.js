// ===== main =====
const Game = {
  clock: 7.6, cash: 0, inv: [null, null, null, null, null, null], where: 'Street', state: 'intro', introT: 0,
  init(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.city = buildCity(); this.crowd = new Crowd(this.city);
    this.player = new Actor(genPlayer()); this.player.x = TOWER.x + TOWER.w / 2 + 120; this.player.y = GROUND + 24; this.player.talking = false;
    this.cartMan = new Actor(genCartMan()); this.cartMan.x = this.city.alley.x + 101; this.cartMan.y = GROUND + 0; this.cartMan.facing = -1; this.cartMan.posture = 'sit';
    Camera.follow = this.player; Camera.snapTo(this.player.x, this.player.y - 60, 2.4);
    this.resize(); Input.init(canvas);
    if (typeof window !== 'undefined') { window.addEventListener('resize', () => this.resize()); this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }
    this.startIntro();
  },
  resize() { const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1); const w = (typeof window !== 'undefined' ? window.innerWidth : this.canvas.width), h = (typeof window !== 'undefined' ? window.innerHeight : this.canvas.height); this.canvas.width = w * dpr; this.canvas.height = h * dpr; if (this.canvas.style) { this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'; } Camera.setSize(w, h, dpr); },
  startIntro() {
    // the reveal: from his face, pull all the way out to show the tower, then snap back in
    this.state = 'intro'; this.introT = 0; const p = this.player;
    Camera.play([
      { zoom: 2.4, dur: 1.4, hold: .6 },
      { zoom: 0.06, x: TOWER.x + TOWER.w / 2, y: -TOWER.h / 2 + 900, dur: 3.2, hold: 1.4 },
      { zoom: 1.0, x: p.x, dur: 1.1, ease: easeOut },
    ], () => { this.state = 'play'; Camera.setStop(1); UI.setHint(Camera.w < 700 ? 'Drag left side to walk · pinch or +/– to zoom' : 'WASD / arrows to walk · scroll or +/– to zoom · 1–0 for emotes · Space to talk', 6); });
    p.say('Eighty-three floors.\nThat\'s where I live.', 4.5);
  },
  frame(t) { const dt = Math.min(.05, (t - this.last) / 1000); this.last = t; this.update(dt); this.draw(); requestAnimationFrame(t => this.frame(t)); },
  update(dt) {
    Input.update(); UI.update(dt);
    this.clock += dt / 50; // one game hour per 50s
    const p = this.player;
    // zoom input (continuous)
    if (Input.wheel) Camera.zoomBy(Math.pow(1.0018, -Input.wheel));
    if (Input.pinch) Camera.zoomBy(Math.pow(1.01, Input.pinch));
    if (Input.consume('KeyZ') || Input.consume('Equal')) Camera.setStop(Camera.stopIndex - 1);
    if (Input.consume('KeyX') || Input.consume('Minus')) Camera.setStop(Camera.stopIndex + 1);
    // taps on HUD
    if (Input.tap) {
      const id = UI.hit(Input.tap);
      if (id === 'zoomIn') Camera.setStop(Camera.stopIndex - 1); else if (id === 'zoomOut') Camera.setStop(Camera.stopIndex + 1); else if (id === 'zoomFit') Camera.setStop(1);
      else if (id === 'talk') UI.panelOpen = !UI.panelOpen;
      else if (id && id.startsWith('emote:')) { this.emote(id.slice(6)); }
      if (id) Input.tap = null;
    }
    if (this.state === 'play') {
      let ax = Input.axisX, ay = Input.axisY;
      const spd = p.spec.walkSpeed * (Input.keys.ShiftLeft ? 2.2 : 1) * (Camera.zoom < .3 ? 2 : 1);
      p.vx = ax * spd; p.vy = ay * spd * .6;
      p.x += p.vx * dt; p.y = clamp(p.y + p.vy * dt, GROUND + 4, GROUND + WALK_DEPTH);
      p.x = clamp(p.x, this.city.x0 - 300, this.city.x1 + 300);
      // emotes by key
      for (const e of EMOTES) if (Input.consume('Digit' + e.key)) this.emote(e.name);
      if (Input.consume('Space')) this.talk();
      // where am I
      this.where = p.x > this.city.alley.x && p.x < this.city.alley.x + this.city.alley.w ? 'Alley' : (Math.abs(p.x - (TOWER.x + TOWER.w / 2)) < 60 ? 'Tower lobby' : 'Street');
      p.talking = p.emote && p.emote.name === 'talk';
    } else { p.vx = p.vy = 0; }
    p.update(dt); this.cartMan.update(dt);
    this.crowd.update(dt, p);
    Camera.update(dt); Input.endFrame();
  },
  emote(name) { const p = this.player; p.setEmote(name, 2.4); const lines = { armsUp: 'What is going on?!', headDown: '...', shrug: 'Beats me.', wave: 'Hey!', think: 'Let me think.', point: 'That one.', cheer: 'YES.', facepalm: 'Of course.', nod: 'Yeah. Yeah.', no: 'Nope.' }; if (lines[name]) p.say(lines[name], 2); },
  talk() {
    const p = this.player, n = Math.abs(p.x - this.cartMan.x) < 90 && Math.abs(p.y - this.cartMan.y) < 40 ? this.cartMan : this.crowd.nearest(p.x, p.y, 80);
    if (!n) { p.setEmote('shrug', 1.6); p.say('Nobody around.', 1.6); return; }
    p.facing = sgn(n.x - p.x); n.facing = -p.facing; p.setEmote('talk', 2.4, 'happy');
    if (n === this.cartMan) { n.setEmote('talk', 2.6); n.say(['You again.\nSpare a buck?', 'Cart\'s not for sale.', 'I used to live up there too.\nFloor forty.', 'Watch the pigeons. They know.'][(this.cartLine = ((this.cartLine || 0) + 1)) % 4], 3.5); UI.setHint('The cart guy. He\'s always here.', 3); }
    else n.say(this.crowd.lineFor(n), 3);
  },
  draw() {
    const ctx = this.ctx, cam = Camera, pal = dayPalette(this.clock);
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    drawSky(ctx, pal, cam); drawBackdrop(ctx, this.city, cam, pal);
    cam.begin(ctx); inkW(cam.zoom);
    const b = cam.bounds();
    // buildings (culled)
    for (const bd of this.city.buildings) if (bd.x + bd.w > b.x0 && bd.x < b.x1 && -bd.h < b.y1) drawBuilding(ctx, bd, pal, cam.zoom, bd.tower);
    if (this.city.alley.x + this.city.alley.w > b.x0 && this.city.alley.x < b.x1 && cam.zoom > .12) drawAlley(ctx, this.city, pal, cam.zoom);
    drawStreet(ctx, this.city, pal, cam.zoom, cam);
    // depth-sorted actors on the sidewalk
    const actors = this.crowd.visible(b); actors.push(this.player); if (this.cartMan.x > b.x0 - 100 && this.cartMan.x < b.x1 + 100) actors.push(this.cartMan);
    actors.sort((a, c) => a.y - c.y);
    // the cart itself (behind the cart guy)
    if (cam.zoom > .12) this.drawCart(ctx, this.cartMan.x - 62, GROUND + 6, cam.zoom, pal);
    for (const a of actors) a.draw(ctx, cam.zoom);
    this.crowd.drawBehind(ctx, pal, cam.zoom, b); this.crowd.drawFront(ctx, pal, cam.zoom, b);
    // night vignette / tint
    cam.end(ctx);
    if (pal.tintK > 0) { ctx.fillStyle = pal.tint; ctx.globalAlpha = pal.tintK * .35; ctx.fillRect(0, 0, cam.w, cam.h); ctx.globalAlpha = 1; }
    UI.draw(ctx, this);
    if (this.state === 'intro') { const s = Camera.seq; if (s && s.i === 1) UI.title(ctx, 'HIGHRISE', 'a regular guy · floor 83', Math.min(1, s.t)); }
    Input.drawStick(ctx);
  },
  drawCart(ctx, x, y, zoom, pal) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1 / zoom); ctx.lineJoin = 'round';
    ctx.fillStyle = mix('#9aa2ab', pal.tint, pal.tintK * .5); ctx.beginPath(); ctx.moveTo(-34, -46); ctx.lineTo(30, -46); ctx.lineTo(26, -14); ctx.lineTo(-30, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-32 + i * 12, -46); ctx.lineTo(-28 + i * 11, -14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-34, -46); ctx.lineTo(-44, -62); ctx.lineTo(-30, -62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-28, -14); ctx.lineTo(-24, -2); ctx.moveTo(24, -14); ctx.lineTo(20, -2); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-24, 0, 4, 0, TAU); ctx.arc(20, 0, 4, 0, TAU); ctx.fill();
    // junk: bags, blanket, a lamp
    ctx.fillStyle = '#3d4150'; ctx.beginPath(); ctx.ellipse(-12, -50, 14, 9, -.2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b0413e'; ctx.beginPath(); ctx.ellipse(10, -52, 12, 8, .3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9b23a'; ctx.beginPath(); ctx.rect(18, -70, 10, 20); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
};
if (typeof window !== 'undefined') window.addEventListener('load', () => Game.init(document.getElementById('c')));
