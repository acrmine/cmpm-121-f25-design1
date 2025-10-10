// deno-lint-ignore-file prefer-const
import "./style.css";

// Auto clicker buttons html spot
// <div class ="autoclickerButtons">
//     <button id="chaserButton">20 Spawn Chaser</button>
// </div>
document.body.innerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Evasive Button Game</title>
</head>
<body>
  <div id="counter">Tags: 0</div>
  <button id="chaserButton">20 Spawn Chaser</button>
  <button id="clickerButtons", class="clickerbuttons">10 Stealth Clicker 🥷</button>
</body>
</html>
`;

const BUTTON_MAXSPEED: number = 2;
const BUTTON_DRAG: number = 0.1;
const BUTTON_FLEEDIST: number = 300;

const CHASER_STARTSPEED: number = 1;
const CHASER_MAXSPEED: number = 6;
const CHASER_ACCEL: number = 0.1;

//Point counter for main resource
let count = 0;

//Variables for calculating fps
let fps = 0;
let fpsTimeStamps: number[] = [];

//Autoclicker tracking variables
//updated every time timer reaches 0
//timer starts at 60 frames per second to give calculator chance to propogate
let timer: number = 60;
let incrPerSec: number = 0;

//Autoclicker base value
//Used to calculate incrPerSec, wont add autoclicking until this is added to
let autoAmnt = 0;

const counterEl = document.getElementById("counter") as HTMLDivElement;
const chsrBtn = document.getElementById("chaserButton") as HTMLButtonElement;
chsrBtn.toggleAttribute("disabled");
const sClckrBtn = document.getElementById(
  "clickerButtons",
) as HTMLButtonElement;
sClckrBtn.toggleAttribute("disabled");

// Utility: calculate frames per second
const calculateFps = (): number => {
  const now: number = performance.now();
  while (fpsTimeStamps.length > 0 && fpsTimeStamps[0] <= now - 1000) {
    fpsTimeStamps.shift();
  }
  fpsTimeStamps.push(now);

  // The number of timestamps in the array represents the FPS
  return fpsTimeStamps.length;
};

// Utility: distance between two points
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

// Utility: truncate to two decimal points
// const trunc2Dec = (num: number): number => Math.trunc(num * 100) / 100;

// Utility: shrink "val" towards 0 by "amount" without passing it
const shrink = (val: number, amount: number): number => {
  if (val !== 0) {
    if (val > 0) {
      return Math.max(0, val - amount);
    } else if (val < 0) {
      return Math.min(0, val + amount);
    }
  }
  return val;
};

// Utility: update counter by adding step to count
const addToCounter = (step: number) => {
  count += step;
  counterEl.textContent = "Tags: " + count.toFixed(2);
};

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
  kicked: boolean;

  constructor(buttonElem: string, buttonText: string) {
    this.btn = document.createElement("button");
    this.btn.id = buttonElem;
    this.btn.classList.add(buttonElem);
    this.btn.textContent = buttonText;
    this.x = globalThis.innerWidth / 2;
    this.y = globalThis.innerHeight / 2;
    this.vel = { x: 0, y: 0 };
    document.body.appendChild(this.btn);
    this.setBtnPos();
    this.btnRect = this.btn.getBoundingClientRect();
    this.btnCenter = {
      x: this.x + this.btnRect.width / 2,
      y: this.y + this.btnRect.height / 2,
    };
    this.x -= this.btnRect.width / 2;
    this.y -= this.btnRect.width / 2;
    this.setBtnPos();
    this.kicked = false;
  }

  // Update button position on screen
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
  }

  // Kick button in a direction (Needs work for actual implementation)
  kickBtn(pos: Vec, strength: number) {
    this.kicked = true;
    this.addRepulsion(pos, strength);
    this.updatePosWVel();
    this.setBtnPos();
  }

  // Update recorded button position
  updatePosWVel() {
    this.x += this.vel.x;
    this.y += this.vel.y;
  }

  fleeFromChasers(chaser: Chaser) {
    if (!this.kicked) {
      if (dist(chaser.pos, this.btnCenter) <= BUTTON_FLEEDIST) {
        this.addRepulsion(chaser.pos, 10000); // Button flees from chasers too
      }
      this.updatePosWVel();
      this.keepButtonOnScreen;
      this.setBtnPos();
    }
  }

  fleeFromObject(pos: Vec) {
    if (!this.kicked) {
      if (dist(mouse, this.btnCenter) <= BUTTON_FLEEDIST) {
        this.addRepulsion(pos, 10000);
      }
    }
  }

  handleSpeed() {
    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (this.kicked) {
      if (speed > BUTTON_MAXSPEED) {
        this.vel.x = shrink(this.vel.x, BUTTON_DRAG * 2);
        this.vel.y = shrink(this.vel.y, BUTTON_DRAG * 2);
      } else {
        this.kicked = false;
      }
    } else {
      if (speed > BUTTON_MAXSPEED) {
        this.vel.x = (this.vel.x / speed) * BUTTON_MAXSPEED;
        this.vel.y = (this.vel.y / speed) * BUTTON_MAXSPEED;
      } else if (speed > 0) {
        this.vel.x = shrink(this.vel.x, BUTTON_DRAG);
        this.vel.y = shrink(this.vel.y, BUTTON_DRAG);
      }
    }
  }

  keepButtonOnScreen() {
    this.x = Math.max(
      0,
      Math.min(globalThis.innerWidth - this.btnRect.width, this.x),
    );
    this.y = Math.max(
      0,
      Math.min(globalThis.innerHeight - this.btnRect.height, this.y),
    );
  }

  update() {
    this.btnRect = this.btn.getBoundingClientRect();
    this.btnCenter = {
      x: this.x + this.btnRect.width / 2,
      y: this.y + this.btnRect.height / 2,
    };

    this.fleeFromObject(mouse);
    this.handleSpeed();

    this.updatePosWVel();
    this.keepButtonOnScreen();
    this.setBtnPos();
  }
}

// Chaser class
class Chaser {
  pos: Vec;
  speed: number;
  el: HTMLElement;
  btnToChase: targetButton;

  constructor(x: number, y: number, buttonToChase: targetButton) {
    this.pos = { x, y };
    this.speed = CHASER_STARTSPEED;
    this.el = document.createElement("div");
    this.el.className = "chaser";
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    document.body.appendChild(this.el);
    this.btnToChase = buttonToChase;
  }

  update() {
    const dx = this.btnToChase.btnCenter.x - this.pos.x;
    const dy = this.btnToChase.btnCenter.y - this.pos.y;
    const d = dist(this.pos, this.btnToChase.btnCenter);

    if (d > 5 && this.speed <= CHASER_MAXSPEED) {
      this.speed += CHASER_ACCEL; // Accelerate over time
      this.pos.x += (dx / d) * this.speed;
      this.pos.y += (dy / d) * this.speed;
    } else {
      // Collision: increment counter, reset speed
      addToCounter(1);
      this.speed = CHASER_STARTSPEED;
      this.btnToChase.kickBtn(mouse, 1000000);
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
let targetBtn = new targetButton("targetButton", "Catch Me! 🚀");

// Button interactions
targetBtn.btn.addEventListener("click", () => {
  addToCounter(1);

  // Reset button speed on click
  targetBtn.vel.x = 0;
  targetBtn.vel.y = 0;
});

chsrBtn.addEventListener("click", () => {
  if (count >= 20) {
    addToCounter(-20);
    const spawnX = Math.random() * globalThis.innerWidth;
    const spawnY = Math.random() * globalThis.innerHeight;
    chasers.push(new Chaser(spawnX, spawnY, targetBtn));
  } else {
    alert("Not enough points!");
  }
});

sClckrBtn.addEventListener("click", () => {
  if (count >= 10) {
    autoAmnt += 1;
    addToCounter(-10);
    sClckrBtn.textContent = "10 Stealth Clicker 🥷 (" + autoAmnt + ")";
  }
});

// Debug Points Button
document.addEventListener("keydown", (event) => {
  if (event.key === "c") {
    addToCounter(20);
  }
});

// Main Update Loop
function update() {
  fps = calculateFps();
  console.log(fps);

  if (timer <= 0) {
    incrPerSec = autoAmnt / fps;
    timer = fps;
  }
  timer--;
  addToCounter(incrPerSec);

  // Update target button
  targetBtn.update();

  if (count >= 10) {
    if (sClckrBtn.hasAttribute("disabled")) {
      sClckrBtn.toggleAttribute("disabled");
    }
  } else {
    if (!sClckrBtn.hasAttribute("disabled")) {
      sClckrBtn.toggleAttribute("disabled");
    }
  }

  // Update chasers
  for (let i = chasers.length - 1; i >= 0; i--) {
    if (chasers[i].update()) {
      chasers.splice(i, 1);
      targetBtn.fleeFromChasers(chasers[i]);
    }
  }

  requestAnimationFrame(update);
}

update();
