document.documentElement.classList.add("js");

const header = document.getElementById("site-header");
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("site-nav");

// ===== Header: solid on scroll =====
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// ===== Mobile menu =====
function setMenu(open) {
  nav.classList.toggle("open", open);
  header.classList.toggle("menu-open", open);
  document.body.classList.toggle("no-scroll", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", e => { if (e.key === "Escape") { setMenu(false); closeLightbox(); } });

// ===== Reveal on scroll =====
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add("in"));
}

// ===== Gentle parallax on the diaspora band =====
const para = document.querySelector(".diaspora-bg");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (para && !reduceMotion) {
  const band = para.parentElement;
  const move = () => {
    const r = band.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    para.style.transform = `translate3d(0, ${p * -60}px, 0)`;
  };
  window.addEventListener("scroll", () => requestAnimationFrame(move), { passive: true });
  move();
}

// ===== Lightbox for photos and videos =====
const lb = document.getElementById("lightbox");
const stage = document.getElementById("lb-stage");
let lastFocus = null;

function openLightbox(node) {
  lastFocus = document.activeElement;
  stage.replaceChildren(node);
  lb.hidden = false;
  document.body.classList.add("no-scroll");
  document.getElementById("lb-close").focus();
}
function closeLightbox() {
  if (lb.hidden) return;
  const v = stage.querySelector("video");
  if (v) v.pause();
  stage.replaceChildren();
  lb.hidden = true;
  document.body.classList.remove("no-scroll");
  if (lastFocus) lastFocus.focus();
}
document.querySelectorAll(".g-open").forEach(b => b.addEventListener("click", () => {
  const img = new Image();
  img.src = b.dataset.full;
  img.alt = b.querySelector("img").alt;
  openLightbox(img);
}));
document.querySelectorAll(".g-play").forEach(b => b.addEventListener("click", () => {
  const v = document.createElement("video");
  v.src = b.dataset.video;
  v.controls = true;
  v.autoplay = true;
  v.playsInline = true;
  openLightbox(v);
  track("video_play", { video: b.dataset.video });
}));
document.getElementById("lb-close").addEventListener("click", closeLightbox);
lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });


