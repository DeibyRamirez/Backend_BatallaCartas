import mongoose from "mongoose";

const CartaSchema = new mongoose.Schema({
    nombre: {type: String, required: true},
    imagen: {type: String, required: true},
    atributos: {
        fuerza: {type: Number, required: true},
        velocidad: {type: Number, required: true},
        inteligencia: {type: Number, required: true},
        rareza: {type: Number, required: true},
    }
});

export const Carta = mongoose.model("Carta", CartaSchema);