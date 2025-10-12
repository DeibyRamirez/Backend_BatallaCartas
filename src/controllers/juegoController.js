import { Juego } from "../models/Juego.js";

// Crear una Partida o Juego
export const crearJuego = async (req, res) => {
  try {
    const nuevoJuego = new Juego(req.body);
    await nuevoJuego.save();
    res.status(201).json(nuevoJuego);
  } catch (error) {
    res.status(400).json({ message: "No se pudo crear la Partida" });
  }
};

// Listar Partidas o Juegos
export const buscarJuegos = async (req, res) => {
  try {
    const juegos = await Juego.find();
    res.status(200).json(juegos);
  } catch (error) {
    res.status(400).json({ message: "No se encontraron Partidas" });
  }
};

//Buscar Partida o Juego por Id
export const buscarJuegoPorId = async (req, res) => {
  const juego = await Juego.findById(req.params.id);
  res.status(200).json(juego);

  if (!juego) return res.status(400).json({ message: "Partida no encontrada" });
};

// Actualizar Partida o Juego
export const actualizarJuego = async (req, res) => {
  try {
    const juego = await Juego.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json(juego);
  } catch (error) {
    res.status(400).json({ message: "No fue Posible actualizar la Partida" });
  }
};

// Eliminar Partida o Juego
export const eliminarJuego = async (req, res) => {
  try {
    await Juego.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Partida eliminada" });
  } catch (error) {
    res.status(400).json({ message: "No fue Posible eliminar la Partida" });
  }
};
