exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "{}" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const token = process.env.GITHUB_TOKEN;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const owner = process.env.GITHUB_OWNER || "Ariergardan";
  const repo = process.env.GITHUB_REPO || "candybloomcandles";
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Brakuje GITHUB_TOKEN w Netlify Environment variables." }) };
  }

  if (!adminPassword) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Brakuje ADMIN_PASSWORD w Netlify Environment variables." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Nieprawidłowy JSON." }) };
  }

  if (body.password !== adminPassword) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Błędne hasło panelu." }) };
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents`;

  async function getSha(path) {
    const res = await fetch(`${apiBase}/${path}?ref=${branch}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "CandyBloom-CMS"
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
    const encoded = alreadyBase64
      ? content
      : Buffer.from(content, "utf8").toString("base64");

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
        "User-Agent": "CandyBloom-CMS"
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Błąd zapisu." })
    };
  }
};
