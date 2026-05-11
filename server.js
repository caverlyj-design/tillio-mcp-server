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

/* MEMORY ENDPOINTS */

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
  try {
    const body = req.body || {};
    const { memory, category, session_name, importance } = body;

    if (!memory) {
      return res.status(400).json({
        error: "Missing memory field",
        received_body: body
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
  } catch (error) {
    res.status(500).json({
      error: "Unexpected server error while saving memory",
      details: error.message
    });
  }
});

/* SESSION LOG ENDPOINTS */

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
  const sessionNumber = Number(req.params.number);

  if (!sessionNumber) {
    return res.status(400).json({
      error: "Invalid session number"
    });
  }

  const { data, error } = await supabase
    .from("session_logs")
    .select("*")
    .eq("session_number", sessionNumber)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: "Unable to load session log",
      details: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      error: "Session log not found",
      session_number: sessionNumber
    });
  }

  res.json(data);
});

app.post("/sessionlog", async (req, res) => {
  try {
    const body = req.body || {};

    const {
      session_number,
      title,
      summary,
      important_events
    } = body;

    if (!session_number || !title) {
      return res.status(400).json({
        error: "session_number and title are required",
        received_body: body
      });
    }

    const { data, error } = await supabase
      .from("session_logs")
      .insert([
        {
          session_number: Number(session_number),
          title,
          summary: summary || "",
          important_events: Array.isArray(important_events) ? important_events : []
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
  } catch (error) {
    res.status(500).json({
      error: "Unexpected server error while saving session log",
      details: error.message
    });
  }
});

/* LORE ENDPOINTS */

app.get("/lore", async (req, res) => {
  const { data, error } = await supabase
    .from("lore_entries")
    .select("*")
    .order("topic", { ascending: true });

  if (error) {
    return res.status(500).json({
      error: "Unable to load lore entries",
      details: error.message
    });
  }

  res.json({
    count: data.length,
    lore_entries: data
  });
});

app.get("/lore/:topic", async (req, res) => {
  const topic = req.params.topic;

  const { data, error } = await supabase
    .from("lore_entries")
    .select("*")
    .ilike("topic", topic)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      error: "Unable to load lore topic",
      details: error.message
    });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({
      error: "Lore topic not found",
      topic
    });
  }

  res.json({
    topic,
    count: data.length,
    entries: data
  });
});

app.get("/searchlore", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({
      error: "Missing search query"
    });
  }

  const { data, error } = await supabase
    .from("lore_entries")
    .select("*")
    .or(`topic.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      error: "Unable to search lore",
      details: error.message
    });
  }

  res.json({
    query,
    count: data.length,
    results: data
  });
});

app.post("/lore", async (req, res) => {
  try {
    const body = req.body || {};
    const { topic, category, content, tags } = body;

    if (!topic || !content) {
      return res.status(400).json({
        error: "topic and content are required",
        received_body: body
      });
    }

    const { data, error } = await supabase
      .from("lore_entries")
      .insert([
        {
          topic,
          category: category || "general",
          content,
          tags: Array.isArray(tags) ? tags : []
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({
        error: "Unable to save lore entry",
        details: error.message
      });
    }

    res.json({
      status: "lore_saved",
      lore_entry: data[0]
    });
  } catch (error) {
    res.status(500).json({
      error: "Unexpected server error while saving lore",
      details: error.message
    });
  }
});

/* RELATIONSHIP ENDPOINTS */

app.get("/relationships", async (req, res) => {
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return res.status(500).json({
      error: "Unable to load relationships",
      details: error.message
    });
  }

  res.json({
    count: data.length,
    relationships: data
  });
});

app.get("/relationship/:name", async (req, res) => {
  const name = req.params.name;

  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: "Unable to load relationship",
      details: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      error: "Relationship not found",
      name
    });
  }

  res.json(data);
});

app.post("/relationship", async (req, res) => {
  try {
    const body = req.body || {};

    const {
      name,
      role,
      relationship_type,
      trust,
      affection,
      fear,
      curiosity,
      notes,
      secrets_known,
      last_interaction
    } = body;

    if (!name) {
      return res.status(400).json({
        error: "name is required",
        received_body: body
      });
    }

    const { data, error } = await supabase
      .from("relationships")
      .insert([
        {
          name,
          role: role || "",
          relationship_type: relationship_type || "unknown",
          trust: Number(trust || 0),
          affection: Number(affection || 0),
          fear: Number(fear || 0),
          curiosity: Number(curiosity || 0),
          notes: Array.isArray(notes) ? notes : [],
          secrets_known: Array.isArray(secrets_known) ? secrets_known : [],
          last_interaction: last_interaction || ""
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({
        error: "Unable to save relationship",
        details: error.message
      });
    }

    res.json({
      status: "relationship_saved",
      relationship: data[0]
    });
  } catch (error) {
    res.status(500).json({
      error: "Unexpected server error while saving relationship",
      details: error.message
    });
  }
});

app.patch("/relationship/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const body = req.body || {};

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (body.role !== undefined) updateData.role = body.role;
    if (body.relationship_type !== undefined) updateData.relationship_type = body.relationship_type;
    if (body.trust !== undefined) updateData.trust = Number(body.trust);
    if (body.affection !== undefined) updateData.affection = Number(body.affection);
    if (body.fear !== undefined) updateData.fear = Number(body.fear);
    if (body.curiosity !== undefined) updateData.curiosity = Number(body.curiosity);
    if (body.notes !== undefined) updateData.notes = Array.isArray(body.notes) ? body.notes : [];
    if (body.secrets_known !== undefined) updateData.secrets_known = Array.isArray(body.secrets_known) ? body.secrets_known : [];
    if (body.last_interaction !== undefined) updateData.last_interaction = body.last_interaction;

    const { data, error } = await supabase
      .from("relationships")
      .update(updateData)
      .ilike("name", name)
      .select();

    if (error) {
      return res.status(500).json({
        error: "Unable to update relationship",
        details: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Relationship not found",
        name
      });
    }

    res.json({
      status: "relationship_updated",
      relationship: data[0]
    });
  } catch (error) {
    res.status(500).json({
      error: "Unexpected server error while updating relationship",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
