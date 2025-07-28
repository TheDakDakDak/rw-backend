fetch('/api/session', {
  credentials: 'include'
  })
  .then(res => {
    return res.json();
  })
  .then(data => {
    if (!data || !data.user) {
      throw new Error("No session user found");
    }
  })
  .catch(err => {
    alert("You must log in first.");
    window.location.href = "../login";
 });

let selectedDate = new Date();
selectedDate.setHours(12);

let currentWorkout = {
  date: null,
  workout: []
};

let exerciseCache = {
  all: [],
  byBodyPart: {}
};

let currentExercise = null;
let currentExerciseId = null;

let displayTimeoutId;

//Main App Functionality
window.addEventListener("DOMContentLoaded", () => {
  displayTodaysWorkout();
  updateDateDisplay();
  initializeExerciseCache();
});

//Open workoutMenu to start a workout
document.querySelector('#startWorkoutButton').addEventListener('click', workoutMenu);
document.querySelector('#plussignclass').addEventListener('click', workoutMenu);

//Sets currentWorkout date and brings up the muscle group selection menu.
function workoutMenu() {
  const dateText = selectedDate.toISOString().split("T")[0];
  currentWorkout.date = dateText;
  document.querySelector('.modal').style.display = 'flex';
  document.querySelector('#bodyPartSelect').style.display = 'block';
  document.querySelector('#calendarWindow').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'none';
  document.querySelector('#repsForm').style.display = 'none';
}

//Event listener on each button on the muscle group selection menu. Gets body part + passes it to showExercises.
document.querySelectorAll('.body-part').forEach(item => {
	item.addEventListener('click', () => {
		const part = item.getAttribute('data-part');
		showExercises(part);
	});
});

function showExercises(part) {
  const theExercises = exerciseCache.byBodyPart[part] || [];
  const exerciseList = document.querySelector('#exerciseList'); //The DOM's <ul> for exercises
  exerciseList.innerHTML = ""; //Start from an empty <ul>

  theExercises
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(ex => {
      const li = document.createElement('li'); //Create a blank list item
      li.textContent = ex.name; //Assign it the name of the exercise
      li.addEventListener('click', () => { //Slap an event listener on it
        currentExercise = ex.name; //Set current exercise to this exercise
        currentExerciseId = ex.id; //Set current exercise id to this exercis
        openRepsForm(currentExercise, currentExerciseId); //Pass the exercise's name+id to reps form
      });
      exerciseList.appendChild(li); //Add it to DOM
    });

  document.querySelector('#bodyPartSelect').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'block';
}

//Opens rep entry form. Called by a button in showExercises()
function openRepsForm(exerciseName, exerciseId) {
  currentExercise = exerciseName;
  currentExerciseId = exerciseId;
  
  const dateText = selectedDate.toISOString().split("T")[0];
  currentWorkout.date = dateText;
  
  document.querySelector('#exerciseHeading').textContent = exerciseName;
  document.querySelector('#repsForm').style.display = 'block';
  document.querySelector('#calendarWindow').style.display = 'none';
  document.querySelector('#exerciseSelect').style.display = 'none';
}

//Logic for saving a set in the set entry menu
const saveSetBtn = document.querySelector('#saveSet');
let isSaving = false; //Temporary bandaid for DOM updating bug when save is clicked multiple times quickly.
document.querySelector('#saveSet').addEventListener('click', async () => {
  if (isSaving) return; //Prevent multiple clicks. Part of temporary bandaid
  isSaving = true;
  saveSetBtn.disabled = true;
  //Get values from input fields
  const reps = document.querySelector('#repsInput').value.trim();
  const weight = document.querySelector('#weightInput').value.trim();

  //Validate weight and reps values
  console.log("Trying to save:", { reps, weight, currentExercise, currentExerciseId });
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
    currentWorkout.workout.push(exerciseEntry); //Placement is the possible cause of bug. Investigate later
  }

  //Inserts the set into currentWorkout
  exerciseEntry.sets.push({ reps: Number(reps), weight: Number(weight) }); //Placement is the possible cause of bug. Investigate later

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
	showToast(`Set Saved!`);
    clearTimeout(displayTimeoutId);
    displayTimeoutId = setTimeout(() => {
    displayTodaysWorkout();
    }, 50);
    setTimeout(() => {
    isSaving = false;
    saveSetBtn.disabled = false;
    }, 50);
    if (!res.ok) {
      throw new Error('Failed to save workout');
	}
    } catch (err) {
      console.error('Failed to send new set:', err);
    
	}
});

