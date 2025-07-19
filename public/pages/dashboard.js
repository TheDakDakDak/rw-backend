fetch('/api/session', {
  credentials: 'include'
})
  .then(res => {
    if (!res.ok) {
      throw new Error("Not logged in");
    }
    return res.json();
  })
  .then(data => {
    if (!data || !data.user) {
      throw new Error("No session user found");
    }
    // Optionally: display user info here
    console.log("User is logged in:", data.user.username || data.user.email || data.user.id);
  })
  .catch(err => {
    console.warn("Session check failed:", err);
    alert("You must log in first.");
    window.location.href = "../login";
  });

let selectedDate = new Date();
selectedDate.setHours(12);

let currentWorkout = {
  date: null,
  workout: []
};

let currentExercise = null;

//Object containing keys mapped to lists of corresponding exercises.
const exercisesByPart = {
	chest: ["Bench Press", "Incline Bench Press", "Dumbbell Flyes", "Push-ups"],
	back: ["Pull-ups", "Bent-Over Rows", "Shrugs", "Cable Rows"],
	shoulders: ["Overhead Press", "Lateral Raises", "Front Raises", "Reverse Flyes", "Push Press"],
	biceps: ["Bicep Curls", "Hammer Curls", "Incline Curls", "Concentration Curls"],
	triceps: ["Dips", "Pushdowns", "Overhead Tricep Extensions", "Skullcrushers"],
	forearms: ["Reverse Curls", "Wrist Curls", "Reverse Wrist Curls", "Farmers Walks"],
	legs: ["Squats", "Lunges", "Leg Press", "Leg Extensions", "Leg Curls", "Calf Raises", "Deadlifts"],
	abs: ["Sit-ups", "Crunches", "Hanging Leg Raises", "Lying Leg Raises", "Planks"]
};

const exerciseIdMap = {
  "Bench Press": 1, "Incline Bench Press": 2, "Dumbbell Flyes": 3, "Push-ups": 4,
  "Pull-ups": 5, "Bent-Over Rows": 6, "Shrugs": 7, "Cable Rows": 8,
  "Overhead Press": 9, "Lateral Raises": 10, "Front Raises": 11, "Reverse Flyes": 12, "Push Press": 13,
  "Bicep Curls": 14, "Hammer Curls": 15, "Incline Curls": 16, "Concentration Curls": 17,
  "Dips": 18, "Pushdowns": 19, "Overhead Tricep Extensions": 20, "Skullcrushers": 21,
  "Reverse Curls": 22, "Wrist Curls": 23, "Reverse Wrist Curls": 24, "Farmers Walks": 25,
  "Squats": 26, "Lunges": 27, "Leg Press": 28, "Leg Curls": 29, "Leg Extensions": 30,
  "Calf Raises": 32, "Deadlifts": 33,
  "Sit-ups": 34, "Crunches": 35, "Hanging Leg Raises": 36, "Lying Leg Raises": 37, "Planks": 38
};

let displayTimeoutId;

// ===== EVENT LISTENERS =====
//Shows today's workout information on page load
window.addEventListener("DOMContentLoaded", () => {
  displayTodaysWorkout();
  updateDateDisplay();
});

//Logout button
document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    // Redirect to login page
    window.location.href = '../login';
  } catch (err) {
    alert('Logout failed. Please try again.');
  }
});

//Bring up the muscle group selection menu
document.querySelector('#startWorkoutButton').addEventListener('click', workoutMenu); //Start New Workout button 
document.querySelector('#plussignclass').addEventListener('click', workoutMenu); //Upper right corner plus sign to start an exercise.

//Close (X) buttons
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
    document.querySelector('.modal').style.display = 'none';
    document.querySelector('.modal2').style.display = 'none';
  });
});

//Calendar event listeners
document.querySelector('#calendar').addEventListener('click', () => { //Calendar icon
	document.querySelector('.modal2').style.display = 'flex';
});
document.querySelector('#calendarButton').addEventListener('click', dateSelect); //Date select confirmation in calendar menu.

