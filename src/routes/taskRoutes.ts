import { Router } from "express";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listResources,
  updateResource
} from "../controllers/taskController";

const router = Router();

router.get("/tasks", listTasks);
router.post("/tasks", createTask);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

router.get("/resources", listResources);
router.put("/resources/:id", updateResource);

export default router;