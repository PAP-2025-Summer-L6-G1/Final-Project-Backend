const { connectMongoose } = require('../connect');
const collectionName = process.env.DB_GROCERY_LIST;
const { Schema, model } = require('mongoose');

const grocerySchema = new Schema({ //one grocery item
  ownerId: String,
  name: String,
  quantity: Number,
  category: String,
  isBought: Boolean,
  storageType: String
});

class GroceryClass {
  static async addOrUpdateItem(item) {
    try {
      //UPSERT: replace item if it exists, otherwise add new
      return await Grocery.findOneAndUpdate(
        { ownerId: item.ownerId, name: item.name },
        { $set: item },
        { new: true, upsert: true }
      );
    }
    catch (e) {
      console.error(e);
      return {_id: -1}
    }
  }

  //This should be subbed by readType. If this is for the grocerylist, make your find by userId, set type to "bag" and isBought to false.
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

  static async test() {
    try {
      const results = await Grocery.find({}).sort({category:1}).exec();
      //make results lists of dairy,meat,grain?
      return results;
    }
    catch (e) {
      console.error(e);
      return [];
    }
  }

   static async readType(userId, type, isBought) { //This is for the storage page, if you want to make modifications, let Nick know
    try {
      console.log("type:", type);
      console.log("isBought:", isBought);
      console.log("userId:", userId);
      const results = await Grocery.find({ownerId: userId, storageType: type, isBought: isBought}).sort({category:1}).exec();
      //make results lists of dairy,meat,grain?
      return results;
    }
    catch (e) {
      console.error(e);
      return [];
    }
  }
  // static async update(itemUpdate) {
  //   try {
  //     const result = await Grocery.updateOne({ownerId: itemUpdate.ownerId, _id: itemUpdate._id}, itemUpdate);
  //     return result;
  //   }
  //   catch (e) {
  //     console.error(e);
  //     return {
  //       modifiedCount: 0,
  //       acknowledged: false
  //     }
  //   }
  // }
  static async delete(itemId) {
    try {
      const result = await Grocery.deleteOne({_id: itemId});
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