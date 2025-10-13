import mongoose from "mongoose";

// Creando Esquema de igual a como deberia
const JuegoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    estado: { type: String, required: true, default: "esperando" },
    jugadores: [
      {
        jugadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Jugador" },
        socketId: { type: String },
        selectedCards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Carta" }], // cartas elegidas para la batalla (K)
        activo: { type: Boolean, default: true }, // si sigue en juego (no eliminado)
      },
    ],
    cartasEnBatalla: [{ type: mongoose.Schema.Types.ObjectId, ref: "Carta" }], // pozo temporal (empates)
    maxPlayers: { type: Number, default: 6 }, // 6 o 8 (configurable)
    playCount: { type: Number, default: 4 }, // cuántas cartas se jugarán por jugador en esa partida (K)
    turnoIdx: { type: Number, default: 0 }, // índice del jugador que tiene turno para elegir atributo
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
// Exporto el modelo referenciado al esquema
export const Juego = mongoose.model("Juego", JuegoSchema, "juegos");
