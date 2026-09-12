# 📥 InstaBaixar

Site para baixar vídeos, fotos, reels e IGTV do Instagram, no estilo Snapinsta —
cola o link, clica em baixar.

## 🧱 Como funciona

- **`index.html`** — frontend (campo de link + botão colar/baixar + resultados).
- **`netlify/functions/get-media.js`** — Netlify Function que recebe o link do
  Instagram, busca a página pública de *embed* do post
  (`instagram.com/p/<id>/embed/captioned/`) e extrai a(s) URL(s) direta(s) da
  mídia (foto, vídeo ou carrossel).
- **`netlify/edge-functions/proxy-download.js`** — Edge Function que faz o
  proxy do download (adiciona o header `Content-Disposition: attachment` e o
  `Referer` que o CDN do Instagram exige). É uma *edge function* (Deno, sem o
  limite de payload das functions normais) porque vídeos passam facilmente do
  limite de resposta de uma Netlify Function comum.

Não existe integração oficial do Instagram para isso — o site funciona lendo
a página pública que o próprio Instagram serve para embeds, então é o mesmo
princípio usado por sites como Snapinsta, SaveInsta, etc.

## 🚀 Deploy no Netlify

Este projeto vive numa subpasta do repositório `meidia-delivery`. Pra publicar
como um site **separado** do cardápio:

1. No Netlify, **Add new site → Import an existing project** e selecione este
   repositório.
2. Em **Base directory**, coloque `insta-baixar`.
3. **Publish directory**: `.` (relativo à base directory).
4. **Functions directory**: já vem definido pelo `netlify.toml` desta pasta
   (`netlify/functions`), não precisa configurar manualmente.
5. Deploy. As Edge Functions (`netlify/edge-functions`) são detectadas
   automaticamente pelo `netlify.toml`.

Não precisa de variáveis de ambiente nem de build step — é tudo estático +
functions, sem dependências externas.

## ⚠️ Limitações conhecidas

- Só funciona com **posts, reels e IGTV públicos**. Stories e contas privadas
  não são suportados.
- O Instagram muda o HTML da página de embed de tempos em tempos — se o site
  parar de encontrar a mídia, é bem provável que seja isso, e o parsing em
  `get-media.js` precisa ser ajustado (a função tenta várias estratégias de
  extração antes de desistir, mas nenhuma é garantida para sempre).
- Uso excessivo pode fazer o Instagram bloquear temporariamente o IP dos
  servidores do Netlify por rate limit.

## 🙏 Uso responsável

Baixe apenas conteúdo que você tem permissão de usar. Respeite os direitos
autorais e a privacidade de quem publicou. Este projeto não tem qualquer
vínculo com o Instagram ou a Meta.
