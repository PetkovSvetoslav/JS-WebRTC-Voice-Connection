const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 9090 });
const users = {};

wss.on('connection', function(connection) {
  console.log("User connected");

  connection.on('message', function(message) {
    let data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("Invalid JSON");
      data = {};
    }

    switch (data.type) {
      case "login":
        handleLogin(connection, data);
        break;

      case "offer":
        handleOffer(connection, data);
        break;

      case "answer":
        handleAnswer(connection, data);
        break;

      case "candidate":
        handleCandidate(connection, data);
        break;

      case "leave":
        handleLeave(connection, data);
        break;

      default:
        sendTo(connection, {
          type: "error",
          message: "Command not found: " + data.type
        });
        break;
    }
  });

  connection.on("close", function() {
    handleUserDisconnect(connection);
  });

  connection.send("Hello world");
});

function handleLogin(connection, data) {
  console.log("User logged:", data.name);

  if (users[data.name]) {
    sendTo(connection, {
      type: "login",
      success: false
    });
  } else {
    users[data.name] = connection;
    connection.name = data.name;

    sendTo(connection, {
      type: "login",
      success: true
    });
  }
}

function handleOffer(connection, data) {
  console.log("Sending offer to:", data.name);

  const conn = users[data.name];

  if (conn) {
    connection.otherName = data.name;

    sendTo(conn, {
      type: "offer",
      offer: data.offer,
      name: connection.name
    });
  }
}

function handleAnswer(connection, data) {
  console.log("Sending answer to:", data.name);

  const conn = users[data.name];

  if (conn) {
    connection.otherName = data.name;

    sendTo(conn, {
      type: "answer",
      answer: data.answer
    });
  }
}

function handleCandidate(connection, data) {
  console.log("Sending candidate to:", data.name);

  const conn = users[data.name];

  if (conn) {
    sendTo(conn, {
      type: "candidate",
      candidate: data.candidate
    });
  }
}

function handleLeave(connection, data) {
  console.log("Disconnecting from", data.name);

  const conn = users[data.name];
  connection.otherName = null;

  if (conn) {
    sendTo(conn, {
      type: "leave"
    });
  }
}

function handleUserDisconnect(connection) {
  if (connection.name) {
    delete users[connection.name];

    if (connection.otherName) {
      console.log("Disconnecting from", connection.otherName);
      const conn = users[connection.otherName];
      conn.otherName = null;

      if (conn) {
        sendTo(conn, {
          type: "leave"
        });
      }
    }
  }
}

function sendTo(connection, message) {
  connection.send(JSON.stringify(message));
}
