/* Perfil desta sessão: 'adm' (administrador) ou 'mem' (integrante). Decidido antes do app abrir, pelo que o servidor respondeu no último login. */
(()=>{const LS=localStorage,SS=sessionStorage;window.__FVROLE='mem';try{let a=null,h='';for(const S of [LS,SS]){a=a||S.getItem('fv-band-auth');h=h||S.getItem('fv-role')||''}
 const j=JSON.parse(a||'null'),u=j&&(j.user||(j.currentSession&&j.currentSession.user));if(u&&h===u.id+':adm')window.__FVROLE='adm'}catch(e){}
 window.__FVSETROLE=(uid,adm)=>{try{const v=uid?uid+(adm?':adm':':mem'):null;for(const S of [LS,SS]){v?S.setItem('fv-role',v):S.removeItem('fv-role')}}catch(e){}}})();
