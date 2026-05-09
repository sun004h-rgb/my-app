import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import businessesRouter from "./businesses";
import workersRouter from "./workers";
import roundsRouter from "./rounds";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(businessesRouter);
router.use(workersRouter);
router.use(roundsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
