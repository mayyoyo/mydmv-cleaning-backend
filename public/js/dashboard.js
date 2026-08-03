const API = "http://localhost:3000";

const token = localStorage.getItem("adminToken");

if (!token) {
  alert("Login required");
  window.location.href = "/admin/login";
}

/* ================= LOAD BOOKINGS ================= */
async function loadBookings() {
  const res = await fetch(API + "/admin/bookings", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await res.json();
  renderTable(data);
}

/* ================= TABLE RENDER (YOUR FIX) ================= */
function renderTable(data) {
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = "";

  data.forEach(b => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${b.customer?.name || b.name || ""}</td>
      <td>${b.service || ""}</td>
      <td>${b.customer?.date || b.date || ""}</td>
      <td>${b.customer?.timeSlot || b.timeSlot || ""}</td>

      <td>
        <span class="status">${b.status}</span>
      </td>

      <td>
        <button onclick="approve('${b._id}')">Approve</button>
        <button onclick="cancelBooking('${b._id}')">Cancel</button>
        <button onclick="deleteBooking('${b._id}')">Delete</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

/* ================= ACTIONS ================= */
async function approve(id) {
  await fetch(API + "/admin/approve/" + id, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadBookings();
}

async function cancelBooking(id) {
  await fetch(API + "/admin/cancel/" + id, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadBookings();
}

async function deleteBooking(id) {
  await fetch(API + "/admin/delete/" + id, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadBookings();
}

/* ================= INIT ================= */
loadBookings();
// 
async function loadRevenue() {
  const res = await fetch("/admin/revenue");
  const data = await res.json();

  console.log("Total Revenue:", data.total);
}
loadRevenue();
// 
async function assignJob(id) {
  try {
    const res = await fetch(`${API}/api/assign-job/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    alert("👷 Assigned to: " + data.worker);

    loadBookings(); // refresh table

  } catch (err) {
    console.log("ASSIGN ERROR:", err);
    alert("Failed to assign job");
  }
}