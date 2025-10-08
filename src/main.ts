// deno-lint-ignore-file prefer-const
import "./style.css";

document.body.innerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Evasive Button Game</title>
</head>
<body>
  <div id="counter">Count: 0</div>
  <button id="targetButton">Click Me!</button>
  <button id="chaserButton">-20 (Spawn Chaser)</button>
  <script src="game.js"></script>
</body>
</html>
`;

const BUTTON_MAXSPEED: number = 5;
const CHASER_STARTSPEED: number = 1;
const CHASER_MAXSPEED: number = 6;
const CHASER_ACCEL: number = 0.01;

//Point counter for main resource
let count = 0;

const counterEl = document.getElementById("counter") as HTMLDivElement;
const chsrBtn = document.getElementById("chaserButton") as HTMLButtonElement;

// Utility: distance between two points
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

type Vec = { x: number; y: number };

// Mouse position
let mouse: Vec = { x: 0, y: 0 };
document.addEventListener("mousemove", (e) => {
  mouse = { x: e.clientX, y: e.clientY };
});

class targetButton {
  btn: HTMLButtonElement;
  x: number;
  y: number;
  vel: Vec;
  btnRect: DOMRect;
  btnCenter: Vec;

  constructor() {
    this.btn = document.getElementById(
      "targetButton",
    ) as HTMLButtonElement;
    this.x = globalThis.innerWidth;
    this.y = globalThis.innerHeight;
    this.vel = { x: 0, y: 0 };
    this.setBtnPos();
    this.btnRect = this.btn.getBoundingClientRect();
    this.btnCenter = {
      x: this.x + this.btnRect.width / 2,
      y: this.y + this.btnRect.height / 2,
    };
  }

  // Update button position
  setBtnPos() {
    this.btn.style.left = `${this.x}px`;
    this.btn.style.top = `${this.y}px`;
  }

  // Adds the values to velocity, position needs to be updated after that
  addRepulsion(pos: Vec, strength: number) {
    const dx = this.btnCenter.x - pos.x;
    const dy = this.btnCenter.y - pos.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const scale = strength / (d * d); // inverse square
    this.vel.x += (dx / d) * scale;
    this.vel.y += (dy / d) * scale;

    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed > BUTTON_MAXSPEED) {
      this.vel.x = (this.vel.x / speed) * BUTTON_MAXSPEED;
      this.vel.y = (this.vel.y / speed) * BUTTON_MAXSPEED;
    }
  }

  // Kick button in a direction (Needs work for actual implementation)
  kickBtn(pos: Vec, strength: number) {
    const dx = this.btnCenter.x - pos.x;
    const dy = this.btnCenter.y - pos.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const scale = strength / (d * d); // inverse square
    this.vel.x += (dx / d) * scale;
    this.vel.y += (dy / d) * scale;
  }

  updatePosWVel() {
    this.x += this.vel.x;
    this.y += this.vel.y;
  }

  update() {
    this.btnRect = this.btn.getBoundingClientRect();
    this.btnCenter = {
      x: this.x + this.btnRect.width / 2,
      y: this.y + this.btnRect.height / 2,
    };

    this.addRepulsion(mouse, 20000);

    for (const chaser of chasers) {
      this.addRepulsion(chaser.pos, 10000); // Button flees from chasers too
    }

    this.updatePosWVel();

    // Keep button on screen
    this.x = Math.max(0, Math.min(globalThis.innerWidth - 100, this.x));
    this.y = Math.max(0, Math.min(globalThis.innerHeight - 50, this.y));

    this.setBtnPos();
  }
}

let targetBtn = new targetButton();

// Chaser class
class Chaser {
  pos: Vec;
  speed: number;
  el: HTMLElement;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.speed = CHASER_STARTSPEED;
    this.el = document.createElement("div");
    this.el.className = "chaser";
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    document.body.appendChild(this.el);
  }

  update(target: Vec) {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const d = dist(this.pos, target);

    if (d > 5 && this.speed <= CHASER_MAXSPEED) {
      this.speed += CHASER_ACCEL; // Accelerate over time
      this.pos.x += (dx / d) * this.speed;
      this.pos.y += (dy / d) * this.speed;
    } else {
      // Collision: increment counter, reset speed
      count++;
      counterEl.textContent = `Count: ${count}`;
      this.speed = CHASER_STARTSPEED;
      // Chaser doesn't die just yet, this part could be useful later though
      // document.body.removeChild(this.el);
      // return true;
    }

    this.el.style.left = `${this.pos.x}px`;
    this.el.style.top = `${this.pos.y}px`;
    return false;
  }
}

const chasers: Chaser[] = [];

// Main Update Loop
function update() {
  // Update chasers
  for (let i = chasers.length - 1; i >= 0; i--) {
    if (chasers[i].update(targetBtn.btnCenter)) {
      chasers.splice(i, 1);
    }
  }

  requestAnimationFrame(update);
}

update();

// Button interactions
targetBtn.btn.addEventListener("click", () => {
  count++;
  counterEl.textContent = `Count: ${count}`;

  // Reset button speed on click
  targetBtn.vel.x = 0;
  targetBtn.vel.y = 0;
});

chsrBtn.addEventListener("click", () => {
  if (count >= 20) {
    count -= 20;
    counterEl.textContent = `Count: ${count}`;
    const spawnX = Math.random() * globalThis.innerWidth;
    const spawnY = Math.random() * globalThis.innerHeight;
    chasers.push(new Chaser(spawnX, spawnY));
  } else {
    alert("Not enough points!");
  }
});
