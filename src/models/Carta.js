import mongoose from "mongoose";

const CartaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    imagen: { type: String, required: true },
    atributos: {
      fuerza: { type: Number, required: true },
      velocidad: { type: Number, required: true },
      inteligencia: { type: Number, required: true },
      rareza: { type: Number, required: true },
    },
  },
  { versionKey: false }
);

//Mongoose hará lo siguiente internamente:
//Convertirá "Carta" a minúsculas: carta
//Lo pluralizará: cartas
//Buscará (o creará) una colección llamada cartas en tu base de datos
//👉 Entonces, si tu colección real se llama cartas.

export const Carta = mongoose.model("Carta", CartaSchema, "cartas");
