import mongoose from "mongoose";

// Creando Esquema de igual a como deberia 
const JuegoSchema = new mongoose.Schema({
    codigo: {type: String,required: true},
    estado: {type: String, required: true, default: "esperando"},
    jugadores: [{type: mongoose.Schema.Types.ObjectId, ref: "Jugador"}], // Referencia a modelo Jugador
    cartas: [{type: mongoose.Schema.Types.ObjectId, ref: "Carta"}], // Referencia a modelo Carta
    turno: [{type: mongoose.Schema.Types.ObjectId, ref: "Jugador"}], // Referencia a modelo Jugador
    fechaCreacion: {type: Date, default: Date.now }
    
});
// Exporto el modelo referenciado al esquema
export const Juego = mongoose.model("Juego", JuegoSchema, "juegos")