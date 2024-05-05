function randomPositionInCircle(maxDistancePercent) {
    // Get a random angle
    var angle = Math.random() * Math.PI * 2;
    // Get a random distance within maxDistancePercent
    var distance = Math.random() * maxDistancePercent;
    // Convert polar coordinates to cartesian
    var x = distance * Math.cos(angle);
    var y = distance * Math.sin(angle);
    return { x: x, y: y };
  }

function randomPositionInSquare(maxDistancePercent){
    let xDistance = maxDistancePercent * Math.random()
    let yDistance = maxDistancePercent * Math.random()

    xDistance = (Math.random() > 0.5) ? xDistance * -1 : xDistance
    yDistance = (Math.random() > 0.5) ? yDistance * -1 : yDistance

    return { x: xDistance, y: yDistance };
}

function generateDots(containerClassName, numOfDots, getRandomPositionFunc, maxDistancePercent){
    const container = document.querySelector(`.${containerClassName}`);
    
    for (var i = 0; i < numOfDots; i++) {
      let dot = document.createElement('div');
      dot.classList.add('dot');
      
      let size = Math.random() * 5 + 8; // Size between 2px and 7px
      let opacity = Math.random(); // Opacity between 0 and 1
      // Get a random position within a max distance from center

        let position = getRandomPositionFunc(maxDistancePercent); // Max distance from center in percent
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
}

document.addEventListener("DOMContentLoaded", function() {
    generateDots("circle-dots-container", 170, randomPositionInCircle, 45)
    generateDots("banner-dots-container", 20, randomPositionInSquare, 50)
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
    const isMobile = !window.matchMedia('only screen and (min-width: 768px)').matches

    function transformNotPassedImages() {
        const stackItemImageAreas = document.querySelectorAll(
            ".stack-item:not(.passed) .stack-item--image-area"
        )

        for (let i = stackItemImageAreas.length - 1; i >= 0; i--) {
            let transformStyle = ''
            const offsetFactor = stackItemImageAreas.length - i
            
            if (isMobile) {
                transformStyle = `translate(${offsetFactor * 10}px, ${offsetFactor * 2}px)`
            } else {
                transformStyle = `rotate(-${0.75 * (offsetFactor - 1)}deg)`
            }
            stackItemImageAreas[i].style.transform = transformStyle
        }
    }
    
    // Set initial rotation
    transformNotPassedImages()

    document.querySelector(".stack-item:last-of-type").classList.add("focus")

    const bannerSection = document.querySelector(".banner-section");
    const stackArea = document.querySelector(".stack-area")
    const stackItems = Array.from(document.querySelectorAll(".stack-item"))

    function showProjectCardByIndex({index}) {
        if (index == stackArea.dataset.currentFocusIndex){
            /* return if the focus card would remain the same */
            return
        }

        console.log(index)

        if (index > stackItems.length || index < 0){
            /* return if the index would be larger than the stack items or less than 0 */
            return
        }

        stackArea.dataset.currentFocusIndex = index

        let reversedIndex = stackItems.length - index
        console.log("index ", index)
        console.log("stackItems.length, ", stackItems.length)
        console.log("reversedIndex ", reversedIndex)

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
        }, 500)
        

        stillAvailableStackItems.forEach(item => {
            item.classList.remove("focus")
            item.classList.remove("passed")
            item.classList.remove("display-at-top")
        })

        transformNotPassedImages()
    }

    /* Add touch event listeners for mobile screens 
    * This should only be applied if it is a mobile device
    * All larger screens should work with the standard scroll animation
    */
    if (isMobile){
        let touchstartX = 0;
        let touchstartY = 0;
        let touchendX = 0;
        let touchendY = 0;
    
        const minimumTouchDistance = 25;
    
        document.querySelector(".stack-area")?.addEventListener("touchstart", (event) => {                    
            const touchLocation = event.targetTouches[0];
            touchstartX = touchLocation.screenX;
            touchstartY = touchLocation.screenY;
    
            touchendX = 0;
            touchendY = 0;
        }, false)
    
        document.querySelector(".stack-area")?.addEventListener("touchend", (event) => {
            const touchLocation = event.changedTouches[0];
            touchendX = touchLocation.screenX;
            touchendY = touchLocation.screenY;
    
            const distanceX = touchendX - touchstartX
            const distanceY = touchendY - touchstartY
    
            /* parse the currently set focus index as int or set to a reasonable default value */
            let currentFocusIndex = stackArea.dataset.currentFocusIndex
    
            if (currentFocusIndex === undefined) {
                currentFocusIndex = 0
            } else {
                currentFocusIndex = parseInt(currentFocusIndex)
            }
            
            if (distanceX < 0 && Math.abs(distanceX) > minimumTouchDistance){
                // swipe left
                let targetIndex = currentFocusIndex + 1

                if (targetIndex > stackItems.length) {
                    targetIndex = 1
                }

                showProjectCardByIndex({index: targetIndex})
            } else if (distanceX > 0 && Math.abs(distanceX) > minimumTouchDistance){
                // swipe right
                let targetIndex = currentFocusIndex - 1

                if (targetIndex <= 0) {
                    targetIndex = stackItems.length
                }

                showProjectCardByIndex({index: targetIndex})
            } else if (Math.abs(distanceY) > minimumTouchDistance) {
                // swipe up or down - do nothing
            }
        }, false)
    
        document.querySelector(".stack-area")?.addEventListener("touchcancel", () => {
            // reset touch recorded points
            touchstartX = 0;
            touchstartY = 0;
            touchendX = 0;
            touchendY = 0;
        }, false)
    } else {
        /* Add general scroll animation event listener for larger screens */
        window.addEventListener("scroll", () => {
            const propotion = bannerSection.getBoundingClientRect().bottom/(window.innerHeight * 0.8);
            
            if (propotion > 0){
                /* stack area is not visible */
                return
            }

            const index = Math.floor(propotion) * -1
            
            showProjectCardByIndex({index: index})
        })
    }
})