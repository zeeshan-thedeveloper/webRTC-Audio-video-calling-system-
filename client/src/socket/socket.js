import io from 'socket.io-client';

var socket = io('http://localhost:3000', { transports : ['websocket'] });

export default socket;
