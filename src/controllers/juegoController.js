import mongoose from "mongoose";
import { Juego } from "../models/Juego.js";
import { Jugador } from "../models/Jugador.js";
import { Carta } from "../models/Carta.js";

export const crearJuego = async (req, res) => {
  try {
    const { maxPlayers = 6, playCount = 4 } = req.body;
    const codigo = Math.random().toString(36).substr(2, 6).toUpperCase();
    const nuevoJuego = new Juego({
      codigo,
      maxPlayers,
      playCount,
      estado: "esperando",
      jugadores: [],
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

export const jugarCarta = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { jugadorId, cartaId } = req.body;

    const juego = await Juego.findOne({ codigo }).populate(
      "jugadores.jugadorId"
    );
    if (!juego) return res.status(404).json({ message: "Juego no encontrado" });

    if (juego.estado !== "jugando") {
      return res.status(400).json({ message: "La partida no está en curso" });
    }

    const jugadorEnPartida = juego.jugadores.find(
      (j) => j.jugadorId._id.toString() === jugadorId && j.activo
    );
    if (!jugadorEnPartida) {
      return res.status(403).json({ message: "No estás en esta partida" });
    }

    const yaJugo = juego.cartasEnBatalla.some(
      (c) => c.jugadorId.toString() === jugadorId
    );
    if (yaJugo) {
      return res.status(400).json({ message: "Ya jugaste esta ronda" });
    }

    if (!jugadorEnPartida.selectedCards.includes(cartaId)) {
      return res
        .status(400)
        .json({ message: "Esta carta no está en tu mano de juego" });
    }

    if (!juego.atributoActual) {
      return res
        .status(400)
        .json({ message: "Primero debes seleccionar un atributo" });
    }

    // Obtener la carta completa desde la base de datos
    const carta = await Carta.findById(cartaId);
    if (!carta) {
      return res.status(404).json({ message: "Carta no encontrada" });
    }

    // Agregar carta a la batalla con sus atributos
    juego.cartasEnBatalla.push({
      jugadorId: new mongoose.Types.ObjectId(jugadorId),
      cartaId: new mongoose.Types.ObjectId(cartaId),
      carta, // Incluir el objeto completo de la carta
      atributo: juego.atributoActual,
    });

    await juego.save();

    console.log(`🎴 Jugador ${jugadorId} jugó carta ${cartaId}`);

    res.status(200).json({
      message: "Carta jugada con éxito",
      cartasJugadas: juego.cartasEnBatalla.length,
      totalJugadores: juego.jugadores.filter((j) => j.activo).length,
    });
  } catch (error) {
    console.error("Error al jugar carta:", error);
    res
      .status(500)
      .json({ message: "Error al jugar carta", error: error.message });
  }
};

export const seleccionarAtributo = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { jugadorId, atributo } = req.body;

    const juego = await Juego.findOne({ codigo }).populate(
      "jugadores.jugadorId"
    );
    if (!juego) return res.status(404).json({ message: "Juego no encontrado" });

    if (juego.estado !== "jugando") {
      return res.status(400).json({ message: "La partida no está en curso" });
    }

    // Verificar que sea el turno del jugador
    const jugadorActual = juego.jugadores[juego.turnoIdx];
    if (
      !jugadorActual ||
      jugadorActual.jugadorId._id.toString() !== jugadorId
    ) {
      return res
        .status(403)
        .json({ message: "No es tu turno para elegir atributo" });
    }

    // Validar atributo
    const atributosValidos = ["fuerza", "velocidad", "inteligencia", "rareza"];
    if (!atributosValidos.includes(atributo)) {
      return res.status(400).json({ message: "Atributo inválido" });
    }

    // Guardar el atributo seleccionado
    juego.atributoActual = atributo;
    await juego.save();

    console.log(
      `🎯 Atributo seleccionado: ${atributo} por jugador ${jugadorId}`
    );

    res.status(200).json({ message: "Atributo seleccionado", atributo });
  } catch (error) {
    console.error("Error al seleccionar atributo:", error);
    res
      .status(500)
      .json({ message: "Error al seleccionar atributo", error: error.message });
  }
};

