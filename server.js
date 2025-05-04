const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DATA_JSON_PATH = path.join(__dirname, "data.json");
const INGREDIENTS_JSON_PATH = path.join(__dirname, "ingredients.json");

// Utility functions
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index_bill.html"));
});

// ---------------------- BILL DATA ROUTES ----------------------
app.get("/all-months", (req, res) => {
  const db = loadJSON(DATA_JSON_PATH);
  const months = {};
  for (let month in db) {
    months[month] = db[month].meta;
  }
  res.json(months);
});

app.get("/data", (req, res) => {
  const db = loadJSON(DATA_JSON_PATH);
  const month = req.query.month || "FEB";
  if (!db[month]) return res.status(404).send("Month not found");
  res.json(db[month]);
});

app.get("/latest", (req, res) => {
  const db = loadJSON(DATA_JSON_PATH);
  const keys = Object.keys(db);
  if (keys.length === 0) return res.status(404).send("No data");
  const latestKey = keys[keys.length - 1];
  res.json(db[latestKey]);
});

app.post("/save", (req, res) => {
  const db = loadJSON(DATA_JSON_PATH);
  const { meta, users } = req.body;
  db[meta.month] = { meta, users };
  try {
    saveJSON(DATA_JSON_PATH, db);
    res.sendStatus(200);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).send("Failed to save data");
  }
});

// ---------------------- INGREDIENT ROUTES ----------------------

// Get ingredient data for a date
app.get("/getIngredients", (req, res) => {
  const db = loadJSON(INGREDIENTS_JSON_PATH);
  const date = req.query.date;
  if (!date || !db[date]) return res.json({});
  res.json(db[date]);
});

// Save ingredient data for a date
app.post("/saveIngredients", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).send("Date required");
  const db = loadJSON(INGREDIENTS_JSON_PATH);
  db[date] = req.body;
  try {
    saveJSON(INGREDIENTS_JSON_PATH, db);
    res.sendStatus(200);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).send("Failed to save ingredients");
  }
});

// List all saved ingredient dates
app.get("/getDates", (req, res) => {
  const db = loadJSON(INGREDIENTS_JSON_PATH);
  res.json(Object.keys(db).sort().reverse());
});

// Delete ingredient list for a specific date
app.delete("/deleteIngredients", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).send("Date required");
  const db = loadJSON(INGREDIENTS_JSON_PATH);
  if (db[date]) {
    delete db[date];
    saveJSON(INGREDIENTS_JSON_PATH, db);
    res.sendStatus(200);
  } else {
    res.status(404).send("Date not found");
  }
});

// ---------------------- START SERVER ----------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
