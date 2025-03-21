const cosineSimilarity = require('./cosineSimilarity');

function getMatchingJobs(jobs, userSkills) {
    // Collect all unique skills across all jobs
    const uniqueSkills = [...new Set(jobs.flatMap(job => job.tags).concat(userSkills))];

    // Convert user skills to a binary vector
    const userVector = uniqueSkills.map(skill => userSkills.includes(skill) ? 1 : 0);

    // Compute similarity scores for each job
    const scoredJobs = jobs.map(job => {
        const jobVector = uniqueSkills.map(skill => job.tags.includes(skill) ? 1 : 0);
        return {
            ...job,
            similarity: cosineSimilarity(userVector, jobVector)
        };
    });

    // Sort jobs by similarity in descending order
    return scoredJobs.sort((a, b) => b.similarity - a.similarity);
}

module.exports = getMatchingJobs;