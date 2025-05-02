const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000; // Dynamic port for hosting platforms

const dbPath = path.join(__dirname, "data.json");

// Utility function to load fresh data from file
function loadDB() {
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

// Middleware
app.use(express.json());
app.use(express.static("public")); // Serve static files from 'public' folder

// Root route: serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// List all months
app.get("/all-months", (req, res) => {
  const db = loadDB();
  const months = {};
  for (let month in db) {
    months[month] = db[month].meta;
  }
  res.json(months);
});

// Serve data for a specific month
app.get("/data", (req, res) => {
  const db = loadDB();
  const month = req.query.month || "FEB";
  if (!db[month]) return res.status(404).send("Month not found");
  res.json(db[month]);
});

// Serve latest month
app.get("/latest", (req, res) => {
  const db = loadDB();
  const keys = Object.keys(db);
  if (keys.length === 0) return res.status(404).send("No data");
  const latestKey = keys[keys.length - 1];
  res.json(db[latestKey]);
});

// Save updated bill data
app.post("/save", (req, res) => {
  const db = loadDB();
  const { meta, users } = req.body;
  db[meta.month] = { meta, users };

  fs.writeFile(dbPath, JSON.stringify(db, null, 2), (err) => {
    if (err) {
      console.error("Save error:", err);
      return res.status(500).send("Failed to save data");
    }
    res.sendStatus(200);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
