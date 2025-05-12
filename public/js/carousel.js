document.addEventListener('DOMContentLoaded', function() {
    const carousels = document.querySelectorAll('.carousel-container');

    carousels.forEach(carousel => {
        const container = carousel.querySelector('.carousel-items');
        const prevBtn = carousel.querySelector('.prev');
        const nextBtn = carousel.querySelector('.next');
        let scrollAmount = 0;
        const scrollStep = 300;

        nextBtn.addEventListener('click', function() {
            scrollAmount += scrollStep;
            if (scrollAmount > container.scrollWidth - container.clientWidth) {
                scrollAmount = container.scrollWidth - container.clientWidth;
            }
            container.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });

        prevBtn.addEventListener('click', function() {
            scrollAmount -= scrollStep;
            if (scrollAmount < 0) {
                scrollAmount = 0;
            }
            container.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    });
});
