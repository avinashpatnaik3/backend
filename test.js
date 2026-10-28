
const { io } = require("socket.io-client");

const playerA = io("http://localhost:3000");
const playerB = io("http://localhost:3000");

playerA.on("connect", () => {
  console.log("Player A connected");
  playerA.emit("player:join", { name: "Player A" });
});

playerB.on("connect", () => {
  console.log("Player B connected");
  playerB.emit("player:join", { name: "Player B" });
});

playerA.on("players:update", (players) => {
  console.log("Players connected:", players.length);
});

playerA.on("proximity:update", (nearby) => {
  console.log(
    "Player A nearby players:",
    nearby.map((p) => `${p.name} (${p.distance}px)`)
  );
});

playerB.on("proximity:update", (nearby) => {
  console.log(
    "Player B nearby players:",
    nearby.map((p) => `${p.name} (${p.distance}px)`)
  );
});

// Move Player B 50 pixels away from Player A
setTimeout(() => {
  console.log("Moving Player B to x=150, y=100");
  playerB.emit("player:move", { x: 150, y: 100 });
}, 1000);

// Finish the test
setTimeout(() => {
  playerA.disconnect();
  playerB.disconnect();
  console.log("Test finished");
}, 2500);
