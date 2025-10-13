// models/Juego.js
import mongoose from "mongoose";

const JuegoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    estado: { type: String, default: "esperando" }, // esperando | jugando | finalizado
    maxPlayers: { type: Number, default: 6 },
    playCount: { type: Number, default: 4 },
    jugadores: [
      {
        jugadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Jugador" },
        socketId: { type: String },
        selectedCards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Carta" }],
        activo: { type: Boolean, default: true },
        ganadorRondas: { type: Number, default: 0 },
        cartasGanadas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Carta" }],
      },
    ],
    cartasEnBatalla: [
      {
        jugadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Jugador" },
        cartaId: { type: mongoose.Schema.Types.ObjectId, ref: "Carta" },
        atributo: String,
      },
    ],
    turnoIdx: { type: Number, default: 0 },
    ganadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Jugador" },
    fechaInicio: { type: Date, default: Date.now },
    fechaFin: Date,
  },
  { versionKey: false }
);

export const Juego = mongoose.model("Juego", JuegoSchema, "juegos");
