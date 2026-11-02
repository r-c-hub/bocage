'use strict';
(() => {
const $ = s => document.querySelector(s);
const KEY = 'bocage-aventure-v1';
const defaults = {name:'Camille',age:10,gender:'girl',skin:'#edc19b',hair:'#66432f',eyes:'#47674e',shirt:'#d77f54',pants:'#4c6878',hairstyle:'long'};
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
const palette = {skin:['#f5d7bb','#edc19b','#bd875d','#82533e','#53382d'],hair:['#e6c573','#ad7546','#66432f','#29282b','#a44631'],eyes:['#47674e','#5686a0','#6a4934','#383331'],shirt:['#d77f54','#6e91b4','#7b9c65','#b090b6','#e4bb55'],pants:['#4c6878','#676055','#b4aa92','#414950']};
const cleanProfile = p => {
 const a={...defaults,...p}; a.name=String(a.name).slice(0,20); a.age=Math.max(7,Math.min(12,Number(a.age)||10));
 for(const k of Object.keys(palette)) if(!palette[k].includes(a[k])) a[k]=defaults[k];
 if(!['girl','boy'].includes(a.gender)) a.gender='girl'; if(!['long','short','curls'].includes(a.hairstyle)) a.hairstyle='long'; return a;
};
let profile=cleanProfile(saved.profile), created=!!saved.profile;
const known=['cat','clock','duration','math','en','de','it','ball','puzzle','mystery','story','coloring','revision-fr','revision-de','revision-math','basket','movements','melody','rhythm','hopscotch'];
let completed=new Set(Array.isArray(saved.completed)?saved.completed.filter(k=>known.includes(k)):[]);
let catStage=['search','found','done'].includes(saved.catStage)?saved.catStage:'new';
let discovered=new Set(Array.isArray(saved.discovered)?saved.discovered.filter(k=>known.includes(k)):[...completed]);
let scene='outside',mode='walk',zoom=1,lang='de';
let player={x:1045,y:705},near=null,time=0,last=0,saveTimer=0,dialogCleanup=null;
let attempts={...saved.attempts},sound=false;
const keys=new Set();
const canvas=$('#world'),ctx=canvas.getContext('2d');
let cw=1000,ch=700,view={scale:1,ox:0,oy:0};
const W=1500,H=1280;
// North is 15 degrees above the leftward horizontal, matching the user's reference.
const mapCompass={north:{x:-Math.cos(Math.PI/12),y:-Math.sin(Math.PI/12)},east:{x:Math.sin(Math.PI/12),y:-Math.cos(Math.PI/12)}};
const garageAccess={x:625,y:920,w:80,h:295};
const gardenSize={width:31,depth:25,spacing:37,offset:8};
const level=()=>profile.age<=8?0:profile.age<=10?1:2;
const missions=[
 {id:'cat',icon:'🐈',title:'Où est passé Moka ?',skill:'Orientation · nord-est',who:'mia'},
 {id:'clock',icon:'⌚',title:'À la bonne heure',skill:'Lire une montre à aiguilles',who:'noe'},
 {id:'duration',icon:'⏳',title:'Encore un peu de jeu',skill:'Calculer une durée',who:'leo'},
 {id:'de',icon:'🇩🇪',title:'Hallo, nouvelle amitié !',skill:'Allemand · vie quotidienne',who:'alma'},
 {id:'en',icon:'🇬🇧',title:'Let’s be friends',skill:'Anglais · premiers échanges',who:'alma'},
 {id:'it',icon:'🇮🇹',title:'Ciao, come stai ?',skill:'Italien · découverte',who:'alma'},
 {id:'math',icon:'🔢',title:'Le défi de la classe',skill:'Mathématiques · petits calculs',who:'school'},
 {id:'ball',icon:'⚽',title:'À toi la passe !',skill:'Adresse · jouer ensemble',who:'sami'},
 {id:'puzzle',icon:'🧩',title:'Tout trouve sa place',skill:'Logique · puzzle coulissant',who:'inesHome'},
 {id:'mystery',icon:'🔎',title:'Le mystère du goûter',skill:'Enquête · déduire avec des indices',who:'tomHome'}
];
// Layout follows ecole_highlight.png, including its viewing direction.
// Footprint IDs correspond to visible groups, not to invented street addresses.
const buildings=[
 {ref:'school-front',x:440,y:440,w:190,h:90,height:65,color:'#ac815c',school:true,name:'École de Belle-Cour',type:'school'},
 {ref:'school-spine',x:575,y:340,w:80,h:145,height:68,color:'#ac815c',school:true,name:'',type:'decor'},
 {ref:'school-rear',x:610,y:285,w:105,h:85,height:57,color:'#ac815c',school:true,name:'',type:'decor'},
 {ref:'right-north-a',x:800,y:110,w:80,h:60,height:57,color:'#ecd4b5',name:'',type:'decor'},
 {ref:'right-north-b',x:895,y:115,w:85,h:60,height:57,color:'#edd6b9',name:'',type:'decor'},
 {ref:'right-row-1',x:800,y:200,w:170,h:75,height:65,color:'#ead5b7',name:'',type:'decor'},
 {ref:'right-row-2',x:800,y:340,w:180,h:75,height:65,color:'#f1dcc1',name:'Chez toi',type:'home'},
 {ref:'right-row-3',x:810,y:475,w:185,h:80,height:65,color:'#efdabe',name:'Chez Inès',type:'inesHome'},
 {ref:'east-1-a',x:1050,y:150,w:95,h:70,height:62,color:'#ead0b1',name:'',type:'decor'},
 {ref:'east-1-b',x:1170,y:165,w:100,h:70,height:62,color:'#efd8ba',name:'',type:'decor'},
 {ref:'east-2-a',x:1060,y:295,w:95,h:75,height:62,color:'#e6caaa',name:'',type:'decor'},
 {ref:'east-2-b',x:1180,y:310,w:100,h:75,height:62,color:'#ecd4b5',name:'',type:'decor'},
 {ref:'east-3-a',x:1070,y:440,w:100,h:75,height:62,color:'#eed7ba',name:'',type:'decor'},
 {ref:'east-3-b',x:1200,y:455,w:100,h:75,height:62,color:'#ead2b2',name:'',type:'decor'},
 {ref:'east-4-a',x:1080,y:585,w:105,h:75,height:62,color:'#e7caaa',name:'',type:'decor'},
 {ref:'east-4-b',x:1220,y:600,w:105,h:75,height:62,color:'#ead4b6',name:'',type:'decor'},
 {ref:'foreground-west',x:300,y:700,w:140,h:85,height:68,color:'#ead6b8',name:'',type:'decor'},
 {ref:'foreground-centre',x:440,y:700,w:240,h:85,height:68,color:'#e7caac',name:'Chez Tom',type:'tomHome'},
 {ref:'foreground-east',x:680,y:700,w:330,h:85,height:68,color:'#ebd3b4',name:'',type:'decor'},
 {ref:'terrace-a',x:1110,y:745,w:115,h:90,height:62,color:'#ebd6bc',flat:true,name:'',type:'decor'},
 {ref:'terrace-b',x:1245,y:760,w:125,h:90,height:62,color:'#e8d2b6',flat:true,name:'',type:'decor'},
 {ref:'pampres-flat',x:115,y:1030,w:290,h:120,height:55,color:'#d8bf92',wood:true,flat:true,concrete:true,name:'',type:'decor'},
 {ref:'pampres-long',x:780,y:1040,w:590,h:110,height:70,color:'#e4d5bf',name:'',type:'decor'}
];
const outside=[
 {id:'mia',x:1005,y:625,name:'Mia',icon:'🐈',task:'cat',shirt:'#b18cb2',skin:'#e3b38d',hair:'#5d4032',hairstyle:'long'},
 {id:'noe',x:1025,y:440,name:'Noé',icon:'⌚',task:'clock',shirt:'#d5ae5e',skin:'#b77e56',hair:'#3f3029',hairstyle:'curls'},
 {id:'leo',x:1035,y:875,name:'Léo',icon:'⏳',task:'duration',shirt:'#7f9bbb',skin:'#f1caa5',hair:'#ad7346',hairstyle:'short'},
 {id:'alma',x:755,y:625,name:'Alma',icon:'💬',task:'language',shirt:'#cb7957',skin:'#a97552',hair:'#302b28',hairstyle:'curls'},
 {id:'sami',x:744,y:545,name:'Sami',icon:'⚽',task:'ball',shirt:'#71a282',skin:'#bc875f',hair:'#3c302b',hairstyle:'short'},
 ...buildings.filter(b=>b.type!=='decor').map(b=>({id:b.type,x:b.x+b.w*.5,y:b.y+b.h+24,name:b.name,icon:b.type==='school'?'🏫':'🔔',task:'enter',destination:b.type})),
 {id:'schoolPreau',x:685,y:445,name:'Entrée de l’école par le préau',icon:'🚪',task:'enter',destination:'school'},
 {id:'hopscotch',x:699,y:590,name:'Jouer à la marelle',icon:'🔢',task:'hopscotch'},
 {id:'cat',x:730,y:149,name:'Moka',icon:'🐾',task:'findCat'}
];
const schoolCourtyard={x:632,y:300,w:163,h:340};
const fixtures=[
 {id:'pingpong',x:438,y:578,w:78,h:42},
 {id:'slide',x:560,y:560,w:65,h:78},
 {id:'garage',x:625,y:850,w:105,h:62,roof:'tiles',entrance:'left',ramp:{x:465,y:854,w:160,h:58}},
 {id:'preau',x:650,y:405,w:100,h:80,height:38}
];
const trees=[];
let seed=37;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const lanes=[{x:736,y:200,w:30,h:450},{x:1010,y:150,w:35,h:755},{x:300,y:650,w:1070,h:35},{x:200,y:870,w:1180,h:35}];
for(let i=0;i<200;i++){
 const x=85+rnd()*1340,y=125+rnd()*935;
 if(x>545&&x<785&&y>790&&y<1010)continue;
 if(x>garageAccess.x-35&&x<garageAccess.x+garageAccess.w+35&&y>garageAccess.y-20)continue;
 if(fixtures.some(f=>(x>f.x-32&&x<f.x+f.w+32&&y>f.y-55&&y<f.y+f.h+35)||(f.ramp&&x>f.ramp.x-30&&x<f.ramp.x+f.ramp.w+30&&y>f.ramp.y-55&&y<f.ramp.y+f.ramp.h+30)))continue;
 if(buildings.some(b=>x>b.x-32&&x<b.x+b.w+40&&y>b.y-15&&y<b.y+b.h+40))continue;
 if(lanes.some(l=>x>l.x-22&&x<l.x+l.w+22&&y>l.y-25&&y<l.y+l.h+25))continue;
 if(x>390&&x<780&&y>235&&y<620)continue;
 if(Math.abs(x-(735-.9*y))<70&&y<885)continue;
 if(outside.some(n=>Math.hypot(n.x-x,n.y-y)<55))continue;
 trees.push({x,y,s:.42+rnd()*.28,type:rnd()>.88?1:0,tone:Math.floor(rnd()*4)});
}
trees.push({x:720,y:128,s:.5,type:0,tone:2},{x:770,y:153,s:.5,type:0,tone:1});

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function save(){
 try {localStorage.setItem(KEY,JSON.stringify({profile,completed:[...completed],catStage,attempts,discovered:[...discovered],coloring:coloringPages}));$('#saveState').style.color='#7da477';}
 catch{$('#saveState').style.color='#c78f53';$('#saveState').title='Sauvegarde indisponible dans ce navigateur';}
}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.add('hidden'),4200);}
function award(id){if(!completed.has(id)){completed.add(id);save();updateUI();chime();toast('✦ Bravo ! Une nouvelle étoile pour cette belle découverte.');}}
function chime(){if(!sound)return;try{const ac=new(window.AudioContext||window.webkitAudioContext)();[523,659,784].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.045,ac.currentTime+i*.1);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.35+i*.1);o.start(ac.currentTime+i*.1);o.stop(ac.currentTime+.4+i*.1);});setTimeout(()=>ac.close(),1000);}catch{}}
function updateUI(){
 $('#profileName').textContent=profile.name||'Mon personnage';$('#miniAvatar').style.background=profile.skin;$('#xp').textContent=completed.size;
}
function discover(id){if(!discovered.has(id)){discovered.add(id);save();}}
function modal(html,cleanup){
 if(dialogCleanup)dialogCleanup();dialogCleanup=cleanup||null;keys.clear();$('#modalContent').innerHTML=html;
 if(!$('#modal').open)$('#modal').showModal();
 if(!html.includes('<form')){const button=$('#modalContent .primary')||$('#modalContent [data-answer]');if(button)button.focus({preventScroll:true});}
}
function closeModal(){if(dialogCleanup)dialogCleanup();dialogCleanup=null;$('#modal').close();canvas.focus({preventScroll:true});}
$('#closeModal').onclick=closeModal;$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
function profileEditor(first=false){
 let draft={...profile};
 modal(`<div class="modal-eyebrow">${first?'Ton aventure commence ici':'À ton image'}</div><h2 class="modal-title">${first?'Qui part à l’aventure ?':'Ton personnage'}</h2><p class="modal-description">Choisis un pseudo et un look. Ton âge adapte les défis. Tu pourras tout changer plus tard.</p><form id="avatarForm"><div class="form-grid"><div class="avatar-preview"><canvas id="portrait" width="260" height="400" aria-label="Aperçu de ton personnage"></canvas><small>À toi d’imaginer !</small></div><div class="fields"><label>Ton pseudo<input id="avatarName" maxlength="20" required autocomplete="off" value="${esc(draft.name)}"></label><div class="field-row"><label>Ton âge<select id="avatarAge">${[7,8,9,10,11,12].map(a=>`<option ${draft.age===a?'selected':''} value="${a}">${a} ans</option>`).join('')}</select></label><label>Personnage<select id="avatarGender"><option value="girl" ${draft.gender==='girl'?'selected':''}>Fille</option><option value="boy" ${draft.gender==='boy'?'selected':''}>Garçon</option></select></label></div><label>Coiffure<select id="avatarHair"><option value="long">Cheveux longs</option><option value="short">Cheveux courts</option><option value="curls">Boucles</option></select></label>${Object.keys(palette).map(k=>`<div><label>${{skin:'Peau',hair:'Cheveux',eyes:'Yeux',shirt:'Haut',pants:'Pantalon'}[k]}</label><div class="color-row">${palette[k].map((c,i)=>`<button type="button" class="color-choice ${draft[k]===c?'selected':''}" style="background:${c}" data-color="${k}" data-value="${c}" aria-label="${{skin:'Peau',hair:'Cheveux',eyes:'Yeux',shirt:'Haut',pants:'Pantalon'}[k]}, teinte ${i+1}" aria-pressed="${draft[k]===c}"></button>`).join('')}</div></div>`).join('')}</div></div><p class="key-label" id="levelLabel"></p><div class="actions"><button class="primary" type="submit">${first?'C’est parti ! →':'Enregistrer les changements'}</button>${first?'':'<button type="button" class="secondary" id="cancelAvatar">Annuler</button>'}</div></form>`);
 $('#avatarHair').value=draft.hairstyle;
 const preview=()=>{const c=$('#portrait').getContext('2d');c.clearRect(0,0,260,400);c.save();c.translate(130,310);c.scale(4.2,4.2);character(c,0,0,draft,false,true);c.restore();$('#levelLabel').textContent=draft.age<=8?'7–8 ans · nombres simples, heures entières et premières expressions':draft.age<=10?'9–10 ans · multiplications, quarts d’heure et dialogues simples':'11–12 ans · calculs en deux étapes, minutes et phrases plus longues';};
 $('#avatarName').oninput=e=>draft.name=e.target.value;
 $('#avatarAge').onchange=e=>{draft.age=Number(e.target.value);preview();};
 $('#avatarGender').onchange=e=>{draft.gender=e.target.value;draft.hairstyle=draft.gender==='girl'?'long':'short';$('#avatarHair').value=draft.hairstyle;preview();};
 $('#avatarHair').onchange=e=>{draft.hairstyle=e.target.value;preview();};
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{draft[b.dataset.color]=b.dataset.value;document.querySelectorAll(`[data-color="${b.dataset.color}"]`).forEach(c=>{c.classList.toggle('selected',c===b);c.setAttribute('aria-pressed',String(c===b));});preview();});
 $('#avatarForm').onsubmit=e=>{e.preventDefault();draft.name=draft.name.trim();if(!draft.name){$('#avatarName').focus();return;}profile=cleanProfile(draft);created=true;save();updateUI();closeModal();toast(`Bienvenue ${profile.name} ! Le quartier t’attend : avance avec les flèches ou ZQSD.`);};
 if($('#cancelAvatar'))$('#cancelAvatar').onclick=closeModal;preview();
}

