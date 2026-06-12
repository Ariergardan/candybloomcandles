function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function base64UrlDecode(value) {
  let b64 = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  while (b64.length % 4) b64 += "=";
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

function parseCartRows(cartText) {
  return String(cartText || "").split("\n").filter(Boolean).map(line => {
    const parts = line.split("|").map(p => p.trim());
    return { name: parts[0] || line, details: parts.slice(1).join(" · ") };
  });
}

function productTable(order) {
  const rows = parseCartRows(order.cartText);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #eadfd7">
      <thead><tr style="background:#f7eee8">
        <th align="left" style="padding:14px;color:#4d3528;font-size:14px">Produkt</th>
        <th align="left" style="padding:14px;color:#4d3528;font-size:14px">Szczegóły</th>
      </tr></thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td style="padding:14px;border-top:1px solid #eadfd7;color:#4d3528;font-weight:700">${escapeHtml(row.name)}</td>
            <td style="padding:14px;border-top:1px solid #eadfd7;color:#7b665a">${escapeHtml(row.details)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function emailShell(title, subtitle, content) {
  return `
    <div style="margin:0;padding:0;background:#fbf6f0;font-family:Arial,sans-serif;color:#3d2d25">
      <div style="max-width:720px;margin:0 auto;padding:28px 14px">
        <div style="background:#fffaf5;border:1px solid #eadfd7;border-radius:28px;overflow:hidden">
          <div style="padding:32px 26px;text-align:center;background:#f7eee8">
            <div style="font-family:Georgia,serif;font-size:34px;color:#4d3528;font-weight:700">CandyBloom Candles</div>
            <div style="margin-top:8px;color:#8a7468">${escapeHtml(subtitle)}</div>
          </div>
          <div style="padding:30px 26px">
            <h1 style="font-family:Georgia,serif;color:#4d3528;font-size:34px;margin:0 0 12px">${escapeHtml(title)}</h1>
            ${content}
          </div>
          <div style="padding:22px 26px;background:#f7eee8;color:#7b665a;font-size:13px;text-align:center">
            CandyBloom Candles · zamowienia@candybloomcandles.pl · instagram.com/candybloom_candles
          </div>
        </div>
      </div>
    </div>`;
}

function statusBadge(label, bg, color) {
  return `<span style="display:inline-block;background:${bg};color:${color};border-radius:999px;padding:8px 12px;font-weight:700;font-size:13px">${escapeHtml(label)}</span>`;
}

function buildStatusEmail(order, status, trackingNumber) {
  const c = order.customer || {};
  const orderNo = escapeHtml(order.orderNumber);

  if (status === "in_progress") {
    return emailShell("Zamówienie jest w realizacji 🕯️", "Status zamówienia", `
      <p style="line-height:1.7;color:#6f5c51">Dzień dobry ${escapeHtml(c.name)}, Twoje zamówienie <strong>${orderNo}</strong> zostało opłacone i trafiło do realizacji.</p>
      <p>${statusBadge("Status: w realizacji", "#f7eee8", "#4d3528")}</p>
      ${productTable(order)}
      <p style="line-height:1.7;color:#6f5c51">Czas realizacji wynosi od 1 do 7 dni roboczych. W przypadku większych lub bardziej personalizowanych zamówień termin może się wydłużyć — poinformujemy Cię o tym mailowo lub telefonicznie.</p>
    `);
  }

  if (status === "ready_pickup") {
    return emailShell("Zamówienie gotowe do odbioru 🤍", "Odbiór osobisty", `
      <p style="line-height:1.7;color:#6f5c51">Dzień dobry ${escapeHtml(c.name)}, Twoje zamówienie <strong>${orderNo}</strong> jest gotowe do odbioru osobistego.</p>
      <p>${statusBadge("Status: gotowe do odbioru", "#e8f2ff", "#244463")}</p>
      <p style="line-height:1.7;color:#6f5c51">Odbiór osobisty możliwy jest w Katowicach po wcześniejszym ustaleniu dogodnego terminu.</p>
      ${productTable(order)}
    `);
  }

  return emailShell("Zamówienie zostało wysłane 📦", "Wysyłka zamówienia", `
    <p style="line-height:1.7;color:#6f5c51">Dzień dobry ${escapeHtml(c.name)}, Twoje zamówienie <strong>${orderNo}</strong> zostało wysłane.</p>
    <p>${statusBadge("Status: wysłane", "#e8f8ee", "#1e6b3a")}</p>
    ${trackingNumber ? `<div style="background:#4d3528;color:#fff;border-radius:18px;padding:20px;margin:18px 0;text-align:center">
      <div style="font-size:13px;opacity:.85">Numer przesyłki</div>
      <div style="font-size:26px;font-weight:700;margin-top:6px">${escapeHtml(trackingNumber)}</div>
    </div>` : ""}
    ${productTable(order)}
    <p style="line-height:1.7;color:#6f5c51">Dziękujemy za zamówienie w CandyBloom Candles 🤍</p>
  `);
}

async function sendEmail({ env, to, toName, subject, html }) {
  const appKey = env.EMAILLABS_APP_KEY;
  const secretKey = env.EMAILLABS_SECRET_KEY;
  const smtpAccount = env.EMAILLABS_SMTP_ACCOUNT || "1.ariergarda.smtp";
  const fromEmail = env.ORDER_FROM_EMAIL || "zamowienia@candybloomcandles.pl";
  const fromName = env.ORDER_FROM_NAME || "CandyBloom Candles";

  if (!appKey || !secretKey) throw new Error("Brakuje kluczy EmailLabs.");

  const auth = btoa(`${appKey}:${secretKey}`);
  const body = new URLSearchParams();
  body.set("smtp_account", smtpAccount);
  body.set("from", fromEmail);
  body.set("from_name", fromName);
  body.set("to[" + to + "][name]", toName || to);
  body.set("subject", subject);
  body.set("html", html);

  const response = await fetch("https://api.emaillabs.net.pl/api/new_sendmail", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
    },
    body
  });

  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  if (!response.ok || parsed?.status === "fail" || parsed?.code >= 400) {
    throw new Error(text);
  }
  return parsed;
}

function htmlResponse(title, message, ok = true) {
  return new Response(`<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;background:#fbf6f0;color:#4d3528;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{max-width:680px;background:#fffaf5;border:1px solid #eadfd7;border-radius:28px;padding:34px;text-align:center}
h1{font-family:Georgia,serif;font-size:42px;margin:0 0 14px}
p{color:#6f5c51;line-height:1.7}
a,button{display:inline-block;margin-top:18px;background:#4d3528;color:#fff;text-decoration:none;border:0;border-radius:999px;padding:14px 20px;font-weight:700;cursor:pointer}
input{width:100%;border:1px solid #eadfd7;border-radius:16px;padding:14px;margin-top:8px;font:inherit}
label{text-align:left;display:block;font-weight:700;color:#4d3528}
</style></head><body><main class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/">Wróć do sklepu</a></main></body></html>`, {
    status: ok ? 200 : 500,
    headers: {"Content-Type": "text/html; charset=utf-8"}
  });
}

function trackingForm(token, data, status) {
  return new Response(`<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Numer przesyłki</title>
<style>
body{margin:0;background:#fbf6f0;color:#4d3528;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{max-width:680px;background:#fffaf5;border:1px solid #eadfd7;border-radius:28px;padding:34px;text-align:center}
h1{font-family:Georgia,serif;font-size:42px;margin:0 0 14px}
p{color:#6f5c51;line-height:1.7}
input{width:100%;border:1px solid #eadfd7;border-radius:16px;padding:14px;margin-top:8px;font:inherit}
button{display:inline-block;margin-top:18px;background:#4d3528;color:#fff;border:0;border-radius:999px;padding:14px 20px;font-weight:700;cursor:pointer}
</style></head><body><main class="card">
<h1>Numer przesyłki 📦</h1>
<p>Wpisz numer przesyłki, a klient dostanie maila ze statusem „wysłane”.</p>
<form method="POST">
<input type="hidden" name="token" value="${escapeHtml(token)}">
<input type="hidden" name="data" value="${escapeHtml(data)}">
<input type="hidden" name="status" value="${escapeHtml(status)}">
<label>Numer przesyłki<input name="tracking" required placeholder="Np. 1234567890"></label>
<button type="submit">Wyślij mail do klienta</button>
</form></main></body></html>`, {headers: {"Content-Type": "text/html; charset=utf-8"}});
}

async function githubGetFile(env, path) {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER || "Ariergardan";
  const repo = env.GITHUB_REPO || "candybloomcandles";
  const branch = env.GITHUB_BRANCH || "main";

  if (!token) return null;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "CandyBloom-Orders-Cloudflare"
    }
  });

  if (res.status === 404) return { sha: null, content: null, branch };
  if (!res.ok) throw new Error(`Nie udało się pobrać ${path}: ${await res.text()}`);

  const data = await res.json();
  const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  return { sha: data.sha, content: decoded, branch };
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function githubPutFile(env, path, content, message, sha = null) {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER || "Ariergardan";
  const repo = env.GITHUB_REPO || "candybloomcandles";
  const branch = env.GITHUB_BRANCH || "main";

  if (!token) return null;

  const payload = { message, content: utf8ToBase64(content), branch };
  if (sha) payload.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "CandyBloom-Orders-Cloudflare"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`Nie udało się zapisać ${path}: ${await res.text()}`);
  return res.json();
}

