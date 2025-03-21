const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Assuming 'User' model is already created
            required: true,
        },
        resumeFileName: {
            type: String,
            required: true,
        },
    }
);

module.exports = mongoose.model('Resume', ResumeSchema, 'Resume');