/* SmartC iCrossWalk — скрипты сайта (без зависимостей) */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var nav = document.querySelector(".nav");
  var menu = document.querySelector(".nav__menu");
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link[data-target]"));

  /* ---------- Высота закреплённой шапки → CSS-переменная --header-space ----------
     Разделы начинаются с отступа этой высоты, поэтому при переходе из меню
     заголовок раздела не прячется под шапкой (на телефоне шапка выше). */
  var setHeaderSpace = function () {
    if (!nav) return;
    var bottom = Math.ceil(nav.getBoundingClientRect().bottom);
    root.style.setProperty("--header-space", bottom + "px");
  };
  setHeaderSpace();
  window.addEventListener("resize", setHeaderSpace);
  window.addEventListener("load", setHeaderSpace);

  /* ---------- Подсветка текущего раздела в меню при прокрутке ---------- */
  var sections = links.map(function (a) {
    return document.getElementById(a.getAttribute("data-target"));
  });
  var current = null;
  var lockUntil = 0; // пока идёт прокрутка по клику из меню, подсветку по скроллу не трогаем
  var setActive = function (link, instant) {
    if (link === current) return;
    if (current) current.classList.remove("is-active");
    current = link;
    if (!link) return;
    link.classList.add("is-active");
    // на узких экранах меню прокручивается вбок — держим активный пункт в поле зрения
    if (menu && menu.scrollWidth > menu.clientWidth) {
      var left = Math.max(0, link.offsetLeft - (menu.clientWidth - link.offsetWidth) / 2);
      if (instant) menu.scrollLeft = left;
      else menu.scrollTo({ left: left, behavior: "smooth" });
    }
  };

  /* ---------- Плавный переход к разделу по ссылкам вида #раздел ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fixTimer = null;
  var targetTop = function (el) {
    var margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + window.scrollY - margin;
  };
  var goTo = function (el) {
    window.scrollTo({ top: targetTop(el), behavior: reduceMotion ? "auto" : "smooth" });
    // если по пути догрузились картинки и раздел сместился — доводим точно
    clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      if (Math.abs(targetTop(el) - window.scrollY) > 3) window.scrollTo({ top: targetTop(el), behavior: "auto" });
    }, 1100);
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var link = null;
    links.forEach(function (l) { if (l.getAttribute("data-target") === id) link = l; });
    setActive(link, true);
    lockUntil = Date.now() + 1300;
    goTo(el);
    setTimeout(function () { onScroll(); }, 1350);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });
  // открыли сайт по ссылке с якорем (например, …/#founder) — после загрузки картинок встаём точно на раздел
  window.addEventListener("load", function () {
    var id = location.hash.slice(1);
    var el = id && document.getElementById(id);
    if (el) window.scrollTo({ top: targetTop(el), behavior: "auto" });
  });

  var ticking = false;
  var onScroll = function () {
    ticking = false;
    body.classList.toggle("is-scrolled", window.scrollY > 260);
    if (Date.now() < lockUntil) return;
    var line = (parseFloat(getComputedStyle(root).getPropertyValue("--header-space")) || 60) + 40;
    var active = null;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (s && s.getBoundingClientRect().top - line <= 0 && s.getBoundingClientRect().bottom - line > 0) {
        active = links[i];
      }
    }
    setActive(active);
  };
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Форма заявки ---------- */
  var form = document.querySelector("#request-form");
  if (form) {
    var statusEl = form.querySelector(".form-status");
    var submitBtn = form.querySelector('[type="submit"]');
    var phone = form.querySelector('[name="phone"]');

    if (phone) {
      phone.addEventListener("input", function () {
        phone.value = phone.value.replace(/[^\d+()\-\s]/g, "");
      });
    }

    var setStatus = function (text, ok) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.toggle("is-ok", !!ok);
      statusEl.classList.toggle("is-error", !ok);
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        var bad = !input.value.trim();
        if (input.name === "phone" && input.value.replace(/\D/g, "").length < 10) bad = true;
        input.classList.toggle("is-invalid", bad);
        if (bad) valid = false;
      });
      var email = form.querySelector('[name="email"]');
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add("is-invalid");
        valid = false;
      } else if (email) {
        email.classList.remove("is-invalid");
      }
      if (!valid) {
        setStatus("Пожалуйста, заполните обязательные поля: компания, Ф.И.О. и телефон.", false);
        return;
      }

      submitBtn.disabled = true;
      setStatus("Отправляем…", true);

      fetch(form.getAttribute("action"), {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (r) {
          return r.json().catch(function () { return { ok: false }; });
        })
        .then(function (res) {
          if (res && res.ok) {
            form.reset();
            setStatus("Спасибо! Заявка отправлена — мы свяжемся с вами в ближайшее время.", true);
          } else {
            setStatus("Не удалось отправить заявку. Позвоните нам: +7 912 926-33-03.", false);
          }
        })
        .catch(function () {
          setStatus("Не удалось отправить заявку. Позвоните нам: +7 912 926-33-03.", false);
        })
        .then(function () {
          submitBtn.disabled = false;
        });
    });

    form.querySelectorAll(".field__input").forEach(function (input) {
      input.addEventListener("input", function () { input.classList.remove("is-invalid"); });
    });
  }

  /* ---------- Лайтбокс для писем и сертификатов ---------- */
  var letters = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (letters.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Просмотр документа");
    box.innerHTML =
      '<img class="lightbox__img" alt="">' +
      '<button class="lightbox__btn lightbox__close" type="button" aria-label="Закрыть">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
      '<button class="lightbox__btn lightbox__prev" type="button" aria-label="Предыдущий">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4l-8 8 8 8"/></svg></button>' +
      '<button class="lightbox__btn lightbox__next" type="button" aria-label="Следующий">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4l8 8-8 8"/></svg></button>';
    document.body.appendChild(box);
    var img = box.querySelector(".lightbox__img");
    var current = 0;
    var lastFocus = null;

    var show = function (i) {
      current = (i + letters.length) % letters.length;
      var a = letters[current];
      img.src = a.getAttribute("href");
      img.alt = a.querySelector("img") ? a.querySelector("img").alt : "";
    };
    var open = function (i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add("is-open");
      document.documentElement.style.overflow = "hidden";
      box.querySelector(".lightbox__close").focus();
    };
    var close = function () {
      box.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    };

    letters.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        open(i);
      });
    });
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });
    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__prev").addEventListener("click", function () { show(current - 1); });
    box.querySelector(".lightbox__next").addEventListener("click", function () { show(current + 1); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }
})();
