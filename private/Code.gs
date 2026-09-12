/**
 * Monmon Games Hub — backend
 * Jangan unggah file ini ke repo publik.
 *
 * Setelah menempel script baru:
 * Deploy → Manage deployments → New version
 */

const GAMES_SHEET = "Games";
const COMMENTS_SHEET = "Comments";
const LIKES_SHEET = "Likes";
const ADD_PASSWORD = "Bismillaah";
const GAME_HEADERS = ["id", "title", "url", "description", "thumbnail", "category", "author", "createdAt", "likes"];
const COMMENT_HEADERS = ["id", "gameId", "name", "message", "createdAt", "device"];
const LIKE_HEADERS = ["id", "gameId", "device", "createdAt"];

const BLOCK = [
  "anjing","anjir","anjeng","bangsat","bangke","bego","bodoh","brengsek","goblok","tolol","idiot","kampret","keparat","setan","sialan","tai","taik","pantek","jancok","jancuk","asu","kimak","puki","itil","kontol","memek","ngentot","entot","ngewe","colmek","toket","tetek","pentil","penis","vagina","kelamin","seks","sex","sexy","porn","porno","bokep","bugil","telanjang","fuck","shit","bitch","asshole","bastard","dick","pussy","whore","slut","damn","faggot","nigger","stupid"
];

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const empty = first.every(function (cell) { return cell === ""; });
  if (empty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (name === GAMES_SHEET && first.indexOf("likes") === -1) {
    const col = first.length + 1;
    sheet.getRange(1, col).setValue("likes");
  }
  return sheet;
}

function gamesSheet_() { return getOrCreateSheet_(GAMES_SHEET, GAME_HEADERS); }
function commentsSheet_() { return getOrCreateSheet_(COMMENTS_SHEET, COMMENT_HEADERS); }
function likesSheet_() { return getOrCreateSheet_(LIKES_SHEET, LIKE_HEADERS); }

function rowsToObjects_(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  const out = [];
  for (var i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    for (var j = 0; j < headers.length; j++) item[String(headers[j])] = row[j];
    out.push(item);
  }
  return out;
}

function parseBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); }
    catch (err) { return e.parameter || {}; }
  }
  return e.parameter || {};
}

function isValidUrl_(url) {
  return !!(url && /^https?:\/\/.+/i.test(String(url).trim()));
}

function normalize_(text) {
  return String(text || "").toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
    .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
    .replace(/[^a-z0-9\s]/g, " ");
}

function isBlocked_(text) {
  const blob = " " + normalize_(text) + " ";
  return BLOCK.some(function (w) { return blob.indexOf(" " + w + " ") !== -1; });
}

function commentCounts_() {
  const rows = rowsToObjects_(commentsSheet_().getDataRange().getValues());
  const map = {};
  rows.forEach(function (r) {
    const id = String(r.gameId || "");
    if (!id) return;
    map[id] = (map[id] || 0) + 1;
  });
  return map;
}

function commentsFor_(gameId) {
  return rowsToObjects_(commentsSheet_().getDataRange().getValues())
    .filter(function (r) { return String(r.gameId) === String(gameId); })
    .sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); })
    .map(function (r) {
      return { id: r.id, gameId: r.gameId, name: r.name, message: r.message, createdAt: r.createdAt };
    });
}

function findGameRow_(gameId) {
  const sheet = gamesSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idCol = headers.indexOf("id");
  if (idCol === -1) return null;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(gameId)) {
      return { sheet: sheet, headers: headers, row: i + 1, data: values[i] };
    }
  }
  return null;
}

function listGames_() {
  const counts = commentCounts_();
  const games = rowsToObjects_(gamesSheet_().getDataRange().getValues())
    .filter(function (g) { return g.title && g.url; })
    .map(function (g) {
      g.likes = Number(g.likes || 0);
      g.commentCount = counts[String(g.id)] || 0;
      return g;
    })
    .sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  return { ok: true, games: games };
}

