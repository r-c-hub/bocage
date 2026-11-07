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
// Touch devices steer with a virtual stick: the child still walks manually, only the input changes.
const touchUI=!!window.matchMedia?.('(pointer: coarse)').matches;
let stick=null;
const moveHint=()=>touchUI?'Pose ton doigt sur la carte et fais-le glisser pour marcher.':'Avance avec les flèches ou ZQSD.';
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
 {ref:'school-front',x:450,y:468,w:200,h:72,height:62,color:'#ac815c',school:true,name:'École de Belle-Cour',type:'school'},
 {ref:'school-spine',x:565,y:372,w:95,h:96,height:66,color:'#ac815c',school:true,name:'',type:'decor'},
 {ref:'school-rear',x:600,y:258,w:62,h:114,height:58,color:'#ac815c',school:true,name:'',type:'decor'},
 {ref:'right-north-a',x:800,y:92,w:80,h:60,height:57,color:'#ecd4b5',name:'',type:'decor'},
 {ref:'right-north-b',x:895,y:92,w:85,h:60,height:57,color:'#edd6b9',name:'',type:'decor'},
 {ref:'right-row-1',x:800,y:212,w:170,h:65,height:65,color:'#ead5b7',name:'',type:'decor'},
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
 {ref:'foreground-west',x:300,y:700,w:134,h:85,height:68,color:'#ead6b8',name:'',type:'decor'},
 {ref:'foreground-centre',x:446,y:700,w:228,h:85,height:68,color:'#e7caac',name:'Chez Tom',type:'tomHome'},
 {ref:'foreground-east',x:686,y:700,w:324,h:85,height:68,color:'#ebd3b4',name:'',type:'decor'},
 {ref:'terrace-a',x:1110,y:745,w:115,h:90,height:62,color:'#ebd6bc',flat:true,name:'',type:'decor'},
 {ref:'terrace-b',x:1245,y:760,w:125,h:90,height:62,color:'#e8d2b6',flat:true,name:'',type:'decor'},
 {ref:'pampres-flat',x:115,y:1062,w:290,h:98,height:55,color:'#d8bf92',wood:true,flat:true,concrete:true,name:'',type:'decor'},
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
 {id:'pingpong',x:563,y:578,w:78,h:42},
 {id:'slide',x:438,y:560,w:65,h:78},
 {id:'garage',x:625,y:850,w:105,h:62,roof:'tiles',entrance:'left',ramp:{x:465,y:854,w:160,h:58}},
 {id:'preau',x:650,y:405,w:100,h:80,height:38}
];
const trees=[];
let seed=37;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// Two small paths leave the lane along the road: behind the school (from the bus-stop square) and in front of it.
const laneXEarly=y=>573.6-.364*y;
const lanes=[{x:736,y:180,w:30,h:470,paved:true},{x:1010,y:150,w:35,h:755,paved:true},{x:330,y:650,w:1040,h:35,paved:true},{x:200,y:870,w:1180,h:35},{x:612,y:172,w:400,h:22,paved:true}];
for(let i=0;i<200;i++){
 const x=85+rnd()*1340,y=125+rnd()*935;
 if(x<375&&y<360)continue;
 if(x>545&&x<785&&y>790&&y<1010)continue;
 if(Math.abs(x-laneXEarly(y))<58)continue;
 if(y>880&&y<1020)continue;
 if(x<620&&y>=1020&&y<1050)continue;
 if(x<300&&y>690&&y<960)continue;
 if(x>garageAccess.x-35&&x<garageAccess.x+garageAccess.w+35&&y>garageAccess.y-20)continue;
 if(fixtures.some(f=>(x>f.x-32&&x<f.x+f.w+32&&y>f.y-55&&y<f.y+f.h+35)||(f.ramp&&x>f.ramp.x-30&&x<f.ramp.x+f.ramp.w+30&&y>f.ramp.y-55&&y<f.ramp.y+f.ramp.h+30)))continue;
 if(buildings.some(b=>x>b.x-32&&x<b.x+b.w+40&&y>b.y-15&&y<b.y+b.h+40))continue;
 if(lanes.some(l=>x>l.x-22&&x<l.x+l.w+22&&y>l.y-25&&y<l.y+l.h+25))continue;
 if(x>390&&x<780&&y>235&&y<620)continue;
 if(Math.abs(x-(480-.364*y))<66)continue;
 if(outside.some(n=>Math.hypot(n.x-x,n.y-y)<55))continue;
 trees.push({x,y,s:.42+rnd()*.28,type:rnd()>.88?1:0,tone:Math.floor(rnd()*4)});
}
trees.push({x:720,y:128,s:.5,type:0,tone:2},{x:770,y:153,s:.5,type:0,tone:1});

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function save(){
 try {localStorage.setItem(KEY,JSON.stringify({profile,completed:[...completed],catStage,attempts,discovered:[...discovered],coloring:coloringPages,room:roomDecor,pet:petCare}));$('#saveState').style.color='#7da477';}
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
 if(dialogCleanup)dialogCleanup();dialogCleanup=cleanup||null;keys.clear();stick=null;$('#modalContent').innerHTML=html;
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
 $('#avatarForm').onsubmit=e=>{e.preventDefault();draft.name=draft.name.trim();if(!draft.name){$('#avatarName').focus();return;}profile=cleanProfile(draft);created=true;save();updateUI();closeModal();toast(`Bienvenue ${profile.name} ! Le quartier t’attend. ${moveHint()}`);};
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
 const h=randomInt(0,23),m=l===0?0:l===1?randomInt(0,3)*15:randomInt(0,11)*5;
 const correct=h*60+m,display=v=>String(Math.floor(v/60)).padStart(2,'0')+' h '+String(v%60).padStart(2,'0');
 const period=h<12?'du matin':h<18?'de l’après-midi':'du soir';
 const alternatives=shuffle([(correct+60)%1440,(correct+120)%1440,(correct+(l===0?180:15))%1440,(correct+720)%1440]);
 return choiceQuiz({id:'clock',name:'Noé',icon:'⌚',signature:h+':'+m,clock:{h,m},sceneSpec:{type:'watch',h,m},question:'Nous sommes '+(h<12?'le matin, avant midi':h<18?'l’après-midi':'le soir')+'. Quelle heure indique ma montre ? Réponds au format 24 heures.',hint:'La petite aiguille indique les heures, la grande les minutes. Après midi, ajoute 12 à l’heure du cadran (sauf à midi). Minuit s’écrit 00 h.',explanation:'Il est '+display(correct)+'. Sur un cadran, '+(h%12||12)+' h peut indiquer deux moments de la journée : le moment indiqué dans la question permet de choisir.',art:clockSVG(h,m)},display(correct),alternatives.map(display));
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
 const watch=type==='watch'?clockSVG(spec.h??3,spec.m??0).replace('class="watch"','class="scene-watch" x="270" y="10" width="116" height="116"'):'';
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
 if(Math.hypot(player.x-n.x,player.y-n.y)>=82){toast('Approche-toi pour parler ou entrer. '+moveHint());return;}
 if(n.task==='crossing')requestCrossing();else if(n.task==='park')parkActivity(n.id);else if(n.task==='decorate')editRoom();else if(n.task==='pet')careForCat();else if(n.task==='cat')catDialog();else if(n.task==='clock')watchQuiz();else if(n.task==='duration')durationQuiz();else if(n.task==='language')languageMenu();else if(n.task==='ball')ballGame();else if(n.task==='findCat')findCat();else if(n.task==='enter')enterPrompt(n.destination);else if(n.task==='math')mathQuiz();else if(n.task==='puzzle')puzzleGame();else if(n.task==='mystery')mysteryQuiz();else if(n.task==='room')enterRoom(n.destination);else if(n.task==='exit')exitRoom();else if(n.task==='wardrobe')profileEditor();else if(n.task==='journal')showMemories();else if(n.task==='stories')storyShelf();else if(n.task==='coloring')coloringShelf();else if(n.task==='library-puzzle')libraryPuzzle();else if(n.task==='revision-fr')revisionShelf('fr');else if(n.task==='revision-de')revisionShelf('de');else if(n.task==='revision-math')revisionShelf('math');else if(n.task==='basket')basketballGame();else if(n.task==='movements')movementGame();else if(n.task==='melody')melodyGame();else if(n.task==='rhythm')rhythmGame();else if(n.task==='hopscotch')hopscotchGame();
}
let outsideReturn={x:1045,y:705};
function enterRoom(s){
 if(scene==='outside')outsideReturn={...player};if(scene==='school'&&schoolChildren.includes(s))schoolReturn={...player};scene=s;near=null;keys.clear();mode='walk';updateTransport();player={x:750,y:915};setZoom(defaultZoom());
 const titles={school:'Bienvenue à l’école',class1:'La classe des découvertes',class2:'La classe des explorateurs',home:'Ton petit chez-toi',inesHome:'Une visite chez Inès',tomHome:'Une visite chez Tom',library:'La petite bibliothèque',gym:'La salle de sport',music:'La salle de musique'};
 $('#locationTitle').textContent=titles[s];$('#placeTag').textContent=s.startsWith('class')?'EN CLASSE':s==='school'?'ÉCOLE DE BELLE-COUR':s==='library'?'BIBLIOTHÈQUE':s==='gym'?'SALLE DE SPORT':s==='music'?'SALLE DE MUSIQUE':s==='home'?'CHEZ TOI':s==='inesHome'?'CHEZ INÈS':'CHEZ TOM';canvas.focus({preventScroll:true});
}
function exitRoom(){
 if(schoolChildren.includes(scene)){enterRoom('school');player={...schoolReturn};return;}
 scene='outside';near=null;player={...outsideReturn};setZoom(defaultZoom());$('#locationTitle').textContent='Une après-midi au Bocage';$('#placeTag').textContent='LE QUARTIER';canvas.focus({preventScroll:true});
}
function entities(){
 if(scene==='outside')return [...outside.filter(n=>n.id!=='cat'||catStage==='search'),...crossingEntities(),...parkGames.map(g=>({...g,task:'park'}))];
 const exit={id:'exit',x:750,y:945,name:schoolChildren.includes(scene)?'Le couloir':'Sortir',task:'exit',icon:'🚪'};
 if(scene==='school')return [exit,...schoolDoors.map(d=>({...d,task:'room',destination:d.id}))];
 if(scene==='library')return libraryEntities(exit);
 if(scene==='gym')return [exit,{id:'basket',x:505,y:570,name:'Le défi des paniers',task:'basket',icon:'🏀'},{id:'movements',x:985,y:840,name:'Le circuit des mouvements',task:'movements',icon:'🤸'}];
 if(scene==='music')return [exit,{id:'piano',x:580,y:820,name:'Le piano des mélodies',task:'melody',icon:'🎹'},{id:'drums',x:1000,y:820,name:'Le jeu des rythmes',task:'rhythm',icon:'🥁'}];
 if(scene.startsWith('class'))return [exit,{id:'teacher',x:750,y:420,name:'La maîtresse',task:'math',icon:'🔢',shirt:'#b28d71',skin:'#ebbc99',hair:'#5c4334',hairstyle:'long'}];
 const base=[exit,{id:'desk',x:1040,y:625,name:'Travailler les calculs',task:'math',icon:'📚'}];
 if(scene==='home')return [exit,{id:'wardrobe',x:390,y:885,name:'Ta garde-robe',task:'wardrobe',icon:'👕'},{id:'pet',x:520,y:855,name:'Nourrir Moustache',task:'pet',icon:'🐈'},{id:'journal',x:690,y:885,name:'Tes souvenirs',task:'journal',icon:'📒'},{id:'desk',x:870,y:885,name:'Travailler les calculs',task:'math',icon:'📚'},{id:'decor',x:1090,y:885,name:'Décorer ta chambre',task:'decorate',icon:'🎨'}];
 return [...base,{id:'friend',x:560,y:710,name:scene==='inesHome'?'Inès':'Tom',task:scene==='inesHome'?'puzzle':'mystery',icon:scene==='inesHome'?'🧩':'🔎',shirt:scene==='inesHome'?'#a48aaf':'#7298b0',skin:'#edc19b',hair:scene==='inesHome'?'#613e30':'#ad7447',hairstyle:scene==='inesHome'?'long':'short'}];
}
function obstacles(){if(scene==='outside')return [...buildings.map(b=>({x:b.x-10,y:b.y-10,w:b.w+20,h:b.h+20})),...fixtures.filter(f=>f.id!=='preau'),...fixtures.filter(f=>f.ramp).map(f=>f.ramp),...fixtures.filter(f=>f.id==='preau').flatMap(f=>[{x:f.x+5,y:f.y+4,w:4,h:4},{x:f.x+f.w-9,y:f.y+4,w:4,h:4},{x:f.x+5,y:f.y+f.h-8,w:4,h:4},{x:f.x+f.w-9,y:f.y+f.h-8,w:4,h:4}])];if(scene==='school'||scene==='gym')return [];
 if(scene==='home')return roomObstacles();
 if(scene==='library')return [{x:365,y:340,w:205,h:95},{x:650,y:340,w:200,h:95},{x:935,y:340,w:200,h:95},...[400,660,950].map(x=>({x,y:600,w:180,h:100}))];
 if(scene==='music')return [{x:410,y:525,w:340,h:180},{x:930,y:620,w:140,h:120}];
 if(scene.startsWith('class'))return [{x:580,y:325,w:340,h:70},...([450,700,950].flatMap(x=>[560,740].map(y=>({x:x-40,y:y-25,w:105,h:60}))))];
 return [{x:365,y:330,w:220,h:70},{x:390,y:535,w:210,h:70},{x:650,y:600,w:150,h:85},{x:1010,y:330,w:135,h:100},{x:1000,y:520,w:150,h:70}];}
