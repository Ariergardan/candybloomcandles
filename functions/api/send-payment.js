function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
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

function emailShell(content) {
  return `
    <div style="margin:0;padding:0;background:#fbf6f0;font-family:Arial,sans-serif;color:#3d2d25">
      <div style="max-width:720px;margin:0 auto;padding:28px 14px">
        <div style="background:#fffaf5;border:1px solid #eadfd7;border-radius:28px;overflow:hidden">
          <div style="padding:32px 26px;text-align:center;background:#f7eee8">
            <div style="font-family:Georgia,serif;font-size:34px;color:#4d3528;font-weight:700">CandyBloom Candles</div>
            <div style="margin-top:8px;color:#8a7468">Dane do płatności</div>
          </div>
          <div style="padding:30px 26px">${content}</div>
          <div style="padding:22px 26px;background:#f7eee8;color:#7b665a;font-size:13px;text-align:center">
            CandyBloom Candles · zamowienia@candybloomcandles.pl · instagram.com/candybloom_candles
          </div>
        </div>
      </div>
    </div>`;
}

function buildPaymentEmail(order) {
  const c = order.customer || {};
  return emailShell(`
    <h1 style="font-family:Georgia,serif;color:#4d3528;font-size:34px;margin:0 0 12px">Dane do płatności 🤍</h1>
    <p style="line-height:1.7;color:#6f5c51">Dzień dobry ${escapeHtml(c.name)}, Twoje zamówienie zostało zweryfikowane i jest gotowe do realizacji.</p>

    <p><span style="display:inline-block;background:#fff3cd;color:#6a4b00;border-radius:999px;padding:8px 12px;font-weight:700;font-size:13px">Status: oczekuje na płatność</span></p>

    <div style="background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:18px;margin:18px 0">
      <p style="margin:0;color:#7b665a">Numer zamówienia</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#4d3528">${escapeHtml(order.orderNumber)}</p>
    </div>

    ${productTable(order)}

    <div style="background:#4d3528;color:#fff;border-radius:18px;padding:20px;margin:18px 0;text-align:center">
      <div style="font-size:13px;opacity:.85">Kwota do zapłaty</div>
      <div style="font-size:30px;font-weight:700;margin-top:6px">${escapeHtml(order.total)}</div>
    </div>

    <h3 style="color:#4d3528">BLIK na telefon</h3>
    <p style="font-size:22px;font-weight:700;color:#4d3528;margin-top:4px">605 194 932</p>

    <h3 style="color:#4d3528">Przelew tradycyjny</h3>
    <p style="line-height:1.8;color:#6f5c51">
      Odbiorca: <strong>Aleksandra Żabicka</strong><br>
      Numer konta:<br>
      <strong style="font-size:18px;color:#4d3528">29 1240 2832 1111 0011 0794 4606</strong><br>
      Tytuł przelewu: <strong>${escapeHtml(order.orderNumber)}</strong>
    </p>

    <p style="line-height:1.7;color:#6f5c51">Prosimy o dokonanie płatności w ciągu 24 godzin od otrzymania tej wiadomości.</p>
    <p style="line-height:1.7;color:#6f5c51">Po zaksięgowaniu płatności rozpoczynamy realizację zamówienia. Czas realizacji wynosi od 1 do 7 dni roboczych.</p>
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
.card{max-width:620px;background:#fffaf5;border:1px solid #eadfd7;border-radius:28px;padding:34px;text-align:center}
h1{font-family:Georgia,serif;font-size:42px;margin:0 0 14px}
p{color:#6f5c51;line-height:1.7}
a{display:inline-block;margin-top:18px;background:#4d3528;color:#fff;text-decoration:none;border-radius:999px;padding:14px 20px;font-weight:700}
</style></head><body><main class="card"><h1>${ok ? "Wysłano 🤍" : "Błąd"}</h1><p>${escapeHtml(message)}</p><a href="/">Wróć do sklepu</a></main></body></html>`, {
    status: ok ? 200 : 500,
    headers: {"Content-Type": "text/html; charset=utf-8"}
  });
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const token = url.searchParams.get("token");
    const expected = context.env.ORDER_ACTION_TOKEN;

    if (!expected || token !== expected) {
      return htmlResponse("Błąd", "Brak autoryzacji do wysłania danych płatności.", false);
    }

    const order = base64UrlDecode(url.searchParams.get("data"));
    const customer = order.customer || {};

    if (!customer.email || !order.orderNumber || !order.total) {
      return htmlResponse("Błąd", "Brakuje danych zamówienia.", false);
    }

    await sendEmail({
      env: context.env,
      to: customer.email,
      toName: customer.name,
      subject: `Dane do płatności — zamówienie ${order.orderNumber}`,
      html: buildPaymentEmail(order)
    });

    return htmlResponse("Wysłano", `Dane do płatności zostały wysłane do klienta: ${customer.email}`);
  } catch (error) {
    return htmlResponse("Błąd", "Nie udało się wysłać danych do płatności: " + (error.message || error), false);
  }
}
