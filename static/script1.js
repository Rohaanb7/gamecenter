document.addEventListener("DOMContentLoaded", () => {

  let players = 4;
  let selectedSlot = "";

  window.changePlayers = function(val){
    players += val;
    if(players < 1) players = 1;
    if(players > 10) players = 10;
    document.getElementById("players").innerText = players;
  };

  // ✅ FIXED selectSlot
  window.selectSlot = function (btn) {
    document.querySelectorAll("#slotsContainer button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    selectedSlot = btn.innerText;
  };

  // ✅ FIXED bookNow (SENDS DATA TO FLASK)
  window.bookNow = async function(){
    const date = document.getElementById("date").value;
    const name = document.getElementById("name").value;
    const contact = document.getElementById("contact").value;

    const consoleSelected = document.querySelector(
      'input[name="console"]:checked'
    );

    if (!selectedSlot || !date || !name || !contact || !consoleSelected) {
      alert("Please fill all details");
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
      const res = await fetch("http://localhost:5000/add-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });

      const result = await res.json();
      alert(result.message);

    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  /* ---------- HERO SLIDER ---------- */

  const slides = document.querySelectorAll(".hero-slide");
  const hero = document.getElementById("heroSlider");
  let current = 0;

  function showHeroSlide(index){
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

});
