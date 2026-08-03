// ================= FADE ANIMATION =================
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");

      // OPTIONAL: stop observing after animation (performance boost)
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".fade").forEach(el => {
  observer.observe(el);
});


// ================= SIGNATURE PAD =================
const canvas = document.getElementById("pad");

if (canvas) {
  const ctx = canvas.getContext("2d");

  let drawing = false;

  canvas.addEventListener("mousedown", () => drawing = true);
  canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
  });

  canvas.addEventListener("mousemove", draw);

  function draw(e) {
    if (!drawing) return;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#38bdf8";

    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }
}


// ================= GET SIGNATURE =================
function getSignature() {
  const canvas = document.getElementById("pad");
  if (!canvas) return null;
  return canvas.toDataURL(); // base64 image
}


// ================= OPEN SIGN BOX =================
function openSignBox() {
  const box = document.getElementById("signBox");
  if (box) box.style.display = "block";
}


// ================= SUBMIT CONTRACT =================
async function submitContract() {

  const payload = {
    name: document.getElementById("name")?.value,
    email: document.getElementById("email")?.value,
    phone: document.getElementById("phone")?.value,
    typedName: document.getElementById("typedName")?.value,
    contractType: document.querySelector("h1")?.innerText,
    signature: getSignature()
  };

  // VALIDATION
  if (!payload.name || !payload.email || !payload.typedName) {
    alert("Please fill all required fields");
    return;
  }

  try {
    const res = await fetch("/api/contracts/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Contract signed successfully!");
      window.location.href = data.pdfUrl;
    } else {
      alert("❌ Failed to sign contract");
    }

  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}