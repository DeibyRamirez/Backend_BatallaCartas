import mongoose from "mongoose";
import { Juego } from "../models/Juego.js";
import { Jugador } from "../models/Jugador.js";

export const crearJuego = async (req, res) => {
  try {
    const { maxPlayers = 6, playCount = 4 } = req.body;
    const codigo = Math.random().toString(36).substr(2, 6).toUpperCase();
    const nuevoJuego = new Juego({
      codigo,
      maxPlayers,
      playCount,
      estado: "esperando",
      jugadores: [], // Inicializa como array vacío de objetos
      cartasEnBatalla: [],
      turnoIdx: 0,
    });
    await nuevoJuego.save();
    res.status(201).json(nuevoJuego);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear juego", error: error.message });
  }
};

export const listarJuegos = async (req, res) => {
  try {
    const juegos = await Juego.find();
    res.json(juegos);
  } catch (error) {
    res.status(500).json({ message: "Error al listar juegos" });
  }
};

export const obtenerJuego = async (req, res) => {
  try {
    const { codigo } = req.params;
    const juego = await Juego.findOne({ codigo }).populate(
      "jugadores.jugadorId",
      "nombre mano"
    );
    if (!juego) return res.status(404).json({ message: "Juego no encontrado" });
    res.json(juego);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener juego" });
  }
};


export const unirseJuego = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { jugadorId } = req.body;

    // Validar que jugadorId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(jugadorId)) {
      return res.status(400).json({ message: "ID de jugador inválido" });
    }

    const juego = await Juego.findOne({ codigo });
    if (!juego) return res.status(404).json({ message: "Juego (partida) no existe" });

    // Verificar si el jugador ya está en el juego, con protección contra undefined
    const jugadorExiste = juego.jugadores.find(j => j.jugadorId && j.jugadorId.toString() === jugadorId);
    if (jugadorExiste) {
      return res.json({ message: "Jugador ya está en el juego", juego });
    }

    // Agregar jugador al juego usando new para instanciar ObjectId
    juego.jugadores.push({ jugadorId: new mongoose.Types.ObjectId(jugadorId), activo: true });
    await juego.save();

    res.json({ message: "Jugador unido correctamente", juego });
  } catch (error) {
    console.error("Error al unirse al juego:", error); // Log para debug
    res.status(500).json({ message: "Error al unirse al juego", error: error.message });
  }
};

export const finalizarJuego = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { ganadorId } = req.body;
    const juego = await Juego.findOne({ codigo });
    if (!juego) return res.status(404).json({ message: "Juego no encontrado" });

    juego.estado = "finalizado";
    juego.ganadorId = ganadorId;
    juego.fechaFin = new Date();
    await juego.save();

    res.json({ message: "Juego finalizado correctamente", juego });
  } catch (error) {
    res.status(500).json({ message: "Error al finalizar juego" });
  }
};
