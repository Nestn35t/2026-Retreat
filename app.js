/* ========================================
   AIBP Innovation Retreat 2026 — App JS
   ======================================== */

/* ===== CONFIG ===== */
const SHEET_ID = "1nd6qkaIA7yyo8cBU_fkua3-cQz_mTYStBH5ynaQQ388";
const SHEET_NAME = "Invited Guests";

const COUNTRY_CONFIG = {
  ID: { name: "Indonesia", color: "#c62828" },
  MY: { name: "Malaysia", color: "#2e7d32" },
  TH: { name: "Thailand", color: "#1565c0" },
  PH: { name: "Philippines", color: "#6a1b9a" },
  VN: { name: "Vietnam", color: "#ef6c00" },
};

const INDUSTRY_MAP = {
  bfsi: "Banking & Financial Services",
  dtlf: "Distribution, Transportation & Logistics",
  telecommunication: "Telecommunications",
  telecommunications: "Telecommunications",
  industrials: "Industrials & Manufacturing",
  retail: "Retail",
  "real estate": "Real Estate",
  "energy & utilities": "Energy & Utilities",
  "public services": "Public Services",
  conglomerate: "Conglomerate",
  technology: "Technology",
  association: "Association",
  vendor: "Vendor",
};

function normaliseIndustry(raw) {
  var key = (raw || "").trim().toLowerCase();
  return INDUSTRY_MAP[key] || "";
}

/* ===== NAVBAR ===== */
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

  // Close mobile menu on link click
  links.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      links.classList.remove("open");
    });
  });
})();

/* ===== AGENDA ===== */
var sessionURL =
  "https://opensheet.elk.sh/" + SHEET_ID + "/Agenda%20Sessions";
var optionsURL =
  "https://opensheet.elk.sh/" + SHEET_ID + "/Agenda%20Options";

var sessions = [];
var options = [];

function renderDay(date) {
  var container = document.getElementById("agenda-container");

  var daySessions = sessions
    .filter(function (s) { return s.date === date; })
    .sort(function (a, b) { return a.start_time.localeCompare(b.start_time); });

  if (!daySessions.length) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No sessions scheduled for this day yet.</p>';
    return;
  }

  var html = '<div class="agenda-day">';

  daySessions.forEach(function (session) {
    var sessionOptions = options.filter(function (o) {
      return o.session_id === session.session_id;
    });

    var hasChoice = session.has_choice === "TRUE";

    var timeText = "";
    if (session.start_time && session.end_time) {
      timeText = session.start_time + " \u2013 " + session.end_time;
    } else if (session.start_time) {
      timeText = session.start_time;
    } else if (session.end_time) {
      timeText = session.end_time;
    }

    html += '<div class="agenda-row">';
    html += '<div class="agenda-time">' + timeText + "</div>";
    html += '<div class="agenda-card">';
    html += '<div class="agenda-card-header">';
    html += '<h3 class="agenda-session-title">' + session.title + "</h3>";
    if (hasChoice) {
      html += '<span class="agenda-badge">Choose One</span>';
    }
    html += "</div>";

    if (session.description) {
      html += '<p class="agenda-session-desc">' + session.description + "</p>";
    }

    if (hasChoice && sessionOptions.length) {
      html += '<div class="choice-grid">';
      sessionOptions.forEach(function (opt) {
        html += '<div class="choice-card">';
        html += '<div class="choice-label">' + opt.option_label + "</div>";
        html += '<h4 class="choice-title">' + opt.activity + "</h4>";
        html += '<p class="choice-desc">' + opt.description + "</p>";
        html += "</div>";
      });
      html += "</div>";
    }

    html += "</div></div>";
  });

  html += "</div>";
  container.innerHTML = html;
}

// Agenda tabs
document.querySelectorAll(".agenda-tabs button").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".agenda-tabs button")
      .forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    renderDay(btn.dataset.day);
  });
});

