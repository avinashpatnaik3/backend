
require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const Player = require("./Player");

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const players = new Map();
const PROXIMITY_RADIUS = 100;

app.get("/", (req, res) => {
  res.send("ProxiSpeak backend is running!");
});

// Find nearby players and notify each connected player
function updateProximity() {
  for (const [socketId, player] of players) {
    const nearbyPlayers = [];

    for (const [otherId, other] of players) {
      if (socketId === otherId) continue;

      const dx = player.x - other.x;
      const dy = player.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= PROXIMITY_RADIUS) {
        nearbyPlayers.push({
          id: other.id,
          name: other.name,
          x: other.x,
          y: other.y,
          distance: Math.round(distance),
        });
      }
    }

    io.to(socketId).emit("proximity:update", nearbyPlayers);
  }
}

function broadcastPlayers() {
  io.emit("players:update", Array.from(players.values()));
  updateProximity();
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("player:join", async (data = {}) => {
    try {
      const name =
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim().slice(0, 30)
          : "Guest";

      const playerData = {
        id: socket.id,
        socketId: socket.id,
        name,
        x: 100,
        y: 100,
        location: [100, 100],
      };

      // Save player in MongoDB
      await Player.findOneAndUpdate(
        { socketId: socket.id },
        {
          $set: {
            name,
            x: 100,
            y: 100,
            location: [100, 100],
          },
          $setOnInsert: {
            socketId: socket.id,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      // If the client disconnected while saving, remove its record
      if (!socket.connected) {
        await Player.deleteOne({ socketId: socket.id });
        return;
      }

      players.set(socket.id, playerData);

      console.log("Player joined and saved:", name);
      broadcastPlayers();
    } catch (error) {
      console.error("Player join failed:", error.message);
      socket.emit("player:error", {
        message: "Could not join. Please try again.",
      });
    }
  });

  socket.on("player:move", async (data = {}) => {
    const player = players.get(socket.id);
    if (!player) return;

    if (
      typeof data.x !== "number" ||
      typeof data.y !== "number" ||
      !Number.isFinite(data.x) ||
      !Number.isFinite(data.y)
    ) {
      return;
    }

    const x = Math.max(0, Math.min(2000, data.x));
    const y = Math.max(0, Math.min(2000, data.y));

    // Update in-memory position
    player.x = x;
    player.y = y;

    // Save new coordinates in MongoDB
    try {
      await Player.updateOne(
        { socketId: socket.id },
        {
          $set: {
            x,
            y,
            location: [x, y],
          },
        },
        { runValidators: true }
      );

      broadcastPlayers();
    } catch (error) {
      console.error("Player movement save failed:", error.message);
      socket.emit("player:error", {
        message: "Could not save movement.",
      });
    }
  });

  socket.on("disconnect", async () => {
    players.delete(socket.id);
    console.log("User disconnected:", socket.id);
    broadcastPlayers();

    try {
      await Player.deleteOne({ socketId: socket.id });
      console.log("Player removed from MongoDB:", socket.id);
    } catch (error) {
      console.error("Player cleanup failed:", error.message);
    }
  });
});

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    httpServer.listen(PORT, () => {
      console.log(`ProxiSpeak server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
