/* AURA Bass — rolagem conceitual.
   Um único laço de rolagem (requestAnimationFrame) move a abertura, o zoom
   e a frase que acende palavra por palavra. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  // progresso de uma seção alta (0 no topo, 1 no fim), a partir de um retângulo já medido
  function progress(r, vh) {
    var span = r.height - vh;
    return span > 0 ? clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
  }
  // a seção está na tela ou a até meia tela de distância?
  function near(r, vh) { return r.bottom > -vh * 0.5 && r.top < vh * 1.5; }

  /* ---------- 1. Abertura ---------- */
  var intro = document.getElementById("topo");
  var introCopy = document.getElementById("intro-copy");
  var introDevice = document.getElementById("intro-device");
  var introImg = introDevice.querySelector("img");

  function drawIntro(r, vh) {
    var p = ease(progress(r, vh));
    introCopy.style.opacity = String(1 - clamp(p * 1.6, 0, 1));
    introCopy.style.transform = "translateY(" + (-p * 80).toFixed(1) + "px) scale(" + (1 - p * 0.06).toFixed(3) + ")";
    introImg.style.transform = "rotateX(" + (28 * (1 - p)).toFixed(2) + "deg) scale(" + (0.9 + p * 0.1).toFixed(3) + ")";
    /* sobe o painel até ele caber inteiro na tela, também em janelas baixas */
    var top0 = introDevice.offsetTop, h0 = introDevice.offsetHeight;
    var need = top0 + h0 - (vh - 24);
    var dy = Math.min(Math.max(vh * 0.38, need), Math.max(0, top0 - 96));
    introDevice.style.transform = "translateY(" + (-p * dy).toFixed(1) + "px)";
  }

  /* ---------- 3. Frase que acende palavra por palavra ---------- */
  var statement = document.getElementById("statement");
  var words = [];
  (function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement("span");
          s.className = "w"; s.textContent = part;
          frag.appendChild(s); words.push(s);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) { split(n); }
    });
  })(statement);

  var litWords = -1;
  function drawStatement(r, vh) {
    // acende enquanto a frase cruza de 85% a 35% da altura da tela
    var p = clamp((vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.5), 0, 1);
    var n = Math.round(p * words.length);
    if (n === litWords) return;
    words.forEach(function (w, k) { w.classList.toggle("on", k < n); });
    litWords = n;
  }

  /* ---------- Laço de rolagem ---------- */
  var dock = document.getElementById("dock");
  var download = document.getElementById("baixar");
  var ticking = false;
  var dockShown = null;
  var dockLink = dock.querySelector("a");
  function frame() {
    ticking = false;
    // 1. Mede tudo primeiro (nenhuma alteração entre as medições, então o
    //    navegador calcula o layout uma vez só por quadro)
    var vh = window.innerHeight;
    var rIntro = intro.getBoundingClientRect();
    var rStatement = statement.getBoundingClientRect();
    var rDownload = download.getBoundingClientRect();

    // 2. Só depois altera, e só o que está perto da tela
    if (!reduced) {
      if (near(rIntro, vh)) drawIntro(rIntro, vh);
      if (near(rStatement, vh)) drawStatement(rStatement, vh);
    }
    // a barra do celular aparece depois da abertura
    var show = rIntro.bottom < vh * 0.3 && rDownload.top > vh;
    if (show !== dockShown) {
      dock.classList.toggle("on", show);
      dock.setAttribute("aria-hidden", show ? "false" : "true");
      dockLink.tabIndex = show ? 0 : -1;
      dockShown = show;
    }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  frame();

  /* ---------- Links internos ----------
     Rolagem suave só para trechos curtos. Num pulo longo (ex.: do topo até o
     preço), a página salta para perto do destino e desliza só o final, em vez
     de "tocar" a abertura e o passeio inteiro no caminho. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    var vh = window.innerHeight;
    var top = target.getBoundingClientRect().top + window.scrollY;
    var dist = top - window.scrollY;
    if (!reduced && Math.abs(dist) > vh * 1.5) {
      window.scrollTo({ top: top - Math.sign(dist) * vh * 0.6, behavior: "instant" });
    }
    window.scrollTo({ top: top, behavior: reduced ? "instant" : "smooth" });
    if (history.pushState) history.pushState(null, "", "#" + id);
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  /* ---------- Sistema recomendado ---------- */
  var ua = navigator.userAgent;
  var touch = /Android|iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var plat = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "") + " " + ua;
  var os = touch ? "" : /Win/.test(plat) ? "win" : /Mac/.test(plat) ? "mac" : "";
  if (touch) document.getElementById("mobile-note").hidden = false;
  if (os) { var card = document.querySelector('.os-card[data-os="' + os + '"]'); if (card) card.classList.add("rec"); }

  /* ---------- Revelação ao rolar e link ativo ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("on"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(document.querySelectorAll(".rv"), function (n) { io.observe(n); });

    var navLinks = document.querySelectorAll(".nav-links a");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(navLinks, function (a) {
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id ? "true" : "false");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["topo", "recursos", "duvidas", "baixar"].forEach(function (id) { spy.observe(document.getElementById(id)); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll(".rv"), function (n) { n.classList.add("on"); });
  }
})();
