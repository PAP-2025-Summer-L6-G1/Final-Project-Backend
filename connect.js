const mongoose = require('mongoose');
require('dotenv').config();
const atlasMongooseURI = process.env.MONGOOSE_CONN;
const connectOptions = {
    dbName: process.env.DB_NAME
};

let mongooseConnection = null;

async function connectMongoose() {
    try {
        await mongoose.connect(atlasMongooseURI, connectOptions);

        mongooseConnection = mongoose.connection;
        mongooseConnection.on('error', (e)=>console.error(e));
        mongooseConnection.on('SIGINT', ()=>autoDisconnect(mongooseConnection, 'app'));
        mongooseConnection.on('SIGHUP', ()=>autoDisconnect(mongooseConnection, 'terminal'));
        mongooseConnection.on('SIGTERM', ()=>autoDisconnect(mongooseConnection, 'system'));
        console.log("Connected to database.")
    }
    catch (e) {
        console.error(e);
        if (mongooseConnection !== null) {
            mongooseConnection.close(()=>autoDisconnect(mongooseConnection, 'error-based'));
            mongooseConnection = null;
        }
    }

    function autoDisconnect(mongooseConnection, reason) {
        mongooseConnection.close(() => {
            console.log(`Mongoose connection closed through ${reason} termination`);
        });
    }
}

module.exports = { connectMongoose };