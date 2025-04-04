// server.js
const { Server } = require("socket.io");

const io = new Server(3000, { cors: { origin: "*" } });


// Almacenamiento para todos los jugadores conectados
const players = {};

io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`);

    // Enviar jugadores existentes al nuevo jugador inmediatamente
    socket.emit('players', players);

    // Manejar nuevo jugador que se une
    socket.on('newPlayer', (playerData) => {
        console.log(`Registrando nuevo jugador: ${socket.id}`);
        players[socket.id] = {
            id: socket.id,
            x: playerData.x,
            y: playerData.y
        };

        // Enviar lista actualizada de jugadores a todos los clientes
        io.emit('players', players);
    });

    // Manejar movimiento del jugador
    socket.on('move', (moveData) => {
        if (players[socket.id]) {
            // Actualizar la posición del jugador en nuestro registro del servidor
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;

            // Enviar la posición actualizada a todos los demás clientes
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });


    // Cosa que hace aparecer bombas
    socket.on('addBomb', (moveData) => {
        if (players[socket.id]) {
            // En esta posicion es que se dejara la bomba
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;

            // Enviar la posición actualizada a todos los demás clientes
            socket.broadcast.emit('addBomb', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });


    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log(`Jugador desconectado: ${socket.id}`);
        delete players[socket.id];
        // Informar a todos los clientes que un jugador se ha desconectado
        io.emit('players', players);
    });
});


console.log(`Servidor de juego ejecutándose en el puerto: 3000`);
