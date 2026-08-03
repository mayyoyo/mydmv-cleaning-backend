console.log("login.js loaded");

const btn = document.getElementById("loginBtn");

btn.addEventListener("click", login);

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!username || !password) {
    msg.innerText = "Please enter username and password";
    return;
  }

  msg.innerText = "Logging in...";

  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("adminToken", data.token);
      window.location.href = "/admin/dashboard";
    } else {
      msg.innerText = "Invalid login";
    }

  } catch (err) {
    console.log(err);
    msg.innerText = "Server error";
  }
}
// 
