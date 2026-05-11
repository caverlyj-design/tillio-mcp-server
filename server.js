import express from "express";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function loadJsonFile(filename) {
  const rawData = fs.readFileSync(filename, "utf8");
  return JSON.parse(rawData);
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    server: "Tillio MCP Server",
    message: "The kender is watching."
  });
});

app.get("/tillio", (req, res) => {
  try {
    const tillio = loadJsonFile("tillio.json");
    res.json(tillio);
  } catch (error) {
    res.status(500).json({
      error: "Unable to load Tillio profile",
      details: error.message
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
