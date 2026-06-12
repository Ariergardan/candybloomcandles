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

function buildOwnerEmail(order) {
  const c = order.customer || {};
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#2b211c">
      <h2>Nowe zamówienie ${escapeHtml(order.orderNumber)}</h2>
      <p><strong>Kwota:</strong> ${escapeHtml(order.total)}</p>

      <h3>Dane klienta</h3>
      <p>
        <strong>Imię i nazwisko:</strong> ${escapeHtml(c.name)}<br>
        <strong>E-mail:</strong> ${escapeHtml(c.email)}<br>
        <strong>Telefon:</strong> ${escapeHtml(c.phone)}<br>
        <strong>Adres dostawy:</strong><br>${nl2br(c.address)}
      </p>

      <h3>Zamówienie</h3>
      <p>${nl2br(order.cartText)}</p>

      <h3>Uwagi</h3>
      <p>${nl2br(c.notes || "Brak")}</p>
    </div>
  `;
}

function buildCustomerEmail(order) {
  const c = order.customer || {};
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#2b211c">
      <h2>Dziękujemy za złożenie zamówienia w CandyBloom Candles 🤍</h2>
      <p>Cześć ${escapeHtml(c.name)},</p>
      <p>Otrzymaliśmy Twoje zamówienie. Po jego potwierdzeniu wyślemy sposób płatności oraz informacje o wysyłce.</p>

      <p><strong>Numer zamówienia:</strong> ${escapeHtml(order.orderNumber)}</p>
      <p><strong>Kwota:</strong> ${escapeHtml(order.total)}</p>

      <h3>Podsumowanie zamówienia</h3>
      <p>${nl2br(order.cartText)}</p>

      <p>Jeśli chcesz coś doprecyzować, możesz odpisać na tę wiadomość albo napisać do nas na Instagramie.</p>
      <p>Pozdrawiamy,<br><strong>CandyBloom Candles</strong></p>
    </div>
  `;
}

async function sendEmail({ env, to, toName, subject, html, replyTo }) {
  const appKey = env.EMAILLABS_APP_KEY;
  const secretKey = env.EMAILLABS_SECRET_KEY;
  const smtpAccount = env.EMAILLABS_SMTP_ACCOUNT || "1.ariergarda.smtp";
  const fromEmail = env.ORDER_FROM_EMAIL || "zamowienia@candybloomcandles.pl";
  const fromName = env.ORDER_FROM_NAME || "CandyBloom Candles";

  if (!appKey || !secretKey) {
    throw new Error("Brakuje EMAILLABS_APP_KEY lub EMAILLABS_SECRET_KEY w Cloudflare.");
  }

  const auth = btoa(`${appKey}:${secretKey}`);

  // EmailLabs API stabilniej przyjmuje dane jako formularz URL-encoded,
  // a nie jako JSON. Poprzedni JSON powodował: "Sender address is not valid".
  const body = new URLSearchParams();
  body.set("smtp_account", smtpAccount);
  body.set("from", fromEmail);
  body.set("from_name", fromName);
  body.set("to[" + to + "][name]", toName || to);
  body.set("subject", subject);
  body.set("html", html);

  if (replyTo) {
    body.set("reply_to", replyTo);
  }

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
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok || parsed?.status === "fail" || parsed?.code >= 400) {
    throw new Error(`EmailLabs odrzucił wysyłkę: ${text}`);
  }

  return parsed;
}

export async function onRequestOptions() {
  return jsonResponse({});
}

export async function onRequestPost(context) {
  let order;

  try {
    order = await context.request.json();
  } catch (error) {
    return jsonResponse({ error: "Nieprawidłowe dane zamówienia." }, 400);
  }

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
