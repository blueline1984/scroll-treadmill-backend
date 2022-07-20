require("dotenv").config();

const createError = require("http-errors");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();

const port = process.env.PORT || 8080;
const server = http.createServer(app);

//socket setting
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

//initial states(data base)
const rooms = {};
let player = {};
let lastPlayerId = 1;
const players = [];

//room 예시
/*
const rooms = {
  6D_8lr3unha4X4eaAAAD : {
    player: {}
    playerNum: 0,
    roomMaxNum: 3,
    roomTitle: "test2"
  }
}
*/

//calculate random int
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

//socket
io.on("connection", (socket) => {
  console.log(`User Connected ${socket.id}`);

  // 방 생성하기
  socket.on("createRoom", (roomTitle) => {
    rooms[socket.id] = {
      roomTitle,
      playerNum: 0,
      players: {},
      roomMaxNum: 3,
      roomKey: socket.id,
    };
  });

  // 방 입장하기
  socket.on("joinRoom", (roomKey) => {
    //room join
    socket.join(roomKey);

    rooms[roomKey].playerNum++;
    socket.broadcast.emit("allRoomList", rooms);
    const roomInfo = rooms[roomKey];

    io.in(roomKey).emit("welcome", `Hello, this is ${roomKey} Room`);

    roomInfo.players[socket.id] = {
      rotation: 0,
      name: `Player ${lastPlayerId++}`,
      x: randomInt(100, 1000),
      y: randomInt(100, 1000),
      character: [],
      playerId: socket.id,
      roomKey,
    };

    // socket.broadcast.emit("setState", roomInfo);
    //chracter 생성
    socket.on("start", () => {
      socket.emit("setState", roomInfo);

      socket.emit("currentPlayers", {
        players: roomInfo.players,
      });

      // socket.broadcast.emit("currentPlayers", {
      //   players: roomInfo.players,
      // });
    });

    io.to(roomKey).emit("newPlayer", {
      playerInfo: roomInfo.players[socket.id],
    });

    socket.on("characterMovement", (data) => {
      //data 이름 수정
      const { x, y, roomKey } = data;
      rooms[roomKey].players[socket.id].x = x;
      rooms[roomKey].players[socket.id].y = y;
      io.to(roomKey).emit("characterMoved", rooms[roomKey].players[socket.id]);
    });

    socket.on("getAllPlayers", () => {
      //Character Update
      socket.on("characterSelect", (data) => {
        roomInfo.players[socket.id].character.push(data);
      });
      socket.emit("players", roomInfo.players);
    });
  });

  // etc
  socket.on("getAllRooms", () => {
    socket.emit("allRoomList", rooms);
    socket.broadcast.emit("allRoomList", rooms);
  });
});

// io.on("disconnect", (socket) => {
//   console.log(`A user disconnected ${socket.id}`);
// });

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json({
    status: res.status,
    message: "error",
  });
});

server.listen(port);
server.on("error", (error) => console.error(error));
server.on("listening", () => console.log(`listening on port ${port}`));

module.exports = app;