function speaker(name,icon,sceneSpec={}){return `${sceneMarkup(name,sceneSpec)}<div class="dialog-speaker"><span class="speaker-icon">${icon}</span><div><div class="speaker-name">${name}</div><small>Une rencontre dans le quartier</small></div></div>`;}
let activeChallenge=null;
function quiz(challenge){
 const {id,name,icon,question,options,answer,hint,explanation,art='',onSuccess,sceneSpec={}}=challenge;activeChallenge=challenge;
 discover(id);let resolved=false;
 modal(`<div class="modal-eyebrow">${missions.find(m=>m.id===id)?.skill||'Un petit défi'}</div>${speaker(name,icon,sceneSpec)}<div class="speech">${question}</div>${art}<div class="quiz-options">${options.map((o,i)=>`<button data-answer="${i}">${esc(o)}</button>`).join('')}</div><button class="hint" id="hint">Un petit indice ?</button><div id="feedback" class="feedback" role="status"></div><div id="quizActions" class="actions"></div>`);
 $('#hint').onclick=()=>$('#feedback').textContent=hint;
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
 if(resolved)return;
 attempts[id]=(Number(attempts[id])||0)+1;save();
 if(Number(b.dataset.answer)===answer){resolved=true;$('#feedback').className='feedback success';$('#feedback').textContent='✓ Bravo ! '+explanation;document.querySelectorAll('[data-answer]').forEach(a=>a.disabled=true);award(id);$('#quizActions').innerHTML='<button class="primary" id="continueQuiz">Continuer l’aventure →</button><button class="secondary" id="anotherChallenge">Un autre défi</button>';$('#continueQuiz').onclick=()=>{closeModal();if(onSuccess)onSuccess();};$('#anotherChallenge').onclick=()=>replayChallenge(id);}
 else{$('#feedback').className='feedback';$('#feedback').textContent='Pas tout à fait. '+hint+' Essaie encore !';b.style.background='#f4e8d6';}
 });
}
function catDialog(){
 discover('cat');
 if(catStage==='done'||completed.has('cat')){modal(`${speaker('Mia','🐈')}<div class="speech">Merci d’avoir retrouvé Moka ! Il ronronne à la maison. Tu es un vrai guide du quartier.</div><div class="actions"><button id="bye" class="primary">À bientôt !</button></div>`);$('#bye').onclick=closeModal;return;}
 if(catStage==='found'){catStage='done';award('cat');save();modal(`${speaker('Mia','🐈',{type:'reunion'})}<h2 class="modal-title">Moka est retrouvé !</h2><div class="speech">Tu l’as ramené dans tes bras depuis le nord-est, près des arbres ! Merci ! Le nord-est, c’est entre le nord et l’est : vers le haut et la gauche sur cette vue, entre N et E.</div><div class="actions"><button id="bye" class="primary">Avec plaisir !</button></div>`);$('#bye').onclick=closeModal;return;}
 modal(`${speaker('Mia','🐈')}<div class="speech">J’ai perdu mon chat Moka… La dernière fois que je l’ai vu, c’était au <b>nord-est du quartier</b>, près des arbres. Peux-tu le retrouver ?</div><p class="modal-description">Regarde la boussole : le nord pointe presque vers la gauche, légèrement vers le haut, et l’est pointe vers le haut, un peu à droite. Approche-toi de Moka, puis appuie sur E, Entrée ou clique sur lui.</p><div class="actions"><button class="primary" id="acceptCat">Je pars à sa recherche !</button><button class="secondary" id="laterCat">À tout à l’heure</button></div>`);
 $('#acceptCat').onclick=()=>{catStage='search';save();updateUI();closeModal();toast('Moka se cache au nord-est. Aide-toi de la boussole !');};$('#laterCat').onclick=closeModal;
}
function findCat(){
 if(catStage!=='search')return;
 catStage='found';save();modal(`${speaker('Moka','🐈',{type:'rescue'})}<h2 class="modal-title">Miaou ! Te voilà !</h2><div class="speech">Moka est bien au nord-est ! Tu le prends doucement dans tes bras pour le rassurer. Ramène-le à Mia en te déplaçant dans le quartier.</div><div class="actions"><button id="keepWalk" class="primary">Je retourne prévenir Mia</button></div>`);
 $('#keepWalk').onclick=closeModal;
}
function clockSVG(h,m){
 let ticks='';for(let i=0;i<60;i++){const a=i*Math.PI/30,major=i%5===0;ticks+=`<line x1="${100+Math.sin(a)*(major?73:80)}" y1="${100-Math.cos(a)*(major?73:80)}" x2="${100+Math.sin(a)*85}" y2="${100-Math.cos(a)*85}" stroke="#78917b" stroke-width="${major?2:1}"/>`;}
 let nums='';for(let i=1;i<=12;i++){const a=i*Math.PI/6;nums+=`<text x="${100+Math.sin(a)*61}" y="${105-Math.cos(a)*61}" text-anchor="middle" font-size="13" fill="#34593e">${i}</text>`;}
 const a=(h%12+m/60)*Math.PI/6,b=m*Math.PI/30;
 return `<svg class="watch" viewBox="0 0 200 200" role="img" aria-label="Montre à aiguilles à déchiffrer"><circle cx="100" cy="100" r="94" fill="#fff" stroke="#c1cbb7" stroke-width="8"/>${ticks}${nums}<line x1="100" y1="100" x2="${100+Math.sin(a)*42}" y2="${100-Math.cos(a)*42}" stroke="#355d48" stroke-width="6" stroke-linecap="round"/><line x1="100" y1="100" x2="${100+Math.sin(b)*67}" y2="${100-Math.cos(b)*67}" stroke="#ce8757" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="100" r="5" fill="#355d48"/></svg>`;
}
// Random challenges are generated locally, stay fixed while answering and avoid immediate repeats.
const lastVariants=Object.create(null),dialogBags=Object.create(null);
const randomInt=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=randomInt(0,i);[result[i],result[j]]=[result[j],result[i]];}return result;}
function fresh(key,make){let q;for(let i=0;i<40;i++){q=make();if(q.signature!==lastVariants[key])break;}lastVariants[key]=q.signature;return q;}
function choiceQuiz(data,correct,distractors){const options=shuffle([...new Set([String(correct),...distractors.map(String)])].slice(0,4));return {...data,options,answer:options.indexOf(String(correct))};}
function numericQuiz(data,correct,format=String,step=1,min=0){
 const values=shuffle([correct-step,correct+step,correct+step*2,correct-step*2,correct+step*3,correct+step*4]).filter(v=>v>=min&&v!==correct);
 return choiceQuiz(data,format(correct),[...new Set(values)].slice(0,3).map(format));
}
const showTime=minutes=>`${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')}`;
const showDuration=minutes=>minutes<60?`${minutes} minutes`:minutes%60===0?`${minutes/60} h`:`${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')}`;
function makeWatchChallenge(){const l=level();return fresh('clock-'+l,()=>{
 const h=randomInt(1,12),m=l===0?0:l===1?randomInt(0,3)*15:randomInt(0,11)*5;
 const correct=(h%12)*60+m,display=v=>`${Math.floor(v/60)||12} h ${String(v%60).padStart(2,'0')}`;
 const alternatives=shuffle([(correct+60)%720,(correct+120)%720,(correct+(l===0?180:15))%720,(correct+45)%720,(correct+360)%720]).filter(v=>v!==correct);
 const explanation=m===0?'La grande aiguille est sur le 12 : il n’y a pas de minutes à ajouter.':`La grande aiguille est sur le ${m/5} : ${m/5} × 5 = ${m} minutes.`;
 return choiceQuiz({id:'clock',name:'Noé',icon:'⌚',signature:`${h}:${m}`,clock:{h,m},sceneSpec:{type:'watch',h,m},question:'Peux-tu lire l’heure sur ma montre à aiguilles ?',hint:'La petite aiguille indique les heures. La grande compte les minutes : 5 minutes par grand trait.',explanation:`Il est ${h} h ${String(m).padStart(2,'0')}. ${explanation}`,art:clockSVG(h,m)},display(correct),[...new Set(alternatives)].slice(0,3).map(display));
 });}
function watchQuiz(){quiz(makeWatchChallenge());}
function makeDurationChallenge(){const l=level();return fresh('duration-'+l,()=>{
 const start=l===0?randomInt(14,17)*60:randomInt(14*4,17*4)*15+(l===2?randomInt(0,2)*5:0),duration=l===0?randomInt(1,3)*30:l===1?randomInt(2,6)*15:randomInt(7,23)*5,end=start+duration;
 return numericQuiz({id:'duration',name:'Léo',icon:'⏳',signature:`${start}/${end}`,duration:{start,end,minutes:duration},question:`Il est <b>${showTime(start)}</b>. Je dois rentrer à <b>${showTime(end)}</b>. Combien de temps pouvons-nous jouer ?`,hint:`Compte les minutes entre ${showTime(start)} et la prochaine heure entière, puis continue jusqu’à ${showTime(end)}. Une heure vaut 60 minutes.`,explanation:`Entre ${showTime(start)} et ${showTime(end)}, il y a ${duration} minutes, soit ${showDuration(duration)}.`},duration,showDuration,l===0?30:l===1?15:5,5);
 });}
function durationQuiz(){quiz(makeDurationChallenge());}
function makeMathChallenge(){const l=level();return fresh('math-'+l,()=>{
 const objects=shuffle([{noun:'crayons',unit:'boîte'},{noun:'biscuits',unit:'assiette'},{noun:'billes',unit:'sachet'},{noun:'autocollants',unit:'enveloppe'}])[0];let q,answer,explanation,hint,parts;
 if(l===0){const a=randomInt(3,19),b=randomInt(2,12);answer=a+b;q=`Nous avons <b>${a} ${objects.noun}</b>. Nous en recevons <b>${b} de plus</b>. Combien en avons-nous en tout ?`;explanation=`${a} + ${b} = ${answer} ${objects.noun}.`;hint=`Pars de ${a} et ajoute ${b}. Tu peux d’abord compléter la dizaine.`;parts=[a,b];}
 else if(l===1){const a=randomInt(3,9),b=randomInt(2,9);answer=a*b;q=`Nous préparons <b>${a} ${objects.unit}s de ${b} ${objects.noun}</b>. Combien de ${objects.noun} faut-il en tout ?`;explanation=`${a} × ${b} = ${answer} ${objects.noun}.`;hint=`Il y a ${a} groupes de ${b}. Tu peux additionner ${b}, ${a} fois.`;parts=[a,b];}
 else{const a=randomInt(4,10),b=randomInt(4,10),give=randomInt(5,Math.min(a*b-2,25));answer=a*b-give;q=`Nous avons <b>${a} ${objects.unit}s de ${b} ${objects.noun}</b>. Nous donnons <b>${give} ${objects.noun}</b>. Combien en reste-t-il ?`;explanation=`${a} × ${b} = ${a*b}, puis ${a*b} − ${give} = ${answer} ${objects.noun}.`;hint=`Calcule d’abord ${a} × ${b}, puis enlève ${give}.`;parts=[a,b,give];}
 return numericQuiz({id:'math',name:'La maîtresse',icon:'👩‍🏫',signature:parts.join('/')+objects.noun,math:{parts,answer},question:q,hint,explanation},answer,String,l===0?1:randomInt(1,3),0);
 });}
function mathQuiz(){quiz(makeMathChallenge());}
const languageBank={
 en:[
  [
   ['Hello! What is your name?','My name is {name}.',['It is a cat.','Good night.'],'On te demande comment tu t’appelles.','« My name is… » : « Je m’appelle… ».'],
   ['Hello! How are you?','I am fine, thank you.',['My name is a bike.','It is red.'],'On te demande comment tu vas.','« I am fine, thank you » : « Je vais bien, merci ».'],
   ['How old are you?','I am {age} years old.',['It is a green book.','I like apples.'],'La question porte sur ton âge.','« I am … years old » permet de donner son âge.'],
   ['What colour is the grass?','It is green.',['It is pink.','It is blue.'],'« Grass » signifie « herbe ».','L’herbe est verte : « green ».'],
   ['Do you like apples?','Yes, I like apples.',['I am ten o’clock.','It is a pencil.'],'Alma te demande si tu aimes les pommes.','« Yes, I like apples » : « Oui, j’aime les pommes ».'],
   ['Good morning!','Good morning!',['Good night!','I am a football.'],'C’est une salutation du matin.','On répond « Good morning! » : « Bonjour ! ».']
  ],[
   ['Do you want to play football with me?','Yes, let’s play!',['It is a blue pen.','I am in the kitchen.'],'Alma t’invite à jouer au football.','« Yes, let’s play! » : « Oui, jouons ensemble ! ».'],
   ['Where do you live?','I live in Onex.',['I am {age} years old.','I like swimming.'],'« Where » demande un lieu et « live » veut dire « habiter ».','« I live in Onex » : « J’habite à Onex ».'],
   ['Can I borrow your pencil, please?','Yes, here you are.',['It is Monday.','I have brown eyes.'],'Alma souhaite emprunter ton crayon.','« Here you are » signifie ici « Tiens, le voici ».'],
   ['What do you like doing after school?','I like riding my bike.',['I live in Switzerland.','I am {age} years old.'],'On te demande ce que tu aimes faire après l’école.','« I like riding my bike » : « J’aime faire du vélo ».'],
   ['I am thirsty. Can I have some water?','Yes, here is some water.',['Good night!','My name is {name}.'],'« Thirsty » signifie « avoir soif ».','« Here is some water » : « Voici de l’eau ».'],
   ['What is your favourite animal?','My favourite animal is the cat.',['I go to school.','It is half past five.'],'La question porte sur ton animal préféré.','« My favourite animal is the cat » : « Mon animal préféré est le chat ».']
  ],[
   ['I have three apples and two pears. How many pieces of fruit is that?','Five pieces of fruit.',['Four pieces of fruit.','Six pieces of fruit.'],'Three apples = trois pommes ; two pears = deux poires.','Three + two = five : cinq fruits.'],
   ['I can play after I finish my homework. What should I do first?','Finish your homework.',['Start playing now.','Go to bed immediately.'],'« After » signifie « après » : les devoirs viennent avant le jeu.','« Finish your homework » : « Termine tes devoirs ».'],
   ['It is raining. What should we take for our walk?','An umbrella.',['A swimsuit.','A football goal.'],'« It is raining » signifie « Il pleut ».','« An umbrella » : un parapluie.'],
   ['The library is next to the school. Where is the library?','Beside the school.',['Inside my bedroom.','Behind the mountains.'],'« Next to » signifie « à côté de ».','« Beside the school » : « À côté de l’école ».'],
   ['We must leave at six. It is half past five. How long can we stay?','Thirty minutes.',['Fifteen minutes.','Sixty minutes.'],'« Half past five » = 17 h 30 ; « six » = 18 h.','Il reste trente minutes : « thirty minutes ».'],
   ['I cannot find my helmet. Can you help me look for it?','Of course! Where did you last see it?',['No, it is a sandwich.','I am twelve o’clock.'],'« Look for » signifie « chercher » et « helmet » signifie « casque ».','« Of course! Where did you last see it? » : « Bien sûr ! Où l’as-tu vu en dernier ? ».']
  ]
 ],
 de:[
  [
   ['Hallo! Wie heißt du?','Ich heiße {name}.',['Ich bin ein Ball.','Es ist drei Uhr.'],'On te demande comment tu t’appelles.','« Ich heiße… » : « Je m’appelle… ».'],
   ['Wie geht es dir?','Mir geht es gut, danke.',['Ich bin ein Apfel.','Das ist blau.'],'On te demande comment tu vas.','« Mir geht es gut, danke » : « Je vais bien, merci ».'],
   ['Wie alt bist du?','Ich bin {age} Jahre alt.',['Das ist ein Fahrrad.','Gute Nacht!'],'La question porte sur ton âge.','« Ich bin … Jahre alt » permet de donner son âge.'],
   ['Welche Farbe hat das Gras?','Das Gras ist grün.',['Das Gras ist rosa.','Das Gras ist blau.'],'« Das Gras » signifie « l’herbe ».','« Grün » signifie « vert ».'],
   ['Guten Morgen!','Guten Morgen!',['Gute Nacht!','Ich bin ein Buch.'],'C’est une salutation du matin.','« Guten Morgen! » : « Bonjour ! », le matin.'],
   ['Magst du Äpfel?','Ja, ich mag Äpfel.',['Es ist Montag.','Ich bin ein Stuhl.'],'« Äpfel » signifie « pommes ».','« Ja, ich mag Äpfel » : « Oui, j’aime les pommes ».']
  ],[
   ['Wo wohnst du?','Ich wohne in Onex.',['Ich bin {age} Jahre alt.','Ich mag Bananen.'],'« Wo wohnst du? » veut dire « Où habites-tu ? ».','« Ich wohne in Onex » : « J’habite à Onex ».'],
   ['Möchtest du mit mir Fußball spielen?','Ja, gern!',['Meine Augen sind braun.','Es ist Winter.'],'Alma te propose de jouer au football.','« Ja, gern! » : « Oui, volontiers ! ».'],
   ['Kann ich deinen Bleistift haben, bitte?','Ja, hier bitte.',['Es ist Sonntag.','Ich heiße ein Ball.'],'Alma te demande ton crayon.','« Ja, hier bitte » : « Oui, tiens ».'],
   ['Was machst du gern nach der Schule?','Ich fahre gern Fahrrad.',['Ich wohne in Onex.','Ich bin {age} Jahre alt.'],'On te demande ce que tu aimes faire après l’école.','« Ich fahre gern Fahrrad » : « J’aime faire du vélo ».'],
   ['Ich habe Durst. Hast du Wasser?','Ja, hier ist Wasser.',['Gute Nacht!','Das ist ein Heft.'],'« Durst » signifie « soif ».','« Hier ist Wasser » : « Voici de l’eau ».'],
   ['Was ist dein Lieblingstier?','Mein Lieblingstier ist die Katze.',['Ich gehe zur Schule.','Es ist fünf Uhr.'],'« Lieblingstier » signifie « animal préféré ».','« Mein Lieblingstier ist die Katze » : « Mon animal préféré est le chat ».']
  ],[
   ['Am Samstag fahre ich zum Park. Möchtest du mitkommen?','Ja, gern! Ich komme mit.',['Meine Augen sind braun.','Es ist Winter.'],'« Mitkommen » signifie « venir avec quelqu’un ».','« Ich komme mit » : « Je viens avec toi ».'],
   ['Es regnet. Was brauchen wir für den Spaziergang?','Einen Regenschirm.',['Einen Badeanzug.','Einen Fußballplatz.'],'« Es regnet » veut dire « Il pleut ».','« Einen Regenschirm » : un parapluie.'],
   ['Ich habe drei Äpfel und zwei Birnen. Wie viele Früchte sind das?','Fünf Früchte.',['Vier Früchte.','Sechs Früchte.'],'« Drei Äpfel » = trois pommes ; « zwei Birnen » = deux poires.','Drei + zwei = fünf : cinq fruits.'],
   ['Die Bibliothek ist neben der Schule. Wo ist sie?','Neben der Schule.',['In meinem Zimmer.','Hinter den Bergen.'],'« Neben » signifie « à côté de ».','La bibliothèque est à côté de l’école.'],
   ['Ich spiele nach den Hausaufgaben. Was mache ich zuerst?','Die Hausaufgaben.',['Sofort spielen.','Sofort schlafen.'],'« Nach » signifie « après » ; « zuerst » signifie « d’abord ».','Les devoirs passent avant le jeu.'],
   ['Ich finde meinen Helm nicht. Hilfst du mir suchen?','Ja! Wo hast du ihn zuletzt gesehen?',['Nein, das ist ein Brot.','Ich bin zwölf Uhr.'],'« Helm » signifie « casque » et « suchen » signifie « chercher ».','« Wo hast du ihn zuletzt gesehen? » : « Où l’as-tu vu en dernier ? ».']
  ]
 ],
 it:[
  [
   ['Ciao! Come ti chiami?','Mi chiamo {name}.',['Una bicicletta.','Buona notte.'],'On te demande comment tu t’appelles.','« Mi chiamo… » : « Je m’appelle… ».'],
   ['Come stai?','Sto bene, grazie!',['Sono le cinque.','Un gatto nero.'],'On te demande comment tu vas.','« Sto bene, grazie! » : « Je vais bien, merci ! ».'],
   ['Quanti anni hai?','Ho {age} anni.',['La penna è blu.','Buona sera.'],'La question porte sur ton âge.','« Ho … anni » permet de donner son âge.'],
   ['Di che colore è il prato?','Il prato è verde.',['Il prato è rosa.','Il prato è blu.'],'« Prato » signifie « prairie » ou « pelouse ».','« Verde » signifie « vert ».'],
   ['Buongiorno!','Buongiorno!',['Buona notte!','Sono un libro.'],'C’est une salutation pendant la journée.','« Buongiorno! » : « Bonjour ! ».'],
   ['Ti piacciono le mele?','Sì, mi piacciono le mele.',['Sono le tre.','Sono una sedia.'],'« Le mele » signifie « les pommes ».','« Mi piacciono le mele » : « J’aime les pommes ».']
  ],[
   ['Dove abiti?','Abito a Onex.',['Ho {age} anni.','Mi piace il pane.'],'« Dove abiti? » veut dire « Où habites-tu ? ».','« Abito a Onex » : « J’habite à Onex ».'],
   ['Vuoi giocare a pallone con me?','Sì, volentieri!',['Ho gli occhi verdi.','La mela è rossa.'],'Alma te propose de jouer au ballon.','« Sì, volentieri! » : « Oui, volontiers ! ».'],
   ['Posso prendere la tua matita, per favore?','Sì, ecco la matita.',['È domenica.','Buona notte!'],'« Matita » signifie « crayon ».','« Ecco la matita » : « Voici le crayon ».'],
   ['Che cosa ti piace fare dopo la scuola?','Mi piace andare in bicicletta.',['Abito a Onex.','Ho {age} anni.'],'On te demande ce que tu aimes faire après l’école.','« Mi piace andare in bicicletta » : « J’aime faire du vélo ».'],
   ['Ho sete. Hai dell’acqua?','Sì, ecco dell’acqua.',['Buona notte!','È una penna.'],'« Ho sete » signifie « J’ai soif ».','« Ecco dell’acqua » : « Voici de l’eau ».'],
   ['Qual è il tuo animale preferito?','Il mio animale preferito è il gatto.',['Vado a scuola.','Sono le cinque.'],'La question porte sur ton animal préféré.','« Il mio animale preferito è il gatto » : « Mon animal préféré est le chat ».']
  ],[
   ['Vuoi venire al parco con me? Possiamo giocare a pallone.','Sì, volentieri!',['Ho gli occhi verdi.','La mela è rossa.'],'Alma propose de venir au parc jouer au ballon.','« Sì, volentieri! » : « Oui, volontiers ! ».'],
   ['Piove. Che cosa prendiamo per la passeggiata?','Un ombrello.',['Un costume da bagno.','Una porta da calcio.'],'« Piove » signifie « Il pleut ».','« Un ombrello » : un parapluie.'],
   ['Ho tre mele e due pere. Quanti frutti sono?','Cinque frutti.',['Quattro frutti.','Sei frutti.'],'« Tre mele » = trois pommes ; « due pere » = deux poires.','Tre + due = cinque : cinq fruits.'],
   ['La biblioteca è accanto alla scuola. Dove si trova?','Accanto alla scuola.',['Nella mia camera.','Dietro le montagne.'],'« Accanto » signifie « à côté de ».','La bibliothèque se trouve à côté de l’école.'],
   ['Giocherò dopo i compiti. Che cosa devo fare prima?','I compiti.',['Giocare subito.','Dormire subito.'],'« Dopo » signifie « après » et « prima » signifie « d’abord ».','Les devoirs passent avant le jeu.'],
   ['Non trovo il mio casco. Mi aiuti a cercarlo?','Certo! Dove l’hai visto l’ultima volta?',['No, è un panino.','Sono le dodici.'],'« Casco » signifie « casque » et « cercare » signifie « chercher ».','« Dove l’hai visto l’ultima volta? » : « Où l’as-tu vu en dernier ? ».']
  ]
 ]
};
function makeLanguageChallenge(language=lang){const l=level(),bank=languageBank[language][l],key=language+'-'+l;let bag=dialogBags[key];
 if(!bag||!bag.length){bag=shuffle(bank.map((_,i)=>i));if(bag.at(-1)===lastVariants[key]&&bag.length>1)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];dialogBags[key]=bag;}
 const index=bag.pop();lastVariants[key]=index;const [question,correct,wrong,hint,explanation]=bank[index],sub=s=>s.replaceAll('{name}',profile.name).replaceAll('{age}',String(profile.age));
 return choiceQuiz({id:language,name:'Alma',icon:{en:'🇬🇧',de:'🇩🇪',it:'🇮🇹'}[language],signature:key+'-'+index,question:esc(sub(question)),hint,explanation},sub(correct),wrong.map(sub));
}
function languageQuiz(){quiz(makeLanguageChallenge());}
function makeMysteryChallenge(){return fresh('mystery-'+level(),()=>{
 const people=shuffle(['Inès','Léo','Sami']),culprit=people[0],clue=level()===0?randomInt(0,1):randomInt(0,3);let question,hint,explanation;
 if(clue===0){const colours=shuffle(['vert','bleu','violet','orange']),target=colours[0];question=`Le goûter a disparu ! Le gourmand portait un haut <b>${target}</b>.<br>${people.map((p,i)=>`• ${p} portait un haut ${colours[i]}.`).join('<br>')}<br><b>Qui correspond à l’indice ?</b>`;hint='Compare la couleur de chaque haut avec celle du premier indice.';explanation=`${culprit} est la seule personne à porter un haut ${target}.`;}
 else if(clue===1){const places=shuffle(['au salon','dans la cuisine','dans la chambre']);question=`Le goûter a été pris <b>${places[0]}</b>.<br>${people.map((p,i)=>`• ${p} était ${places[i]}.`).join('<br>')}<br><b>Qui était au bon endroit ?</b>`;hint='Cherche la personne qui se trouvait là où le goûter a disparu.';explanation=`${culprit} était ${places[0]}, là où se trouvait le goûter.`;}
 else if(clue===2){const at=randomInt(15,17)*60+randomInt(0,3)*15;question=`Le goûter a disparu du salon à <b>${showTime(at)}</b>.<br>• ${people[0]} était au salon de ${showTime(at-20)} à ${showTime(at+15)}.<br>• ${people[1]} est arrivé à ${showTime(at+10)}.<br>• ${people[2]} était au jardin.<br><b>Qui pouvait le prendre à ce moment-là ?</b>`;hint='Il faut être dans le salon au moment exact de la disparition.';explanation=`${culprit} était déjà dans le salon à ${showTime(at)}. Les autres n’étaient pas présents.`;}
 else{const items=shuffle(['un ballon','un livre','un casque']);question=`On a retrouvé <b>${items[0]}</b> près de l’assiette vide.<br>${people.map((p,i)=>`• ${p} avait ${items[i]}.`).join('<br>')}<br>La personne qui a pris le goûter a oublié son objet. <b>Qui est-ce ?</b>`;hint='Relie l’objet retrouvé à la personne qui le possédait.';explanation=`${culprit} avait ${items[0]}, l’objet retrouvé près du goûter.`;}
 return choiceQuiz({id:'mystery',name:'Tom',icon:'🔎',signature:question,question,hint,explanation},culprit,people.slice(1));
 });}
