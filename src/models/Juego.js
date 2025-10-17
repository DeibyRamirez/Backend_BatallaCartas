import mongoose from "mongoose";

const juegoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    estado: {
      type: String,
      enum: ["esperando", "seleccionando", "jugando", "finalizado"],
      default: "esperando",
    },
    maxPlayers: { type: Number, default: 6 },
    playCount: { type: Number, default: 4 }, // Cartas que cada jugador selecciona
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
    // 🆕 CAMPO NUEVO: Atributo seleccionado para la ronda actual
    atributoActual: {
      type: String,
      enum: ["fuerza", "velocidad", "inteligencia", "rareza"],
      default: null,
    },
    // 🆕 CAMPO OPCIONAL: Para guardar el ganador al finalizar
    ganadorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Jugador",
      default: null 
    },
    // 🆕 CAMPO OPCIONAL: Fecha de finalización
    fechaFin: { 
      type: Date,
      default: null 
    },
  },
  { timestamps: true }
);

export const Juego = mongoose.model("Juego", juegoSchema, "juegos");