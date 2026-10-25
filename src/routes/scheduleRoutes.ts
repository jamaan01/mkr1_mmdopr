import { Router } from "express";
import {
  validate,
  generate,
  history
} from "../controllers/scheduleController";

const router = Router();

router.post("/validate", validate);
router.post("/generate", generate);
router.get("/history", history);

export default router;