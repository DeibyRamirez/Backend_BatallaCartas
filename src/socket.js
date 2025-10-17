import mongoose from "mongoose";
import { Carta } from "./models/Carta.js";
import { Juego } from "./models/Juego.js";
import { Jugador } from "./models/Jugador.js";

export const configurarSockets = (io) => {
  io.on("connection", (socket) => {
    console.log(`🟢 Jugador conectado: ${socket.id}`);

    socket.on("unirseLobby", async (jugadorId) => {
      const jugador = await Jugador.findById(jugadorId);
      socket.emit("jugadorActualizado", jugador);

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
          juego.apuestas = [];
          juego.numeroGanador = null;
          await juego.save();

          io.to(codigo).emit("juegoIniciado", {
            mensaje:
              "¡Todos han seleccionado! Ahora apuesten sus cartas con un número del 1 al 10.",
            turnoIdx: 0,
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
    // APOSTAR CARTA CON NÚMERO
    // =============================
    // En configurarSockets dentro de io.on("connection", (socket) => { ... })

    // Después del evento "apostarCarta"
    socket.on(
      "apostarCarta",
      async ({ codigo, jugadorId, cartaId, numero }) => {
        try {
          console.log(
            `🎲 Apuesta: jugador ${jugadorId}, carta ${cartaId}, número ${numero}`
          );

          const juego = await Juego.findOne({ codigo });
          if (!juego) {
            return socket.emit("errorEvento", {
              message: "Juego no encontrado",
            });
          }

          if (juego.estado !== "jugando") {
            return socket.emit("errorEvento", {
              message: "No puedes apostar en este momento",
            });
          }

          // Registrar apuesta
          juego.apuestas.push({ jugadorId, cartaId, numero });
          await juego.save();

          io.to(codigo).emit("cartaApostada", { jugadorId, cartaId, numero });

          // Verificar si todos apostaron
          const jugadoresActivos = juego.jugadores.filter((j) => j.activo);
          const todosApostaron = jugadoresActivos.every((j) =>
            juego.apuestas.some(
              (a) => a.jugadorId.toString() === j.jugadorId.toString()
            )
          );

          if (todosApostaron) {
            const resultado = await resolverRondaInterna(juego);
            io.to(codigo).emit("rondaResuelta", resultado);
          }
        } catch (error) {
          console.error("❌ Error en apostarCarta:", error);
          socket.emit("errorEvento", { message: "Error al procesar apuesta" });
        }
      }
    );

    // Nueva función para resolver la ronda internamente y devolver el resultado
    async function resolverRondaInterna(juego) {
      const numeroGanador = Math.floor(Math.random() * 10) + 1;
      juego.numeroGanador = numeroGanador;

      const ganadores = juego.apuestas.filter(
        (a) => a.numero === numeroGanador
      );
      const perdedores = juego.apuestas.filter(
        (a) => a.numero !== numeroGanador
      );

      let resultado = {
        numeroGanador,
        ganadores: [],
        perdedores: [],
        mensaje: "",
        manosActualizadas: {}, // Objeto para almacenar las nuevas manos
      };

      if (ganadores.length === 0) {
        resultado.mensaje =
          "Nadie acertó el número. Todos recuperan sus cartas.";
        resultado.perdedores = juego.apuestas.map((a) => ({
          jugadorId: a.jugadorId.toString(),
          numero: a.numero,
        }));
        for (const apuesta of juego.apuestas) {
          const jugador = await Jugador.findById(apuesta.jugadorId);
          if (jugador && !jugador.mano.includes(apuesta.cartaId)) {
            jugador.mano.push(apuesta.cartaId);
            await jugador.save();
            resultado.manosActualizadas[jugador._id.toString()] =
              jugador.mano.map((c) => c.toString());
          }
        }
      } else {
        for (const ganador of ganadores) {
          const jugadorGanador = await Jugador.findById(ganador.jugadorId);
          const cartasGanadas = [];

          for (const perdedor of perdedores) {
            const jugadorPerdedor = await Jugador.findById(perdedor.jugadorId);
            if (jugadorPerdedor) {
              jugadorPerdedor.mano = jugadorPerdedor.mano.filter(
                (c) => c.toString() !== perdedor.cartaId.toString()
              );
              if (
                jugadorGanador &&
                !jugadorGanador.mano.includes(perdedor.cartaId)
              ) {
                jugadorGanador.mano.push(perdedor.cartaId);
                cartasGanadas.push(perdedor.cartaId.toString());
              }
              await jugadorPerdedor.save();
              resultado.manosActualizadas[jugadorPerdedor._id.toString()] =
                jugadorPerdedor.mano.map((c) => c.toString());

              if (jugadorPerdedor.mano.length === 0) {
                const jugadorEnJuego = juego.jugadores.find(
                  (j) =>
                    j.jugadorId._id.toString() === perdedor.jugadorId.toString()
                );
                if (jugadorEnJuego) jugadorEnJuego.activo = false;
              }
            }
          }

          if (jugadorGanador) {
            await jugadorGanador.save();
            resultado.manosActualizadas[jugadorGanador._id.toString()] =
              jugadorGanador.mano.map((c) => c.toString());
          }

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

        resultado.mensaje =
          ganadores.length === 1
            ? `¡Jugador acertó el número ${numeroGanador}! Ganó ${perdedores.length} carta(s)`
            : `¡${ganadores.length} jugadores acertaron el número ${numeroGanador}!`;
      }

      juego.apuestas = [];
      juego.numeroGanador = null;
      juego.turnoIdx = (juego.turnoIdx + 1) % juego.jugadores.length;

      // Verificar si hay ganador de la partida
      const jugadoresActivosRestantes = juego.jugadores.filter((j) => j.activo);
      if (jugadoresActivosRestantes.length === 1) {
        juego.estado = "finalizado";
        juego.ganadorId = jugadoresActivosRestantes[0].jugadorId._id;
        await juego.save();

        io.to(juego.codigo).emit("juegoFinalizado", {
          ganadorId: juego.ganadorId,
        });
      } else {
        // 🔁 Continuar la partida, sin reiniciar selección
        juego.estado = "jugando";
        await juego.save();

        io.to(juego.codigo).emit("rondaTerminada", {
          mensaje: `La ronda terminó. Se ha generado un nuevo número. ¡Siguiente ronda!`,
          numeroGanador: resultado.numeroGanador,
        });
      }

      // 🔄 Emitir las manos actualizadas
      io.to(juego.codigo).emit(
        "manosActualizadas",
        resultado.manosActualizadas
      );

      return resultado;
    }

    // Manejar la desconexión para limpiar el socketId
    socket.on("disconnect", () => {
      console.log(`🔴 Jugador desconectado: ${socket.id}`);
      Juego.updateOne(
        { "jugadores.socketId": socket.id },
        { $set: { "jugadores.$.socketId": null } }
      ).exec();
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

    // =============================
    // DESCONEXIÓN
    // =============================
    socket.on("disconnect", () => {
      console.log(`🔴 Jugador desconectado: ${socket.id}`);
    });
  });
};
