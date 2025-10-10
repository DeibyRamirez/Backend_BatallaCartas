// Conexión a la base de datos...

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const conexionDB = async () => {
  // try para manejar los errores de conexión.
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(" Conectado a Mongo Atlas ");
  } catch (error) {
    console.log(" Error al conectar con MogoDB: ", error.message);
  }
};
