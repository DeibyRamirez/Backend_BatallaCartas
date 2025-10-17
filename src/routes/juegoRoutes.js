import express from "express";
import {
  crearJuego,
  listarJuegos,
  obtenerJuego,
  unirseJuego,
  apostarCarta,
  resolverRonda,
  finalizarJuego,
} from "../controllers/juegoController.js";

const router = express.Router();

// Rutas básicas del juego
router.post("/", crearJuego);
router.get("/", listarJuegos);
router.get("/:codigo", obtenerJuego);
router.post("/:codigo/unirse", unirseJuego);

// Rutas de la nueva lógica de apuestas
router.post("/:codigo/apostar-carta", apostarCarta);
router.post("/:codigo/resolver-ronda", resolverRonda);

// Finalizar juego
router.post("/:codigo/finalizar", finalizarJuego);

export default router;