function mysteryQuiz(){quiz(makeMysteryChallenge());}

function avatarSVG(a,pose='talk'){
 const skin=a.skin||'#edc19b',hair=a.hair||'#66432f',shirt=a.shirt||'#7b9c65',eyes=a.eyes||'#47674e',pants=a.pants||'#4c6878';
 return `<g class="scene-actor"><ellipse cx="0" cy="2" rx="20" ry="5" fill="#45694920"/>${a.hairstyle==='long'?`<rect x="-16" y="-77" width="32" height="43" rx="12" fill="${hair}"/>`:''}<path d="M-8-23L-9-4M8-23L9-4" stroke="${pants}" stroke-width="10" stroke-linecap="round"/><path d="M-14-2H-4M5-2H15" stroke="#faf3df" stroke-width="6" stroke-linecap="round"/><rect x="-16" y="-52" width="32" height="34" rx="9" fill="${shirt}"/><g class="scene-arm arm-left ${pose==='carry'?'carry-arm':''}"><path d="M-13-46L-22-28" stroke="${skin}" stroke-width="7" stroke-linecap="round"/></g><g class="scene-arm arm-right ${pose==='watch'?'watch-arm':pose==='carry'?'carry-arm':'talk-arm'}"><path d="M14-46L24-28" stroke="${skin}" stroke-width="7" stroke-linecap="round"/>${pose==='watch'?'<rect x="19" y="-37" width="10" height="12" rx="3" fill="#f6f2dd" stroke="#688471" stroke-width="2"/><path d="M24-35v4l2 1" stroke="#65745b" fill="none"/>':''}</g><ellipse cx="0" cy="-68" rx="16" ry="18" fill="${skin}"/><path d="M-16-71Q-18-92 1-89Q19-88 16-69L10-78Q-2-72-12-79Z" fill="${hair}"/>${a.hairstyle==='curls'?[-12,-6,0,6,12].map((x,i)=>`<circle cx="${x}" cy="${-84-(i%2)*3}" r="6" fill="${hair}"/>`).join(''):''}<ellipse cx="-5" cy="-67" rx="2" ry="2.4" fill="${eyes}"/><ellipse cx="5" cy="-67" rx="2" ry="2.4" fill="${eyes}"/><path class="scene-mouth" d="M-4-59Q0-55 4-59" fill="none" stroke="#a16e56" stroke-width="1.4" stroke-linecap="round"/></g>`;
}
function catSVG(){return '<ellipse cx="0" cy="0" rx="21" ry="12" fill="#c9a17b"/><path d="M-19-2Q-37-23-24-24" fill="none" stroke="#b78c61" stroke-width="6" stroke-linecap="round"/><circle cx="16" cy="-13" r="13" fill="#c9a17b"/><path d="M5-21L5-34L16-24M18-25L28-34L28-18" fill="#ba906b"/><path d="M8-24L8-29L13-25M23-25L26-29L26-23" fill="#d9aaa0"/><circle cx="12" cy="-15" r="1.6" fill="#41543b"/><circle cx="22" cy="-15" r="1.6" fill="#41543b"/><path d="M15-9q3 3 6-1" fill="none" stroke="#7d5b43" stroke-width="1.5"/><path d="M-6-9v12M1-10v12" stroke="#ae8058" stroke-width="3"/><path d="M29-11l9-3M28-8l10 1" stroke="#9c7857" stroke-width="1"/>';}
function sceneMarkup(name,spec={}){
 const type=spec.type||'talk',isCat=type==='rescue'||type==='reunion';
 const npc=outside.find(n=>n.name===name)||{name,skin:'#edc19b',hair:name==='Inès'?'#613e30':'#ad7447',hairstyle:name==='Inès'?'long':'short',shirt:name==='Tom'?'#7298b0':'#b090b6'};
 const title=type==='watch'?`${profile.name} et Noé discutent ; Noé montre sa montre.`:type==='rescue'?`${profile.name} se penche et prend Moka dans ses bras.`:type==='reunion'?`${profile.name} ramène Moka dans ses bras auprès de Mia.`:`${profile.name} et ${name} discutent ensemble.`;
 const leftX=isCat?190:155,rightX=445;
 const bubble=(x,side)=>`<g class="scene-bubble bubble-${side}" transform="translate(${x} 10)"><rect width="68" height="29" rx="13" fill="#fffdf3"/><path d="M20 27l-6 11 22-11" fill="#fffdf3"/><circle cx="22" cy="15" r="2.5" fill="#92a780"/><circle cx="34" cy="15" r="2.5" fill="#92a780"/><circle cx="46" cy="15" r="2.5" fill="#92a780"/></g>`;
 const watch=type==='watch'?clockSVG(spec.h||3,spec.m||0).replace('class="watch"','class="scene-watch" x="270" y="10" width="116" height="116"'):'';
 return `<figure class="conversation-scene ${isCat?'cat-scene':''}" aria-label="${esc(title)}"><svg viewBox="0 0 600 200" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect width="600" height="200" rx="15" fill="#e3ecd6"/><path d="M0 139Q140 114 300 139T600 134V200H0Z" fill="#d0ddb9"/><path d="M0 174Q300 130 600 169V200H0Z" fill="#e9dfc5"/><circle cx="543" cy="34" r="19" fill="#f5e6ad"/><path d="M44 134v-60M557 137V89" stroke="#b1a181" stroke-width="9"/><g fill="#a9bd8d"><circle cx="44" cy="64" r="30"/><circle cx="557" cy="78" r="28"/></g><g transform="translate(${leftX} 174) scale(1.45)">${avatarSVG(profile,isCat?'carry':'talk')}</g>${type==='rescue'?'':`<g transform="translate(${rightX} 174) scale(-1.45 1.45)">${avatarSVG(npc,type==='watch'?'watch':'talk')}</g>`}${isCat?`<g class="${type==='rescue'?'rescue-cat':'held-cat'}">${catSVG()}</g><path class="holding-hands" d="M166 127Q188 142 213 124" fill="none" stroke="${profile.skin}" stroke-width="8" stroke-linecap="round"/>`:''}${watch}${type==='watch'?'<path d="M414 123L376 110" fill="none" stroke="#93a68b" stroke-width="2" stroke-dasharray="3 4"/>':''}${isCat?'':bubble(105,'left')+(type==='watch'?'':bubble(420,'right'))}<text x="${leftX}" y="195" text-anchor="middle" font-family="Segoe UI,Arial" font-size="11" fill="#71826c">${esc(profile.name)}</text>${type==='rescue'?'<text x="380" y="124" text-anchor="middle" font-family="Segoe UI,Arial" font-size="14" fill="#698558">Tout doux, Moka…</text>':`<text x="${rightX}" y="195" text-anchor="middle" font-family="Segoe UI,Arial" font-size="11" fill="#71826c">${esc(name)}</text>`}</svg><figcaption>${type==='rescue'?'Tu prends Moka dans tes bras.':type==='reunion'?'Moka est rassuré : tu l’as ramené !':type==='watch'?'Noé te montre sa montre.':'Un moment à partager.'}</figcaption></figure>`;
}

function replayChallenge(id){if(id==='story'){storyShelf();return;}if(id.startsWith('revision-')){revisionQuiz();return;}if(['en','de','it'].includes(id)){lang=id;languageQuiz();return;}({clock:watchQuiz,duration:durationQuiz,math:mathQuiz,mystery:mysteryQuiz}[id]||closeModal)();}

function languageMenu(){modal(`<div class="modal-eyebrow">Les langues ouvrent des portes</div>${speaker('Alma','💬')}<div class="speech">Salut ${esc(profile.name)} ! Aujourd’hui, on essaie de parler une autre langue ?</div><div class="language-select">${[['de','🇩🇪 Allemand'],['en','🇬🇧 Anglais'],['it','🇮🇹 Italien']].map(([k,t])=>`<button class="${k===lang?'selected':''}" data-lang="${k}">${t}</button>`).join('')}</div><p class="modal-description" id="langInfo"></p><div class="actions"><button id="startLang" class="primary">Parlons ensemble →</button></div>`);
 const info=()=>$('#langInfo').textContent=lang==='de'?'Des échanges simples inspirés de l’apprentissage de l’allemand au primaire.':lang==='en'?(profile.age<10?'Découverte : l’anglais scolaire commence en 7P à Genève.':'Des échanges pour débuter en anglais, comme en 7P.'):'Italien en découverte, sans niveau scolaire imposé.';
 document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;document.querySelectorAll('[data-lang]').forEach(c=>c.classList.toggle('selected',c===b));info();});$('#startLang').onclick=languageQuiz;info();}

