// server.js
const { Server } = require("socket.io");

const io = new Server(3000, { cors: { origin: "*" } });

// Almacenamiento para todos los jugadores conectados
const players = {};

// Tamaño del tablero y los tiles - deben coincidir con el cliente
const GRID_SIZE = 50;

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
            y: playerData.y,
            health: playerData.health || 100
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
            
            // Actualizar la salud si se proporciona
            if (moveData.health !== undefined) {
                players[socket.id].health = moveData.health;
            }

            // Enviar la posición actualizada a todos los demás clientes
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y,
                health: players[socket.id].health
            });
        }
    });

    // Cosa que hace aparecer bombas
    socket.on('addBomb', (bombData) => {
        if (players[socket.id]) {
            // Enviar la posición de la bomba a todos los demás clientes
            socket.broadcast.emit('addBomb', {
                id: socket.id,
                x: bombData.x,
                y: bombData.y,
                tileX: bombData.tileX,
                tileY: bombData.tileY
            });
        }
    });

    // Manejar explosión de bomba y daño a jugadores
    socket.on('bombExploded', ({ id, tileX, tileY }) => {
        console.log(`Bomba de ${id} explotó en (${tileX}, ${tileY})`);
        
        // Determinar qué jugadores son afectados por la explosión
        const playersHit = [];
        const explosionRange = 1; // La bomba afecta a las casillas adyacentes
        
        // Verificar si algún jugador está en el rango de la explosión
        Object.entries(players).forEach(([playerId, playerData]) => {
            // Convertir posición de píxeles a coordenadas de casilla
            const playerTileX = Math.floor(playerData.x / GRID_SIZE);
            const playerTileY = Math.floor(playerData.y / GRID_SIZE);
            
            // Verificar si el jugador está en el rango de la explosión (centro o adyacentes)
            if ((Math.abs(playerTileX - tileX) <= explosionRange && playerTileY === tileY) || 
                (Math.abs(playerTileY - tileY) <= explosionRange && playerTileX === tileX)) {
                
                // Añadir a la lista de jugadores afectados
                playersHit.push(playerId);
                
                // Reducir la salud del jugador
                if (players[playerId]) {
                    players[playerId].health -= 25; // Restar 25 de salud
                    
                    // Asegurarse de que la salud no sea negativa
                    if (players[playerId].health < 0) {
                        players[playerId].health = 0;
                    }
                    
                    // Enviar actualización de salud a todos los clientes
                    io.emit('playerHealthUpdate', {
                        id: playerId,
                        health: players[playerId].health
                    });
                    
                    // Si el jugador muere
                    if (players[playerId].health <= 0) {
                        io.emit('playerDied', { id: playerId });
                    }
                }
            }
        });
        
        // Broadcast the explosion to all clients with list of affected players
        io.emit('bombExploded', { 
          id, 
          tileX, 
          tileY,
          playersHit 
        });
    });
    
    // Manejar actualización de salud
    socket.on('updateHealth', ({ id, health }) => {
        if (players[id]) {
            players[id].health = health;
            io.emit('playerHealthUpdate', { id, health });
        }
    });
    
    // Manejar cuando un jugador muere
    socket.on('playerDied', ({ id }) => {
        if (players[id]) {
            players[id].health = 0;
            io.emit('playerDied', { id });
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