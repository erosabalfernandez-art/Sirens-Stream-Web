import { Router, type IRouter } from 'express';
  import healthRouter from './health';
  import chatRouter from './chat';
  import statsRouter from './stats';
  import tutorialsRouter from './tutorials';
  import pushRouter from './push';
  import nominaStateRouter from './nomina-state';
  import agentCommissionsRouter from './agent-commissions';
  import publishRouter from './publish';
  import createAgentRouter from './create-agent';
  import agentWorkersRouter from './agent-workers';
  import cierreSemanalRouter from './cierre-semanal'
  import coliderRouter from './colider';

  const router: IRouter = Router();

  router.use(healthRouter);
  router.use(chatRouter);
  router.use(statsRouter);
  router.use(tutorialsRouter);
  router.use(pushRouter);
  router.use(nominaStateRouter);
  router.use(agentCommissionsRouter);
  router.use(publishRouter);
  router.use(createAgentRouter);
  router.use(agentWorkersRouter);
  router.use(cierreSemanalRouter)
    router.use(coliderRouter);

  export default router;
  