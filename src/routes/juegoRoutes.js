import express from "express";
import {
  crearJuego,
  listarJuegos,
  obtenerJuego,
  unirseJuego,
  finalizarJuego,
  jugarCarta,
  seleccionarAtributo,
  resolverRonda,
} from "../controllers/juegoController.js";

const router = express.Router();

router.post("/", crearJuego);
router.get("/", listarJuegos);
router.get("/:codigo", obtenerJuego);
router.post("/:codigo/unirse", unirseJuego);
router.post("/:codigo/finalizar", finalizarJuego);
router.post("/:codigo/jugar-carta", jugarCarta);
router.post("/:codigo/seleccionar-atributo", seleccionarAtributo);
router.post("/:codigo/resolver-ronda", resolverRonda);

export default router;
