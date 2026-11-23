/* The Gladden line is drawn from data/family.json.
   Living people render as name, relation, optional birthplace, and sources.
   Paragraphs, traditions, ages, addresses, and photos are never shown for them. */

(function () {
  "use strict";

  var CONFIDENCE = {
    proven: "Proven",
    probable: "Probable",
    unproven: "Unproven"
  };

  var LIVING_FIELDS = {
    id: true,
    name: true,
    living: true,
    confidence: true,
    relation: true,
    birthplace: true,
    sources: true
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastFocus = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var dataUrl = new URL("data/family.json", document.baseURI);
    fetch(dataUrl.href)
      .then(function (response) {
        if (!response.ok) throw new Error("missing");
        return response.json();
      })
      .then(render)
      .catch(function () {
        showError("The family record could not be read from data/family.json.");
      });
  }

  function render(data) {
    renderPreface(data);
    renderLine(data);
    renderSearching(data);
    renderPlaces(data);
    renderRecords(data);
    renderColophon(data);
    var line = document.getElementById("line");
    if (line) line.setAttribute("aria-busy", "false");
    setupMotion();
    setupViewer();
    setupPrint();
  }

  function renderPreface(data) {
    var host = document.getElementById("preface-body");
    host.replaceChildren();
    (data.meta && data.meta.intro ? data.meta.intro : []).forEach(function (paragraph) {
      host.append(el("p", {}, [paragraph]));
    });
  }

  function renderLine(data) {
    var section = document.getElementById("line");
    var loading = document.getElementById("line-loading");
    if (loading) loading.remove();

    var generations = data.line || [];
    var jump = el("ol", { class: "jump" });
    generations.forEach(function (generation) {
      var item = el("li", {}, [
        el("a", { href: "#" + safeId(generation.id) }, [generation.short || generation.title || "Untitled"])
      ]);
      jump.append(item);
    });
    section.append(jump);

    var list = el("ol", { class: "line" });
    list.setAttribute("aria-label", "Family line, from the children back to the earliest records");
    var rail = el("div", { class: "rail", "aria-hidden": "true" });
    var fill = el("div", { class: "rail-fill", id: "rail-fill", "aria-hidden": "true" });
    list.append(rail, fill);

    generations.forEach(function (generation, index) {
      list.append(renderGeneration(generation, index));
    });
    section.append(list);
  }

  function renderGeneration(generation, index) {
    var confidence = confidenceKey(generation.confidence);
    var item = el("li", {
      class: "node reveal",
      "data-confidence": confidence,
      "data-placement": generation.placement === "beside" ? "beside" : "spine"
    });
    item.style.transitionDelay = reduceMotion ? "0ms" : Math.min(index, 8) * 40 + "ms";
    item.append(el("div", { class: "node-mark", "aria-hidden": "true" }));

    var article = el("article", { class: "card", id: safeId(generation.id) });
    var details = el("details");
    var summary = el("summary");
    summary.append(el("p", { class: "kicker" }, [generation.kicker || ""]));

    var top = el("div", { class: "card-top" });
    top.append(el("h3", {}, [generation.title || "Untitled"]));
    top.append(badge(confidence));
    summary.append(top);

    if (generation.summary) summary.append(el("p", { class: "summary" }, [generation.summary]));
    summary.append(moreControl());
    details.append(summary);

    var body = el("div", { class: "card-body" });
    renderPeople(body, generation.people || [], confidence);
    renderSee(body, generation.see);
    details.append(body);
    article.append(details);
    item.append(article);
    return item;
  }

  function renderPeople(body, people, cardConfidence) {
    var publicPeople = people.map(publicPerson).filter(function (person) {
      return person.name;
    });
    if (!publicPeople.length) return;

    if (publicPeople.every(function (person) { return person.living; })) {
      renderLivingGroup(body, publicPeople);
      return;
    }

    publicPeople.forEach(function (person) {
      body.append(renderPerson(person, cardConfidence));
    });
  }

  function renderLivingGroup(body, people) {
    var hasBirthplace = people.some(function (person) { return person.birthplace; });
    var note = el("p", { class: "living-chip" }, [
      hasBirthplace ? "Living · name only, aside from a birthplace" : "Living · name only"
    ]);
    body.append(note);
    people.forEach(function (person) {
      var block = el("div", { class: "person", id: safeId(person.id) });
      block.append(el("h4", {}, [person.name]));
      if (person.relation) block.append(el("p", { class: "relation" }, [person.relation]));
      if (person.birthplace) block.append(el("p", { class: "birthplace" }, [person.birthplace]));
      body.append(block);
    });
    var sources = [];
    people.forEach(function (person) {
      (person.sources || []).forEach(function (source) {
        if (sources.indexOf(source) === -1) sources.push(source);
      });
    });
    renderSources(body, sources);
  }

  function renderPerson(person, cardConfidence) {
    var block = el("div", { class: "person", id: safeId(person.id) });
    block.append(el("h4", {}, [person.name]));
    if (person.confidence && person.confidence !== cardConfidence) {
      block.append(badge(confidenceKey(person.confidence)));
    }
    if (person.relation) block.append(el("p", { class: "relation" }, [person.relation]));
    (person.paragraphs || []).forEach(function (paragraph) {
      block.append(el("p", {}, [paragraph]));
    });
    if (person.tradition) {
      var quote = el("blockquote", { class: "tradition" });
      quote.append(el("span", { class: "label" }, [person.traditionLabel || "Family tradition"]));
      quote.append(el("p", {}, [person.tradition]));
      block.append(quote);
    }
    renderSources(block, person.sources || []);
    return block;
  }

  function renderSources(parent, sources) {
    if (!sources.length) return;
    parent.append(el("p", { class: "block-label" }, ["Sources"]));
    var list = el("ul", { class: "sources" });
    sources.forEach(function (source) {
      list.append(el("li", {}, [source]));
    });
    parent.append(list);
  }

  function renderSee(parent, links) {
    var safe = (links || []).filter(function (link) {
      return link && link.label && /^#[a-z0-9-]+$/.test(link.href || "");
    });
    if (!safe.length) return;
    parent.append(el("p", { class: "block-label" }, ["In this record"]));
    var list = el("ul", { class: "see" });
    safe.forEach(function (link) {
      list.append(el("li", {}, [el("a", { href: link.href }, [link.label])]));
    });
    parent.append(list);
  }

  function renderSearching(data) {
    var section = document.getElementById("searching");
    var searching = data.searching || {};
    if (searching.lede) section.append(el("p", { class: "search-lede" }, [searching.lede]));
    (searching.sections || []).forEach(function (block) {
      var article = el("article", { class: "search-block reveal", id: safeId(block.id) });
      if (block.mark) article.append(el("p", { class: "mark-label" }, [block.mark]));
      article.append(el("h3", {}, [block.title || ""]));
      (block.paragraphs || []).forEach(function (paragraph) {
        article.append(el("p", {}, [paragraph]));
      });
      section.append(article);
    });
  }

  function renderPlaces(data) {
    var section = document.getElementById("places");
    if (data.placesIntro) section.append(el("p", {}, [data.placesIntro]));
    renderSee(section, data.placesSee);

    var list = el("div", { class: "place-list" });
    (data.places || []).forEach(function (place) {
      list.append(renderPlace(place));
    });
    section.append(list);
  }

  function renderPlace(place) {
    var article = el("article", { class: "place reveal", id: "place-" + safeId(place.id) });
    article.append(el("h3", {}, [place.name || "Place"]));
    if (place.detail) article.append(el("p", {}, [place.detail]));
    if (place.estimateNote) article.append(el("p", {}, [place.estimateNote]));

    var coords = el("p", { class: "coords" });
    if (place.approximate) coords.append(el("span", { class: "approx" }, ["Approximate"]));
    if (place.lat && place.lng) {
      coords.append(el("span", { class: "pair" }, [place.lat + ", " + place.lng]));
      article.append(coords);
      var href = mapUrl(place.lat, place.lng);
      if (href) {
        article.append(el("p", {}, [
          el("a", {
            class: "map-link",
            href: href,
            target: "_blank",
            rel: "noopener noreferrer"
          }, ["Open in Google Maps"])
        ]));
      }
    }
    return article;
  }

  function renderRecords(data) {
    var section = document.getElementById("records");
    section.append(el("p", {}, [
      "Pages from the research. Select a photograph to enlarge it."
    ]));
    var gallery = el("div", { class: "gallery" });
    (data.records || []).forEach(function (record) {
      var src = safeAsset(record.src);
      if (!src) return;
      var figure = el("figure", {
        class: "record reveal" + (record.wide ? " wide" : ""),
        id: "record-" + safeId(record.id)
      });
      var button = el("button", { type: "button" });
      button.setAttribute("aria-label", "Enlarge " + (record.title || "record"));
      var image = el("img", {
        src: src,
        alt: record.alt || record.title || "",
        loading: "lazy",
        decoding: "async"
      });
      if (record.width) image.setAttribute("width", String(record.width));
      if (record.height) image.setAttribute("height", String(record.height));
      button.append(image);
      button.append(el("span", { class: "enlarge-hint" }, ["Enlarge"]));
      button.addEventListener("click", function () {
        openViewer(record, src);
      });
      figure.append(button);
      var caption = el("figcaption");
      caption.append(el("h3", {}, [record.title || "Record"]));
      if (record.caption) caption.append(el("p", {}, [record.caption]));
      figure.append(caption);
      gallery.append(figure);
    });
    section.append(gallery);
  }

  function renderColophon(data) {
    var updated = data.meta && data.meta.updated ? data.meta.updated : "";
    var text = "Kept by Gene Gladden.";
    if (updated) text += " Research set down on " + updated + ".";
    text += " The record is meant to grow. Add a person or a page by editing data/family.json, then commit that change to main.";
    document.getElementById("colophon-text").textContent = text;
  }

  function setupMotion() {
    var nodes = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-in"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 40px 0px" });

    nodes.forEach(function (node) { observer.observe(node); });

    var ornament = document.getElementById("hero-ornament");
    var fill = document.getElementById("rail-fill");
    var list = document.querySelector(".line");

    function onScroll() {
      if (ornament) {
        var shift = Math.min(window.scrollY, 480) * 0.12;
        ornament.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0)";
      }
      if (fill && list) {
        var rect = list.getBoundingClientRect();
        var total = list.offsetHeight || 1;
        var traveled = Math.min(total, Math.max(0, window.innerHeight * 0.42 - rect.top));
        fill.style.height = (traveled / total) * 100 + "%";
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupViewer() {
    var dialog = document.getElementById("viewer");
    var close = document.getElementById("viewer-close");
    if (!dialog || typeof dialog.showModal !== "function") return;

    close.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", function () {
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
  }

  function openViewer(record, src) {
    var dialog = document.getElementById("viewer");
    if (!dialog || typeof dialog.showModal !== "function") {
      window.open(src, "_blank", "noopener");
      return;
    }
    lastFocus = document.activeElement;
    document.getElementById("viewer-title").textContent = record.title || "Record";
    document.getElementById("viewer-caption").textContent = record.caption || "";
    var image = document.getElementById("viewer-img");
    image.src = src;
    image.alt = record.alt || record.title || "";
    dialog.showModal();
  }

  function setupPrint() {
    window.addEventListener("beforeprint", function () {
      document.querySelectorAll("details").forEach(function (details) {
        details.dataset.wasOpen = details.open ? "1" : "0";
        details.open = true;
      });
    });
    window.addEventListener("afterprint", function () {
      document.querySelectorAll("details").forEach(function (details) {
        details.open = details.dataset.wasOpen === "1";
      });
    });
  }

  function showError(message) {
    var line = document.getElementById("line");
    var loading = document.getElementById("line-loading");
    if (loading) loading.remove();
    line.append(el("p", { class: "error" }, [message]));
    line.setAttribute("aria-busy", "false");
  }

  function publicPerson(person) {
    if (!person || !person.living) return person || {};
    var copy = {};
    Object.keys(LIVING_FIELDS).forEach(function (key) {
      if (person[key] != null) copy[key] = person[key];
    });
    return copy;
  }

  function confidenceKey(value) {
    return CONFIDENCE[value] ? value : "unproven";
  }

  function badge(key) {
    return el("p", { class: "badge " + key }, [CONFIDENCE[key]]);
  }

  function moreControl() {
    var more = el("p", { class: "more" });
    more.append(el("span", { class: "more-closed" }, ["Details and sources"]));
    more.append(el("span", { class: "more-open" }, ["Close"]));
    return more;
  }

  function mapUrl(lat, lng) {
    if (!/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(lng)) return "";
    return "https://www.google.com/maps?q=" + lat + "," + lng + "&t=k";
  }

  function safeAsset(src) {
    if (typeof src !== "string") return "";
    if (!/^assets\/[a-z0-9/._-]+$/i.test(src) || src.indexOf("..") !== -1) return "";
    return src;
  }

  function safeId(value) {
    var text = String(value || "entry").toLowerCase();
    var cleaned = text.replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    return cleaned || "entry";
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }
})();