function puzzleGame(context='friend'){
 discover('puzzle');
 const goal=[1,2,3,4,5,6,7,8,0];let tiles=[...goal],moves=0,won=false,prev=-1;
 const adjacent=(a,b)=>Math.abs(a%3-b%3)+Math.abs(Math.floor(a/3)-Math.floor(b/3))===1;
 // Shuffle through legal moves: every board remains solvable.
 for(let i=0;i<[8,20,45][level()];i++){const e=tiles.indexOf(0),choices=tiles.map((v,j)=>j).filter(j=>adjacent(j,e)&&j!==prev),j=choices[Math.floor(Math.random()*choices.length)];[tiles[e],tiles[j]]=[tiles[j],tiles[e]];prev=e;}
 if(tiles.every((v,i)=>v===goal[i]))[tiles[7],tiles[8]]=[tiles[8],tiles[7]];
 modal(`${context==='library'?activityHeader('Le puzzle des nombres','Bibliothèque · logique'):'<div class="modal-eyebrow">Chez Inès · logique</div>'+speaker('Inès','🧩')}<div class="speech">Remets les nombres de 1 à 8 dans l’ordre, ligne par ligne. La case vide doit être en bas à droite. Clique sur une case voisine du vide pour la déplacer.</div><div id="puzzleBoard" class="puzzle"></div><div id="puzzleFeedback" class="feedback" role="status"></div><div class="actions"><button id="puzzleNew" class="secondary">Un autre puzzle</button><button id="puzzleClose" class="primary">${context==='library'?'Retour à la bibliothèque':'Retour au salon'}</button></div>`);
 const render=()=>{$('#puzzleBoard').innerHTML=tiles.map((v,i)=>`<button class="${v?'':'empty'}" aria-label="${v?'Déplacer '+v:'Case vide'}" data-tile="${i}" ${!v?'disabled':''}>${v||''}</button>`).join('');document.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{if(won)return;const i=Number(b.dataset.tile),e=tiles.indexOf(0);if(adjacent(i,e)){[tiles[e],tiles[i]]=[tiles[i],tiles[e]];moves++;render();if(tiles.every((v,j)=>v===goal[j])){won=true;award('puzzle');$('#puzzleFeedback').textContent=`✓ Tout est en ordre ! Puzzle résolu en ${moves} déplacements.`;$('#puzzleFeedback').classList.add('success');}}else $('#puzzleFeedback').textContent='Déplace une case juste à côté du vide, sans diagonale.';});};
 $('#puzzleNew').onclick=puzzleGame;$('#puzzleClose').onclick=closeModal;render();
}
function ballGame(){
 discover('ball');
 let count=0,t=0,raf=0,start=performance.now(),passing=false,done=false;
 modal(`<div class="modal-eyebrow">Le terrain de jeux · adresse</div>${speaker('Sami','⚽')}<div class="speech">Fais-moi cinq passes ! Appuie sur « Faire la passe » quand le curseur est dans la zone verte. Tu peux essayer autant de fois que tu veux.</div><div class="ball-game">${footballAvatar(profile,profile.name,'left')}${footballAvatar(outside.find(n=>n.id==='sami'),'Sami','right')}<span class="ball" id="gameBall">⚽</span><div class="timing-track"><div class="timing-target"></div><div class="timing-cursor" id="timingCursor"></div></div></div><div id="ballFeedback" class="feedback" role="status">0 passe réussie sur 5</div><div class="actions"><button id="passBall" class="primary">Faire la passe</button><button id="ballExit" class="secondary">Retour au quartier</button></div>`,()=>cancelAnimationFrame(raf));
 const tick=now=>{t=((now-start)/[2200,1700,1300][level()])%2;const pos=t<1?t:2-t;$('#timingCursor').style.left=`${pos*100}%`;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
 $('#passBall').onclick=()=>{if(passing||done)return;const pos=t<1?t:2-t;if(pos>=.4&&pos<=.6){passing=true;count++;const ball=$('#gameBall');ball.animate([{left:'65px',top:'130px',transform:'rotate(0deg)'},{left:'50%',top:'55px',transform:'rotate(180deg)'},{left:'calc(100% - 93px)',top:'130px',transform:'rotate(360deg)'}],{duration:600,easing:'ease-in-out',direction:count%2===0?'reverse':'normal',fill:'forwards'}).finished.then(()=>{passing=false;}).catch(()=>{passing=false;});$('#ballFeedback').textContent=`Belle passe ! ${count} sur 5`;if(count===5){done=true;award('ball');$('#ballFeedback').textContent='✓ Cinq passes ! Quelle belle équipe !';$('#passBall').disabled=true;cancelAnimationFrame(raf);}}else $('#ballFeedback').textContent='Presque ! Attends que le curseur orange entre dans la zone verte.';};$('#ballExit').onclick=closeModal;
}
function enterPrompt(destination){
 if(destination==='school'){enterRoom('school');return;}
 if(destination==='home'){enterRoom('home');return;}
 const name=destination==='inesHome'?'Inès':'Tom';modal(`<div class="modal-eyebrow">Une visite chez un copain</div><h2 class="modal-title">🔔 Chez ${name}</h2><p class="modal-description">Tu es devant la porte. Sonne pour demander si tu peux entrer.</p><div class="actions"><button class="primary" id="ring">Sonner</button><button class="secondary" id="dontRing">Revenir plus tard</button></div>`);$('#dontRing').onclick=closeModal;
 $('#ring').onclick=()=>{chime();modal(`${speaker(name,destination==='inesHome'?'🧩':'🔎')}<div class="speech">Salut ${esc(profile.name)} ! Entre, on peut ${destination==='inesHome'?'faire mon puzzle et travailler ensemble':'résoudre le mystère du goûter'} !</div><div class="actions"><button class="primary" id="comeIn">Entrer</button></div>`);$('#comeIn').onclick=()=>{closeModal();enterRoom(destination);};};
}
function interact(n){
 if(!n)return;
 if(Math.hypot(player.x-n.x,player.y-n.y)>=82){toast('Approche-toi avec les flèches ou ZQSD pour parler ou entrer.');return;}
 if(n.task==='cat')catDialog();else if(n.task==='clock')watchQuiz();else if(n.task==='duration')durationQuiz();else if(n.task==='language')languageMenu();else if(n.task==='ball')ballGame();else if(n.task==='findCat')findCat();else if(n.task==='enter')enterPrompt(n.destination);else if(n.task==='math')mathQuiz();else if(n.task==='puzzle')puzzleGame();else if(n.task==='mystery')mysteryQuiz();else if(n.task==='room')enterRoom(n.destination);else if(n.task==='exit')exitRoom();else if(n.task==='wardrobe')profileEditor();else if(n.task==='journal')showMemories();else if(n.task==='stories')storyShelf();else if(n.task==='coloring')coloringShelf();else if(n.task==='library-puzzle')libraryPuzzle();else if(n.task==='revision-fr')revisionShelf('fr');else if(n.task==='revision-de')revisionShelf('de');else if(n.task==='revision-math')revisionShelf('math');else if(n.task==='basket')basketballGame();else if(n.task==='movements')movementGame();else if(n.task==='melody')melodyGame();else if(n.task==='rhythm')rhythmGame();else if(n.task==='hopscotch')hopscotchGame();
}
let outsideReturn={x:1045,y:705};
function enterRoom(s){
 if(scene==='outside')outsideReturn={...player};if(scene==='school'&&schoolChildren.includes(s))schoolReturn={...player};scene=s;near=null;keys.clear();mode='walk';updateTransport();player={x:750,y:915};zoom=1;
 const titles={school:'Bienvenue à l’école',class1:'La classe des découvertes',class2:'La classe des explorateurs',home:'Ton petit chez-toi',inesHome:'Une visite chez Inès',tomHome:'Une visite chez Tom',library:'La petite bibliothèque',gym:'La salle de sport',music:'La salle de musique'};
 $('#locationTitle').textContent=titles[s];$('#placeTag').textContent=s.startsWith('class')?'EN CLASSE':s==='school'?'ÉCOLE DE BELLE-COUR':s==='library'?'BIBLIOTHÈQUE':s==='gym'?'SALLE DE SPORT':s==='music'?'SALLE DE MUSIQUE':s==='home'?'CHEZ TOI':s==='inesHome'?'CHEZ INÈS':'CHEZ TOM';canvas.focus({preventScroll:true});
}
function exitRoom(){
 if(schoolChildren.includes(scene)){enterRoom('school');player={...schoolReturn};return;}
 scene='outside';near=null;player={...outsideReturn};zoom=1;$('#locationTitle').textContent='Une après-midi au Bocage';$('#placeTag').textContent='LE QUARTIER';canvas.focus({preventScroll:true});
}
function entities(){
 if(scene==='outside')return outside.filter(n=>n.id!=='cat'||catStage==='search');
 const exit={id:'exit',x:750,y:945,name:schoolChildren.includes(scene)?'Le couloir':'Sortir',task:'exit',icon:'🚪'};
 if(scene==='school')return [exit,...schoolDoors.map(d=>({...d,task:'room',destination:d.id}))];
 if(scene==='library')return libraryEntities(exit);
 if(scene==='gym')return [exit,{id:'basket',x:505,y:570,name:'Le défi des paniers',task:'basket',icon:'🏀'},{id:'movements',x:985,y:840,name:'Le circuit des mouvements',task:'movements',icon:'🤸'}];
 if(scene==='music')return [exit,{id:'piano',x:580,y:820,name:'Le piano des mélodies',task:'melody',icon:'🎹'},{id:'drums',x:1000,y:820,name:'Le jeu des rythmes',task:'rhythm',icon:'🥁'}];
 if(scene.startsWith('class'))return [exit,{id:'teacher',x:750,y:420,name:'La maîtresse',task:'math',icon:'🔢',shirt:'#b28d71',skin:'#ebbc99',hair:'#5c4334',hairstyle:'long'}];
 const base=[exit,{id:'desk',x:1040,y:625,name:'Travailler les calculs',task:'math',icon:'📚'}];
 if(scene==='home')return [...base,{id:'wardrobe',x:450,y:445,name:'Ta garde-robe',task:'wardrobe',icon:'👕'},{id:'journal',x:490,y:750,name:'Tes souvenirs',task:'journal',icon:'📒'}];
 return [...base,{id:'friend',x:560,y:710,name:scene==='inesHome'?'Inès':'Tom',task:scene==='inesHome'?'puzzle':'mystery',icon:scene==='inesHome'?'🧩':'🔎',shirt:scene==='inesHome'?'#a48aaf':'#7298b0',skin:'#edc19b',hair:scene==='inesHome'?'#613e30':'#ad7447',hairstyle:scene==='inesHome'?'long':'short'}];
}
function obstacles(){if(scene==='outside')return [...buildings.map(b=>({x:b.x-10,y:b.y-10,w:b.w+20,h:b.h+20})),...fixtures.filter(f=>f.id!=='preau'),...fixtures.filter(f=>f.ramp).map(f=>f.ramp),...fixtures.filter(f=>f.id==='preau').flatMap(f=>[{x:f.x+5,y:f.y+4,w:4,h:4},{x:f.x+f.w-9,y:f.y+4,w:4,h:4},{x:f.x+5,y:f.y+f.h-8,w:4,h:4},{x:f.x+f.w-9,y:f.y+f.h-8,w:4,h:4}])];if(scene==='school'||scene==='gym')return [];
 if(scene==='library')return [{x:365,y:340,w:205,h:95},{x:650,y:340,w:200,h:95},{x:935,y:340,w:200,h:95},...[400,660,950].map(x=>({x,y:600,w:180,h:100}))];
 if(scene==='music')return [{x:410,y:525,w:340,h:180},{x:930,y:620,w:140,h:120}];
 if(scene.startsWith('class'))return [{x:580,y:325,w:340,h:70},...([450,700,950].flatMap(x=>[560,740].map(y=>({x:x-40,y:y-25,w:105,h:60}))))];
 return [{x:365,y:330,w:220,h:70},{x:390,y:535,w:210,h:70},{x:650,y:600,w:150,h:85},{x:1010,y:330,w:135,h:100},{x:1000,y:520,w:150,h:70}];}
function walkable(x,y){const margin=scene==='outside'?70:330;const right=scene==='outside'?1430:1170,top=scene==='outside'?110:320,bottom=scene==='outside'?1210:960;if(x<margin||x>right||y<top||y>bottom)return false;return !obstacles().some(o=>x>o.x-10&&x<o.x+o.w+10&&y>o.y-10&&y<o.y+o.h+10);}

function setMode(m){if(scene!=='outside'&&m!=='walk'){toast('À l’intérieur, on se déplace à pied.');return;}mode=m;updateTransport();canvas.focus({preventScroll:true});}
function updateTransport(){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));}
function showMemories(){
 const items=missions.filter(m=>completed.has(m.id));
 modal('<div class="modal-eyebrow">Tes souvenirs</div><h2 class="modal-title">Au fil des rencontres</h2>'+(items.length?items.map(m=>'<p class="report-row"><span>'+m.icon+' '+m.title+'</span><span>✓</span></p>').join(''):'<p class="modal-description">Tes souvenirs apparaîtront ici après tes aventures. Pour le moment, profite de ta promenade et rencontre les habitants.</p>'));
}
function family(){modal(`<div class="modal-eyebrow">Espace famille · prototype 2.0</div><h2 class="modal-title">Apprendre au fil des rencontres</h2><p class="modal-description">Âge actuel : <b>${profile.age} ans</b>. Les contenus utilisent trois paliers : 7–8, 9–10 et 11–12 ans. Ce sont des repères de prototype, à valider avec un enseignant ; ils ne constituent pas une évaluation officielle du PER.</p><div class="report-row"><span>Aventures réussies</span><b>${completed.size}</b></div>${missions.filter(m=>discovered.has(m.id)).map(m=>`<div class="report-row"><span>${m.icon} ${m.title}</span><span>${completed.has(m.id)?'✓ Réussie':'Rencontrée'}</span></div>`).join('')}<p class="modal-description">Les erreurs donnent un indice, sans retirer d’étoile. Une activité rapporte une étoile à sa première réussite et reste rejouable. Le jeu est individuel : tous les personnages sont fictifs, les échanges sont écrits à l’avance.</p><p class="modal-description"><b>Données :</b> pseudo, âge, apparence et progression sont enregistrés dans ce navigateur, sur cet appareil. Aucun compte, publicité, traçage ou échange avec d’autres joueurs. Le bouton d’export permet de garder une copie.</p><p class="modal-description"><b>Le décor :</b> évocation du secteur Bocage / Belle-Cour à Onex. Les façades, toits, cours et alignements ont été redessinés à partir des photos et captures fournies. Le plan reste simplifié et les intérieurs et personnages sont fictifs. Les photographies et captures ne sont pas affichées dans le jeu. <a href="https://noms-geographiques.app.ge.ch/voie/geneve/chemin-du-bocage" target="_blank" rel="noopener">Référence géographique du Canton</a> · <a href="https://edu.ge.ch/enseignement/system/files/2023-06/prescriptions-cantonales-cm.pdf" target="_blank" rel="noopener">Repères scolaires genevois</a>.</p><div class="actions"><button id="editAge" class="primary">Modifier le personnage / l’âge</button><button id="soundToggle" class="secondary">Son : ${sound?'activé':'désactivé'}</button><button id="exportSave" class="secondary">Exporter la sauvegarde</button><button id="importSave" class="secondary">Importer</button><button id="resetSave" class="secondary">Recommencer</button></div><input id="saveFile" class="hidden" type="file" accept="application/json,.json"><p id="familyFeedback" class="feedback" role="status"></p>`);
 $('#editAge').onclick=()=>profileEditor();$('#soundToggle').onclick=()=>{sound=!sound;$('#soundToggle').textContent=`Son : ${sound?'activé':'désactivé'}`;if(sound)chime();};
 $('#exportSave').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,profile,completed:[...completed],catStage,attempts,discovered:[...discovered],coloring:coloringPages},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ma-sauvegarde-bocage.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#importSave').onclick=()=>$('#saveFile').click();$('#saveFile').onchange=async e=>{try{const f=e.target.files[0];if(!f||f.size>100000)throw Error();const d=JSON.parse(await f.text());if(d.version!==1||!d.profile||!Array.isArray(d.completed))throw Error();modal('<h2 class="modal-title">Charger cette aventure ?</h2><p class="modal-description">La progression actuelle sera remplacée par celle du fichier. Tu peux annuler pour garder ta partie.</p><div class="actions"><button id="confirmImport" class="primary">Charger la sauvegarde</button><button id="cancelImport" class="secondary">Annuler</button></div>');$('#cancelImport').onclick=family;$('#confirmImport').onclick=()=>{profile=cleanProfile(d.profile);completed=new Set(d.completed.filter(k=>known.includes(k)));catStage=['search','found','done'].includes(d.catStage)?d.catStage:'new';attempts={};coloringPages=d.coloring&&typeof d.coloring==='object'&&!Array.isArray(d.coloring)?d.coloring:{};discovered=new Set(Array.isArray(d.discovered)?d.discovered.filter(k=>known.includes(k)):[...completed]);created=true;save();updateUI();closeModal();if(scene!=='outside'){if(schoolChildren.includes(scene))exitRoom();exitRoom();}toast('Ton aventure a été chargée.');};}catch{$('#familyFeedback').textContent='Ce fichier n’est pas une sauvegarde valide du Bocage.';}};
 $('#resetSave').onclick=()=>{modal('<h2 class="modal-title">Une nouvelle aventure ?</h2><p class="modal-description">Cela remettra à zéro les étoiles, les missions et les coloriages sur cet appareil. Ton personnage sera conservé. Pense à exporter ta sauvegarde si tu veux la garder.</p><div class="actions"><button id="confirmReset" class="primary">Oui, recommencer</button><button id="cancelReset" class="secondary">Garder ma partie</button></div>');$('#cancelReset').onclick=family;$('#confirmReset').onclick=()=>{completed.clear();discovered.clear();catStage='new';attempts={};coloringPages={};save();updateUI();closeModal();scene='outside';outsideReturn={x:1045,y:705};exitRoom();toast('Une nouvelle histoire commence !');};};
}
function help(){modal(`<div class="modal-eyebrow">Un quartier à explorer</div><h2 class="modal-title">À toi de jouer !</h2><ul class="info-list"><li><b>Déplace ton personnage manuellement</b> avec les flèches, ZQSD ou WASD. Tu peux aussi maintenir les boutons directionnels sous la carte.</li><li>Approche-toi d’une personne, puis appuie sur <b>E ou Entrée</b> ou sur <b>Parler / entrer</b>. Tu peux aussi cliquer sur elle lorsque tu es tout près.</li><li>Les missions et jeux se découvrent <b>dans les conversations</b>. Prends le temps de te promener.</li><li>Pour entrer dans un bâtiment, approche-toi de sa porte. Chez un copain, tu pourras sonner.</li><li>La vue suit ta photo : N pointe presque vers la gauche, un peu vers le haut ; E pointe vers le haut, légèrement à droite. Le nord-est est entre les deux : vers le haut et la gauche de la vue.</li><li>Le vélo et la trottinette permettent d’avancer plus vite dehors. À l’intérieur, on marche.</li><li>Change ton apparence et ton âge avec le bouton de ton personnage. Échap ferme un dialogue.</li></ul><div class="actions"><button class="primary" id="helpDone">Partons nous promener !</button></div>`);$('#helpDone').onclick=closeModal;}