// Resolver ronda
export const resolverRonda = async (req, res) => {
  try {
    const { codigo } = req.params;
    const juego = await Juego.findOne({ codigo }).populate(
      "jugadores.jugadorId"
    );

    if (!juego) {
      return res.status(404).json({ message: "Juego no encontrado" });
    }

    if (juego.cartasEnBatalla.length !== juego.jugadores.length) {
      return res
        .status(400)
        .json({ message: "No todas las cartas han sido jugadas" });
    }

    const atributoActual = juego.atributoActual;
    if (!atributoActual) {
      return res
        .status(400)
        .json({ message: "No se ha seleccionado un atributo" });
    }

    // Determinar el ganador comparando el atributo seleccionado
    let ganadorId = null;
    let maxValor = -Infinity;
    let perdedorId = null;
    let cartaPerdedoraId = null;

    for (const batalla of juego.cartasEnBatalla) {
      // Obtener la carta desde la base de datos si no está poblada
      let carta = batalla.cartaId.carta;
      if (!carta) {
        carta = await Carta.findById(batalla.cartaId);
        if (!carta) {
          return res.status(404).json({ message: "Carta no encontrada" });
        }
      }
      const valor = carta[atributoActual]; // Accede al valor del atributo (e.g., inteligencia)
      if (valor > maxValor) {
        maxValor = valor;
        ganadorId = batalla.jugadorId.toString();
        perdedorId = juego.jugadores
          .find(
            (j) => j.jugadorId._id.toString() !== batalla.jugadorId.toString()
          )
          .jugadorId._id.toString();
        cartaPerdedoraId = batalla.cartaId.toString();
      } else if (valor === maxValor) {
        // Empate
        return res
          .status(200)
          .json({ empate: true, mensaje: "Empate en esta ronda" });
      }
    }

    if (!ganadorId) {
      return res
        .status(400)
        .json({ message: "No se pudo determinar un ganador" });
    }

    // Obtener los jugadores involucrados
    const ganador = await Jugador.findById(ganadorId);
    const perdedor = await Jugador.findById(perdedorId);

    if (!ganador || !perdedor) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    // Eliminar la carta perdedora de la mano del perdedor
    perdedor.mano = perdedor.mano.filter(
      (cId) => cId.toString() !== cartaPerdedoraId
    );
    await perdedor.save();

    // Añadir la carta perdedora a la mano del ganador
    ganador.mano.push(cartaPerdedoraId);
    await ganador.save();

    // Actualizar el juego para el próximo turno
    juego.turnoIdx = (juego.turnoIdx + 1) % juego.jugadores.length;
    juego.cartasEnBatalla = [];
    juego.atributoActual = null;

    await juego.save();

    res.status(200).json({
      ganadorId,
      cartasGanadas: 1,
      mensaje: `Jugador ${ganadorId} ganó la ronda y obtuvo una carta`,
    });
  } catch (error) {
    console.error("Error al resolver ronda:", error);
    res
      .status(500)
      .json({ message: "Error al resolver la ronda", error: error.message });
  }
};

export const unirseJuego = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { jugadorId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jugadorId)) {
      return res.status(400).json({ message: "ID de jugador inválido" });
    }

    const juego = await Juego.findOne({ codigo });
    if (!juego) {
      return res.status(404).json({ message: "Juego (partida) no existe" });
    }

    const jugadorExiste = juego.jugadores.find(
      (j) => j.jugadorId && j.jugadorId.toString() === jugadorId
    );

    if (jugadorExiste) {
      return res.json({ message: "Jugador ya está en el juego", juego });
    }

    juego.jugadores.push({
      jugadorId: new mongoose.Types.ObjectId(jugadorId),
      activo: true,
      selectedCards: [],
    });

    await juego.save();

    res.json({ message: "Jugador unido correctamente", juego });
  } catch (error) {
    console.error("Error al unirse al juego:", error);
    res
      .status(500)
      .json({ message: "Error al unirse al juego", error: error.message });
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
