import { Carta } from "../models/Carta.js";

// Crear una Carta
export const crearCarta = async (req, res) => {
  try {
    const nuevaCarta = new Carta(req.body);
    await nuevaCarta.save();
    res.status(201).json(nuevaCarta);
  } catch (error) {
    res.status(400).json({ message: "No se pudo crear la Carta" });
  }
};

// Listar Cartas
export const buscarCartas = async (req, res) => {
  try {
    const cartas = await Carta.find();
    res.status(200).json(cartas);
  } catch (error) {
    res.status(400).json({ message: "No se encontraron Cartas" });
  }
};

// Buscar Carta por Id
export const buscarCartaPorId = async (req, res) => {
  try {
    const carta = await Carta.findById(req.params.id);
    if (!carta) {
      return res.status(404).json({ message: "Carta no encontrada" });
    }
    res.status(200).json(carta);
  } catch (error) {
    res.status(400).json({ message: "Error al buscar carta" });
  }
};

// Actualizar Carta
export const actualizarCarta = async (req, res) => {
  try {
    const carta = await Carta.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json(carta);
  } catch (error) {
    res.status(400).json({ message: "No fue posible actualizar la Carta" });
  }
};

// Eliminar Carta
export const eliminarCarta = async (req, res) => {
  try {
    await Carta.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Carta eliminada correctamente" });
  } catch (error) {
    res.status(400).json({ message: "No fue posible eliminar la Carta" });
  }
};
