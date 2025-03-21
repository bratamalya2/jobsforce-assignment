const { GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = require('./s3Client');

const getFileFromS3 = async (fileName) => {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `resumes/${fileName}`,
    };

    const command = new GetObjectCommand(params);
    const { Body } = await s3.send(command);

    // Convert stream to buffer
    const streamToBuffer = async (stream) => {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    };

    return streamToBuffer(Body);
};

module.exports = getFileFromS3;