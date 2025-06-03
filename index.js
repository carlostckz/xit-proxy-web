const express = require("express");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();

function absolutify(url, baseUrl) {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function rewriteHtml(html, baseUrl) {
  const $ = cheerio.load(html);

  $("a[href], link[href], script[src], img[src], form[action]").each((_, el) => {
    const attrib = el.name === "form" ? "action" : el.name === "img" || el.name === "script" ? "src" : "href";
    const original = $(el).attr(attrib);
    const absolute = absolutify(original, baseUrl);
    $(el).attr(attrib, `/proxy/${absolute}`);
  });

  return $.html();
}

app.get("/proxy/*", async (req, res) => {
  const targetUrl = req.params[0];

  if (!targetUrl.startsWith("http")) {
    return res.status(400).send("URL inválida");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (proxy)" },
    });

    const contentType = response.headers.get("content-type");

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const rewritten = rewriteHtml(html, targetUrl);
      res.set("Content-Type", "text/html");
      return res.send(rewritten);
    } else {
      res.set("Content-Type", contentType);
      return response.body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao acessar URL");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Proxy com reescrita rodando em http://localhost:3000");
});
