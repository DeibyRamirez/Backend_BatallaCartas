import mongoose from "mongoose";

const JugadorSchema = new mongoose.Schema({
    nombre: {type: String, required: true},
    mano: [{type: mongoose.Schema.Types.ObjectId, ref: "Carta"}], // Relación con cartas
    socketid: {type: String}, // ID del socket para comunicación en tiempo real
    conectado: {type: Boolean, default: true},
    eliminado: {type: Boolean, default: false},
    ganadas: {type: Number, default: 0},
    
}, {versionKey: false});

export const Jugador = mongoose.model("Jugador", JugadorSchema, "jugadores");