// All scenery is drawn locally. Coordinates follow the selected oblique reference view.
function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function poly(c,points,color,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function text(c,s,x,y,size=16,color='#5e7861',weight='500'){c.font=`${weight} ${size}px Segoe UI,Arial`;c.fillStyle=color;c.textAlign='center';c.fillText(s,x,y);}
function tree(t){const c=ctx,{x,y,s,tone,type}=t;c.save();c.translate(x,y);c.scale(s,s);ellipse(c,15,5,32,13,'#668a4a1e');rr(c,-5,-43,10,47,3,'#9d8965');if(type){poly(c,[[0,-115],[-37,-37],[38,-37]],['#72945d','#7e9d68','#628550','#8ca873'][tone]);poly(c,[[0,-84],[-42,-7],[42,-7]],'#789b62');}else{ellipse(c,-10,-63,32,34,['#81a267','#8fae70','#73965c','#9ab97d'][tone]);ellipse(c,17,-73,32,33,['#92b376','#9ab77c','#84a76c','#a9c48b'][tone]);ellipse(c,-2,-96,29,26,['#9ab97c','#a9c98b','#92b176','#b3ca92'][tone]);ellipse(c,25,-62,18,20,'#91ad70');}c.restore();}
function building(b){
 const c=ctx,{x,y,w,h,height:hh}=b,top=y+h-hh,school=b.school;
 poly(c,[[x+8,y+h+6],[x+w+28,y+h+13],[x+w+28,y-hh+10],[x+w,y-hh]],'#506b4923');
 rr(c,x,y-hh,w,h+hh,2,b.color);poly(c,[[x+w,y-hh],[x+w+13,y-hh-7],[x+w+13,y+h-7],[x+w,y+h]],b.wood?'#bea580':school?'#937451':'#c5b596');
 // Light horizontal timber slats on the annotated lower-left building.
 if(b.wood){
  for(let sy=top+2,i=0;sy<y+h;sy+=4,i++){
   rr(c,x,sy,w,2,0,i%3===0?'#ead4ae':'#dfc79e');
   c.strokeStyle='#bca17b88';c.lineWidth=.65;c.beginPath();c.moveTo(x,sy+3);c.lineTo(x+w,sy+3);c.lineTo(x+w+13,sy-4);c.stroke();
  }
 }
 // Brick-like wood cladding and the school's characteristic yellow beams.
 if(school){c.strokeStyle='#775b3c44';c.lineWidth=1;for(let sy=top+4;sy<y+h;sy+=6){c.beginPath();c.moveTo(x,sy);c.lineTo(x+w,sy);c.stroke();}}
 const cols=Math.max(2,Math.floor(w/33)),rows=school?2:3,winW=school?21:16;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
 const wx=x+9+col*(w-13)/cols,wy=top+8+row*(hh-13)/rows;
 rr(c,wx,wy,winW,school?24:17,1,'#566965');rr(c,wx+2,wy+2,winW*.4,school?20:13,0,'#a7bbb0');
 if(!school&&col%2===0&&row===1){rr(c,wx-4,wy+13,25,9,1,'#c8b99e');c.strokeStyle='#797e6d';c.lineWidth=1;c.strokeRect(wx-4,wy+13,25,9);}
 }
 if(school){rr(c,x,top+hh*.5-3,w,9,0,'#e4bf4f');for(let sx=x+7;sx<x+w;sx+=36)rr(c,sx,top,4,hh,0,'#c3a046');}
 const doorX=x+w/2;
 if(b.type!=='decor'){rr(c,doorX-12,y+h-33,24,33,1,school?'#c5a249':'#6d7768');rr(c,doorX-9,y+h-29,18,22,1,'#8da29b');rr(c,doorX-21,y+h,42,6,2,'#c8c6b3');}
 // Roof orientation follows each footprint in the selected oblique reference.
 const roofY=y-hh,rise=school?13:17;
 if(b.flat){
 rr(c,x-4,roofY,w+8,h,2,b.wood?'#bea580':b.concrete?'#b5beb8':'#bb8c70');rr(c,x+6,roofY+8,w-12,h-17,1,b.wood?'#dcc49c':b.concrete?'#e1e3da':'#b7ada0');
 if(b.wood){for(let sy=roofY+10,i=0;sy<top-10;sy+=5,i++){rr(c,x+7,sy,w-14,2,0,i%3===0?'#ead4ae':'#e2cba5');c.strokeStyle='#bca17b88';c.lineWidth=.65;c.beginPath();c.moveTo(x+7,sy+3);c.lineTo(x+w-7,sy+3);c.stroke();}}
 if(b.concrete){for(let sx=x+26;sx<x+w-30;sx+=45){rr(c,sx,roofY+28,31,33,1,'#a4b4b3','#7e9392');rr(c,sx+5,roofY+32,20,25,1,'#d3dfda');}}else rr(c,x+18,roofY+22,w-36,h-42,1,'#455769');c.strokeStyle=b.wood?'#b89d78':'#a7b0ae';c.lineWidth=2;c.strokeRect(x+6,roofY+8,w-12,h-17);
 }else if(w>=h){
 const mid=(roofY+top)/2-rise;
 poly(c,[[x-6,roofY],[x+w+7,roofY],[x+w+7,mid],[x-6,mid]],'#d39a7c');
 poly(c,[[x-6,mid],[x+w+7,mid],[x+w+7,top],[x-6,top]],'#c78667');
 c.strokeStyle='#ae73533f';c.lineWidth=.8;
 for(let sy=roofY;sy<top;sy+=7){c.beginPath();c.moveTo(x-5,sy);c.lineTo(x+w+6,sy);c.stroke();}
 for(let sx=x-5;sx<x+w+6;sx+=8){c.beginPath();c.moveTo(sx,roofY);c.lineTo(sx,top);c.stroke();}
 c.strokeStyle='#ac7155';c.lineWidth=2;c.beginPath();c.moveTo(x-6,mid);c.lineTo(x+w+7,mid);c.stroke();
 }else{
 const ridge=w/2;poly(c,[[x-6,roofY],[x+ridge,roofY-rise],[x+ridge,top-rise],[x-6,top]],'#d39a7c');
 poly(c,[[x+ridge,roofY-rise],[x+w+7,roofY],[x+w+7,top],[x+ridge,top-rise]],'#c78667');
 if(!school)poly(c,[[x-3,top],[x+ridge,top-rise],[x+w+3,top]],b.color);
 c.strokeStyle='#ae73533f';c.lineWidth=.8;for(let sy=roofY;sy<top-rise;sy+=7){c.beginPath();c.moveTo(x,sy);c.lineTo(x+w,sy);c.stroke();}
 c.strokeStyle='#ac7155';c.lineWidth=2;c.beginPath();c.moveTo(x+ridge,roofY-rise);c.lineTo(x+ridge,top-rise);c.stroke();
 }
 if(!school){rr(c,x+w*.7,y-hh+h*.32-19,7,17,1,'#9b8b77');rr(c,x+w*.7-2,y-hh+h*.32-21,11,4,1,'#b3a38b');}
 if(b.ref==='school-spine'){poly(c,[[x+w,444],[x+w+12,438],[x+w+12,473],[x+w,479]],'#d6b254');poly(c,[[x+w+2,446],[x+w+10,442],[x+w+10,470],[x+w+2,474]],'#72988d');}
 if(b.type==='school'){rr(c,x-7,top+30,w+14,12,1,'#e9c648');text(c,'ÉCOLE DE BELLE-COUR',doorX,top+39,7,'#5b5936','700');}
}
function character(c,x,y,a,moving=false,portrait=false){
 c.save();c.translate(x,y);const bounce=moving?Math.sin(time*12)*1.7:0;c.translate(0,bounce);
 ellipse(c,3,3,14,5,'#49653c24');const walk=moving?Math.sin(time*12)*5:0;
 if(!portrait&&a.isPlayer&&mode!=='walk'){
 c.strokeStyle='#344e4a';c.lineWidth=3;
 const wheels=mode==='bike'?[[ -17,0],[18,0]]:[[-15,2],[19,2]];for(const [wx,wy]of wheels){c.beginPath();c.arc(wx,wy,mode==='bike'?10:4,0,Math.PI*2);c.stroke();}
 c.strokeStyle='#bc8f5b';c.beginPath();c.moveTo(-17,0);c.lineTo(0,mode==='bike'?-15:0);c.lineTo(18,0);c.lineTo(13,-28);c.lineTo(20,-28);c.stroke();
 }
 c.strokeStyle=a.pants||'#536d7a';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(-5,-17);c.lineTo(-6-walk*.4,-3);c.moveTo(5,-17);c.lineTo(6+walk*.4,-3);c.stroke();
 rr(c,-10-walk*.4,-5,10,5,2,'#efeadc');rr(c,2+walk*.4,-5,11,5,2,'#efeadc');
 const long=a.hairstyle==='long';if(long)rr(c,-13,-56,26,30,8,a.hair||'#66432f');
 rr(c,-11,-39,22,24,7,a.shirt||'#d77f54');c.strokeStyle=a.skin||'#edc19b';c.lineWidth=5;c.beginPath();c.moveTo(-11,-34);c.lineTo(-15,-21+walk*.6);c.moveTo(11,-34);c.lineTo(15,-21-walk*.6);c.stroke();
 ellipse(c,0,-49,12,13,a.skin||'#edc19b');ellipse(c,0,-56,12,7,a.hair||'#66432f');rr(c,-12,-54,5,long?16:8,2,a.hair||'#66432f');rr(c,8,-54,4,long?17:6,2,a.hair||'#66432f');
 if(a.hairstyle==='curls')for(let i=0;i<5;i++)ellipse(c,-10+i*5,-59-Math.sin(i)*2,4.5,5,a.hair||'#66432f');
 ellipse(c,-4,-47,1.4,1.8,a.eyes||'#443e31');ellipse(c,4,-47,1.4,1.8,a.eyes||'#443e31');c.strokeStyle='#a8745c';c.lineWidth=1;c.beginPath();c.arc(0,-45,3,0,Math.PI);c.stroke();
 if(!portrait&&a.isPlayer&&mode!=='walk'){ellipse(c,0,-60,15,7,'#e9b55e');rr(c,-16,-60,32,4,2,'#d99e4c');}
 c.restore();
}
function label(n){
 if(Math.hypot(player.x-n.x,player.y-n.y)>=100||n.id==='cat')return;
 const width=Math.max(60,n.name.length*8+20),isDoor=n.task==='enter'||n.task==='room'||n.task==='exit';
 const y=n.y-(isDoor?20:85);rr(ctx,n.x-width/2,y-20,width,27,12,'#fffffff0');text(ctx,n.name,n.x,y-2,13,'#526c57','600');
}
function bench(x,y){const c=ctx;ellipse(c,x+7,y+5,31,9,'#6f8a5120');rr(c,x-28,y-15,56,10,3,'#ba9770');rr(c,x-28,y-30,56,9,3,'#c6a57b');rr(c,x-23,y-22,4,30,0,'#6f8771');rr(c,x+18,y-22,4,30,0,'#6f8771');}
function flowers(x,y){for(let i=0;i<6;i++){const dx=Math.sin(i*4.3)*14,dy=Math.cos(i*2.7)*8;ctx.strokeStyle='#92a777';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+dx,y+dy);ctx.lineTo(x+dx,y+dy-9);ctx.stroke();ellipse(ctx,x+dx,y+dy-10,3,3,['#ecd291','#d8b0aa','#e6dcc1'][i%3]);}}
function parkedCar(x,y,color){
 rr(ctx,x+3,y+3,22,39,5,'#61714c25');rr(ctx,x,y,21,37,5,color);rr(ctx,x+3,y+8,15,16,3,'#829c9a');rr(ctx,x+2,y+4,17,3,1,'#e4e4d4');
}
function drawFixture(f){const c=ctx;
 if(f.id==='pingpong'){
  const {x,y,w,h}=f;ellipse(c,x+w/2+8,y+h/2+8,w*.6,h*.5,'#52694f22');
  c.strokeStyle='#62766c';c.lineWidth=4;for(const dx of [9,w-9]){c.beginPath();c.moveTo(x+dx,y+h-10);c.lineTo(x+dx,y+h+6);c.stroke();}
  rr(c,x,y-9,w,h,3,'#75998b');rr(c,x+3,y-7,w-6,h-5,1,'#82aa96','#e8eddf');
  c.strokeStyle='#f7f6e3';c.lineWidth=1.5;c.beginPath();c.moveTo(x+3,y+h/2-8);c.lineTo(x+w-3,y+h/2-8);c.moveTo(x+w/2,y-8);c.lineTo(x+w/2,y+h-9);c.stroke();
  rr(c,x+w/2-1,y-17,2,h+3,1,'#f8f7e8');c.strokeStyle='#5a7468';c.lineWidth=1;c.strokeRect(x+w/2-3,y-17,6,h+3);
  for(let sy=y-13;sy<y+h-16;sy+=5){c.beginPath();c.moveTo(x+w/2-3,sy);c.lineTo(x+w/2+3,sy);c.stroke();}
  ellipse(c,x+17,y+12,6,8,'#c47c60');rr(c,x+15,y+18,3,8,1,'#bc9b71');ellipse(c,x+w-17,y+8,2.5,2.5,'#fff9e9');
  text(c,'Ping-pong',x+w/2,y+h+23,12,'#7e8e70');
 }else if(f.id==='slide'){
  const {x,y}=f;ellipse(c,x+35,y+63,39,17,'#52694f20');
  c.strokeStyle='#af8f67';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(x+10,y+31);c.lineTo(x+10,y-19);c.moveTo(x+36,y+31);c.lineTo(x+36,y-19);c.stroke();
  rr(c,x+7,y-23,32,9,2,'#b99c73');
  poly(c,[[x+15,y-15],[x+35,y-15],[x+64,y+54],[x+44,y+54]],'#e7bd57');
  c.strokeStyle='#c88f48';c.lineWidth=3;c.beginPath();c.moveTo(x+13,y-18);c.lineTo(x+43,y+57);c.lineTo(x+64,y+57);c.lineTo(x+37,y-18);c.stroke();
  c.strokeStyle='#6f9890';c.lineWidth=3;c.beginPath();c.moveTo(x+5,y-32);c.lineTo(x+5,y-13);c.moveTo(x+39,y-32);c.lineTo(x+39,y-13);c.moveTo(x+5,y-32);c.lineTo(x+39,y-32);c.stroke();
  c.strokeStyle='#ac8562';c.lineWidth=3;c.beginPath();c.moveTo(x-7,y+42);c.lineTo(x+10,y-14);c.moveTo(x+7,y+43);c.lineTo(x+24,y-14);c.stroke();
  for(let i=0;i<5;i++){const yy=y+34-i*10,xx=x-4+i*3;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+14,yy);c.stroke();}
  text(c,'Toboggan',x+35,y+82,12,'#7e8e70');
 }else if(f.id==='preau'){
  const {x,y,w,h,height:hh}=f;
  rr(c,x-2,y,w+4,h,3,'#6977682d');
  c.strokeStyle='#9d815c';c.lineWidth=4;c.lineCap='round';
  for(const [px,py]of [[x+7,y+6],[x+w-7,y+6],[x+7,y+h-6],[x+w-7,y+h-6]]){c.beginPath();c.moveTo(px,py);c.lineTo(px,py-hh);c.stroke();}
  const roofY=y-hh,roofBottom=y+h-hh,cx=x+w/2,cy=(roofY+roofBottom)/2-15;
  const underRoof=player.x>x-12&&player.x<x+w+12&&player.y>y-15&&player.y<y+h+14;
  c.save();if(underRoof)c.globalAlpha=.3;
  poly(c,[[x-7,roofY],[x+w+7,roofY],[cx,cy]],'#d49c7d');
  poly(c,[[x+w+7,roofY],[x+w+7,roofBottom],[cx,cy]],'#b8785b');
  poly(c,[[x+w+7,roofBottom],[x-7,roofBottom],[cx,cy]],'#c98a6b');
  poly(c,[[x-7,roofBottom],[x-7,roofY],[cx,cy]],'#d09a79');
  c.strokeStyle='#a87558';c.lineWidth=1.5;c.beginPath();c.moveTo(x-7,roofY);c.lineTo(cx,cy);c.lineTo(x+w+7,roofBottom);c.moveTo(x+w+7,roofY);c.lineTo(cx,cy);c.lineTo(x-7,roofBottom);c.stroke();
  c.restore();text(c,'Préau',x+w/2,y+h+15,11,'#7e8e70');
 }else if(f.id==='garage'){
  const {x,y,w,h,ramp}=f,left=ramp.x;
  // The ramp runs from the left into the west-facing portal, under a tile roof.
  poly(c,[[left-4,y+5],[x+5,y-1],[x+5,y+54],[left-4,y+68]],'#bdbdae');
  poly(c,[[left+5,y+15],[x,y+10],[x,y+47],[left+5,y+57]],'#929b93');
  poly(c,[[left-4,y+5],[x+5,y-1],[x,y+10],[left+5,y+15]],'#ceccb9');
  poly(c,[[left-4,y+68],[x+5,y+54],[x,y+47],[left+5,y+57]],'#c7c7b4');
  c.strokeStyle='#acb4a8';c.lineWidth=1;for(let xx=left+18;xx<x-8;xx+=14){c.beginPath();c.moveTo(xx,y+15);c.lineTo(xx,y+55-(xx-left)*.04);c.stroke();}
  // The long front wall is closed. The only opening is on the left side.
  poly(c,[[x,y-2],[x+23,y+5],[x+23,y+h],[x,y+51]],'#bfc1ad');
  poly(c,[[x+23,y+5],[x+w,y+5],[x+w,y+h],[x+23,y+h]],'#d0cdb9');
  poly(c,[[x+3,y+7],[x+18,y+12],[x+18,y+51],[x+3,y+44]],'#344c44');
  c.strokeStyle='#92a297';c.lineWidth=1.5;c.beginPath();c.moveTo(x+7,y+11);c.lineTo(x+7,y+42);c.stroke();
  c.strokeStyle='#eee6cf';c.lineWidth=4;c.beginPath();c.moveTo(x-2,y+13);c.lineTo(x-2,y+46);c.stroke();
  for(let yy=y+16;yy<y+45;yy+=10){c.strokeStyle='#bd7a62';c.beginPath();c.moveTo(x-2,yy);c.lineTo(x-2,yy+5);c.stroke();}
  const roofTop=y-32,roofBottom=y+8,ridge=y-19;
  c.save();if(player.x>x-8&&player.x<x+w+8&&player.y>roofTop-15&&player.y<y)c.globalAlpha=.42;
  poly(c,[[x+4,roofTop],[x+w-4,roofTop],[x+w+2,ridge],[x-2,ridge]],'#d39a7c');
  poly(c,[[x-2,ridge],[x+w+2,ridge],[x+w+7,roofBottom],[x-7,roofBottom]],'#c78667');
  c.strokeStyle='#ae73534d';c.lineWidth=.8;for(let yy=roofTop+4;yy<roofBottom;yy+=6){c.beginPath();c.moveTo(x+2,yy);c.lineTo(x+w-2,yy);c.stroke();}
  for(let xx=x+6;xx<x+w;xx+=8){c.beginPath();c.moveTo(xx,roofTop+1);c.lineTo(xx,roofBottom-1);c.stroke();}
  c.strokeStyle='#a97054';c.lineWidth=2;c.beginPath();c.moveTo(x-2,ridge);c.lineTo(x+w+2,ridge);c.stroke();c.restore();
  rr(c,left-7,y+3,3,32,1,'#8c9d88');rr(c,left-15,y-12,20,22,3,'#72969e');text(c,'P',left-5,y+4,15,'#fff8e1','700');
  text(c,'Entrée garage',left+(x-left)/2,y-3,11,'#7b8d72');
 }
}
function outdoorGround(){const c=ctx;
 rr(c,57,75,1380,1150,60,'#bbcba3');rr(c,62,65,1370,1150,60,'#d7dfbf');
 c.globalAlpha=.45;for(let i=0;i<210;i++)ellipse(c,85+(i*137)%1320,105+(i*263)%950,1.4,1,'#a6b789');c.globalAlpha=1;
 // Grand-Lancy runs diagonally along the left side of the school in this view.
 poly(c,[[28,826],[624,110],[712,81],[88,872]],'#d3cdb9');
 poly(c,[[36,831],[640,112],[690,96],[77,864]],'#b4b7af');
 c.strokeStyle='#f0e9d5';c.lineWidth=2;c.setLineDash([18,14]);c.beginPath();c.moveTo(58,848);c.lineTo(667,103);c.stroke();c.setLineDash([]);
 c.save();c.translate(325,545);c.rotate(-.885);text(c,'Route du Grand-Lancy',0,0,14,'#7c8778');c.restore();
 for(const l of lanes){rr(c,l.x-3,l.y+3,l.w+6,l.h,5,'#c5c6b4');rr(c,l.x,l.y,l.w,l.h,4,'#ded9c6');}
 // Two small play areas: the annotated table and slide are directly in front of the school.
 rr(c,417,548,220,96,13,'#c7c6b0');rr(c,424,553,206,86,10,'#ddd5bb');
 // Continuous side courtyard from the rear play area to the front gate.
 rr(c,schoolCourtyard.x,schoolCourtyard.y,schoolCourtyard.w,schoolCourtyard.h,4,'#c8c4b5');
 rr(c,632,528,163,112,4,'#cbc6b7');
 // Rear play surface and a small wooden climbing structure.
 rr(c,728,315,65,72,3,'#c98772');
 rr(c,740,332,20,23,2,'#ac916e');
 poly(c,[[738,332],[750,316],[762,332]],'#b67b5e');
 c.strokeStyle='#9b7c5a';c.lineWidth=3;c.beginPath();c.moveTo(742,351);c.lineTo(742,371);c.moveTo(758,351);c.lineTo(758,371);c.stroke();
 poly(c,[[755,352],[765,352],[786,377],[776,377]],'#dcc170');
 // White rectangle and central hopscotch, as marked in Ecole_zoom.png.
 c.strokeStyle='#f6efdc';c.lineWidth=2;c.strokeRect(643,507,140,108);
 const unit=10,hx=699,hy=530;
 for(let i=0;i<7;i++){const yy=hy+i*11;if(i===2||i===4){c.strokeRect(hx-10,yy,10,10);c.strokeRect(hx,yy,10,10);}else c.strokeRect(hx-5,yy,10,10);}
 c.beginPath();c.arc(hx,hy-2,5,Math.PI,0);c.stroke();
 text(c,'Marelle',705,631,10,'#829077');
 // Footpaths to the three entrances and through the residential groups.
 rr(c,508,526,55,129,4,'#ded9c6');rr(c,849,415,55,260,4,'#ded9c6');rr(c,860,555,55,120,4,'#ded9c6');
 rr(c,1085,255,250,25,3,'#ded9c6');rr(c,1095,400,250,25,3,'#ded9c6');rr(c,1100,545,260,25,3,'#ded9c6');
 // The lower Pampres buildings are across this street, as in the reference photo.
 rr(c,165,915,1220,38,5,'#c8c5b5');rr(c,165,918,1220,30,4,'#dfd9c5');text(c,'Chemin des Pampres',515,939,13,'#969781');
 // The entrance branches from the left of the garage, not from its lower facade.
 poly(c,[[423,923],[463,872],[480,872],[488,917]],'#d2ceba');
 poly(c,[[438,929],[471,884],[481,890],[474,934]],'#b5b8af');
 // The access road continues south between the two lower buildings.
 rr(c,garageAccess.x-9,garageAccess.y,garageAccess.w+18,garageAccess.h,4,'#d2ceba');
 rr(c,garageAccess.x,garageAccess.y,garageAccess.w,garageAccess.h,3,'#b5b8af');
 c.strokeStyle='#ede8d5';c.lineWidth=1.5;c.beginPath();c.moveTo(garageAccess.x+4,garageAccess.y+36);c.lineTo(garageAccess.x+4,garageAccess.y+garageAccess.h-5);c.moveTo(garageAccess.x+garageAccess.w-4,garageAccess.y+36);c.lineTo(garageAccess.x+garageAccess.w-4,garageAccess.y+garageAccess.h-5);c.stroke();
 c.save();c.translate(1034,585);c.rotate(-Math.PI/2);text(c,'Chemin du Bocage',0,0,12,'#999a81');c.restore();
 for(const b of buildings){if(b.school)continue;
 for(let sx=b.x+13;sx<b.x+b.w-10;sx+=gardenSize.spacing){
 const doorX=b.x+b.w/2;if(b.type!=='decor'&&sx<doorX+17&&sx+gardenSize.width>doorX-17)continue;
 rr(c,sx,b.y+b.h+gardenSize.offset,gardenSize.width,gardenSize.depth,3,'#bdcda2');
 rr(c,sx,b.y+b.h+gardenSize.offset+gardenSize.depth-2,gardenSize.width,4,2,'#91a77a');
 }
 if(b.type!=='decor')rr(c,b.x+b.w/2-11,b.y+b.h+5,22,gardenSize.offset+gardenSize.depth+4,2,'#ded9c6');
 }
 for(const [x,y]of [[980,225],[985,360],[1000,490],[1048,730]])parkedCar(x,y,'#a1b1af');
 // Small shelter and crossing beside the school, aligned with the diagonal road.
 rr(c,553,233,34,9,2,'#8d9d8a');rr(c,557,238,3,27,1,'#80938a');rr(c,580,238,3,27,1,'#80938a');
 for(let i=0;i<5;i++)rr(c,405+i*10,429-i*12,7,21,0,'#e5cb76');
 bench(758,665);bench(1315,882);flowers(760,420);flowers(1048,620);flowers(288,812);
 // Carved pillar and bike racks echo the provided school facade photograph.
 rr(c,636,526,8,34,2,'#b5ad92');for(let i=0;i<4;i++){c.strokeStyle='#837d67';c.beginPath();c.arc(640,531+i*7,3,0,Math.PI);c.stroke();}
 c.strokeStyle='#7e9b80';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.arc(662+i*13,611,5,Math.PI,0);c.lineTo(667+i*13,623);c.stroke();}
}

