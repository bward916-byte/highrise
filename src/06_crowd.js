// ===== crowd =====
const NPC_LINES = {
  business: ['Not now, I\'m late.', 'Sell. No, buy. No—', 'Tell them Q3 is fine.', 'Take the stairs? Ha.'],
  fancy: ['These heels were a mistake.', 'Darling, look at the light.', 'Reservations are at nine.', 'Do you know who I am?'],
  casual: ['Nice day, huh?', 'You live in that thing?', 'Coffee\'s good on 5th.', 'Ever been to the park?'],
  everyman: ['Hey.', 'Long day.', 'Eighty-third? Yikes.', 'Rent went up again.'],
  worker: ['Watch the cones, pal.', 'That crane\'s been there a year.', 'Lunch is at eleven.'],
  jogger: ['Can\'t stop— PR day!', 'Move, move!', 'Six miles down.'],
  elder: ['This used to be a bakery.', 'Slow down, son.', 'Eighty-three floors. Madness.', 'They tore the old theater down.'],
  tourist: ['Which way to the park?', 'Is that the tall one?', 'Can you take our photo?'],
  hipster: ['The alley\'s got the best light.', 'I knew this block before.', 'Vinyl only, obviously.'],
  student: ['Exam in twenty minutes.', 'Do you know the wifi?', 'Broke till Friday.'],
};
class Crowd {
  constructor(city) {
    this.city = city; this.npcs = []; this.cars = [];
    const r = RNG(777);
    const x0 = city.x0 - 200, x1 = city.x1 + 200;
    for (let i = 0; i < 60; i++) {
      const a = new Actor(genCharacter(1000 + i));
      a.x = r.range(x0, x1); a.y = GROUND + r.range(6, WALK_DEPTH); a.facing = r.chance(.5) ? 1 : -1; a.dir = a.facing;
      a.wait = 0; a.goal = null; a.line = 0; this.npcs.push(a);
    }
    for (let i = 0; i < 16; i++) this.cars.push(new Car(i % 2, r.range(x0, x1), 500 + i));
  }
  update(dt, player) {
    const c = this.city, x0 = c.x0 - 200, x1 = c.x1 + 200;
    for (const a of this.npcs) {
      if (a.wait > 0) { a.wait -= dt; a.vx = a.vy = 0; if (a.wait <= 0 && !a.emote) { a.posture = 'idle'; } }
      else {
        a.vx = a.dir * a.spec.walkSpeed; a.vy = 0; a.x += a.vx * dt;
        if ((a.dir > 0 && a.x > x1) || (a.dir < 0 && a.x < x0)) a.dir *= -1;
        // stop and do something occasionally
        if (Math.random() < dt * .04) { a.wait = 1.5 + Math.random() * 4; a.vx = 0; const em = a.spec.accessory === 'phone' ? 'phone' : ['think', 'phone', 'idle', 'crossArms', 'handsHips', 'shrug', 'wave'][Math.floor(Math.random() * 7)]; if (em !== 'idle') a.setEmote(em, a.wait); }
        // sidestep others a little
      }
      // face the player when he's close and talking
      if (player && Math.abs(player.x - a.x) < 70 && Math.abs(player.y - a.y) < 30 && player.talking) { a.facing = sgn(player.x - a.x); a.vx = 0; a.wait = Math.max(a.wait, .6); }
      a.update(dt);
    }
    for (const car of this.cars) car.update(dt, x0 - 400, x1 + 400);
  }
  nearest(x, y, range) { let best = null, bd = range || 60; for (const a of this.npcs) { const d = dist(x, y, a.x, a.y); if (d < bd) { bd = d; best = a; } } return best; }
  lineFor(a) { const L = NPC_LINES[a.spec.arch] || NPC_LINES.everyman; return L[(a.line++) % L.length]; }
  drawBehind(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 0 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  drawFront(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 1 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  visible(bounds) { return this.npcs.filter(a => a.x > bounds.x0 - 100 && a.x < bounds.x1 + 100); }
}
