const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Workout Tracker Backend is running!');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Frontend and backend are connected!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});