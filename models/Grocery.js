const { connectMongoose } = require('../connect');
const collectionName = process.env.DB_COLL_NAME;
const { Schema, model } = require('mongoose');

const grocerySchema = new Schema({ //one grocery item
  ownerId: String,
  name: String,
  quantity: Number,
  category: String,
  isBought: Boolean
});

class GroceryClass {
  static async addNew(item) {
    try {
      const newItem = await Grocery.create(item);
      return newItem;
    }
    catch (e) {
      console.error(e);
      return {_id: -1}
    }
  }
  static async readAll(userId) { //we dont need a param bc the mediator checks for valid token
    try {
      const results = await Grocery.find({ownerId: userId}).sort({category:1}).exec();
      //make results lists of dairy,meat,grain?
      return results;
    }
    catch (e) {
      console.error(e);
      return [];
    }
  }
  static async update(userId, itemUpdate) {
    try {
      const result = await Grocery.updateOne({_id: userId}, itemUpdate);
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
  static async delete(userId, itemId) {
    try {
      const result = await Grocery.deleteOne({ownerId: userId, _id: itemId});
      return result;
    }
    catch (e) {
      console.error(e);
      return {deletedCount: 0};
    }
  }
  static async get(messageId) {
    try {
      const result = await Grocery.findOne({_id: messageId});
      return result;
    }
    catch (e) {
      console.error(e);
      return null;
    }
  }
}

grocerySchema.loadClass(GroceryClass);
const Grocery = model('Grocery', grocerySchema, collectionName);
module.exports = Grocery;