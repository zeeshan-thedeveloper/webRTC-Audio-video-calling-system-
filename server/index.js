const express = require("express");
const cors = require("cors");
const app = express();

// Serve static files from the public directory
app.use(express.static("public"));

// Allow requests from http://localhost:3001
app.use(cors());

app.get("/", (req, res) => {
  res.send("This is server");
});

const server = app.listen(3000, () => {
  console.log("Server started on port 3000");
});

// Initialize Socket.IO
const io = require("socket.io")(server);

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("new user : " + socket.id);
  io.to(socket.id).emit("currentUserId", socket.id);
  getConnectedClients();
  socket.on("message", (data) => {
    io.to(data.recipient).emit("message", {
      message: data.message,
      sender: data.sender,
    });
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  socket.on("getConnectedClients", (data) => {
    // Get a list of all connected clients
    getConnectedClients();
  });

  function getConnectedClients() {
    let connectedClients = [];
    for (const key of io.sockets.sockets) {
      connectedClients.push(key[0]);
    }
    // Emit the list of clients back to the requesting client
    io.emit("connectedClients", connectedClients);
  }
});
