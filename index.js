const https = require('https');
const fs = require('fs');
const path = require('path');

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const cors = require("cors");
const express = require("express");
const app = express();
const port = process.env.PORT || 3002;

const bcrypt = require("bcrypt");
const { connectMongoose } = require("./connect");
const mongoose = require("mongoose");
const User = require("./models/User");
const Grocery = require("./models/Grocery");
const HealthInventory = require("./models/HealthInventory");
const ExerciseAPI = require("./api/exercises");
const NutritionAPI = require("./api/nutrition");

app.use(
    cors({
        origin: ["http://localhost:5173", "http://localhost:5174", "https://localhost:5173", "https://localhost:5174", "https://cfa-summer2025-grocerybuddy-www.netlify.app"],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

//* ********************* Manage accounts **************** */

app.post("/signup", async (req, res) => {
    console.log("POST request received on signup route");
    const newUser = req.body;

    const existingUser = await User.exists(newUser.username);
    if (!existingUser) {
        bcrypt.hash(newUser.password, 10, async function (err, hash) {
            if (!(err instanceof Error)) {
                newUser.password = hash;

                const results = await User.signup(newUser);
                console.log(`New user created with id: ${results._id}`);

                const token = jwt.sign(
                    { username: newUser.username, userId: results._id },
                    process.env.JWT_SECRET, //look at later?
                    { expiresIn: "7d" }
                );
                console.log('SIGNUP - Generated token:', token);
                console.log('SIGNUP - Setting cookie with token');
                res.cookie("token", token, {
                    httpOnly: true,
                    sameSite: "lax",
                    secure: false, // Set to false for HTTP localhost development
                });

                console.log('SIGNUP - Cookie set, sending 201 response');
                res.sendStatus(201);
            } else {
                res.sendStatus(500);
            }
        });
    } else {
        res.sendStatus(400);
    }
});

app.post("/login", async (req, res) => {
    console.log("POST request received on login route");
    const user = req.body;

    const existingUser = await User.findOne({ username: user.username }).exec();
    if (existingUser !== null) {
        bcrypt.compare(
            user.password,
            existingUser.password,
            function (err, result) {
                if (!(err instanceof Error) && result) {
                    const token = jwt.sign(
                        { username: user.username, userId: existingUser._id},
                        process.env.JWT_SECRET, //
                        { expiresIn: "7d" },
                    );
                    res.cookie("token", token, {
                        httpOnly: true,
                        sameSite: "lax",
                        secure: false, // Set to false for HTTP localhost development
                    });

                    res.sendStatus(200);
                } else {
                    res.sendStatus(401);
                }
            }
        );
    } else {
        res.sendStatus(401);
    }
});

app.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
    });
    res.sendStatus(200);
});

//* ********************* Middleware authorizers **************** */

// Checks for valid token? and correct UserId. is the id the same they wanna search for
async function requireValidTokenAndUser(req, res, next) {
    //TODO
    // const token = req.cookies.token;
    // if (token) {
    //     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    //         if (err || decoded.username !== req.body.user) {
    //             res.status(403).json([]); // Forbidden if token is invalid
    //         }
    //     });
    // } else {
    //     const userExists = await User.exists(req.body.user);
    //     if (userExists) {
    //         res.status(403).json([]); // Forbidden if user exists and token not provided
    //     }
    // }

    if (res.statusCode !== 403) {
        next();
    }
}

//* ********************* Grocery list **************** */

// Add a new grocery item.
// Body json:
// {
//     "ownerId": String,
//     "name": String,
//     "quantity": Number,
//     "category": String,
//     "isBought": Boolean
// }
app.post("/grocery/", requireValidTokenAndUser, async (req, res) => {
    // console.log("PRINTING REQ BODY:", req.body);
    const newItem = req.body;
    const results = await Grocery.addOrUpdateItem(newItem);
    res.sendStatus(201);
    
    console.log("POST request received on grocery route");
});

// Get grocery list items from a user
app.get("/grocery/:userId", requireValidTokenAndUser, async (req, res) => {
    const results = await Grocery.readAll(req.params.userId);
    // console.log("PRINTING RESULTS:", results);
    res.send(results); //separation of item categories must be implemented 

    console.log("GET request received on grocery page");
});

