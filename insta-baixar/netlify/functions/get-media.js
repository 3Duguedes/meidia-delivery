// Netlify Function (v2) — resolve um link do Instagram (post/reel/IGTV) para
// a(s) URL(s) direta(s) de mídia, usando a página pública de embed do Instagram.
//
// GET /.netlify/functions/get-media?url=<link do instagram>

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const igUrl = searchParams.get("url");

  if (!igUrl) {
    return json({ ok: false, error: "Informe um link do Instagram." }, 400);
  }

  let target;
  try {
    target = extractShortcode(igUrl);
  } catch {
    return json(
      { ok: false, error: "Link do Instagram inválido. Use um link de post, reel ou IGTV." },
      400
    );
  }

  try {
    const media = await fetchMedia(target.type, target.shortcode);
    return json({ ok: true, ...media });
  } catch (err) {
    // Status 200 aqui de propósito: "não achei a mídia" é uma resposta válida
    // da aplicação, não uma falha de infraestrutura — evita ruído de erro
    // 4xx/5xx no console do navegador para um caso esperado.
    return json(
      { ok: false, error: err.message || "Não foi possível processar esse link.", debug: err.debug },
      200
    );
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function extractShortcode(rawUrl) {
  const u = new URL(rawUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) {
    throw new Error("not instagram");
  }
  const match = u.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("no shortcode");
  const type = match[1] === "reels" ? "reel" : match[1]; // normaliza /reels/ -> reel
  return { type, shortcode: match[2] };
}

// O Instagram serve o HTML de embed de forma um pouco diferente dependendo
// do tipo do link (post/reel/IGTV) e às vezes até dentro do mesmo tipo entre
// "/embed/captioned/" e "/embed/". Tenta algumas variações em cascata antes
// de desistir.
async function fetchMedia(type, shortcode) {
  const candidates = [
    `https://www.instagram.com/${type}/${shortcode}/embed/captioned/`,
    `https://www.instagram.com/${type}/${shortcode}/embed/`,
  ];
  if (type !== "p") {
    candidates.push(`https://www.instagram.com/p/${shortcode}/embed/captioned/`);
  }

  let lastError;
  for (const embedUrl of candidates) {
    try {
      return await fetchFromEmbedUrl(embedUrl);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchFromEmbedUrl(embedUrl) {
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (res.status === 404) {
    const err = new Error(
      "Post não encontrado. Ele pode ser privado, ter sido removido ou o link está errado."
    );
    err.debug = { url: embedUrl, status: 404 };
    throw err;
  }
  if (!res.ok) {
    const err = new Error("O Instagram bloqueou a requisição agora. Tente novamente em instantes.");
    err.debug = { url: embedUrl, status: res.status };
    throw err;
  }

  const html = await res.text();
  try {
    return parseEmbedHtml(html);
  } catch (err) {
    err.debug = { url: embedUrl, status: res.status, htmlSnippet: html.slice(0, 500) };
    throw err;
  }
}

function unescapeUrl(url) {
  return url.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
}

function parseEmbedHtml(html) {
  // Estratégia 1: bloco de dados estruturados (suporta carrossel)
  const structured = extractAdditionalData(html);
  if (structured) return structured;

  // Estratégia 2: <video src="..."> do player embutido
  const videoMatch = html.match(/<video[^>]*\ssrc="([^"]+)"/i);
  if (videoMatch) {
    return {
      type: "video",
      thumbnail: extractPoster(html),
      items: [{ type: "video", url: unescapeUrl(videoMatch[1]) }],
    };
  }

  // Estratégia 3: campos crus video_url / display_url embutidos no HTML
  const rawVideo = html.match(/"video_url":"([^"]+)"/);
  if (rawVideo) {
    return {
      type: "video",
      thumbnail: extractRawDisplayUrl(html),
      items: [{ type: "video", url: unescapeUrl(rawVideo[1]) }],
    };
  }
  const rawImage = html.match(/"display_url":"([^"]+)"/);
  if (rawImage) {
    const url = unescapeUrl(rawImage[1]);
    return { type: "image", thumbnail: url, items: [{ type: "image", url }] };
  }

  // Estratégia 4: meta tags Open Graph
  const ogVideo = extractMeta(html, "og:video");
  if (ogVideo) {
    return {
      type: "video",
      thumbnail: extractMeta(html, "og:image"),
      items: [{ type: "video", url: ogVideo }],
    };
  }
  const ogImage = extractMeta(html, "og:image");
  if (ogImage) {
    return { type: "image", thumbnail: ogImage, items: [{ type: "image", url: ogImage }] };
  }

  throw new Error(
    "Não encontrei a mídia desse link. O post pode ser privado ou o formato ainda não é suportado."
  );
}

function extractMeta(html, prop) {
  const m = html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`, "i"));
  return m ? unescapeUrl(m[1]) : null;
}

function extractPoster(html) {
  const m = html.match(/<video[^>]*\sposter="([^"]+)"/i);
  return m ? unescapeUrl(m[1]) : null;
}

function extractRawDisplayUrl(html) {
  const m = html.match(/"display_url":"([^"]+)"/);
  return m ? unescapeUrl(m[1]) : null;
}

function extractAdditionalData(html) {
  const marker = "window.__additionalDataLoaded(";
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const braceStart = html.indexOf("{", start);
  if (braceStart === -1) return null;

  const jsonStr = readBalancedJson(html, braceStart);
  if (!jsonStr) return null;

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  const media = data?.graphql?.shortcode_media || data?.items?.[0];
  if (!media) return null;

  return mediaToResult(media);
}

function mediaToResult(media) {
  const children = media.edge_sidecar_to_children?.edges;
  if (children && children.length) {
    return {
      type: "carousel",
      thumbnail: media.display_url,
      items: children.map((edge) => nodeToItem(edge.node)),
    };
  }
  const item = nodeToItem(media);
  return { type: item.type, thumbnail: media.display_url, items: [item] };
}

function nodeToItem(node) {
  if (node.is_video || node.video_url) {
    return { type: "video", url: node.video_url };
  }
  return { type: "image", url: node.display_url };
}

// Lê um objeto JSON balanceando chaves, a partir do índice do primeiro "{".
// Necessário porque o JSON vem embutido em uma chamada de função JS, então
// não dá pra usar regex simples (o conteúdo tem chaves aninhadas).
function readBalancedJson(str, startIndex) {
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return str.slice(startIndex, i + 1);
    }
  }
  return null;
}
