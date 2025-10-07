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
  <button id="decrementButton">-20 (Spawn Chaser)</button>
  <script src="game.js"></script>
</body>
</html>
`;

// game.ts
let count = 0;
const counterEl = document.getElementById("counter") as HTMLDivElement;
const targetBtn = document.getElementById("targetButton") as HTMLButtonElement;
const decBtn = document.getElementById("decrementButton") as HTMLButtonElement;

// Utility: distance between two points
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

type Vec = { x: number; y: number };

// Mouse position
let mouse: Vec = { x: 0, y: 0 };
document.addEventListener("mousemove", (e) => {
  mouse = { x: e.clientX, y: e.clientY };
});

// Set initial button position
const btnPos: Vec = { x: 400, y: 300 };
const btnVel: Vec = { x: 0, y: 0 };

// Update button position
function setBtnPos() {
  targetBtn.style.left = `${btnPos.x}px`;
  targetBtn.style.top = `${btnPos.y}px`;
}

setBtnPos();

// Chaser class
class Chaser {
  pos: Vec;
  speed: number;
  el: HTMLElement;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.speed = 0.5;
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

    if (d > 5) {
      this.speed += 0.001; // Accelerate over time
      this.pos.x += (dx / d) * this.speed;
      this.pos.y += (dy / d) * this.speed;
    } else {
      // Collision: reset speed, remove cube, increment counter
      count++;
      counterEl.textContent = `Count: ${count}`;
      document.body.removeChild(this.el);
      return true; // dead
    }

    this.el.style.left = `${this.pos.x}px`;
    this.el.style.top = `${this.pos.y}px`;
    return false;
  }
}

const chasers: Chaser[] = [];

// Update loop
function update() {
  const btnRect = targetBtn.getBoundingClientRect();
  const btnCenter: Vec = {
    x: btnPos.x + btnRect.width / 2,
    y: btnPos.y + btnRect.height / 2,
  };
  const mouseCenter: Vec = mouse;

  // Compute combined evasion force
  let forceX = 0;
  let forceY = 0;

  function addRepulsion(pos: Vec, strength: number) {
    const dx = btnCenter.x - pos.x;
    const dy = btnCenter.y - pos.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const scale = strength / (d * d); // inverse square
    forceX += (dx / d) * scale;
    forceY += (dy / d) * scale;
  }

  addRepulsion(mouseCenter, 20000);

  for (const chaser of chasers) {
    addRepulsion(chaser.pos, 10000); // Button flees from chasers too
  }

  // Apply velocity
  btnVel.x = forceX;
  btnVel.y = forceY;

  // Cap velocity to avoid teleportation
  const maxSpeed = 10;
  const speed = Math.hypot(btnVel.x, btnVel.y);
  if (speed > maxSpeed) {
    btnVel.x = (btnVel.x / speed) * maxSpeed;
    btnVel.y = (btnVel.y / speed) * maxSpeed;
  }

  btnPos.x += btnVel.x;
  btnPos.y += btnVel.y;

  // Keep button on screen
  btnPos.x = Math.max(0, Math.min(globalThis.innerWidth - 100, btnPos.x));
  btnPos.y = Math.max(0, Math.min(globalThis.innerHeight - 50, btnPos.y));

  setBtnPos();

  // Update chasers
  for (let i = chasers.length - 1; i >= 0; i--) {
    if (chasers[i].update(btnCenter)) {
      chasers.splice(i, 1);
    }
  }

  requestAnimationFrame(update);
}

update();

// Button interactions
targetBtn.addEventListener("click", () => {
  count++;
  counterEl.textContent = `Count: ${count}`;

  // Reset button speed on click
  btnVel.x = 0;
  btnVel.y = 0;
});

decBtn.addEventListener("click", () => {
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