// Update an existing item's name or quantity.
// Body json:
// {
//     "ownerId": String,
//     "name": String,
//     "quantity": Number,
//     "category": String,
//     "isBought": Boolean
// }
app.patch("/grocery/", requireValidTokenAndUser, async (req, res) => {
    const itemUpdate = req.body;
    const results = await Grocery.addOrUpdateItem(itemUpdate);

    res.sendStatus(200);

    console.log("PATCH request received on message route");
});

// Delete an existing item
// Body json:
// {
//     "_id": String
// }
app.delete("/grocery/", requireValidTokenAndUser, async (req, res) => {
    const results = await Grocery.delete(req.body);
    res.sendStatus(200);

    console.log("DELETE request received on message route");
    // console.log(`User ${req.params.id}'s item with id ${req.body} deleted`);
});

//* ********************* Health Inventory **************** */

// Create a new health entry
app.post("/health/", requireValidTokenAndUser, async (req, res) => {
    try {
        console.log("Received request body:", req.body);
        
        // Extract user ID from JWT token
        const token = req.cookies.token;
        console.log('CREATE - All cookies:', req.cookies);
        console.log('CREATE - Token received:', token);
        if (!token) {
            console.log('CREATE - No token found in cookies');
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('CREATE - Decoded token:', decoded);
        const userId = new mongoose.Types.ObjectId(decoded.userId);
        console.log('CREATE - Extracted userId:', userId);
        
        // Only include type-specific fields based on the entry type
        const entryData = {
            userId: userId,
            type: req.body.type,
            value: req.body.value,
            date: req.body.date,
            notes: req.body.notes
        };

        // Add unit field only for types that need it (weight, blood_pressure)
        if (req.body.type === 'weight' || req.body.type === 'blood_pressure') {
            entryData.unit = req.body.unit;
        }

        // Add type-specific fields only for the relevant type
        if (req.body.type === 'blood_pressure') {
            entryData.systolic = req.body.systolic;
            entryData.diastolic = req.body.diastolic;
        } else if (req.body.type === 'meal') {
            // Only add mealType if it's not empty to avoid enum validation error
            if (req.body.mealType && req.body.mealType.trim() !== '') {
                entryData.mealType = req.body.mealType;
            }
            entryData.calories = req.body.calories;
            entryData.nutrition = req.body.nutrition;
        } else if (req.body.type === 'workout') {
            // Only add workoutType if it's not empty to avoid enum validation error
            if (req.body.workoutType && req.body.workoutType.trim() !== '') {
                entryData.workoutType = req.body.workoutType;
            }
            entryData.duration = req.body.duration;
            entryData.exercises = req.body.exercises;
        }
        
        console.log("Final entryData:", entryData);
        const newEntry = await HealthInventory.createEntry(entryData);
        res.status(201).json(newEntry);
        console.log("POST request received on health route");
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        console.error("Error creating health entry:", error);
        res.status(500).json({ error: "Failed to create health entry" });
    }
});

// Get all health entries for a user (optionally filtered by type)
app.get("/health/", requireValidTokenAndUser, async (req, res) => {
    try {
        // Extract user ID from JWT token
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('FETCH - Decoded token:', decoded);
        const userId = new mongoose.Types.ObjectId(decoded.userId);
        console.log('FETCH - Extracted userId:', userId);

        const { type } = req.query;
        const entries = await HealthInventory.getUserEntries(userId, type);
        res.json(entries);
        console.log("GET request received on health route");
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        console.error("Error fetching health entries:", error);
        res.status(500).json({ error: "Failed to fetch health entries" });
    }
});

// Get a specific health entry
app.get("/health/entry/:entryId", requireValidTokenAndUser, async (req, res) => {
    try {
        // Extract user ID from JWT token
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = new mongoose.Types.ObjectId(decoded.userId);

        const entry = await HealthInventory.getEntryById(req.params.entryId, userId);
        if (!entry) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.json(entry);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        console.error("Error fetching health entry:", error);
        res.status(500).json({ error: "Failed to fetch health entry" });
    }
});

// Update a health entry
app.patch("/health/:entryId", requireValidTokenAndUser, async (req, res) => {
    try {
        // Extract user ID from JWT token
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = new mongoose.Types.ObjectId(decoded.userId);

        // Clean the update data to avoid enum validation errors
        const updateData = { ...req.body };
        
        // Remove empty enum fields to avoid validation errors
        if (updateData.mealType === '') {
            delete updateData.mealType;
        }
        if (updateData.workoutType === '') {
            delete updateData.workoutType;
        }

        const updatedEntry = await HealthInventory.updateEntry(req.params.entryId, userId, updateData);
        if (!updatedEntry) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.json(updatedEntry);
        console.log("PATCH request received on health route");
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        console.error("Error updating health entry:", error);
        res.status(500).json({ error: "Failed to update health entry" });
    }
});

// Delete a health entry
app.delete("/health/:entryId", requireValidTokenAndUser, async (req, res) => {
    try {
        // Extract user ID from JWT token
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = new mongoose.Types.ObjectId(decoded.userId);

        const deletedEntry = await HealthInventory.deleteEntry(req.params.entryId, userId);
        if (!deletedEntry) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.sendStatus(200);
        console.log("DELETE request received on health route");
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        console.error("Error deleting health entry:", error);
        res.status(500).json({ error: "Failed to delete health entry" });
    }
});

//* ********************* External APIs **************** */

// Exercise API routes
app.get("/api/exercises", requireValidTokenAndUser, async (req, res) => {
    try {
        const { muscle, type, difficulty, name } = req.query;
        let exercises;
        
        if (name) {
            exercises = await ExerciseAPI.searchExercisesByName(name);
        } else if (muscle) {
            exercises = await ExerciseAPI.getExercisesByMuscle(muscle, difficulty);
        } else if (type) {
            exercises = await ExerciseAPI.getExercisesByType(type, muscle);
        } else {
            exercises = await ExerciseAPI.fetchExercises(req.query);
        }
        
        res.json(exercises);
    } catch (error) {
        console.error("Error fetching exercises:", error);
        res.status(500).json({ error: "Failed to fetch exercises" });
    }
});

app.get("/api/exercises/all/:muscle", requireValidTokenAndUser, async (req, res) => {
    try {
        const exercises = await ExerciseAPI.getAllExercisesForMuscle(req.params.muscle);
        res.json(exercises);
    } catch (error) {
        console.error("Error fetching all exercises:", error);
        res.status(500).json({ error: "Failed to fetch exercises" });
    }
});

// Nutrition API routes
app.get("/api/nutrition/search", requireValidTokenAndUser, async (req, res) => {
    try {
        const { query, number } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }
        const results = await NutritionAPI.searchFood(query, number || 10);
        res.json(results);
    } catch (error) {
        console.error("Error searching nutrition:", error);
        res.status(500).json({ error: "Failed to search nutrition" });
    }
});

