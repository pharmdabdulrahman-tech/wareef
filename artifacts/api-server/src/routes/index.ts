import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import ordersRouter from "./orders";
import serviceProvidersRouter from "./serviceProviders";
import storageRouter from "./storage";
import providerRouter from "./provider";
import adminProvidersRouter from "./adminProviders";
import demoOrdersRouter from "./demoOrders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(ordersRouter);
router.use(serviceProvidersRouter);
router.use(storageRouter);
router.use(providerRouter);
router.use(adminProvidersRouter);
router.use(demoOrdersRouter);

export default router;
