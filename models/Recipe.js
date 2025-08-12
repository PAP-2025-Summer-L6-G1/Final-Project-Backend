const { connectMongoose } = require('../connect');
const collectionName = "savedRecipes";
const { Schema, model } = require('mongoose');

const recipeSchema = new Schema({
  ownerId: String,
  name: String,
  quantity: Number,
  category: String,
  isBought: Boolean
});

class RecipeClass {
  static async addRecipe(item) {
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
  static async getRecipes(userId) { //we dont need a param bc the mediator checks for valid token
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
  static async deleteRecipe(item) {
    try {
      const result = await Grocery.deleteOne({_id: item._id});
      return result;
    }
    catch (e) {
      console.error(e);
      return {deletedCount: 0};
    }
  }
}

recipeSchema.loadClass(RecipeClass);
const Recipe = model('Recipe', recipeSchema, collectionName);
module.exports = Recipe;