require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');

const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
});

module.exports = model;