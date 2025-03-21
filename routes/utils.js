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
const getMatchingJobs = require('../utils/getMatchingJobs');

const User = require('../models/User');
const Resume = require('../models/Resume');

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
        const apiResponse = await axios.get('https://remotive.io/api/remote-jobs');
        const jobs = apiResponse.data.jobs;
        const matchingJobs = getMatchingJobs(jobs, skills);
        res.status(200).json({
            success: true,
            matchingJobs
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