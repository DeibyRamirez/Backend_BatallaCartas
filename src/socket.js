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
        let juego = await Juego.findOne({ codigo });
        if (!juego) {
          // Si no existe, crear nuevo juego
          juego = new Juego({
            codigo,
            estado: "esperando",
            jugadores: [],
            cartasEnBatalla: [],
            turnoIdx: 0,
          });
        }

        // Buscar jugador y darle cartas si aún no tiene
        let jugador = await Jugador.findById(jugadorId);
        if (!jugador) {
          jugador = new Jugador({ _id: jugadorId, mano: [] });
          await jugador.save();
        }

        // Si el jugador no tiene cartas, se le asignan 10 al azar
        if (jugador.mano.length === 0) {
          const todasLasCartas = await Carta.find();
          const seleccionadas = todasLasCartas.sort(() => 0.5 - Math.random()).slice(0, 10);
          jugador.mano = seleccionadas.map(c => c._id);
          await jugador.save();
        }

        // Añadir jugador al juego
        const yaEnJuego = juego.jugadores.find(j => j.jugadorId?.toString() === jugadorId);
        if (!yaEnJuego) {
          juego.jugadores.push({
            jugadorId,
            socketId: socket.id,
            selectedCards: [],
            activo: true,
          });
          await juego.save();
        }

        socket.join(codigo);
        io.to(codigo).emit("jugadorUnido", { jugadorId, socketId: socket.id });
        console.log(`👤 Jugador ${jugadorId} se unió a la partida ${codigo}`);
      } catch (error) {
        console.error(error);
        socket.emit("errorEvento", { message: "Error al unirse al juego" });
      }
    });

    // =============================
    // SELECCIONAR CARTAS PARA JUGAR
    // =============================
    socket.on("seleccionarCartas", async ({ codigo, jugadorId, cartas }) => {
      try {
        const juego = await Juego.findOne({ codigo });
        if (!juego) return socket.emit("errorEvento", { message: "Juego no encontrado" });

        const jugador = await Jugador.findById(jugadorId);
        const cartasInvalidas = cartas.filter(c => !jugador.mano.map(id => id.toString()).includes(c));
        if (cartasInvalidas.length > 0)
          return socket.emit("errorEvento", { message: "Cartas inválidas seleccionadas" });

        const jugadorEnJuego = juego.jugadores.find(j => j.jugadorId.toString() === jugadorId);
        if (!jugadorEnJuego) return socket.emit("errorEvento", { message: "Jugador no está en la partida" });

        jugadorEnJuego.selectedCards = cartas;
        await juego.save();

        io.to(codigo).emit("cartasSeleccionadas", { jugadorId, cantidad: cartas.length });
      } catch (err) {
        console.error(err);
      }
    });

    // =============================
    // JUGAR CARTA
    // =============================
    socket.on("jugarCarta", async ({ codigo, jugadorId, cartaId, atributo }) => {
      const juego = await Juego.findOne({ codigo });
      if (!juego) return socket.emit("errorEvento", { message: "Juego no existe" });

      // Validar turno
      const jugadorActual = juego.jugadores[juego.turnoIdx];
      if (jugadorActual.jugadorId.toString() !== jugadorId)
        return socket.emit("errorEvento", { message: "No es tu turno" });

      // Validar carta
      const jugadorEntry = juego.jugadores.find(p => p.jugadorId.toString() === jugadorId);
      if (!jugadorEntry.selectedCards.map(s => s.toString()).includes(cartaId))
        return socket.emit("errorEvento", { message: "Carta no válida" });

      // Quitar carta del array de selección
      jugadorEntry.selectedCards = jugadorEntry.selectedCards.filter(c => c.toString() !== cartaId);

      // Agregar la carta a cartasEnBatalla
      juego.cartasEnBatalla.push({ jugadorId, cartaId, atributo });
      await juego.save();

      io.to(codigo).emit("cartaJugada", { jugadorId, cartaId });

      // Si ya todos jugaron una carta -> resolver ronda
      if (juego.cartasEnBatalla.length >= juego.jugadores.filter(j => j.activo).length) {
        await resolverRonda(io, juego, atributo);
      } else {
        // Pasar turno
        juego.turnoIdx = (juego.turnoIdx + 1) % juego.jugadores.length;
        await juego.save();
        io.to(codigo).emit("siguienteTurno", { turnoIdx: juego.turnoIdx });
      }
    });

    // =============================
    // RESOLVER RONDA
    // =============================
    async function resolverRonda(io, juego, atributo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const jugadas = juego.cartasEnBatalla;
        const valores = [];

        for (const j of jugadas) {
          const carta = await Carta.findById(j.cartaId).session(session);
          valores.push({
            jugadorId: j.jugadorId,
            cartaId: j.cartaId,
            valor: carta.atributos[atributo],
          });
        }

        const maxValor = Math.max(...valores.map(v => v.valor));
        const ganadores = valores.filter(v => v.valor === maxValor);

        if (ganadores.length === 1) {
          // GANADOR
          const ganador = ganadores[0];
          const cartasGanadas = valores.map(v => v.cartaId);

          await Jugador.findByIdAndUpdate(ganador.jugadorId, {
            $push: { mano: { $each: cartasGanadas } },
          }).session(session);

          juego.cartasEnBatalla = [];
          await juego.save({ session });

          await session.commitTransaction();
          io.to(juego.codigo).emit("resultadoRonda", {
            ganadorId: ganador.jugadorId,
            cartasGanadas,
          });
        } else {
          // EMPATE
          const attrs = ["fuerza", "velocidad", "inteligencia", "rareza"];
          const nuevoAtributo = attrs[Math.floor(Math.random() * attrs.length)];
          await juego.save({ session });
          await session.commitTransaction();
          io.to(juego.codigo).emit("empate", {
            jugadores: ganadores.map(g => g.jugadorId),
            atributo: nuevoAtributo,
          });
        }
      } catch (err) {
        console.error("❌ Error resolviendo ronda:", err);
        await session.abortTransaction();
      } finally {
        session.endSession();
      }
    }

    // =============================
    // RENDIRSE
    // =============================
    socket.on("rendirse", async ({ codigo, jugadorId }) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const juego = await Juego.findOne({ codigo }).session(session);
        const jugador = juego.jugadores.find(j => j.jugadorId.toString() === jugadorId);
        if (!jugador) return;

        jugador.activo = false;
        await Jugador.findByIdAndUpdate(jugadorId, { $set: { eliminado: true } }).session(session);

        await juego.save({ session });
        await session.commitTransaction();

        io.to(codigo).emit("jugadorRendido", { jugadorId });
      } catch (err) {
        await session.abortTransaction();
        console.error("Error en rendirse:", err);
      } finally {
        session.endSession();
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Jugador desconectado: ${socket.id}`);
    });
  });
};
