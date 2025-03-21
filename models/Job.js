const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true }, // Unique numeric ID
    tags: [String], // Job skills
    skillVector: [Number], // Vector representation
});

module.exports = mongoose.model('Job', jobSchema, 'Job');