//Logic for saving a set in the set entry menu
document.querySelector('#saveSet').addEventListener('click', async () => {
  //Get values from input fields
  const reps = document.querySelector('#repsInput').value.trim();
  const weight = document.querySelector('#weightInput').value.trim();

  //Validate weight and reps values
  if (!reps || !weight || !currentExercise) return;
  if (reps <= 0 || weight < 0) {
    showToast("Please enter valid values");
    return;
  }

  //Check if selected exercise already exists in currentWorkout. If it doesn't push the exercise into currentWorkout.
  let exerciseEntry = currentWorkout.workout.find(e => e.exercise === currentExercise);
  if (!exerciseEntry) {
    exerciseEntry = {
      exercise: currentExercise,
      sets: [],
    };
    currentWorkout.workout.push(exerciseEntry);
  }

  //Inserts the set into currentWorkout
  exerciseEntry.sets.push({ reps: Number(reps), weight: Number(weight) });

  //Adds the set to the database (see server.js) for more details.
  try {
    const res = await fetch('/api/saveWorkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        date: currentWorkout.date,
        workout: [{
          exercise: currentExercise,
          exercise_id: exerciseIdMap[currentExercise],
          sets: [{ weight: Number(weight), reps: Number(reps) }]
        }]
      })
    });
    if (!res.ok) {
      throw new Error('Failed to save workout');
	}
  } catch (err) {
    console.error('Failed to send new set:', err);
    // Optionally handle error, e.g., showToast("Save failed, using local data");
  }

  //Rebuild the display once, fetching fresh data from server
  clearTimeout(displayTimeoutId);
  displayTimeoutId = setTimeout(() => {
    displayTodaysWorkout();
  }, 200);
  showToast(`Set Saved!`);
  });

//Event listeners for each item in the muscle group selection buttons
document.querySelectorAll('.body-part').forEach(item => {
	item.addEventListener('click', () => {
		const part = item.dataset.part;
		showExercises(part);
	});
});

//Back buttons
document.querySelector('#backButton').addEventListener('click', () => { //Back button leading from the exercise select menu to the body part select menu
  document.querySelector('#exerciseSelect').style.display = 'none';
  document.querySelector('#bodyPartSelect').style.display = 'block';
});
document.querySelector('#backToExercises').addEventListener('click', () => { //Back button leading from the set entry form to the exercise select menu
  document.querySelector('#repsForm').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'block';
});

//Date arrows
document.getElementById("arrowLeft").addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  updateDateDisplay();
  displayTodaysWorkout();
});
document.getElementById("arrowRight").addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() + 1);
  updateDateDisplay();
  displayTodaysWorkout();
});

// ===== FUNCTIONS =====
//Muscle group selection menu
function workoutMenu() {
  //Sets currentWorkout's date based on where we are in the calendar.
  const dateText = selectedDate.toISOString().split("T")[0];
  currentWorkout.date = dateText;
  
  //Displays only the body part select menu. Hides other forms.
  document.querySelector('#bodyPartSelect').style.display = 'block';
  document.querySelector('#exerciseSelect').style.display = 'none';
  document.querySelector('#repsForm').style.display = 'none';
  document.querySelector('.modal').style.display = 'flex';
}

//Exercise selection menu
function showExercises(part) {
  const exerciseList = document.querySelector('#exerciseList');
  exerciseList.innerHTML = "";

  exercisesByPart[part].forEach(exercise => {
    const li = document.createElement('li');
    li.textContent = exercise;
	li.addEventListener('click', () => {
		openRepsForm(exercise);
	});
    exerciseList.appendChild(li);
  });

  document.querySelector('#bodyPartSelect').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'block';
}

//Set entry menu
function openRepsForm(exerciseName) {
  currentExercise = exerciseName;
  document.querySelector('#exerciseHeading').textContent = exerciseName;
  document.querySelector('#exerciseSelect').style.display = 'none';
  document.querySelector('#repsForm').style.display = 'block';
}

