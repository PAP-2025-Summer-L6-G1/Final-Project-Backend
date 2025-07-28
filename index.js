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

app.use(
    cors({
        origin: ["https://localhost:3002"],
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
                        sameSite: "None",
                        secure: true,
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

// Add a new grocery item
app.post("/grocery/:id", requireValidTokenAndUser, async (req, res) => {
    const newItem = req.body;
    const results = await Grocery.createNew(newItem);
    res.sendStatus(201);

    console.log("POST request received on grocery route");
    console.log(`New item created with id: ${results.ownerId}`); //does this work?
});

// Get grocery list items
app.get("/grocery/:id", requireValidTokenAndUser, async (req, res) => {
    const results = await Grocery.readAll(req.params.id);
    res.send(results); //separation of item categories must be implemented 

    console.log("GET request received on grocery page");
});

// Update an existing item's name or quantity
app.patch("/grocery/:id", requireMatchingAuthorOrNoUser, async (req, res) => {
    const itemUpdate = req.body;
    const results = await Grocery.update(req.params.id, itemUpdate);

    res.sendStatus(200);

    console.log("PATCH request received on message route");
    console.log(`Message with id ${req.params.id} updated`);
});

// Delete an existing item
app.delete("/grocery/:id", requireValidTokenAndUser, async (req, res) => {
    const results = await Message.delete(req.params.id, req.body); //userid, itemid
    res.sendStatus(200);

    console.log("DELETE request received on message route");
    console.log(`User ${req.params.id}'s item with id ${req.body} deleted`);
});

//* ********************* Launching the server **************** */

const start = async () => {
    try {
        await connectMongoose();
        app.listen(port, () => console.log(`Server running on port ${port}...`));
    }
    catch (err) {
        console.error(err);
    }
}

start();