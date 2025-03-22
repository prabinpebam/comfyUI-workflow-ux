const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the docs directory
app.use(express.static(path.join(__dirname, 'docs')));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});