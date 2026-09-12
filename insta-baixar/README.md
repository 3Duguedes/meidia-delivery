# 📥 InstaBaixar

Site para baixar vídeos, fotos, reels e IGTV do Instagram, no estilo Snapinsta —
cola o link, clica em baixar.

## 🧱 Como funciona

- **`index.html`** — frontend (campo de link + botão colar/baixar + resultados).
- **`netlify/functions/get-media.js`** — Netlify Function que recebe o link do
  Instagram e delega a extração da mídia pra uma **API de terceiros no
  RapidAPI** (ver seção abaixo). Devolve a(s) URL(s) direta(s) da mídia
  (foto, vídeo ou carrossel).
- **`netlify/edge-functions/proxy-download.js`** — Edge Function que faz o
  proxy do download (adiciona o header `Content-Disposition: attachment` e o
  `Referer` que o CDN do Instagram exige). É uma *edge function* (Deno, sem o
  limite de payload das functions normais) porque vídeos passam facilmente do
  limite de resposta de uma Netlify Function comum.

### Por que uma API de terceiros em vez de scraping direto

A primeira versão deste projeto tentava ler diretamente a página pública de
*embed* do Instagram (o mesmo truque usado por vários sites de download por
aí). Isso parou de funcionar de forma confiável: o Instagram passou a servir,
pra requisições sem sessão/cookies de navegador real (como as de um servidor
Netlify), uma página de erro genérica disfarçada de resposta `200 OK` — em
vez de bloquear com um erro claro, ele silenciosamente não entrega a mídia.
Reproduzir o comportamento de um navegador de verdade (sessão logada,
proxies residenciais, fingerprint completo) é trabalho considerável e entra
em zona cinzenta dos Termos de Uso do Instagram. Por isso o projeto usa uma
API paga/gratuita especializada nisso (RapidAPI), que já resolve essa parte.

### Configuração necessária: RAPIDAPI_KEY

A função depende de uma chave da API RapidAPI usada
(`instagram-downloader-scraper-reels-igtv-posts-stories`, ou outra
equivalente). Configure no Netlify:

1. No painel do site → **Site configuration → Environment variables**
2. Adicione uma variável `RAPIDAPI_KEY` com o valor da sua chave do RapidAPI
3. Redeploy o site (mudança de variável de ambiente exige um novo deploy)

Sem essa variável configurada, a função responde com erro 500 explicando o
que falta.

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

- Depende de uma API de terceiros — se ela sair do ar, mudar de preço ou
  parar de funcionar, o download para até trocar de provedor.
- Planos gratuitos de API costumam ter limite mensal de requisições; passado
  esse limite, é preciso assinar um plano pago ou trocar de API.
- Só funciona com conteúdo **público**. Contas privadas não são suportadas.

## 🙏 Uso responsável

Baixe apenas conteúdo que você tem permissão de usar. Respeite os direitos
autorais e a privacidade de quem publicou. Este projeto não tem qualquer
vínculo com o Instagram ou a Meta.
