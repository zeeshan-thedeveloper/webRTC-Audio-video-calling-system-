import io from 'socket.io-client';

var socket = io('http://192.168.8.103:3000', { transports : ['websocket'] });

export default socket;
