// models/Juego.js
import mongoose from "mongoose";

// models/Juego.js
const juegoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    estado: {
      type: String,
      enum: ["esperando", "seleccionando", "jugando", "finalizado"],
      default: "esperando",
    },
    maxPlayers: { type: Number },
    playCount: { type: Number }, // Cartas que cada jugador selecciona
    jugadores: [
      {
        jugadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Jugador" },
        socketId: String,
        selectedCards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Carta" }],
        activo: { type: Boolean, default: true },
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
  },
  { timestamps: true }
);

export const Juego = mongoose.model("Juego", juegoSchema, "juegos");
