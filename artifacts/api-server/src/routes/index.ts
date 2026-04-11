import { Router, type IRouter } from "express";
import healthRouter from "./health";
import specsRouter from "./specs";
import torqueSearchRouter from "./torqueSearch";
import articlesRouter from "./articles";
import directoryRouter from "./directory";
import searchRouter from "./search";
import buildsRouter from "./builds";

const router: IRouter = Router();

router.use(healthRouter);
router.use(specsRouter);
router.use(torqueSearchRouter);
router.use(articlesRouter);
router.use(directoryRouter);
router.use(searchRouter);
router.use(buildsRouter);

export default router;
