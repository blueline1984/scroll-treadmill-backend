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
    origin: "*",
    credentials: true,
  },
});

//initial states(data base)
const rooms = {};
let lastPlayerId = 1;

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

    io.in(roomKey).emit("welcome", roomInfo);

    roomInfo.players[socket.id] = {
      rotation: 0,
      name: `Player ${lastPlayerId++}`,
      x: randomInt(400, 1000),
      y: randomInt(100, 800),
      character: "",
      playerId: socket.id,
      roomKey,
      isReady: false,
    };

    //chracter 생성
    socket.on("start", () => {
      socket.emit("setState", roomInfo);

      socket.emit("currentPlayers", {
        players: roomInfo.players,
      });
    });

    io.to(roomKey).emit("newPlayer", {
      playerInfo: roomInfo.players[socket.id],
    });

    socket.on("characterMovement", (playerInfo) => {
      //data 이름 수정
      if (rooms[roomKey].players[socket.id]) {
        const { x, y, roomKey } = playerInfo;
        rooms[roomKey].players[socket.id].x = x;
        rooms[roomKey].players[socket.id].y = y;
        io.to(roomKey).emit(
          "characterMoved",
          rooms[roomKey].players[socket.id]
        );
      }
    });

    socket.on("getAllPlayers", () => {
      //Character Update
      socket.emit("players", roomInfo.players);
    });

    socket.on("ready", (playerId, selectedCharacter) => {
      roomInfo.players[playerId].isReady = true;
      roomInfo.players[playerId].character = selectedCharacter;
      io.to(roomKey).emit("test", roomInfo.players);
      io.to(roomKey).emit("readyCompleted", roomInfo.players);
    });

    // socket.on("test", () => {
    //   socket.on("characterSelect", (selectedCharacter, playerId) => {
    //     roomInfo.players[playerId].character = selectedCharacter;
    //     io.to(roomKey).emit("character", roomInfo.players);
    //   });
    // });
  });

  // etc
  socket.on("getAllRooms", () => {
    socket.emit("allRoomList", rooms);
    socket.broadcast.emit("allRoomList", rooms);
  });

  //disconnect(수정)
  socket.on("disconnect", () => {
    let roomKey = 0;
    for (let keys1 in rooms) {
      for (let keys2 in rooms[keys1]) {
        Object.keys(rooms[keys1][keys2]).map((element) => {
          if (element === socket.id) {
            roomKey = keys1;
          }
        });
      }
    }

    const roomInfo = rooms[roomKey];

    if (roomInfo) {
      console.log("user disconnected: ", socket.id);

      delete roomInfo.players[socket.id];

      roomInfo.playerNum = Object.keys(roomInfo.players).length;

      io.to(roomKey).emit("disconnected", {
        playerId: socket.id,
        playerNum: roomInfo.playerNum,
      });
    }
  });

  socket.once("characterFall", () => {
    let roomKey = 0;
    for (let keys1 in rooms) {
      for (let keys2 in rooms[keys1]) {
        Object.keys(rooms[keys1][keys2]).map((element) => {
          if (element === socket.id) {
            roomKey = keys1;
          }
        });
      }
    }

    const roomInfo = rooms[roomKey];
    roomInfo.playerNum -= 1;

    io.to(roomKey).emit("characterFalled", roomInfo.playerNum);
  });
});

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
