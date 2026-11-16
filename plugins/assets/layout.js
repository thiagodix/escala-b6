/* cabeçalho e rodapé compartilhados da loja de plugins */
(function(){
  var cur=document.body.getAttribute('data-nav')||'';
  var h='<div class="ann"><b>Teste grátis por 15 dias</b> · todos os recursos liberados · uma licença vale para 3 aparelhos seus</div>'+
  '<header class="hd"><div class="in"><a class="brand" href="/plugins/">AURA <small>PLUGINS</small></a><nav>'+
  '<a href="/plugins/"'+(cur==='all'?' class="on"':'')+'>Todos os plugins</a>'+
  '<a href="/plugins/aurasynthbass/"'+(cur==='aura'?' class="on"':'')+'>AURA Synth Bass</a>'+
  '<a href="/plugins/aurabass/"'+(cur==='aurabass'?' class="on"':'')+'>AURA Bass</a>'+
  '<a href="/plugins/aurasynthbass/manual/"'+(cur==='manual'?' class="on"':'')+'>Manual</a></nav>'+
  '<a class="btn pr sm cta" href="'+(cur==='aurabass'?'/plugins/aurabass/#baixar':'/plugins/aurasynthbass/#download')+'">Baixar teste grátis</a></div></header>';
  var f='<div class="wood"></div><footer class="ft"><div class="in"><div><a href="/plugins/">Plugins</a><a href="/plugins/aurasynthbass/">AURA Synth Bass</a><a href="/plugins/aurabass/">AURA Bass</a><a href="/plugins/aurasynthbass/manual/">Manual</a></div>'+
  '<div>© 2026 Thiago R. Galvão · Todos os direitos reservados<br>Nomes de outros fabricantes citados pertencem a seus donos; não há afiliação.</div></div></footer>';
  document.body.insertAdjacentHTML('afterbegin',h); document.body.insertAdjacentHTML('beforeend',f);
})();
