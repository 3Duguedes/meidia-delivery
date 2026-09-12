// Netlify Function (v2) — resolve um link do Instagram (post/reel/IGTV) para
// a(s) URL(s) direta(s) de mídia, usando uma API de terceiros (RapidAPI).
//
// Scraping direto na página pública do Instagram parou de funcionar de forma
// confiável (o Instagram passou a servir uma página de erro disfarçada de
// 200 OK para requisições sem sessão/cookies de navegador real — ver
// histórico do projeto). Delegar para uma API especializada é mais
// confiável do que tentar reimplementar tudo isso do zero.
//
// Requer a variável de ambiente RAPIDAPI_KEY configurada no Netlify
// (Site settings → Environment variables).
//
// GET /.netlify/functions/get-media?url=<link do instagram>

const RAPIDAPI_HOST = "instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com";

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const igUrl = searchParams.get("url");

  if (!igUrl) {
    return json({ ok: false, error: "Informe um link do Instagram." }, 400);
  }

  if (!isInstagramUrl(igUrl)) {
    return json({ ok: false, error: "Link do Instagram inválido." }, 400);
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return json(
      { ok: false, error: "Configuração ausente no servidor: RAPIDAPI_KEY não foi definida." },
      500
    );
  }

  try {
    const media = await fetchViaRapidApi(igUrl, apiKey);
    return json({ ok: true, ...media });
  } catch (err) {
    // Status 200 aqui de propósito: "não achei a mídia" é uma resposta
    // válida da aplicação, não uma falha de infraestrutura.
    return json({ ok: false, error: err.message || "Não foi possível processar esse link." }, 200);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isInstagramUrl(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

async function fetchViaRapidApi(igUrl, apiKey) {
  const endpoint = `https://${RAPIDAPI_HOST}/scraper?url=${encodeURIComponent(igUrl)}`;

  const res = await fetch(endpoint, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`A API de extração respondeu com erro (status ${res.status}). Tente novamente.`);
  }

  const payload = await res.json();
  const rawItems = Array.isArray(payload?.data) ? payload.data : [];

  const items = rawItems
    .filter((item) => item && typeof item.media === "string")
    .map((item) => ({ type: guessType(item.media), url: item.media }));

  if (items.length === 0) {
    throw new Error(
      "Não encontrei mídia nesse link. O post pode ser privado, ter sido removido ou o link está errado."
    );
  }

  return {
    type: items.length > 1 ? "carousel" : items[0].type,
    thumbnail: rawItems[0]?.thumb || null,
    items,
  };
}

function guessType(mediaUrl) {
  return /\.mp4(\?|$)/i.test(mediaUrl) ? "video" : "image";
}
