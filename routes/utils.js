const express = require('express');
const multer = require('multer');
const { query, validationResult } = require('express-validator');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
require('dotenv').config();

const isAuthenticated = require('../utils/isAuthenticated');
const s3 = require('../utils/s3Client');
const extractSkillsFromText = require('../utils/extractSkillsFromText');
const getResumeFromS3 = require('../utils/getResumeFromS3');
const generateEmbeddings = require('../utils/generateEmbeddings');

const User = require('../models/User');
const Resume = require('../models/Resume');
const Job = require('../models/Job');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.mimetype)) {
            console.log('Improper file type!');
            return cb(new Error('Only .pdf and .docx files are allowed'));
        }
        cb(null, true);
    },
});

router.post('/fetchAllJobs', async (req, res) => {
    try {
        const apiResponse = await axios.get('https://remotive.io/api/remote-jobs');
        const availableJobs = apiResponse.data.jobs.filter((x, i) => i < 150);

        const jobs = [];

        for (let i = 0; i < availableJobs.length; i++) {
            const skillVector = await generateEmbeddings(availableJobs[i].tags);
            const job = {
                id: availableJobs[i].id,
                tags: availableJobs[i].tags,
                skillVector
            };
            jobs.push(job);
        }

        await Job.insertMany(jobs);

        res.status(200).json({
            success: true
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            err: 'Internal server error!'
        });
    }
});

router.post('/uploadResume', [
    upload.single('resume'),
    isAuthenticated
], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, err: 'No file uploaded!' });
        }

        const fileName = `${Date.now()}-${req.file.originalname}`;
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `resumes/${fileName}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        await s3.send(new PutObjectCommand(uploadParams));

        const currentUser = res.locals.user;

        const user = await User.findOne({ email: currentUser.email });

        const newResume = new Resume({ user, resumeFileName: fileName });
        await newResume.save();

        res.status(200).json({
            success: true
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            err: 'Internal server error!'
        });
    }
});

router.get('/extractSkills', isAuthenticated, async (req, res) => {
    try {
        const currentUser = res.locals.user;

        const user = await User.findOne({ email: currentUser.email });
        const resume = await Resume.findOne({ user });
        if (!resume) return res.status(404).json({ success: false, err: 'Resume not found!' });

        const fileBuffer = await getResumeFromS3(resume.resumeFileName);
        let text = '';

        if (resume.resumeFileName.endsWith('.pdf')) {
            const data = await pdfParse(fileBuffer);
            text = data.text;
        } else if (resume.resumeFileName.endsWith('.docx')) {
            const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
            text = value;
        } else {
            return res.status(400).json({ success: false, err: 'Invalid file format!' });
        }

        const extractedSkills = await extractSkillsFromText(text);
        res.status(200).json({ success: true, skills: extractedSkills });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            err: 'Internal server error!'
        });
    }
});

router.get('/findMatchingJobs', [
    isAuthenticated,
    query('skills')
        .exists().withMessage('Skills parameter is required')
        .bail()
        .custom((value) => {
            const skills = Array.isArray(value) ? value : value.split(',');
            return skills.every(skill => typeof skill === 'string' && skill.trim().length > 0);
        })
        .withMessage('Each skill must be a non-empty string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                err: errors.array()[0].msg
            })
        }
        const skills = Array.isArray(req.query.skills) ? req.query.skills : req.query.skills.split(',');

        const resumeVector = await generateEmbeddings(skills);

        const jobs = await Job.aggregate([
            {
                $vectorSearch: {
                    queryVector: resumeVector,
                    path: 'skillVector',
                    numCandidates: 50,
                    limit: 10,
                    index: 'vector_index', // Ensure MongoDB Atlas has this index
                },
            },
        ]);

        const apiResponse = await axios.get('https://remotive.io/api/remote-jobs');
        const availableJobs = apiResponse.data.jobs.filter((x, i) => i < 150);

        const result = [];

        for (let i = 0; i < jobs.length; i++) {
            for (let j = 0; j < availableJobs.length; j++) {
                if (jobs[i].id === availableJobs[j].id)
                    result.push(availableJobs[j]);
            }
        }

        res.status(200).json({
            success: true,
            jobs: result
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            err: 'Internal server error!'
        });
    }
});

module.exports = router;