/* Retreat Overview 2024 — JS */

/* Navbar scroll + toggle */
(function () {
  var navbar = document.getElementById("navbar");
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  window.addEventListener("scroll", function () {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  });

  toggle.addEventListener("click", function () {
    links.classList.toggle("open");
  });

  links.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      links.classList.remove("open");
    });
  });
})();

/* Scroll-down buttons */
document.querySelectorAll(".ro-scroll-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var section = btn.closest(".ro-section, .ro-hero");
    if (section && section.nextElementSibling) {
      section.nextElementSibling.scrollIntoView({ behavior: "smooth" });
    }
  });
});

/* Fade-in on scroll */
(function () {
  var els = document.querySelectorAll(".ro-feature, .ro-collage, .ro-stats-row, .ro-highlights-images, .ro-themes-bar");
  els.forEach(function (el) { el.style.opacity = "0"; el.style.transform = "translateY(30px)"; el.style.transition = "opacity 0.6s ease, transform 0.6s ease"; });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  els.forEach(function (el) { observer.observe(el); });
})();
