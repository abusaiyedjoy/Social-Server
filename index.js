const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = ["http://localhost:5173", "https://social-media-handle.netlify.app/"]; 
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// MongoDB URI and Client Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.w66ri.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); 
  },
});
const upload = multer({ storage });

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const usersCollection = client.db("Social-Media").collection("users");

    // POST Route to Add a User
    app.post("/users", upload.array("images"), async (req, res) => {
      try {
        const { name, socialHandle } = req.body;
        if (!name || !socialHandle || !req.files || req.files.length === 0) {
          return res
            .status(400)
            .json({ error: "Name, socialHandle, and images are required" });
        }

        const imagePaths = req.files.map((file) => `/uploads/${file.filename}`); // Store relative paths
        const newUser = {
          name,
          socialHandle,
          images: imagePaths,
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ message: "User added successfully", user: result.ops[0] });
      } catch (err) {
        console.error("Error adding user:", err);
        res.status(500).json({ error: "Failed to add user" });
      }
    });

    // GET Route to Fetch All Users
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.json(users);
      } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
      }
    });

    app.use("/uploads", express.static("uploads"));
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
