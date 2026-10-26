function setupLogoClicks() {
    let clickCount = 0;
    const logoButton = document.getElementById('logo-button');

    if (!logoButton) return;

    logoButton.addEventListener('click', () => {
        clickCount++;
        if (clickCount === 12) {
            window.location.href = 'secret.html';
        }
    });
}


// Endless scrolling strip (about page: gaming + music)
function setupCarousel(root) {
    const viewport = root.querySelector('.carousel-viewport');
    const track = root.querySelector('.carousel-track');
    const pauseButton = root.querySelector('.carousel-pause');
    const originals = Array.from(track.children);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const SPEED = 35; // px per second
    let offset = 0;   // how far the strip has moved left
    let setWidth = 0; // width of one full copy of the items (incl. gap)
    let step = 0;     // one tile + gap
    let copies = 0;
    let userPaused = false;
    let hovering = false;
    let focused = false;
    let dragging = false;
    let visible = false;
    let glide = null; // arrow-button animation in progress
    let frame = 0;    // pending animation frame, 0 while the loop is asleep
    let lastTime = null;

    const wrap = (x) => ((x % setWidth) + setWidth) % setWidth;

    // copies of the items so the strip never runs out; hidden from screen readers and tabbing
    function measure() {
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        step = originals[0].getBoundingClientRect().width + gap;
        setWidth = step * originals.length;

        const needed = Math.ceil(viewport.clientWidth / setWidth) + 1;
        if (needed !== copies) {
            track.querySelectorAll('[data-clone]').forEach((el) => el.remove());
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < needed; i++) {
                originals.forEach((item) => {
                    const clone = item.cloneNode(true);
                    clone.dataset.clone = '';
                    clone.setAttribute('aria-hidden', 'true');
                    clone.tabIndex = -1;
                    fragment.appendChild(clone);
                });
            }
            track.appendChild(fragment);
            copies = needed;
        }
        render();
    }

    function render() {
        track.style.transform = `translateX(${-wrap(offset)}px)`;
    }

    function autoScrolling() {
        return !userPaused && !hovering && !focused && !dragging && !reducedMotion.matches;
    }

    // the loop only runs while the strip is on screen and something is moving
    function wake() {
        if (!frame && visible && (glide || autoScrolling())) {
            lastTime = null;
            frame = requestAnimationFrame(tick);
        }
    }

    function tick(time) {
        frame = 0;
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
        } else {
            return; // nothing moving: sleep until wake()
        }

        render();
        if (visible) frame = requestAnimationFrame(tick);
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
        wake();
    }

    root.querySelector('.carousel-prev').addEventListener('click', () => move(-1));
    root.querySelector('.carousel-next').addEventListener('click', () => move(1));

    pauseButton.hidden = reducedMotion.matches;
    pauseButton.addEventListener('click', () => {
        userPaused = !userPaused;
        pauseButton.textContent = userPaused ? 'Play' : 'Pause';
        pauseButton.setAttribute('aria-pressed', String(userPaused));
        wake();
    });

    viewport.addEventListener('mouseenter', () => { hovering = true; });
    viewport.addEventListener('mouseleave', () => { hovering = false; wake(); });
    root.addEventListener('focusin', () => { focused = true; });
    root.addEventListener('focusout', () => { focused = false; wake(); });

    // tabbing to a tile: keep the browser from scrolling the viewport, and slide the tile into view instead
    track.addEventListener('focusin', (event) => {
        const item = event.target.closest('a');
        viewport.scrollLeft = 0;
        if (!item || !item.matches(':focus-visible')) return;
        glide = null;
        offset = wrap(item.offsetLeft - (viewport.clientWidth - item.offsetWidth) / 2);
        render();
    });

    // swipe / drag; the pointer is only captured once it's clearly a drag, so plain clicks still open links
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

    viewport.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = event.clientX - dragStartX;
        if (!dragMoved && Math.abs(dx) > 5) {
            dragMoved = true;
            viewport.setPointerCapture(event.pointerId);
            viewport.classList.add('dragging');
        }
        if (dragMoved) {
            offset = dragStartOffset - dx;
            render();
        }
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        viewport.classList.remove('dragging');
        wake();
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('pointerleave', () => { if (!dragMoved) endDrag(); });

    // a drag shouldn't also open the link under the pointer
    track.addEventListener('click', (event) => {
        if (dragMoved) {
            event.preventDefault();
            dragMoved = false;
        }
    });
    track.addEventListener('dragstart', (event) => event.preventDefault());

    new ResizeObserver(measure).observe(viewport);
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();
    }).observe(root);
    reducedMotion.addEventListener('change', () => {
        pauseButton.hidden = reducedMotion.matches;
        wake();
    });
}


// Contact page: send the form to Formspree without leaving the page
function setupContactForm() {
    const form = document.getElementById('contact-form');

    if (!form) return;

    const submitButton = form.querySelector('.contact-submit');
    const status = form.querySelector('.contact-status');

    function showStatus(text, isError) {
        status.textContent = text;
        status.classList.toggle('error', isError);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        showStatus('', false);

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' },
            });

            if (response.ok) {
                form.reset();
                showStatus('Thanks! Your message was sent. I\'ll get back to you soon.', false);
            } else {
                const result = await response.json().catch(() => ({}));
                const details = (result.errors || []).map((e) => e.message).join(' ');
                showStatus(details || 'Something went wrong. Please try again, or message me on LinkedIn.', true);
            }
        } catch {
            showStatus('Couldn\'t reach the server. Check your connection, or message me on LinkedIn.', true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        }
    });
}


// app.js is loaded with defer, so the page is already parsed when this runs
setupLogoClicks();
document.querySelectorAll('[data-carousel]').forEach(setupCarousel);
setupContactForm();