function furniture(x,y,w,h,color){rr(ctx,x+6,y+6,w,h,4,'#55715315');rr(ctx,x,y-20,w,h+20,4,color);rr(ctx,x+4,y-17,w-8,h-3,3,'#f4ecd7');}
function indoorGround(){const c=ctx;
 rr(c,270,265,960,755,30,'#b6c4a3');rr(c,285,260,930,735,20,'#efe6d0');
 for(let y=330;y<980;y+=35){c.strokeStyle='#ddd2b84f';c.lineWidth=1;c.beginPath();c.moveTo(300,y);c.lineTo(1200,y);c.stroke();}
 rr(c,285,245,930,60,8,'#c8d7b8');rr(c,285,280,17,710,4,'#d2dec3');rr(c,1198,280,17,710,4,'#bacba9');rr(c,691,965,120,20,4,'#bfaa88');
 if(scene==='library'){drawLibraryRoom();}else if(scene==='gym'){drawGymRoom();}else if(scene==='music'){drawMusicRoom();}else if(scene==='school'){drawSchoolHall();
 }else if(scene.startsWith('class')){
 rr(c,510,285,480,115,3,'#b7a07e');rr(c,520,292,460,101,2,'#547361');text(c,'Bienvenue aux petits curieux !',750,332,23,'#f1efd7');text(c,scene==='class1'?'8 + 7 = ?':'6 × 4 = ?',750,374,28,'#efe9c4');
 for(const x of [450,700,950])for(const y of [560,740]){furniture(x-40,y-25,105,60,'#c7b28e');rr(c,x-12,y-26,38,29,2,'#91aeba');rr(c,x+3,y-22,2,20,0,'#e5eddd');rr(c,x-10,y+56,48,17,3,'#90aa87');}
 furniture(580,325,340,70,'#bea482');
 }else{
 // A bedroom corner, sofa, dining table, bookshelf and desk.
 rr(c,365,330,220,70,4,'#baaa8e');for(let i=0;i<8;i++)rr(c,379+i*24,334,18,45,2,['#bd8d70','#96af91','#91aab5','#c8b37d'][i%4]);
 rr(c,390,520,210,85,15,'#8eaa88');rr(c,398,500,194,40,12,'#a5bc99');rr(c,390,525,22,75,8,'#9cb791');rr(c,580,525,22,75,8,'#9cb791');
 rr(c,625,560,200,200,35,'#d9c4a5');rr(c,641,578,166,164,30,'#e6d6b8');furniture(650,600,150,85,'#b69a76');rr(c,700,615,39,24,3,'#b8c796');
 rr(c,1005,330,145,100,5,'#c7aa8d');rr(c,1014,337,127,85,4,'#e9dcc1');rr(c,1025,343,36,25,5,'#faf5e8');rr(c,1075,343,36,25,5,'#faf5e8');rr(c,1014,375,127,47,3,'#a5b9bb');
 furniture(1000,520,150,70,'#b59e7d');rr(c,1040,525,55,32,2,'#99b1a0');rr(c,1055,597,49,18,3,'#b49776');
 text(c,scene==='home'?'Ta chambre':scene==='inesHome'?'Chez Inès':'Chez Tom',1090,480,18,'#889a73');
 }
 // Windows and potted plants.
 for(const x of [370,1020]){rr(c,x,250,100,68,3,'#90aeb1');rr(c,x+5,255,90,56,1,'#c2d8cc');c.fillStyle='#eef0de';c.fillRect(x+48,252,5,64);c.fillRect(x,283,100,4);}
 for(const [x,y]of [[330,410],[1155,855]]){ellipse(c,x,y,20,9,'#c8ad8b');rr(c,x-14,y-27,28,27,4,'#b99675');for(let i=0;i<5;i++)ellipse(c,x+Math.sin(i*2)*13,y-36+Math.cos(i*2)*9,11,17,['#83a170','#99b07b'][i%2]);}
}
function catDraw(n,c=ctx){ellipse(c,n.x,n.y+2,17,5,'#61794b21');ellipse(c,n.x,n.y-9,14,10,'#c5a17c');ellipse(c,n.x+10,n.y-20,9,9,'#c5a17c');poly(c,[[n.x+3,n.y-25],[n.x+4,n.y-34],[n.x+10,n.y-27]],'#b38c65');poly(c,[[n.x+13,n.y-26],[n.x+20,n.y-33],[n.x+19,n.y-23]],'#b38c65');c.strokeStyle='#b38c65';c.lineWidth=5;c.beginPath();c.moveTo(n.x-12,n.y-10);c.quadraticCurveTo(n.x-27,n.y-30,n.x-19,n.y-30);c.stroke();ellipse(c,n.x+10,n.y-21,1,1.6,'#3e4932');ellipse(c,n.x+16,n.y-21,1,1.6,'#3e4932');}
function render(){
 const dpr=Math.min(window.devicePixelRatio||1,2);const rect=canvas.getBoundingClientRect();if(Math.abs(cw-rect.width)>.5||Math.abs(ch-rect.height)>.5||canvas.width!==Math.round(rect.width*dpr)){cw=rect.width;ch=rect.height;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);ctx.fillStyle='#e8edde';ctx.fillRect(0,0,cw,ch);
 const base=Math.min(cw/(scene==='outside'?1550:1160),ch/(scene==='outside'?1290:900));const scale=base*zoom;
 const center=scene==='outside'?{x:750,y:635}:{x:750,y:620};
 // Zoom follows the player, while keeping a complete view at default zoom.
 const follow=Math.max(0,Math.min(1,zoom-1));const cx=center.x+(player.x-center.x)*follow,cy=center.y+(player.y-center.y)*follow;
 view={scale,ox:cw/2-cx*scale,oy:ch/2-cy*scale};ctx.translate(view.ox,view.oy);ctx.scale(scale,scale);
 if(scene==='outside')outdoorGround();else indoorGround();
 const es=entities();let objects=[];
 if(scene==='outside')objects=[...trees.map(t=>({y:t.y,draw:()=>tree(t)})),...fixtures.map(f=>({y:f.y+f.h,draw:()=>drawFixture(f)})),...buildings.map(b=>({y:b.y+b.h,draw:()=>{ctx.save();if(player.x>b.x-8&&player.x<b.x+b.w+20&&player.y>b.y-b.height-30&&player.y<b.y)ctx.globalAlpha=.42;building(b);ctx.restore();}}))];
 for(const n of es){if(n.id==='cat')objects.push({y:n.y,draw:()=>catDraw(n)});else if(n.shirt)objects.push({y:n.y,draw:()=>character(ctx,n.x,n.y,n,false)});}
 objects.push({y:player.y,draw:()=>{
 ellipse(ctx,player.x,player.y+3,24,10,'#f9f2c371');ctx.strokeStyle='#ffffdf';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(player.x,player.y+3,22,9,0,0,Math.PI*2);ctx.stroke();character(ctx,player.x,player.y,{...profile,isPlayer:true},keys.size>0);
 if(catStage==='found'){ctx.save();ctx.translate(player.x,player.y-24);ctx.scale(.65,.65);catDraw({x:0,y:0},ctx);ctx.restore();ctx.strokeStyle=profile.skin;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(player.x-12,player.y-31);ctx.quadraticCurveTo(player.x,player.y-16,player.x+13,player.y-29);ctx.stroke();}
 text(ctx,'TOI',player.x,player.y-74,11,'#4c7257','700');}});
 objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 es.forEach(label);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function tick(now){
 const dt=last?Math.min((now-last)/1000,.04):0;last=now;time+=dt;
 if(!$('#modal').open){let dx=0,dy=0;if(keys.has('ArrowUp')||keys.has('w')||keys.has('z'))dy--;if(keys.has('ArrowDown')||keys.has('s'))dy++;if(keys.has('ArrowLeft')||keys.has('a')||keys.has('q'))dx--;if(keys.has('ArrowRight')||keys.has('d'))dx++;
 const speed=scene==='outside'?{walk:170,bike:310,scooter:245}[mode]:170;
 if(dx||dy){const norm=Math.hypot(dx,dy);dx=dx/norm*speed*dt;dy=dy/norm*speed*dt;if(walkable(player.x+dx,player.y))player.x+=dx;if(walkable(player.x,player.y+dy))player.y+=dy;}
 near=entities().filter(n=>Math.hypot(n.x-player.x,n.y-player.y)<82).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
 $('#interaction').classList.toggle('hidden',!near);if(near)$('#interaction span').textContent=(near.task==='enter'?'Entrer : ':near.task==='exit'?'':near.task==='room'?'Visiter : ':'')+near.name;
 if(time-saveTimer>30){saveTimer=time;if(created)save();}
 }
 render();requestAnimationFrame(tick);
}
canvas.addEventListener('pointerdown',e=>{
 if($('#modal').open)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left-view.ox)/view.scale,y=(e.clientY-r.top-view.oy)/view.scale;
 const es=entities();let n=es.filter(n=>Math.hypot(x-n.x,y-(n.y-(n.shirt?30:0)))<62).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];
 if(!n&&scene==='outside'){const b=buildings.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y-b.height&&y<=b.y+b.h);if(b)n=es.find(n=>n.id===b.type);}
 if(n&&Math.hypot(player.x-n.x,player.y-n.y)<85)interact(n);else if(n)toast('Approche-toi avec les flèches ou ZQSD.');else canvas.focus({preventScroll:true});
});
document.addEventListener('keydown',e=>{if($('#modal').open)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','z','q','e','Enter'].includes(k)){e.preventDefault();if(k==='e'||k==='Enter'){if(!e.repeat)interact(entities().filter(n=>Math.hypot(n.x-player.x,n.y-player.y)<82).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]);}else keys.add(k);}});
document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();if(created)save();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
$('#touchInteract').onclick=()=>interact(near);$('#interaction').onclick=()=>interact(near);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#zoomIn').onclick=()=>{zoom=Math.min(2,zoom+.25);};$('#zoomOut').onclick=()=>{zoom=Math.max(1,zoom-.25);};
$('#fullscreenButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Le plein écran n’est pas disponible dans ce navigateur.');}canvas.focus({preventScroll:true});};
$('#profileButton').onclick=()=>profileEditor();$('#helpButton').onclick=help;$('#parentButton').onclick=family;
$('.brand').onclick=e=>{e.preventDefault();help();};
// Activities discovered inside the school, with no global activity catalogue.
let activeActivity=null;
let coloringPages=saved.coloring&&typeof saved.coloring==='object'&&!Array.isArray(saved.coloring)?saved.coloring:{};
function activityHeader(title,subtitle='À l’école'){return `<div class="modal-eyebrow">${esc(subtitle)}</div><h2 class="modal-title">${title}</h2>`;}
function activityReturn(label='Retour à la pièce'){return `<div class="actions"><button id="activityClose" class="secondary">${label}</button></div>`;}
function bindActivityClose(){if($('#activityClose'))$('#activityClose').onclick=closeModal;}
function libraryPuzzle(){puzzleGame('library');}
const stories=[
 {title:'Moka et le géant du mur',art:'🐈',pages:['En rentrant du parc, Moka aperçoit une immense silhouette sur un mur. Il se cache derrière un pot de fleurs.','Camille avance et lève une main. Le géant lève une main aussi ! Camille recule : la silhouette grandit.','Moka comprend : le géant est une ombre. La lumière du soleil rencontre Camille et dessine sa silhouette sur le mur. Moka ose enfin passer.'],q:'Qu’est-ce qui formait le géant sur le mur ?',correct:'L’ombre de Camille.',wrong:['Un vrai géant.','Un arbre qui marchait.']},
 {title:'Le casque bleu',art:'🚲',pages:['Léo veut partir à vélo, mais son casque bleu a disparu. Il demande à Inès de l’aider à chercher.','Ils regardent sous le banc et derrière la porte. Puis Léo se souvient : il a prêté son casque à Tom pour régler les sangles.','Tom arrive avec le casque. « Merci de me l’avoir prêté ! » Léo le remercie et ajuste les sangles avant de démarrer.'],q:'Pourquoi Tom avait-il le casque ?',correct:'Pour régler les sangles.',wrong:['Pour cacher un goûter.','Pour arroser une plante.']},
 {title:'La graine de la cour',art:'🌱',pages:['Alma trouve une graine près de l’école. Elle la pose dans un petit pot rempli de terre.','Chaque matin, elle vérifie si la terre est sèche et ajoute un peu d’eau si nécessaire. Elle place le pot près de la lumière.','Plusieurs jours passent. Une tige verte apparaît ! Alma est heureuse : elle a appris qu’une plante demande des soins et de la patience.'],q:'Qu’est-ce qui a aidé la graine à pousser ?',correct:'De la terre, un peu d’eau, de la lumière et du temps.',wrong:['Beaucoup de bonbons.','Un pot laissé dans un placard fermé.']},
 {title:'Le banc des idées',art:'🤝',pages:['Deux amis veulent utiliser le même coin de la cour. Inès souhaite lire tranquillement ; Sami voudrait jouer au ballon.','Ils prennent le temps de s’écouter. « Le ballon pourrait abîmer mon livre », explique Inès. « J’ai besoin d’un espace pour faire des passes », répond Sami.','Ils trouvent une solution : Inès s’installe sur le banc calme et Sami utilise le terrain marqué au sol. Ils se retrouveront ensuite pour raconter leur journée.'],q:'Comment les amis ont-ils trouvé une solution ?',correct:'En s’écoutant et en choisissant des espaces adaptés.',wrong:['En criant le plus fort possible.','En cachant le livre.']}
];
function storyShelf(){modal(activityHeader('Des petites histoires à ouvrir','Bibliothèque · coin lecture')+`<p class="modal-description">Choisis un livre. Lis ses trois pages à ton rythme, puis réponds à une question.</p><div class="book-grid">${stories.map((b,i)=>`<button class="book-tile" data-story="${i}"><span>${b.art}</span><b>${b.title}</b><small>3 pages · lire et comprendre</small></button>`).join('')}</div>`+activityReturn());document.querySelectorAll('[data-story]').forEach(b=>b.onclick=()=>readStory(Number(b.dataset.story)));bindActivityClose();}
function readStory(index,page=0){discover('story');const b=stories[index];activeActivity={kind:'story',index,page};
 modal(activityHeader(b.title,'Bibliothèque · mini-histoire')+`<article class="story-page"><div class="story-illustration" aria-hidden="true">${b.art}<span class="story-spark">✦</span></div><small>Page ${page+1} sur ${b.pages.length}</small><p>${esc(b.pages[page])}</p></article><div class="actions"><button id="storyBack" class="secondary" ${page===0?'disabled':''}>← Page précédente</button><button id="storyNext" class="primary">${page===b.pages.length-1?'J’ai lu ! Une petite question →':'Page suivante →'}</button><button id="storyShelf" class="secondary">Les autres livres</button></div>`);
 $('#storyBack').onclick=()=>readStory(index,page-1);$('#storyShelf').onclick=storyShelf;$('#storyNext').onclick=()=>{if(page<b.pages.length-1){readStory(index,page+1);return;}const q=choiceQuiz({id:'story',name:'Alma',icon:'📖',question:esc(b.q),hint:'Repense aux événements de l’histoire. Tu peux revenir au livre pour relire.',explanation:'Tu as retrouvé l’information dans l’histoire.'},b.correct,b.wrong);quiz(q);};
}
const paintingPalette=['#e6b65b','#e28c67','#7ca16b','#7dabc2','#ac8ab5','#d7b59a','#b4bbbf'];
const coloringBooks=[
 {name:'La maison du Bocage',emoji:'🏡',regions:[['ciel','rect','x="8" y="8" width="384" height="245" rx="10"'],['pelouse','path','d="M8 205Q160 166 392 202V253H8Z"'],['maison','rect','x="124" y="115" width="164" height="115"'],['toit','path','d="M105 119L206 38L307 119Z"'],['porte','rect','x="187" y="170" width="39" height="60" rx="3"'],['fenêtre gauche','rect','x="139" y="142" width="33" height="36"'],['fenêtre droite','rect','x="241" y="142" width="33" height="36"'],['soleil','circle','cx="56" cy="57" r="25"'],['arbre','path','d="M329 198V148Q299 139 313 114Q296 95 322 77Q341 52 357 79Q390 89 374 115Q392 141 353 151V198Z"']]},
 {name:'Moka dans le jardin',emoji:'🐈',regions:[['fond','rect','x="8" y="8" width="384" height="245" rx="10"'],['herbe','path','d="M8 215Q200 174 392 215V253H8Z"'],['corps','ellipse','cx="210" cy="170" rx="85" ry="48"'],['queue','path','d="M140 167Q61 157 82 87Q89 70 103 80Q84 137 155 141Z"'],['tête','circle','cx="260" cy="105" r="48"'],['oreille gauche','path','d="M218 85L213 32L252 60Z"'],['oreille droite','path','d="M270 59L314 31L307 93Z"'],['patte gauche','rect','x="164" y="190" width="32" height="43" rx="13"'],['patte droite','rect','x="232" y="190" width="32" height="43" rx="13"'],['fleur','circle','cx="55" cy="176" r="19"']]}
];
function coloringShelf(){modal(activityHeader('Les cahiers de coloriage','Bibliothèque · atelier créatif')+`<p class="modal-description">Choisis un dessin. Sélectionne une couleur, puis touche une zone pour la peindre.</p><div class="book-grid">${coloringBooks.map((b,i)=>`<button class="book-tile" data-colorbook="${i}"><span>${b.emoji}</span><b>${b.name}</b><small>Ton dessin est conservé sur cet appareil</small></button>`).join('')}</div>`+activityReturn());document.querySelectorAll('[data-colorbook]').forEach(b=>b.onclick=()=>coloringGame(Number(b.dataset.colorbook)));bindActivityClose();}
function coloringGame(index){discover('coloring');const book=coloringBooks[index],previous=coloringPages[index]||{},paint={};for(const [name]of book.regions)if(paintingPalette.includes(previous[name]))paint[name]=previous[name];const state={kind:'coloring',index,paint,color:paintingPalette[0],history:[]};activeActivity=state;
 const lines=index===1?'<g pointer-events="none" fill="#50634b"><circle cx="245" cy="99" r="4"/><circle cx="276" cy="99" r="4"/><path d="M253 115q9 9 17 0" fill="none" stroke="#50634b" stroke-width="3"/></g>':'';
 modal(activityHeader(book.name,'Coloriage · choisis puis peins')+`<div class="paint-palette">${paintingPalette.map((c,i)=>`<button class="paint-color ${i===0?'selected':''}" data-paint="${c}" style="background:${c}" aria-label="Couleur ${i+1}" aria-pressed="${i===0}"></button>`).join('')}</div><svg class="coloring-paper" viewBox="0 0 400 265" aria-label="Dessin à colorier">${book.regions.map(([name,tag,attrs],i)=>`<${tag} ${attrs} fill="${paint[name]||'#fffaf0'}" stroke="#5d7157" stroke-width="2" data-zone="${i}" tabindex="0" role="button" aria-label="Colorier : ${name}"/>`).join('')}${lines}</svg><p id="paintProgress" class="feedback" role="status"></p><div class="actions"><button id="paintUndo" class="secondary">Annuler le dernier geste</button><button id="paintReset" class="secondary">Tout effacer</button><button id="paintBooks" class="primary">Les autres dessins</button></div>`);
 const update=()=>{coloringPages[index]={...state.paint};save();$('#paintProgress').textContent=`${Object.keys(state.paint).length} zones coloriées sur ${book.regions.length}`;document.querySelectorAll('[data-zone]').forEach(el=>{const name=book.regions[Number(el.dataset.zone)][0];el.setAttribute('fill',state.paint[name]||'#fffaf0');});if(Object.keys(state.paint).length===book.regions.length){award('coloring');$('#paintProgress').textContent='✓ Tout est colorié ! Tu peux encore changer les couleurs.';}};
 document.querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>{state.color=b.dataset.paint;document.querySelectorAll('[data-paint]').forEach(el=>{el.classList.toggle('selected',el.dataset.paint===state.color);el.setAttribute('aria-pressed',String(el.dataset.paint===state.color));});});
 document.querySelectorAll('[data-zone]').forEach(el=>{const fill=()=>{state.history.push({...state.paint});state.paint[book.regions[Number(el.dataset.zone)][0]]=state.color;update();el.animate([{opacity:.4},{opacity:1}],{duration:320});};el.onclick=fill;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fill();}};});
 $('#paintUndo').onclick=()=>{if(state.history.length){state.paint=state.history.pop();update();}};$('#paintReset').onclick=()=>{state.history.push({...state.paint});state.paint={};update();};$('#paintBooks').onclick=coloringShelf;update();
}
const revisionTopics={fr:[['articles','Articles et noms','Un livre, une école : le petit mot accompagne le nom.'],['present','Le présent','Je suis, tu es, il est ; nous sommes, vous êtes, ils sont.'],['pluriels','Les pluriels','Un chat → des chats ; un bateau → des bateaux.']],de:[['couleurs','Les couleurs','rot : rouge · blau : bleu · grün : vert · gelb : jaune · weiß : blanc · schwarz : noir'],['nombres','Les nombres','eins, zwei, drei, vier, fünf, sechs, sieben, acht, neun, zehn'],['ecole','À l’école','das Buch : le livre · das Heft : le cahier · die Schule : l’école · der Bleistift : le crayon']],math:[['calculs','Additionner et soustraire','Pour additionner, réunis les quantités. Pour soustraire, enlève une quantité.'],['tables','Les multiplications','3 groupes de 4 : 4 + 4 + 4 = 12, donc 3 × 4 = 12.'],['problemes','Les petits problèmes','Cherche les données utiles, choisis le calcul, puis vérifie ta réponse.']]};
let currentRevision={subject:'fr',topic:'articles'};
function revisionShelf(subject){const label={fr:'français',de:'allemand',math:'maths'}[subject];modal(activityHeader('Mon livre de '+label,'Bibliothèque · réviser à son rythme')+`<p class="modal-description">Choisis un chapitre : relis le petit mémo, puis entraîne-toi.</p><div class="book-grid">${revisionTopics[subject].map(([id,title,memo])=>`<button class="book-tile" data-revision="${id}"><span>${{fr:'📕',de:'📗',math:'📘'}[subject]}</span><b>${title}</b><small>${memo}</small></button>`).join('')}</div>`+activityReturn());document.querySelectorAll('[data-revision]').forEach(b=>b.onclick=()=>revisionChapter(subject,b.dataset.revision));bindActivityClose();}
function revisionChapter(subject,topic){currentRevision={subject,topic};const chapter=revisionTopics[subject].find(t=>t[0]===topic);modal(activityHeader(chapter[1],'Un petit mémo avant de jouer')+`<div class="lesson-card">${esc(chapter[2])}</div><p class="modal-description">Les questions s’adaptent à ton âge. Tu peux demander un indice à tout moment.</p><div class="actions"><button id="revisionStart" class="primary">Je m’entraîne →</button><button id="revisionBack" class="secondary">Les chapitres</button></div>`);$('#revisionStart').onclick=revisionQuiz;$('#revisionBack').onclick=()=>revisionShelf(subject);}
function makeRevisionChallenge(subject,topic){
 const base={id:'revision-'+subject,name:'La maîtresse',icon:{fr:'📕',de:'📗',math:'📘'}[subject]};
 if(subject==='math'){
  if(topic==='problemes')return {...makeMathChallenge(),...base};
  const l=level(),mul=topic==='tables',subtract=!mul&&randomInt(0,1)===1;let a=randomInt(2,l===0?12:l===1?40:90),b=randomInt(2,l===0?6:l===1?9:12);if(subtract&&b>a)[a,b]=[b,a];const result=mul?a*b:subtract?a-b:a+b;
  return numericQuiz({...base,question:`Combien font <b>${a} ${mul?'×':subtract?'−':'+'} ${b}</b> ?`,hint:mul?`Compte ${a} groupes de ${b}.`:'Tu peux décomposer les nombres en dizaines et unités.',explanation:`${a} ${mul?'×':subtract?'−':'+'} ${b} = ${result}.`},result,String,l===0?1:2,-10);
 }
 if(subject==='de'){
  const pools={couleurs:[['rot','rouge'],['blau','bleu'],['grün','vert'],['gelb','jaune'],['weiß','blanc'],['schwarz','noir']],nombres:[['eins','un'],['zwei','deux'],['drei','trois'],['vier','quatre'],['fünf','cinq'],['sechs','six'],['sieben','sept'],['acht','huit'],['neun','neuf'],['zehn','dix']],ecole:[['das Buch','le livre'],['das Heft','le cahier'],['die Schule','l’école'],['der Bleistift','le crayon'],['der Tisch','la table'],['der Stuhl','la chaise']]};
  const pool=pools[topic],entry=pool[randomInt(0,pool.length-1)];return choiceQuiz({...base,question:`Que signifie <b>${esc(entry[0])}</b> en français ?`,hint:'Repense au mémo du chapitre. Tu peux le relire en rouvrant le livre.',explanation:`« ${entry[0]} » signifie « ${entry[1]} ».`},entry[1],shuffle(pool.filter(e=>e!==entry)).slice(0,3).map(e=>e[1]));
 }
 if(topic==='articles'){const words=[['livre','un'],['école','une'],['ballon','un'],['maison','une'],['crayon','un'],['chaise','une'],['chat','un'],['fleur','une']],entry=words[randomInt(0,words.length-1)];return choiceQuiz({...base,question:`Complète : <b>… ${entry[0]}</b>.`,hint:'Le nom est-il masculin ou féminin ?',explanation:`On dit « ${entry[1]} ${entry[0]} ».`},entry[1],[entry[1]==='un'?'une':'un']);}
 if(topic==='present'){const pairs=[['Je','suis'],['Tu','es'],['Il','est'],['Nous','sommes'],['Vous','êtes'],['Ils','sont']],entry=pairs[randomInt(0,pairs.length-1)];return choiceQuiz({...base,question:`Complète avec le verbe être au présent : <b>${entry[0]} … dans la cour.</b>`,hint:'Relis mentalement : je suis, tu es, il est, nous sommes, vous êtes, ils sont.',explanation:`${entry[0]} ${entry[1]} dans la cour.`},entry[1],shuffle(pairs.filter(e=>e!==entry)).slice(0,3).map(e=>e[1]));}
 const nouns=[['chat','chats'],['vélo','vélos'],['livre','livres'],['bateau','bateaux'],['oiseau','oiseaux'],['jeu','jeux']],entry=nouns[randomInt(0,nouns.length-1)];return choiceQuiz({...base,question:`Un ${entry[0]} devient : <b>des …</b>`,hint:entry[0].endsWith('eau')?'Les noms en -eau prennent généralement un x.':'Beaucoup de noms prennent un s au pluriel ; attention à « jeu ».',explanation:`Un ${entry[0]} → des ${entry[1]}.`},entry[1],[entry[0],entry[0]+'ent',entry[1]+'s']);
}
function revisionQuiz(){quiz(fresh('revision-'+currentRevision.subject+'-'+currentRevision.topic,()=>{const q=makeRevisionChallenge(currentRevision.subject,currentRevision.topic);return {...q,signature:q.question+'|'+q.options[q.answer]};}));}

