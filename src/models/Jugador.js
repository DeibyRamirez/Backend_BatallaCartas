import mongoose from "mongoose";
import { Socket } from "socket.io";

const JugadorSchema = new mongoose.Schema({
    nombre: {type: String, required: true},
    mano: [{type: mongoose.Schema.Types.ObjectId, ref: "Carta"}], // Relación con cartas
    socketid: {type: String, required: true}, // ID del socket para comunicación en tiempo real
    conectado: {type: Boolean, required: true, default: true},
    eliminado: {type: Boolean, required: true, default: false},
    ganadas: {type: Number, required: true, default: 0},
    
}, {versionKey: false});

export const Jugador = mongoose.model("Jugador", JugadorSchema, "jugadores");