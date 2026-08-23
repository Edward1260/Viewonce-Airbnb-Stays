import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import inviteRouter from "./invite.js";
import authRouter from "./auth.js";
import propertiesRouter from "./properties.js";
import bookingsRouter from "./bookings.js";
import usersRouter from "./users.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inviteRouter);
router.use(authRouter);
router.use(propertiesRouter);
router.use(bookingsRouter);
router.use(usersRouter);

export default router;
