const model = require('./openAiModel');

const extractSkillsFromText = async (text) => {
  const response = await model.call([
    { role: 'system', content: 'Extract a list of skills from the following resume text. Return only the skills as a comma-separated list.' },
    { role: 'user', content: text }
  ]);
  return response.content.split(',').map((skill) => skill.trim());
};

module.exports = extractSkillsFromText;