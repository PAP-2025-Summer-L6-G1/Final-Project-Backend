const { connectMongoose } = require('../connect');
const collectionName = process.env.DB_COLL_USERS;
const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  username: String,
  password: String,
});

class UserClass {
  static async signup(user) {
    try {
      const newUser = await User.create(user);
      return newUser;
    }
    catch (e) {
      console.error(e);
      return {_id: -1}
    }
  }
  static async exists(username) {
    try {
      const existingUser = await User.findOne({username}).exec();
      return existingUser !== null;
    }
    catch (e) {
      console.error(e);
      return false;
    }
  }
}

userSchema.loadClass(UserClass);
const User = model('User', userSchema, collectionName);
module.exports = User;