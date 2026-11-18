/* AURA Synth Bass — rolagem conceitual.
   Um único laço de rolagem (requestAnimationFrame) move a abertura, o zoom
   guiado pelo painel e a frase que acende palavra por palavra. */
(function () {
  "use strict";

  var DEMO_URL = "https://thiagorgalvao-sketch.github.io/SynthBass/?demo=1";
  var DEMO_ORIGIN = "https://thiagorgalvao-sketch.github.io";
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
    introDevice.style.transform = "translateY(" + (-p * vh * 0.38).toFixed(1) + "px)";
  }

  /* ---------- 2. Por dentro: regiões do painel (frações da imagem 1600x1000) ---------- */
  var tour = document.getElementById("por-dentro");
  var stage = document.getElementById("tour-stage");
  var tourImg = document.getElementById("tour-img");
  var caps = Array.prototype.slice.call(document.querySelectorAll(".tour-cap"));
  var bar = document.getElementById("tour-bar");
  // regiões em frações da imagem do painel (4:3), mesmas dos quadros nítidos
  var RATIO = 4 / 3;
  var REGIONS = [
    { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, // painel inteiro
    { x: 0.03, y: 0.05, w: 0.78, h: 0.17 }, // osciladores
    { x: 0.54, y: 0.20, w: 0.43, h: 0.15 }, // filtro
    { x: 0.03, y: 0.345, w: 0.94, h: 0.125 }, // LFO e envelopes
    { x: 0.60, y: 0.005, w: 0.39, h: 0.08 }, // pânico, cadeado, tela cheia
    { x: 0.00, y: 0.58, w: 1.00, h: 0.42 }  // pitch, mod e teclado
  ];

  // carrega os quadros nítidos quando o trecho se aproxima da tela
  var hd = Array.prototype.slice.call(document.querySelectorAll(".tour-hd"));
  function loadHd() {
    hd.forEach(function (img) {
      img.addEventListener("load", function () { img.classList.add("ready"); }, { once: true });
      img.src = img.getAttribute("data-src");
    });
  }
  if ("IntersectionObserver" in window) {
    var hdIo = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { loadHd(); hdIo.disconnect(); }
    }, { rootMargin: "100% 0px" });
    hdIo.observe(tour);
  } else { loadHd(); }
  var box = { W: 0, H: 0, bw: 0, bh: 0, left: 0, top: 0 };

  function layoutTour() {
    var W = stage.clientWidth, H = stage.clientHeight;
    var bw = Math.min(W - 40, (H - 112) * RATIO, 1100);
    var bh = bw / RATIO;
    box = { W: W, H: H, bw: bw, bh: bh, left: (W - bw) / 2, top: 88 + (H - 88 - bh) / 2 };
    tourImg.style.width = bw + "px";
    tourImg.style.height = bh + "px";
    tourImg.style.left = box.left + "px";
    tourImg.style.top = box.top + "px";
  }

  function camera(i) {
    var r = REGIONS[i];
    var availH = box.H - 88 - 16;                        // 88: navegação no topo
    var s = Math.min((box.W * 0.92) / (r.w * box.bw), (availH * 0.8) / (r.h * box.bh));
    s = i === 0 ? Math.min(s, 1) : clamp(s, 1, 4);
    var cx = (r.x + r.w / 2) * box.bw, cy = (r.y + r.h / 2) * box.bh;
    var targetY = 88 + availH / 2;
    return { s: s, tx: box.W / 2 - box.left - s * cx, ty: targetY - box.top - s * cy };
  }

  var activeCap = -1;
  function drawTour(r, vh) {
    var p = progress(r, vh);
    var t = p * (REGIONS.length - 1);
    var i = Math.min(Math.floor(t), REGIONS.length - 2);
    var f = t - i;
    // segura cada parada e move só no meio do trecho
    f = smooth(clamp((f - 0.3) / 0.4, 0, 1));
    var a = camera(i), b = camera(i + 1);
    var s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * f);
    var tx = a.tx + (b.tx - a.tx) * f, ty = a.ty + (b.ty - a.ty) * f;
    // O zoom muda o tamanho real da camada (não um scale()), para o navegador
    // redesenhar as imagens na resolução certa em vez de esticar uma cópia pequena.
    tourImg.style.width = (box.bw * s).toFixed(1) + "px";
    tourImg.style.height = (box.bh * s).toFixed(1) + "px";
    tourImg.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px)";
    bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    var c = Math.round(t);
    if (c !== activeCap) {
      caps.forEach(function (el, k) { el.classList.toggle("on", k === c); });
      activeCap = c;
    }
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
    var rTour = tour.getBoundingClientRect();
    var rStatement = statement.getBoundingClientRect();
    var rDownload = download.getBoundingClientRect();

    // 2. Só depois altera, e só o que está perto da tela
    if (!reduced) {
      if (near(rIntro, vh)) drawIntro(rIntro, vh);
      if (near(rTour, vh)) drawTour(rTour, vh);
      if (near(rStatement, vh)) drawStatement(rStatement, vh);
    }
    // a barra do celular aparece depois do zoom pelo painel, para não cobrir as legendas
    var show = rTour.bottom < vh * 0.5 && rDownload.top > vh;
    if (show !== dockShown) {
      dock.classList.toggle("on", show);
      dock.setAttribute("aria-hidden", show ? "false" : "true");
      dockLink.tabIndex = show ? 0 : -1;
      dockShown = show;
    }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  if (!reduced) layoutTour();
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", function () { if (!reduced) layoutTour(); request(); });
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

  /* ---------- Acabamento grafite / prateado ---------- */
  var picks = document.querySelectorAll("[data-pick]");
  Array.prototype.forEach.call(picks, function (btn) {
    btn.addEventListener("click", function () {
      var v = btn.getAttribute("data-pick");
      Array.prototype.forEach.call(picks, function (b) { b.setAttribute("aria-checked", b === btn ? "true" : "false"); });
      Array.prototype.forEach.call(document.querySelectorAll(".finish-img"), function (img) {
        img.classList.toggle("is-shown", img.getAttribute("data-finish") === v);
      });
    });
  });

  /* ---------- Demonstração em tela cheia ---------- */
  var sheet = document.getElementById("sheet");
  var sheetBody = document.getElementById("sheet-body");
  var loading = document.getElementById("sheet-loading");
  var sheetClose = document.getElementById("sheet-close");
  var demo = null, lastFocus = null, failTimer = null;
  /* Foco preso na demonstração: o resto da página fica inerte enquanto ela está aberta */
  function setInert(on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === sheet || el.tagName === "SCRIPT") return;
      if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
  }

  function openDemo() {
    lastFocus = document.activeElement;
    loading.innerHTML = 'Ligando o AURA <span class="cursor" aria-hidden="true"></span>';
    loading.hidden = false;
    demo = document.createElement("iframe");
    demo.src = DEMO_URL;
    demo.title = "AURA Synth Bass, demonstração tocável";
    demo.allow = "autoplay; midi; fullscreen";
    demo.addEventListener("load", function () { clearTimeout(failTimer); loading.hidden = true; demo.classList.add("ready"); });
    failTimer = setTimeout(function () {
      loading.textContent = "Não foi possível abrir a demonstração. Verifique a conexão e tente de novo.";
    }, 20000);
    sheetBody.appendChild(demo);
    sheet.classList.add("on");
    setInert(true);
    document.documentElement.style.overflow = "hidden";
    sheetClose.focus();
  }
  /* Celular em pé: botão "Deitar" gira a demonstração 90° para o teclado ficar na horizontal */
  var rotateBtn = document.getElementById("sheet-rotate");
  var rotateLabel = document.getElementById("sheet-rotate-label");
  function fitRotation() {
    sheet.style.setProperty("--vw", window.innerWidth + "px");
    sheet.style.setProperty("--vh", window.innerHeight + "px");
  }
  function setRotated(on) {
    fitRotation();
    sheet.classList.toggle("is-rotated", on);
    rotateBtn.setAttribute("aria-pressed", on ? "true" : "false");
    rotateLabel.textContent = on ? "Em pé" : "Deitar";
  }
  rotateBtn.addEventListener("click", function () {
    setRotated(!sheet.classList.contains("is-rotated"));
  });
  window.addEventListener("resize", function () { if (sheet.classList.contains("is-rotated")) fitRotation(); });

  function closeDemo() {
    if (!sheet.classList.contains("on")) return;
    clearTimeout(failTimer);
    setRotated(false);
    sheet.classList.remove("on");
    setInert(false);
    if (demo) { demo.remove(); demo = null; }
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-demo]"), function (b) { b.addEventListener("click", openDemo); });
  sheetClose.addEventListener("click", closeDemo);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDemo(); });
  window.addEventListener("message", function (e) {
    if (e.origin === DEMO_ORIGIN && e.data && e.data.aura === "close") closeDemo();
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
    ["topo", "por-dentro", "recursos", "duvidas", "baixar"].forEach(function (id) { spy.observe(document.getElementById(id)); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll(".rv"), function (n) { n.classList.add("on"); });
  }
})();
