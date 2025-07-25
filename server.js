const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDK setup
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_CONFIG_B64, "base64").toString("utf8")
);
// Firebase Admin SDK setup
//const serviceAccount = require("./firebaseKey.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pappu-mess-default-rtdb.firebaseio.com/" // Replace with your project’s actual DB URL
});

const db = admin.database();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------- BILL DATA ROUTES ----------------------

// Get all months with their meta info
app.get("/all-months", async (req, res) => {
  try {
    const snapshot = await db.ref("bills").once("value");
    const data = snapshot.val();
    if (!data) return res.json({});
    const months = {};
    for (let month in data) {
      months[month] = data[month].meta;
    }
    res.json(months);
  } catch (err) {
    console.error("Error fetching all months:", err);
    res.status(500).send("Error fetching all months");
  }
});

// Get data for a specific month
app.get("/data", async (req, res) => {
  const month = req.query.month || "FEB";
  try {
    const snapshot = await db.ref("bills/" + month).once("value");
    if (!snapshot.exists()) return res.status(404).send("Month not found");
    res.json(snapshot.val());
  } catch (err) {
    console.error("Error fetching month data:", err);
    res.status(500).send("Error fetching month data");
  }
});

// Get latest saved month (based on last key in Firebase object)
app.get("/latest", async (req, res) => {
  try {
    const snapshot = await db.ref("bills").once("value");
    const data = snapshot.val();
    if (!data) return res.status(404).send("No data");

    let latestEntry = null;
    let latestTimestamp = -Infinity;

    for (const [monthKey, monthData] of Object.entries(data)) {
      const ts = monthData.meta?.timestamp;
      if (typeof ts === "number" && ts > latestTimestamp) {
        latestTimestamp = ts;
        latestEntry = monthData;
      }
    }

    if (!latestEntry) return res.status(404).send("No valid timestamped data");

    res.json(latestEntry);
  } catch (err) {
    console.error("Error fetching latest data:", err);
    res.status(500).send("Error fetching latest data");
  }
});

// Save bill data for a month
app.post("/save", async (req, res) => {
  const { meta, users } = req.body;
  if (!meta || !meta.month) return res.status(400).send("Missing month in meta");

  try {
    // Add a timestamp to the meta object
    meta.timestamp = Date.now();

    await db.ref("bills/" + meta.month).set({ meta, users });
    res.sendStatus(200);
  } catch (err) {
    console.error("Error saving bill data:", err);
    res.status(500).send("Failed to save data");
  }
});
// Delete bill data for a month
app.delete("/delete", async (req, res) => {
  const month = req.query.month;
  if (!month) return res.status(400).send("Month is required");
  
  try {
    await db.ref("bills/" + month).remove();
    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting month:", err);
    res.status(500).send("Failed to delete");
  }
});



// ---------------------- INGREDIENT ROUTES ----------------------

// Get ingredient data for a specific date
app.get("/getIngredients", async (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).send("Date is required");
  try {
    const snapshot = await db.ref("ingredients/" + date).once("value");
    const data = snapshot.val();
    if (!data) return res.json({});
    res.json(data);
  } catch (err) {
    console.error("Error fetching ingredients:", err);
    res.status(500).send("Error fetching ingredients");
  }
});

// Save ingredient data for a specific date
app.post("/saveIngredients", async (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).send("Date is required");
  try {
    await db.ref("ingredients/" + date).set(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error saving ingredients:", err);
    res.status(500).send("Failed to save ingredients");
  }
});

// Get list of all ingredient dates
app.get("/getDates", async (req, res) => {
  try {
    const snapshot = await db.ref("ingredients").once("value");
    const data = snapshot.val();
    if (!data) return res.json([]);
    const dates = Object.keys(data).sort().reverse();
    res.json(dates);
  } catch (err) {
    console.error("Error fetching ingredient dates:", err);
    res.status(500).send("Error fetching dates");
  }
});

// Delete ingredient data for a specific date
app.delete("/deleteIngredients", async (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).send("Date is required");
  try {
    const ref = db.ref("ingredients/" + date);
    const snapshot = await ref.once("value");
    if (!snapshot.exists()) return res.status(404).send("Date not found");

    await ref.remove();
    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting ingredients:", err);
    res.status(500).send("Failed to delete ingredients");
  }
});


// Serve frontend
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index_bill.html"));
});




// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
