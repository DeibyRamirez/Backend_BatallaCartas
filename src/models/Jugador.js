import mongoose from "mongoose";

const JugadorSchema = new mongoose.Schema({
    nombre: {type: String, required: true},
    mano: [{type: mongoose.Schema.Types.ObjectId, ref: "Carta"}], // Relación con cartas
    ganadas: {type: Number, required: true, default: 0},
    perdidas: {type: Number, required: true, default: 0} 
});

export const Jugador = mongoose.model("Jugador", JugadorSchema, "jugadores");