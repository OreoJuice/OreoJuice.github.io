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


// Endless scrolling strip (about page: gaming + music)
function setupCarousel(root) {
    const viewport = root.querySelector('.carousel-viewport');
    const track = root.querySelector('.carousel-track');
    const prevButton = root.querySelector('.carousel-prev');
    const nextButton = root.querySelector('.carousel-next');
    const pauseButton = root.querySelector('.carousel-pause');
    const originals = Array.from(track.children);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const SPEED = 35; // px per second
    let offset = 0;   // how far the strip has moved left
    let setWidth = 0; // width of one full copy of the items (incl. gap)
    let step = 0;     // one tile + gap
    let userPaused = false;
    let hovering = false;
    let focused = false;
    let dragging = false;
    let glide = null; // arrow-button animation in progress
    let lastTime = null;

    const wrap = (x) => ((x % setWidth) + setWidth) % setWidth;

    // copies of the items so the strip never runs out; hidden from screen readers and tabbing
    function fill() {
        track.querySelectorAll('[data-clone]').forEach((el) => el.remove());

        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        step = originals[0].getBoundingClientRect().width + gap;
        setWidth = step * originals.length;

        const copies = Math.ceil(viewport.clientWidth / setWidth) + 1;
        for (let i = 0; i < copies; i++) {
            originals.forEach((item) => {
                const clone = item.cloneNode(true);
                clone.dataset.clone = '';
                clone.setAttribute('aria-hidden', 'true');
                clone.tabIndex = -1;
                track.appendChild(clone);
            });
        }
        render();
    }

    function render() {
        track.style.transform = `translateX(${-wrap(offset)}px)`;
    }

    function autoScrolling() {
        return !userPaused && !hovering && !focused && !dragging && !reducedMotion.matches;
    }

    function tick(time) {
        const dt = lastTime === null ? 0 : (time - lastTime) / 1000;
        lastTime = time;

        if (glide) {
            const t = Math.min((time - glide.start) / glide.duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            offset = glide.from + (glide.to - glide.from) * eased;
            if (t === 1) {
                glide = null;
                offset = wrap(offset);
            }
        } else if (autoScrolling()) {
            offset += SPEED * Math.min(dt, 0.1);
        }

        render();
        requestAnimationFrame(tick);
    }

    // arrows move one tile, landing on a tile edge
    function move(direction) {
        const start = glide ? glide.to : offset;
        const snapped = Math.round(start / step) * step;
        glide = {
            from: offset,
            to: snapped + direction * step,
            start: performance.now(),
            duration: reducedMotion.matches ? 1 : 400,
        };
    }

    prevButton.addEventListener('click', () => move(-1));
    nextButton.addEventListener('click', () => move(1));

    pauseButton.addEventListener('click', () => {
        userPaused = !userPaused;
        pauseButton.textContent = userPaused ? 'Play' : 'Pause';
        pauseButton.setAttribute('aria-pressed', String(userPaused));
    });
    if (reducedMotion.matches) pauseButton.hidden = true;

    viewport.addEventListener('mouseenter', () => { hovering = true; });
    viewport.addEventListener('mouseleave', () => { hovering = false; });
    root.addEventListener('focusin', () => { focused = true; });
    root.addEventListener('focusout', () => { focused = false; });

    // tabbing to a tile: keep the browser from scrolling the viewport, and slide the tile into view instead
    track.addEventListener('focusin', (event) => {
        const item = event.target.closest('a');
        viewport.scrollLeft = 0;
        if (!item || !item.matches(':focus-visible')) return;
        glide = null;
        offset = wrap(item.offsetLeft - (viewport.clientWidth - item.offsetWidth) / 2);
    });

    // swipe / drag
    let dragStartX = 0;
    let dragStartOffset = 0;
    let dragMoved = false;

    viewport.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        dragging = true;
        dragMoved = false;
        glide = null;
        dragStartX = event.clientX;
        dragStartOffset = offset;
    });

    window.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = event.clientX - dragStartX;
        if (Math.abs(dx) > 5 && !dragMoved) {
            dragMoved = true;
            viewport.classList.add('dragging');
        }
        if (dragMoved) offset = dragStartOffset - dx;
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        viewport.classList.remove('dragging');
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // a drag shouldn't also open the link under the pointer
    track.addEventListener('click', (event) => {
        if (dragMoved) {
            event.preventDefault();
            dragMoved = false;
        }
    });
    track.addEventListener('dragstart', (event) => event.preventDefault());

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(fill, 150);
    });

    fill();
    requestAnimationFrame(tick);
}

function setupCarousels() {
    document.querySelectorAll('[data-carousel]').forEach(setupCarousel);
}


// Run the functions when the page is ready
document.addEventListener('DOMContentLoaded', setupLogoClicks);
document.addEventListener('DOMContentLoaded', setupCarousels);