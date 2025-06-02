const express = require("express");
const app = express();

const apiV1Routes = require("./routes/apiV1");

app.use(express.json());

app.use("/api/v1", apiV1Routes);

module.exports = app;
