import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { conexionDB } from "./database.js";
import cartaRoutes from "./routes/cartaRoutes.js";
import jugadorRoutes from "./routes/jugadorRoutes.js";
import juegoRoutes from "./routes/juegoRoutes.js";
import { configurarSockets } from "./socket.js";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express(); // ✅ Primero declaras app
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
configurarSockets(io);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ✅ Luego de crear app, ya puedes servir imágenes estáticas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/img", express.static(path.join(__dirname, "../public/img")));

// 📦 Conexión a la base de datos
conexionDB();

// 🧪 Ruta de prueba
app.get("/", (req, res) => {
  res.send("API Batalla Cartas funcionando correctamente...");
});

// 📚 Rutas principales
app.use("/api/juegos", juegoRoutes);
app.use("/api/jugadores", jugadorRoutes);
app.use("/api/cartas", cartaRoutes);

// 🚀 Puerto
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🤖 Servidor corriendo en http://localhost:${PORT}`);
});
