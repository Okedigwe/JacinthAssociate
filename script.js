// ===== Mobile menu =====
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("site-nav");

function setMenu(open) {
  nav.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
// Close the menu after tapping a link (smooth scroll is handled by CSS)
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));

// ===== Portfolio filter =====
const filterBtns = document.querySelectorAll(".filter-btn");
const items = document.querySelectorAll(".portfolio-item");

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    const cat = btn.dataset.category;
    items.forEach(item => {
      item.hidden = !(cat === "all" || item.dataset.category === cat);
    });
  });
});

// Pause other videos when one starts playing
document.querySelectorAll(".portfolio-item video").forEach(v => {
  v.addEventListener("play", () => {
    document.querySelectorAll(".portfolio-item video").forEach(o => { if (o !== v) o.pause(); });
  });
});

// ===== Quote form: actually send to Formspree =====
const form = document.getElementById("quote-form");
const statusEl = document.getElementById("form-status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Sending…";
  statusEl.className = "form-status";
  statusEl.textContent = "";

  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    });
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
    btn.textContent = "Send request";
  }
});

// ===== Lead tracking (works once Google Analytics 4 is added) =====
function track(name, params) {
  if (typeof window.gtag === "function") window.gtag("event", name, params || {});
}
document.querySelectorAll("[data-track]").forEach(el => {
  el.addEventListener("click", () => track("contact_click", { channel: el.dataset.track }));
});

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();
