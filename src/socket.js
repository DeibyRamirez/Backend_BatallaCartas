import mongoose from "mongoose";
import { Carta } from "./models/Carta.js";
import { Juego } from "./models/Juego.js";
import { Jugador } from "./models/Jugador.js";

export const configurarSockets = (io) => {
  io.on("connection", (socket) => {
    console.log(`🟢 Jugador conectado: ${socket.id}`);

    socket.on("unirseLobby", async (jugadorId) => {
      // Actualizar datos del jugador
      const jugador = await Jugador.findById(jugadorId);
      socket.emit("jugadorActualizado", jugador);

      // Enviar total de cartas
      const cartas = await Carta.find();
      socket.emit("cartasActualizadas", { total: cartas.length });
    });

    // =============================
    // UNIRSE A UNA PARTIDA
    // =============================
    socket.on("unirseJuego", async ({ codigo, jugadorId }) => {
      try {
        if (!codigo || !jugadorId) {
          return socket.emit("errorEvento", {
            message: "Código y jugadorId son requeridos",
          });
        }

        let juego = await Juego.findOne({ codigo }).populate(
          "jugadores.jugadorId"
        );
        if (!juego) {
          return socket.emit("errorEvento", {
            message: "El juego no existe. Verifica el código.",
          });
        }

        let jugador = await Jugador.findById(jugadorId);
        if (!jugador) {
          return socket.emit("errorEvento", {
            message: "Jugador no encontrado en la base de datos",
          });
        }

        if (juego.jugadores.length >= juego.maxPlayers) {
          const yaEnJuego = juego.jugadores.find(
            (j) =>
              j.jugadorId?._id?.toString() === jugadorId ||
              j.jugadorId?.toString() === jugadorId
          );

          if (!yaEnJuego) {
            return socket.emit("errorEvento", {
              message: "La partida está llena",
            });
          }
        }

        if (juego.estado !== "esperando") {
          return socket.emit("errorEvento", {
            message: "La partida ya ha comenzado",
          });
        }

        if (!jugador.mano || jugador.mano.length === 0) {
          const todasLasCartas = await Carta.find();
          if (todasLasCartas.length < 10) {
            return socket.emit("errorEvento", {
              message: "No hay suficientes cartas en la base de datos",
            });
          }

          const seleccionadas = todasLasCartas
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);
          jugador.mano = seleccionadas.map((c) => c._id);
          await jugador.save();
          console.log(`🎴 Asignadas 10 cartas al jugador ${jugadorId}`);
        }

        const yaEnJuego = juego.jugadores.find((j) => {
          const jId = j.jugadorId?._id || j.jugadorId;
          return jId?.toString() === jugadorId;
        });

        if (!yaEnJuego) {
          juego.jugadores.push({
            jugadorId: jugador._id,
            socketId: socket.id,
            selectedCards: [],
            activo: true,
          });
          await juego.save();
          console.log(`➕ Jugador ${jugadorId} añadido a la partida ${codigo}`);
        } else {
          yaEnJuego.socketId = socket.id;
          yaEnJuego.activo = true;
          await juego.save();
          console.log(
            `🔄 Jugador ${jugadorId} reconectado a la partida ${codigo}`
          );
        }

        socket.join(codigo);

        io.to(codigo).emit("jugadorUnido", {
          jugadorId,
          socketId: socket.id,
          totalJugadores: juego.jugadores.length,
        });

        console.log(
          `👤 Jugador ${jugadorId} en partida ${codigo} (${juego.jugadores.length}/${juego.maxPlayers})`
        );

        socket.emit("unidoExitoso", {
          codigo,
          jugadores: juego.jugadores.map((j) => ({
            id: j.jugadorId?._id || j.jugadorId,
            socketId: j.socketId,
            activo: j.activo,
          })),
          estado: juego.estado,
          maxPlayers: juego.maxPlayers,
        });
      } catch (error) {
        console.error("❌ Error en unirseJuego:", error);
        socket.emit("errorEvento", {
          message: "Error al unirse al juego: " + error.message,
        });
      }
    });

    // =============================
    // INICIAR JUEGO
    // =============================
    socket.on("iniciarJuego", async ({ codigo, jugadorId }) => {
      console.log("🎮 Iniciando juego:", codigo, jugadorId);
      try {
        const juego = await Juego.findOne({ codigo });
        if (!juego) {
          return socket.emit("errorEvento", {
            message: "Juego no encontrado",
          });
        }

        const primerJugadorId =
          juego.jugadores[0].jugadorId._id || juego.jugadores[0].jugadorId;
        if (primerJugadorId.toString() !== jugadorId) {
          return socket.emit("errorEvento", {
            message: "Solo el anfitrión puede iniciar el juego",
          });
        }

        if (juego.jugadores.length < 2) {
          return socket.emit("errorEvento", {
            message: "Se necesitan al menos 2 jugadores",
          });
        }

        juego.estado = "seleccionando";
        await juego.save();

        console.log(`🎮 Juego ${codigo} iniciado. Estado: seleccionando`);

        io.to(codigo).emit("juegoIniciandose", {
          mensaje: "El anfitrión ha iniciado el juego. Seleccionen sus cartas.",
          playCount: juego.playCount,
        });
      } catch (err) {
        console.error("❌ Error al iniciar juego:", err);
        socket.emit("errorEvento", {
          message: "Error al iniciar juego: " + err.message,
        });
      }
    });

    // =============================
    // SELECCIONAR CARTAS PARA JUGAR
    // =============================
    socket.on("seleccionarCartas", async ({ codigo, jugadorId, cartas }) => {
      console.log(
        `🃏 Seleccionando cartas: jugador ${jugadorId}, ${cartas.length} cartas`
      );
      try {
        if (!codigo || !jugadorId || !cartas || !Array.isArray(cartas)) {
          return socket.emit("errorEvento", {
            message: "Parámetros inválidos",
          });
        }

        const juego = await Juego.findOne({ codigo });
        if (!juego) {
          return socket.emit("errorEvento", {
            message: "Juego no encontrado",
          });
        }

        if (cartas.length !== juego.playCount) {
          return socket.emit("errorEvento", {
            message: `Debes seleccionar exactamente ${juego.playCount} cartas`,
          });
        }

        const jugador = await Jugador.findById(jugadorId);
        if (!jugador) {
          return socket.emit("errorEvento", {
            message: "Jugador no encontrado",
          });
        }

        const cartasInvalidas = cartas.filter(
          (c) => !jugador.mano.map((id) => id.toString()).includes(c)
        );
        if (cartasInvalidas.length > 0) {
          return socket.emit("errorEvento", {
            message: "Una o más cartas no te pertenecen",
          });
        }

        const jugadorEnJuego = juego.jugadores.find(
          (j) => j.jugadorId.toString() === jugadorId
        );
        if (!jugadorEnJuego) {
          return socket.emit("errorEvento", {
            message: "Jugador no está en la partida",
          });
        }

        jugadorEnJuego.selectedCards = cartas;
        await juego.save();

        console.log(
          `✅ Jugador ${jugadorId} seleccionó ${cartas.length} cartas`
        );

        io.to(codigo).emit("cartasSeleccionadas", {
          jugadorId,
          cantidad: cartas.length,
        });

        const todosSeleccionaron = juego.jugadores
          .filter((j) => j.activo)
          .every(
            (j) => j.selectedCards && j.selectedCards.length === juego.playCount
          );

        if (todosSeleccionaron && juego.estado === "seleccionando") {
          juego.estado = "jugando";
          juego.turnoIdx = 0;
          juego.cartasEnBatalla = [];
          juego.atributoActual = null;
          await juego.save();

          io.to(codigo).emit("juegoIniciado", {
            mensaje: "¡Todos han seleccionado! El juego comienza.",
            turnoIdx: 0,
            jugadorId: juego.jugadores[0].jugadorId.toString(),
          });

          console.log(`🎮 Juego ${codigo} comenzó`);
        }
      } catch (err) {
        console.error("❌ Error en seleccionarCartas:", err);
        socket.emit("errorEvento", {
          message: `Error al seleccionar cartas: ${err.message}`,
        });
      }
    });

    // =============================
    // RENDIRSE
    // =============================
    socket.on("rendirse", async ({ codigo, jugadorId }) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const juego = await Juego.findOne({ codigo }).session(session);
        if (!juego) {
          return socket.emit("errorEvento", {
            message: "Juego no encontrado",
          });
        }

        const jugador = juego.jugadores.find(
          (j) => j.jugadorId.toString() === jugadorId
        );

        if (!jugador) {
          await session.abortTransaction();
          return socket.emit("errorEvento", {
            message: "Jugador no encontrado en la partida",
          });
        }

        jugador.activo = false;
        await juego.save({ session });
        await session.commitTransaction();

        console.log(`🏳 Jugador ${jugadorId} se rindió en partida ${codigo}`);

        io.to(codigo).emit("jugadorRendido", { jugadorId });

        // Verificar si solo queda un jugador activo
        const jugadoresActivos = juego.jugadores.filter((j) => j.activo);
        if (jugadoresActivos.length === 1) {
          await finalizarJuego(
            io,
            juego,
            jugadoresActivos[0].jugadorId.toString()
          );
        }
      } catch (err) {
        await session.abortTransaction();
        console.error("❌ Error en rendirse:", err);
        socket.emit("errorEvento", {
          message: "Error al rendirse: " + err.message,
        });
      } finally {
        session.endSession();
      }
    });

    // =============================
    // FINALIZAR JUEGO
    // =============================
    async function finalizarJuego(io, juego, ganadorId) {
      try {
        juego.estado = "finalizado";
        await juego.save();

        const jugadorGanador = await Jugador.findById(ganadorId);

        io.to(juego.codigo).emit("juegoFinalizado", {
          ganadorId,
          mensaje: `¡${jugadorGanador?.nombre || "Jugador"} ganó la partida!`,
        });

        console.log(`🎉 Juego finalizado. Ganador: ${ganadorId}`);
      } catch (error) {
        console.error("❌ Error al finalizar juego:", error);
      }
    }

    // Agregar este handler en socket.js después de los demás eventos
    socket.on(
      "atributoSeleccionado",
      async ({ codigo, jugadorId, atributo }) => {
        try {
          console.log(
            `🎯 Atributo seleccionado: ${atributo} por ${jugadorId} en ${codigo}`
          );

          // Emitir a TODOS los demás jugadores en la sala (excepto el que lo envió)
          socket.to(codigo).emit("atributoSeleccionado", {
            atributo,
            jugadorId,
          });
        } catch (error) {
          console.error("❌ Error en atributoSeleccionado:", error);
          socket.emit("errorEvento", {
            message: "Error al procesar atributo seleccionado",
          });
        }
      }
    );

    // =============================
    // DESCONEXIÓN
    // =============================
    socket.on("disconnect", () => {
      console.log(`🔴 Jugador desconectado: ${socket.id}`);
    });
  });
};