const { connectMongoose } = require('../connect');
const collectionName = process.env.DB_COLL_BUDGETS;
const { Schema, model } = require('mongoose');

const budgetSchema = new Schema({ //one budget item
    ownerId: String,
    name: String,
    price: Number,
    date: Date,
    category: String
});

class BudgetClass {
  static async addOrUpdateItem(item) {
    try {
      //UPSERT: replace item if it exists, otherwise add new
      return await Budget.findOneAndUpdate(
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
  static async readAll(userId) { //we dont need a param bc the mediator checks for valid token
    try {
      const results = await Budget.find({ownerId: userId}).exec();
      return results;
    }
    catch (e) {
      console.error(e);
      return [];
    }
  }
  static async delete(item) {
    try {
      const result = await Budget.deleteOne({_id: item._id});
      return result;
    }
    catch (e) {
      console.error(e);
      return {deletedCount: 0};
    }
  }
  static async get(itemId) {
    try {
      const result = await Budget.findOne({_id: itemId});
      return result;
    }
    catch (e) {
      console.error(e);
      return null;
    }
  }
}

budgetSchema.loadClass(BudgetClass);
const Budget = model('Budget', budgetSchema, collectionName);
module.exports = Budget;