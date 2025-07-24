const https = require('https');
const fs = require('fs');
const path = require('path');

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const cors = require("cors");
const express = require("express");
const bcrypt = require("bcrypt");
const { connectMongoose } = require("./connect");
//const User = require("./models/User");
//const Message = require("./models/Message");

const app = express();
const port = process.env.PORT || 3002;

app.use(cors({ origin:"https://localhost:3000", credentials:true }));


const start = async () => {
    try {
        await connectMongoose();

        const httpsOptions = {
            key: fs.readFileSync(path.resolve(__dirname, '../localhost-key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, '../localhost.pem'))
        };
        https.createServer(httpsOptions, app).listen(port, () => {
            console.log(`Express API server running on https://localhost:${port}`);
        });
    } catch (err) {
        console.error(err);
    }
};

start();