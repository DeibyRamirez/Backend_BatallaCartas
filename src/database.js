// Conexión a la base de datos...

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const conexionDB = async () => {
  // try para manejar los errores de conexión.
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "BatallaCartas",  // Nombre exacto de la base de datos dentro del cluster...
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(" Conectado a Mongo Atlas ");
  } catch (error) {
    console.log(" Error al conectar con MogoDB: ", error.message);
  }
};
