import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    server: "Tillio MCP Server",
    message: "The kender is watching."
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
