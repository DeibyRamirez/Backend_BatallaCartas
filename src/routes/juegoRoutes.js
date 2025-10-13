import express from "express";
import {
  crearJuego,
  listarJuegos,
  obtenerJuego,
  unirseJuego,
  finalizarJuego
} from "../controllers/juegoController.js";

const router = express.Router();

router.post("/", crearJuego);
router.get("/", listarJuegos);
router.get("/:codigo", obtenerJuego);
router.post("/:codigo/unirse", unirseJuego);
router.post("/:codigo/finalizar", finalizarJuego);

export default router;
