function setupLogoClicks() {
    let clickCount = 0;
    const logoButton = document.getElementById('logo-button');

    if (!logoButton) return; // safety check

    logoButton.addEventListener('click', () => {
        clickCount++;
        if (clickCount === 12) {
            window.location.href = 'secret.html'; // Change to your target page
        }
    });
}


// Run the function when the page is ready
document.addEventListener('DOMContentLoaded', setupLogoClicks);