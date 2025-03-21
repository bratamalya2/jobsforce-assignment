const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Get API Key from OpenAI
});

const generateEmbeddings = async (skills) => {
    const text = skills.join(' ');
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
    });
    return response.data[0].embedding; // Extract embedding vector
};

module.exports = generateEmbeddings;