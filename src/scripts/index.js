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

// projects section
document.addEventListener("DOMContentLoaded", () => {
    function rotateNotPassedImages() {
        const stackItemImageAreas = document.querySelectorAll(
            ".stack-item:not(.passed) .stack-item--image-area"
        )

        for (let i = stackItemImageAreas.length - 1; i >= 0; i--) {
            stackItemImageAreas[i].style.transform = `rotate(-${2 * (stackItemImageAreas.length - i - 1)}deg)`
        }
    }
    
    // Set initial rotation
    rotateNotPassedImages()

    document.querySelector(".stack-item:last-of-type").classList.add("focus")

    window.addEventListener("scroll", () => {
        
        const bannerSection = document.querySelector(".banner-section");
        const stackArea = document.querySelector(".stack-area")

        if (bannerSection === null){
            /* stack area does not exist on the page */
            console.error("Could not find .banner-section")
            return
        }

        const propotion = bannerSection.getBoundingClientRect().bottom/(window.innerHeight * 0.8);
        
        if (propotion > 0){
            /* stack area is not visible */
            return
        }

        const index = Math.floor(propotion) * -1
        if (index == stackArea.dataset.currentFocusIndex){
            /* return if the focus card would remain the same */
            return
        }

        stackArea.dataset.currentFocusIndex = index

        const stackItems = Array.from(document.querySelectorAll(".stack-item"))

        if (index > stackItems.length){
            /* return if the index would be larger than the stack items */
            return
        }

        let reversedIndex = stackItems.length - index

        const passedStackItems = stackItems.slice(reversedIndex + 1, stackArea.length)
        const focusStackItem = stackItems[reversedIndex]
        const stillAvailableStackItems = stackItems.slice(0, reversedIndex)

        passedStackItems.forEach(item => {
            item.classList.remove("focus")
            item.classList.add("passed")
            item.classList.remove("display-at-top")
            item.querySelector(".stack-item--image-area").style.transform = null
        })

        focusStackItem.classList.remove("passed")
        focusStackItem.classList.add("focus")
        
        setTimeout(() => {
            /* The stack item must be at the top of the pile 
            * so that it is selectable and links are clickable
            * However, if that happens to soon, the card that is 
            * removed gets stuck below the new focus card. 
            * Therefore, the z-index class is added a bit later
            * so that the card removal animation had time to 
            * progress more.
             */
            focusStackItem.classList.add("display-at-top")
            console.log("focus")
        }, 500)
        

        stillAvailableStackItems.forEach(item => {
            item.classList.remove("focus")
            item.classList.remove("passed")
            item.classList.remove("display-at-top")
        })

        rotateNotPassedImages()
    })
})