function randomPosition(maxDistancePercent) {
    // Get a random angle
    var angle = Math.random() * Math.PI * 2;
    // Get a random distance within maxDistancePercent
    var distance = Math.random() * maxDistancePercent;
    // Convert polar coordinates to cartesian
    var x = distance * Math.cos(angle);
    var y = distance * Math.sin(angle);
    return { x: x, y: y };
  }

document.addEventListener("DOMContentLoaded", function() {
    const container = document.querySelector('.dots-containter');
    const numOfDots = 170; // Change this number based on how many dots you want
  
    for (var i = 0; i < numOfDots; i++) {
      let dot = document.createElement('div');
      dot.classList.add('dot');
      
      let size = Math.random() * 5 + 8; // Size between 2px and 7px
      let opacity = Math.random(); // Opacity between 0 and 1
      // Get a random position within a max distance from center

        let position = randomPosition(45); // Max distance from center in percent
        let posX = 50 + position.x; // Center is 50% for left
        let posY = 50 + position.y; // Center is 50% for top

      // Set random animation delays and durations for the fading effect
      let animationDelay = Math.random() * 5; // up to 5 seconds delay
      let animationDuration = 3 + Math.random() * 5; // between 3 and 8 seconds long

      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.opacity = opacity;
      dot.style.left = `${posX}%`;
      dot.style.top = `${posY}%`;
      dot.style.animation = `fadeEffect ${animationDuration}s infinite ${animationDelay}s`;
  
    
      container.appendChild(dot);
    }
  });

// LINES 

document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.line-container');
    const numOfLines = 70;

    for (let i = 0; i < numOfLines; i++) {
        let line = document.createElement('div');
        line.classList.add('line');
        let height = Math.random() * 50 + 8;
        let opacity = Math.random();
        let translateY = Math.random() * 40 - 30;
        
        
        let rotateY = (i % 2 === 0 ? 1 : -1) * (2 * i); // Alternate rotation direction for wave effect
        line.style.height = height + 'px';
        line.style.opacity = opacity;
        line.style.transform = `translateY(${translateY}px) rotateY(${rotateY}deg)`;

        container.appendChild(line); // Append the lines to the container
    }
});

// page 2 - projects
let cards = document.querySelectorAll(".card");
let stackArea = document.querySelector(".stack-area");
let leftContent = document.querySelectorAll(".left-content");

function rotateCards(){
  let angle = 0;
  cards.forEach((card) =>{
    if(card.classList.contains("active")){
      card.style.transform = `translate(-50%, -120vh) rotate(-48deg)`;
    }else{
      card.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      angle = angle -2;

    }
      
  });
  
}

rotateCards();

window.addEventListener("scroll", () => {
  // get the propotion of the element compared to window height
  let propotion = stackArea.getBoundingClientRect().top/window.innerHeight;
  if(propotion <= 0){
    let n = cards.length;
    let index = Math.ceil((propotion * n) / 2);
    index = Math.abs(index) - 1;
    for(let i=0; i<n; i++){
      if(i<=index){

        cards[i].classList.add("active");
        
        console.log(index)
      }else{
        cards[i].classList.remove("active");
       
      }
      rotateCards();
      
    }
    let visibleCard = document.querySelector(".card:not(.active)")

    document.querySelectorAll(".left-content").forEach(card => {card.style.display = "none"})

    if(visibleCard !== undefined ){
      document.querySelector(`.left-content[data-id="${visibleCard.dataset.id}"]`).style.display = "block";
    }
  }
})

