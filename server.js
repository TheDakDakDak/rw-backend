require('dotenv').config(); //for database connection
const bcrypt = require('bcrypt'); //for password hashing
const { Pool } = require('pg'); //PostgreSQL connection manager
const session = require('express-session'); //for sessions
const path = require('path'); //for path handling
const pgSession = require('connect-pg-simple')(session); //for storing sessions in the database
const express = require('express'); //for express app
const app = express(); //creates an instance of an express app

//Set up database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.LOCAL ? false : { rejectUnauthorized: false } //use SSL only if not in a local environment
});

// ============ MIDDLEWARE ============
//Parses json body of incoming requests
app.use(express.json());

//Configures root folder for static files
app.use(express.static(path.join(__dirname, 'public')));

//Configure session management using PostgreSQL as the session store.
//Stores session data in the session table and attaches req.session to each request.
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session'
  }),
  secret: 'mySuperSecretSessionKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));

// ============ ENDPOINTS ============
//Session management
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/api/getUserInfo', async (req, res) => {
  console.log("GET /api/getUserInfo called");
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const result = await db.query(
      'SELECT username, email FROM users WHERE id = $1',
      [req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in /api/getUserInfo:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Testing to ensure backend is running. Unimportant for app functionality.
//app.get('/', (req, res) => {
//  res.send('Workout Tracker Backend is running!');
//});

//Gets today's workout and creates an empty workout if none exist
app.get('/api/getWorkout', async (req, res) => {
  const userId = req.session.user?.id; //get user from the session
  const date = req.query.date; //get the date from the query

  if (!userId || !date) { //If no date or user, throw error.
    return res.status(400).json({ message: 'Missing user or date' });
  }

  try { //check if theres an existing id for a specific user and date from the database
    const workoutResult = await db.query(
      'SELECT id FROM workouts WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (workoutResult.rows.length === 0) { //if no existing workout for the day, create an empty one
      return res.json({ workout: [] });
    }

    const workoutId = workoutResult.rows[0].id; //assign the existing workout id to workoutId
    const setsResult = await db.query( //get all exercises with matching workoutId
      `SELECT sets.id, exercise_id, weight, reps, set_order, name as exercise
       FROM sets
       JOIN exercises ON sets.exercise_id = exercises.id
       WHERE workout_id = $1
       ORDER BY exercise_id, set_order`,
      [workoutId]
    );

    // Rebuild into frontend shape
    const grouped = {};
    for (const row of setsResult.rows) {
      if (!grouped[row.exercise]) {
        grouped[row.exercise] = { exercise: row.exercise, sets: [] };
      }
      grouped[row.exercise].sets.push({ id: row.id, weight: row.weight, reps: row.reps });
    }

    const workout = Object.values(grouped);
    res.json({ workout });

  } catch (err) {
    console.error('Error fetching workout:', err);
    res.status(500).json({ message: 'Failed to fetch workout' });
  }
});

//Signup functionality
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body; //gets username, password, email from request

  if (!username || !email || !password) { //checks that all three were sent
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await db.query( //checks to see if any matching usernames or passwords are in database
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) { //if username or password already exists, notify user
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds); //hash password before insertion

    const result = await db.query( //if unique username and password, insert new user into database
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: 'Signup successful', userId: result.rows[0].id });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
	const {email, password} = req.body;
	
	try {
		const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
		if (result.rows.length == 0) {
			return res.status(401).json({message: 'Email not found'});
		}
		const user = result.rows[0];
		const match = await bcrypt.compare(password, user.password);
		
		if(!match) {
			return res.status(401).json({message: 'Incorrect Password'});
		}
		req.session.user = {id:user.id,email:user.email,username:user.username};
		res.status(200).json({message: 'Login Successful!', username: user.username});
		} catch (err) {
		  console.error('Login error:', err);
          res.status(500).json({ message: 'Internal server error' });
		}
	});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }

    // Clear the session cookie on the client
    res.clearCookie('connect.sid'); // This is the default session cookie name
    res.json({ message: 'Logged out successfully' });
  });
});

app.post('/api/updateUsername', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { newUsername } = req.body;

  if (newUsername) {
      await db.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, req.session.user.id]);
	  res.status(200).json({ message: 'Username updated successfully' });
  }
  else {
	  return res.json({message: 'An error occurred'});
  }
});

app.post('/api/updateEmail', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { newEmail } = req.body;
  if (newEmail) {
      await db.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, req.session.user.id]);
	  res.status(200).json({ message: 'Email updated successfully' });
  }
  else {
	  return res.json({message: 'An error occurred'});
  }
});

app.post('/api/updatePassword', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body;


  const result = await db.query('SELECT password FROM users WHERE id = $1', [req.session.user.id]);
  const hashedPassword = result.rows[0].password;

  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword, hashedPassword);
    if (!valid) {
      return res.status(403).json({ message: 'Current password incorrect. Nothing updated' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [newHashedPassword, req.session.user.id]);
  }
  else {
	  return res.status(500).json({ message: 'Failed to update password'});
  }

  res.status(200).json({ message: 'User info updated successfully' });

});



app.post('/api/saveWorkout', async (req, res) => {
  const { date, workout } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !date || !Array.isArray(workout)) {
    return res.status(400).json({ message: 'Invalid request data or user not logged in' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Find or create the workout
    const existing = await client.query(
      'SELECT id FROM workouts WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    let workoutId;
    if (existing.rows.length > 0) {
      workoutId = existing.rows[0].id;
    } else {
      const result = await client.query(
        'INSERT INTO workouts (user_id, date) VALUES ($1, $2) RETURNING id',
        [userId, date]
      );
      workoutId = result.rows[0].id;
    }

    // Step 2: Save sets for each exercise
    for (const entry of workout) {
      const { exercise_id, sets } = entry;
      if (!exercise_id) continue;

      for (let i = 0; i < sets.length; i++) {
        const { weight, reps } = sets[i];
        await client.query(
          `INSERT INTO sets (workout_id, exercise_id, weight, reps, set_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [workoutId, exercise_id, weight, reps, i + 1]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Workout saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving workout:', err);
    res.status(500).json({ message: 'Failed to save workout' });
  } finally {
    client.release();
  }
});

app.delete('/api/deleteSet/:id', async (req, res) => {
  const userId = req.session.user?.id;
  const setId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  try {
    const result = await db.query(`
      DELETE FROM sets 
      WHERE id = $1 
      AND workout_id IN (
        SELECT id FROM workouts WHERE user_id = $2
      )
    `, [setId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Set not found or not authorized' });
    }

    res.json({ message: 'Set deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Failed to delete set' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});