app.get("/api/nutrition/info", requireValidTokenAndUser, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }
        const nutrition = await NutritionAPI.getNutritionInfo(query);
        res.json(nutrition);
    } catch (error) {
        console.error("Error getting nutrition info:", error);
        res.status(500).json({ error: "Failed to get nutrition info" });
    }
});

app.get("/api/nutrition/food/:id", requireValidTokenAndUser, async (req, res) => {
    try {
        const foodInfo = await NutritionAPI.getFoodInformation(req.params.id);
        res.json(foodInfo);
    } catch (error) {
        console.error("Error getting food information:", error);
        res.status(500).json({ error: "Failed to get food information" });
    }
});

//* ********************* Launching the server **************** */

const start = async () => {
    try {
        await connectMongoose();
        // app.listen(port, () => console.log(`Server running on port ${port}...`));
        
        // if (process.env.NODE_ENV === "production") {
        //     app.listen(port, () => {console.log("server running on port: " + port)})
        // } else {
        //     const httpsOptions = {
        //         key: fs.readFileSync(path.resolve(__dirname, '../localhost-key.pem')),
        //         cert: fs.readFileSync(path.resolve(__dirname, '../localhost.pem'))
        //     };
        //     https.createServer(httpsOptions, app).listen(port, () => {
        //         console.log(`Express API server running on https://localhost:${port}`);
        //     });
        // }
        
        // Use HTTP for both development and production
        app.listen(port, () => {
            console.log(`Express API server running on http://localhost:${port}`);
        });
    }
    catch (err) {
        console.error(err);
    }
}

start();