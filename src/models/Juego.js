import mongoose from "mongoose";

const apuestaSchema = new mongoose.Schema({
  jugadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Jugador",
    required: true,
  },
  cartaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Carta",
    required: true,
  },
  numero: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  carta: {
    type: Object, // Guardamos el objeto completo de la carta para mostrarlo
  },
});

const juegoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    estado: {
      type: String,
      enum: ["esperando", "seleccionando", "jugando", "finalizado"],
      default: "esperando",
    },
    maxPlayers: {
      type: Number,
      default: 6,
      min: 2,
      max: 10,
    },
    playCount: {
      type: Number,
      default: 4,
      min: 1,
    },
    jugadores: [
      {
        jugadorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Jugador",
          required: true,
        },
        socketId: String,
        selectedCards: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Carta",
          },
        ],
        activo: {
          type: Boolean,
          default: true,
        },
      },
    ],
    // Nueva lógica de apuestas
    apuestas: [apuestaSchema],
    numeroGanador: {
      type: Number,
      min: 1,
      max: 10,
    },
    turnoIdx: {
      type: Number,
      default: 0,
    },
    ganadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Jugador",
    },
    fechaInicio: {
      type: Date,
      default: Date.now,
    },
    fechaFin: Date,
  },
  {
    timestamps: true,
  }
);

// Índice para búsquedas rápidas por código
juegoSchema.index({ codigo: 1 });

// Método para verificar si todos los jugadores activos han apostado
juegoSchema.methods.todosApostaron = function () {
  const jugadoresActivos = this.jugadores.filter((j) => j.activo);
  return this.apuestas.length === jugadoresActivos.length;
};

// Método para obtener jugadores activos
juegoSchema.methods.getJugadoresActivos = function () {
  return this.jugadores.filter((j) => j.activo);
};

export const Juego = mongoose.model("Juego", juegoSchema);
