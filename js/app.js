(function () {
  const cfg = window.MONMON || window.AZRI_CONFIG || {};
  const HUB = (cfg.hub || "").trim();
  const FAV_KEY = "monmon-favs";
  const LIKE_KEY = "monmon-liked";
  const DEVICE_KEY = "monmon-device";
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-7.4C.7 11.4.8 8.2 3.1 6.4c2-1.6 4.8-1.1 6.3.7L12 9.2l2.6-2.1c1.5-1.8 4.3-2.3 6.3-.7 2.3 1.8 2.4 5 .43 7.2C18.7 16.65 12 21 12 21z"/></svg>';

  const BLOCK = [
    "anjing","anjir","anjeng","bangsat","bangke","bego","bodoh","brengsek","goblok","tolol","idiot","kampret","keparat","setan","sialan","tai","taik","pantek","jancok","jancuk","asu","kimak","puki","itil","kontol","memek","ngentot","entot","ngewe","colmek","toket","tetek","pentil","penis","vagina","kelamin","seks","sex","sexy","porn","porno","bokep","bugil","telanjang","fuck","shit","bitch","asshole","bastard","dick","pussy","whore","slut","damn","faggot","nigger","stupid"
  ];

  const STARTER = [
    { id: "demo-2048", title: "2048", url: "https://gabrielecirulli.github.io/2048/", description: "Gabungkan angka sampai dapat 2048. Puzzle klasik yang ringan.", thumbnail: "", category: "Puzzle", author: "Koleksi", createdAt: "2026-01-01T00:00:00.000Z", likes: 0, commentCount: 0 },
    { id: "demo-hextris", title: "Hextris", url: "https://hextris.io/", description: "Tetris versi heksagon. Main cepat di HP maupun desktop.", thumbnail: "", category: "Arcade", author: "Koleksi", createdAt: "2026-01-02T00:00:00.000Z", likes: 0, commentCount: 0 },
    { id: "demo-pacman", title: "Pac-Man", url: "https://pacman.platzh1rsch.ch/", description: "Klasik makan titik, hindari hantu. Cocok buat istirahat sebentar.", thumbnail: "", category: "Arcade", author: "Koleksi", createdAt: "2026-01-03T00:00:00.000Z", likes: 0, commentCount: 0 }
  ];

  const els = {
    grid: document.getElementById("grid"),
    search: document.getElementById("search"),
    chips: document.getElementById("chips"),
    count: document.getElementById("countGames"),
    favCount: document.getElementById("countFavs"),
    status: document.getElementById("hubStatus"),
    owner: document.getElementById("ownerName"),
    modalBg: document.getElementById("modalBg"),
    form: document.getElementById("addForm"),
    toast: document.getElementById("toast"),
    randomBtn: document.getElementById("randomBtn"),
    categorySelect: document.getElementById("category"),
    commentBg: document.getElementById("commentBg"),
    commentList: document.getElementById("commentList"),
    commentForm: document.getElementById("commentForm"),
    commentTitle: document.getElementById("commentTitle"),
    donateBg: document.getElementById("donateBg"),
    donateHint: document.getElementById("donateHint")
  };

  let games = [];
  let activeCategory = "Semua";
  let showFavOnly = false;

  function deviceId() {
    var id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = "m" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function toast(msg, type) {
    els.toast.textContent = msg;
    els.toast.className = "toast show " + (type || "");
    setTimeout(function () { els.toast.classList.remove("show"); }, 2600);
  }

  function getList(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch (e) { return []; }
  }
  function setList(key, list) { localStorage.setItem(key, JSON.stringify(list)); }
  function hasItem(key, id) { return getList(key).indexOf(id) !== -1; }
  function toggleItem(key, id, on) {
    var list = getList(key);
    var i = list.indexOf(id);
    if (on && i === -1) list.push(id);
    if (!on && i !== -1) list.splice(i, 1);
    setList(key, list);
  }

  function isFav(id) { return hasItem(FAV_KEY, id); }
  function isLiked(id) { return hasItem(LIKE_KEY, id); }

  function normalize(text) {
    return String(text || "").toLowerCase()
      .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
      .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
      .replace(/[@$]/g, "a")
      .replace(/[^a-z0-9\s]/g, " ");
  }

  function isBlocked(text) {
    var blob = " " + normalize(text) + " ";
    return BLOCK.some(function (w) {
      return blob.indexOf(" " + w + " ") !== -1;
    });
  }

  function initials(title) {
    return String(title || "G").trim().slice(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function setStatus(live, label) {
    els.status.textContent = label;
    var dot = document.getElementById("statusDot");
    if (live) dot.classList.add("live");
    else dot.classList.remove("live");
  }

  function updateStats() {
    els.count.textContent = String(games.length);
    els.favCount.textContent = String(getList(FAV_KEY).length);
  }

  function filtered() {
    var q = (els.search.value || "").toLowerCase().trim();
    return games.filter(function (g) {
      if (showFavOnly && !isFav(g.id)) return false;
      if (activeCategory !== "Semua" && g.category !== activeCategory) return false;
      if (!q) return true;
      var blob = [g.title, g.description, g.category, g.author].join(" ").toLowerCase();
      return blob.indexOf(q) !== -1;
    });
  }

  function renderChips() {
    var cats = cfg.categories || ["Semua"];
    els.chips.innerHTML = "";
    cats.forEach(function (cat) {
      var b = document.createElement("button");
      b.className = "chip" + (cat === activeCategory ? " active" : "");
      b.textContent = cat;
      b.onclick = function () {
        activeCategory = cat;
        showFavOnly = false;
        renderChips();
        render();
      };
      els.chips.appendChild(b);
    });
    var fav = document.createElement("button");
    fav.className = "chip" + (showFavOnly ? " active" : "");
    fav.textContent = "Favorit";
    fav.onclick = function () {
      showFavOnly = !showFavOnly;
      renderChips();
      render();
    };
    els.chips.appendChild(fav);
  }

  function fillCategorySelect() {
    var cats = (cfg.categories || []).filter(function (c) { return c !== "Semua"; });
    els.categorySelect.innerHTML = cats.map(function (c) {
      return "<option value=\"" + escapeHtml(c) + "\">" + escapeHtml(c) + "</option>";
    }).join("");
  }

  function render() {
    var list = filtered();
    if (!list.length) {
      els.grid.innerHTML = '<div class="empty">Belum ada game yang cocok. Coba kata lain, atau tambah game baru.</div>';
      return;
    }
    els.grid.innerHTML = list.map(function (g, idx) {
      var favOn = isFav(g.id);
      var liked = isLiked(g.id);
      var likes = Number(g.likes || 0);
      var comments = Number(g.commentCount || 0);
      var thumb = g.thumbnail
        ? '<img src="' + escapeHtml(g.thumbnail) + '" alt="">'
        : initials(g.title);
      return (
        '<article class="card" style="animation-delay:' + (idx * 40) + 'ms">' +
          '<div class="thumb">' + thumb +
            '<button class="fav' + (favOn ? " on" : "") + '" data-fav="' + escapeHtml(g.id) + '" title="Favorit" aria-label="Favorit">' + HEART + "</button>" +
          "</div>" +
          '<div class="card-body">' +
            '<span class="tag">' + escapeHtml(g.category || "Lainnya") + "</span>" +
            "<h3>" + escapeHtml(g.title) + "</h3>" +
            "<p>" + escapeHtml(g.description || "Game siap dimainkan.") + "</p>" +
            '<div class="meta">' + escapeHtml(g.author || "Anonim") + "</div>" +
            '<div class="react-bar">' +
              '<button class="react-btn' + (liked ? " liked" : "") + '" data-like="' + escapeHtml(g.id) + '">♥ ' + likes + "</button>" +
              '<button class="react-btn" data-comment="' + escapeHtml(g.id) + '">💬 ' + comments + "</button>" +
              '<button class="react-btn" data-donate="' + escapeHtml(g.id) + '">☕ Kopi</button>' +
            "</div>" +
            '<div class="card-actions">' +
              '<a class="btn btn-primary" href="' + escapeHtml(g.url) + '" target="_blank" rel="noopener">Mainkan</a>' +
              '<button class="btn btn-ghost" data-copy="' + escapeHtml(g.url) + '">Salin</button>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function findGame(id) {
    for (var i = 0; i < games.length; i++) if (String(games[i].id) === String(id)) return games[i];
    return null;
  }

  function useStarter() {
    games = STARTER.slice();
    setStatus(false, "Siap");
  }

  async function callHub(payload, method) {
    if (!HUB) throw new Error("Form belum aktif.");
    var url = HUB;
    var opt = { method: method || "POST" };
    if (opt.method === "GET") {
      var q = Object.keys(payload).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(payload[k]);
      }).join("&");
      url += (url.indexOf("?") === -1 ? "?" : "&") + q;
    } else {
      opt.headers = { "Content-Type": "text/plain;charset=utf-8" };
      opt.body = JSON.stringify(payload);
    }
    var res = await fetch(url, opt);
    return res.json();
  }

  async function loadGames() {
    if (!HUB) { useStarter(); return; }
    try {
      var data = await callHub({ action: "list" }, "GET");
      if (data && data.ok && Array.isArray(data.games)) {
        games = data.games.length ? data.games : STARTER.slice();
        games.forEach(function (g) {
          g.likes = Number(g.likes || 0);
          g.commentCount = Number(g.commentCount || 0);
        });
        setStatus(true, "Online");
        return;
      }
      useStarter();
    } catch (err) {
      useStarter();
    }
  }

  function toggleFav(id) {
    var on = !isFav(id);
    toggleItem(FAV_KEY, id, on);
    updateStats();
    render();
    toast(on ? "Ditambahkan ke favorit." : "Dihapus dari favorit.", "ok");
  }

  async function toggleLike(id) {
    var g = findGame(id);
    if (!g) return;
    var liked = isLiked(id);
    if (!HUB) {
      toggleItem(LIKE_KEY, id, !liked);
      g.likes = Math.max(0, Number(g.likes || 0) + (liked ? -1 : 1));
      render();
      return;
    }
    try {
      var data = await callHub({
        action: "like",
        gameId: id,
        device: deviceId(),
        unlike: liked ? "1" : "0"
      });
      if (!data.ok) throw new Error(data.error || "Gagal");
      toggleItem(LIKE_KEY, id, !liked);
      g.likes = Number(data.likes || g.likes);
      render();
    } catch (err) {
      toast("Tidak bisa memberi like sekarang.", "bad");
    }
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } catch (e) { return ""; }
  }

  function drawComments(items) {
    if (!items || !items.length) {
      els.commentList.innerHTML = '<div class="empty">Belum ada komentar. Jadilah yang pertama.</div>';
      return;
    }
    els.commentList.innerHTML = items.map(function (c) {
      return '<div class="comment-item"><b>' + escapeHtml(c.name) + '</b><p>' + escapeHtml(c.message) + '</p><span>' + escapeHtml(formatTime(c.createdAt)) + "</span></div>";
    }).join("");
  }

  async function openComments(id) {
    var game = findGame(id);
    if (!game) return;
    document.getElementById("commentGameId").value = id;
    els.commentTitle.textContent = "Komentar · " + game.title;
    els.commentBg.classList.add("open");
    els.commentList.innerHTML = '<div class="empty">Memuat komentar...</div>';
    if (!HUB) { drawComments([]); return; }
    try {
      var data = await callHub({ action: "comments", gameId: id }, "GET");
      drawComments(data.comments || []);
    } catch (err) {
      drawComments([]);
    }
  }

  async function submitComment(ev) {
    ev.preventDefault();
    var fd = new FormData(els.commentForm);
    var name = String(fd.get("name") || "").trim();
    var message = String(fd.get("message") || "").trim();
    var gameId = String(fd.get("gameId") || "");
    if (name.length < 2 || message.length < 3) {
      toast("Nama dan komentar terlalu pendek.", "bad");
      return;
    }
    if (isBlocked(name) || isBlocked(message)) {
      toast("Komentar tidak dapat disimpan.", "bad");
      return;
    }
    if (!HUB) {
      toast("Komentar belum aktif.", "bad");
      return;
    }
    var btn = els.commentForm.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      var data = await callHub({
        action: "comment",
        gameId: gameId,
        name: name,
        message: message,
        device: deviceId()
      });
      if (!data.ok) throw new Error(data.error || "Komentar tidak dapat disimpan.");
      els.commentForm.querySelector("[name=message]").value = "";
      drawComments(data.comments || []);
      var g = findGame(gameId);
      if (g) g.commentCount = Number(data.commentCount || (g.commentCount + 1));
      render();
      toast("Komentar tersimpan.", "ok");
    } catch (err) {
      toast(err.message || "Komentar tidak dapat disimpan.", "bad");
    } finally {
      btn.disabled = false;
    }
  }

  function openDonate(id) {
    var g = findGame(id);
    els.donateHint.textContent = g
      ? "Suka " + g.title + "? Traktir secangkir kopi lewat GoPay atau DANA."
      : "Traktir secangkir kopi lewat GoPay atau DANA.";
    document.getElementById("gopayNum").textContent = (cfg.pay && cfg.pay.gopay) || "";
    document.getElementById("danaNum").textContent = (cfg.pay && cfg.pay.dana) || "";
    els.donateBg.classList.add("open");
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(function () {
      toast("Nomor disalin.", "ok");
    });
  }

  function openModal() { els.modalBg.classList.add("open"); }
  function closeModal() { els.modalBg.classList.remove("open"); }

  async function submitGame(ev) {
    ev.preventDefault();
    var fd = new FormData(els.form);
    var payload = {
      action: "add",
      password: fd.get("password"),
      title: fd.get("title"),
      url: fd.get("url"),
      description: fd.get("description"),
      thumbnail: fd.get("thumbnail"),
      category: fd.get("category"),
      author: fd.get("author")
    };
    if (!payload.title || !payload.url || !payload.password) {
      toast("Nama, link, dan password wajib diisi.", "bad");
      return;
    }
    if (!HUB) { toast("Form tambah game belum aktif.", "bad"); return; }
    var btn = els.form.querySelector("[type=submit]");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
    try {
      var data = await callHub(payload);
      if (!data.ok) throw new Error(data.error || "Gagal menyimpan");
      toast(data.message || "Game tersimpan.", "ok");
      els.form.reset();
      closeModal();
      if (data.game) {
        data.game.likes = 0;
        data.game.commentCount = 0;
        games.unshift(data.game);
      } else await loadGames();
      updateStats();
      render();
    } catch (err) {
      toast(err.message || "Tidak bisa menyimpan sekarang.", "bad");
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan game";
    }
  }

  function pickRandom() {
    var list = filtered();
    if (!list.length) { toast("Tidak ada game untuk dipilih."); return; }
    var g = list[Math.floor(Math.random() * list.length)];
    window.open(g.url, "_blank", "noopener");
    toast("Membuka " + g.title);
  }

  document.addEventListener("click", function (e) {
    var fav = e.target.closest("[data-fav]");
    if (fav) toggleFav(fav.getAttribute("data-fav"));
    var like = e.target.closest("[data-like]");
    if (like) toggleLike(like.getAttribute("data-like"));
    var comment = e.target.closest("[data-comment]");
    if (comment) openComments(comment.getAttribute("data-comment"));
    var donate = e.target.closest("[data-donate]");
    if (donate) openDonate(donate.getAttribute("data-donate"));
    var copy = e.target.closest("[data-copy]");
    if (copy) {
      navigator.clipboard.writeText(copy.getAttribute("data-copy")).then(function () {
        toast("Link disalin.", "ok");
      });
    }
  });

  document.querySelectorAll("[data-open-add]").forEach(function (b) {
    b.addEventListener("click", openModal);
  });
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("closeComment").addEventListener("click", function () {
    els.commentBg.classList.remove("open");
  });
  document.getElementById("closeDonate").addEventListener("click", function () {
    els.donateBg.classList.remove("open");
  });
  els.modalBg.addEventListener("click", function (e) { if (e.target === els.modalBg) closeModal(); });
  els.commentBg.addEventListener("click", function (e) { if (e.target === els.commentBg) els.commentBg.classList.remove("open"); });
  els.donateBg.addEventListener("click", function (e) { if (e.target === els.donateBg) els.donateBg.classList.remove("open"); });
  els.form.addEventListener("submit", submitGame);
  els.commentForm.addEventListener("submit", submitComment);
  els.search.addEventListener("input", render);
  els.randomBtn.addEventListener("click", pickRandom);
  document.getElementById("copyGopay").addEventListener("click", function () {
    copyText((cfg.pay && cfg.pay.gopay) || "");
  });
  document.getElementById("copyDana").addEventListener("click", function () {
    copyText((cfg.pay && cfg.pay.dana) || "");
  });

  els.owner.textContent = cfg.ownerName || "";
  document.querySelectorAll("[data-site-name]").forEach(function (n) {
    n.textContent = cfg.siteName || "Monmon Games Hub";
  });

  fillCategorySelect();
  renderChips();
  loadGames().then(function () {
    updateStats();
    render();
  });
})();
