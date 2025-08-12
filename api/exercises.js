const https = require('https');

const API_NINJAS_KEY = 'qNOHQWdP6MIj/SQQM9QTHQ==ElFlaxln4KbI3qvC';
const API_NINJAS_BASE_URL = 'https://api.api-ninjas.com/v1/exercises';

class ExerciseAPI {
  static async fetchExercises(params = {}) {
    return new Promise((resolve, reject) => {
      const queryParams = new URLSearchParams();
      
      // Add parameters if provided
      if (params.name) queryParams.append('name', params.name);
      if (params.type) queryParams.append('type', params.type);
      if (params.muscle) queryParams.append('muscle', params.muscle);
      if (params.difficulty) queryParams.append('difficulty', params.difficulty);
      if (params.offset) queryParams.append('offset', params.offset);

      const url = `${API_NINJAS_BASE_URL}?${queryParams.toString()}`;
      
      const options = {
        method: 'GET',
        headers: {
          'X-Api-Key': API_NINJAS_KEY,
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
            const exercises = JSON.parse(data);
            resolve(exercises);
          } catch (error) {
            reject(new Error('Failed to parse exercise data'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  static async getExercisesByMuscle(muscle, difficulty = null) {
    const params = { muscle };
    if (difficulty) params.difficulty = difficulty;
    return this.fetchExercises(params);
  }

  static async getExercisesByType(type, muscle = null) {
    const params = { type };
    if (muscle) params.muscle = muscle;
    return this.fetchExercises(params);
  }

  static async searchExercisesByName(name) {
    return this.fetchExercises({ name });
  }

  static async getAllExercisesForMuscle(muscle) {
    return new Promise((resolve, reject) => {
      const url = `https://api.api-ninjas.com/v1/allexercises?muscle=${muscle}`;
      
      const options = {
        method: 'GET',
        headers: {
          'X-Api-Key': API_NINJAS_KEY,
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
            const exercises = JSON.parse(data);
            resolve(exercises);
          } catch (error) {
            reject(new Error('Failed to parse exercise data'));
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

module.exports = ExerciseAPI; 