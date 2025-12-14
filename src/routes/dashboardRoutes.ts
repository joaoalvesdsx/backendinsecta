import { Router } from "express";
import { DashboardController } from "../controllers/dashboardController";
import { authenticateJWT, authorizeAdmin } from "../middlewares/authMiddleware";

const router = Router();
const dashboardController = new DashboardController();

// Middleware de autenticação e autorização para todas as rotas
router.use(authenticateJWT);
router.use(authorizeAdmin);

// GET /admin/dashboard/summary
router.get("/summary", dashboardController.summary);

// GET /admin/dashboard/activities
router.get("/activities", dashboardController.activities);

// GET /admin/dashboard/timeseries
router.get("/timeseries", dashboardController.timeseries);

// GET /admin/dashboard/distribution
router.get("/distribution", dashboardController.distribution);

// GET /admin/dashboard/distribution/species
router.get("/distribution/species", dashboardController.distributionBySpecies);

// GET /admin/dashboard/distribution/regions
router.get("/distribution/regions", dashboardController.distributionByRegions);

// GET /admin/dashboard/distribution/cities
router.get("/distribution/cities", dashboardController.distributionByCities);

export default router;
