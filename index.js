const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const user = require('./routes/user');
const utils = require('./routes/utils');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.SERVER_PORT || 5001;

app.use('/user', user);
app.use('/utils', utils);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch(err => console.error(err));