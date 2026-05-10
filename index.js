const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Website is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});