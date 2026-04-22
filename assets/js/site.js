(function () {
  document.body.classList.add("js-enhanced");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isPhoneViewport = () => window.matchMedia("(max-width: 640px)").matches;

  const goldCtaOptions = window.GOLD_CTA_OPTIONS || {};
  const goldCtaState = window.GOLD_CTA_STATE || "register";
  const activeGoldCta = goldCtaOptions[goldCtaState] || goldCtaOptions.register;

  if (activeGoldCta) {
    document.querySelectorAll("[data-gold-cta]").forEach((link) => {
      link.textContent = activeGoldCta.label;
      link.href = activeGoldCta.href;

      if (goldCtaState === "register") {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    });
  }

  const header = document.getElementById("siteHeader");
  const mainContent = document.getElementById("main-content");
  const siteFooter = document.querySelector(".site-footer");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const brandEvolve = document.getElementById("brandEvolve");
  let brandTimeouts = [];
  let hasAnimatedBrandOnPhone = false;

  function clearBrandTimeouts() {
    brandTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    brandTimeouts = [];
  }

  function initBrandEvolve() {
    if (!brandEvolve) return;

    clearBrandTimeouts();

    const line = brandEvolve.querySelector(".brand-evolve-line");
    const vTail = brandEvolve.querySelector(".be-tail-v");
    const rTail = brandEvolve.querySelector(".be-tail-r");
    const rAnchor = brandEvolve.querySelector(".be-word-r .be-anchor");
    const vChars = Array.from(brandEvolve.querySelectorAll(".be-tail-v .be-char"));
    const rChars = Array.from(brandEvolve.querySelectorAll(".be-tail-r .be-char"));
    const iChars = Array.from(brandEvolve.querySelectorAll(".be-tail-i .be-char"));

    if (!line || !vTail || !rTail || !rAnchor) return;

    const styles = window.getComputedStyle(line);
    const gapPx = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const fontSizePx = parseFloat(styles.fontSize || "0") || 0;
    const overlapPx = fontSizePx * 0.09;
    const rAnchorWidth = rAnchor.getBoundingClientRect().width;

    const shiftR = vTail.getBoundingClientRect().width + gapPx + overlapPx;
    const shiftRStart = shiftR + (rAnchorWidth * 0.86);
    const shiftICompact = shiftR + rTail.getBoundingClientRect().width + gapPx + overlapPx;
    const shiftIStart = shiftICompact + (rAnchorWidth * 0.86);

    brandEvolve.style.setProperty("--shift-r", `${shiftR}px`);
    brandEvolve.style.setProperty("--shift-r-start", `${shiftRStart}px`);
    brandEvolve.style.setProperty("--shift-i-compact", `${shiftICompact}px`);
    brandEvolve.style.setProperty("--shift-i-start", `${shiftIStart}px`);

    const clearChars = () => {
      [...vChars, ...rChars, ...iChars].forEach((char) => char.classList.remove("is-in"));
    };

    const revealTrain = (chars, delay, step) => {
      chars.forEach((char, index) => {
        const timeoutId = window.setTimeout(() => {
          char.classList.add("is-in");
        }, delay + (index * step));
        brandTimeouts.push(timeoutId);
      });
    };

    clearChars();
    brandEvolve.classList.add("is-ready");

    const showFullBrand = () => {
      brandEvolve.classList.remove("is-v", "is-vr", "is-vri");
      brandEvolve.classList.add("is-full");
      [...vChars, ...rChars, ...iChars].forEach((char) => char.classList.add("is-in"));
    };

    if (prefersReducedMotion || (isPhoneViewport() && hasAnimatedBrandOnPhone)) {
      showFullBrand();
      return;
    }

    if (isPhoneViewport()) {
      hasAnimatedBrandOnPhone = true;
    }

    brandEvolve.classList.remove("is-vr", "is-vri", "is-full");
    brandEvolve.classList.add("is-v");

    brandTimeouts.push(window.setTimeout(() => {
      brandEvolve.classList.remove("is-v", "is-vri", "is-full");
      brandEvolve.classList.add("is-vr");
    }, 520));

    brandTimeouts.push(window.setTimeout(() => {
      brandEvolve.classList.remove("is-v", "is-vr", "is-full");
      brandEvolve.classList.add("is-vri");
    }, 1220));

    brandTimeouts.push(window.setTimeout(() => {
      brandEvolve.classList.remove("is-v", "is-vr", "is-vri");
      brandEvolve.classList.add("is-full");
      revealTrain(vChars, 100, 78);
      revealTrain(rChars, 100, 74);
      revealTrain(iChars, 100, 74);
    }, 2220));
  }

  if (brandEvolve) {
    initBrandEvolve();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!isPhoneViewport()) {
          initBrandEvolve();
        }
      });
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (isPhoneViewport()) {
        return;
      }

      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(initBrandEvolve, 120);
    });
  }

  const menuToggle = document.getElementById("menuToggle");
  const mobilePanel = document.getElementById("mobilePanel");
  const menuClose = document.getElementById("menuClose");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const inertTargets = [mainContent, siteFooter].filter(Boolean);
  let lastFocusedElement = null;
  let backdropHideTimer = null;

  if (menuToggle && mobilePanel) {
    const mobileSubnavToggle = mobilePanel.querySelector(".mobile-subnav-toggle");
    const mobileSubnav = mobilePanel.querySelector("#mobileSubnavUpcoming");

    const setMobileSubnavState = (isExpanded) => {
      if (!mobileSubnavToggle || !mobileSubnav) return;
      mobileSubnavToggle.setAttribute("aria-expanded", String(isExpanded));
      mobileSubnav.hidden = !isExpanded;
    };

    if (mobileSubnavToggle && mobileSubnav) {
      setMobileSubnavState(mobileSubnavToggle.getAttribute("aria-expanded") === "true");

      mobileSubnavToggle.addEventListener("click", () => {
        const isExpanded = mobileSubnavToggle.getAttribute("aria-expanded") === "true";
        setMobileSubnavState(!isExpanded);
      });
    }

    const getFocusableElements = () =>
      Array.from(
        mobilePanel.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.hasAttribute("disabled"));

    const setMenuState = (isOpen, options = {}) => {
      const { returnFocus = true } = options;
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      mobilePanel.setAttribute("aria-hidden", String(!isOpen));

      if (menuBackdrop) {
        window.clearTimeout(backdropHideTimer);
        if (isOpen) {
          menuBackdrop.hidden = false;
        }
      }

      document.body.classList.toggle("menu-open", isOpen);

      inertTargets.forEach((target) => {
        if (isOpen) {
          target.setAttribute("inert", "");
        } else {
          target.removeAttribute("inert");
        }
      });

      if (isOpen) {
        lastFocusedElement = document.activeElement;
        window.requestAnimationFrame(() => {
          const [firstFocusable] = getFocusableElements();
          (firstFocusable || mobilePanel).focus();
        });
      } else {
        if (menuBackdrop) {
          backdropHideTimer = window.setTimeout(() => {
            if (menuToggle.getAttribute("aria-expanded") !== "true") {
              menuBackdrop.hidden = true;
            }
          }, 350);
        }

        if (returnFocus) {
          (lastFocusedElement || menuToggle).focus();
        }
      }
    };

    const openMenu = () => setMenuState(true);
    const closeMenu = (options) => setMenuState(false, options);

    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        closeMenu({ returnFocus: false });
      } else {
        openMenu();
      }
    });

    if (menuClose) {
      menuClose.addEventListener("click", () => closeMenu());
    }

    if (menuBackdrop) {
      menuBackdrop.addEventListener("click", () => closeMenu());
    }

    mobilePanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu({ returnFocus: false }));
    });

    document.addEventListener("keydown", (event) => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = getFocusableElements();
        if (!focusableElements.length) {
          event.preventDefault();
          mobilePanel.focus();
          return;
        }

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1180 && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu({ returnFocus: false });
      }
    });
  }

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => io.observe(el));
  }

  if (!prefersReducedMotion && supportsFinePointer) {
    const tiltItems = document.querySelectorAll("[data-tilt]");
    tiltItems.forEach((item) => {
      let rafId = null;

      const reset = () => {
        cancelAnimationFrame(rafId);
        item.style.transform = "";
      };

      item.addEventListener("mousemove", (e) => {
        const rect = item.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        const rotateY = (px - 0.5) * 10;
        const rotateX = (0.5 - py) * 10;

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          item.style.transform =
            "perspective(1200px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-8px)";
        });
      });

      item.addEventListener("mouseleave", reset);
      item.addEventListener("blur", reset, true);
    });

    const sceneWrap = document.getElementById("sceneWrap");
    const heroScene = document.getElementById("heroScene");

    if (sceneWrap && heroScene) {
      let rafId = null;

      heroScene.addEventListener("mousemove", (e) => {
        const rect = heroScene.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        const rotateY = (px - 0.5) * 12;
        const rotateX = (0.5 - py) * 10;

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          sceneWrap.style.transform =
            "rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
        });
      });

      heroScene.addEventListener("mouseleave", () => {
        sceneWrap.style.transform = "rotateX(0deg) rotateY(0deg)";
      });
    }
  }
})();