function footballAvatar(a,label,side){const look={...a,eyes:a.eyes||(a===profile?profile.eyes:'#443e31'),pants:a.pants||'#536d7a'};return `<svg class="football-player player-${side}" viewBox="0 0 110 150" role="img" aria-label="${esc(label)}"><g transform="translate(55 136) scale(1.25)">${avatarSVG(look,'talk')}</g><text x="55" y="149" text-anchor="middle" font-size="9" fill="#526d51">${esc(label)}</text></svg>`;}
function basketballGame(){discover('basket');let raf=0,phase=0,count=0,busy=false,finished=false;const start=performance.now(),period=[2400,1900,1500][level()];activeActivity={kind:'basket',get count(){return count;}};
 modal(activityHeader('Trois paniers pour l’équipe','Salle de sport · basket')+`<p class="modal-description">Lance quand le curseur orange entre dans la zone verte. Fais trois paniers ; tu peux réessayer sans limite.</p><div class="basket-game">${footballAvatar(profile,profile.name,'left')}<svg class="basket-hoop" viewBox="0 0 90 130" aria-label="Panier"><path d="M55 30v95" stroke="#809180" stroke-width="7"/><rect x="15" y="6" width="65" height="44" rx="3" fill="#f5f0d9" stroke="#92aa8a" stroke-width="4"/><rect x="31" y="20" width="30" height="23" fill="none" stroke="#be8a64" stroke-width="2"/><ellipse cx="44" cy="51" rx="26" ry="6" fill="none" stroke="#c48250" stroke-width="4"/><path d="M19 53l10 24h30l10-24M31 54l5 23M44 54v23M57 54l-5 23" fill="none" stroke="#f6f5e6" stroke-width="2"/></svg><span id="basketBall" class="basket-ball">🏀</span><div class="timing-track"><div class="timing-target"></div><div id="basketCursor" class="timing-cursor"></div></div></div><p id="basketFeedback" class="feedback" role="status">0 panier sur 3</p><div class="actions"><button id="basketShoot" class="primary">Lancer !</button><button id="activityClose" class="secondary">Retour à la salle</button></div>`,()=>cancelAnimationFrame(raf));
 const frame=now=>{phase=((now-start)/period)%2;const pos=phase<1?phase:2-phase;$('#basketCursor').style.left=`${pos*100}%`;raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
 $('#basketShoot').onclick=()=>{if(busy||finished)return;const pos=phase<1?phase:2-phase,hit=pos>=.4&&pos<=.6;busy=true;$('#basketBall').animate([{left:'17%',top:'60%',transform:'rotate(0)'},{left:'55%',top:'5%',transform:'rotate(180deg)'},{left:hit?'84%':'72%',top:hit?'31%':'76%',transform:'rotate(360deg)'}],{duration:650,easing:'ease-in-out'}).finished.then(()=>{busy=false;}).catch(()=>{busy=false;});if(hit){count++;$('#basketFeedback').textContent=`Panier ! ${count} sur 3`;if(count===3){finished=true;cancelAnimationFrame(raf);award('basket');$('#basketFeedback').textContent='✓ Trois paniers ! Bravo pour ta précision.';$('#basketShoot').disabled=true;}}else $('#basketFeedback').textContent='Presque ! Lance quand le curseur est dans le vert.';};bindActivityClose();
}
function movementGame(){discover('movements');const moves=[['jump','Saute !','Sauter'],['crouch','Accroupis-toi !','S’accroupir'],['arms','Lève les bras !','Lever les bras']];const sequence=[];for(let i=0;i<4+level();i++){let n=randomInt(0,2);if(sequence.at(-1)===n)n=(n+1)%3;sequence.push(n);}const state={kind:'movements',sequence,progress:0,busy:false};activeActivity=state;
 modal(activityHeader('Le circuit des mouvements','Salle de sport · comprendre et bouger')+`<p class="modal-description">Lis la consigne, puis choisis le bon mouvement pour animer ton personnage.</p><div class="movement-stage"><svg viewBox="0 0 400 190"><ellipse cx="200" cy="163" rx="100" ry="15" fill="#bed0ac"/><g transform="translate(200 162) scale(1.55)"><g id="movementActor">${avatarSVG(profile)}</g></g></svg></div><div id="movementPrompt" class="speech"></div><div class="actions">${moves.map(([id,q,label])=>`<button class="primary" data-move="${id}">${label}</button>`).join('')}</div><p id="movementFeedback" class="feedback" role="status"></p>`+activityReturn('Retour à la salle'));
 const prompt=()=>{$('#movementPrompt').textContent=state.progress<sequence.length?moves[sequence[state.progress]][1]:'✓ Circuit terminé !';};
 document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{if(state.busy||state.progress===sequence.length)return;const wanted=moves[sequence[state.progress]][0];if(b.dataset.move!==wanted){$('#movementFeedback').textContent='Relis la consigne et essaie un autre mouvement.';return;}state.busy=true;const frames=wanted==='jump'?[{transform:'translateY(0)'},{transform:'translateY(-26px)'},{transform:'translateY(0)'}]:wanted==='crouch'?[{transform:'scaleY(1)'},{transform:'translateY(8px) scaleY(.7)'},{transform:'scaleY(1)'}]:[{transform:'rotate(0)'},{transform:'rotate(-10deg)'},{transform:'rotate(10deg)'},{transform:'rotate(0)'}];if(wanted==='arms')$('#movementActor').innerHTML=avatarSVG(profile).replace(/<g class="scene-arm arm-left[^"]*"/, '<g class="scene-arm arm-left" transform="rotate(150 -13 -46)"').replace(/<g class="scene-arm arm-right[^"]*"/, '<g class="scene-arm arm-right" transform="rotate(-150 14 -46)"');$('#movementActor').animate(frames,{duration:650}).finished.then(()=>{if(activeActivity!==state||!$('#movementActor'))return;state.busy=false;state.progress++;$('#movementActor').innerHTML=avatarSVG(profile);prompt();$('#movementFeedback').textContent=`${state.progress} mouvements réussis sur ${sequence.length}`;if(state.progress===sequence.length){award('movements');$('#movementFeedback').textContent='✓ Bravo, tu as suivi tout le circuit !';}}).catch(()=>{state.busy=false;});});prompt();bindActivityClose();
}
const musicNotes=[{name:'Do',freq:261.63,color:'#cc8268'},{name:'Ré',freq:293.66,color:'#d7a154'},{name:'Mi',freq:329.63,color:'#c6b953'},{name:'Fa',freq:349.23,color:'#83aa79'},{name:'Sol',freq:392,color:'#75a7b7'},{name:'La',freq:440,color:'#9c91b8'},{name:'Si',freq:493.88,color:'#bb8aa8'},{name:'Do aigu',freq:523.25,color:'#d39785'}];
let musicAudio=null;
function tone(index,duration=.3,delay=0){try{musicAudio=musicAudio||new(window.AudioContext||window.webkitAudioContext)();if(musicAudio.state==='suspended')musicAudio.resume();const o=musicAudio.createOscillator(),g=musicAudio.createGain(),t=musicAudio.currentTime+delay;o.type='sine';o.frequency.value=musicNotes[index].freq;o.connect(g);g.connect(musicAudio.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.1,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.start(t);o.stop(t+duration+.04);}catch{}}
function musicCleanup(timers){timers.forEach(clearTimeout);if(musicAudio){musicAudio.close().catch(()=>{});musicAudio=null;}}
function melodyGame(){discover('melody');const sequence=[];for(let i=0;i<3+level();i++){let n=randomInt(0,level()===0?4:7);if(sequence.at(-1)===n)n=(n+1)%5;sequence.push(n);}const state={kind:'melody',sequence,progress:0,playing:false,done:false};activeActivity=state;const timers=[];
 modal(activityHeader('La petite mélodie','Salle de musique · écouter et mémoriser')+`<p class="modal-description">Écoute ou regarde les touches qui s’allument. Ensuite, rejoue les notes dans le même ordre. Les touches fonctionnent aussi au clavier avec Tab et Entrée.</p><div class="music-banner">♪ &nbsp; ♫ &nbsp; ♪</div><div class="piano-keys">${musicNotes.map((n,i)=>`<button data-note="${i}" style="--note-color:${n.color}">${n.name}</button>`).join('')}</div><p id="melodyFeedback" class="feedback" role="status">Clique sur « Écouter / regarder » pour découvrir la mélodie.</p><div class="actions"><button id="melodyListen" class="primary">Écouter / regarder</button><button id="melodyNew" class="secondary">Une autre mélodie</button><button id="activityClose" class="secondary">Retour à la salle</button></div>`,()=>musicCleanup(timers));
 const light=(note,on)=>document.querySelectorAll('[data-note]').forEach(b=>b.classList.toggle('note-lit',on&&Number(b.dataset.note)===note));
 $('#melodyListen').onclick=()=>{if(state.playing)return;state.progress=0;state.done=false;state.playing=true;$('#melodyFeedback').textContent='Écoute et regarde les touches…';sequence.forEach((n,i)=>{tone(n,.32,i*.6);timers.push(setTimeout(()=>{light(n,true);$('#melodyFeedback').textContent=`Note ${i+1} : ${musicNotes[n].name}`;},i*600));timers.push(setTimeout(()=>light(n,false),i*600+430));});timers.push(setTimeout(()=>{state.playing=false;$('#melodyFeedback').textContent='À toi de rejouer les notes dans l’ordre !';},sequence.length*600));};
 document.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{if(state.playing||state.done)return;const n=Number(b.dataset.note);tone(n);b.animate([{opacity:.4},{opacity:1}],{duration:220});if(n===sequence[state.progress]){state.progress++;$('#melodyFeedback').textContent=`${state.progress} notes retrouvées sur ${sequence.length}`;if(state.progress===sequence.length){state.done=true;award('melody');$('#melodyFeedback').textContent='✓ Tu as rejoué toute la mélodie !';}}else{state.progress=0;$('#melodyFeedback').textContent='Essaie encore depuis la première note, ou réécoute la mélodie.';}});$('#melodyNew').onclick=melodyGame;bindActivityClose();
}
function rhythmGame(){discover('rhythm');const sequence=Array.from({length:4+level()},()=>randomInt(0,1)),state={kind:'rhythm',sequence,progress:0,playing:false,done:false};activeActivity=state;const timers=[];
 modal(activityHeader('Le jeu des rythmes','Salle de musique · court et long')+`<p class="modal-description">Une note courte, puis une note longue ? Écoute ou observe le rythme, puis reproduis-le avec les deux boutons.</p><div class="rhythm-score">${sequence.map((n,i)=>`<span id="beat${i}" aria-label="${n?'longue':'courte'}">${n?'♩':'♪'}</span>`).join('')}</div><div class="drum" id="rhythmDrum">🥁</div><div class="actions"><button class="primary" data-beat="0">♪ Courte</button><button class="primary" data-beat="1">♩ Longue</button></div><p id="rhythmFeedback" class="feedback" role="status">Les symboles t’aident à suivre le rythme.</p><div class="actions"><button id="rhythmListen" class="secondary">Écouter / regarder</button><button id="rhythmNew" class="secondary">Un autre rythme</button><button id="activityClose" class="secondary">Retour à la salle</button></div>`,()=>musicCleanup(timers));
 $('#rhythmListen').onclick=()=>{if(state.playing)return;state.playing=true;state.progress=0;state.done=false;let elapsed=0;sequence.forEach((n,i)=>{const duration=n?.65:.28;tone(0,duration,elapsed/1000);const when=elapsed;timers.push(setTimeout(()=>{$('#beat'+i).classList.add('beat-lit');$('#rhythmFeedback').textContent=n?'Note longue':'Note courte';},when));timers.push(setTimeout(()=>$('#beat'+i).classList.remove('beat-lit'),when+duration*1000));elapsed+=duration*1000+220;});timers.push(setTimeout(()=>{state.playing=false;$('#rhythmFeedback').textContent='À toi : court ou long, dans le même ordre.';},elapsed));};
 document.querySelectorAll('[data-beat]').forEach(b=>b.onclick=()=>{if(state.playing||state.done)return;const n=Number(b.dataset.beat);tone(0,n?.65:.28);$('#rhythmDrum').animate([{transform:'scale(1)'},{transform:'scale(.88)'},{transform:'scale(1)'}],{duration:230});if(n===sequence[state.progress]){state.progress++;$('#rhythmFeedback').textContent=`${state.progress} sons retrouvés sur ${sequence.length}`;if(state.progress===sequence.length){state.done=true;award('rhythm');$('#rhythmFeedback').textContent='✓ Tu as retrouvé tout le rythme !';}}else{state.progress=0;$('#rhythmFeedback').textContent='Reprends depuis le premier symbole, tu peux réécouter.';}});$('#rhythmNew').onclick=rhythmGame;bindActivityClose();
}
function hopscotchGame(){discover('hopscotch');const stone=fresh('hop-stone',()=>{const n=randomInt(1,8);return {stone:n,signature:String(n)};}).stone,up=Array.from({length:8},(_,i)=>i+1).filter(n=>n!==stone),sequence=level()===0?up:[...up,...up.slice(0,-1).reverse()],state={kind:'hopscotch',stone,sequence,progress:0};activeActivity=state;
 const cells=[{n:1,x:125,y:352},{n:2,x:125,y:306},{n:3,x:99,y:260},{n:4,x:151,y:260},{n:5,x:125,y:214},{n:6,x:99,y:168},{n:7,x:151,y:168},{n:8,x:125,y:122}];
 modal(activityHeader('À toi la marelle !','La cour de l’école')+`<p class="modal-description">Le caillou est sur la case <b>${stone}</b>. Saute sur les cases dans l’ordre en évitant cette case.${level()===0?' Va jusqu’à 8.':' Fais l’aller, puis le retour en sens inverse.'} Clique sur une case pour sauter.</p><svg class="hop-board" viewBox="70 80 170 350" aria-label="Marelle numérotée de 1 à 8">${cells.map(c=>`<g data-hop="${c.n}" tabindex="0" role="button" aria-label="Sauter sur ${c.n}"><rect x="${c.x}" y="${c.y}" width="50" height="42" rx="3" fill="${c.n===stone?'#e3c8a4':'#e6edda'}" stroke="#7e9471" stroke-width="2"/><text x="${c.x+25}" y="${c.y+28}" text-anchor="middle" font-size="20" fill="#617c55">${c.n}</text>${c.n===stone?`<ellipse cx="${c.x+38}" cy="${c.y+9}" rx="8" ry="5" fill="#ac9176"/>`:''}</g>`).join('')}<g id="hopPosition" transform="translate(150 423) scale(.5)"><g id="hopJump">${avatarSVG(profile)}</g></g></svg><p id="hopFeedback" class="feedback" role="status">Commence par la première case libre.</p><div class="actions"><button id="hopAgain" class="secondary">Une autre partie</button><button id="activityClose" class="primary">Retour à la cour</button></div>`);
 document.querySelectorAll('[data-hop]').forEach(el=>{const jump=()=>{if(state.progress===sequence.length)return;const n=Number(el.dataset.hop);if(n!==sequence[state.progress]){$('#hopFeedback').textContent=n===stone?'Attention, le caillou est sur cette case !':`Dans l’ordre : la prochaine case est ${sequence[state.progress]}.`;return;}const c=cells.find(c=>c.n===n);$('#hopPosition').setAttribute('transform',`translate(${c.x+25} ${c.y+38}) scale(.5)`);$('#hopJump').animate([{transform:'translateY(0)'},{transform:'translateY(-18px)'},{transform:'translateY(0)'}],{duration:350});state.progress++;$('#hopFeedback').textContent=`${state.progress} sauts réussis sur ${sequence.length}`;if(state.progress===sequence.length){award('hopscotch');$('#hopFeedback').textContent='✓ Parcours terminé sans toucher le caillou !';}};el.onclick=jump;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump();}};});$('#hopAgain').onclick=hopscotchGame;bindActivityClose();
}