function statusLabel(status) {
  return {
    in_progress: "W realizacji",
    ready_pickup: "Gotowe do odbioru",
    shipped: "Wysłane",
    paid: "Opłacone",
    completed: "Zakończone"
  }[status] || status || "Aktualizacja";
}

async function updateOrderHistory(env, order, status, tracking = "") {
  if (!env.GITHUB_TOKEN) return;

  const path = "data/orders.json";
  const file = await githubGetFile(env, path);

  let data = { orders: [] };
  if (file?.content) {
    try { data = JSON.parse(file.content); } catch { data = { orders: [] }; }
  }
  if (!Array.isArray(data.orders)) data.orders = [];

  const now = new Date().toISOString();
  const label = statusLabel(status);
  const index = data.orders.findIndex(o => o.orderNumber === order.orderNumber);

  const baseEntry = {
    orderNumber: order.orderNumber,
    createdAt: now,
    updatedAt: now,
    status: label,
    total: order.total,
    cartText: order.cartText,
    delivery: order.delivery || {},
    customer: order.customer || {},
    trackingNumber: tracking || "",
    history: []
  };

  if (index >= 0) {
    const previous = data.orders[index];
    data.orders[index] = {
      ...previous,
      ...baseEntry,
      createdAt: previous.createdAt || now,
      history: Array.isArray(previous.history) ? previous.history : []
    };
    data.orders[index].history.push({ status: label, date: now, trackingNumber: tracking || "" });
  } else {
    baseEntry.history.push({ status: label, date: now, trackingNumber: tracking || "" });
    data.orders.unshift(baseEntry);
  }

  await githubPutFile(env, path, JSON.stringify(data, null, 2), `CandyBloom: status ${order.orderNumber} - ${label}`, file?.sha || null);
}

