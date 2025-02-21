document.addEventListener("DOMContentLoaded", function () {
    let currentIndex = 0;
    const slides = document.querySelectorAll(".slide");
    const totalSlides = slides.length;
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.style.opacity = i === index ? "1" : "0";
        });
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        showSlide(currentIndex);
    }
    
    slides.forEach(slide => {
        slide.style.position = "absolute";
        slide.style.transition = "opacity 1s ease-in-out";
        slide.style.opacity = "0";
    });
    
    showSlide(currentIndex);
    setInterval(nextSlide, 3000); // Change slide every 3 seconds
});
