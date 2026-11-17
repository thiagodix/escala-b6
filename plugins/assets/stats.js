/* Contagem de visitas e cliques, anônima e sem cookies (GoatCounter).
   Para ligar: crie a conta em goatcounter.com, escolha o código do site (ex.: aura)
   e coloque aqui, entre as aspas. Enquanto estiver vazio, nada é enviado. */
(function(){
  var CODE='fervor';
  if(!CODE)return;
  var s=document.createElement('script');s.async=true;
  s.src='https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter','https://'+CODE+'.goatcounter.com/count');
  document.head.appendChild(s);
  function ev(name){try{if(window.goatcounter&&window.goatcounter.count)window.goatcounter.count({path:name,title:name,event:true})}catch(e){}}
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a,button');if(!a)return;
    var h=a.getAttribute('href')||'',id=a.id||'';
    var m=h.match(/releases\/latest\/download\/AURA-([A-Za-z-]+?)-(Windows|macOS)\.(exe|pkg)/);
    if(m){ev('download/'+m[1].toLowerCase()+'-'+m[2].toLowerCase());return}
    if(id==='demoBtn'||a.hasAttribute('data-demo')){ev('demo/synthbass');return}
    if(/\.pdf$/.test(h)){ev('manual/pdf');return}
    if(/#baixar$/.test(h)||h==='#baixar'){ev('clique/ir-para-baixar')}
  },true);
})();
