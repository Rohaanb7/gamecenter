require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");

const writeFile = promisify(fs.writeFile);

const app = express();

// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", express.static(path.join(__dirname, "static")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set true only in HTTPS production
  })
);

// ================= DATABASE =================

const MONGO_URI = process.env.MONGO_URL;

let db, collection;

async function connectDb() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();

    db = client.db("matrixdb");
    collection = db.collection("matrix");

    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
}

// ================= CSV EXPORT =================

async function exportMongoToCsv() {
  try {
    if (!collection) return;

    const bookings = await collection
      .find({}, { projection: { _id: 0 } })
      .toArray();

    const filePath = path.join(__dirname, "bookings_data.csv");

    const header = [
      "Name",
      "Contact",
      "Players",
      "Console",
      "Date",
      "Time Slot",
    ];

    const lines = [header.join(",")];

    for (const b of bookings) {
      lines.push(
        [
          b.name || "",
          b.contact || "",
          b.players || "",
          b.console || "",
          b.date || "",
          b.time_slot || "",
        ].join(",")
      );
    }

    await writeFile(filePath, lines.join("\n"), "utf8");
    console.log("✅ CSV UPDATED");
  } catch (e) {
    console.error("❌ CSV ERROR:", e.message);
  }
}

// ================= CONSTANTS =================

const TIME_SLOTS = [
  "10 - 11 AM",
  "11 - 12 PM",
  "12 - 1 PM",
  "1 - 2 PM",
  "2 - 3 PM",
  "3 - 4 PM",
  "4 - 5 PM",
  "5 - 6 PM",
  "6 - 7 PM",
  "7 - 8 PM",
  "8 - 9 PM",
  "9 - 10 PM",
];

// ================= AUTH =================

function loginRequired(req, res, next) {
  if (!req.session.admin_logged_in) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

const ADMIN_USERNAME = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASS || "matrix2024";

// ================= ROUTES =================

// Serve HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "template", "index.html"));
});

app.get("/booking", (req, res) => {
  res.sendFile(path.join(__dirname, "template", "index2.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "template", "admin.html"));
});

// ================= ADMIN LOGIN =================

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.admin_logged_in = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

app.get("/admin-logout", (req, res) => {
  req.session.destroy(() => {});
  res.redirect("/");
});

// ================= BOOKING =================

app.get("/time-slots", (req, res) => {
  res.json(TIME_SLOTS);
});

app.get("/booked-slots", async (req, res) => {
  try {
    const { date, console: consoleName } = req.query;

    const bookings = await collection
      .find(
        { date, console: consoleName },
        { projection: { _id: 0, time_slot: 1 } }
      )
      .toArray();

    res.json(bookings.map((b) => b.time_slot));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/add-booking", async (req, res) => {
  try {
    const data = req.body;

    const required = ["name", "contact", "players", "console", "date", "time_slot"];

    if (required.some((field) => !data[field])) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await collection.findOne({
      date: data.date,
      time_slot: data.time_slot,
      console: data.console,
    });

    if (existing) {
      return res.status(409).json({ message: "Time slot already booked" });
    }

    const bookingData = {
      name: data.name,
      contact: data.contact,
      players: parseInt(data.players, 10),
      console: data.console,
      date: data.date,
      time_slot: data.time_slot,
    };

    await collection.insertOne(bookingData);
    await exportMongoToCsv();

    res.json({ message: "Booking successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= ADMIN MANAGEMENT =================

app.get("/admin/bookings", loginRequired, async (req, res) => {
  const bookings = await collection
    .find({}, { projection: { _id: 0 } })
    .toArray();

  res.json(bookings);
});

app.delete("/admin/delete-booking", loginRequired, async (req, res) => {
  const data = req.body;

  const result = await collection.deleteOne({
    date: data.date,
    time_slot: data.time_slot,
    console: data.console,
  });

  if (result.deletedCount > 0) {
    await exportMongoToCsv();
    return res.json({ message: "Deleted successfully" });
  }

  res.status(404).json({ message: "Booking not found" });
});

app.put("/admin/update-booking", loginRequired, async (req, res) => {
  const data = req.body;

  const result = await collection.updateOne(
    {
      date: data.old_date,
      time_slot: data.old_time_slot,
      console: data.old_console,
    },
    {
      $set: {
        name: data.name,
        contact: data.contact,
        players: parseInt(data.players, 10),
        console: data.console,
        date: data.date,
        time_slot: data.time_slot,
      },
    }
  );

  if (result.modifiedCount > 0) {
    await exportMongoToCsv();
    return res.json({ message: "Updated successfully" });
  }

  res.status(404).json({ message: "Booking not found" });
});

app.get("/admin/export-to-csv", loginRequired, (req, res) => {
  const filePath = path.join(__dirname, "bookings_data.csv");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "CSV file not found" });
  }

  res.download(
    filePath,
    `matrix_bookings_${new Date().toISOString().replace(/[:.]/g, "_")}.csv`
  );
});

// ================= START SERVER =================

(async () => {
  await connectDb();
  await exportMongoToCsv();

  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌍 Local link: http://localhost:${port}`);
  });
})();