const schoolChildren=['class1','class2','library','gym','music'];
const schoolDoors=[
 {id:'class1',x:450,y:535,name:'Classe des découvertes',icon:'📚'},
 {id:'library',x:750,y:535,name:'Bibliothèque',icon:'📖'},
 {id:'class2',x:1040,y:535,name:'Classe des explorateurs',icon:'🔬'},
 {id:'gym',x:430,y:815,name:'Salle de sport',icon:'🏀'},
 {id:'music',x:1080,y:815,name:'Salle de musique',icon:'🎵'}
];
let schoolReturn={x:750,y:900};
function libraryEntities(exit){return [exit,{id:'stories',x:465,y:480,name:'Les mini-histoires',task:'stories',icon:'📖'},{id:'germanBooks',x:750,y:480,name:'Réviser l’allemand',task:'revision-de',icon:'📗'},{id:'mathBooks',x:1035,y:480,name:'Réviser les maths',task:'revision-math',icon:'📘'},{id:'colorBooks',x:490,y:740,name:'Les cahiers de coloriage',task:'coloring',icon:'🎨'},{id:'puzzleTable',x:750,y:740,name:'Les puzzles',task:'library-puzzle',icon:'🧩'},{id:'frenchBooks',x:1040,y:740,name:'Réviser le français',task:'revision-fr',icon:'📕'}];}
function schoolShelf(x,y,w,color,label){const c=ctx;rr(c,x,y-25,w,90,4,'#bb9c78');rr(c,x+5,y-20,w-10,78,2,'#ddc6a2');for(let row=0;row<2;row++){for(let i=0;i<Math.floor((w-15)/16);i++){rr(c,x+9+i*16,y-15+row*36,11,28,1,[color,'#a7b17d','#8fa9b2','#c4997c'][i%4]);rr(c,x+12+i*16,y-9+row*36,4,2,0,'#ede5c9');}rr(c,x+4,y+16+row*36,w-8,4,0,'#b3936b');}text(c,label,x+w/2,y+87,14,'#6e855f','600');}
function drawLibraryRoom(){const c=ctx;rr(c,346,312,814,70,8,'#d8dfbd');text(c,'LA PETITE BIBLIOTHÈQUE',750,333,24,'#5d7856','600');schoolShelf(365,375,205,'#c58f75','Histoires');schoolShelf(650,375,200,'#8ea376','Allemand');schoolShelf(935,375,200,'#8fa5b8','Maths');
 for(const [x,label]of [[400,'Coloriages'],[660,'Puzzles'],[950,'Français']]){furniture(x,620,180,75,'#bda17d');rr(c,x+35,626,58,38,2,label==='Français'?'#c58f7c':'#e8e4cb');text(c,label,x+90,710,14,'#718860','600');}
 for(let i=0;i<5;i++)rr(c,451+i*13,640,7,20,2,['#bd8669','#85a276','#87a8b4','#ba94b0','#d5b65e'][i]);for(let i=0;i<4;i++)for(let j=0;j<3;j++)rr(c,710+i*13,631+j*13,11,11,1,['#8ca776','#cdb573','#a18eb3'][(i+j)%3]);
}
function drawGymRoom(){const c=ctx;rr(c,330,320,840,610,10,'#c5d8bd');c.strokeStyle='#f4f2dd';c.lineWidth=4;c.strokeRect(370,390,760,465);c.beginPath();c.moveTo(750,390);c.lineTo(750,855);c.stroke();c.beginPath();c.arc(750,620,75,0,Math.PI*2);c.stroke();text(c,'BOUGER ENSEMBLE',750,352,23,'#6e8b62','600');rr(c,425,390,160,70,3,'#f6f0dc');rr(c,466,410,78,33,2,'#e4e8cf','#b4926a');ellipse(c,505,464,48,10,'#c58c59');
 rr(c,915,560,170,240,15,'#95b7b7');for(let i=0;i<5;i++)ellipse(c,965+(i%2)*57,595+i*38,17,11,['#e3bd69','#c88e73'][i%2]);text(c,'Basket',505,560,20,'#6d875e');text(c,'Circuit des mouvements',985,842,16,'#6d875e');
}
function drawMusicRoom(){const c=ctx;rr(c,330,320,840,610,10,'#e8d9b9');text(c,'LA SALLE DES SONS',750,355,23,'#77845e','600');for(let i=0;i<5;i++){c.strokeStyle='#adaf91';c.lineWidth=1;c.beginPath();c.moveTo(400,390+i*10);c.lineTo(1100,390+i*10);c.stroke();}for(let i=0;i<6;i++){const nx=470+i*105,ny=420-(i%3)*8;ellipse(c,nx,ny,7,5,'#82936a');c.strokeStyle='#82936a';c.lineWidth=3;c.beginPath();c.moveTo(nx+6,ny);c.lineTo(nx+6,ny-32);if(i%2===0)c.quadraticCurveTo(nx+26,ny-24,nx+20,ny-17);c.stroke();}
 rr(c,410,545,340,160,8,'#6e7e72');for(let i=0;i<14;i++){rr(c,419+i*23,575,21,105,2,'#f4efdc');if(i%7!==2&&i%7!==6)rr(c,433+i*23,575,12,57,2,'#56665c');}rr(c,485,737,180,34,8,'#b59b79');text(c,'Piano et mélodies',580,805,19,'#77865e');
 ellipse(c,1000,656,70,24,'#d6b18b');rr(c,930,648,140,78,2,'#c89271');ellipse(c,1000,648,70,24,'#f2e5c9');c.strokeStyle='#a88460';c.lineWidth=3;c.beginPath();c.moveTo(935,638);c.lineTo(1066,606);c.moveTo(1065,635);c.lineTo(948,603);c.stroke();text(c,'Rythmes',1000,805,19,'#77865e');
}
function drawSchoolHall(){const c=ctx;rr(c,370,310,770,65,5,'#d9dfc2');text(c,'BIENVENUE À L’ÉCOLE',750,352,24,'#68805b','600');
 for(const d of schoolDoors){const x=d.x-72,y=d.y-145;rr(c,x,y,145,120,4,'#bba581');rr(c,x+9,y+8,127,106,3,d.id==='library'?'#8d9f73':d.id==='music'?'#9a91ac':d.id==='gym'?'#819da7':'#8ca68b');rr(c,x+19,y+17,107,43,2,'#d0dcc2');text(c,d.icon,x+72,y+50,28,'#f7f0d9');text(c,d.name,d.x,d.y-6,12,'#6d805c','600');}
 rr(c,600,650,300,150,25,'#d3deb9');text(c,'LE COULOIR DES IDÉES',750,731,18,'#83976e');
}

missions.push(...[{"id":"story","icon":"📖","title":"Les petites histoires","skill":"Lire et comprendre","who":"school"},{"id":"coloring","icon":"🎨","title":"Les cahiers de couleurs","skill":"Créer et colorier","who":"school"},{"id":"revision-fr","icon":"📕","title":"Mon livre de français","skill":"Français · réviser","who":"school"},{"id":"revision-de","icon":"📗","title":"Mon livre d’allemand","skill":"Allemand · réviser","who":"school"},{"id":"revision-math","icon":"📘","title":"Mon livre de maths","skill":"Maths · réviser","who":"school"},{"id":"basket","icon":"🏀","title":"Trois paniers pour l’équipe","skill":"Sport · précision","who":"school"},{"id":"movements","icon":"🤸","title":"Le circuit des mouvements","skill":"Sport · coordination","who":"school"},{"id":"melody","icon":"🎹","title":"La petite mélodie","skill":"Musique · mémoire","who":"school"},{"id":"rhythm","icon":"🥁","title":"Le jeu des rythmes","skill":"Musique · durées","who":"school"},{"id":"hopscotch","icon":"🔢","title":"À toi la marelle","skill":"Cour · nombres et ordre","who":"school"}]);
updateUI();requestAnimationFrame(tick);if(!created)profileEditor(true);
})();
