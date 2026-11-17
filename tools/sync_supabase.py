# O Fervor exige login: NENHUM dado (escala, repertórios, agendas) é publicado no site.
# Este script só garante que pub.json e agenda/ continuem vazios (roda no GitHub Actions).
import json,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump({},open(os.path.join(root,'pub.json'),'w'))
ag=os.path.join(root,'agenda')
if os.path.isdir(ag):
    for f in os.listdir(ag):
        p=os.path.join(ag,f)
        if os.path.isfile(p): os.remove(p)
print('login obrigatório: pub.json e agenda/ vazios')
