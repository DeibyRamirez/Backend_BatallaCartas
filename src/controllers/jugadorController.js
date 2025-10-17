import { Jugador } from "../models/Jugador.js";

// Crear un Jugador
export const crearJugador = async (req, res) => {
  try {
    const { nombre } = req.body;
    const nuevoJugador = new Jugador({ nombre });
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

// Buscar jugador por nombre
export const buscarJugadorPorNombre = async (req, res) => {
  try {
    const { nombre } = req.params;
    const jugador = await Jugador.findOne({ nombre: nombre }).populate("mano");
    
    if (!jugador) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }
    
    res.status(200).json(jugador);
  } catch (error) {
    res.status(500).json({ message: "Error al buscar jugador", error: error.message });
  }
};


// Bucar Jugador por Id
export const buscarJugadorPorId = async (req, res) => {
  try {
    const jugador = await Jugador.findById(req.params.id).populate("mano"); // El populate es para traer las cartas relacionadas toda la info
    if (!jugador) return res.status(400).json({ message: "Jugador no encontrado" });
    res.status(200).json(jugador);
  } catch (error) {
    res.status(500).json({ message: "Error al buscar jugador", error: error.message });
  }
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
