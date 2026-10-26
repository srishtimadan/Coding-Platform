const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const API_BASE = window.location.origin;
const USER_STORAGE_KEY = "codeforge-user";

function persistUser(user) {
    if (!user) {
        localStorage.removeItem(USER_STORAGE_KEY);
        return;
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.fullName || ""
    }));
}

async function postJson(url, body) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        message.textContent = "Please enter your email and password.";
        return;
    }

    try {
        message.textContent = "Signing in...";
        const result = await postJson(`${API_BASE}/api/login`, { email, password });
        persistUser(result.user);
        message.textContent = `Login successful! Welcome ${result.user.email}.`;
        loginForm.reset();

        window.setTimeout(() => {
            window.location.href = "index.html";
        }, 500);
    } catch (error) {
        message.textContent = error.message || "Login failed.";
    }
});

document.getElementById("forgotLink").addEventListener("click", function (event) {
    event.preventDefault();
    message.textContent = "Password reset is managed by the backend API. Connect a reset flow in your server.";
});

document.getElementById("googleButton").addEventListener("click", function () {
    message.textContent = "Google login requires OAuth setup. This is the place to connect it.";
});

document.getElementById("registerButton").addEventListener("click", function () {
    window.location.href = "signup.html";
});