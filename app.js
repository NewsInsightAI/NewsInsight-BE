const express = require("express");
const path = require("path");
const app = express();

const apiV1Routes = require("./routes/apiV1");
const requestLogger = require("./middleware/requestLogger");
const { trackVisitor } = require("./middleware/visitorTracking");

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(requestLogger);

// Track visitor activity for analytics
app.use(trackVisitor);

app.use("/api/v1", apiV1Routes);

module.exports = app;
