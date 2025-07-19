fetch('/api/session', {
	credentials: 'include'
})
	.then(res => res.json())
	.then(data => {
		if(data.authenticated) {
			window.location.href = "../WorkoutsHome/workoutsHome.html";
		}
	})