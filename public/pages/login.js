fetch('/api/session', {
	credentials: 'include'
})
	.then(res => res.json())
	.then(data => {
		if(data.authenticated) {
			window.location.href = "../WorkoutsHome/workoutsHome.html";
		}
	})

document.getElementById('submitButton').addEventListener('click', async () => {
	const email = document.getElementById('loginEmail').value.trim();
	const userPassword = document.getElementById('loginPassword').value;

	if (!email || !userPassword) {
		alert('All fields are required.');
		return;
	}

	try {
		const response = await fetch('/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ email, password: userPassword })
		});

		const result = await response.json();

		if (response.ok) {
			window.location.href = "../WorkoutsHome/workoutsHome.html";
		} else {
			alert(result.message || "Login Failed.");
		}
	} catch (err) {
		console.error("Login error:", err);
		alert("An error occurred during login. Please try again.");
	}
});

['loginEmail', 'loginPassword'].forEach(id => {
	document.getElementById(id).addEventListener('keydown', function (event) {
		if (event.key === 'Enter') {
			document.getElementById('submitButton').click();
		}
	});
});