function walkable(x,y){if(scene==='outside'&&!roadAllowed(x,y))return false;const margin=scene==='outside'?70:330;const right=scene==='outside'?1430:1170,top=scene==='outside'?110:320,bottom=scene==='outside'?1210:960;if(x<margin||x>right||y<top||y>bottom)return false;return !obstacles().some(o=>x>o.x-10&&x<o.x+o.w+10&&y>o.y-10&&y<o.y+o.h+10);}

function setMode(m){if(scene!=='outside'&&m!=='walk'){toast('À l’intérieur, on se déplace à pied.');return;}mode=m;updateTransport();canvas.focus({preventScroll:true});}
function updateTransport(){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));}
function showMemories(){
 const items=missions.filter(m=>completed.has(m.id));
 modal('<div class="modal-eyebrow">Tes souvenirs</div><h2 class="modal-title">Au fil des rencontres</h2>'+(items.length?items.map(m=>'<p class="report-row"><span>'+m.icon+' '+m.title+'</span><span>✓</span></p>').join(''):'<p class="modal-description">Tes souvenirs apparaîtront ici après tes aventures. Pour le moment, profite de ta promenade et rencontre les habitants.</p>'));
}
function family(){modal(`<div class="modal-eyebrow">Espace famille · prototype 2.1</div><h2 class="modal-title">Apprendre au fil des rencontres</h2><p class="modal-description">Âge actuel : <b>${profile.age} ans</b>. Les contenus utilisent trois paliers : 7–8, 9–10 et 11–12 ans. Ce sont des repères de prototype, à valider avec un enseignant ; ils ne constituent pas une évaluation officielle du PER.</p><div class="report-row"><span>Aventures réussies</span><b>${completed.size}</b></div>${missions.filter(m=>discovered.has(m.id)).map(m=>`<div class="report-row"><span>${m.icon} ${m.title}</span><span>${completed.has(m.id)?'✓ Réussie':'Rencontrée'}</span></div>`).join('')}<p class="modal-description">Les erreurs donnent un indice, sans retirer d’étoile. Une activité rapporte une étoile à sa première réussite et reste rejouable. Le jeu est individuel : tous les personnages sont fictifs, les échanges sont écrits à l’avance.</p><p class="modal-description"><b>Données :</b> pseudo, âge, apparence et progression sont enregistrés dans ce navigateur, sur cet appareil. Aucun compte, publicité, traçage ou échange avec d’autres joueurs. Le bouton d’export permet de garder une copie.</p><p class="modal-description"><b>Le décor :</b> évocation du secteur Bocage / Belle-Cour à Onex. Les façades, toits, cours et alignements ont été redessinés à partir des photos et captures fournies. Le plan reste simplifié et les intérieurs et personnages sont fictifs. Les photographies et captures ne sont pas affichées dans le jeu. <a href="https://noms-geographiques.app.ge.ch/voie/geneve/chemin-du-bocage" target="_blank" rel="noopener">Référence géographique du Canton</a> · <a href="https://edu.ge.ch/enseignement/system/files/2023-06/prescriptions-cantonales-cm.pdf" target="_blank" rel="noopener">Repères scolaires genevois</a>.</p><div class="actions"><button id="editAge" class="primary">Modifier le personnage / l’âge</button><button id="soundToggle" class="secondary">Son : ${sound?'activé':'désactivé'}</button><button id="exportSave" class="secondary">Exporter la sauvegarde</button><button id="importSave" class="secondary">Importer</button><button id="resetSave" class="secondary">Recommencer</button></div><input id="saveFile" class="hidden" type="file" accept="application/json,.json"><p id="familyFeedback" class="feedback" role="status"></p>`);
 $('#editAge').onclick=()=>profileEditor();$('#soundToggle').onclick=()=>{sound=!sound;$('#soundToggle').textContent=`Son : ${sound?'activé':'désactivé'}`;if(sound)chime();};
 $('#exportSave').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,profile,completed:[...completed],catStage,attempts,discovered:[...discovered],coloring:coloringPages,room:roomDecor,pet:petCare},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ma-sauvegarde-bocage.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#importSave').onclick=()=>$('#saveFile').click();$('#saveFile').onchange=async e=>{try{const f=e.target.files[0];if(!f||f.size>100000)throw Error();const d=JSON.parse(await f.text());if(d.version!==1||!d.profile||!Array.isArray(d.completed))throw Error();modal('<h2 class="modal-title">Charger cette aventure ?</h2><p class="modal-description">La progression actuelle sera remplacée par celle du fichier. Tu peux annuler pour garder ta partie.</p><div class="actions"><button id="confirmImport" class="primary">Charger la sauvegarde</button><button id="cancelImport" class="secondary">Annuler</button></div>');$('#cancelImport').onclick=family;$('#confirmImport').onclick=()=>{roomDecor=cleanRoom(d.room);petCare={food:!!d.pet?.food,water:!!d.pet?.water};profile=cleanProfile(d.profile);completed=new Set(d.completed.filter(k=>known.includes(k)));catStage=['search','found','done'].includes(d.catStage)?d.catStage:'new';attempts={};coloringPages=d.coloring&&typeof d.coloring==='object'&&!Array.isArray(d.coloring)?d.coloring:{};discovered=new Set(Array.isArray(d.discovered)?d.discovered.filter(k=>known.includes(k)):[...completed]);created=true;save();updateUI();closeModal();if(scene!=='outside'){if(schoolChildren.includes(scene))exitRoom();exitRoom();}toast('Ton aventure a été chargée.');};}catch{$('#familyFeedback').textContent='Ce fichier n’est pas une sauvegarde valide du Bocage.';}};
 $('#resetSave').onclick=()=>{modal('<h2 class="modal-title">Une nouvelle aventure ?</h2><p class="modal-description">Cela remettra à zéro les étoiles, les missions et les coloriages sur cet appareil. Ton personnage sera conservé. Pense à exporter ta sauvegarde si tu veux la garder.</p><div class="actions"><button id="confirmReset" class="primary">Oui, recommencer</button><button id="cancelReset" class="secondary">Garder ma partie</button></div>');$('#cancelReset').onclick=family;$('#confirmReset').onclick=()=>{completed.clear();discovered.clear();catStage='new';attempts={};coloringPages={};roomDecor=cleanRoom();petCare={food:false,water:false};save();updateUI();closeModal();scene='outside';outsideReturn={x:1045,y:705};exitRoom();toast('Une nouvelle histoire commence !');};};
}
function help(){modal(`<div class="modal-eyebrow">Un quartier à explorer</div><h2 class="modal-title">À toi de jouer !</h2><ul class="info-list">${touchUI?'<li><b>Pour marcher</b>, pose ton doigt sur la carte et fais-le glisser dans la direction voulue. Plus tu glisses loin, plus tu vas vite. Lève le doigt pour t’arrêter.</li>':'<li><b>Déplace ton personnage manuellement</b> avec les flèches, ZQSD ou WASD. Tu peux aussi maintenir les boutons directionnels sous la carte.</li>'}<li>Approche-toi d’une personne, puis appuie sur ${touchUI?'le grand bouton vert':'<b>E ou Entrée</b> ou sur <b>Parler / entrer</b>'}. Tu peux aussi cliquer sur elle lorsque tu es tout près.</li><li>Les missions et jeux se découvrent <b>dans les conversations</b>. Prends le temps de te promener.</li><li>Pour entrer dans un bâtiment, approche-toi de sa porte. Chez un copain, tu pourras sonner.</li><li>La vue suit ta photo : N pointe presque vers la gauche, un peu vers le haut ; E pointe vers le haut, légèrement à droite. Le nord-est est entre les deux : vers le haut et la gauche de la vue.</li><li>Le vélo et la trottinette permettent d’avancer plus vite dehors. À l’intérieur, on marche.</li><li>À gauche de l’école, approche-toi du bouton du passage piéton et appuie sur E ou Entrée. Attends le vert : tu as dix secondes pour traverser vers le parc. La route est bloquée ailleurs.</li><li>Chez toi, découvre le bouton Décorer ta chambre et occupe-toi de Moustache.</li><li>Change ton apparence et ton âge avec le bouton de ton personnage. Échap ferme un dialogue.</li></ul><div class="actions"><button class="primary" id="helpDone">Partons nous promener !</button></div>`);$('#helpDone').onclick=closeModal;}


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
 if(school){
 // Hip roofs: each school wing slopes on all four sides, as seen from above.
 const x0=x-6,x1=x+w+7,y0=roofY,y1=top,s=Math.min(w,h)/2;
 let L,R;if(w>=h){const m=(y0+y1)/2-rise;L=[x+s,m];R=[x+w-s,m];
  poly(c,[[x0,y0],[x1,y0],R,L],'#d39a7c');poly(c,[[x0,y0],[x0,y1],L],'#cf9273');poly(c,[[x1,y0],[x1,y1],R],'#b8785b');poly(c,[[x0,y1],[x1,y1],R,L],'#c78667');}
 else{const m=(x0+x1)/2;L=[m,y0+s-rise];R=[m,y1-s-rise];
  poly(c,[[x0,y0],[x1,y0],L],'#d39a7c');poly(c,[[x0,y0],[x0,y1],R,L],'#cf9273');poly(c,[[x1,y0],[x1,y1],R,L],'#b8785b');poly(c,[[x0,y1],[x1,y1],R],'#c78667');}
 c.strokeStyle='#a5694d';c.lineWidth=1.6;c.beginPath();c.moveTo(x0,y0);c.lineTo(...L);c.lineTo(...R);c.lineTo(x1,y0);c.moveTo(x0,y1);c.lineTo(...L);c.moveTo(x1,y1);c.lineTo(...R);c.stroke();
 c.strokeStyle='#ae735333';c.lineWidth=.8;for(let yy=y0+6;yy<y1;yy+=7){c.beginPath();c.moveTo(x0+2,yy);c.lineTo(x1-2,yy);c.stroke();}
 }else if(b.flat){
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
  const {x,y,w,h,ramp}=f,L=ramp.x,R=ramp.x+ramp.w,T=ramp.y,B=ramp.y+ramp.h,mid=(T+B)/2;
  // Drawn from the photo: an open timber shelter with a tile roof covers a ramp that goes down,
  // between two concrete walls topped with black railings, to a grey door. The car park is underground.
  rr(c,x,y+2,w,h-2,4,'#bdb9a8');rr(c,x+4,y-2,w-8,h-8,6,'#86a86b');
  for(let i=0;i<6;i++)ellipse(c,x+14+i*16,y+8+(i%2)*14,10,8,['#97b97b','#7d9f63'][i%2]);
  const slope=c.createLinearGradient(L,0,R,0);slope.addColorStop(0,'#9da19b');slope.addColorStop(1,'#4c524f');
  rr(c,L,T+9,ramp.w,ramp.h-18,0,slope);
  c.strokeStyle='#e9e6dc99';c.lineWidth=1.5;c.beginPath();c.moveTo(L+24,mid+9);c.lineTo(R-16,mid-3);c.stroke();
  rr(c,R-12,T+9,12,ramp.h-18,0,'#d8d3c5');rr(c,R-10,T+12,8,ramp.h-24,1,'#a6abab');
  c.strokeStyle='#8d9393';c.lineWidth=.8;for(let yy=T+16;yy<B-12;yy+=5){c.beginPath();c.moveTo(R-10,yy);c.lineTo(R-2,yy);c.stroke();}
  for(const wy of [T,B-9]){rr(c,L,wy,ramp.w,9,1,'#e6e1d3');for(let i=0;i<6;i++)rr(c,L+i*6,wy+5,6,4,0,i%2?'#2f3330':'#e2b33c');}
  rr(c,L,B,ramp.w,5,0,'#cbc5b4');
  rr(c,L+9,mid-12,3,14,1,'#f6f4ee');rr(c,L+7,mid,7,4,1,'#e2b33c');
  // Black railings along both walls, from where the ramp is deep enough.
  c.strokeStyle='#2e3532';c.lineWidth=1.3;
  for(const wy of [T+3,B-5]){c.beginPath();c.moveTo(L+34,wy-9);c.lineTo(R,wy-9);c.stroke();for(let xx=L+34;xx<=R;xx+=6){c.beginPath();c.moveTo(xx,wy);c.lineTo(xx,wy-9);c.stroke();}}
  const eaveN=T-34,eaveS=B-34,ridge=(eaveN+eaveS)/2-12,posts=[L+8,L+ramp.w/2,R-5];
  c.save();if(player.x>L-10&&player.x<x+w+8&&player.y>eaveN-20&&player.y<T+12)c.globalAlpha=.42;
  c.strokeStyle='#5b3b29';c.lineCap='butt';
  for(const wy of [T+4,B-4])for(const px of posts){c.lineWidth=4;c.beginPath();c.moveTo(px,wy);c.lineTo(px,wy-36);c.stroke();}
  c.lineWidth=2;for(const px of posts){c.beginPath();c.moveTo(px-9,eaveS+4);c.lineTo(px,eaveS+12);c.lineTo(px+9,eaveS+4);c.stroke();}
  poly(c,[[L-7,ridge],[R+7,ridge],[R+5,eaveN],[L-5,eaveN]],'#d39a7c');
  poly(c,[[L-9,eaveS+2],[R+9,eaveS+2],[R+7,ridge],[L-7,ridge]],'#c78667');
  c.strokeStyle='#ae73534d';c.lineWidth=.8;
  for(let yy=eaveN+5;yy<eaveS;yy+=6){c.beginPath();c.moveTo(L-4,yy);c.lineTo(R+4,yy);c.stroke();}
  for(let xx=L-2;xx<R+6;xx+=8){c.beginPath();c.moveTo(xx,eaveN+1);c.lineTo(xx,eaveS+1);c.stroke();}
  c.strokeStyle='#a5694d';c.lineWidth=3;c.beginPath();c.moveTo(L-7,ridge);c.lineTo(R+7,ridge);c.stroke();
  rr(c,L-9,eaveS+2,ramp.w+18,4,1,'#5b3b29');
  rr(c,L+ramp.w*.62,eaveS+7,15,8,1,'#fbfaf5');c.strokeStyle='#d24a3a';c.lineWidth=1.2;c.beginPath();c.arc(L+ramp.w*.62+4,eaveS+11,2.6,0,Math.PI*2);c.stroke();
  c.restore();
  rr(c,L-15,y+3,3,32,1,'#8c9d88');rr(c,L-23,y-12,20,22,3,'#72969e');text(c,'P',L-13,y+4,15,'#fff8e1','700');
  text(c,'Entrée garage',L+ramp.w/2,eaveN-6,11,'#7b8d72');
 }
}
function outdoorGround(){const c=ctx;
 rr(c,57,75,1380,1150,60,'#bbcba3');rr(c,62,65,1370,1150,60,'#d7dfbf');
 c.globalAlpha=.45;for(let i=0;i<210;i++)ellipse(c,85+(i*137)%1320,105+(i*263)%950,1.4,1,'#a6b789');c.globalAlpha=1;
 drawRoadGround();
 for(const l of lanes.filter(l=>!l.paved)){rr(c,l.x-3,l.y+3,l.w+6,l.h,5,'#c5c6b4');rr(c,l.x,l.y,l.w,l.h,4,'#ded9c6');}
 for(const [i,x]of [818,858,910,950].entries()){c.save();c.translate(x,163);c.rotate(Math.PI/2);parkedCar(-10,-18,['#c9c9c4','#b5574b','#c9c9c4','#7f9a8c'][i]);c.restore();}
 rr(c,1000,176,9,13,2,'#5c84b8');rr(c,1003,179,3,7,1,'#f4f1e6');rr(c,1003,189,2,10,0,'#7d8a85');
 // In front of the school: bike racks and a large boulder at the corner of the play area (photo).
 c.strokeStyle='#8e9c98';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.arc(380+i*14,632,5,Math.PI,0);c.lineTo(385+i*14,640);c.moveTo(375+i*14,632);c.lineTo(375+i*14,640);c.stroke();}
 ellipse(c,445,652,15,8,'#9c9a8f55');ellipse(c,442,647,13,9,'#ddd7c9');ellipse(c,439,644,6,4,'#f1ede3');
 rr(c,370,606,62,4,1,'#9aa3a0');rr(c,373,610,2,30,0,'#9aa3a0');rr(c,427,610,2,30,0,'#9aa3a0');rr(c,368,603,66,9,2,'#eef0ec');rr(c,368,610,66,2,0,'#c9cfcb');
 // Two small play areas: the annotated table and slide are directly in front of the school.
 rr(c,417,548,220,96,13,'#b9806c');rr(c,424,553,206,86,10,'#c98772');
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
 // Chemin des Pampres is a real street: it starts at the Grand-Lancy road, as on the satellite view.
 text(c,'Chemin des Pampres',985,938,13,'#eef0e6','600');
 // The entrance branches from the left of the garage, not from its lower facade.
 poly(c,[[423,923],[463,872],[480,872],[488,917]],'#cfcab6');
 poly(c,[[438,929],[471,884],[481,890],[474,934]],'#aeb3ae');
 // The access road continues south between the two lower buildings.
 rr(c,garageAccess.x-9,garageAccess.y,garageAccess.w+18,garageAccess.h,4,'#cfcab6');
 rr(c,garageAccess.x,garageAccess.y,garageAccess.w,garageAccess.h,3,'#aeb3ae');
 // Bays facing the Pampres street above the flat building, and down the west side of the garage lane (satellite).
 c.strokeStyle='#e8e4d2';c.lineWidth=1.2;
 for(let i=0;i<10;i++){const x=142+i*26;c.strokeRect(x-3,960,26,42);if(i!==2&&i!==7)parkedCar(x,963,['#c9c9c4','#7898a8','#b5574b','#c0af7d','#5d6b78','#8da28b','#c9c9c4','#b18a76','#7898a8','#c9c9c4'][i]);}
 for(let i=0;i<9;i++){const y=972+i*26;c.strokeRect(garageAccess.x+3,y-12,42,24);if(i!==4&&i!==7){c.save();c.translate(garageAccess.x+24,y);c.rotate(Math.PI/2);parkedCar(-10,-18,['#c0af7d','#7898a8','#b18a76','#8da28b','#c9c9c4','#5d6b78','#b5574b','#c9c9c4','#7898a8'][i]);c.restore();}}
 c.strokeStyle='#ede8d5';c.lineWidth=1.5;c.beginPath();c.moveTo(garageAccess.x+4,garageAccess.y+36);c.lineTo(garageAccess.x+4,garageAccess.y+garageAccess.h-5);c.moveTo(garageAccess.x+garageAccess.w-4,garageAccess.y+36);c.lineTo(garageAccess.x+garageAccess.w-4,garageAccess.y+garageAccess.h-5);c.stroke();
 c.save();c.translate(1034,585);c.rotate(-Math.PI/2);text(c,'Chemin du Bocage',0,0,12,'#999a81');c.restore();
 for(const b of buildings){if(b.school||b.ref.startsWith('right-north'))continue;
 for(let sx=b.x+13;sx<b.x+b.w-10;sx+=gardenSize.spacing){
 const doorX=b.x+b.w/2;if(b.type!=='decor'&&sx<doorX+17&&sx+gardenSize.width>doorX-17)continue;
 rr(c,sx,b.y+b.h+gardenSize.offset,gardenSize.width,gardenSize.depth,3,'#bdcda2');
 rr(c,sx,b.y+b.h+gardenSize.offset+gardenSize.depth-2,gardenSize.width,4,2,'#91a77a');
 }
 if(b.type!=='decor')rr(c,b.x+b.w/2-11,b.y+b.h+5,22,gardenSize.offset+gardenSize.depth+4,2,'#ded9c6');
 }
 for(const [x,y]of [[980,225],[985,360],[1000,490],[1048,730]])parkedCar(x,y,'#a1b1af');
 // Small shelter and crossing beside the school, aligned with the diagonal road.
 {const p=roadPoint(-400,60);rr(c,p.x-17,p.y-30,34,9,2,'#8d9d8a');rr(c,p.x-13,p.y-25,3,27,1,'#80938a');rr(c,p.x+10,p.y-25,3,27,1,'#80938a');}

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
 if(scene==='home'){drawHomeRoom();}else if(scene==='library'){drawLibraryRoom();}else if(scene==='gym'){drawGymRoom();}else if(scene==='music'){drawMusicRoom();}else if(scene==='school'){drawSchoolHall();
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
 if(scene==='outside'){outdoorGround();drawTraffic();drawPark();}else indoorGround();
 const es=entities();let objects=[];
 if(scene==='outside')objects=[...trees.map(t=>({y:t.y,draw:()=>tree(t)})),...fixtures.map(f=>({y:f.y+f.h,draw:()=>drawFixture(f)})),...buildings.map(b=>({y:b.y+b.h,draw:()=>{ctx.save();if(player.x>b.x-8&&player.x<b.x+b.w+20&&player.y>b.y-b.height-30&&player.y<b.y)ctx.globalAlpha=.42;building(b);ctx.restore();}}))];
 for(const n of es){if(n.id==='cat')objects.push({y:n.y,draw:()=>catDraw(n)});else if(n.shirt)objects.push({y:n.y,draw:()=>character(ctx,n.x,n.y,n,false)});}
 objects.push({y:player.y,draw:()=>{
 ellipse(ctx,player.x,player.y+3,24,10,'#f9f2c371');ctx.strokeStyle='#ffffdf';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(player.x,player.y+3,22,9,0,0,Math.PI*2);ctx.stroke();character(ctx,player.x,player.y,{...profile,isPlayer:true},keys.size>0||!!stick?.active);
 if(catStage==='found'){ctx.save();ctx.translate(player.x,player.y-24);ctx.scale(.65,.65);catDraw({x:0,y:0},ctx);ctx.restore();ctx.strokeStyle=profile.skin;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(player.x-12,player.y-31);ctx.quadraticCurveTo(player.x,player.y-16,player.x+13,player.y-29);ctx.stroke();}
 text(ctx,'TOI',player.x,player.y-74,11,'#4c7257','700');if(roadWarning>0&&scene==='outside')text(ctx,'⚠',player.x,player.y-100,30,'#c88432','700');}});
 objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 es.forEach(label);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 if(stick?.active){const r=stick.radius;ctx.globalAlpha=.85;ellipse(ctx,stick.sx,stick.sy,r,r,'#ffffff80');ctx.strokeStyle='#264e4055';ctx.lineWidth=2;ctx.beginPath();ctx.arc(stick.sx,stick.sy,r,0,Math.PI*2);ctx.stroke();ellipse(ctx,stick.sx+stick.dx*r,stick.sy+stick.dy*r,r*.42,r*.42,'#355f46');ctx.globalAlpha=1;}
}
function tick(now){
 const dt=last?Math.min((now-last)/1000,.04):0;last=now;time+=dt;
 if(!$('#modal').open){if(scene==='outside')updateTraffic(dt);roadWarning=Math.max(0,roadWarning-dt);let dx=0,dy=0;if(keys.has('ArrowUp')||keys.has('w')||keys.has('z'))dy--;if(keys.has('ArrowDown')||keys.has('s'))dy++;if(keys.has('ArrowLeft')||keys.has('a')||keys.has('q'))dx--;if(keys.has('ArrowRight')||keys.has('d'))dx++;
 const speed=scene==='outside'?{walk:170,bike:310,scooter:245}[mode]:170;
 let power=1;if(!dx&&!dy&&stick?.active){power=Math.min(1,Math.hypot(stick.dx,stick.dy));if(power>.15){dx=stick.dx;dy=stick.dy;}}
 if(dx||dy){const norm=Math.hypot(dx,dy);dx=dx/norm*speed*power*dt;dy=dy/norm*speed*power*dt;movePlayer(dx,dy);}
 near=entities().filter(n=>Math.hypot(n.x-player.x,n.y-player.y)<82).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
 const nearLabel=near?(near.task==='enter'?'Entrer : ':near.task==='exit'?'':near.task==='room'?'Visiter : ':'')+near.name:'';
 $('#interaction').classList.toggle('hidden',!near||touchUI);if(near)$('#interaction span').textContent=nearLabel;
 if(touchUI&&$('#touchInteract').dataset.label!==nearLabel){$('#touchInteract').dataset.label=nearLabel;$('#touchInteract').textContent=near?(near.task==='enter'||near.task==='room'||near.task==='exit'?'🚪 ':'💬 ')+nearLabel:'Approche-toi de quelqu’un';$('#touchInteract').classList.toggle('ready',!!near);}
 if(time-saveTimer>30){saveTimer=time;if(created)save();}
 }
 render();requestAnimationFrame(tick);
}
function tapWorld(e){
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left-view.ox)/view.scale,y=(e.clientY-r.top-view.oy)/view.scale;
 const es=entities();let n=es.filter(n=>Math.hypot(x-n.x,y-(n.y-(n.shirt?30:0)))<62).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];
 if(!n&&scene==='outside'){const b=buildings.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y-b.height&&y<=b.y+b.h);if(b)n=es.find(n=>n.id===b.type);}
 if(n&&Math.hypot(player.x-n.x,player.y-n.y)<85)interact(n);else if(n)toast('Approche-toi d’abord. '+moveHint());else canvas.focus({preventScroll:true});
}
canvas.addEventListener('pointerdown',e=>{
 if($('#modal').open)return;
 if(e.pointerType!=='touch'&&e.pointerType!=='pen'){tapWorld(e);return;}
 // A touch becomes a stick once the finger slides; a short tap still talks to someone nearby.
 if(stick)return;e.preventDefault?.();canvas.setPointerCapture?.(e.pointerId);const r=canvas.getBoundingClientRect();
 stick={id:e.pointerId,sx:e.clientX-r.left,sy:e.clientY-r.top,dx:0,dy:0,active:false,radius:Math.max(38,Math.min(60,r.width*.12))};
});
canvas.addEventListener('pointermove',e=>{
 if(!stick||e.pointerId!==stick.id)return;const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left-stick.sx,my=e.clientY-r.top-stick.sy,d=Math.hypot(mx,my);
 if(d>10)stick.active=true;if(stick.active){const k=Math.min(d,stick.radius)/(d||1)/stick.radius;stick.dx=mx*k;stick.dy=my*k;}
});
const endStick=e=>{if(!stick||e.pointerId!==stick.id)return;const tap=!stick.active;stick=null;if(tap&&e.type==='pointerup'&&!$('#modal').open)tapWorld(e);};
canvas.addEventListener('pointerup',endStick);canvas.addEventListener('pointercancel',endStick);
document.addEventListener('keydown',e=>{if($('#modal').open)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','z','q','e','Enter'].includes(k)){e.preventDefault();if(k==='e'||k==='Enter'){if(!e.repeat)interact(entities().filter(n=>Math.hypot(n.x-player.x,n.y-player.y)<82).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]);}else keys.add(k);}});
document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{keys.clear();stick=null;});document.addEventListener('visibilitychange',()=>{keys.clear();stick=null;if(created)save();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
$('#touchInteract').onclick=()=>interact(near);$('#interaction').onclick=()=>interact(near);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#zoomIn').onclick=()=>setZoom(zoom+.25);$('#zoomOut').onclick=()=>setZoom(zoom-.25);
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
const hopRows=[[1],[2],[3,4],[5],[6,7],[8]];
function makeHopRoute(stone){
 const groups=hopRows.map((cells,row)=>({cells:cells.filter(n=>n!==stone),row})).filter(g=>g.cells.length);
 const stoneRow=hopRows.findIndex(r=>r.includes(stone));
 const pickupRow=(groups.find(g=>g.row>=stoneRow)||groups.at(-1)).row;
 const sequence=[...groups.map(g=>({...g,back:false})),...groups.slice(0,-1).reverse().map(g=>({...g,back:true})),{cells:[],row:-1,back:true}];
 let pickupAt=0;sequence.forEach((g,i)=>{if(g.row===pickupRow)pickupAt=i+1;});
 return {sequence,pickupAt};
}
function hopSpot(row,cells=hopRows[row]){const offset=row>=0&&hopRows[row].length===2&&cells.length===1?(cells[0]===hopRows[row][0]?-38:38):0;return {x:400+offset,y:row<0?536:476-row*61};}
function drawHopscotch(c,s){
 c.save();c.clearRect(0,0,800,580);
 const bg=c.createLinearGradient(0,0,0,580);bg.addColorStop(0,'#dce8d7');bg.addColorStop(1,'#f0e9d6');c.fillStyle=bg;c.fillRect(0,0,800,580);
 rr(c,28,24,744,62,16,'#edf2e5');text(c,'LA COUR DES PETITS BONDS',400,52,15,'#65806b','700');text(c,'TERRE → CIEL → TERRE',400,73,12,'#788975');
 for(let i=0;i<22;i++)ellipse(c,26+(i*137)%750,110+(i*83)%450,2,1,'#a6ad9235');
 rr(c,293,99,214,458,28,'#cbd2bf');rr(c,299,95,202,458,28,'#e0e5d7');
 text(c,'CIEL',400,117,13,'#658878','700');text(c,'TERRE',400,561,12,'#658878','700');
 const next=s.sequence[s.progress],targetRow=s.phase==='play'?next?.row:-2;
 for(let row=0;row<hopRows.length;row++){
  const ns=hopRows[row],spot=hopSpot(row);
  for(let j=0;j<ns.length;j++){
   const n=ns[j],x=400+(ns.length===2?(j?38:-38):0),blocked=n===s.stone&&!s.collected;
   rr(c,x-36,spot.y-48,72,56,6,blocked?'#ddcdb4':['#e6bd9f','#dbd79e','#abc9bf','#b8c9dd','#d2bdd4','#edcf92'][row],'#fffdf2');
   if(row===targetRow&&s.hints&&!blocked){c.lineWidth=3;rr(c,x-33,spot.y-45,66,50,5,null,'#4b846b');c.lineWidth=1;}
   text(c,String(n),x,spot.y-14,25,blocked?'#8e806e':'#526e63','700');
  }
 }
 const stoneRow=hopRows.findIndex(r=>r.includes(s.stone)),ns=hopRows[stoneRow],sx=400+(ns.length===2?(ns[0]===s.stone?-38:38):0),sy=hopSpot(stoneRow).y-32;
 const a=s.animation,u=a?Math.min(1,a.elapsed/a.duration):0,e=parkEase(u);
 if(!s.collected&&s.phase!=='aim'){
  let x=sx+16,y=sy;
  if(a?.type==='throw'){x=418+(sx+16-418)*e+(a.hit?0:120*e);y=500+(sy-500)*e-Math.sin(Math.PI*u)*140;}
  ellipse(c,x+3,y+5,10,4,'#73736332');ellipse(c,x,y,9,6,'#867d72');ellipse(c,x-2,y-2,4,2,'#b9b0a2');
 }
 let x=s.position.x,y=s.position.y,lift=0,pose=s.double?'hop-double':'hop',phase=0;
 if(a?.type==='jump'){x=a.from.x+(a.to.x-a.from.x)*e;y=a.from.y+(a.to.y-a.from.y)*e;lift=Math.sin(Math.PI*u)*58;pose=a.double?'hop-double':'hop';phase=Math.sin(Math.PI*u);}
 if(a?.type==='pickup'){pose='pickup';phase=Math.sin(Math.PI*u);}
 if(s.phase==='aim'||a?.type==='throw'){pose='throw';phase=a?Math.sin(Math.PI*u):0;}
 if(s.phase==='done'){pose='wave';phase=s.time;}
 ellipse(c,x,y+4,25-lift*.13,6-lift*.04,'#5f77682d');
 parkAvatar(c,x,y-28-lift,profile,pose,phase,.64,s.back?-1:1);
 if(s.phase==='aim')ellipse(c,x+20,y-41,7,5,'#867d72');
 text(c,s.phase==='done'?'BRAVO !':s.phase==='aim'?'À TOI DE LANCER':s.back?'LE RETOUR':'L’ALLER',145,166,16,'#4b715d','700');
 const guide=s.phase==='aim'?['Arrête le curseur','dans la zone verte.']:s.phase==='collect'||a?.type==='pickup'?['Récupère ton caillou','avant de rentrer.']:s.phase==='done'?['Caillou récupéré,','parcours réussi !']:['Un pied : case seule','Deux pieds : cases doubles'];
 guide.forEach((line,i)=>text(c,line,145,195+i*23,13,'#738575'));
 text(c,'CASE DU CAILLOU',650,166,12,'#738575','700');text(c,String(s.stone),650,210,38,'#8c7965','700');
 if(s.phase==='done')for(let i=0;i<24;i++){const x=100+(i*89)%600,y=130+(i*67)%350;rr(c,x,y,5,10,1,['#d5ad68','#8eb7a4','#ba9bac'][i%3]);}
 c.restore();
}
function hopscotchGame(){
 discover('hopscotch');const stone=fresh('hop-stone',()=>{const n=randomInt(1,8);return {stone:n,signature:String(n)};}).stone;
 const s={kind:'hopscotch',stone,...makeHopRoute(stone),progress:0,phase:'aim',position:hopSpot(-1),double:false,back:false,collected:false,time:0,aim:0,animation:null,hints:level()===0};activeActivity=s;
 let frame=0,last=null,closed=false;
 const buttons=hopRows.map((cells,row)=>`<button class="secondary" data-hop="${row}" aria-label="Sauter sur ${cells.join(' et ')}">${cells.join(' + ')}</button>`).join('');
 modal(activityHeader('La marelle des petits bonds','La cour de l’école')+`<p class="modal-description">Lance ton caillou, saute à cloche-pied ou à deux pieds sur les cases doubles. Au retour, récupère-le avant de rejoindre la terre.</p><canvas id="hopCanvas" class="hop-canvas" width="800" height="580" role="img" aria-label="Marelle avec ton personnage et ton caillou"></canvas><div id="hopThrowPanel"><div class="hop-aim" aria-hidden="true"><span id="hopTarget"></span><i id="hopCursor"></i></div><button id="hopThrow" class="primary">Lancer le caillou · Espace</button></div><div class="hop-status"><span id="hopStage">1 · Le lancer</span><span id="hopCount">0 saut</span></div><p id="hopFeedback" class="feedback" role="status">Vise la zone verte pour envoyer le caillou sur la case ${stone}.</p><div class="hop-pad" aria-label="Choisis où sauter">${buttons}<button id="hopHome" class="secondary">Terre</button></div><div class="actions"><button id="hopCollect" class="primary" hidden>Ramasser le caillou</button><button id="hopHint" class="secondary">${s.hints?'Masquer':'Montrer'} les indices</button><button id="hopAgain" class="secondary">Nouvelle partie</button><button id="activityClose" class="secondary">Retour à la cour</button></div>`,()=>{closed=true;cancelAnimationFrame(frame);$('#modal').onkeydown=null;});
 const c=$('#hopCanvas').getContext('2d'),half=[.23,.17,.12][level()];$('#hopTarget').style.left=(.5-half)*100+'%';$('#hopTarget').style.width=half*200+'%';
 const feedback=message=>$('#hopFeedback').textContent=message;
 const sync=()=>{
  $('#hopThrowPanel').hidden=s.phase!=='aim';$('#hopCollect').hidden=s.phase!=='collect';$('#hopCount').textContent=s.progress+' / '+s.sequence.length+' sauts';
  $('#hopStage').textContent=s.phase==='done'?'Parcours réussi':s.phase==='aim'||s.phase==='throw'?'1 · Le lancer':s.back?'3 · Le retour':'2 · Vers le ciel';
  document.querySelectorAll('[data-hop]').forEach(b=>{const row=Number(b.dataset.hop),available=hopRows[row].filter(n=>n!==stone);b.disabled=s.phase!=='play'||!available.length;b.textContent=available.length?available.join(' + '):stone+' · caillou';b.setAttribute('aria-label',available.length?'Sauter sur '+available.join(' et '):'Case '+stone+' bloquée par le caillou');b.classList.toggle('hop-next',s.hints&&s.phase==='play'&&s.sequence[s.progress]?.row===row);});
  $('#hopHome').disabled=s.phase!=='play';
 };
 const nextMessage=()=>{const next=s.sequence[s.progress];feedback(next?.row===-1?'Dernier saut : rejoins la terre !':`${s.back?'Retour':'Aller'} : ${s.hints?'saute sur '+next.cells.join(' + '):'choisis la prochaine case libre'+(s.back?' en sens inverse':' dans l’ordre')}. ${next?.cells.length===2?'Deux pieds ensemble !':'À cloche-pied !'}`);};
 const jump=row=>{
  if(s.phase!=='play')return;const next=s.sequence[s.progress];
  if(next.row!==row){feedback(row>=0&&hopRows[row].length===1&&hopRows[row][0]===stone?'Le caillou bloque cette case : saute par-dessus !':'Regarde l’ordre des cases. Tu peux afficher les indices.');return;}
  s.phase='jump';s.back=next.back;s.animation={type:'jump',from:{...s.position},to:hopSpot(row,next.cells),double:next.cells.length===2,elapsed:0,duration:.62};sync();
 };
 const throwStone=()=>{if(s.phase!=='aim')return;const hit=Math.abs(s.aim-.5)<=half;s.phase='throw';s.animation={type:'throw',elapsed:0,duration:.85,hit};feedback(hit?'Le caillou s’envole…':'Un peu à côté… Tu pourras réessayer !');sync();};
 const collect=()=>{if(s.phase!=='collect')return;s.phase='pickup';s.animation={type:'pickup',elapsed:0,duration:.7};sync();};
 document.querySelectorAll('[data-hop]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.hop)));$('#hopHome').onclick=()=>jump(-1);$('#hopThrow').onclick=throwStone;$('#hopCollect').onclick=collect;
 $('#hopHint').onclick=()=>{s.hints=!s.hints;$('#hopHint').textContent=(s.hints?'Masquer':'Montrer')+' les indices';if(s.phase==='play')nextMessage();sync();};
 $('#hopCanvas').onclick=e=>{if(s.phase!=='play')return;const r=$('#hopCanvas').getBoundingClientRect(),x=(e.clientX-r.left)*800/r.width,y=(e.clientY-r.top)*580/r.height;if(x<320||x>480)return;if(y>505){jump(-1);return;}for(let row=0;row<6;row++){const p=hopSpot(row);if(y>=p.y-48&&y<=p.y+8){jump(row);break;}}};
 $('#modal').onkeydown=e=>{if(e.repeat)return;if((e.key===' '||e.key==='Enter')&&(s.phase==='aim'||s.phase==='collect')&&!(e.target?.tagName==='BUTTON'&&e.target.id!=='hopThrow'&&e.target.id!=='hopCollect')){e.preventDefault();s.phase==='aim'?throwStone():collect();}else if(/^[1-8]$/.test(e.key)&&s.phase==='play'){e.preventDefault();jump(hopRows.findIndex(r=>r.includes(Number(e.key))));}};
 const finishAnimation=()=>{
  const a=s.animation;s.animation=null;
  if(a.type==='throw'){s.phase=a.hit?'play':'aim';if(a.hit)nextMessage();else feedback('Réessaie : arrête le curseur dans la zone verte.');}
  if(a.type==='pickup'){s.collected=true;s.phase='play';nextMessage();}
  if(a.type==='jump'){
   s.position=a.to;s.double=a.double;s.progress++;
   if(s.progress===s.sequence.length){s.phase='done';award('hopscotch');feedback('Bravo ! Aller-retour réussi, caillou récupéré. Une nouvelle partie change la case à éviter.');}
   else if(s.progress===s.pickupAt&&!s.collected){s.back=true;s.phase='collect';feedback('Garde ton équilibre ! Ramasse ton caillou avant de continuer.');}
   else{s.phase='play';s.back=s.sequence[s.progress].back;nextMessage();}
  }sync();
 };
 const animate=now=>{if(closed)return;if(document.hidden){last=null;frame=requestAnimationFrame(animate);return;}const dt=last===null?0:Math.min(.06,(now-last)/1000);last=now;s.time+=dt;
  if(s.phase==='aim'){s.aim=(Math.sin(s.time*2.8-Math.PI/2)+1)/2;$('#hopCursor').style.left=s.aim*100+'%';}
  if(s.animation){s.animation.elapsed+=dt;if(s.animation.elapsed>=s.animation.duration)finishAnimation();}
  drawHopscotch(c,s);frame=requestAnimationFrame(animate);
 };
 $('#hopAgain').onclick=hopscotchGame;bindActivityClose();sync();drawHopscotch(c,s);frame=requestAnimationFrame(animate);
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
// Road coordinates: s runs along Grand-Lancy, d runs across it toward the school.
// The Grand-Lancy road runs about 20 degrees from vertical, as on the satellite view; its centre line is x = 480 - 0.364 y.
// s=0 is the pedestrian crossing, level with the bike shelter in front of the school.
const road={x:262,y:600,tx:-.342,ty:.94,nx:.94,ny:.342,half:27,crossHalf:22};
const laneX=y=>573.6-.364*y; // centre of the private lane, 88 from the road centre
const traffic={phase:'drive',remaining:0,cars:[],spawn:1,serial:0};
let roadWarning=0;
const parkGames=[{id:'swing',x:296,y:245,name:'La balançoire',icon:'🌿'}, {id:'playhouse',x:198,y:245,name:'La cabane et son toboggan',icon:'🛝'}, {id:'roundabout',x:100,y:245,name:'Le tourniquet',icon:'🎠'}];
function roadPoint(s,d=0){return {x:road.x+s*road.tx+d*road.nx,y:road.y+s*road.ty+d*road.ny};}
function roadCoords(x,y){const dx=x-road.x,dy=y-road.y;return {s:dx*road.tx+dy*road.ty,d:dx*road.nx+dy*road.ny};}
function onRoad(x,y){return Math.abs(roadCoords(x,y).d)<road.half+10;}
function roadAllowed(x,y){if(!onRoad(x,y))return true;return Math.abs(roadCoords(x,y).s)<road.crossHalf && (traffic.phase==='walk'||onRoad(player.x,player.y));}
function crossingEntities(){return [-1,1].map(side=>({id:'crossing'+side,...roadPoint(0,side*65),task:'crossing',icon:'🚦',name:traffic.phase==='drive'?'Appuyer sur le bouton piéton':traffic.phase==='walk'?'Traverser : '+Math.ceil(traffic.remaining)+' s':'Attendre le feu piéton'}));}
function requestCrossing(){if(traffic.phase!=='drive')return;traffic.phase='waiting';traffic.remaining=3;toast('Demande enregistrée. Attends le feu piéton vert.');}
function updateTraffic(dt){
 traffic.spawn-=dt;
 if(traffic.spawn<=0){traffic.spawn=5+(traffic.serial%3)*2;const direction=traffic.serial++%2?1:-1;traffic.cars.push({s:-direction*900,direction,color:['#7298b0','#d39069','#90a678'][traffic.serial%3]});}
 for(const direction of [-1,1]){let front=null;for(const car of traffic.cars.filter(c=>c.direction===direction).sort((a,b)=>direction*(b.s-a.s))){let next=car.s+direction*90*dt;
  if(traffic.phase!=='drive'&&car.s*direction<=-58)next=direction*Math.min(next*direction,-58);
  if(front)next=direction*Math.min(next*direction,front.s*direction-58);
  car.s=next;front=car;
 }}
 traffic.cars=traffic.cars.filter(c=>Math.abs(c.s)<950);
 if(traffic.phase==='waiting'){traffic.remaining=Math.max(0,traffic.remaining-dt);if(traffic.remaining<.000001&&!traffic.cars.some(c=>Math.abs(c.s)<58)){traffic.phase='walk';traffic.remaining=10;toast('🟢 À toi ! Tu as 10 secondes pour traverser.');}}
 else if(traffic.phase==='walk'){traffic.remaining=Math.max(0,traffic.remaining-dt);if(traffic.remaining===0){traffic.phase='clear';}}
 else if(traffic.phase==='clear'&&!(scene==='outside'&&onRoad(player.x,player.y))){traffic.phase='drive';}
}
function movePlayer(dx,dy){
 for(const [ax,ay]of [[dx,0],[0,dy]]){const x=player.x+ax,y=player.y+ay;if(walkable(x,y)){player.x=x;player.y=y;}else if(scene==='outside'&&!roadAllowed(x,y)&&(ax||ay)){roadWarning=1.2;if(time-(movePlayer.warned||-10)>4){toast('⚠ Traverse uniquement au passage piéton, quand le feu est vert.');movePlayer.warned=time;}}}
}
function drawRoadGround(){const c=ctx;
 // The lane beside the school runs straight along the road, behind a green strip (satellite view).
 // At the top it curves onto the road near the bus stop; at the bottom it meets the Pampres street,
 // which runs straight to the road. The road and the Pampres are drawn over these ends.
 const lanePath=()=>{const a=roadPoint(-516,0),c1=roadPoint(-471,88),b=roadPoint(-426,88);c.moveTo(a.x,a.y);c.quadraticCurveTo(c1.x,c1.y,b.x,b.y);c.lineTo(laneX(933),933);};
 // The paths in front of and behind the school, the courtyard path and the lane on the right share its surface.
 const paths=()=>{c.beginPath();lanePath();c.moveTo(laneX(186)-4,184);c.lineTo(1027,183);for(const [x0,y0,x1,y1]of [[1027,150,1027,880],[751,183,751,667],[laneX(667),667,1370,667]]){c.moveTo(x0,y0);c.lineTo(x1,y1);}};
 // Between the lane and the school (photo): a waste collection point, and above it a fence and wide steps down to the school.
 rr(c,452,300,112,74,6,'#ddd8c7');
 c.lineCap='round';c.lineJoin='round';for(const [width,color]of [[34,'#ddd8c7'],[25,'#c3c6bb']]){c.strokeStyle=color;c.lineWidth=width;paths();c.stroke();}
 rr(c,456,304,104,66,4,'#c3c6bb');
 // Wide steps going down towards the school, behind a green fence.
 for(let k=0;k<6;k++){const x=512+k*14;rr(c,x,228,14,68,0,k%2?'#d9d4c6':'#e6e1d4');c.strokeStyle='#bdb7a6';c.lineWidth=1;c.beginPath();c.moveTo(x,228);c.lineTo(x,296);c.stroke();}
 rr(c,512,294,84,4,0,'#c9c3b2');
 c.strokeStyle='#3f6f50';c.lineWidth=1.6;c.beginPath();c.moveTo(508,224);c.lineTo(508,300);c.moveTo(508,224);c.lineTo(596,224);c.stroke();
 c.lineWidth=2;for(let y=226;y<=300;y+=10){c.beginPath();c.moveTo(508,y);c.lineTo(508,y-10);c.stroke();}for(let x=518;x<=596;x+=12){c.beginPath();c.moveTo(x,224);c.lineTo(x,214);c.stroke();}
 c.lineWidth=1.2;c.beginPath();c.moveTo(508,216);c.lineTo(596,216);c.moveTo(508,216);c.lineTo(508,292);c.stroke();
 // Underground waste containers: dark bodies with blue lids, a large yellow container and a red hydrant.
 rr(c,520,306,34,26,2,'#e2b33c');rr(c,520,300,34,8,2,'#f0c85a');rr(c,527,312,14,8,1,'#a8522f');
 for(let k=0;k<4;k++){const y=338+k*0;const x=468+k*21;rr(c,x+2,y+14,16,4,1,'#9c9a8f55');rr(c,x,y,16,16,2,'#3d4644');rr(c,x,y-4,16,6,2,'#5d86b8');rr(c,x+5,y-6,6,3,1,'#8e9a98');}
 rr(c,470,318,5,12,2,'#c8442f');ellipse(c,472.5,318,3.5,2.5,'#e0614a');
 text(c,'20',548,198,11,'#eef0e6','700');
 const pampres=()=>{c.beginPath();c.moveTo(1385,933);c.lineTo(110,933);};
 c.lineCap='butt';for(const [width,color]of [[48,'#cfcab6'],[38,'#aeb3ae']]){c.strokeStyle=color;c.lineWidth=width;pampres();c.stroke();}
 c.lineCap='round';c.strokeStyle='#b7cf9a';c.lineWidth=13;c.beginPath();for(const [s0,s1]of [[-400,-40],[40,300]]){const g0=roadPoint(s0,57),g1=roadPoint(s1,57);c.moveTo(g0.x,g0.y);c.lineTo(g1.x,g1.y);}c.stroke();
 for(let s=-390;s<300;s+=46){if(Math.abs(s)<45)continue;const p=roadPoint(s,57);ellipse(c,p.x,p.y-3,9,6,'#93b27c');ellipse(c,p.x+3,p.y-6,6,4,'#a9c48e');}
 // Cars park in a row on the road side of the lane, alongside the school (satellite).
 for(let i=0;i<5;i++){const p=roadPoint(-250+i*44,79);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(road.ty,road.tx)-Math.PI/2);c.strokeStyle='#e8e4d2';c.lineWidth=1.2;c.strokeRect(-13,-22,26,44);if(i!==2)parkedCar(-10,-18,['#b18a76','#7898a8','#c0af7d','#8da28b','#c9c9c4'][i]);c.restore();}
 c.save();c.translate(road.x,road.y);c.transform(road.nx,road.ny,road.tx,road.ty,0,0);
 rr(c,-42,-1150,84,2100,0,'#d5d1bd');rr(c,-27,-1150,54,2100,0,'#a4aba8');
 c.setLineDash([18,15]);c.strokeStyle='#eee9d7';c.lineWidth=2;c.beginPath();c.moveTo(0,-1150);c.lineTo(0,950);c.stroke();c.setLineDash([]);
 for(let s=-18;s<=18;s+=9)rr(c,-27,s,54,5,0,'#f3d875');
 c.strokeStyle='#faf3dc';c.lineWidth=3;for(const s of [-35,35]){c.beginPath();c.moveTo(-27,s);c.lineTo(27,s);c.stroke();}
 c.restore();
 const along=Math.atan2(road.ty,road.tx)-Math.PI;const lbl=roadPoint(-150,88);c.save();c.translate(lbl.x,lbl.y+4);c.rotate(along);text(c,'Voie privée',0,0,11,'#687765');c.restore();
 {const p=roadPoint(-250,0);c.save();c.translate(p.x+3,p.y);c.rotate(along);text(c,'Route du Grand-Lancy',0,0,12,'#64726b');c.restore();}
 rr(c,72,170,262,145,35,'#bed39f');text(c,'Le parc',200,185,15,'#567851','600');
}
function drawTraffic(){const c=ctx;
 for(const car of traffic.cars){const p=roadPoint(car.s,car.direction*14);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(road.ty*car.direction,road.tx*car.direction)-Math.PI/2);parkedCar(-10,-19,car.color);c.restore();}
 for(const side of [-1,1]){const p=roadPoint(0,side*65);rr(c,p.x-2,p.y-45,4,46,2,'#64736a');rr(c,p.x-13,p.y-60,26,35,5,'#374a40');ellipse(c,p.x,p.y-49,6,6,traffic.phase==='walk'?'#58624e':'#ec755f');ellipse(c,p.x,p.y-34,6,6,traffic.phase==='walk'?'#83db80':'#58624e');rr(c,p.x+7,p.y-18,14,14,3,'#f0d067');text(c,'●',p.x+14,p.y-7,10,'#4e604e');
 const q=roadPoint(side*43,-side*41);rr(c,q.x-9,q.y-41,18,39,4,'#374a40');ellipse(c,q.x,q.y-32,4,4,traffic.phase==='walk'||traffic.phase==='clear'?'#f27c69':'#58624e');ellipse(c,q.x,q.y-21,4,4,traffic.phase==='waiting'?'#f0c359':'#58624e');ellipse(c,q.x,q.y-10,4,4,traffic.phase==='drive'?'#8bd783':'#58624e');}
 if(traffic.phase!=='drive'){const p=roadPoint(0,112);rr(c,p.x-70,p.y-29,140,42,8,'#fff9e7');text(c,traffic.phase==='walk'?'Piétons : '+Math.ceil(traffic.remaining)+' s':traffic.phase==='clear'?'Fin de traversée':'Attends le vert',p.x,p.y-4,14,'#456345','700');}
}
function drawPark(){const c=ctx;
 for(const g of parkGames){const {x,y}=g;ellipse(c,x,y+6,43,18,'#a0bc80');c.strokeStyle='#9b805f';c.lineWidth=5;
 if(g.id==='swing'){c.beginPath();c.moveTo(x-35,y);c.lineTo(x-23,y-65);c.lineTo(x+23,y-65);c.lineTo(x+35,y);c.stroke();const sway=Math.sin(time*1.7)*9;c.strokeStyle='#6c7b69';c.lineWidth=2;c.beginPath();c.moveTo(x-12,y-64);c.lineTo(x-12+sway,y-16);c.moveTo(x+12,y-64);c.lineTo(x+12+sway,y-16);c.stroke();rr(c,x-16+sway,y-17,32,6,2,'#bd8c67');}
 else if(g.id==='playhouse'){rr(c,x-28,y-55,45,43,4,'#be9d6c');poly(c,[[x-35,y-54],[x-6,y-80],[x+23,y-54]],'#cb8969');rr(c,x-17,y-41,16,29,4,'#745d45');poly(c,[[x+9,y-18],[x+22,y-18],[x+42,y+15],[x+25,y+15]],'#edc864');}
 else{ellipse(c,x,y-3,35,15,'#d0a160');c.strokeStyle='#6c9593';c.lineWidth=4;const a=time*.35;for(let i=0;i<4;i++){const dx=Math.cos(a+i*Math.PI/2)*28,dy=Math.sin(a+i*Math.PI/2)*10;c.beginPath();c.moveTo(x,y-25);c.lineTo(x+dx,y+dy-20);c.lineTo(x+dx,y+dy-3);c.stroke();}}
 text(c,g.id==='swing'?'Balançoire':g.id==='playhouse'?'Cabane & toboggan':'Tourniquet',x,y+38,10,'#56714c');}
}
const parkDurations={swing:12,playhouse:10,roundabout:14};
const parkEase=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function parkMotion(id,seconds){
 const duration=parkDurations[id],t=Math.max(0,Math.min(duration,seconds));
 if(id==='swing'){const envelope=parkEase(t/2)*parkEase((duration-t)/3);return {t,duration,angle:Math.sin(t*2.1)*.58*envelope,pump:Math.cos(t*2.1)*envelope,stage:t<2?'On prend de l’élan…':t<9?'Les jambes accompagnent le mouvement.':'La balançoire ralentit doucement.'};}
 if(id==='roundabout'){const u=t/duration;return {t,duration,angle:Math.PI*6*(u-Math.sin(2*Math.PI*u)/(2*Math.PI)),stage:t<3?'Tiens bien la barre !':t<10?'Un tour avec Sami… puis un autre !':'Le tourniquet ralentit.'};}
 let phase,p;if(t<3){phase='climb';p=t/3;}else if(t<4.3){phase='sit';p=(t-3)/1.3;}else if(t<7){phase='slide';p=(t-4.3)/2.7;}else if(t<8){phase='land';p=t-7;}else{phase='wave';p=(t-8)/2;}
 return {t,duration,phase,p,stage:{climb:'Je monte les barreaux, un à un.',sit:'Je m’assieds en haut du toboggan.',slide:'C’est parti, on glisse !',land:'Les pieds retrouvent le sol.',wave:'Et voilà ! On recommence ?'}[phase]};
}
function parkStroke(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function parkAvatar(c,x,y,a,pose='stand',phase=0,scale=1,facing=1,grips=null){
 c.save();c.translate(x,y);c.scale(scale*facing,scale);
 const skin=a.skin||'#edc19b',hair=a.hair||'#66432f',shirt=a.shirt||'#d77f54',pants=a.pants||'#4c6878',eyes=a.eyes||'#47674e';
 // The origin is the pelvis, so seated poses remain attached to their equipment.
 const seated=['swing','slide','ride'].includes(pose),climbing=pose==='climb',step=Math.sin(phase*Math.PI*2);
 const feet=seated?[[25+phase*5,26],[37+phase*5,21]]:climbing?[[-13,28+step*9],[12,28-step*9]]:[[-9,44],[10,44]];
 const knees=seated?[[14,13],[24,8]]:climbing?[[-16,14+step*8],[16,14-step*8]]:[[-8,21],[9,21]];
 if(pose==='hop'){feet[0]=[-12,44-phase*12];feet[1]=[22,15-phase*8];knees[0]=[-12,22-phase*8];knees[1]=[22,3];}
 if(pose==='hop-double'){feet[0]=[-54+phase*24,44-phase*12];feet[1]=[54-phase*24,44-phase*12];knees[0]=[-28,18-phase*8];knees[1]=[28,18-phase*8];}
 if(pose==='pickup'){c.translate(0,phase*18);c.rotate(phase*.25);feet[0]=[-15,44-phase*18];feet[1]=[20,44-phase*18];knees[0]=[-22,18-phase*8];knees[1]=[23,18-phase*8];}
 if(pose==='mount'){const f=[[25,26],[37,21]],k=[[14,13],[24,8]];for(let i=0;i<2;i++)for(let j=0;j<2;j++){feet[i][j]+=(f[i][j]-feet[i][j])*phase;knees[i][j]+=(k[i][j]-knees[i][j])*phase;}}
 for(let i=0;i<2;i++){parkStroke(c,[[i?8:-8,-2],knees[i],feet[i]],pants,10);parkStroke(c,[[feet[i][0]-3,feet[i][1]],[feet[i][0]+9,feet[i][1]]],'#fff6df',7);parkStroke(c,[[feet[i][0]-3,feet[i][1]+4],[feet[i][0]+9,feet[i][1]+4]],'#57665c',2);}
 if(a.hairstyle==='long')rr(c,-20,-84,40,56,13,hair);
 rr(c,-18,-44,36,46,11,shirt);poly(c,[[-15,-3],[16,-3],[12,4],[-12,4]],shirt);parkStroke(c,[[-9,-41],[0,-36],[9,-41]],'#ffffff70',2);
 let hands=pose==='swing'?[[-26,-56],[26,-56]]:pose==='ride'?(grips||[[-28,-29],[29,-29]]):pose==='slide'?[[6,-16],[33,-13]]:climbing?[[-23,-52-step*10],[22,-52+step*10]]:[[-23,-8],[23,-8]];
 if(pose==='wave')hands[1]=[29+Math.sin(phase*15)*6,-68];
 if(pose==='hop'||pose==='hop-double')hands=[[-38,-19-phase*20],[38,-19-phase*20]];
 if(pose==='pickup')hands=[[-29,-14],[25,phase*42-8]];
 if(pose==='throw')hands=[[-26,-16],[28+phase*12,-18-phase*55]];
 for(let i=0;i<2;i++){const shoulder=[i?16:-16,-34],hand=hands[i];parkStroke(c,[shoulder,[(shoulder[0]+hand[0])*.5+(i?5:-5),(shoulder[1]+hand[1])*.5+8],hand],skin,7);ellipse(c,hand[0],hand[1],4,4,skin);}
 rr(c,-5,-52,10,12,3,skin);ellipse(c,0,-68,19,21,skin);ellipse(c,-19,-65,3.5,6,skin);ellipse(c,19,-65,3.5,6,skin);
 c.save();c.translate(0,-69);c.rotate(seated?-.05:climbing?.1:0);
 poly(c,[[-19,-3],[-18,-17],[-10,-24],[5,-25],[17,-18],[20,-3],[12,-10],[2,-8],[-8,-13],[-15,-5]],hair);
 if(a.hairstyle==='long'){rr(c,-20,-10,6,29,3,hair);rr(c,14,-12,6,30,3,hair);}
 if(a.hairstyle==='curls')for(let i=0;i<6;i++)ellipse(c,-16+i*6,-16-Math.sin(i*.65)*6,6,6,hair);
 for(const sx of [-7,7]){ellipse(c,sx,3,3,4,'#fff8ed');ellipse(c,sx+.6,3.5,2,2.9,eyes);ellipse(c,sx+1,2.5,.7,.9,'white');}
 ellipse(c,-11,10,4,2.5,'#d989772e');ellipse(c,11,10,4,2.5,'#d989772e');parkStroke(c,[[-4,12],[0,14],[5,11]],'#995f49',1.6);c.restore();c.restore();
}
function parkBackdrop(c,t){
 const sky=c.createLinearGradient(0,0,0,420);sky.addColorStop(0,'#dceee9');sky.addColorStop(1,'#f7edcf');c.fillStyle=sky;c.fillRect(0,0,760,420);
 ellipse(c,646,65,32,32,'#fff3bd');ellipse(c,646,65,44,44,'#fff3bd33');
 for(const [x,y,s]of [[115,62,1],[475,43,.7]]){c.save();c.translate(x+Math.sin(t*.15)*3,y);c.scale(s,s);for(const [dx,dy,r]of [[-28,0,20],[0,-10,28],[30,2,19]])ellipse(c,dx,dy,r,r*.65,'#ffffff9c');c.restore();}
 poly(c,[[0,232],[130,180],[245,226],[375,188],[545,220],[760,180],[760,420],[0,420]],'#b3caa0');
 for(const [x,y,s]of [[43,263,1],[703,259,1.15],[125,225,.65],[590,222,.7]]){parkStroke(c,[[x,y],[x-4,y-92*s]],'#ad9b76',9*s);ellipse(c,x-14*s,y-87*s,31*s,39*s,'#9cba8b');ellipse(c,x+14*s,y-115*s,35*s,41*s,'#b0ca94');ellipse(c,x-9*s,y-133*s,28*s,31*s,'#c2d5a1');}
 poly(c,[[0,289],[180,257],[390,278],[570,261],[760,282],[760,420],[0,420]],'#d2dfb3');
 c.strokeStyle='#a6be8a';c.lineWidth=2;for(let i=0;i<26;i++){const x=18+(i*107)%730,y=308+(i*43)%100;parkStroke(c,[[x-3,y],[x,y-7],[x+3,y]],'#a6be8a',1.5);}
 for(const [x,y]of [[67,348],[685,368],[570,393]]){parkStroke(c,[[x,y],[x,y-11]],'#8aa574',2);ellipse(c,x,y-12,4,4,'#e5be7d');}
}
function parkSwing(c,m){
 const pivot={x:380,y:80},length=225,angle=m.angle;
 ellipse(c,380,329,170,37,'#c3cb9f');ellipse(c,380,331,149,28,'#e8d9b8');
 // Rear feet, upper beam, then the moving chains and occupied seat.
 parkStroke(c,[[255,329],[300,82],[440,82],[483,329]],'#a99c7c',11);
 parkStroke(c,[[290,85],[470,85]],'#907c5b',14);parkStroke(c,[[291,80],[468,80]],'#c9b48c',5);
 const seatX=pivot.x-Math.sin(angle)*length,seatY=pivot.y+Math.cos(angle)*length;
 ellipse(c,seatX+9,338,43+Math.abs(angle)*15,9-Math.abs(angle)*4,'#57774a25');
 for(const x of [-27,27]){const top={x:pivot.x+x,y:pivot.y},bottom={x:pivot.x+x*Math.cos(angle)-length*Math.sin(angle),y:pivot.y+x*Math.sin(angle)+length*Math.cos(angle)};parkStroke(c,[[top.x,top.y],[bottom.x,bottom.y]],'#708782',2.8);for(let u=.03;u<1;u+=.055)ellipse(c,top.x+(bottom.x-top.x)*u,top.y+(bottom.y-top.y)*u,1.3,2.5,'#dfe5d4');}
 c.save();c.translate(pivot.x,pivot.y);c.rotate(angle);
 rr(c,-36,length-1,72,10,4,'#986d4d');rr(c,-36,length-3,72,5,3,'#d4aa75');
 parkAvatar(c,0,length-5,profile,'swing',m.pump,1,1);c.restore();
 parkStroke(c,[[240,342],[300,82]],'#b5966c',12);parkStroke(c,[[500,342],[440,82]],'#b5966c',12);
 for(const x of [300,440])ellipse(c,x,83,4,4,'#e7d6ab');
}
function slidePoint(u){const a=1-u;return {x:a*a*a*350+3*a*a*u*410+3*a*u*u*485+u*u*u*625,y:a*a*a*210+3*a*a*u*220+3*a*u*u*345+u*u*u*337};}
function parkSlide(c,m){
 ellipse(c,393,354,262,34,'#d8ceab');
 // Far supports and a real ladder with equally spaced rungs.
 parkStroke(c,[[265,338],[265,197]],'#b49b70',12);parkStroke(c,[[351,338],[351,198]],'#b49b70',12);
 for(const off of [-18,18])parkStroke(c,[[168+off,348],[270+off,204]],'#8e9d83',8);
 for(let i=0;i<8;i++){const u=i/7,x=168+u*102,y=348-u*144;parkStroke(c,[[x-18,y],[x+18,y]],'#d4b383',6);}
 rr(c,260,158,94,51,4,'#be9b6c');for(let x=266;x<350;x+=14)parkStroke(c,[[x,160],[x,205]],'#d4b383',2);
 rr(c,291,157,41,50,3,'#7d795c');rr(c,343,199,25,14,3,'#bc9868');
 // Slide surface is a continuous curve with a flattened landing.
 const track=(offset,color,width)=>{c.beginPath();c.moveTo(350,210+offset);c.bezierCurveTo(410,220+offset,485,345+offset,625,337+offset);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();};
 track(7,'#bc9560',27);track(0,'#efc868',25);track(-7,'#fff0a7',3);
 let pos,pose='stand',phase=m.p,scale=.83,rotation=0;
 if(m.phase==='climb'){const p=m.p;pos={x:168+102*p,y:348-144*p-36};pose='climb';phase=p*5;}
 else if(m.phase==='sit'){const p=parkEase(m.p);pos={x:270+80*p,y:168+38*p};pose='mount';phase=p;}
 else if(m.phase==='slide'){const p=parkEase(m.p);pos=slidePoint(p);pose='slide';const ahead=slidePoint(Math.min(1,p+.01)),behind=slidePoint(Math.max(0,p-.01));rotation=Math.atan2(ahead.y-behind.y,ahead.x-behind.x)*.52;}
 else if(m.phase==='land'){const p=parkEase(m.p);pos={x:625+40*p,y:337-21*p};pose='mount';phase=1-p;}
 else{pos={x:665,y:316};pose='wave';}
 ellipse(c,pos.x+9,359,25,7,'#58734b20');c.save();c.translate(pos.x,pos.y);c.rotate(rotation);parkAvatar(c,0,0,profile,pose,phase,scale);c.restore();
 // Front lip and hut roof hide only the parts that are physically behind them.
 track(10,'#d3a146',4);poly(c,[[245,159],[307,113],[370,159]],'#bd8060');poly(c,[[250,154],[307,114],[312,122],[263,158]],'#d9a277');parkStroke(c,[[244,159],[307,112],[371,159]],'#a56d52',4);
 parkStroke(c,[[349,173],[349,198]],'#7d9c8d',5);parkStroke(c,[[365,175],[365,200]],'#7d9c8d',5);parkStroke(c,[[349,173],[365,175]],'#7d9c8d',5);
}
function parkCarousel(c,m){
 const cx=380,cy=310,rx=154,ry=50,angle=m.angle;
 const project=(a,r=1,z=0)=>({x:cx+Math.cos(a)*rx*r,y:cy+Math.sin(a)*ry*r-z});
 ellipse(c,cx+8,cy+17,175,57,'#6b875829');rr(c,cx-13,cy,26,24,6,'#818d75');ellipse(c,cx,cy+5,rx,ry,'#b38d58');
 for(let i=0;i<8;i++){const a=angle+i*Math.PI/4,points=[[cx,cy]];for(let j=0;j<=10;j++){const p=project(a+j/10*Math.PI/4);points.push([p.x,p.y]);}poly(c,points,['#d7b175','#8fae9c','#edcc8c','#8ca6b4'][i%4]);}
 c.strokeStyle='#f4dfb5';c.lineWidth=3;c.beginPath();c.ellipse(cx,cy,rx-7,ry-3,0,0,Math.PI*2);c.stroke();
 const railSegment=(a,b)=>{const pts=[];for(let j=0;j<=12;j++){const p=project(a+(b-a)*j/12,.84,61);pts.push([p.x,p.y]);}parkStroke(c,pts,'#5e8f8b',5);};
 // Render the rear rail first; foreground rails pass in front of riders.
 railSegment(Math.PI,Math.PI*2);
 const actors=[{a:angle+Math.PI*.3,person:profile},{a:angle+Math.PI*1.3,person:outside.find(n=>n.id==='sami')}].sort((a,b)=>Math.sin(a.a)-Math.sin(b.a));
 const posts=[];for(let i=0;i<4;i++){const a=angle+i*Math.PI/2,p=project(a,.84),top=project(a,.84,61);posts.push({depth:Math.sin(a),draw:()=>parkStroke(c,[[p.x,p.y],[top.x,top.y]],'#608d86',5)});}
 const objects=[...posts,...actors.map(actor=>({depth:Math.sin(actor.a),draw:()=>{const p=project(actor.a,.63,8),scale=.72+.12*(Math.sin(actor.a)+1),facing=Math.cos(actor.a)>0?-1:1;
 const handA=project(actor.a-.16,.84,61),handB=project(actor.a+.16,.84,61);const grips=[handA,handB].map(q=>[(q.x-p.x)/(scale*facing),(q.y-p.y)/scale]);
 ellipse(c,p.x,p.y+7,23*scale,7*scale,'#506b5122');parkAvatar(c,p.x,p.y,actor.person,'ride',0,scale,facing,grips);}}))].sort((a,b)=>a.depth-b.depth);
 objects.forEach(o=>o.draw());railSegment(0,Math.PI);ellipse(c,cx,cy-2,17,7,'#e7d2a1');
}
function drawParkAnimation(c,id,seconds,control=null){const m=parkMotion(id,seconds);if(control){m.t=seconds;m.angle=control.angle;m.pump=control.id==='swing'?Math.max(-1,Math.min(1,control.velocity/1.4)):0;}c.save();c.clearRect(0,0,760,420);parkBackdrop(c,m.t);if(id==='swing')parkSwing(c,m);else if(id==='playhouse')parkSlide(c,m);else parkCarousel(c,m);c.restore();return m;}
// Inputs add or remove energy; the scene keeps its position and momentum.
const parkLimits={swingAngle:1.35,carouselSpeed:12};
function createParkControl(id){return {id,angle:0,velocity:0,effort:0};}
function parkImpulse(control,action){
 if(action==='brake')control.velocity*=.62;
 else if(control.id==='swing'){const energy=4.4*(1-Math.cos(control.angle))+.5*control.velocity**2,limit=4.4*(1-Math.cos(parkLimits.swingAngle));if(energy<limit)control.velocity=(Math.sign(control.velocity)||1)*Math.min(Math.abs(control.velocity)+.38,Math.sqrt(Math.max(0,2*(limit-4.4*(1-Math.cos(control.angle))))));}
 else control.velocity=Math.min(parkLimits.carouselSpeed,control.velocity+1.2);
}
function advanceParkControl(control,dt,action=null){
 dt=Math.max(0,Math.min(dt,.06));const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
 for(let i=0;i<steps;i++){
  if(control.id==='swing'){
   const energy=4.4*(1-Math.cos(control.angle))+.5*control.velocity**2,limit=4.4*(1-Math.cos(parkLimits.swingAngle));
   const push=action==='boost'?(Math.sign(control.velocity)||1)*3.8*Math.max(0,1-energy/limit):0;
   control.velocity+=(-4.4*Math.sin(control.angle)-(action==='brake'?3.5:.17)*control.velocity+push)*h;
   control.angle+=control.velocity*h;
   if(action!=='boost'&&Math.abs(control.angle)<.001&&Math.abs(control.velocity)<.004){control.angle=0;control.velocity=0;}
  }else{control.velocity=Math.max(0,Math.min(parkLimits.carouselSpeed,control.velocity+((action==='boost'?3:0)-(action==='brake'?2.2:.12)*control.velocity-.025)*h));control.angle=(control.angle+control.velocity*h)%(Math.PI*2);}
 }
 const energy=4.4*(1-Math.cos(control.angle))+.5*control.velocity**2;
 control.effort=control.id==='swing'?Math.min(1,Math.acos(Math.max(-1,Math.min(1,1-energy/4.4)))/parkLimits.swingAngle):control.velocity/parkLimits.carouselSpeed;
}
function parkActivity(id){
 const game=parkGames.find(g=>g.id===id);if(!game)return;
 const interactive=id!=='playhouse',held=new Set();let frame=0,lastFrame=null,closed=false;
 const activity={kind:'park',id,elapsed:0,playing:false,finished:false,control:interactive?createParkControl(id):null};activeActivity=activity;
 const release=()=>held.clear();
 modal(activityHeader(esc(game.name),'Une pause au parc')+`<div class="park-cinema"><canvas id="parkCanvas" width="760" height="420" role="img" aria-label="${esc(game.name)} avec ton personnage animé"></canvas><span class="park-scene-badge">${id==='roundabout'?'Avec Sami':'À toi de jouer'}</span></div><p id="parkFeedback" class="park-caption" aria-live="polite">${interactive?(id==='swing'?'Prends de l’élan pour monter plus haut. Freine pour redescendre doucement.':'Pousse pour accélérer le plateau. Freine pour ralentir.'):'Monte dans la cabane, assieds-toi puis laisse-toi glisser.'}</p>${interactive?`<div class="park-drive"><button id="parkBoost" class="primary">↑ ${id==='swing'?'Prendre de l’élan':'Pousser plus fort'}</button><button id="parkBrake" class="secondary">↓ Freiner</button></div><p class="park-input-hint">Clique ou maintiens les boutons · touches ↑ et ↓.<br>Sans pousser, le mouvement ralentit tout seul.</p><div class="park-meter-label"><span>${id==='swing'?'Élan / hauteur':'Vitesse'}</span><output id="parkLevel">0 %</output></div>`:''}<progress id="parkProgress" max="${interactive?100:parkDurations[id]}" value="0" aria-label="${interactive?(id==='swing'?'Élan de la balançoire':'Vitesse du tourniquet'):'Progression de l’animation'}"></progress><div class="park-controls"><button id="parkPlay" class="primary">${interactive?'Commencer':'Monter et glisser'}</button><button id="parkReplay" class="secondary">Recommencer</button><button id="activityClose" class="secondary">Retour au parc</button></div>`,()=>{closed=true;activity.playing=false;release();cancelAnimationFrame(frame);$('#modal').onkeydown=null;$('#modal').onkeyup=null;window.removeEventListener?.('blur',release);});
 window.addEventListener('blur',release);
 const c=$('#parkCanvas').getContext('2d');let currentStage='';
 const paint=()=>{const m=drawParkAnimation(c,id,activity.elapsed,activity.control);$('#parkProgress').value=interactive?Math.round(activity.control.effort*100):activity.elapsed;if(interactive)$('#parkLevel').textContent=Math.round(activity.control.effort*100)+' %';else if(activity.playing&&m.stage!==currentStage){$('#parkFeedback').textContent=m.stage;currentStage=m.stage;}};
 const start=()=>{activity.playing=true;activity.finished=false;lastFrame=null;$('#parkPlay').textContent='Pause';};
 const act=action=>{if(!activity.playing)start();parkImpulse(activity.control,action);advanceParkControl(activity.control,0);$('#parkFeedback').textContent=action==='boost'?(id==='swing'?'Tu pousses avec les jambes : tu prends de la hauteur !':'Tu pousses le plateau : le tourniquet accélère !'):'Tu freines : le mouvement ralentit progressivement.';paint();};
 if(interactive){for(const [selector,action]of [['#parkBoost','boost'],['#parkBrake','brake']]){const b=$(selector);b.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);held.add(action);act(action);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>held.delete(action);b.onclick=e=>{if(!e||e.detail===0)act(action);};}
  $('#modal').onkeydown=e=>{const action=e.key==='ArrowUp'?'boost':e.key==='ArrowDown'?'brake':null;if(!action)return;e.preventDefault();if(!e.repeat){held.add(action);act(action);}};
  $('#modal').onkeyup=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();held.delete(e.key==='ArrowUp'?'boost':'brake');}};
 }
 const animate=now=>{if(closed)return;if(document.hidden){release();lastFrame=null;frame=requestAnimationFrame(animate);return;}if(activity.playing){const dt=lastFrame===null?0:Math.min((now-lastFrame)/1000,.06);activity.elapsed+=dt;
  if(interactive)advanceParkControl(activity.control,dt,held.has('brake')?'brake':held.has('boost')?'boost':null);
  else if(activity.elapsed>=parkDurations[id]){activity.elapsed=parkDurations[id];activity.playing=false;activity.finished=true;$('#parkFeedback').textContent='Un beau tour ! Tu peux recommencer quand tu veux.';$('#parkPlay').textContent='Encore un tour';}paint();}lastFrame=now;frame=requestAnimationFrame(animate);};
 $('#parkPlay').onclick=()=>{release();if(activity.finished){activity.elapsed=0;activity.finished=false;}activity.playing=!activity.playing;lastFrame=null;$('#parkPlay').textContent=activity.playing?'Pause':'Reprendre';if(interactive&&activity.playing&&activity.control.effort===0)parkImpulse(activity.control,'boost');paint();};
 $('#parkReplay').onclick=()=>{release();activity.elapsed=0;if(interactive){activity.control=createParkControl(id);parkImpulse(activity.control,'boost');}start();paint();};
 bindActivityClose();paint();frame=requestAnimationFrame(animate);
}


const decorColors=['#8eaa88','#8bafc2','#c997ab','#d5b66f','#c28f6c','#b29ac8'];
const decorTypes={bed:['Lit','🛏️'],desk:['Bureau','✏️'],shelf:['Bibliothèque','📚'],wardrobe:['Armoire','👕'],toybox:['Coffre à jouets','🧺'],teddy:['Peluche','🧸'],ball:['Ballon','⚽'],rug:['Tapis','🟠'],plant:['Plante','🪴']};
function cleanRoom(data){const fallback=[{type:'bed',slot:5,color:decorColors[1]},{type:'desk',slot:17,color:decorColors[4]},{type:'wardrobe',slot:0,color:decorColors[2]},{type:'shelf',slot:6,color:decorColors[0]},{type:'toybox',slot:20,color:decorColors[3]},{type:'teddy',slot:11,color:decorColors[4]},{type:'rug',slot:14,color:decorColors[2]}];const used=new Set();return {wall:decorColors.includes(data?.wall)?data.wall:decorColors[0],items:(Array.isArray(data?.items)?data.items:fallback).filter(i=>i&&Object.hasOwn(decorTypes,i.type)&&Number.isInteger(i.slot)&&i.slot>=0&&i.slot<24&&!used.has(i.slot)&&used.add(i.slot)).map(i=>({type:i.type,slot:i.slot,color:decorColors.includes(i.color)?i.color:decorColors[0]}))};}
let roomDecor=cleanRoom(saved.room),petCare={food:!!saved.pet?.food,water:!!saved.pet?.water};
let selectedDecor=0;
function decorPosition(slot){return {x:365+(slot%6)*130,y:335+Math.floor(slot/6)*125,w:88,h:70};}
function roomObstacles(){return roomDecor.items.filter(i=>!['rug','ball','teddy'].includes(i.type)).map(i=>decorPosition(i.slot));}
function editRoom(){selectedDecor=Math.min(selectedDecor,Math.max(0,roomDecor.items.length-1));const item=roomDecor.items[selectedDecor];
 modal(activityHeader('Imagine ta chambre','Chez toi · décoration')+`<p class="modal-description">Choisis un meuble ou un jouet, puis touche une case libre pour le déplacer. Les espaces entre les cases restent libres pour circuler.</p><div class="decor-grid">${Array.from({length:24},(_,slot)=>{const i=roomDecor.items.findIndex(i=>i.slot===slot),obj=roomDecor.items[i];return `<button data-slot="${slot}" class="${i===selectedDecor&&obj?'selected':''}" aria-label="Case ${slot+1}${obj?', '+decorTypes[obj.type][0]:', libre'}" style="background:${obj?obj.color:'#f0ead8'}">${obj?decorTypes[obj.type][1]:'＋'}</button>`;}).join('')}</div><p id="decorFeedback" role="status" class="modal-description">${item?'Sélection : '+decorTypes[item.type][0]:'Ajoute un objet ci-dessous.'}</p><div class="decor-options">${Object.entries(decorTypes).map(([type,[label,icon]])=>`<button data-add="${type}">${icon} ${label}</button>`).join('')}</div><p>Couleur de l’objet sélectionné</p><div class="decor-options">${decorColors.map(color=>`<button data-decor-color="${color}" style="background:${color}" aria-label="Couleur ${color}">●</button>`).join('')}</div><p>Couleur du mur</p><div class="decor-options">${decorColors.map(color=>`<button data-wall="${color}" style="background:${color}" aria-label="Mur ${color}">▰</button>`).join('')}</div><div class="actions"><button id="removeDecor" class="secondary" ${item?'':'disabled'}>Retirer cet objet</button><button id="activityClose" class="primary">Enregistrer et voir ma chambre</button></div>`);
 document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{const slot=Number(b.dataset.slot),index=roomDecor.items.findIndex(i=>i.slot===slot);if(index>=0)selectedDecor=index;else if(item){item.slot=slot;save();}editRoom();});
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const slot=Array.from({length:24},(_,i)=>i).find(i=>!roomDecor.items.some(o=>o.slot===i));if(slot===undefined){$('#decorFeedback').textContent='Toutes les cases sont occupées. Retire un objet pour en ajouter un autre.';return;}roomDecor.items.push({type:b.dataset.add,slot,color:decorColors[0]});selectedDecor=roomDecor.items.length-1;save();editRoom();});
 document.querySelectorAll('[data-decor-color]').forEach(b=>b.onclick=()=>{if(item){item.color=b.dataset.decorColor;save();editRoom();}});
 document.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{roomDecor.wall=b.dataset.wall;save();editRoom();});
 $('#removeDecor').onclick=()=>{if(item){roomDecor.items.splice(selectedDecor,1);save();editRoom();}};$('#activityClose').onclick=()=>{save();if(!walkable(player.x,player.y))player={x:750,y:915};closeModal();};
}
function drawHomeRoom(){const c=ctx;rr(c,305,290,890,32,3,roomDecor.wall);text(c,'TA CHAMBRE · À TON IMAGE',750,317,17,'#fff9e9','700');
 for(const item of [...roomDecor.items].sort((a,b)=>(a.type==='rug'?-1:0)-(b.type==='rug'?-1:0))){const {x,y,w,h}=decorPosition(item.slot);if(['teddy','ball','plant'].includes(item.type)){ellipse(c,x+44,y+45,29,15,item.color);if(item.type==='teddy'){ellipse(c,x+44,y+38,16,20,item.color);ellipse(c,x+30,y+12,7,7,item.color);ellipse(c,x+58,y+12,7,7,item.color);ellipse(c,x+44,y+23,19,16,item.color);ellipse(c,x+37,y+21,2,2,'#493c32');ellipse(c,x+51,y+21,2,2,'#493c32');ellipse(c,x+44,y+28,5,3,'#e7cba3');}else if(item.type==='ball'){ellipse(c,x+44,y+28,21,21,'#f8f1da');poly(c,[[x+44,y+18],[x+53,y+25],[x+49,y+36],[x+38,y+36],[x+35,y+25]],item.color);}else{rr(c,x+31,y+30,26,24,4,item.color);ellipse(c,x+39,y+17,9,19,'#739965');ellipse(c,x+52,y+13,9,19,'#91b17b');}continue;}if(item.type==='rug'){ellipse(c,x+44,y+35,44,30,item.color);ellipse(c,x+44,y+35,33,21,'#f3e5c477');continue;}
 rr(c,x+4,y+5,w,h,5,'#61764d22');rr(c,x,y-10,w,h,5,item.color);
 if(item.type==='bed'){rr(c,x+7,y-4,w-14,20,6,'#fff8e4');rr(c,x+4,y+22,w-8,33,3,item.color);c.strokeStyle='#fff4d9';c.strokeRect(x+6,y+24,w-12,29);}
 else if(item.type==='desk'){rr(c,x+12,y+1,37,25,2,'#f7edcf');rr(c,x+57,y+5,10,16,1,'#6d8e65');}
 else if(item.type==='shelf'){for(let k=0;k<6;k++)rr(c,x+7+k*12,y+4,9,34,1,decorColors[k]);}
 else if(item.type==='wardrobe'){c.strokeStyle='#f4e5ce';c.beginPath();c.moveTo(x+44,y-6);c.lineTo(x+44,y+53);c.stroke();ellipse(c,x+36,y+23,3,3,'#f5dc9f');ellipse(c,x+52,y+23,3,3,'#f5dc9f');}
 else{rr(c,x+17,y+4,24,20,3,'#ead3a0');ellipse(c,x+59,y+15,12,12,'#91b3c1');c.strokeStyle='#f7e5c4';c.lineWidth=3;c.beginPath();c.moveTo(x+4,y+35);c.lineTo(x+w-4,y+35);c.stroke();}
 }
 for(const [x,filled,color]of [[475,petCare.food,'#b28b62'],[560,petCare.water,'#8bbbd1']]){ellipse(c,x,865,25,12,'#b7bca6');ellipse(c,x,862,20,9,filled?color:'#ece2c9');}catDraw({x:520,y:845});text(c,'Moustache',520,809,13,'#637c58');
}
function careForCat(action){if(action==='food'||action==='water'){petCare[action]=true;save();}modal(activityHeader('Moustache, ton chat','Chez toi')+`<div class="pet-scene"><svg viewBox="0 0 360 140" role="img" aria-label="Moustache près de ses gamelles"><g class="pet-cat ${action?'pet-eating':''}" transform="translate(170 90) scale(2)">${catSVG()}</g><ellipse cx="260" cy="115" rx="26" ry="12" fill="${petCare.food?'#b28b62':'#e1d7bd'}"/><ellipse cx="320" cy="115" rx="26" ry="12" fill="${petCare.water?'#8bbbd1':'#e1d7bd'}"/></svg></div><p class="modal-description" role="status">${action==='food'?'Moustache grignote ses croquettes. Ronron !':action==='water'?'Tu remplis sa gamelle d’eau fraîche. Moustache vient boire.':'Moustache vient te saluer. Occupe-toi de ses deux gamelles.'}</p><p>🍽 ${petCare.food?'Croquettes servies':'Gamelle vide'} · 💧 ${petCare.water?'Eau fraîche servie':'Gamelle vide'}</p><div class="actions"><button id="petFood" class="primary">Donner à manger</button><button id="petWater" class="secondary">Donner à boire</button></div>`+activityReturn());$('#petFood').onclick=()=>careForCat('food');$('#petWater').onclick=()=>careForCat('water');bindActivityClose();}
const MIN_ZOOM=1,MAX_ZOOM=2.5;
// On a phone the whole map is too small to read: start closer, following the player.
function defaultZoom(){if(!touchUI)return 1;const r=canvas.getBoundingClientRect();return r.height>r.width?2:1.6;}
function setZoom(value){zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,value));$('#zoomOut').disabled=zoom===MIN_ZOOM;$('#zoomIn').disabled=zoom===MAX_ZOOM;$('#zoomOut').title=zoom===MIN_ZOOM?'Vue globale':'Éloigner la vue';$('#zoomIn').title=zoom===MAX_ZOOM?'Vue la plus proche':'Rapprocher la vue';}

if(touchUI)document.body.classList.add('touch');
setZoom(defaultZoom());
updateUI();requestAnimationFrame(tick);if(!created)profileEditor(true);
})();
