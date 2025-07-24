const { connectMongoose } = require('../connect');
const collectionName = process.env.DB_COLL_NAME;
const { Schema, model } = require('mongoose');

const grocerySchema = new Schema({
  message: String,
  user: String,
  date: Date,
  secret: Boolean
});

class MessageClass {
  static async createNew(message) {
    try {
      const newMessage = await Message.create(message);
      return newMessage;
    }
    catch (e) {
      console.error(e);
      return {_id: -1}
    }
  }
  static async readAll(isSecret) {
    try {
      if (isSecret == "true" || isSecret == true) {
          isSecret = true;
      } else if (isSecret == "false" || isSecret == false) {
          isSecret = false;
      }
      const results = await Message.find({secret: isSecret}).sort({date:-1}).exec();
      return results;
    }
    catch (e) {
      console.error(e);
      return [];
    }
  }
  static async update(messageId, messageUpdate) {
    try {
      const result = await Message.updateOne({_id: messageId}, messageUpdate);
      return result;
    }
    catch (e) {
      console.error(e);
      return {
        modifiedCount: 0,
        acknowledged: false
      }
    }
  }
  static async delete(messageId) {
    try {
      const result = await Message.deleteOne({_id: messageId});
      return result;
    }
    catch (e) {
      console.error(e);
      return {deletedCount: 0};
    }
  }
  static async get(messageId) {
    try {
      const result = await Message.findOne({_id: messageId});
      return result;
    }
    catch (e) {
      console.error(e);
      return null;
    }
  }
}

messageSchema.loadClass(MessageClass);
const Message = model('Message', messageSchema, collectionName);
module.exports = Message;