// Importaciones nesesarias para el servidor local...

import express from "express";
import http from "http"; // Peticiones
import { Server } from "socket.io"; // Conexión socket en tiempo real
import cors from "cors"; // Permisos para conexion desde el frontend
import dotenv from "dotenv"; // Para manejo de variables secretas
import { conexionDB } from "./database.js"; // Uso de archivo de conexión
import cartaRoutes from "./routes/cartaRoutes.js";
import jugadorRoutes from "./routes/jugadorRoutes.js";
import juegoRoutes from "./routes/juegoRoutes.js";

dotenv.config(); // Carga las claves del archivo .env

const app = express(); // Permite el uso del paquete express para la creacion de las APIS
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Conexion a la base de datos...
conexionDB();

// Creamos una ruta de prueba
app.get("/", (req, res) => {
  // El req es el objeto que contiene la información que el cliente envia al servidor. (request/solicitud)
  // El res es el objeto que usamos para enviar algo de vuelta al cliente. (response/respuesta)
  res.send(" API Batalla Cartas funcionando correctamente...");
});

// Rutas a usar...
app.use("/api/juegos", juegoRoutes);
app.use("/api/jugadores", jugadorRoutes);
app.use("/api/cartas", cartaRoutes);

// SOCKET.IO (Tiempo real) -- Evento de conexión
io.on("connection", (socket) => {
  console.log(` Jugador Conectado: ${socket.id}`);

  // Unirse a la partida...
  socket.on("unirseJuego", (codigoJuego) => {
    console.log(` Jugador ${socket.id}, se unío al juego ${codigoJuego} `);
    socket.join(codigoJuego); // une al jugador a una sala expecifica.
    socket.emit("unidoJuego", {juego: codigoJuego}); // Respuesta del cliente.
   
  });

  //Jugar Carta
  socket.on("jugarCarta", (data) => {
    console.log(` Jugador ${socket.id} jugó una carta en  ${data.codigoJuego}:`);
    console.log(" Datos recividos: ", data);

    // Enviar la carta jugada a todos los jugadores de esa sala.
    io.to(data.codigoJuego).emit("cartaJugada", data);
  });

  //Desconexión
  socket.on("disconnect", () => {
    console.log(`Jugador desconectado: ${socket.id}`);
  });
});

// Puerto
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🤖 Servidor corriendo en http://localhost:${PORT} `);
});
