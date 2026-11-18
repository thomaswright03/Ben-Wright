// Ben's ages, all worked out from his birthday so they stay right every year.
// Current age fills every [data-age]; each timeline year shows the ages he was
// during that year (before and after his May birthday).
(function () {
  const BIRTH = { y: 2011, m: 5, d: 21 };
  const now = new Date();
  const hadBirthday = now.getMonth() + 1 > BIRTH.m || (now.getMonth() + 1 === BIRTH.m && now.getDate() >= BIRTH.d);
  const age = now.getFullYear() - BIRTH.y - (hadBirthday ? 0 : 1);
  document.querySelectorAll("[data-age]").forEach(el => { el.textContent = age; });
  document.querySelectorAll(".tl-year[data-year]").forEach(el => {
    const y = +el.dataset.year, tag = el.querySelector(".tl-age");
    if (!tag) return;
    const before = y - BIRTH.y - 1, after = y - BIRTH.y;
    // In the current year, only show the birthday age once it has happened.
    tag.textContent = y === now.getFullYear() && !hadBirthday ? "Age " + before : "Age " + before + "–" + after;
  });
})();