// Load agenda data
Promise.all([
  fetch(sessionURL).then(function (r) { return r.json(); }),
  fetch(optionsURL).then(function (r) { return r.json(); }),
])
  .then(function (data) {
    sessions = data[0];
    options = data[1];
    renderDay("2026-04-27");
  })
  .catch(function (err) {
    console.error("Agenda load error:", err);
    document.getElementById("agenda-container").innerHTML =
      '<p style="text-align:center;color:#999;">Unable to load agenda.</p>';
  });

/* ===== ATTENDEES ===== */
var ATTENDEES_URL =
  "https://opensheet.elk.sh/" + SHEET_ID + "/" + encodeURIComponent(SHEET_NAME);

var allRows = [];
var selectedCountry = "ALL";
var selectedSector = "ALL";
var showAll = false;

function initCountryFilter() {
  var select = document.getElementById("countryFilter");
  Object.entries(COUNTRY_CONFIG).forEach(function (entry) {
    var code = entry[0];
    var cfg = entry[1];
    var opt = document.createElement("option");
    opt.value = code;
    opt.textContent = cfg.name;
    select.appendChild(opt);
  });
  select.addEventListener("change", function () {
    selectedCountry = select.value;
    showAll = false;
    renderCards();
  });
}

document.getElementById("sectorFilter").addEventListener("change", function (e) {
  selectedSector = e.target.value;
  showAll = false;
  renderCards();
});

function renderCards() {
  var container = document.getElementById("attendees-container");
  container.innerHTML = "";

  var filteredRows = allRows.filter(function (row) {
    var countryCode = (row["Country"] || "").trim();
    if (!COUNTRY_CONFIG[countryCode]) return false;
    if (selectedCountry !== "ALL" && countryCode !== selectedCountry) return false;
    var industry = normaliseIndustry(row["Industry"] || "");
    if (selectedSector !== "ALL" && industry !== selectedSector) return false;
    return true;
  });

  var gridWidth = container.offsetWidth;
  var cardsPerRow = Math.floor(gridWidth / 288) || 1;
  var maxVisible = cardsPerRow * 2;

  var rowsToRender = showAll ? filteredRows : filteredRows.slice(0, maxVisible);

  rowsToRender.forEach(function (row) {
    var countryCode = (row["Country"] || "").trim();
    var industry = normaliseIndustry(row["Industry"] || "");
    var cfg = COUNTRY_CONFIG[countryCode];

    var card = document.createElement("div");
    card.className = "attendee-card";
    card.style.setProperty("--accent", cfg.color);

    card.innerHTML =
      '<div class="attendee-country">' + cfg.name + "</div>" +
      '<div class="attendee-name">' + (row["Name"] || "") + "</div>" +
      '<div class="attendee-title">' + (row["Title"] || "") + "</div>" +
      '<div class="attendee-org">' + (row["Organisation"] || "") + "</div>" +
      '<div class="attendee-industry">' + industry + "</div>" +
      '<div class="attendee-affiliation">' + (row["AIBP Affiliation"] || "") + "</div>";

    container.appendChild(card);
  });

  var btn = document.getElementById("toggleCards");
  if (filteredRows.length <= maxVisible) {
    btn.style.display = "none";
  } else {
    btn.style.display = "inline-block";
    btn.textContent = showAll ? "Show Less" : "Show More";
  }
}

document.getElementById("toggleCards").addEventListener("click", function () {
  showAll = !showAll;
  renderCards();
});

fetch(ATTENDEES_URL)
  .then(function (res) { return res.json(); })
  .then(function (rows) {
    allRows = rows;
    initCountryFilter();
    renderCards();
  })
  .catch(function (err) {
    console.error("Attendees load error:", err);
  });

/* ===== ACTIVITIES CAROUSEL ===== */
var SHEET_URL_B =
  "https://opensheet.vercel.app/1L_8inQllfw3CKR-lLB6u6eS4I-cMHh4ccx-HQOkoTqw/All%20Products%20Combined";

