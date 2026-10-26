/* SmartC iCrossWalk — скрипты сайта (без зависимостей) */
(function () {
  "use strict";

  var root = document.documentElement;
  var nav = document.querySelector(".nav");
  var menu = document.querySelector(".nav__menu");

  /* ---------- Высота закреплённой шапки → CSS-переменная --header-space ----------
     Содержимое страниц начинается с отступа этой высоты, поэтому ничего
     не прячется под шапкой (на телефоне шапка выше — в два ряда). */
  var setHeaderSpace = function () {
    if (!nav) return;
    var bottom = Math.ceil(nav.getBoundingClientRect().bottom);
    root.style.setProperty("--header-space", bottom + "px");
  };
  setHeaderSpace();
  window.addEventListener("resize", setHeaderSpace);
  window.addEventListener("load", setHeaderSpace);

  /* ---------- Меню-вкладки: на узких экранах полоска листается вбок ----------
     Текущую вкладку сразу показываем в поле зрения. */
  var centerActive = function () {
    var active = menu && menu.querySelector(".nav__link.is-active");
    if (!active || menu.scrollWidth <= menu.clientWidth) return;
    menu.scrollLeft = Math.max(0, active.offsetLeft - (menu.clientWidth - active.offsetWidth) / 2);
  };
  centerActive();
  window.addEventListener("resize", centerActive);

  /* ---------- Плавная прокрутка к якорю на той же странице (например, «Оставить заявку» на главной) ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fixTimer = null;
  var targetTop = function (el) {
    var margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + window.scrollY - margin;
  };
  var jump = function (el) { window.scrollTo(0, Math.round(targetTop(el))); };   // мгновенно
  var goTo = function (el) {
    if (reduceMotion) { jump(el); return; }
    try {
      window.scrollTo({ top: targetTop(el), behavior: "smooth" });
    } catch (err) {
      jump(el);
    }
    // страховка: если плавная прокрутка не сработала или по пути догрузились картинки — доводим мгновенно
    clearTimeout(fixTimer);
    fixTimer = setTimeout(function () {
      if (Math.abs(targetTop(el) - window.scrollY) > 3) jump(el);
    }, 1100);
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    goTo(el);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });
  // пришли по ссылке с якорем (например, index.html#request) — после загрузки картинок встаём точно на блок
  window.addEventListener("load", function () {
    var id = location.hash.slice(1);
    var el = id && document.getElementById(id);
    if (el) jump(el);
  });

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
