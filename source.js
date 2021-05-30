const socket = io.connect("https://rtc-test-server.herokuapp.com/");
console.log(socket);
const peerConnections = {};
let captureStream = null;
 var client;
var Tvideo = document.getElementById('videocontent');


function onBroadcast() {
 
  socket.emit('broadcaster');
  console.log("video started");
  
   //Connect Options
      var options = {
        timeout: 3,
        //Gets Called if the connection has sucessfully been established
        onSuccess: function () {
          console.log("Connected");
        },
        //Gets Called if the connection could not be established
        onFailure: function (message) {
          console.log("Connection failed: " + message.errorMessage);
        },
	useSSL: true
      };
	 client = new Messaging.Client("broker.emqx.io", 8084, "myclientid_ruvin123");
 
 
  //Gets  called if the websocket/mqtt connection gets disconnected for any reason
      client.onConnectionLost = function (responseObject) {
        //Depending on your scenario you could implement a reconnect logic here
       console.log("connection lost: " + responseObject.errorMessage);
      };

      client.connect(options);
  
  
  
};

function onScreenShare() {
 startCapture(Tvideo); 
 
};

function onSend(){
	
    var x = document.getElementById("myTextarea").value;
    dataChannelB.send(x);	
};


const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};
 var dataChannelA;
 var dataChannelB;

//creat broadcasters sdp and emit
socket.on('watcher', function (id) {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;
   peerConnection.addStream(Tvideo.captureStream());	
  dataChannelA = peerConnection.createDataChannel("channelA", {negotiated: true, id: 1});
  dataChannelB = peerConnection.createDataChannel("channelB", {negotiated: true, id: 2});
 
  peerConnection.createOffer()
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(function () {
          socket.emit('offer', id, peerConnection.localDescription);
		  console.log("emit offer");
      });
  peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
          socket.emit('candidate', id, event.candidate);
      }
  };
  
  	
    dataChannelA.onopen = function (event) {
      console.log("Data channel A ready");  
  };
   dataChannelB.onopen = function (event) {
      console.log("Data channel B ready ");  
  };
   dataChannelA.onmessage = function(event){
      console.log(event.data);
	  
      let topic = "testtopic/laser/pos";
      let qos = 2;

      var message = new Messaging.Message(event.data);
      message.destinationName = topic;
      message.qos = qos;
      client.send(message);
    
      };
	  dataChannelB.onmessage = function(event){
      console.log("chanel B "+event.data);     
      document.getElementById("recieveMsg").value += event.data + '\r\n';
      };

     });
	


//get clients sdp
socket.on('answer', function (id, description) {
  peerConnections[id].setRemoteDescription(description);
});

socket.on('candidate', function (id, candidate) {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('bye', function (id) {
  peerConnections[id] && peerConnections[id].close();
  delete peerConnections[id];
});

var displayMediaOptions = {
   video: {
     cursor: "always"
   },
   audio: false
 };
async function startCapture(Tvideo) {


   try {
     captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
     Tvideo.srcObject=captureStream;
 
   } catch(err) {
     console.error("Error: " + err);
   }
   return captureStream;
 }
