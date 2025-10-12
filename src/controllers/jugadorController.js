import { Jugador } from "../models/Jugador.js";

// Crear un Jugador
export const crearJugador = async (req, res) => {
  try {
    const nuevoJugador = new Jugador(req.body);
    await nuevoJugador.save();
    res.status(201).json(nuevoJugador);
  } catch (error) {
    res.status(400).json({ message: "No se pudo crear el Jugador" });
  }
};

// Listar Jugadores
export const buscarJugador = async (req, res) => {
  try {
    const jugadores = await Jugador.find();
    res.status(200).json(jugadores);
  } catch (error) {
    res.status(400).json({ message: "No se encontraron Jugadores" });
  }
};

//Bucar Jugador por Id
export const buscarJugadorPorId = async (req, res) => {
  const jugador = await Jugador.findById(req.params.id);
  res.status(200).json(jugador);

  if (!juego) return res.status(400).json({ message: "Jugador no encontrado" });
};

// Actualizar Jugador
export const actualizarJugador = async (req, res) => {
  try {
    const jugador = await Jugador.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json(jugador);
  } catch (error) {
    res.status(400).json({ message: "No fue Posible actualizar el Jugador" });
  }
};

// Eliminar Jugador
export const eliminarJugador = async (req, res) => {
  try {
    await Jugador.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Jugador eliminado" });
  } catch (error) {
    res.status(400).json({ message: "No fue Posible eliminar el Jugador" });
  }
};
