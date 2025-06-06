const express = require("express");
const path = require("path");
const app = express();

const apiV1Routes = require("./routes/apiV1");
const requestLogger = require("./middleware/requestLogger");

app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply request logging middleware
app.use(requestLogger);

app.use("/api/v1", apiV1Routes);

module.exports = app;
