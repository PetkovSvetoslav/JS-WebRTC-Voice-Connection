// Our username
var name;
var connectedUser;

// Connecting to our signaling server
var conn = new WebSocket('ws://localhost:9090');

conn.onopen = function () {
   console.log("Connected to the signaling server");
};

// When we receive a message from the signaling server
conn.onmessage = function (msg) {
   console.log("Got message", msg.data);
   var data = JSON.parse(msg.data);

   switch (data.type) {
      case "login":
         handleLogin(data.success);
         break;
      // When somebody wants to call us
      case "offer":
         handleOffer(data.offer, data.name);
         break;
      case "answer":
         handleAnswer(data.answer);
         break;
      // When a remote peer sends an ice candidate to us
      case "candidate":
         handleCandidate(data.candidate);
         break;
      case "leave":
         handleLeave();
         break;
      default:
         break;
   }
};

conn.onerror = function (err) {
   console.log("Got error", err);
};

// Alias for sending JSON encoded messages
function send(message) {
   // Attach the other peer username to our messages
   if (connectedUser) {
      message.name = connectedUser;
   }

   conn.send(JSON.stringify(message));
}

// ******
// UI selectors block
// ******

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');

var hangUpBtn = document.querySelector('#hangUpBtn');
var localAudio = document.querySelector('#localAudio');
var remoteAudio = document.querySelector('#remoteAudio');

var yourconn; // Updated variable name

callPage.style.display = "none";

// Login when the user clicks the button
loginBtn.addEventListener("click", function (event) {
   name = usernameInput.value;

   if (name.length > 0) {
      send({
         type: "login",
         name: name
      });
   }
});

function handleLogin(success) {
   if (success === false) {
      alert("Oops... try a different username");
   } else {
      loginPage.style.display = "none";
      callPage.style.display = "block";

      // ***********************
      // Starting a peer connection
      // ***********************

      // Getting local audio stream
      navigator.webkitGetUserMedia({ video: false, audio: true }, function (myStream) {
         stream = myStream;

         // Displaying local audio stream on the page
         localAudio.srcObject = stream;

         // Using Google public stun server
         var configuration = {
            "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
         };

         yourconn = new RTCPeerConnection(configuration); // Updated variable name

         // Setup stream listening
         yourconn.addStream(stream);

         // When a remote user adds stream to the peer connection, we display it
         yourconn.onaddstream = function (e) {
            remoteAudio.srcObject = e.stream;
         };

         // Setup ice handling
         yourconn.onicecandidate = function (event) {
            if (event.candidate) {
               send({
                  type: "candidate",
                  candidate: event.candidate
               });
            }
         };

      }, function (error) {
         console.log(error);
      });

   }
}

// Initiating a call
callBtn.addEventListener("click", function () {
   var callToUsername = callToUsernameInput.value;

   if (callToUsername.length > 0) {
      connectedUser = callToUsername;

      // Create an offer
      yourconn.createOffer(function (offer) {
         send({
            type: "offer",
            offer: offer
         });

         yourconn.setLocalDescription(offer);
      }, function (error) {
         alert("Error when creating an offer");
      });
   }
});

// When somebody sends us an offer
function handleOffer(offer, name) {
   connectedUser = name;
   yourconn.setRemoteDescription(new RTCSessionDescription(offer));

   // Create an answer to an offer
   yourconn.createAnswer(function (answer) {
      yourconn.setLocalDescription(answer);

      send({
         type: "answer",
         answer: answer
      });

   }, function (error) {
      alert("Error when creating an answer");
   });

}

// When we got an answer from a remote user
function handleAnswer(answer) {
   yourconn.setRemoteDescription(new RTCSessionDescription(answer));
}

// When we got an ice candidate from a remote user
function handleCandidate(candidate) {
   yourconn.addIceCandidate(new RTCIceCandidate(candidate));
}

// Hang up
hangUpBtn.addEventListener("click", function () {
   send({
      type: "leave"
   });

   handleLeave();
});

function handleLeave() {
   connectedUser = null;
   remoteAudio.srcObject = null;

   yourconn.close();
   yourconn.onicecandidate = null;
   yourconn.onaddstream = null;
}
