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

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function onRequestOptions() {
  return jsonResponse({});
}

export async function onRequestPost(context) {
  const env = context.env || {};
  const token = env.GITHUB_TOKEN;
  const adminPassword = env.ADMIN_PASSWORD;
  const owner = env.GITHUB_OWNER || "Ariergardan";
  const repo = env.GITHUB_REPO || "candybloomcandles";
  const branch = env.GITHUB_BRANCH || "main";

  if (!token) {
    return jsonResponse({ error: "Brakuje GITHUB_TOKEN w Cloudflare Pages → Settings → Environment variables." }, 500);
  }

  if (!adminPassword) {
    return jsonResponse({ error: "Brakuje ADMIN_PASSWORD w Cloudflare Pages → Settings → Environment variables." }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (error) {
    return jsonResponse({ error: "Nieprawidłowy JSON." }, 400);
  }

  if (body.password !== adminPassword) {
    return jsonResponse({ error: "Błędne hasło panelu." }, 401);
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents`;

  async function getSha(path) {
    const res = await fetch(`${apiBase}/${path}?ref=${branch}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "CandyBloom-CMS-Cloudflare"
      }
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Nie udało się pobrać SHA dla ${path}: ${text}`);
    }

    const data = await res.json();
    return data.sha;
  }

  async function putFile(path, content, message, alreadyBase64 = false) {
    const sha = await getSha(path);
    const encoded = alreadyBase64 ? content : utf8ToBase64(content);

    const payload = {
      message,
      content: encoded,
      branch
    };

    if (sha) payload.sha = sha;

    const res = await fetch(`${apiBase}/${path}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "CandyBloom-CMS-Cloudflare"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Nie udało się zapisać ${path}: ${text}`);
    }

    return res.json();
  }

  try {
    const uploads = Array.isArray(body.uploads) ? body.uploads : [];

    for (const upload of uploads) {
      if (!upload.path || !upload.contentBase64) continue;

      const cleanPath = String(upload.path).replace(/^\/+/, "");
      if (!cleanPath.startsWith("assets/images/")) {
        throw new Error("Zdjęcia można zapisywać tylko w assets/images.");
      }

      await putFile(cleanPath, upload.contentBase64, `CandyBloom CMS: upload ${cleanPath}`, true);
    }

    if (body.productsData) {
      await putFile(
        "data/products.json",
        JSON.stringify(body.productsData, null, 2),
        "CandyBloom CMS: aktualizacja produktów"
      );
    }

    if (body.settingsData) {
      await putFile(
        "data/settings.json",
        JSON.stringify(body.settingsData, null, 2),
        "CandyBloom CMS: aktualizacja ustawień"
      );
    }

    if (body.ordersData) {
      await putFile(
        "data/orders.json",
        JSON.stringify(body.ordersData, null, 2),
        "CandyBloom CMS: aktualizacja zamówień"
      );
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error.message || "Błąd zapisu." }, 500);
  }
}
