const app = require("express")();
app.listen(9095, () => console.log("Listening on http port 9095"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

const http = require("http");
const httpServer = http.createServer();
httpServer.listen(9096, () => console.log("Listening.. on 9096"));
const websocketServer = require("websocket").server;
const wsServer = new websocketServer({
  httpServer: httpServer,
}); // making websocket on top of this http

// When we say that the WebSocket server is integrated with the HTTP server, we mean that the two servers are working together and sharing the same network resources, such as the same port number.

// This allows the WebSocket server to use the same port number as the HTTP server and handle WebSocket upgrade requests using the same HTTP server resources.

// The httpServer object is passed in as an argument to the WebSocket server constructor to handle WebSocket upgrade requests. When a client connects to the WebSocket server, the WebSocket server sends an HTTP upgrade request to the HTTP server to upgrade the connection from HTTP to WebSocket. The httpServer object is responsible for handling this upgrade request and establishing the WebSocket connection with the client.

// Overall, passing the httpServer object to the WebSocket server constructor is necessary to integrate the WebSocket server with an HTTP server and handle WebSocket upgrade requests.

// When we say that the WebSocket server is integrated with the HTTP server, we mean that the two servers are working together and sharing the same network resources, such as the same port number.

// By integrating the WebSocket server with the HTTP server, we are able to handle both HTTP and WebSocket connections on the same port number, and use the same HTTP server resources to handle the WebSocket upgrade requests.

/*
In the WebSocket protocol, an upgrade request is an HTTP request that is sent from the client to the server or vice versa, requesting to upgrade the connection from a regular HTTP connection to a WebSocket connection.

The upgrade request is initiated by the client when it wants to establish a WebSocket connection with the server. The client sends an HTTP request to the server with a special header called "Upgrade" set to the value "websocket", and a "Connection" header set to the value "Upgrade". This indicates to the server that the client wants to upgrade the connection to a WebSocket connection.

When the server receives this upgrade request, it can respond with an HTTP response with a status code of 101 (Switching Protocols) and a special "Upgrade" header set to the value "websocket", along with any other headers that are required for the WebSocket protocol. This indicates to the client that the server has accepted the upgrade request and that the connection has been successfully upgraded to a WebSocket connection.

Once the connection has been upgraded to a WebSocket connection, the client and server can exchange WebSocket messages, which are different from regular HTTP messages.

In the context of integrating a WebSocket server with an HTTP server, when a client makes a connection request to the WebSocket server, the WebSocket server sends an upgrade request to the HTTP server to upgrade the connection from HTTP to WebSocket, as I mentioned in my previous response. The HTTP server handles this upgrade request and establishes the WebSocket connection with the client, allowing the client and server to exchange WebSocket messages.
*/

//////////////////////////////////////////////////////////////////
// and we need to do this upgradation:
// we can't solely use websocket  directly
//WebSocket is a protocol that runs on top of the HTTP protocol, and it was designed to provide a way to establish a persistent, bi-directional communication channel between a client and a server, which is optimized for real-time web applications. When a WebSocket client makes a connection request to a WebSocket server, the server sends an HTTP upgrade request to the client to upgrade the connection to a WebSocket connection.
///////////////////////////////////////////////////////////////

//hashmap clients
const clients = {};
const games = {};

wsServer.on("request", (request) => {
  //connect
  const connection = request.accept(null, request.origin);

  //###/////////////////////////////////////////////////////////////////////////////////////////////////
  //generate a new clientId
  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

  const payLoad = {
    method: "connect",
    clientId: clientId,
  };
  //send back the client connect
  connection.send(JSON.stringify(payLoad));
  //###////////////////////////////////////////////////////////////////////////////////////////////////

  connection.on("open", () => console.log("opened!"));
  connection.on("close", () => console.log("closed!"));
  connection.on("message", (message) => {
    const result = JSON.parse(message.utf8Data);
    //I have received a message from the client
    //a user want to create a new game
    if (result.method === "create") {
      const clientId = result.clientId;
      const gameId = guid();
      games[gameId] = {
        id: gameId,
        balls: 20,
        clients: [],
      };

      const payLoad = {
        method: "create",
        game: games[gameId],
      };

      const con = clients[clientId].connection;
      // iske through store kr rhe : ki kise send krna h
      //jha se create ka request aaya use ye payload send kr rhe
      con.send(JSON.stringify(payLoad));
    }

    //a client want to join
    if (result.method === "join") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const game = games[gameId];
      if (game.clients.length >= 3) {
        //sorry max players reach
        return;
      }
      const color = { 0: "Red", 1: "Green", 2: "Blue" }[game.clients.length];
      game.clients.push({
        clientId: clientId,
        color: color,
      });
      //start the game
      if (game.clients.length === 3) updateGameState();

      const payLoad = {
        method: "join",
        game: game,
      };
      //loop through all clients and tell them that people has joined
      game.clients.forEach((c) => {
        clients[c.clientId].connection.send(JSON.stringify(payLoad));
      });
    }
    //a user plays
    if (result.method === "play") {
      const gameId = result.gameId;
      const ballId = result.ballId;
      const color = result.color;
      let state = games[gameId].state;
      if (!state) state = {};

      state[ballId] = color;
      games[gameId].state = state;
      console.log(games[gameId]);
    }
  });
});

function updateGameState() {
  //{"gameid", fasdfsf}
  for (const g of Object.keys(games)) {
    const game = games[g];
    const payLoad = {
      method: "update",
      game: game,
    };

    game.clients.forEach((c) => {
      clients[c.clientId].connection.send(JSON.stringify(payLoad));
    });
  }

  setTimeout(updateGameState, 500);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//these two functions are for generating uique ids
function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
} //a code of four random digits
// then to call it, plus stitch in '4' in the third group
const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
