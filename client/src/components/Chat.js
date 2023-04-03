import React, { useState, useEffect } from "react";
import socket from "../socket/socket";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [listOfClients, setListOfClients] = useState([]);
  const [recipient, setRecipient] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [peerConnection, setPeerConnection] = useState(new RTCPeerConnection());
  const [recOfferObject, setRecOfferObject] = useState(null);
  useEffect(() => {
    // Listen for incoming messages
    socket.on("message", (data) => {
      setMessages((messages) => [...messages, data]);
    });

    socket.on("connect", () => {
      console.log("connected to server");
      socket.emit("getCurrentUserId");
    });

    socket.on("connectedClients", (clients) => {
      console.log("Connected clients:", clients);
      setListOfClients(clients);
    });

    socket.on("currentUserId", (currentUserId) => {
      console.log("currentUserId : " + currentUserId);
      setCurrentUserId(currentUserId);
      socket.emit("getConnectedClients", { currentUserId });
    });

    socket.on("offer", async (data) => {
      console.log("recieved offer ", data.offer);
      setRecOfferObject(data);
    });

    socket.on("answer", async (data) => {
      try {
        console.log("Received answer:", data.answer);
        const answer = new RTCSessionDescription(data.answer);
        // Set the received answer as the remote description
        await peerConnection.setRemoteDescription(answer);
        peerConnection.ontrack = function (event) {
          console.log("video track", event);
          const remoteVideo = document.getElementById("remote-video");
          remoteVideo.srcObject = event.streams[0];
        };
        peerConnection.addEventListener('iceconnectionstatechange', event => {
            console.log(`ICE connection state changed to ${peerConnection.iceConnectionState}`);
          });
          
          peerConnection.addEventListener('signalingstatechange', event => {
            console.log(`Signaling state changed to ${peerConnection.signalingState}`);
          });
        console.log("Remote description set with answer:", answer);
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    });

    // socket.on("offer", async (data) => {
    //   try {
    //     console.log("received offer :", data);
    //     // Create a new RTCPeerConnection object
    //     const peerConnection = new RTCPeerConnection();
    //     // Set the remote description to the received offer
    //     await peerConnection.setRemoteDescription(data.offer);

    //     // Add local media stream to peer connection
    //     const stream = await navigator.mediaDevices.getUserMedia({
    //       audio: true,
    //       video: true,
    //     });

    //     stream.getTracks().forEach((track) => {
    //       peerConnection.addTrack(track, stream);
    //     });

    //     // Set the video stream as the source for the video tag
    //     const localVideo = document.getElementById("remote-video");
    //     localVideo.srcObject = stream;

    //     const peerConnectionRem = new RTCPeerConnection();
    //     // Create an answer and send it back to the sender
    //     await peerConnectionRm.setLocalDescription(data.offer);
    //     const answer = await peerConnectionRem.createAnswer();
    //     await peerConnectionRem.setLocalDescription(answer);

    //     socket.emit("answer", {
    //       answer,
    //       sender: currentUserId,
    //       recipient: data.sender,
    //     });

    //     // Save the peer connection for later use
    //     setPeerConnection(peerConnectionRem);
    //   } catch (error) {
    //     console.error("Error handling offer:", error);
    //   }
    // });

    // socket.on("answer", async (data) => {
    //     try {
    //       console.log("Received answer:", data.answer);
    //       // Parse the SDP to get the media descriptions
    //       await peerConnectionRm.setRemoteDescription(data.answer);
    //       // Add the remote stream to the video element
    //       peerConnectionRm.addEventListener("track", (event) => {
    //         const remoteVideo = document.getElementById("remote-video");
    //         if (remoteVideo.srcObject !== event.streams[0]) {
    //           remoteVideo.srcObject = event.streams[0];
    //         }
    //       });

    //       console.log("setted remote in asnwer")
    //     } catch (error) {
    //       console.error("Error handling answer:", error);
    //     }
    // });

    // Clean up the listener when the component unmounts
    return () => {
      socket.off("message");
    };
  }, []);

  function handleInputChange(event) {
    setInputValue(event.target.value);
  }

  function handleRecipientChange(event) {
    setRecipient(event.target.value);
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    socket.emit("message", {
      message: inputValue,
      recipient,
      sender: currentUserId,
    });
    setInputValue("");
  }

  function handleCopyAddress(address) {
    setRecipient(address);
  }
  async function attendCall(event) {
    event.preventDefault();
    try {
      if (recOfferObject != null) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Add the local stream to the peer connection
        console.log("stream.getTracks()",stream.getTracks())
       
        const remoteVideo = document.getElementById("localVideo");
        remoteVideo.srcObject = stream;

        const offer = new RTCSessionDescription(recOfferObject.offer);
        await peerConnection.setRemoteDescription(offer);

        // Add the ontrack listener to receive the remote tracks
        peerConnection.ontrack = function (event) {
          console.log("remote track received:", event.track);
          const remoteVideo = document.getElementById("remote-video");
          remoteVideo.srcObject = event.streams[0];
        };

        const answer = await peerConnection.createAnswer();
        stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

        await peerConnection.setLocalDescription(answer);
        peerConnection.addEventListener('iceconnectionstatechange', event => {
            console.log(`ICE connection state changed to ${peerConnection.iceConnectionState}`);
          });
          
          peerConnection.addEventListener('signalingstatechange', event => {
            console.log(`Signaling state changed to ${peerConnection.signalingState}`);
          });
        socket.emit("answer", {
          answer,
          sender: currentUserId,
          recipient: recOfferObject.sender,
        });
      } else {
        alert("no offer found");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function sendCallRequest(event) {
    event.preventDefault();
    try {
      // Create a new RTCPeerConnection object
      // Add local media stream to peer connection
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      console.log("stream.getTracks()",stream.getTracks())
      // Send offer to recipient
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
      
      const offer = await peerConnection.createOffer();
      
     
      await peerConnection.setLocalDescription(offer);
      socket.emit("offer", { offer, sender: currentUserId, recipient });
      // Save the peer connection for later use

      peerConnection.ontrack = function (event) {
        console.log("video track", event);
        const remoteVideo = document.getElementById("remote-video");
        remoteVideo.srcObject = event.streams[0];
      };

      peerConnection.addEventListener('iceconnectionstatechange', event => {
        console.log(`ICE connection state changed to ${peerConnection.iceConnectionState}`);
      });
      
      peerConnection.addEventListener('signalingstatechange', event => {
        console.log(`Signaling state changed to ${peerConnection.signalingState}`);
      });
      // Set the video stream as the source for the video tag
      const localVideo = document.getElementById("localVideo");
      localVideo.srcObject = stream;

      setPeerConnection(peerConnection);
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }

  return (
    <div>
      <h1>Chat App</h1>
      <p>Your Id: {currentUserId}</p>
      <h2>Connected Clients:</h2>
      <ul>
        {listOfClients.map((client, index) => (
          <li key={index}>
            {client !== currentUserId && (
              <span>
                {" "}
                {client}
                <button onClick={() => handleCopyAddress(client)}>
                  Select Address
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <h2>Messages:</h2>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>
            {currentUserId !== message.sender && (
              <span>
                {message.sender}: {message.message}
              </span>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleFormSubmit}>
        <label>
          Recipient:
          <input
            type="text"
            value={recipient}
            onChange={handleRecipientChange}
          />
        </label>
        <br />
        <label>
          Message:
          <input type="text" value={inputValue} onChange={handleInputChange} />
        </label>
        <br />
        <button type="submit">Send</button>
        <button onClick={sendCallRequest}>Send Call Request</button>
        {recOfferObject != null && (
          <div>
            <h5>incoming call</h5>
            <button onClick={attendCall}>Attend</button>
          </div>
        )}
      </form>
      <div>
        <h4>Local</h4>
        <video id="localVideo" autoPlay></video>
      </div>
      <div>
        <h4>Remote</h4>
        <video id="remote-video" autoPlay></video>
      </div>
    </div>
  );
}

export default Chat;
