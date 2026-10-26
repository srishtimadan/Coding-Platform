const signupForm = document.getElementById("signupForm");
const message = document.getElementById("message");
const API_BASE = window.location.origin;

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const repeatPassword = document.getElementById("repeatPassword").value;

  if (!fullName || !email || !password) {
    message.textContent = "Please fill in all fields.";
    return;
  }

  if (password !== repeatPassword) {
    message.textContent = "The passwords do not match.";
    return;
  }

  try {
    message.textContent = "Creating your account...";
    const response = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Registration failed.");
    }

    message.textContent = "Account created. Redirecting to login...";
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  } catch (error) {
    message.textContent = error.message || "Could not connect to the registration API.";
  }
});

document.getElementById("backButton").addEventListener("click", () => {
  window.location.href = "index.html";
});
