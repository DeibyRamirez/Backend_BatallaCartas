import mongoose from "mongoose";
import { Carta } from "./models/Carta.js";
import { Juego } from "./models/Juego.js";
import { Jugador } from "./models/Jugador.js";

export const configurarSockets = (io) => {
  io.on("connection", (socket) => {
    console.log(`🟢 Jugador conectado: ${socket.id}`);

    // =============================
    // UNIRSE A UNA PARTIDA
    // =============================
    socket.on("unirseJuego", async ({ codigo, jugadorId }) => {
      try {
        // Validar que existan los parámetros
        if (!codigo || !jugadorId) {
          return socket.emit("errorEvento", {
            message: "Código y jugadorId son requeridos",
          });
        }

        // Buscar el juego (NO crear si no existe)
        let juego = await Juego.findOne({ codigo }).populate(
          "jugadores.jugadorId"
        );
        if (!juego) {
          return socket.emit("errorEvento", {
            message: "El juego no existe. Verifica el código.",
          });
        }

        // Buscar jugador
        let jugador = await Jugador.findById(jugadorId);
        if (!jugador) {
          return socket.emit("errorEvento", {
            message: "Jugador no encontrado en la base de datos",
          });
        }

        // Verificar que el juego no esté lleno
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

        // Verificar que el juego esté en estado "esperando"
        if (juego.estado !== "esperando") {
          return socket.emit("errorEvento", {
            message: "La partida ya ha comenzado",
          });
        }

        // Si el jugador no tiene cartas, se le asignan 10 al azar
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

        // Verificar si el jugador ya está en el juego
        const yaEnJuego = juego.jugadores.find((j) => {
          const jId = j.jugadorId?._id || j.jugadorId;
          return jId?.toString() === jugadorId;
        });

        if (!yaEnJuego) {
          // Añadir jugador al juego
          juego.jugadores.push({
            jugadorId: jugador._id,
            socketId: socket.id,
            selectedCards: [],
            activo: true,
          });
          await juego.save();
          console.log(`➕ Jugador ${jugadorId} añadido a la partida ${codigo}`);
        } else {
          // Actualizar socketId si el jugador se reconecta
          yaEnJuego.socketId = socket.id;
          yaEnJuego.activo = true;
          await juego.save();
          console.log(
            `🔄 Jugador ${jugadorId} reconectado a la partida ${codigo}`
          );
        }

        // Unir al socket room
        socket.join(codigo);

        // Notificar a todos en la sala
        io.to(codigo).emit("jugadorUnido", {
          jugadorId,
          socketId: socket.id,
          totalJugadores: juego.jugadores.length,
        });

        console.log(
          `👤 Jugador ${jugadorId} en partida ${codigo} (${juego.jugadores.length}/${juego.maxPlayers})`
        );

        // Enviar confirmación al jugador que se unió
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
    // SELECCIONAR CARTAS PARA JUGAR
    // =============================
    socket.on("seleccionarCartas", async ({ codigo, jugadorId, cartas }) => {
      console.log(
        `🃏 Evento 'seleccionarCartas' recibido: jugador ${jugadorId} en juego ${codigo} seleccionó ${cartas.length} cartas`
      );
      try {
        // Validaciones
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

        // Verificar que la cantidad de cartas sea correcta
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

        // Validar que las cartas pertenecen al jugador
        const cartasInvalidas = cartas.filter(
          (c) => !jugador.mano.map((id) => id.toString()).includes(c)
        );
        if (cartasInvalidas.length > 0) {
          return socket.emit("errorEvento", {
            message: "Una o más cartas no te pertenecen",
          });
        }

        // Buscar al jugador en el juego
        const jugadorEnJuego = juego.jugadores.find(
          (j) => j.jugadorId.toString() === jugadorId
        );
        if (!jugadorEnJuego) {
          return socket.emit("errorEvento", {
            message: "Jugador no está en la partida",
          });
        }

        // Guardar las cartas seleccionadas
        jugadorEnJuego.selectedCards = cartas;
        await juego.save();

        console.log(
          `✅ Jugador ${jugadorId} seleccionó ${cartas.length} cartas`
        );

        // Notificar a todos
        io.to(codigo).emit("cartasSeleccionadas", {
          jugadorId,
          cantidad: cartas.length,
        });

        // Verificar si todos han seleccionado
        const todosSeleccionaron = juego.jugadores
          .filter((j) => j.activo)
          .every(
            (j) => j.selectedCards && j.selectedCards.length === juego.playCount
          );

        if (todosSeleccionaron && juego.estado === "seleccionando") {
          // Cambiar estado a "jugando"
          juego.estado = "jugando";
          await juego.save();

          io.to(codigo).emit("juegoIniciado", {
            mensaje: "¡Todos han seleccionado sus cartas! El juego comienza.",
            turnoIdx: juego.turnoIdx,
          });

          console.log(`🎮 Juego ${codigo} ha comenzado`);
        }
      } catch (err) {
        console.error("❌ Error en seleccionarCartas:", err);
        socket.emit("errorEvento", {
          message: "Error al seleccionar cartas: " + err.message,
        });
      }
    });

    // =============================
    // JUGAR CARTA
    // =============================
    socket.on(
      "jugarCarta",
      async ({ codigo, jugadorId, cartaId, atributo }) => {
        try {
          // Validaciones
          if (!codigo || !jugadorId || !cartaId || !atributo) {
            return socket.emit("errorEvento", {
              message: "Parámetros faltantes",
            });
          }

          const juego = await Juego.findOne({ codigo });
          if (!juego) {
            return socket.emit("errorEvento", {
              message: "Juego no existe",
            });
          }

          // Validar que el juego esté en estado "jugando"
          if (juego.estado !== "jugando") {
            return socket.emit("errorEvento", {
              message: "El juego no está en curso",
            });
          }

          // Validar turno
          const jugadorActual = juego.jugadores[juego.turnoIdx];
          if (!jugadorActual) {
            return socket.emit("errorEvento", {
              message: "Error en el turno actual",
            });
          }

          if (jugadorActual.jugadorId.toString() !== jugadorId) {
            return socket.emit("errorEvento", {
              message: "No es tu turno",
            });
          }

          // Validar que la carta esté en las cartas seleccionadas
          const jugadorEntry = juego.jugadores.find(
            (p) => p.jugadorId.toString() === jugadorId
          );

          if (!jugadorEntry) {
            return socket.emit("errorEvento", {
              message: "Jugador no encontrado en la partida",
            });
          }

          const tieneCartaSeleccionada = jugadorEntry.selectedCards
            .map((s) => s.toString())
            .includes(cartaId);

          if (!tieneCartaSeleccionada) {
            return socket.emit("errorEvento", {
              message: "Carta no válida o no seleccionada",
            });
          }

          // Validar que el atributo sea válido
          const atributosValidos = [
            "fuerza",
            "velocidad",
            "inteligencia",
            "rareza",
          ];
          if (!atributosValidos.includes(atributo)) {
            return socket.emit("errorEvento", {
              message: "Atributo inválido",
            });
          }

          // Quitar carta del array de selección
          jugadorEntry.selectedCards = jugadorEntry.selectedCards.filter(
            (c) => c.toString() !== cartaId
          );

          // Agregar la carta a cartasEnBatalla
          juego.cartasEnBatalla.push({ jugadorId, cartaId, atributo });
          await juego.save();

          console.log(
            `🃏 Jugador ${jugadorId} jugó carta ${cartaId} con atributo ${atributo}`
          );

          io.to(codigo).emit("cartaJugada", {
            jugadorId,
            cartaId,
            atributo,
          });

          // Si ya todos jugaron una carta -> resolver ronda
          const jugadoresActivos = juego.jugadores.filter((j) => j.activo);
          if (juego.cartasEnBatalla.length >= jugadoresActivos.length) {
            console.log(`⚔️ Todos jugaron, resolviendo ronda...`);
            await resolverRonda(io, juego, atributo);
          } else {
            // Pasar turno al siguiente jugador activo
            let siguienteTurno = (juego.turnoIdx + 1) % juego.jugadores.length;

            // Buscar el siguiente jugador activo
            let intentos = 0;
            while (
              !juego.jugadores[siguienteTurno].activo &&
              intentos < juego.jugadores.length
            ) {
              siguienteTurno = (siguienteTurno + 1) % juego.jugadores.length;
              intentos++;
            }

            juego.turnoIdx = siguienteTurno;
            await juego.save();

            io.to(codigo).emit("siguienteTurno", {
              turnoIdx: juego.turnoIdx,
              jugadorId: juego.jugadores[juego.turnoIdx].jugadorId,
            });

            console.log(`⏭️ Siguiente turno: jugador index ${juego.turnoIdx}`);
          }
        } catch (err) {
          console.error("❌ Error en jugarCarta:", err);
          socket.emit("errorEvento", {
            message: "Error al jugar carta: " + err.message,
          });
        }
      }
    );

    // =============================
    // RESOLVER RONDA
    // =============================
    async function resolverRonda(io, juego, atributo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const jugadas = juego.cartasEnBatalla;
        const valores = [];

        // Calcular valores de cada carta jugada
        for (const j of jugadas) {
          const carta = await Carta.findById(j.cartaId).session(session);
          if (!carta) {
            console.error(`❌ Carta ${j.cartaId} no encontrada`);
            continue;
          }

          valores.push({
            jugadorId: j.jugadorId,
            cartaId: j.cartaId,
            valor: carta.atributos[atributo] || 0,
            nombreCarta: carta.nombre,
          });
        }

        if (valores.length === 0) {
          await session.abortTransaction();
          console.error("❌ No hay valores para resolver");
          return;
        }

        const maxValor = Math.max(...valores.map((v) => v.valor));
        const ganadores = valores.filter((v) => v.valor === maxValor);

        console.log(
          `🎯 Valor máximo: ${maxValor}, Ganadores: ${ganadores.length}`
        );

        if (ganadores.length === 1) {
          // HAY UN GANADOR
          const ganador = ganadores[0];
          const cartasGanadas = valores.map((v) => v.cartaId);

          console.log(
            `🏆 Ganador: ${ganador.jugadorId}, gana ${cartasGanadas.length} cartas`
          );

          // Dar las cartas al ganador
          await Jugador.findByIdAndUpdate(ganador.jugadorId, {
            $push: { mano: { $each: cartasGanadas } },
          }).session(session);

          // Quitar las cartas jugadas de todos los jugadores
          for (const j of jugadas) {
            await Jugador.findByIdAndUpdate(j.jugadorId, {
              $pull: { mano: j.cartaId },
            }).session(session);
          }

          // Limpiar cartasEnBatalla
          juego.cartasEnBatalla = [];
          await juego.save({ session });

          await session.commitTransaction();

          // Notificar resultado
          io.to(juego.codigo).emit("resultadoRonda", {
            ganadorId: ganador.jugadorId,
            cartasGanadas,
            valores,
            atributo,
          });

          // Verificar si alguien ganó el juego (tiene todas las cartas)
          const jugadorGanadorFinal = await Jugador.findById(ganador.jugadorId);
          const totalCartasEnJuego = await Carta.countDocuments();

          if (jugadorGanadorFinal.mano.length >= totalCartasEnJuego * 0.7) {
            juego.estado = "finalizado";
            await juego.save();

            io.to(juego.codigo).emit("juegoFinalizado", {
              ganadorId: ganador.jugadorId,
              mensaje: "¡Juego terminado!",
            });

            console.log(`🎉 Juego finalizado. Ganador: ${ganador.jugadorId}`);
          }
        } else {
          // HAY EMPATE
          console.log(`🤝 Empate entre ${ganadores.length} jugadores`);

          const attrs = ["fuerza", "velocidad", "inteligencia", "rareza"];
          const nuevoAtributo = attrs[Math.floor(Math.random() * attrs.length)];

          await juego.save({ session });
          await session.commitTransaction();

          io.to(juego.codigo).emit("empate", {
            jugadores: ganadores.map((g) => g.jugadorId),
            atributo: nuevoAtributo,
            valores,
            mensaje: `Empate con valor ${maxValor}. Nueva ronda con: ${nuevoAtributo}`,
          });

          console.log(`🔄 Nuevo atributo para desempate: ${nuevoAtributo}`);
        }
      } catch (err) {
        console.error("❌ Error resolviendo ronda:", err);
        await session.abortTransaction();
        io.to(juego.codigo).emit("errorEvento", {
          message: "Error al resolver ronda",
        });
      } finally {
        session.endSession();
      }
    }

    // =============================
    // INICIAR JUEGO (desde el anfitrión)
    // =============================
    socket.on("iniciarJuego", async ({ codigo, jugadorId }) => {
      console.log(
        "🎮 Evento 'iniciarJuego' recibido desde el frontend:",
        codigo,
        jugadorId
      );
      try {
        const juego = await Juego.findOne({ codigo });
        if (!juego) {
          return socket.emit("errorEvento", {
            message: "Juego no encontrado",
          });
        }

        // Verificar que quien inicia sea el primer jugador (anfitrión)
        const primerJugadorId =
          juego.jugadores[0].jugadorId._id || juego.jugadores[0].jugadorId;
        if (primerJugadorId.toString() !== jugadorId) {
          return socket.emit("errorEvento", {
            message: "Solo el anfitrión puede iniciar el juego",
          });
        }

        // Verificar que haya al menos 2 jugadores
        if (juego.jugadores.length < 2) {
          return socket.emit("errorEvento", {
            message: "Se necesitan al menos 2 jugadores",
          });
        }

        // Cambiar estado a "seleccionando"
        juego.estado = "seleccionando";
        await juego.save();

        console.log(
          `🎮 Juego ${codigo} iniciado por el anfitrión. Estado: seleccionando`
        );

        // Notificar a todos los jugadores
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

        await Jugador.findByIdAndUpdate(jugadorId, {
          $set: { eliminado: true },
        }).session(session);

        await juego.save({ session });
        await session.commitTransaction();

        console.log(`🏳️ Jugador ${jugadorId} se rindió en partida ${codigo}`);

        io.to(codigo).emit("jugadorRendido", { jugadorId });

        // Verificar si solo queda un jugador activo
        const jugadoresActivos = juego.jugadores.filter((j) => j.activo);
        if (jugadoresActivos.length === 1) {
          juego.estado = "finalizado";
          await juego.save();

          io.to(codigo).emit("juegoFinalizado", {
            ganadorId: jugadoresActivos[0].jugadorId,
            mensaje: "¡Victoria por rendición!",
          });

          console.log(
            `🎉 Juego finalizado. Ganador por rendición: ${jugadoresActivos[0].jugadorId}`
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
    // DESCONEXIÓN
    // =============================
    socket.on("disconnect", () => {
      console.log(`🔴 Jugador desconectado: ${socket.id}`);
      // Aquí podrías implementar lógica para marcar al jugador como inactivo
      // o dar un tiempo de gracia para reconexión
    });
  });
};
