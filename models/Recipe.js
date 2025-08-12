const { connectMongoose } = require('../connect');
const collectionName = "savedRecipes";
const { Schema, model } = require('mongoose');

const recipeSchema = new Schema({
    ownerId: String,
    recipeId: Number,
    // name: String, //would be useful, but not sure how to implement getting it rn in the frontend code
});

class RecipeClass {
    static async addRecipe(item) {
        try {
            //UPSERT: replace item if it exists, otherwise add new
            return await Recipe.findOneAndUpdate(
                { recipeId: item.recipeId, ownerId: item.ownerId },
                { $set: item },
                { new: true, upsert: true }
            );
        }
        catch (e) {
            console.error(e);
            return { _id: -1 }
        }
    }
    static async get(recipe) {
        try {
            const result = await Recipe.findOne({ ownerId: recipe.ownerId, recipeId: recipe.recipeId });
            return result;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    static async getRecipes(userId) { //we dont need a param bc the mediator checks for valid token
        try {
            const results = await Recipe.find({ ownerId: userId }).sort({ category: 1 }).exec();
            return results;
        }
        catch (e) {
            console.error(e);
            return [];
        }
    }
    static async deleteRecipe(recipe) {
        try {
            const result = await Recipe.deleteOne({ ownerId: recipe.ownerId, recipeId: recipe.recipeId });
            return result;
        }
        catch (e) {
            console.error(e);
            return { deletedCount: 0 };
        }
    }
}

recipeSchema.loadClass(RecipeClass);
const Recipe = model('Recipe', recipeSchema, collectionName);
module.exports = Recipe;