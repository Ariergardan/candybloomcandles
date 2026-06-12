function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

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
            <div style="margin-top:8px;color:#8a7468">Ręcznie tworzone świece sojowe</div>
          </div>
          <div style="padding:30px 26px">${content}</div>
          <div style="padding:22px 26px;background:#f7eee8;color:#7b665a;font-size:13px;text-align:center">
            CandyBloom Candles · zamowienia@candybloomcandles.pl · instagram.com/candybloom_candles
          </div>
        </div>
      </div>
    </div>`;
}

function buildCustomerEmail(order) {
  const c = order.customer || {};
  return emailShell(`
    <h1 style="font-family:Georgia,serif;color:#4d3528;font-size:34px;margin:0 0 12px">Dziękujemy za zamówienie 🤍</h1>
    <p style="line-height:1.7;color:#6f5c51">Cześć ${escapeHtml(c.name)}, otrzymaliśmy Twoje zamówienie i zostało ono przyjęte do weryfikacji.</p>
    <div style="background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:18px;margin:18px 0">
      <p style="margin:0;color:#7b665a">Numer zamówienia</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#4d3528">${escapeHtml(order.orderNumber)}</p>
    </div>
    ${productTable(order)}
    <div style="background:#4d3528;color:#fff;border-radius:18px;padding:20px;margin:18px 0;text-align:center">
      <div style="font-size:13px;opacity:.85">Podsumowanie zamówienia</div>
      <div style="font-size:30px;font-weight:700;margin-top:6px">${escapeHtml(order.total)}</div>
    </div>
    <h3 style="color:#4d3528;margin-top:24px">Dane dostawy</h3>
    <p style="line-height:1.7;color:#6f5c51">${escapeHtml(c.name)}<br>${nl2br(c.address)}<br>tel. ${escapeHtml(c.phone)}</p>
    <p style="line-height:1.7;color:#6f5c51">Po weryfikacji zamówienia prześlemy dane do płatności. Na opłacenie zamówienia przysługuje 24 godziny od otrzymania danych do płatności.</p>
    <p style="line-height:1.7;color:#6f5c51">Realizacja rozpoczyna się po zaksięgowaniu płatności i trwa od 1 do 7 dni roboczych. W przypadku większych lub bardziej personalizowanych zamówień termin może się wydłużyć — poinformujemy Cię o tym mailowo lub telefonicznie.</p>
  `);
}

function buildPaymentDraft(order) {
  const c = order.customer || {};
  return `
Dzień dobry ${c.name || ""},

Dziękujemy za złożenie zamówienia w CandyBloom Candles 🤍

Twoje zamówienie zostało zweryfikowane i jest gotowe do realizacji.

Numer zamówienia: ${order.orderNumber}
Kwota do zapłaty: ${order.total}

Sposób płatności:
BLIK na telefon: 605 194 932

lub

Przelew tradycyjny:
Odbiorca: Aleksandra Żabicka
Numer konta: 29 1240 2832 1111 0011 0794 4606

Tytuł przelewu: ${order.orderNumber}

Prosimy o dokonanie płatności w ciągu 24 godzin od otrzymania tej wiadomości.

Po zaksięgowaniu płatności rozpoczynamy realizację zamówienia.
Czas realizacji wynosi od 1 do 7 dni roboczych od momentu zaksięgowania płatności.

Pozdrawiamy,
CandyBloom Candles
zamowienia@candybloomcandles.pl
`;
}

function buildOwnerEmail(order) {
  const c = order.customer || {};
  return emailShell(`
    <h1 style="font-family:Georgia,serif;color:#4d3528;font-size:34px;margin:0 0 12px">Nowe zamówienie 📦</h1>
    <div style="background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:18px;margin:18px 0">
      <p style="margin:0;color:#7b665a">Numer zamówienia</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#4d3528">${escapeHtml(order.orderNumber)}</p>
      <p style="margin:12px 0 0;color:#7b665a">Kwota</p>
      <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#4d3528">${escapeHtml(order.total)}</p>
    </div>
    <h3 style="color:#4d3528">Klient</h3>
    <p style="line-height:1.8;color:#6f5c51"><strong>${escapeHtml(c.name)}</strong><br>
      E-mail: <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a><br>
      Telefon: <a href="tel:${escapeHtml(c.phone)}">${escapeHtml(c.phone)}</a><br>
      Adres:<br>${nl2br(c.address)}
    </p>
    ${productTable(order)}
    <h3 style="color:#4d3528">Uwagi</h3>
    <p style="line-height:1.7;color:#6f5c51">${nl2br(c.notes || "Brak")}</p>
    <h3 style="color:#4d3528">Gotowy mail z danymi do płatności</h3>
    <div style="background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:18px;white-space:pre-wrap;color:#4d3528;line-height:1.6">${escapeHtml(buildPaymentDraft(order))}</div>
  `);
}

async function sendEmail({ env, to, toName, subject, html, replyTo }) {
  const appKey = env.EMAILLABS_APP_KEY;
  const secretKey = env.EMAILLABS_SECRET_KEY;
  const smtpAccount = env.EMAILLABS_SMTP_ACCOUNT || "1.ariergarda.smtp";
  const fromEmail = env.ORDER_FROM_EMAIL || "zamowienia@candybloomcandles.pl";
  const fromName = env.ORDER_FROM_NAME || "CandyBloom Candles";

  if (!appKey || !secretKey) throw new Error("Brakuje EMAILLABS_APP_KEY lub EMAILLABS_SECRET_KEY w Cloudflare.");

  const auth = btoa(`${appKey}:${secretKey}`);
  const body = new URLSearchParams();
  body.set("smtp_account", smtpAccount);
  body.set("from", fromEmail);
  body.set("from_name", fromName);
  body.set("to[" + to + "][name]", toName || to);
  body.set("subject", subject);
  body.set("html", html);
  if (replyTo) body.set("reply_to", replyTo);

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
    throw new Error(`EmailLabs odrzucił wysyłkę: ${text}`);
  }
  return parsed;
}

export async function onRequestOptions() { return jsonResponse({}); }

export async function onRequestPost(context) {
  let order;
  try { order = await context.request.json(); }
  catch { return jsonResponse({ error: "Nieprawidłowe dane zamówienia." }, 400); }

  const customer = order.customer || {};
  if (!order.orderNumber || !customer.name || !customer.email || !customer.phone || !customer.address || !order.cartText) {
    return jsonResponse({ error: "Brakuje wymaganych danych zamówienia." }, 400);
  }

  try {
    const ownerEmail = context.env.ORDER_TO_EMAIL || "zamowienia@candybloomcandles.pl";

    await sendEmail({
      env: context.env,
      to: ownerEmail,
      toName: "CandyBloom Candles",
      subject: `Nowe zamówienie ${order.orderNumber} — CandyBloom Candles`,
      html: buildOwnerEmail(order),
      replyTo: customer.email
    });

    await sendEmail({
      env: context.env,
      to: customer.email,
      toName: customer.name,
      subject: `Potwierdzenie zamówienia ${order.orderNumber} — CandyBloom Candles`,
      html: buildCustomerEmail(order)
    });

    return jsonResponse({ ok: true, orderNumber: order.orderNumber });
  } catch (error) {
    return jsonResponse({ error: error.message || "Nie udało się wysłać zamówienia." }, 500);
  }
}
