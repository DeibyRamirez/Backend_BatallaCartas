import express from "express";

import {
  actualizarJugador,
  buscarJugador,
  buscarJugadorPorId,
  crearJugador,
  eliminarJugador,
} from "../controllers/jugadorController.js";

const router = express.Router();

router.post("/", crearJugador);
router.get("/", buscarJugador);
router.get("/:id", buscarJugadorPorId);
router.put("/:id", actualizarJugador);
router.delete("/:id", eliminarJugador);

export default router;