//Draws the entire day's workout on the DOM
async function displayTodaysWorkout() {
  const container = document.getElementById("exerciseSummaryContainer"); //will hold all workout info visually
  container.innerHTML = ""; //clears container prior to use

  const dateKey = selectedDate.toISOString().split("T")[0];

  try {
    const response = await fetch(`/api/getWorkout?date=${dateKey}`, {
      credentials: 'include'
    });
    const result = await response.json();

    if (!result.workout || result.workout.length === 0) { //If no workouts on this date, display <main>
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
	box.style.background = "#313333";
    box.classList.add("exercise-box");

    const headingContainer = document.createElement("div");
	headingContainer.style.display = "flex";
	headingContainer.style.alignItems = "center";
	headingContainer.style.justifyContent = "space-between";

	const heading = document.createElement("h3");
	heading.textContent = entry.exercise;
	heading.className = "workoutBoxHeading";
	heading.style.margin = "0";
	heading.style.color = "white";
	heading.style.textDecoration = "underline";

	const addSetBtn = document.createElement("img");
	addSetBtn.style.border = "none";
	addSetBtn.style.padding = "2px 8px";
	addSetBtn.style.cursor = "pointer";
	addSetBtn.src = "../media/images/whiteplussign.jpg";
	addSetBtn.style.height = "3.5vh";
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

	entry.sets.sort((a, b) => a.id - b.id);
    entry.sets.forEach((set, setIndex) => {
      const p = document.createElement("p");
      const formattedWeight = Number(set.weight) % 1 === 0
	  ? Number(set.weight).toFixed(0)
	  : Number(set.weight).toFixed(1);

      p.id = `set-${set.id}`;
      p.textContent = `${setCount}: ${formattedWeight}lbs, ${set.reps} reps`;
	  p.style.color = "white";
	  p.className = "setListing";

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
        const setElement = document.getElementById(`set-${setId}`);
		if (setElement) {
	const parentBox = setElement.closest(".exercise-box");
	const setParagraphs = parentBox.querySelectorAll('.setListing');

	if (setParagraphs.length === 1) {
		parentBox.remove();
		const remainingBoxes = document.querySelectorAll('.exercise-box');
		if (remainingBoxes.length === 0) {
		document.querySelector("main").style.display = "flex";
	}
	} else {
		setElement.remove();
		const remaining = parentBox.querySelectorAll('.setListing');
		remaining.forEach((p, index) => {
			const delBtn = p.querySelector("button");
			const text = p.textContent.replace("-", "").trim();
			const parts = text.split(":");
			if (parts.length >= 2) {
				const rest = parts.slice(1).join(":").trim();
				p.innerHTML = `${index + 1}: ${rest}`;
				p.appendChild(delBtn);
			}
		});
	}
}
		

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
		await initializeExerciseCache();
	}
		  
});

document.getElementById('addEx').addEventListener('click', async () => {
  const exerciseDropdown = document.querySelector('#delEx');
  exerciseDropdown.innerHTML = "";

  exerciseCache.all
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(ex => {
      const optionItem = document.createElement('option');
      optionItem.textContent = ex.name;
      optionItem.value = ex.name;
      exerciseDropdown.appendChild(optionItem);
    });
});

document.getElementById('delExBtn').addEventListener('click', async () => {
	const selectionDelete = document.getElementById('delEx').value;
	const res = await fetch('/api/deleteExercise', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ 
			name: selectionDelete 
		})
	});
	if(res.ok) {
		const data = await res.json();
		showToast(data.message);
		setTimeout(() => {
		  document.querySelector('.modal').style.display = 'none';
	      document.getElementById('addExForm').style.display = 'none';
		}, 500);
		await initializeExerciseCache();
	}
	else {
		alert(data.message);
	}
});

async function initializeExerciseCache() {
  try {
    const res = await fetch('/api/getAllExercises', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await res.json();
    exerciseCache.all = data.exercises;

    // Organize by body part
    exerciseCache.byBodyPart = {};
    for (const ex of data.exercises) {
      if (!exerciseCache.byBodyPart[ex.body_part]) {
        exerciseCache.byBodyPart[ex.body_part] = [];
      }
      exerciseCache.byBodyPart[ex.body_part].push(ex);
    }
  } catch (err) {
    console.error("Failed to initialize exercise cache:", err);
    showToast("Could not load exercises");
  }
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
    document.querySelector('#calendarWindow').style.display = 'none';
	document.getElementById('addExForm').style.display = 'none';
	document.querySelector('#repsForm').style.display = 'none';
  });
});

document.querySelector('.hamburger').addEventListener('click', () => {
  document.querySelector('.burger-menu').classList.toggle('open');
});






//Calendar Functionality
document.querySelector('#calendar').addEventListener('click', () => {	//Calendar icon
  document.querySelector('#bodyPartSelect').style.display = 'none';
  document.querySelector('#calendarWindow').style.display = 'flex';
  document.querySelector('.modal').style.display = 'flex';
  document.querySelector('#repsForm').style.display = 'none';
});
document.querySelector('#calendarButton').addEventListener('click', dateSelect);

function dateSelect() {
  const dateInput = document.querySelector('#dateData').value;
  if (!dateInput) return;

  const [year, month, day] = dateInput.split('-').map(Number);
  selectedDate = new Date(year, month - 1, day, 12);
  updateDateDisplay();
  displayTodaysWorkout();

  document.querySelector('.modal').style.display = 'none';
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