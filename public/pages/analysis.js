document.getElementById('initialContainerButton').addEventListener('click', () => {
	if(whichAnalytic.value == 'toOneRepMaxScreen') {
		document.getElementById('initialContainer').style.display = 'none';
		document.getElementById('oneRepMaxExerciseSelectContainer').style.display = 'flex';
	}
	else {
		alert("Nothing selected");
	}
});