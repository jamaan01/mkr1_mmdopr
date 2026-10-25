import express from "express";
import path from "node:path";
import taskRoutes from "./routes/taskRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import errorHandler from "./middleware/errorHandler";

const app = express();

app.use(express.json());

app.use("/api", taskRoutes);
app.use("/api/schedule", scheduleRoutes);

app.use(express.static(path.resolve("public")));

app.use((req, res) => {
  res.status(404).json({ error: "Сторінку не знайдено." });
});

app.use(errorHandler);

export default app;