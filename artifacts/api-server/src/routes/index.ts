import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cierreSemanalRouter from "./cierre-semanal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cierreSemanalRouter);

export default router;
