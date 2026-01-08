/* ================= HERO SLIDER ================= */

const slides = document.querySelectorAll(".hero-slide");
const hero = document.getElementById("heroSlider");
let current = 0;

function showHeroSlide(index) {
  slides.forEach(slide => slide.classList.remove("active"));
  slides[index].classList.add("active");
}

setInterval(() => {
  current = (current + 1) % slides.length;
  showHeroSlide(current);
}, 2500);

hero.addEventListener("mouseenter", () => {
  current = (current + 1) % slides.length;
  showHeroSlide(current);
});

/* ================= PLAYERS COUNT ================= */

let playersCount = 4;

function changePlayers(val) {
  playersCount += val;
  if (playersCount < 1) playersCount = 1;
  if (playersCount > 10) playersCount = 10;
  document.getElementById("players").innerText = playersCount;
}

/* ================= TIME SLOTS ================= */

let selectedSlot = "";
const slotsContainer = document.getElementById("slotsContainer");

function selectSlot(btn) {
  if (btn.classList.contains("booked")) return;

  document.querySelectorAll("#slotsContainer button")
    .forEach(b => b.classList.remove("active"));

  btn.classList.add("active");
  selectedSlot = btn.innerText;
}

/* 🔴 NEW FUNCTION — FETCH BOOKED SLOTS */
async function markBookedSlots(date, consoleType) {
  if (!date || !consoleType) return;

  try {
    const response = await fetch(
      `/booked-slots?date=${date}&console=${consoleType}`
    );
    const bookedSlots = await response.json();

    document.querySelectorAll("#slotsContainer button").forEach(btn => {
      if (bookedSlots.includes(btn.innerText)) {
        btn.classList.add("booked");
        btn.disabled = true;
      }
    });
  } catch (err) {
    console.error("Error loading booked slots:", err);
  }
}

async function loadTimeSlots() {
  try {
    const response = await fetch("/time-slots");
    const slots = await response.json();

    slotsContainer.innerHTML = "";

    slots.forEach(slot => {
      const btn = document.createElement("button");
      btn.innerText = slot;
      btn.classList.add("slot-btn");
      btn.onclick = () => selectSlot(btn);
      slotsContainer.appendChild(btn);
    });

    /* 🔴 CALL BOOKED SLOT MARKING */
    const date = document.getElementById("date").value;
    const consoleSelected = document.querySelector(
      'input[name="console"]:checked'
    );

    if (date && consoleSelected) {
      markBookedSlots(date, consoleSelected.value);
    }

  } catch (err) {
    console.error("Error loading time slots:", err);
  }
}

window.onload = () => {
  loadTimeSlots();
};

/* 🔴 RELOAD WHEN DATE / CONSOLE CHANGES */
document.getElementById("date").addEventListener("change", loadTimeSlots);

document.querySelectorAll('input[name="console"]').forEach(radio => {
  radio.addEventListener("change", loadTimeSlots);
});

/* ================= BOOK NOW ================= */

async function bookNow() {

  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const date = document.getElementById("date").value;
  const players = document.getElementById("players").innerText;

  const consoleSelected = document.querySelector(
    'input[name="console"]:checked'
  );

  if (!name || !contact || !date || !consoleSelected) {
    alert("Please fill all details");
    return;
  }

  if (!selectedSlot) {
    alert("Please select a time slot");
    return;
  }

  const bookingData = {
    name,
    contact,
    players,
    console: consoleSelected.value,
    date,
    time_slot: selectedSlot
  };

  try {
    const response = await fetch("http://localhost:5000/add-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message);
      return;
    }

    /* 🔴 TURN SLOT RED AFTER SUCCESS */
    document.querySelectorAll("#slotsContainer button").forEach(btn => {
      if (btn.innerText === selectedSlot) {
        btn.classList.add("booked");
        btn.classList.remove("active");
        btn.disabled = true;
      }
    });

    alert(result.message);
    selectedSlot = "";

  } catch (error) {
    console.error("Fetch Error:", error);
    alert("Server error. Please try again.");
  }
}