async function handleSend(context, params) {
  const token = params.get("token");
  const expected = context.env.ORDER_ACTION_TOKEN;

  if (!expected || token !== expected) {
    return htmlResponse("Błąd", "Brak autoryzacji do wysłania statusu.", false);
  }

  const status = params.get("status") || "";
  const data = params.get("data") || "";
  const tracking = params.get("tracking") || "";

  if (status === "shipped" && !tracking) {
    return trackingForm(token, data, status);
  }

  const order = base64UrlDecode(data);
  const customer = order.customer || {};

  if (!customer.email || !order.orderNumber) {
    return htmlResponse("Błąd", "Brakuje danych zamówienia.", false);
  }

  const subjects = {
    in_progress: `Zamówienie ${order.orderNumber} jest w realizacji — CandyBloom Candles`,
    ready_pickup: `Zamówienie ${order.orderNumber} gotowe do odbioru — CandyBloom Candles`,
    shipped: `Zamówienie ${order.orderNumber} zostało wysłane — CandyBloom Candles`
  };

  await sendEmail({
    env: context.env,
    to: customer.email,
    toName: customer.name,
    subject: subjects[status] || `Aktualizacja zamówienia ${order.orderNumber} — CandyBloom Candles`,
    html: buildStatusEmail(order, status, tracking)
  });

  await updateOrderHistory(context.env, order, status, tracking).catch(() => {});

  const labels = {
    in_progress: "Status „w realizacji” został wysłany do klienta.",
    ready_pickup: "Informacja o odbiorze osobistym została wysłana do klienta.",
    shipped: "Informacja o wysyłce została wysłana do klienta."
  };

  return htmlResponse("Wysłano 🤍", labels[status] || "Status został wysłany do klienta.");
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    return await handleSend(context, url.searchParams);
  } catch (error) {
    return htmlResponse("Błąd", "Nie udało się wysłać statusu: " + (error.message || error), false);
  }
}

export async function onRequestPost(context) {
  try {
    const form = await context.request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) params.set(key, value);
    return await handleSend(context, params);
  } catch (error) {
    return htmlResponse("Błąd", "Nie udało się wysłać statusu: " + (error.message || error), false);
  }
}
