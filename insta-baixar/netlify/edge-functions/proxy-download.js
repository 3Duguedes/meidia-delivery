// Netlify Edge Function — faz o proxy do download da mídia do Instagram.
//
// Usamos uma Edge Function (em vez de uma Function normal) porque vídeos do
// Instagram costumam passar do limite de payload das Netlify Functions
// (Lambda). Edge Functions rodam no Deno Deploy e conseguem fazer streaming
// da resposta sem esse limite.
//
// GET /download?url=<url direta da mídia>&filename=<nome do arquivo>

const ALLOWED_HOSTS = ["cdninstagram.com", "fbcdn.net"];

export default async (request) => {
  const { searchParams } = new URL(request.url);
  const mediaUrl = searchParams.get("url");
  const filenameParam = searchParams.get("filename") || "instagram-media";

  if (!mediaUrl) {
    return new Response("URL da mídia não informada.", { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    return new Response("URL inválida.", { status: 400 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return new Response("Origem da mídia não permitida.", { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      Referer: "https://www.instagram.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Não foi possível baixar a mídia agora. Tente novamente.", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const safeFilename = filenameParam.replace(/[^a-zA-Z0-9._-]/g, "_");

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${safeFilename}"`,
      "cache-control": "no-store",
    },
  });
};

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export const config = { path: "/download" };