(function () {
  const track = document.getElementById('institutionRotatorTrack');
  if (!track) return;

  let institutions = [];
  try {
    institutions = JSON.parse(track.dataset.institutions || '[]');
  } catch (error) {
    return;
  }

  if (!institutions.length) return;

  const VISIBLE_COUNT = 10;
  const STEP_SIZE = 5;
  const INTERVAL = 8000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getWindow(items, start, count) {
    const result = [];
    for (let i = 0; i < count; i += 1) {
      result.push(items[(start + i) % items.length]);
    }
    return result;
  }

  const pages = [];
  let startIndex = 0;
  const seen = new Set();

  while (!seen.has(startIndex)) {
    seen.add(startIndex);
    pages.push(getWindow(institutions, startIndex, Math.min(VISIBLE_COUNT, institutions.length)));
    startIndex = (startIndex + STEP_SIZE) % institutions.length;
  }

  if (!pages.length) return;

  pages.forEach((pageItems, index) => {
    const page = document.createElement('div');
    page.className = 'institution-rotator-page';
    if (index === 0) page.classList.add('is-active');

    pageItems.forEach((name) => {
      const pill = document.createElement('span');
      pill.className = 'pill institution-pill';
      pill.textContent = name;
      page.appendChild(pill);
    });

    track.appendChild(page);
  });

  const pageEls = Array.from(track.querySelectorAll('.institution-rotator-page'));
  if (pageEls.length <= 1 || reduceMotion) {
    if (pageEls[0]) pageEls[0].classList.add('is-active');
    return;
  }

  let current = 0;
  let timer = null;

  function showPage(nextIndex) {
    pageEls[current].classList.remove('is-active');
    pageEls[nextIndex].classList.add('is-active');
    current = nextIndex;
  }

  function startRotation() {
    stopRotation();
    timer = window.setInterval(() => {
      const next = (current + 1) % pageEls.length;
      showPage(next);
    }, INTERVAL);
  }

  function stopRotation() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  track.addEventListener('mouseenter', stopRotation);
  track.addEventListener('mouseleave', startRotation);
  track.addEventListener('focusin', stopRotation);
  track.addEventListener('focusout', startRotation);

  startRotation();
})();
