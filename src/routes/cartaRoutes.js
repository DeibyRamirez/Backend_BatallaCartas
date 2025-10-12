import express from "express";
import {
  actualizarCarta,
  buscarCartaPorId,
  buscarCartas,
  crearCarta,
  eliminarCarta,
} from "../controllers/cartaController.js";

const router = express.Router();

router.post("/", crearCarta);
router.get("/", buscarCartas);
router.get("/:id", buscarCartaPorId);
router.put("/:id", actualizarCarta);
router.delete("/:id", eliminarCarta);

export default router;
