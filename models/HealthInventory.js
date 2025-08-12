const { connectMongoose } = require('../connect');
const collectionName = process.env.DB_COLL_HEALTH_INVENTORY || 'health_inventory';
const { Schema, model } = require('mongoose');

const healthInventorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['weight', 'blood_pressure', 'meal', 'workout'],
    required: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  unit: {
    type: String,
    required: function() {
      // Only require unit for weight and blood_pressure entries
      return this.type === 'weight' || this.type === 'blood_pressure';
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  // Additional fields for specific types
  // For blood pressure
  systolic: Number,
  diastolic: Number,
  // For meals
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack']
  },
  calories: Number,
  nutrition: {
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  // For workouts
  workoutType: {
    type: String,
    enum: ['cardio', 'strength', 'flexibility', 'sports']
  },
  duration: Number, // in minutes
  exercises: [{
    name: String,
    sets: Number,
    reps: Number,
    weight: Number,
    duration: Number
  }]
}, {
  timestamps: true
});

// Index for efficient queries
healthInventorySchema.index({ userId: 1, type: 1, date: -1 });

class HealthInventoryClass {
  static async createEntry(entryData) {
    try {
      const newEntry = await HealthInventory.create(entryData);
      return newEntry;
    } catch (e) {
      console.error('Error creating health entry:', e);
      throw e;
    }
  }

  static async getUserEntries(userId, type = null, limit = 50) {
    try {
      const query = { userId };
      if (type) {
        query.type = type;
      }
      
      const entries = await HealthInventory.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .exec();
      
      return entries;
    } catch (e) {
      console.error('Error fetching user entries:', e);
      throw e;
    }
  }

  static async updateEntry(entryId, userId, updateData) {
    try {
      const updatedEntry = await HealthInventory.findOneAndUpdate(
        { _id: entryId, userId },
        updateData,
        { new: true, runValidators: true }
      );
      return updatedEntry;
    } catch (e) {
      console.error('Error updating health entry:', e);
      throw e;
    }
  }

  static async deleteEntry(entryId, userId) {
    try {
      const deletedEntry = await HealthInventory.findOneAndDelete({
        _id: entryId,
        userId
      });
      return deletedEntry;
    } catch (e) {
      console.error('Error deleting health entry:', e);
      throw e;
    }
  }

  static async getEntryById(entryId, userId) {
    try {
      const entry = await HealthInventory.findOne({
        _id: entryId,
        userId
      }).exec();
      return entry;
    } catch (e) {
      console.error('Error fetching entry by ID:', e);
      throw e;
    }
  }
}

healthInventorySchema.loadClass(HealthInventoryClass);
const HealthInventory = model('HealthInventory', healthInventorySchema, collectionName);
module.exports = HealthInventory; 