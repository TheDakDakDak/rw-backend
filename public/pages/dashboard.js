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
let currentExerciseId = null;

let displayTimeoutId;

//Main App Functionality
window.addEventListener("DOMContentLoaded", () => {
  displayTodaysWorkout();
  updateDateDisplay();
});

//Logic for saving a set in the set entry menu
document.querySelector('#saveSet').addEventListener('click', async () => {
  //Get values from input fields
  const reps = document.querySelector('#repsInput').value.trim();
  const weight = document.querySelector('#weightInput').value.trim();

  //Validate weight and reps values
  if (!reps || !weight || !currentExercise || !currentExerciseId) return;
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
          exercise_id: currentExerciseId,
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
  document.querySelector(".modal").style.display = "none";
  showToast(`Set Saved!`);
  });
  
  
  
  document.getElementById('addExBtn').addEventListener('click', async () => {
	  const exerciseToAdd = document.getElementById('exName').value.trim();
	  const mgOfExercise = document.getElementById('exMg').value;
	  if(!exerciseToAdd) {
		  alert("Please enter an exercise name.");
		  return;
	  }
	  const res = await fetch('/api/addCustomExercise', {
		  method: 'POST',
		  headers: { 'Content-Type': 'application/json' },
		  credentials: 'include',
		  body: JSON.stringify({
			  exercise1: exerciseToAdd,
			  bodyPart1: mgOfExercise
	      })
	  });
	  const data = await res.json();
	  if(!res.ok) {
		  alert(data.message);
	  }
	  else {
		  showToast(data.message);
	  }
		  
  });

//Exercise selection menu
async function showExercises(part) {
	const res = await fetch('/api/getExercisesByBodyPart', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			part: part
		})
	});
	const data = await res.json();
	const theExercises = data.exercises;
    const exerciseList = document.querySelector('#exerciseList');
    exerciseList.innerHTML = "";
	
	theExercises
		.sort((a, b) => a.name.localeCompare(b.name))
		.forEach(ex => {
			const li = document.createElement('li');
			li.textContent = ex.name;
			li.addEventListener('click', () => {
				currentExercise = ex.name;
				currentExerciseId = ex.id;
				openRepsForm(currentExercise, currentExerciseId);
			});
			exerciseList.appendChild(li);
  });


  document.querySelector('#bodyPartSelect').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'block';
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
	exercise_id: e.exercise_id,
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
	box.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.5)";
	box.style.background = "black";
	box.style.border = "2px solid white";
    box.classList.add("exercise-box");

    const headingContainer = document.createElement("div");
	headingContainer.style.display = "flex";
	headingContainer.style.alignItems = "center";
	headingContainer.style.justifyContent = "space-between";

	const heading = document.createElement("h3");
	heading.textContent = entry.exercise;
	heading.style.margin = "0";
	heading.style.color = "white";
	heading.style.textDecoration = "underline";

	const addSetBtn = document.createElement("button");
	addSetBtn.textContent = "+";
	addSetBtn.style.backgroundColor = "#46c53b";
	addSetBtn.style.color = "white";
	addSetBtn.style.border = "none";
	addSetBtn.style.padding = "2px 8px";
	addSetBtn.style.fontSize = "16px";
	addSetBtn.style.borderRadius = "4px";
	addSetBtn.style.cursor = "pointer";
	addSetBtn.title = `Add a new set of ${entry.exercise}.`


	addSetBtn.addEventListener("click", () => {
	currentExercise = entry.exercise;
	currentExerciseId = entry.exercise_id;

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
      const formattedWeight = Number(set.weight) % 1 === 0
	  ? Number(set.weight).toFixed(0)
	  : Number(set.weight).toFixed(1);

      p.textContent = `${setCount}: ${formattedWeight}lbs, ${set.reps} reps`;
	  p.style.color = "white";

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




//Form Openers and Closers
document.querySelector('#startWorkoutButton').addEventListener('click', workoutMenu);
document.querySelector('#plussignclass').addEventListener('click', workoutMenu);

document.getElementById("addEx").addEventListener("click", () => {
  document.querySelector('#bodyPartSelect').style.display = 'none';
  document.querySelector('#addExForm').style.display = 'block';
});

document.getElementById('backToMuscleGroups').addEventListener('click', () => {
	document.querySelector('#bodyPartSelect').style.display = 'block';
	document.querySelector('#addExForm').style.display = 'none';
});
	
	
document.querySelectorAll('.body-part').forEach(item => {
	item.addEventListener('click', async () => {
		const part = item.getAttribute('data-part');
		const bodyPartSelect = document.querySelector('#bodyPartSelect');

		bodyPartSelect.classList.add('fade-out');
		showExercises(part);

		setTimeout(() => {
			bodyPartSelect.style.display = 'none';
			bodyPartSelect.classList.remove('fade-out');
		}, 400); // Match CSS animation duration
	});
});

function openRepsForm(exerciseName, exerciseId) {
  currentExercise = exerciseName;
  currentExerciseId = exerciseId;
  document.querySelector('#exerciseHeading').textContent = exerciseName;
  document.querySelector('#exerciseSelect').style.display = 'none';
  document.querySelector('#repsForm').style.display = 'block';
}

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

document.querySelector('#backButton').addEventListener('click', () => { //Back button leading from the exercise select menu to the body part select menu
  document.querySelector('#exerciseSelect').style.display = 'none';
  document.querySelector('#bodyPartSelect').style.display = 'block';
});
document.querySelector('#backToExercises').addEventListener('click', () => { //Back button leading from the set entry form to the exercise select menu
  document.querySelector('#repsForm').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'block';
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
    document.querySelector('.modal').style.display = 'none';
    document.querySelector('.modal2').style.display = 'none';
	document.getElementById('addExForm').style.display = 'none';
  });
});






//Calendar Functionality
document.querySelector('#calendar').addEventListener('click', () => { //Calendar icon
	document.querySelector('.modal2').style.display = 'flex';
});
document.querySelector('#calendarButton').addEventListener('click', dateSelect);

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