// ===== Sliders (photos + videos): auto-rotate, swipe, arrows, thumbnails =====
function initSlider({ root, prev, next, count, bar, thumbs, dur, onTap }) {
  if (!root) return;
  const slides = [...root.querySelectorAll(".slide")];
  const thumbEls = thumbs ? [...thumbs.querySelectorAll(".thumb")] : [];
  let i = 0, timer = null, hover = false, offscreen = false, playing = false, x0 = null, moved = false;
  const pad = n => String(n).padStart(2, "0");
  const isPaused = () => hover || offscreen || playing || document.hidden;

  function stopVideos() {
    root.querySelectorAll("video").forEach(v => { if (!v.paused) v.pause(); });
    root.classList.remove("is-playing");
    playing = false;
  }
  function go(n) {
    stopVideos();
    slides[i].classList.remove("is-active");
    thumbEls[i] && thumbEls[i].classList.remove("is-active");
    i = (n + slides.length) % slides.length;
    slides[i].classList.add("is-active");
    [i, (i + 1) % slides.length].forEach(k => { const im = slides[k].querySelector("img"); if (im && im.loading === "lazy") im.loading = "eager"; });
    if (thumbEls[i]) {
      thumbEls[i].classList.add("is-active");
      const t = thumbEls[i], box = t.parentElement;
      box.scrollTo({ left: t.offsetLeft - box.clientWidth / 2 + t.clientWidth / 2, behavior: "smooth" });
    }
    count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
    restart();
  }
  function restart() {
    clearTimeout(timer);
    bar.classList.remove("run"); void bar.offsetWidth;
    if (reduceMotion) return;
    bar.classList.add("run");
    root.classList.toggle("paused", isPaused());
    if (!isPaused()) timer = setTimeout(() => go(i + 1), dur);
  }
  function update() {
    root.classList.toggle("paused", isPaused());
    clearTimeout(timer);
    if (!isPaused() && !reduceMotion) timer = setTimeout(() => go(i + 1), dur / 2);
  }
  root.style.setProperty("--sl-dur", dur + "ms");
  root.tabIndex = 0;

  prev.addEventListener("click", e => { e.stopPropagation(); go(i - 1); });
  next.addEventListener("click", e => { e.stopPropagation(); go(i + 1); });
  thumbEls.forEach(t => t.addEventListener("click", () => go(+t.dataset.go)));
  root.addEventListener("mouseenter", () => { hover = true; update(); });
  root.addEventListener("mouseleave", () => { hover = false; update(); });
  root.addEventListener("keydown", e => { if (e.key === "ArrowLeft") go(i - 1); if (e.key === "ArrowRight") go(i + 1); });

  root.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; moved = false; hover = true; update(); }, { passive: true });
  root.addEventListener("touchmove", e => { if (x0 !== null && Math.abs(e.touches[0].clientX - x0) > 10) moved = true; }, { passive: true });
  root.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null; hover = false;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1); else update();
  });

  slides.forEach(s => s.addEventListener("click", e => { if (!moved && onTap) onTap(s, e); }));

  // Videos play inside the slider; rotation waits while one is playing
  root.querySelectorAll("video").forEach(v => {
    v.addEventListener("play", () => { playing = true; root.classList.add("is-playing"); update(); track("video_play", { video: v.getAttribute("src") }); });
    v.addEventListener("pause", () => { playing = false; root.classList.remove("is-playing"); update(); });
    v.addEventListener("ended", () => { playing = false; root.classList.remove("is-playing"); go(i + 1); });
  });

  new IntersectionObserver(([en]) => { offscreen = !en.isIntersecting; if (offscreen) stopVideos(); update(); }, { threshold: 0.25 }).observe(root);
  document.addEventListener("visibilitychange", update);
  restart();
}

initSlider({
  root: document.getElementById("slider"),
  prev: document.getElementById("sl-prev"),
  next: document.getElementById("sl-next"),
  count: document.getElementById("sl-count"),
  bar: document.getElementById("sl-progress"),
  thumbs: document.getElementById("thumbs"),
  dur: 4500,
  onTap: s => { const img = new Image(); img.src = s.dataset.full; img.alt = s.querySelector("img").alt; openLightbox(img); }
});

initSlider({
  root: document.getElementById("vslider"),
  prev: document.getElementById("vsl-prev"),
  next: document.getElementById("vsl-next"),
  count: document.getElementById("vsl-count"),
  bar: document.getElementById("vsl-progress"),
  thumbs: document.getElementById("vthumbs"),
  dur: 5000,
  onTap: (s, e) => {
    if (e.target.closest("video") && s.querySelector("video").controls) return; // let native controls work
    const v = s.querySelector("video");
    v.controls = true;
    v.play().catch(() => {});
  }
});

// ===== Quote form → Formspree =====
const form = document.getElementById("quote-form");
const statusEl = document.getElementById("form-status");
form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = "Sending…";
  statusEl.className = "form-status";
  statusEl.textContent = "";
  try {
    const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Request failed");
    form.reset();
    statusEl.classList.add("ok");
    statusEl.textContent = "Thank you! We've received your request and will contact you shortly.";
    track("generate_lead", { method: "quote_form" });
  } catch (err) {
    statusEl.classList.add("err");
    statusEl.textContent = "Sorry, something went wrong. Please call or WhatsApp us on +234 803 418 7783.";
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
});

// ===== Lead tracking (active once Google Analytics 4 is added) =====
function track(name, params) {
  if (typeof window.gtag === "function") window.gtag("event", name, params || {});
}
document.querySelectorAll("[data-track]").forEach(el => {
  el.addEventListener("click", () => track("contact_click", { channel: el.dataset.track }));
});

document.getElementById("year").textContent = new Date().getFullYear();
