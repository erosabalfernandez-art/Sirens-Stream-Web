import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import statsRouter from "./stats";
import tutorialsRouter from "./tutorials";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(statsRouter);
router.use(tutorialsRouter);

export default router;
