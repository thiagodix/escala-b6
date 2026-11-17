#!/usr/bin/env python3
"""Gera cabeçalho e rodapé estáticos (sem JavaScript) nas páginas da vitrine e do manual.
Uso: python3 plugins/build_layout.py   (rode depois de mudar menu/rodapé aqui)"""
import re, pathlib
R = pathlib.Path(__file__).parent
V = "3"
CTA = {"all": ("#plugins", "Ver plugins"), "manual": ("/plugins/aurasynthbass/#baixar", "Baixar")}
LINKS = [("all", "/plugins/", "Todos os plugins"), ("aura", "/plugins/aurasynthbass/", "AURA Synth Bass"),
         ("aurabass", "/plugins/aurabass/", "AURA Bass"), ("manual", "/plugins/aurasynthbass/manual/", "Manual do Synth Bass")]
def header(cur):
    nav = "".join(f'<a href="{h}"{" class=\"on\" aria-current=\"page\"" if k == cur else ""}>{t}</a>' for k, h, t in LINKS)
    href, txt = CTA[cur]
    return ('<a class="skip" href="#main">Pular para o conteúdo</a>'
      '<div class="ann"><b>Teste grátis por 15 dias</b> · todos os recursos liberados · uma licença vale para 3 aparelhos seus</div>'
      f'<header class="hd"><div class="in"><a class="brand" href="/plugins/">AURA <small>PLUGINS</small></a><nav aria-label="Principal">{nav}</nav>'
      f'<a class="btn pr sm cta" href="{href}">{txt}</a>'
      f'<details class="mm"><summary aria-label="Abrir menu">Menu</summary><div class="mmp">{nav}</div></details></div></header>')
def footer():
    ls = "".join(f'<a href="{h}">{t}</a>' for k, h, t in LINKS[:4])
    return ('<div class="wood"></div><footer class="ft"><div class="in"><div>' + ls + '</div>'
      '<div>© 2026 Thiago R. Galvão · Todos os direitos reservados<br>Nomes de outros fabricantes citados pertencem a seus donos; não há afiliação.</div></div></footer>')
def patch(path, cur):
    p = R / path; s = p.read_text(encoding="utf-8")
    s = re.sub(r'<!--HD-->.*?<!--/HD-->', '', s, flags=re.S); s = re.sub(r'<!--FT-->.*?<!--/FT-->', '', s, flags=re.S)
    s = re.sub(r'<script src="/?(?:plugins/)?assets/layout\.js"></script>\s*', '', s)
    s = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '<!--HD-->' + header(cur) + '<!--/HD-->', s, 1)
    s = s.replace('</body>', '<!--FT-->' + footer() + '<!--/FT--></body>', 1)
    p.write_text(s, encoding="utf-8")
patch("index.html", "all"); patch("aurasynthbass/manual/index.html", "manual")
