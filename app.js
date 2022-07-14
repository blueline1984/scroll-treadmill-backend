require("dotenv").config();

const createError = require("http-errors");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();

const port = process.env.PORT || 8080;
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// io.on("connection", (socket) => {
//   console.log(`User Connected ${socket.id}`);
// });
let rooms = {};

io.on("connection", (socket) => {
  // socket.onAny((event) => {
  //   console.log(`Socket Event: ${event}`);
  // });
  console.log(`User Connected ${socket.id}`);
  // }
  // socket.on("send_message", (data) => {
  //   socket.broadcast.emit("receive_message", data);
  // });

  // 방 생성하기
  socket.on("makeRoom", (roomTitle) => {
    console.log("back", roomTitle);
    rooms[socket.id] = {
      roomTitle,
      roomMaxNum: 3,
    };
    socket.broadcast.emit("roomList", rooms);
  });

  // //방 입장하기
  socket.on("joinRoom", (roomTitle) => {
    socket.join(roomTitle);
    console.log("roomTitle", roomTitle);
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
