document.addEventListener('DOMContentLoaded', (event) => {
    let imageWrappers = document.querySelectorAll('.image-wrapper');

    // Loop through each image wrapper
    imageWrappers.forEach(wrapper => {
      // Check if the wrapper has any image elements
      if (wrapper.querySelectorAll('img').length > 0) {
        // Add a class that has the scrolling animation
        wrapper.classList.add('has-images');
      }
    });
  });

