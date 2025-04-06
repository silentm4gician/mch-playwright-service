import express from "express";
import dotenv from "dotenv";
import watchRoute from "./src/routes/watch.js";
import cors from "cors";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use("/api", watchRoute);

app.listen(PORT, () => {
  console.log(`🎭 Playwright microservicio activo en http://localhost:${PORT}`);
});
