document.addEventListener("DOMContentLoaded", () => {

  let players = 4;
  let selectedSlot = "";

  window.changePlayers = function(val){
    players += val;
    if(players < 1) players = 1;
    if(players > 10) players = 10;
    document.getElementById("players").innerText = players;
  }

  window.selectSlot = function(btn){
    document.querySelectorAll(".slots button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSlot = btn.innerText;
  }

  window.bookNow = function(){
    alert(
      "Booking Confirmed!\n\nPlayers: " + players +
      "\nSlot: " + selectedSlot
    );
  }
  


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
document.querySelector('.book-btn').addEventListener('click', function() {
    window.location.href = 'index2.html';
});

});
function bookNow(){
  const date = document.getElementById("date").value;

  alert(
    "Booking Confirmed!\n\n" +
    "Players: " + players +
    "\nDate: " + date +
    "\nSlot: " + selectedSlot
  );
}
