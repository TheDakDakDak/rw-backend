function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

document.getElementById('submitButton').addEventListener('click', async () => {
  const userName = document.getElementById('signupUsername').value.trim();
  const userPassword = document.getElementById('signupPassword').value;
  const email = document.getElementById('signupEmail').value.toLowerCase().trim();
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!userName || !userPassword || !email || !confirmPassword) {
    alert("All fields are required.");
    return;
  }

  if (userPassword !== confirmPassword) {
    alert("Passwords must match.");
    return;
  }

  if (userName.length > 30 || userName.length < 3) {
    alert("Username must be between 3 and 30 characters.");
    return;
  }

  if (userPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  if (!isValidEmail(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userName,
        email,
        password: userPassword
      })
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Signup failed.");
    } else {
      alert("Signup successful! You can now log in.");
      window.location.href = "../login";
    }
  } catch (error) {
    console.error("Signup error:", error);
    alert("Network error. Please try again.");
  }
});

//Enter button submission functionality
['signupEmail', 'signupUsername', 'signupPassword', 'confirmPassword'].forEach(id => {
	document.getElementById(id).addEventListener('keydown', function (event) {
		if (event.key === 'Enter') {
			document.getElementById('submitButton').click();
		}
	});
});