const token = localStorage.getItem("adminToken");

// 🚫 Not logged in → redirect
if (!token) {
  window.location.href = "/admin/login.html";
}

// 🚪 Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/login.html";
  });
}