function getDefaultImageByEventType(type) {
  var t = (type || "").toLowerCase();
  if (t.includes("podcast"))
    return "https://images.squarespace-cdn.com/content/6316ec4bc3127239ee7b0786/2a685518-b6be-45b7-b349-6830f82cb8e8/AIBP+Podcast+Logo+no+globe.png";
  if (t.includes("report"))
    return "https://images.squarespace-cdn.com/content/6316ec4bc3127239ee7b0786/30a6f21d-ba92-4ae6-9605-7c4ffe6eb9ec/AIBP+Reports+Logo-no+globe.png";
  if (t.includes("conference") || t.includes("exhibition"))
    return "https://images.squarespace-cdn.com/content/6316ec4bc3127239ee7b0786/ef35557f-6356-4770-9790-9c1aecda7f57/AIBP-Conference-%26-Exhibition-no-globe.png";
  if (t.includes("networking"))
    return "https://images.squarespace-cdn.com/content/6316ec4bc3127239ee7b0786/54d4a2fa-8de2-4f32-9f72-81cc29bc1fa0/AIBP+Networking+Logo-no+globe.png";
  if (t.includes("online"))
    return "https://images.squarespace-cdn.com/content/6316ec4bc3127239ee7b0786/21c75b35-8746-4f91-9009-c56cd445cc4b/AIBP+Online+Logo-no+globe.png";
  return "https://images.squarespace-cdn.com/content/6316ec4bc3127239ee7b0786/ef35557f-6356-4770-9790-9c1aecda7f57/AIBP-Conference-%26-Exhibition-no-globe.png";
}

function getDetailsPathB(type) {
  var t = (type || "").toLowerCase();
  if (t.includes("report")) return "more-details-rp";
  if (t.includes("online")) return "more-details-ol";
  if (t.includes("networking")) return "more-details-nw";
  if (t.includes("conference") || t.includes("exhibition")) return "more-details-ce";
  return "more-details";
}

function renderCarouselB(events) {
  var container = document.getElementById("recommended-carousel-b");
  if (!container || !events.length) return;

  var slides = events
    .map(function (e) {
      var image = (e["Picture URL"] || "").trim();
      if (!image) image = getDefaultImageByEventType(e["Event Type"]);
      var fallback = getDefaultImageByEventType(e["Event Type"]);

      var eventUrl = (e["Event URL"] || "").trim();
      var href = eventUrl
        ? "https://www.aibp.sg/" + getDetailsPathB(e["Event Type"]) + "?eventUrl=" + encodeURIComponent(eventUrl)
        : "#";
      var targetAttr = eventUrl ? ' target="_blank" rel="noopener"' : "";

      return (
        '<a class="swiper-slide event-card" href="' + href + '"' + targetAttr + '>' +
        '<div class="event-image">' +
        '<img src="' + image + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + fallback + '\'">' +
        "</div>" +
        '<div class="event-info"><span class="more-details">More Details</span></div>' +
        "</a>"
      );
    })
    .join("");

  container.innerHTML =
    '<div class="swiper-container swiper-b">' +
    '<div class="swiper-wrapper">' + slides + "</div>" +
    '<div class="swiper-button-prev-b swiper-button-prev"></div>' +
    '<div class="swiper-button-next-b swiper-button-next"></div>' +
    "</div>";

  new Swiper(".swiper-b", {
    slidesPerView: 4,
    slidesPerGroup: 4,
    spaceBetween: 18,
    grabCursor: true,
    navigation: {
      nextEl: ".swiper-button-next-b",
      prevEl: ".swiper-button-prev-b",
    },
    breakpoints: {
      0: { slidesPerView: 1.2, slidesPerGroup: 1, spaceBetween: 12 },
      480: { slidesPerView: 2.2, slidesPerGroup: 2, spaceBetween: 14 },
      768: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 16 },
      1024: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 18 },
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  fetch(SHEET_URL_B)
    .then(function (r) { return r.json(); })
    .then(function (data) { renderCarouselB(data); })
    .catch(function (err) { console.error("Activities error:", err); });
});
