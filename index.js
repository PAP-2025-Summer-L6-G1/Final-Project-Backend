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
const User = require("./models/User");
const Grocery = require("./models/Grocery");
const Recipe = require("./models/Recipe")
const Budget = require("./models/Budget")

app.use(
    cors({
        origin: ["https://localhost:5173", "https://cfa-summer2025-grocerybuddy-www.netlify.app"],
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
                    { username: newUser.username },
                    process.env.JWT_SECRET, //look at later?
                    { expiresIn: "7d" }
                );
                res.cookie("token", token, {
                    httpOnly: true,
                    sameSite: "None",
                    secure: true,
                });
                res.status(201).json({userId: results._id});
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
                        sameSite: "None",
                        secure: true,
                    });
                    res.status(200).json({userId: existingUser._id});
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

// Update an existing item with item id req.params.itemId by specified field.
// Body json:
// {
//     fieldName: newVal
// }
app.patch("/grocery/:itemId", requireValidTokenAndUser, async (req, res) => {
    const updateField = req.body;

    const results = await Grocery.findByIdAndUpdate(req.params.itemId, updateField, {new: true});

    res.sendStatus(200);

   console.log(`PATCH request received on grocery itemId ${req.params.itemId} route`);
});

// Delete an existing item
// Body json:
// {
//     "_id": String
// }
app.delete("/grocery/:itemId", requireValidTokenAndUser, async (req, res) => {
    const results = await Grocery.delete(req.params.itemId);
    res.sendStatus(200);

    console.log("DELETE request received on message route");
    // console.log(`User ${req.params.id}'s item with id ${req.body} deleted`);
});
//* ********************* Budget Tracker **************** */

// Add a new grocery item.
// Body json:
// {
//     "ownerId": String,
//     "name": String,
//     "price": String,
//     "date": Date,
//     "category": String
// }
app.post("/budget/", requireValidTokenAndUser, async (req, res) => {
    // console.log("PRINTING REQ BODY:", req.body);
    const newItem = req.body;
    const results = await Budget.addItem(newItem);
    res.sendStatus(201);
    
    console.log("POST request received on budget route");
});

// Get budget items from a user
app.get("/budget/:userId", requireValidTokenAndUser, async (req, res) => {
    const results = await Budget.readAll(req.params.userId);
    // console.log("PRINTING RESULTS:", results);
    res.send(results); //separation of item categories must be implemented 

    console.log("GET request received on budget page");
});

// // Update an existing item's name or quantity.
// // Body json:
// // {
// //     "ownerId": String,
// //     "name": String,
// //     "price": String,
// //     "date": Date,
// //     "category": String
// // }
// app.patch("/budget/", requireValidTokenAndUser, async (req, res) => {
//     const itemUpdate = req.body;
//     const results = await Budget.updateItem(itemUpdate); //does not yet exist

//     res.sendStatus(200);

//     console.log("PATCH request received on budget route");
// });

// Delete an existing item
// Body json:
// {
//     "_id": String
// }
app.delete("/budget/", requireValidTokenAndUser, async (req, res) => {
    const results = await Budget.delete(req.body);
    res.sendStatus(200);

    console.log("DELETE request received on budget route");
    // // console.log(`User ${req.params.id}'s item with id ${req.body} deleted`);
});

//* ********************* Storage Operations **************** */

// Get grocery list items from a user


// app.get("/inventory/:userId", /*requireValidTokenAndUser,*/ async (req, res) => {
//     //const storageType = req.query.storageType || "bag"; 
//     //const results = await Grocery.readType(req.params.userId, storageType, true);
//     const results = await Grocery.readAll(req.params.userId);
//     console.log("PRINTING RESULTS:", results);
//     res.send(results); //separation of item categories must be implemented 

//     console.log("GET request received on grocery page");
// });

app.get("/inventory/", /*requireValidTokenAndUser,*/ async (req, res) => {
    //const itemUpdate = req.body;
    const results = await Grocery.test();
    res.send(results);

    console.log("PATCH request received on message route");
    console.log(results);
});

//* ********************* Storage Operations **************** */


//* ********************* Recipe **************** */

