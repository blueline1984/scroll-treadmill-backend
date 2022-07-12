require("dotenv").config();

const createError = require("http-errors");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();

const port = process.env.PORT || 8080;
const server = http.createServer(app);

const socketio = require("socket.io")(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

socketio.on("connection", (socket) => {
  console.log(`A user connected ${socket.id}`);
});

socketio.on("diconnect", function (socket) {
  console.log(`A user disconnected ${socket.id}`);
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
