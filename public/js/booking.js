const API = "http://localhost:3000";

let selectedDate = null;

/* ================= CALENDAR ================= */
document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    selectable: true,

    dateClick: async function (info) {
      selectedDate = info.dateStr;

      document.getElementById("selectedDate").innerText =
        "Selected: " + selectedDate;

      await loadTimeSlots(selectedDate);
      highlightSelectedDate(info.dateStr);
    },

    events: async function (fetchInfo, successCallback) {
      const res = await fetch(API + "/api/blocked-dates");
      const blocked = await res.json();

      const events = blocked.map(date => ({
        title: "Booked",
        start: date,
        color: "red"
      }));

      successCallback(events);
    }
  });

  calendar.render();
});

/* ================= TIME SLOT LOAD ================= */
async function loadTimeSlots(date) {
  const res = await fetch(`${API}/api/bookings-by-date/${date}`);
  const bookedSlots = await res.json();

  const allSlots = [
    "08:00-10:00",
    "10:00-12:00",
    "12:00-14:00",
    "14:00-16:00",
    "16:00-18:00"
  ];

  const select = document.getElementById("timeSlot");
  select.innerHTML = `<option value="">Select Time Slot</option>`;

  allSlots.forEach(slot => {
    const option = document.createElement("option");
    option.value = slot;
    option.textContent = slot;

    if (bookedSlots.includes(slot)) {
      option.disabled = true;
      option.style.color = "red";
      option.textContent = slot + " (Booked)";
    }

    select.appendChild(option);
  });
}

/* ================= PAY NOW (25% DEPOSIT) ================= */
async function payNow() {
  if (!selectedDate) return alert("Please select a date");

  const price = Number(document.getElementById("service").value);

  const res = await fetch(API + "/api/book-pay-now", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: selectedDate,
      timeSlot: document.getElementById("timeSlot").value,
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      address: document.getElementById("address").value,
      price
    })
  });

  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

/* ================= PAY LATER ================= */
async function payLater() {
  if (!selectedDate) return alert("Please select a date");

  const price = Number(document.getElementById("service").value);

  const res = await fetch(API + "/api/book-pay-later", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: selectedDate,
      timeSlot: document.getElementById("timeSlot").value,
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      address: document.getElementById("address").value,
      price
    })
  });

  const data = await res.json();

  if (data.success) {
    alert("Booking saved ✔");
    location.reload();
  }
}