function addGame_(payload) {
  if (String(payload.password || "") !== ADD_PASSWORD) {
    return { ok: false, error: "Password salah." };
  }
  const title = String(payload.title || "").trim();
  const url = String(payload.url || "").trim();
  const description = String(payload.description || "").trim();
  const thumbnail = String(payload.thumbnail || "").trim();
  const category = String(payload.category || "Lainnya").trim() || "Lainnya";
  const author = String(payload.author || "").trim();
  if (!title) return { ok: false, error: "Nama game wajib diisi." };
  if (!isValidUrl_(url)) return { ok: false, error: "Link game tidak valid." };
  if (thumbnail && !isValidUrl_(thumbnail)) return { ok: false, error: "Link gambar tidak valid." };

  const sheet = gamesSheet_();
  const existing = rowsToObjects_(sheet.getDataRange().getValues());
  const duplicate = existing.some(function (g) {
    return String(g.url || "").replace(/\/+$/, "") === url.replace(/\/+$/, "");
  });
  if (duplicate) return { ok: false, error: "Link ini sudah terdaftar." };

  const id = Utilities.getUuid();
  const createdAt = new Date().toISOString();
  sheet.appendRow([id, title, url, description, thumbnail, category, author, createdAt, 0]);
  return {
    ok: true,
    message: "Game berhasil ditambahkan.",
    game: { id: id, title: title, url: url, description: description, thumbnail: thumbnail, category: category, author: author, createdAt: createdAt, likes: 0, commentCount: 0 }
  };
}

function likeGame_(payload) {
  const gameId = String(payload.gameId || "");
  const device = String(payload.device || "").slice(0, 80);
  const unlike = String(payload.unlike || "") === "1";
  if (!gameId || !device) return { ok: false, error: "Data like tidak lengkap." };

  const found = findGameRow_(gameId);
  if (!found) return { ok: false, error: "Game tidak ditemukan." };

  const likesCol = found.headers.indexOf("likes");
  const col = likesCol === -1 ? found.headers.length + 1 : likesCol + 1;
  if (likesCol === -1) found.sheet.getRange(1, col).setValue("likes");

  const likeSheet = likesSheet_();
  const likes = rowsToObjects_(likeSheet.getDataRange().getValues());
  var existingRow = -1;
  for (var i = 0; i < likes.length; i++) {
    if (String(likes[i].gameId) === gameId && String(likes[i].device) === device) {
      existingRow = i + 2;
      break;
    }
  }

  var current = Number(found.sheet.getRange(found.row, col).getValue() || 0);
  if (unlike) {
    if (existingRow !== -1) {
      likeSheet.deleteRow(existingRow);
      current = Math.max(0, current - 1);
      found.sheet.getRange(found.row, col).setValue(current);
    }
    return { ok: true, likes: current };
  }

  if (existingRow === -1) {
    likeSheet.appendRow([Utilities.getUuid(), gameId, device, new Date().toISOString()]);
    current = current + 1;
    found.sheet.getRange(found.row, col).setValue(current);
  }
  return { ok: true, likes: current };
}

function addComment_(payload) {
  const gameId = String(payload.gameId || "");
  const name = String(payload.name || "").trim().slice(0, 24);
  const message = String(payload.message || "").trim().slice(0, 180);
  const device = String(payload.device || "").slice(0, 80);
  if (!gameId || name.length < 2 || message.length < 3) {
    return { ok: false, error: "Nama dan komentar wajib diisi." };
  }
  if (isBlocked_(name) || isBlocked_(message)) {
    return { ok: false, error: "Komentar tidak dapat disimpan." };
  }
  if (!findGameRow_(gameId)) return { ok: false, error: "Game tidak ditemukan." };

  commentsSheet_().appendRow([Utilities.getUuid(), gameId, name, message, new Date().toISOString(), device]);
  const list = commentsFor_(gameId);
  return { ok: true, comments: list, commentCount: list.length };
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || "list");
  try {
    if (action === "comments") return jsonOutput_({ ok: true, comments: commentsFor_(params.gameId) });
    if (action === "add") return jsonOutput_(addGame_(params));
    if (action === "like") return jsonOutput_(likeGame_(params));
    if (action === "comment") return jsonOutput_(addComment_(params));
    return jsonOutput_(listGames_());
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const payload = parseBody_(e);
    const action = String(payload.action || "add");
    if (action === "list") return jsonOutput_(listGames_());
    if (action === "like") return jsonOutput_(likeGame_(payload));
    if (action === "comment") return jsonOutput_(addComment_(payload));
    if (action === "comments") return jsonOutput_({ ok: true, comments: commentsFor_(payload.gameId) });
    return jsonOutput_(addGame_(payload));
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}
