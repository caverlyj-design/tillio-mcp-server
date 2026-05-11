import express from "express";
import fs from "fs";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

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

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    supabase_connected: Boolean(supabaseUrl && supabaseKey)
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

/* =========================
   MEMORY ENDPOINTS
========================= */

app.get("/memories", async (req, res) => {
  const { data, error } = await supabase
    .from("tillio_memories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      error: "Unable to load memories",
      details: error.message
    });
  }

  res.json({
    count: data.length,
    memories: data
  });
});

app.get("/searchmemories", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({
      error: "Missing search query"
    });
  }

  const { data, error } = await supabase
    .from("tillio_memories")
    .select("*")
    .ilike("memory", `%${query}%`)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      error: "Unable to search memories",
      details: error.message
    });
  }

  res.json({
    query,
    count: data.length,
    results: data
  });
});

app.post("/memory", async (req, res) => {
  const { memory, category, session_name, importance } = req.body;

  if (!memory) {
    return res.status(400).json({
      error: "Missing memory field"
    });
  }

  const { data, error } = await supabase
    .from("tillio_memories")
    .insert([
      {
        memory,
        category: category || "general",
        session_name: session_name || null,
        importance: importance || 1
      }
    ])
    .select();

  if (error) {
    return res.status(500).json({
      error: "Unable to save memory",
      details: error.message
    });
  }

  res.json({
    status: "memory_saved",
    memory: data[0]
  });
});

/* =========================
   SESSION LOG ENDPOINTS
========================= */

app.get("/sessionlogs", async (req, res) => {
  const { data, error } = await supabase
    .from("session_logs")
    .select("*")
    .order("session_number", { ascending: false });

  if (error) {
    return res.status(500).json({
      error: "Unable to load session logs",
      details: error.message
    });
  }

  res.json({
    count: data.length,
    session_logs: data
  });
});

app.get("/sessionlog/:number", async (req, res) => {
  const sessionNumber = req.params.number;

  const { data, error } = await supabase
    .from("session_logs")
    .select("*")
    .eq("session_number", sessionNumber)
    .single();

  if (error) {
    return res.status(404).json({
      error: "Session log not found",
      details: error.message
    });
  }

  res.json(data);
});

app.post("/sessionlog", async (req, res) => {
  const {
    session_number,
    title,
    summary,
    important_events
  } = req.body;

  if (!session_number || !title) {
    return res.status(400).json({
      error: "session_number and title are required"
    });
  }

  const { data, error } = await supabase
    .from("session_logs")
    .insert([
      {
        session_number,
        title,
        summary: summary || "",
        important_events: important_events || []
      }
    ])
    .select();

  if (error) {
    return res.status(500).json({
      error: "Unable to save session log",
      details: error.message
    });
  }

  res.json({
    status: "session_log_saved",
    session_log: data[0]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
