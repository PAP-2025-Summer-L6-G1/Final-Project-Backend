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