let slideIndex = 0;
const slides = document.querySelectorAll(".slide");

function showSlides() {
    slides.forEach((slide, index) => {
        slide.style.display = index === slideIndex ? "block" : "none";
    });
}

function changeSlide(n) {
    slideIndex = (slideIndex + n + slides.length) % slides.length;
    showSlides();
}

document.addEventListener("DOMContentLoaded", () => {
    showSlides();
    setInterval(() => changeSlide(1), 3000); // Auto change slides every 3s
});
