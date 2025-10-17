const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Juego = require('../models/Juego');
const Jugador = require('../models/Jugador');
const Carta = require('../models/Carta');

const atributosValidos = ["fuerza", "velocidad", "inteligencia", "rareza"];

// Seleccionar atributo para la ronda
router.post('/juegos/:codigo/seleccionar-atributo', async (req, res) => {
  const { codigo } = req.params;
  const { jugadorId, atributo } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const juego = await Juego.findOne({ codigo }).session(session);
    if (!juego || juego.estado !== "jugando") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Juego no encontrado o no en curso" });
    }

    const jugadorTurno = juego.jugadores[juego.turnoIdx].jugadorId.toString();
    if (jugadorTurno !== jugadorId) {
      await session.abortTransaction();
      return res.status(403).json({ message: "No es tu turno para elegir atributo" });
    }

    if (!atributosValidos.includes(atributo)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Atributo inválido" });
    }

    juego.atributoActual = atributo;
    await juego.save({ session });
    await session.commitTransaction();

    res.status(200).json({ message: "Atributo seleccionado", atributo });
    // Notificar a todos (puedes usar socket aquí si aún lo usas para notificaciones)
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Error al seleccionar atributo", error: error.message });
  } finally {
    session.endSession();
  }
});

// Jugar carta
router.post('/juegos/:codigo/jugar-carta', async (req, res) => {
  const { codigo } = req.params;
  const { jugadorId, cartaId } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const juego = await Juego.findOne({ codigo }).session(session);
    if (!juego || juego.estado !== "jugando") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Juego no encontrado o no en curso" });
    }

    const yaJugo = juego.cartasEnBatalla.some(c => c.jugadorId.toString() === jugadorId);
    if (yaJugo) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Ya jugaste tu carta" });
    }

    const jugadorEntry = juego.jugadores.find(p => p.jugadorId.toString() === jugadorId);
    if (!jugadorEntry || !jugadorEntry.selectedCards.includes(cartaId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Carta no válida o no seleccionada" });
    }

    juego.cartasEnBatalla.push({ jugadorId, cartaId, atributo: juego.atributoActual });
    await juego.save({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Carta jugada", cartaId });
    // Notificar a todos (opcional con socket)
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Error al jugar carta", error: error.message });
  } finally {
    session.endSession();
  }
});

// Resolver ronda
router.post('/juegos/:codigo/resolver-ronda', async (req, res) => {
  const { codigo } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const juego = await Juego.findOne({ codigo }).session(session);
    if (!juego || juego.estado !== "jugando") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Juego no encontrado o no en curso" });
    }

    const jugadas = juego.cartasEnBatalla;
    const atributo = juego.atributoActual;
    if (!atributo || jugadas.length < juego.jugadores.filter(j => j.activo).length) {
      await session.abortTransaction();
      return res.status(400).json({ message: "No hay atributo o no todos jugaron" });
    }

    const valores = await Promise.all(jugadas.map(async j => {
      const carta = await Carta.findById(j.cartaId).session(session);
      return {
        jugadorId: j.jugadorId,
        cartaId: j.cartaId,
        valor: carta.atributos[atributo] || 0,
      };
    }));

    const maxValor = Math.max(...valores.map(v => v.valor));
    const ganadores = valores.filter(v => v.valor === maxValor);

    if (ganadores.length === 1) {
      const ganadorId = ganadores[0].jugadorId;
      const todasLasCartasIds = valores.map(v => v.cartaId);

      await Jugador.findByIdAndUpdate(ganadorId, { $push: { mano: { $each: todasLasCartasIds } } }, { session });
      for (const v of valores) {
        if (v.jugadorId !== ganadorId) { // Solo perdedores
          const jugador = await Jugador.findById(v.jugadorId).session(session);
          if (jugador) {
            const index = jugador.mano.findIndex(c => c.toString() === v.cartaId);
            if (index !== -1) jugador.mano.splice(index, 1);
            await jugador.save({ session });
          }
        }
        const jugadorEnJuego = juego.jugadores.find(j => j.jugadorId.toString() === v.jugadorId);
        if (jugadorEnJuego) jugadorEnJuego.selectedCards = jugadorEnJuego.selectedCards.filter(id => id.toString() !== v.cartaId);
      }

      juego.cartasEnBatalla = [];
      juego.atributoActual = null;
      await juego.save({ session });

      await session.commitTransaction();

      res.status(200).json({ ganadorId, cartasGanadas: todasLasCartasIds, atributo });
      // Notificar (opcional con socket)
    } else {
      const attrs = ["fuerza", "velocidad", "inteligencia", "rareza"];
      const nuevoAtributo = attrs[Math.floor(Math.random() * attrs.length)];
      juego.atributoActual = nuevoAtributo;
      await juego.save({ session });
      await session.commitTransaction();

      res.status(200).json({ empate: true, nuevoAtributo, valores });
      // Notificar (opcional con socket)
    }
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Error al resolver ronda", error: error.message });
  } finally {
    session.endSession();
  }
});