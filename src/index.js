// Importaciones nesesarias para el servidor local...

import express from "express";
import http from "http"; // Peticiones
import { Server } from "socket.io"; // Conexión socket en tiempo real
import cors from "cors"; // Permisos para conexion desde el frontend
import dotenv from "dotenv"; // Para manejo de variables secretas
import { conexionDB } from "./database.js"; // Uso de archivo de conexión

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

// SOCKET.IO (Tiempo real)
io.on("conexion", (socket) => {
  console.log(" Jugador Conectado: ", socket.id);

  socket.on("desconexión", () => {
    console.log(" Jugador desconectado: ", socket.id);
  });
});

// Puerto
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT} `);
});
