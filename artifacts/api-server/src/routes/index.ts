import { Router, type IRouter } from "express";
  import healthRouter from "./health";
  import chatRouter from "./chat";
  import statsRouter from "./stats";
  import tutorialsRouter from "./tutorials";
  import pushRouter from "./push";

  const router: IRouter = Router();

  router.use(healthRouter);
  router.use(chatRouter);
  router.use(statsRouter);
  router.use(tutorialsRouter);
  router.use(pushRouter);

  export default router;
  