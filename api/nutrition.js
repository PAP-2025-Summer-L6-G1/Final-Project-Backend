const https = require('https');

const SPOONACULAR_KEY = '765f22dbfc5647aaabbb7b4f04bd006b';
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/food-api';

class NutritionAPI {
  static async searchFood(query, number = 10) {
    return new Promise((resolve, reject) => {
      const url = `https://api.spoonacular.com/food/products/search?query=${encodeURIComponent(query)}&number=${number}&apiKey=${SPOONACULAR_KEY}`;
      
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const results = JSON.parse(data);
            resolve(results);
          } catch (error) {
            reject(new Error('Failed to parse nutrition data'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  static async getFoodInformation(id) {
    return new Promise((resolve, reject) => {
      const url = `https://api.spoonacular.com/food/products/${id}?apiKey=${SPOONACULAR_KEY}`;
      
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const foodInfo = JSON.parse(data);
            resolve(foodInfo);
          } catch (error) {
            reject(new Error('Failed to parse food information'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  static async getNutritionInfo(query) {
    return new Promise((resolve, reject) => {
      const url = `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(query)}&number=1&apiKey=${SPOONACULAR_KEY}`;
      
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const results = JSON.parse(data);
            if (results.results && results.results.length > 0) {
              // Get detailed nutrition info for the first result
              this.getIngredientNutrition(results.results[0].id)
                .then(nutrition => resolve(nutrition))
                .catch(error => reject(error));
            } else {
              resolve(null);
            }
          } catch (error) {
            reject(new Error('Failed to parse nutrition search results'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  static async getIngredientNutrition(id, amount = 100, unit = 'grams') {
    return new Promise((resolve, reject) => {
      const url = `https://api.spoonacular.com/food/ingredients/${id}/information?amount=${amount}&unit=${unit}&apiKey=${SPOONACULAR_KEY}`;
      
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const nutrition = JSON.parse(data);
            resolve(nutrition);
          } catch (error) {
            reject(new Error('Failed to parse ingredient nutrition'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  static async getRecipeNutrition(recipeId) {
    return new Promise((resolve, reject) => {
      const url = `https://api.spoonacular.com/recipes/${recipeId}/nutritionWidget.json?apiKey=${SPOONACULAR_KEY}`;
      
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const nutrition = JSON.parse(data);
            resolve(nutrition);
          } catch (error) {
            reject(new Error('Failed to parse recipe nutrition'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }
}

module.exports = NutritionAPI; 