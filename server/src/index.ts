import express from "express";
import cors from "cors";

const app = express();
// Allow all origins by default; restrict via CORS_ORIGIN (comma-separated)
// for deployed environments where the web origin is known.
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim());
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());

// In-memory state — intentionally simple so tests can assert exact values.
let counter = 0;
let lastAction = "none";

const state = () => ({ counter, lastAction });

app.get("/api/state", (_req, res) => {
  res.json(state());
});

app.post("/api/increment", (_req, res) => {
  counter += 1;
  lastAction = "increment";
  res.json(state());
});

app.post("/api/decrement", (_req, res) => {
  counter -= 1;
  lastAction = "decrement";
  res.json(state());
});

app.post("/api/reset", (_req, res) => {
  counter = 0;
  lastAction = "reset";
  res.json(state());
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