// Search a recipe by keyword and ingredients
// req body = {
//     "query": String,
//     "ingreds": List of strings
// }
app.post("/recipe/search", async (req, res) => {
    //TODO
    // const token = process.env.ACCESS_TOKEN;
    // if (!token) {
    //     return res.status(500).json({ error: "No ACCESS_TOKEN env var set." });
    // }

    // prevents undefined
    const { query = "", ingreds = [] } = req.body;

    // Join the array into a comma-separated list, trimming just in case, because API wants ingreds formated as tomato,cheese
    const includeIngredients = ingreds
        .map(i => i.trim())
        .filter(i => i)       // remove any empty strings
        .join(",");

    console.log("QUERY:", query)//
    console.log("INGREDS:", ingreds)//

    // Build URL params with URLSearchParams for safe encoding
    const params = new URLSearchParams({
        apiKey: process.env.SPOONACULAR_KEY,
        addRecipeInformation: "true",
        number: "10",
    });
    if (query) params.append("query", query);
    if (includeIngredients) params.append("includeIngredients", includeIngredients);

    const endpoint = `https://api.spoonacular.com/recipes/complexSearch?${params}`;

    try {
        const resp = await fetch(endpoint);
        const data = await resp.json();
        return res.status(resp.status).json(data);
    } catch (err) {
        return res.status(502).json({ error: err.message });
    }
});

// Save a recipe
app.post('/recipe/save', async (req, res) => {
    //TODO
    // const token = process.env.ACCESS_TOKEN;
    // if (!token) {
    //     return res.status(500).json({ error: "No ACCESS_TOKEN env var set." });
    // }

    const recipe = req.body;
    const results = await Recipe.addRecipe(recipe);

    res.status(200).json(results);

    console.log("POST request received on recipe route");
})

// Check if a recipe is saved
app.get('/recipe/check', async (req, res) => {
    //TODO
    // const token = process.env.ACCESS_TOKEN;
    // if (!token) {
    //     return res.status(500).json({ error: "No ACCESS_TOKEN env var set." });
    // }

    const recipe = req.body;
    const results = await Recipe.get(recipe);

    res.status(200).json(results.json());

    console.log("GET request received on recipe route");
})

// Delete a saved recipe
app.get('/recipe/search/', async (req, res) => {
    const zip = req.query.zip;
    // const token = process.env.ACCESS_TOKEN;
    if (!token) {
        return res.status(500).json({ error: "No ACCESS_TOKEN env var set." });
    }

    const apiUrl =
        "https://api-ce.kroger.com/v1/locations?filter.zipCode.near=";

    try {
        const resp = await fetch(apiUrl + zip, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await resp.json();
        console.log(data);//

        return res.status(resp.status).json(data);
    } catch (err) {
        return res.status(502).json({ error: err.message });
    }
})

// Show saved recipes
app.get('/recipe/search/', async (req, res) => {
    const zip = req.query.zip;
    // const token = process.env.ACCESS_TOKEN;
    if (!token) {
        return res.status(500).json({ error: "No ACCESS_TOKEN env var set." });
    }

    const apiUrl =
        "https://api-ce.kroger.com/v1/locations?filter.zipCode.near=";

    try {
        const resp = await fetch(apiUrl + zip, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await resp.json();
        console.log(data);//

        return res.status(resp.status).json(data);
    } catch (err) {
        return res.status(502).json({ error: err.message });
    }
})

//* ********************* Launching the server **************** */

const start = async () => {
    try {
        await connectMongoose();
        // app.listen(port, () => console.log(`Server running on port ${port}...`));
        
        if (process.env.NODE_ENV === "production") {
            app.listen(port, () => {console.log("server running on port: " + port)})
        } else {
            const httpsOptions = {
                key: fs.readFileSync(path.resolve(__dirname, '../localhost-key.pem')),
                cert: fs.readFileSync(path.resolve(__dirname, '../localhost.pem'))
            };
            https.createServer(httpsOptions, app).listen(port, () => {
                console.log(`Express API server running on https://localhost:${port}`);
            });
        }
    }
    catch (err) {
        console.error(err);
    }
}

start();