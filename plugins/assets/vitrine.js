/* Vitrine AURA: revelação ao rolar. Sem JS (ou sem IntersectionObserver) tudo aparece. */
(function () {
  var els = document.querySelectorAll(".rv");
  if (!("IntersectionObserver" in window)) { [].forEach.call(els, function (n) { n.classList.add("on"); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  [].forEach.call(els, function (n) { io.observe(n); });
})();
