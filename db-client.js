const PORT = 3000;

const io = require('socket.io-client');

const socket = io(`http://localhost:${PORT}`, {
  path: '/dbyb',
});

socket.on('connect', () => {
  console.log('Connection établie');

  let acc;

  socket.emit('get', 'test', (value) => {
    console.log(`get callback: ${value}`);
    acc = value || 0;

    socket.emit('set', 'test', acc + 1, (value) => {
      console.log(`set callback: ${value}`);
      socket.close();
    });
  });
});
