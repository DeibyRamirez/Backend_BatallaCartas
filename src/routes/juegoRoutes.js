import express from "express";
import {
  actualizarJuego,
  buscarJuegoPorId,
  buscarJuegos,
  crearJuego,
  eliminarJuego,
} from "../controllers/juegoController.js";

const router = express.Router();

router.post("/", crearJuego);
router.get("/", buscarJuegos);
router.get("/:id", buscarJuegoPorId);
router.put("/:id", actualizarJuego);
router.delete("/:id", eliminarJuego);

export default router;
