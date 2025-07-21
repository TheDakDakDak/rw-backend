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

window.addEventListener('DOMContentLoaded', () => {
  (async () => {
    try {
      const response = await fetch('/api/getUserInfo');
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      const data = await response.json();
	  console.log(data.username);
	  console.log(data.email);
      document.getElementById('currentUsername').innerText = data.username;
      document.getElementById('currentEmail').innerText = data.email;
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  })();
});

document.getElementById('saveUsername').addEventListener('click', async () => {
	const newUsername = document.getElementById('newUsername').value.trim();
	if(newUsername) {
		const response = await fetch('/api/updateUsername', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({newUsername})
		});
		const data = await response.json();
		if(response.ok) {
			document.getElementById('currentUsername').innerText = newUsername;
			alert(data.message);
		}
	}
});

document.getElementById('saveEmail').addEventListener('click', async () => {
	const newEmail = document.getElementById('newEmail').value.trim();
		if(newEmail) {
		const response = await fetch('/api/updateEmail', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({newEmail})
		});
		const data = await response.json();
		if(response.ok) {
			document.getElementById('currentEmail').innerText = newEmail;
			alert(data.message);
		}
	}
});

document.getElementById('savePassword').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    alert("New passwords do not match.");
    return;
  }

  try {
    const response = await fetch('/api/updatePassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();
    alert(data.message);
  } catch (err) {
    console.error('Error updating user info:', err);
    alert('Something went wrong while updating.');
  }
});
		
	