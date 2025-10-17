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
      apuestas: [], // [{jugadorId, cartaId, numero}]
      numeroGanador: null,
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

// NUEVA LÓGICA: Apostar carta con número
export const apostarCarta = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { jugadorId, cartaId, numero } = req.body;

    // Validaciones
    if (!numero || numero < 1 || numero > 10) {
      return res
        .status(400)
        .json({ message: "El número debe estar entre 1 y 10" });
    }

    const juego = await Juego.findOne({ codigo }).populate(
      "jugadores.jugadorId"
    );
    if (!juego) return res.status(404).json({ message: "Juego no encontrado" });

    if (juego.estado !== "jugando") {
      return res.status(400).json({ message: "La partida no está en curso" });
    }

    // Verificar que el jugador esté en la partida
    const jugadorEnPartida = juego.jugadores.find(
      (j) => j.jugadorId._id.toString() === jugadorId && j.activo
    );
    if (!jugadorEnPartida) {
      return res.status(403).json({ message: "No estás en esta partida" });
    }

    // Verificar que no haya apostado ya
    const yaAposto = juego.apuestas.some(
      (a) => a.jugadorId.toString() === jugadorId
    );
    if (yaAposto) {
      return res.status(400).json({ message: "Ya apostaste en esta ronda" });
    }

    // Verificar que la carta esté en su mano
    if (!jugadorEnPartida.selectedCards.includes(cartaId)) {
      return res
        .status(400)
        .json({ message: "Esta carta no está en tu mano de juego" });
    }

    // Obtener información de la carta
    const carta = await Carta.findById(cartaId);
    if (!carta) {
      return res.status(404).json({ message: "Carta no encontrada" });
    }

    // Registrar la apuesta
    juego.apuestas.push({
      jugadorId: new mongoose.Types.ObjectId(jugadorId),
      cartaId: new mongoose.Types.ObjectId(cartaId),
      numero: numero,
      carta: carta, // Guardamos la carta completa para mostrarla
    });

    await juego.save();

    console.log(
      `🎲 Jugador ${jugadorId} apostó carta ${cartaId} al número ${numero}`
    );

    res.status(200).json({
      message: "Apuesta registrada con éxito",
      apuestasRegistradas: juego.apuestas.length,
      totalJugadores: juego.jugadores.filter((j) => j.activo).length,
    });
  } catch (error) {
    console.error("Error al apostar carta:", error);
    res
      .status(500)
      .json({ message: "Error al apostar carta", error: error.message });
  }
};

// NUEVA LÓGICA: Resolver la ronda con número aleatorio
export const resolverRonda = async (req, res) => {
  try {
    const { codigo } = req.params;
    const juego = await Juego.findOne({ codigo }).populate(
      "jugadores.jugadorId"
    );

    if (!juego) {
      return res.status(404).json({ message: "Juego no encontrado" });
    }

    const jugadoresActivos = juego.jugadores.filter((j) => j.activo);

    if (juego.apuestas.length !== jugadoresActivos.length) {
      return res.status(400).json({
        message: "No todos los jugadores han apostado",
        apuestas: juego.apuestas.length,
        jugadores: jugadoresActivos.length,
      });
    }

    // Generar número ganador aleatorio entre 1 y 10
    const numeroGanador = Math.floor(Math.random() * 10) + 1;
    juego.numeroGanador = numeroGanador;

    console.log(`🎲 Número ganador: ${numeroGanador}`);

    // Encontrar ganadores (los que acertaron el número)
    const ganadores = juego.apuestas.filter((a) => a.numero === numeroGanador);
    const perdedores = juego.apuestas.filter((a) => a.numero !== numeroGanador);

    // 🔄 Incrementar rondas
    juego.rondasJugadas += 1;

    let resultado = {
      numeroGanador,
      ganadores: [],
      perdedores: [],
      mensaje: "",
      juegoFinalizado: false,
    };

    if (ganadores.length === 0) {
      // NADIE ACERTÓ: Todos recuperan sus cartas
      resultado.mensaje = "Nadie acertó el número. Todos recuperan sus cartas.";
      resultado.perdedores = juego.apuestas.map((a) => ({
        jugadorId: a.jugadorId.toString(),
        numero: a.numero,
      }));
    } else {
      // HAY GANADORES: Se llevan las cartas de los perdedores
      for (const ganador of ganadores) {
        const jugadorGanador = await Jugador.findById(ganador.jugadorId);

        // El ganador recupera su carta apostada (ya está en selectedCards)
        // Y recibe las cartas de los perdedores
        const cartasGanadas = [];

        for (const perdedor of perdedores) {
          const jugadorPerdedor = await Jugador.findById(perdedor.jugadorId);

          // Remover carta del perdedor de su mano
          jugadorPerdedor.mano = jugadorPerdedor.mano.filter(
            (c) => c.toString() !== perdedor.cartaId.toString()
          );

          // Agregar carta a la mano del ganador
          jugadorGanador.mano.push(perdedor.cartaId);
          cartasGanadas.push(perdedor.cartaId.toString());

          await jugadorPerdedor.save();

          // Verificar si el perdedor se quedó sin cartas
          if (jugadorPerdedor.mano.length === 0) {
            const jugadorEnJuego = juego.jugadores.find(
              (j) =>
                j.jugadorId._id.toString() === perdedor.jugadorId.toString()
            );
            if (jugadorEnJuego) {
              jugadorEnJuego.activo = false;
            }
          }
        }

        await jugadorGanador.save();

        resultado.ganadores.push({
          jugadorId: ganador.jugadorId.toString(),
          numero: ganador.numero,
          cartasGanadas: cartasGanadas.length,
        });
      }

      resultado.perdedores = perdedores.map((p) => ({
        jugadorId: p.jugadorId.toString(),
        numero: p.numero,
      }));

      if (ganadores.length === 1) {
        resultado.mensaje = `¡Jugador acertó el número ${numeroGanador}! Ganó ${perdedores.length} carta(s)`;
      } else {
        resultado.mensaje = `¡${ganadores.length} jugadores acertaron el número ${numeroGanador}!`;
      }
    }

    // Limpiar apuestas para la siguiente ronda
    juego.apuestas = [];
    juego.numeroGanador = null;

    // Verificar si solo queda un jugador activo
    const jugadoresActivosRestantes = juego.jugadores.filter((j) => j.activo);
    if (juego.rondasJugadas >= 3 || jugadoresActivosRestantes.length <= 1) {
      juego.estado = "finalizado";
      juego.ganadorId = jugadoresActivosRestantes[0].jugadorId._id;
      await juego.save();
      resultado.juegoFinalizado = true;

      return res.status(200).json({
        ...resultado,
        juegoFinalizado: true,
        ganadorFinal: jugadoresActivosRestantes[0].jugadorId._id.toString(),
      });
    } else {
      juego.estado = "seleccionando";
      juego.jugadores.forEach((j) => {
        j.selectedCards = [];
      });
    }

    // Siguiente turno
    juego.turnoIdx = (juego.turnoIdx + 1) % juego.jugadores.length;
    await juego.save();

    res.status(200).json(resultado);
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
