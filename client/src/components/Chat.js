import React, { useState, useEffect } from "react";
import socket from "../socket/socket";
import SimplePeer from "simple-peer";
function Chat() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [listOfClients, setListOfClients] = useState([]);
    const [recipient, setRecipient] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [stream, setStream] = useState(null);
    const [peer, setPeer] = useState(null);
  
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
  
    function startVideoCall() {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setStream(stream);
          const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: stream,
          });
  
          peer.on("signal", (data) => {
            console.log(data);
            socket.emit("signal", {
              signal: data,
              recipient,
            });
          });
  
          peer.on("stream", (stream) => {
            // Display the remote stream in a video element
            const video = document.getElementById("remoteVideo");
            video.srcObject = stream;
            video.play();
          });
  
          setPeer(peer);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  
    function stopVideoCall() {
      if (peer) {
        peer.destroy();
        setPeer(null);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  

    return (
        <div>
          <h1>Real-time Chat App</h1>
          <div>
            <h2>Connected Clients:</h2>
            <ul>
              {listOfClients.map((client) => (
                <li key={client.id}>{client.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Chat</h2>
            <div>
              <form onSubmit={handleFormSubmit}>
                <label htmlFor="messageInput">Message:</label>
                <input
                  type="text"
                  id="messageInput"
                  value={inputValue}
                  onChange={handleInputChange}
                />
                <label htmlFor="recipientInput">Recipient:</label>
                <input
                  type="text"
                  id="recipientInput"
                  value={recipient}
                  onChange={handleRecipientChange}
                />
                <button type="submit">Send</button>
              </form>
            </div>
            <ul>
              {messages.map((message, index) => (
                <li key={index}>
                  <strong>{message.sender}:</strong> {message.message}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Video Call</h2>
            {stream ? (
              <div>
                <video id="remoteVideo" autoPlay />
                <button onClick={stopVideoCall}>End Call</button>
              </div>
            ) : (
              <button onClick={startVideoCall}>Start Video Call</button>
            )}
          </div>
          <div>
            <h2>Copy Address</h2>
            {listOfClients.map((client) => (
              <button key={client.id} onClick={() => handleCopyAddress(client.id)}>
                {client.id}
              </button>
            ))}
          </div>
        </div>
      );
      
      
}

export default Chat;
