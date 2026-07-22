#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const root = new URL("../public/", import.meta.url).pathname;
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css", ".json":"application/json" };
createServer(async (req,res) => {
  try {
    const pathname = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = normalize(join(root, pathname));
    if (!file.startsWith(root)) throw new Error("bad path");
    const body = await readFile(file);
    res.writeHead(200,{"content-type":types[extname(file)]||"application/octet-stream","cache-control":"no-store"}); res.end(body);
  } catch { res.writeHead(404); res.end("Not found"); }
}).listen(Number(process.env.PORT||4173), () => console.log("Atropa bot UI: http://localhost:4173"));