async function displayTodaysWorkout() {
  const container = document.getElementById("exerciseSummaryContainer");
  container.innerHTML = ""; 

  const dateKey = selectedDate.toISOString().split("T")[0];

  try {
    const response = await fetch(`/api/getWorkout?date=${dateKey}`, {
      credentials: 'include'
    });
    const result = await response.json();

    if (!result.workout || result.workout.length === 0) {
      document.querySelector("main").style.display = "flex";
      return;
    }
    currentWorkout.date = dateKey;
    currentWorkout.workout = result.workout.map(e => ({
    exercise: e.exercise,
    sets: [...e.sets]
    }));
  } catch (err) {
    console.error("Failed to fetch workout from DB:", err);
    showToast("Failed to load workout. Please check your connection.");
    document.querySelector("main").style.display = "flex";
    return;
  }

 
  const mainElement = document.querySelector("main");
  if (mainElement) mainElement.style.display = "none";

  
  currentWorkout.workout.forEach(entry => {
    const box = document.createElement("div");
    box.classList.add("exercise-box");

    const headingContainer = document.createElement("div");
	headingContainer.style.display = "flex";
	headingContainer.style.alignItems = "center";
	headingContainer.style.justifyContent = "space-between";

	const heading = document.createElement("h3");
	heading.textContent = entry.exercise;
	heading.style.margin = "0";

	const addSetBtn = document.createElement("button");
	addSetBtn.textContent = "+";
	addSetBtn.style.backgroundColor = "green";
	addSetBtn.style.color = "white";
	addSetBtn.style.border = "none";
	addSetBtn.style.padding = "2px 8px";
	addSetBtn.style.fontSize = "16px";
	addSetBtn.style.borderRadius = "4px";
	addSetBtn.style.cursor = "pointer";
	addSetBtn.title = `Add a new set of ${entry.exercise}.`


	addSetBtn.addEventListener("click", () => {
	currentExercise = entry.exercise;

	// Use the currently selected date, not today's date
	const dateText = selectedDate.toISOString().split("T")[0];
	currentWorkout.date = dateText;

	document.querySelector(".modal").style.display = "flex";

	document.getElementById("bodyPartSelect").style.display = "none";
	document.getElementById("exerciseSelect").style.display = "none";
	document.getElementById("repsForm").style.display = "block";

	document.getElementById("exerciseHeading").textContent = entry.exercise;
	});

	headingContainer.appendChild(heading);
	headingContainer.appendChild(addSetBtn);
	box.appendChild(headingContainer);

    let setCount = 1;

    entry.sets.forEach((set, setIndex) => {
      const p = document.createElement("p");
      p.textContent = `${setCount}: ${set.weight}lbs, ${set.reps} reps`;

      const delBtn = document.createElement("button");
      delBtn.textContent = "-";
      delBtn.style.marginLeft = "8px";
	  delBtn.style.backgroundColor = "red";
	  delBtn.style.color = "white";
	  delBtn.style.border = "none";
	  delBtn.style.padding = "1px 4px";
	  delBtn.style.fontSize = "10px";
	  delBtn.style.lineHeight = "1";
	  delBtn.style.borderRadius = "2px";
	  delBtn.style.cursor = "pointer";
      delBtn.title = "Delete this set";

      delBtn.addEventListener("click", async () => {
  const setId = set.id;

  if (!setId) {
    console.error("No set ID found, cannot delete.");
    return;
  }

  try {
    const res = await fetch(`/api/deleteSet/${setId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Failed to delete set from database');
    }

    showToast("Set deleted!");

    // Refresh display to re-fetch updated workout with correct set ordering
    displayTodaysWorkout();

  } catch (err) {
    console.error("Delete failed:", err);
    showToast("Delete failed");
  }
});

      p.appendChild(delBtn);
      box.appendChild(p);
      setCount++;
    });

    container.appendChild(box); 
  });
}

//For toast messages
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 2000); 
}

function dateSelect() {
  const dateInput = document.querySelector('#dateData').value;
  if (!dateInput) return;

  const [year, month, day] = dateInput.split('-').map(Number);
  selectedDate = new Date(year, month - 1, day, 12);
  updateDateDisplay();
  displayTodaysWorkout();

  document.querySelector('.modal2').style.display = 'none';
}

function updateDateDisplay() {
  const display = document.getElementById("today");

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const selected = new Date(selectedDate);
  selected.setHours(12, 0, 0, 0); // normalize

  if (selected.toDateString() === today.toDateString()) {
    display.textContent = "Today";
  } else if (selected.toDateString() === yesterday.toDateString()) {
    display.textContent = "Yesterday";
  } else if (selected.toDateString() === tomorrow.toDateString()) {
    display.textContent = "Tomorrow";
  } else {
    const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
    display.textContent = selected.toLocaleDateString(undefined, options);
  }
}