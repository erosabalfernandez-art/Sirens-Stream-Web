import { Router, type IRouter } from 'express';
import healthRouter from './health';
import chatRouter from './chat';
import statsRouter from './stats';
import tutorialsRouter from './tutorials';
import pushRouter from './push';
import nominaStateRouter from './nomina-state';

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(statsRouter);
router.use(tutorialsRouter);
router.use(pushRouter);
router.use(nominaStateRouter);

export default router;
