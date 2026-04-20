// ════════════════════════════════════
// FIREBASE CONFIG & INIT
// ════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDmk-e8S2MGIU8dmwmRUe4QUICJmi1yBVc",
  authDomain: "nexus-event-platform-34144.firebaseapp.com",
  databaseURL: "https://nexus-event-platform-34144-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nexus-event-platform-34144",
  storageBucket: "nexus-event-platform-34144.firebasestorage.app",
  messagingSenderId: "344946568682",
  appId: "1:344946568682:web:0a892de9419665b8361693"
};
firebase.initializeApp(firebaseConfig);
const FBDB = firebase.database();

// Sync from Firebase to localStorage on page load
function syncFromFirebase(callback){
  const el = document.getElementById('fb-sync-loader');
  if(el) el.style.display='flex';
  FBDB.ref('nexus').once('value').then(snap=>{
    const data = snap.val();
    const keys = ['events','tickets','extevents','extRegsDB','notifs','feedback','refunds','dynUsers'];
    if(data){
      keys.forEach(k=>{
        if(data[k] != null){
          localStorage.setItem('nx_'+k, JSON.stringify(data[k]));
        } else {
          // Key not in Firebase — clear local too (deleted data)
          localStorage.removeItem('nx_'+k);
        }
      });
    } else {
      // Firebase bilkul khali — badhu clear karo
      keys.forEach(k => localStorage.removeItem('nx_'+k));
    }
    // Load event image URLs from Firebase (ImgBB URLs)
    FBDB.ref('nexus_images').once('value').then(imgSnap=>{
      const imgs = imgSnap.val();
      if(imgs){
        Object.keys(imgs).forEach(evId=>{
          if(imgs[evId]) localStorage.setItem('ev_img_'+evId, imgs[evId]);
          else localStorage.removeItem('ev_img_'+evId);
        });
      }
    }).catch(()=>{});
    if(el) el.style.display='none';
    if(callback) callback();
    autoSetEventStatuses();
  }).catch(()=>{ if(el) el.style.display='none'; if(callback) callback(); });
}

// Real-time listener — syncs all data + refreshes analytics dashboard live
function startRealtimeSync(){
  ['events','tickets','extevents','extRegsDB','notifs','feedback','refunds','dynUsers'].forEach(k=>{
    FBDB.ref('nexus/'+k).on('value', snap=>{
      const val = snap.val();
      if(val != null){
        localStorage.setItem('nx_'+k, JSON.stringify(val));
      } else {
        localStorage.removeItem('nx_'+k);
      }
      // If analytics tab is open, refresh it live
      if(k==='tickets'||k==='events'||k==='feedback'){
        const aMain=document.getElementById('a-main');
        if(aMain&&(aMain.querySelector('#donut-canvas')||aMain.querySelector('[data-ana]'))){
          renderAdminAnalytics();
        }
        // Also refresh home stats if on home page
        const hPage=document.getElementById('p-home');
        if(hPage&&hPage.style.display!=='none'){
          const tksNow=DB.g('tickets')||[];
          const evsNow=DB.g('events')||[];
          const hsTk=document.getElementById('hs-tk');
          const hsEv=document.getElementById('hs-ev');
          if(hsTk)hsTk.textContent=tksNow.length;
          if(hsEv)hsEv.textContent=evsNow.length;
        }
      }
    });
  });
  // Real-time image sync
  FBDB.ref('nexus_images').on('value', snap=>{
    const imgs = snap.val();
    if(imgs){
      Object.keys(imgs).forEach(evId=>{
        if(imgs[evId]) localStorage.setItem('ev_img_'+evId, imgs[evId]);
        else localStorage.removeItem('ev_img_'+evId);
      });
    }
  });
}

// Live clock for analytics header
let _analyticsLiveInterval=null;
function startAnalyticsLiveClock(){
  const el=document.getElementById('analytics-live-time');
  if(!el)return;
  if(_analyticsLiveInterval)clearInterval(_analyticsLiveInterval);
  _analyticsLiveInterval=setInterval(()=>{
    const now=new Date();
    if(el)el.textContent=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  },1000);
}


// ════════════════════════════════════
// HARDCODED USER DATABASE
// ════════════════════════════════════
// ➕ STUDENTS: Add new students below in this format:
// { id:'COLLEGE_ID', pw:'PASSWORD', fn:'First Name', ln:'Last Name', role:'student', ... }
//
// ➕ ADMINS: Add new admins below in this format:
// { id:'ADMIN_ID', pw:'PASSWORD', fn:'First Name', ln:'Last Name', role:'admin', ... }

const USERS_DB = [
  // ── STUDENTS ──────────────────────────────────────────────
  { id:'vraj241131',  pw:'241131',  fn:'Vraj',  ln:'Patel',  role:'student', dept:'Computer Science', yr:'2nd Year', em:'vraj@college.edu',  mob:'9800000001' },
  { id:'kunj241097',  pw:'241097',  fn:'Kunj',  ln:'Shah',   role:'student', dept:'Electronics',       yr:'2nd Year', em:'kunj@college.edu',  mob:'9800000002' },

  // ── ADMINS ────────────────────────────────────────────────
  { id:'vraj9013',    pw:'9013',    fn:'Vraj',  ln:'Admin',  role:'admin',   dept:'Administration',    yr:'—',        em:'admin@nexus.edu',   mob:'9999999999' },
];
// ════════════════════════════════════

// QR Code Generator (no CDN)
function drawQR(canvas, text, callback){
  const size = canvas.width;
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:'+size+'px;height:'+size+'px;visibility:hidden';
  document.body.appendChild(div);
  try{
    const qr = new QRCode(div, {
      text: text,
      width: size,
      height: size,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    // Wait for QRCode to render (it creates canvas + img)
    function tryDraw(attempt){
      const qCanvas = div.querySelector('canvas');
      const qImg = div.querySelector('img');
      if(qCanvas && qCanvas.width > 0){
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,size,size);
        ctx.drawImage(qCanvas, 0, 0, size, size);
        if(document.body.contains(div)) document.body.removeChild(div);
        if(callback) callback();
      } else if(qImg){
        if(qImg.complete && qImg.naturalWidth > 0){
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0,0,size,size);
          ctx.drawImage(qImg, 0, 0, size, size);
          if(document.body.contains(div)) document.body.removeChild(div);
          if(callback) callback();
        } else {
          qImg.onload = ()=>{
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0,0,size,size);
            ctx.drawImage(qImg, 0, 0, size, size);
            if(document.body.contains(div)) document.body.removeChild(div);
            if(callback) callback();
          };
        }
      } else if(attempt < 40){
        setTimeout(()=>tryDraw(attempt+1), 80);
      } else {
        if(document.body.contains(div)) document.body.removeChild(div);
      }
    }
    setTimeout(()=>tryDraw(0), 80);
  } catch(e){
    console.warn('QR error:',e);
    // Fallback: draw text QR placeholder
    const ctx2=canvas.getContext('2d');
    ctx2.fillStyle='#fff';ctx2.fillRect(0,0,canvas.width,canvas.height);
    ctx2.fillStyle='#000';ctx2.font='bold 14px monospace';ctx2.textAlign='center';
    ctx2.fillText('QR Error',canvas.width/2,canvas.height/2);
    if(document.body.contains(div)) document.body.removeChild(div);
    if(callback) callback();
  }
}

// Database — Firebase + localStorage
const DB={
  g:k=>{try{return JSON.parse(localStorage.getItem('nx_'+k))}catch{return null}},
  s:(k,v)=>{localStorage.setItem('nx_'+k,JSON.stringify(v));FBDB.ref('nexus/'+k).set(v).catch(e=>console.warn('FB:',e));},
  push:(k,item)=>{let a=DB.g(k)||[];a.push(item);DB.s(k,a);return a}
};

// Seed Event Data
const EVDATA=[
  {id:'ev001',name:'Rhythm Night 2025',cat:'Cultural',status:'live',date:'2025-03-22',time:'7:00 PM',venue:'Main Auditorium',price:150,seats:300,booked:178,org:'Cultural Committee',desc:'The biggest musical night! Live performances, DJ sets, dance battles.',icon:'🎵',bg:'et1'},
  {id:'ev002',name:'CodeStorm Hackathon',cat:'Technical',status:'upcoming',date:'2025-04-05',time:'9:00 AM',venue:'CS Lab Complex',price:200,seats:160,booked:89,org:'Tech Club',desc:'48-hour coding sprint! Build real-world solutions and win ₹50,000 in prizes.',icon:'💻',bg:'et2',prize:'₹50,000'},
  {id:'ev003',name:'Future Tech Summit',cat:'Seminar',status:'upcoming',date:'2025-03-28',time:'2:00 PM',venue:'Seminar Hall B',price:0,seats:400,booked:218,org:'Industry Relations',desc:'Connect with industry leaders, explore AI and ML careers. Free for all students.',icon:'🎙️',bg:'et3'},
  {id:'ev004',name:'Inter-Dept Football Cup',cat:'Sports',status:'upcoming',date:'2025-04-10',time:'8:00 AM',venue:'College Ground',price:500,seats:320,booked:264,org:'Sports Committee',desc:'Annual football tournament. Trophy + ₹10,000 for winners.',icon:'⚽',bg:'et4',prize:'₹10,000'},
  {id:'ev005',name:'UI/UX Design Bootcamp',cat:'Workshop',status:'upcoming',date:'2025-03-30',time:'10:00 AM',venue:'Innovation Lab',price:300,seats:80,booked:62,org:'Design Club',desc:'Master Figma, user research and design systems in a full-day bootcamp.',icon:'🎨',bg:'et5'},
  {id:'ev006',name:'Utkarsh Annual Fest',cat:'Fest',status:'upcoming',date:'2025-05-15',time:'10:00 AM',venue:'Full Campus',price:500,seats:2000,booked:940,org:'Student Council',desc:'3-day mega festival! Celebrity performances, competitions, food stalls, DJ nights.',icon:'🎪',bg:'et6'},
  {id:'ev007',name:'AI & ML Workshop',cat:'Workshop',status:'upcoming',date:'2025-04-02',time:'11:00 AM',venue:'CS Seminar Room',price:0,seats:60,booked:57,org:'AI Club',desc:'Hands-on TensorFlow and Python ML workshop. Bring your laptop.',icon:'🤖',bg:'et7'},
  {id:'ev008',name:'Classical Dance Showcase',cat:'Cultural',status:'completed',date:'2025-02-14',time:'5:00 PM',venue:'Open Air Theatre',price:100,seats:500,booked:498,org:'Cultural Committee',desc:'Annual showcase of Bharatanatyam, Kathak and folk dances.',icon:'💃',bg:'et8'},
];

// External events now stored in DB (admin can create/edit/delete)
const DEFAULT_EXTEVDATA=[
  {id:'ext001',name:'National Hackathon 2025',college:'IIT Bombay',date:'2025-04-20',prize:'₹2,00,000',icon:'💡',cat:'Technical',desc:'Largest national hackathon. Open to all college students.',link:'#',seats:500,price:0,regType:'free'},
  {id:'ext002',name:'Inter-College Cultural Fest',college:'Delhi University',date:'2025-04-18',prize:'₹75,000',icon:'🎭',cat:'Cultural',desc:'3-day pan-India cultural fest with competitions in dance, music, drama.',link:'#',seats:1000,price:200,regType:'paid'},
  {id:'ext003',name:'National Sports Meet',college:'Sports Authority of India',date:'2025-05-01',prize:'Medals & Trophies',icon:'🏅',cat:'Sports',desc:'Competitions across 12 sports. Represent your college at national level.',link:'#',seats:800,price:0,regType:'free'},
  {id:'ext004',name:'Entrepreneurship Summit',college:'IIM Ahmedabad',date:'2025-04-25',prize:'₹1,00,000',icon:'🚀',cat:'Seminar',desc:'Connect with investors, pitch your startup ideas.',link:'#',seats:300,price:500,regType:'paid'},
];
function getExtEvData(){return DB.g('extevents')||DEFAULT_EXTEVDATA;}

const CATS=[
  {name:'Cultural',icon:'🎭',color:'var(--accent)'},{name:'Technical',icon:'💻',color:'var(--blue)'},
  {name:'Sports',icon:'⚽',color:'var(--green)'},{name:'Workshop',icon:'🛠️',color:'var(--purple)'},
  {name:'Seminar',icon:'🎙️',color:'var(--gold)'},{name:'Fest',icon:'🎪',color:'var(--teal)'},
  {name:'Fresher Party',icon:'🎉',color:'var(--accent)'},{name:'External',icon:'🌐',color:'var(--blue)'},
];

function initDB(){
  // Seed local defaults if not present
  if(!DB.g('events')) { localStorage.setItem('nx_events', JSON.stringify(EVDATA)); }
  if(!DB.g('extevents')) { localStorage.setItem('nx_extevents', JSON.stringify(DEFAULT_EXTEVDATA)); }
  if(!DB.g('tickets')) { localStorage.setItem('nx_tickets', JSON.stringify([])); }
  if(!DB.g('extRegsDB')) { localStorage.setItem('nx_extRegsDB', JSON.stringify([])); }
  if(!DB.g('pendingPayments')) { DB.s('pendingPayments',[]); }
  if(!DB.g('notifs')) { localStorage.setItem('nx_notifs', JSON.stringify([
    {id:'n1',title:'Welcome to NEXUS!',msg:'Your platform is ready. Explore events and book passes today.',icon:'🎉',type:'info',time:'Just now',read:false},
    {id:'n2',title:'New Event: UI/UX Bootcamp',msg:'Limited seats — Design Bootcamp added. Register before it fills up!',icon:'🎨',type:'event',time:'2 hrs ago',read:false},
  ])); }
  if(!DB.g('feedback')) { localStorage.setItem('nx_feedback', JSON.stringify([])); }
  if(!DB.g('refunds')) { localStorage.setItem('nx_refunds', JSON.stringify([])); }
}

// Force push all local data to Firebase (run once to sync)
function forceSyncToFirebase(){
  ['events','tickets','extevents','extRegsDB','notifs','feedback','refunds','dynUsers'].forEach(k=>{
    const val = DB.g(k);
    if(val !== null) {
      FBDB.ref('nexus/'+k).set(val).catch(e=>console.warn('FB sync err:',e));
    }
  });
}

// ════════════════════════════════════
// AUTH — Login only, no register
// ════════════════════════════════════
let CU=null;
let eFilter='all';
let editingEventId=null;
let payCurrentEventId=null;
let feedbackRating=0;
let selPayMethod='upi';
let currentPayPrice=0;

// ══════════════════════════════════════════════════════
// 🔴 NEXUS PAYMENT CONFIG — SIRF EK JAGYA BADLO
// ══════════════════════════════════════════════════════
const NEXUS_UPI_ID   = 'YOUR_UPI_ID@upi';  // ← Tara UPI ID yahan lakho
const NEXUS_UPI_NAME = 'NEXUS Events';
const NEXUS_GPAY_QR  = 'data:image/jpeg;base64,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jTiQDyBjzyhTwAADwCsMMMOjygAAShTwAADQAATgTwAgBSgSwADyABzyhTwAADwCsMMMOjzzzzyxTjyAggAQDjjzQAhyASwADzSBTyhDzzzzwCsMMMOQwwwwwxzwxSjwRjQiQxQzyxjByAzChQTSwwwwwwwyMMMMNTzzzzzzzzzyjzygDwDzzzzygChTwABTzzzzzzzzygMMMMOjwjQADgTzzzzyBTywDzzzyjTzyhDzzwDzzzwDzwAgMMMMNTwgCBDzgAAACBzywADwByACAASgDzwgABATywBSCCsMMMNTywwxiCAAwwxxCDAxzyDwADSwSyzBAQwwxzzzwgACsMMMPhxhTDBxhDDTzwBRyDDyjyyjDBiTgCRzBzzzzzyyACMMMMODShQADigABzzwBDgADwjzSgAChDgBTwDTzjjjzQCwMMMMNwhSgAAwwzzzzghDwCwADgAAAABDgBTTDywATwADwCMMMMOgxiQwjzDQwxAQhDzygwwDCwwxDzgwhQjSxTDAADwCsMMMOjyhTziggDziTAhDTzTCABDDzRzTzCBQjSwwAgAzAisMMMOjyhTyhSgDyhQAAACCAAAAAACShTwABSDzyxDwDQACsMMMOgCCDSgASzwgDwATwAAM+LIUBDTywBRyAABTzwDRyCsMMMMSAATCBRiDwiRwADAADKatG+oACCABTgAAADDwDTwCsMMMNiyxyxwjRzCRhwBRgBA4CFd3IARgAziSyBRxzAzjACsMMMPRwiBTgSgDyiDwAAADdGp+/gAABSwDSiBzgSxDxxxiMMMMNTyQhyhCAzyAjwAAwAG9b9BEABBDgBSgTCBDgDzzCgMMMMNjziBjCRzzzyjwxjgwADBIAABSRzgBTzgQhDzjDAQCMMMMOjSAgABDzjzyjzzzxAgAAAAAQRTjwBTwjSxTzAADQCsMMMOjTyAASgADzzzzzzzzwAwwRjATywABzzzzzjgTzzwisMMMODShDzDzDwABTwAADzzzzzjiAQAAAwwgjjTADgBTCwMMMMNTygAAChSwABTwAADzzzzwABTwAADzyhQABTzzzwACsMMMNSCAAQywhAADDCARywDzzwADCDwhDBQyAAATywBSwCsMMMOjzzxyhATzygAAABACzwDwAABDygBwjRzzgBAAACCCsMMMPSBTzzhSzwBQwwwyxADyDzwgBBTy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'; // Uploaded GPay QR image — do not edit      // ← College/event name
// ══════════════════════════════════════════════════════

let _pendingPayEvId='', _pendingPayAmt=0, _pendingPayTxnRef='';

function doLogin(){
  const id=(document.getElementById('li-id')?.value||'').trim();
  const pw=(document.getElementById('li-pw')?.value||'').trim();
  const err=document.getElementById('li-err');
  if(!id||!pw){err.className='ferr on';err.textContent='Please enter College ID and Password.';return;}
  // Search hardcoded USERS_DB first, then dynamic users
  const u=getAllUsers().find(u=>u.id===id&&u.pw===pw);
  if(!u){err.className='ferr on';err.textContent='❌ Invalid College ID or Password. Please try again.';return;}
  err.className='ferr';
  loginOK(u);
}

function quickLogin(id,pw){
  document.getElementById('li-id').value=id;
  document.getElementById('li-pw').value=pw;
  doLogin();
}

function loginOK(u){
  CU=u;DB.s('cu_id',u.id);
  document.getElementById('s-auth').classList.remove('on');
  document.getElementById('s-main').classList.add('on');
  document.getElementById('nl-admin').style.display=u.role==='admin'?'':'none';
  document.getElementById('nav-av').textContent=u.fn[0];
  document.getElementById('nav-av').title=u.fn+' '+u.ln;
  autoSetEventStatuses();
  renderAll();page('home');
  const bnav=document.getElementById('bnav');
  if(bnav) bnav.style.display=window.innerWidth<=600?'block':'none';
  window.addEventListener('resize',()=>{if(bnav)bnav.style.display=window.innerWidth<=600?'block':'none';});
  toast(`Welcome back, ${u.fn}!`,'success');
  requestBrowserNotifPerm();
  setTimeout(()=>checkEventReminders(),4000);
}

function logout(){
  CU=null;DB.s('cu_id',null);
  document.getElementById('s-main').classList.remove('on');
  document.getElementById('s-auth').classList.add('on');
  // Clear login fields
  document.getElementById('li-id').value='';
  document.getElementById('li-pw').value='';
  document.getElementById('li-err').className='ferr';
  toast('Logged out successfully','info');
}

function gv(id){return(document.getElementById(id)?.value||'').trim()}

// ════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════
const PAGES=['home','events','external','tickets','dashboard','admin','notifications','detail','flowchart'];

function page(p){
  PAGES.forEach(pg=>{const el=document.getElementById('p-'+pg);if(el)el.style.display=pg===p?'block':'none'});
  document.querySelectorAll('.nl').forEach(n=>n.classList.remove('on'));
  const nl=document.getElementById('nl-'+p);if(nl)nl.classList.add('on');
  document.querySelectorAll('.bni').forEach(b=>b.classList.remove('on'));
  const bn=document.getElementById('bn-'+p);if(bn)bn.classList.add('on');
  if(p==='home')renderHome();
  if(p==='events')renderEvents();
  if(p==='external')renderExternal();
  if(p==='tickets')renderTickets();
  if(p==='dashboard')renderDash();
  if(p==='admin'){if(CU?.role!=='admin'){toast('Admin access only!','error');page('home');return;}renderAdminOverview();}
  if(p==='notifications')renderNotifs();
  if(p==='flowchart')renderFlowchart();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ════════════════════════════════════
// HOME
// ════════════════════════════════════
function renderAll(){populateCatFilter();startCountdown();buildParticles();initReveal();}

function renderHome(){
  const evs=DB.g('events')||[];
  const tks=DB.g('tickets')||[];
  document.getElementById('hs-ev').textContent=evs.length;
  document.getElementById('hs-st').textContent=USERS_DB.length;
  document.getElementById('hs-tk').textContent=tks.length;
  const cg=document.getElementById('home-cats');
  if(cg)cg.innerHTML=CATS.map(c=>`<div class="ccard" onclick="filterByCat('${c.name}')" style="border-top:2px solid ${c.color}"><span class="ci">${c.icon}</span><div class="cn">${c.name}</div><div class="cc">${evs.filter(e=>e.cat===c.name).length} events</div></div>`).join('');
  const hg=document.getElementById('home-ev');
  if(hg)hg.innerHTML=evs.filter(e=>e.status!=='completed').slice(0,3).map(ecard).join('');
  buildLB();buildPopBars();
}

function buildParticles(){
  const c=document.getElementById('particles');
  if(!c||c.children.length>0)return;
  for(let i=0;i<18;i++){
    const p=document.createElement('div');p.className='particle';
    const sz=Math.random()*4+2;
    const colors=['var(--accent)','var(--blue)','var(--teal)','var(--gold)'];
    p.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;background:${colors[i%4]};animation-duration:${Math.random()*12+8}s;animation-delay:${Math.random()*8}s`;
    c.appendChild(p);
  }
}

// Category SVG icons using Lucide
function getCatIcon(cat,size=44,color='currentColor'){
  const icons={
    'Cultural':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    'Technical':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    'Sports':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M9.17 14.83l-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>',
    'Workshop':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'Seminar':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'Fest':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    'Fresher Party':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    'External':'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  };
  return icons[cat]||'<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
}

function getCatColor(cat){
  const c={'Cultural':'var(--accent)','Technical':'var(--blue)','Sports':'var(--green)','Workshop':'var(--purple)','Seminar':'var(--gold)','Fest':'var(--teal)','Fresher Party':'var(--accent)','External':'var(--blue)'};
  return c[cat]||'var(--text2)';
}

// Get event image from localStorage
function getEvImg(evId){return localStorage.getItem('ev_img_'+evId)||null;} // Returns Cloudinary URL

function ecard(e){
  const pct=Math.min(100,Math.round(e.booked/e.seats*100));
  const badge=e.status==='live'?'<span class="ebadge eb-live">● LIVE</span>':e.booked>=e.seats?'<span class="ebadge" style="background:rgba(232,76,61,.85);color:#fff">HOUSEFUL</span>':e.price===0?'<span class="ebadge eb-free">FREE</span>':e.status==='completed'?'<span class="ebadge eb-done">COMPLETED</span>':'<span class="ebadge eb-up">UPCOMING</span>';
  const fillColor=pct>80?'var(--accent)':pct>50?'var(--blue)':'var(--green)';
  const img=getEvImg(e.id);
  const catColor=getCatColor(e.cat);

  const thumbContent=img
    ?`<img src="${img}" alt="${e.name}"><div class="ecard-img-overlay"></div>${badge}<div class="eback-seats">🪑 ${e.seats-e.booked} seats left</div>`
    :`<div class="ecard-glow" style="opacity:.06">${getCatIcon(e.cat,90,catColor)}</div>
      <div class="ecard-cat-icon">${getCatIcon(e.cat,64,catColor)}</div>
      ${badge}<div class="eback-seats">🪑 ${e.seats-e.booked} seats left</div>`;

  return `<div class="ecard" onclick="viewEv('${e.id}')">
    <div class="ecard-thumb ${img?'':e.bg}">${thumbContent}</div>
    <div class="ecard-body">
      <div class="ecat">${e.cat}</div>
      <div class="etitle">${e.name}</div>
      <div class="emeta">
        <div class="emr"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${e.date} · ${e.time}</div>
        <div class="emr"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${e.venue}</div>
        ${e.prize?`<div class="emr"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> ${e.prize}</div>`:''}
      </div>
      <div class="eprog"><div class="eprog-row"><span>Booked</span><span>${pct}%</span></div><div class="eprog-bar"><div class="eprog-fill" style="width:${pct}%;background:${fillColor}"></div></div></div>
      <div class="ecard-foot">
        <div class="eprice">${e.price===0?'FREE':'₹'+e.price}<small>per ticket</small></div>
        ${e.status==='completed'
          ?`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();viewEv('${e.id}')">View Details</button>`
          :e.booked>=e.seats
            ?`<button class="btn btn-sm" style="background:rgba(232,76,61,.1);color:var(--accent);border:1px solid rgba(232,76,61,.3);cursor:not-allowed" disabled>🎫 Houseful</button>`
            :`<button class="btn btn-red btn-sm" onclick="event.stopPropagation();openBooking('${e.id}')">Book Pass →</button>`}
      </div>
    </div>
  </div>`;
}

function buildLB(){
  const tks=DB.g('tickets')||[];
  const el=document.getElementById('lb-list');
  if(!el)return;
  const ranked=USERS_DB.map(u=>({n:u.fn+' '+u.ln,d:u.dept||'Student',c:tks.filter(t=>t.uid===u.id).length})).sort((a,b)=>b.c-a.c).slice(0,5);
  const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
  el.innerHTML=ranked.map((r,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:1.2rem;width:28px;text-align:center">${medals[i]}</div>
    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem">${r.n[0]}</div>
    <div style="flex:1"><div style="font-weight:600;font-size:.86rem">${r.n}</div><div style="font-size:.72rem;color:var(--text2)">${r.d}</div></div>
    <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:800;color:var(--accent)">${r.c}</div>
  </div>`).join('')||'<div class="empty"><div class="empty-i">🏆</div><div class="empty-m">No participants yet!</div></div>';
}

function buildPopBars(){
  const evs=DB.g('events')||[];
  const el=document.getElementById('pop-bars');
  if(!el)return;
  const colors=['linear-gradient(90deg,var(--accent),#ff6b6b)','linear-gradient(90deg,var(--blue),#60a5fa)','linear-gradient(90deg,var(--teal),#34d399)','linear-gradient(90deg,var(--gold),#fbbf24)','linear-gradient(90deg,var(--purple),#c084fc)'];
  el.innerHTML=[...evs].sort((a,b)=>(b.booked/b.seats)-(a.booked/a.seats)).slice(0,5).map((e,i)=>{
    const p=Math.min(100,Math.round(e.booked/e.seats*100));
    return `<div class="brow"><span class="bn">${e.name.split(' ').slice(0,2).join(' ')}</span><div class="btr"><div class="bf" style="width:${p}%;background:${colors[i]}"></div></div><span class="bv">${p}%</span></div>`;
  }).join('');
}

// Major event slider removed

// ════════════════════════════════════
// EVENTS
// ════════════════════════════════════
function populateCatFilter(){
  const s=document.getElementById('ev-cat');
  if(!s)return;
  s.innerHTML='<option value="">All Categories</option>'+CATS.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
}

function renderEvents(){filterEv();}

// ════════════════════════════════════


function filterEv(){
  const q=(document.getElementById('ev-search')?.value||'').toLowerCase();
  const cat=document.getElementById('ev-cat')?.value||'';
  const sort=document.getElementById('ev-sort')?.value||'';
  let evs=DB.g('events')||[];
  if(q)evs=evs.filter(e=>(e.name+e.cat+e.venue+e.desc).toLowerCase().includes(q));
  if(cat)evs=evs.filter(e=>e.cat===cat);
  if(eFilter==='upcoming')evs=evs.filter(e=>e.status==='upcoming');
  if(eFilter==='live')evs=evs.filter(e=>e.status==='live');
  if(eFilter==='free')evs=evs.filter(e=>e.price===0);
  if(eFilter==='completed')evs=evs.filter(e=>e.status==='completed');
  if(sort==='price')evs=[...evs].sort((a,b)=>a.price-b.price);
  if(sort==='popular')evs=[...evs].sort((a,b)=>(b.booked/b.seats)-(a.booked/a.seats));
  if(sort==='date')evs=[...evs].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const g=document.getElementById('all-ev-grid');
  if(g)g.innerHTML=evs.length?evs.map(ecard).join(''):`<div class="empty" style="grid-column:1/-1"><div class="empty-i">🔍</div><div class="empty-m">No events found. Try different filters.</div></div>`;
}

function setFilter(el,f){
  document.querySelectorAll('#ev-chips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');eFilter=f;filterEv();
}

function filterByCat(cat){
  page('events');
  setTimeout(()=>{const s=document.getElementById('ev-cat');if(s){s.value=cat;filterEv();}},60);
}

// ════════════════════════════════════
// EXTERNAL EVENTS
// ════════════════════════════════════
function renderExternal(){
  const el=document.getElementById('ext-ev-list');
  if(!el)return;
  const extEvs=getExtEvData();
  if(!extEvs.length){el.innerHTML='<div class="empty"><div class="empty-i" style="font-size:3rem;margin-bottom:12px">🌐</div><div class="empty-m">No external events yet. Admin will add them soon.</div></div>';return;}
  el.innerHTML=extEvs.map(e=>{
    const myRegs=DB.g('extRegsDB')||[];
    const alreadyReg=myRegs.find(r=>r.eid===e.id&&r.uid===CU?.id);
    const img=getEvImg(e.id);
    const catColor=getCatColor(e.cat);
    return `<div class="ext-card" onclick="openExtBooking('${e.id}')" style="display:flex;gap:0;padding:0;overflow:hidden;align-items:stretch">
      <!-- Thumbnail -->
      <div style="width:130px;min-height:130px;flex-shrink:0;position:relative;background:var(--surface2);display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${img
          ?`<img src="${img}" style="width:100%;height:100%;object-fit:cover">`
          :`<div style="opacity:.7">${getCatIcon(e.cat,48,catColor)}</div>`}
      </div>
      <!-- Content -->
      <div style="flex:1;padding:16px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <div style="font-family:'Outfit',sans-serif;font-size:1rem;font-weight:700">${e.name}</div>
            <span class="badge b-purple" style="font-size:.62rem">EXTERNAL</span>
            <span class="badge b-blue" style="font-size:.62rem">${e.cat}</span>
            ${e.price>0?`<span class="badge b-gold" style="font-size:.62rem">₹${e.price}</span>`:`<span class="badge b-teal" style="font-size:.62rem">FREE</span>`}
          </div>
          <div style="font-size:.76rem;color:var(--text2);margin-bottom:5px;display:flex;gap:12px;flex-wrap:wrap">
            <span style="display:flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${e.date}</span>
            <span style="display:flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> ${e.college}</span>
            <span>🪑 ${e.seats} seats</span>
          </div>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.5;margin-bottom:8px">${e.desc?.substring(0,100)}${e.desc?.length>100?'...':''}</div>
          <div style="font-size:.82rem;font-weight:700;color:var(--gold);display:flex;align-items:center;gap:5px">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            ${e.prize}
          </div>
        </div>
        <div style="margin-top:10px">
          ${alreadyReg
            ?`<span class="badge b-green">✅ Registered</span>`
            :`<button class="btn btn-blue btn-sm" onclick="event.stopPropagation();openExtBooking('${e.id}')">Register →</button>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openExtBooking(id){
  const extEvs=getExtEvData();
  const e=extEvs.find(x=>x.id===id);if(!e)return;
  const u=CU;
  const myRegs=DB.g('extRegsDB')||[];
  const alreadyReg=myRegs.find(r=>r.eid===e.id&&r.uid===u?.id);
  if(alreadyReg){toast('✅ Already registered for this event!','info');return;}

  document.getElementById('ext-reg-content').innerHTML=`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2.8rem;margin-bottom:6px">${e.icon}</div>
      <div style="font-family:'Outfit',sans-serif;font-size:1.4rem;font-weight:800;margin-bottom:4px">${e.name}</div>
      <div style="color:var(--text2);font-size:.8rem">🏛️ ${e.college} · 📅 ${e.date} · 🏆 ${e.prize}</div>
      ${e.price>0?`<div style="margin-top:8px;font-family:'Outfit',sans-serif;font-size:1.6rem;font-weight:800;color:var(--gold)">₹${e.price} <span style="font-size:.8rem;color:var(--text2);font-family:'DM Sans'">registration fee</span></div>`:`<div style="margin-top:8px"><span class="badge b-teal" style="font-size:.8rem">FREE Registration</span></div>`}
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:18px;font-size:.82rem;color:var(--text2)">${e.desc}</div>
    <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:.85rem;margin-bottom:14px;color:var(--text2);letter-spacing:.06em;text-transform:uppercase">📋 Student Registration Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="fg"><label class="fl">First Name *</label><input class="fi" id="er-fn" value="${u?.fn||''}" placeholder="First name"></div>
      <div class="fg"><label class="fl">Last Name *</label><input class="fi" id="er-ln" value="${u?.ln||''}" placeholder="Last name"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="fg"><label class="fl">College ID *</label><input class="fi" id="er-cid" value="${u?.id||''}" placeholder="College ID" readonly></div>
      <div class="fg"><label class="fl">Department *</label><input class="fi" id="er-dept" value="${u?.dept||''}" placeholder="e.g. Computer Science"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="fg"><label class="fl">Year *</label><select class="fi" id="er-yr">
        <option ${u?.yr==='1st Year'?'selected':''}>1st Year</option>
        <option ${u?.yr==='2nd Year'?'selected':''}>2nd Year</option>
        <option ${u?.yr==='3rd Year'?'selected':''}>3rd Year</option>
        <option ${u?.yr==='4th Year'?'selected':''}>4th Year</option>
      </select></div>
      <div class="fg"><label class="fl">Mobile *</label><input class="fi" id="er-mob" value="${u?.mob||''}" placeholder="10-digit mobile" maxlength="10"></div>
    </div>
    <div class="fg" style="margin-bottom:12px"><label class="fl">Email ID *</label><input class="fi" id="er-em" value="${u?.em||''}" placeholder="your@email.com" type="email"></div>
    <div class="fg" style="margin-bottom:18px"><label class="fl">Why do you want to participate? *</label><textarea class="fi" id="er-why" rows="3" placeholder="Briefly describe your interest / skills relevant to this event..."></textarea></div>
    ${e.price>0?`
    <div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-weight:700;margin-bottom:10px;color:var(--gold)">💳 Payment Method</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="pay-m on" id="epm-upi" onclick="selExtPay('upi')"><div class="pay-m-icon">📱</div><div class="pay-m-lbl">UPI</div></div>
        <div class="pay-m" id="epm-card" onclick="selExtPay('card')"><div class="pay-m-icon">💳</div><div class="pay-m-lbl">Card</div></div>
        <div class="pay-m" id="epm-wallet" onclick="selExtPay('wallet')"><div class="pay-m-icon">👛</div><div class="pay-m-lbl">Wallet</div></div>
      </div>
      <div id="epf-upi"><div class="fg"><label class="fl">UPI ID</label><input class="fi" id="er-upi" placeholder="yourname@upi" value="student@paytm"></div></div>
      <div id="epf-card" style="display:none">
        <div class="fr"><div class="fg"><label class="fl">Card Number</label><input class="fi" id="er-card" placeholder="4242 4242 4242 4242" maxlength="19" oninput="fmtCard(this)"></div>
        <div class="fg"><label class="fl">Expiry</label><input class="fi" id="er-exp" placeholder="MM/YY" maxlength="5"></div></div>
        <div class="fr"><div class="fg"><label class="fl">Name on Card</label><input class="fi" id="er-cnm" placeholder="Your Name"></div>
        <div class="fg"><label class="fl">CVV</label><input class="fi" id="er-cvv" placeholder="123" maxlength="3" type="password"></div></div>
      </div>
      <div id="epf-wallet" style="display:none"><div class="fg"><label class="fl">Select Wallet</label><select class="fi" id="er-wlt"><option>Paytm</option><option>PhonePe</option><option>Amazon Pay</option></select></div></div>
    </div>`:''}
    <div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.2);border-radius:8px;padding:12px;margin-bottom:18px;font-size:.78rem;color:var(--text2)">
      ✅ Your details will be shared with the external organizer<br>
      ✅ Admin will be notified of your registration<br>
      ✅ A unique QR pass will be generated for you
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-ghost" onclick="closeOv('ov-ext-reg')">Cancel</button>
      <button class="btn btn-blue btn-full btn-lg" onclick="confirmExtReg('${e.id}')">${e.price>0?`💳 Pay ₹${e.price} & Register →`:'✅ Submit Registration →'}</button>
    </div>`;
  openOv('ov-ext-reg');
}

let extPayMethod='upi';
function selExtPay(m){
  extPayMethod=m;
  ['upi','card','wallet'].forEach(x=>{
    const pm=document.getElementById('epm-'+x);
    const pf=document.getElementById('epf-'+x);
    if(pm)pm.className='pay-m'+(x===m?' on':'');
    if(pf)pf.style.display=x===m?'block':'none';
  });
}

function confirmExtReg(id){
  const extEvs=getExtEvData();
  const e=extEvs.find(x=>x.id===id);if(!e)return;
  const fn=document.getElementById('er-fn')?.value.trim();
  const ln=document.getElementById('er-ln')?.value.trim();
  const em=document.getElementById('er-em')?.value.trim();
  const mob=document.getElementById('er-mob')?.value.trim();
  const why=document.getElementById('er-why')?.value.trim();
  const dept=document.getElementById('er-dept')?.value.trim();
  const yr=document.getElementById('er-yr')?.value;
  if(!fn||!ln||!em||!mob||!why){toast('⚠️ Please fill all required fields','error');return;}
  if(!/^\S+@\S+\.\S+$/.test(em)){toast('⚠️ Please enter a valid email','error');return;}
  if(!/^\d{10}$/.test(mob)){toast('⚠️ Mobile must be 10 digits','error');return;}

  // Payment validation for paid events
  if(e.price>0){
    if(extPayMethod==='upi'){
      const upi=document.getElementById('er-upi')?.value.trim();
      if(!upi||!upi.includes('@')){toast('⚠️ Enter valid UPI ID','error');return;}
    } else if(extPayMethod==='card'){
      const cn=(document.getElementById('er-card')?.value||'').replace(/\s/g,'');
      const exp=document.getElementById('er-exp')?.value||'';
      const cvv=document.getElementById('er-cvv')?.value||'';
      const cnm=document.getElementById('er-cnm')?.value.trim()||'';
      if(cn.length<16){toast('⚠️ Enter valid 16-digit card number','error');return;}
      if(!exp.match(/^\d{2}\/\d{2}$/)){toast('⚠️ Enter expiry as MM/YY','error');return;}
      if(cvv.length<3){toast('⚠️ Enter 3-digit CVV','error');return;}
      if(!cnm){toast('⚠️ Enter name on card','error');return;}
    }
  }

  const reg={
    id:'ER'+Date.now(),
    eid:e.id,ename:e.name,ecollege:e.college,edate:e.date,
    uid:CU?.id,fn,ln,em,mob,dept,yr,why,
    price:e.price,payMethod:e.price>0?extPayMethod:'free',
    txnId:e.price>0?('TXN'+Math.floor(Math.random()*9000000+1000000)):null,
    registeredAt:new Date().toLocaleString('en-IN'),status:'Registered'
  };

  // Save to unified extRegsDB
  const regs=DB.g('extRegsDB')||[];
  regs.push(reg);DB.s('extRegsDB',regs);
  // Also keep old localStorage key for backward compat
  const oldRegs=JSON.parse(localStorage.getItem('extRegs')||'[]');
  oldRegs.push(reg);localStorage.setItem('extRegs',JSON.stringify(oldRegs));

  closeOv('ov-ext-reg');
  toast(`✅ Registered for ${e.name}!${e.price>0?' Payment confirmed!':''}`, 'success');
  addNotif(`External Event: ${e.name}`,`Registration ${e.price>0?`& payment ₹${e.price} `:''}confirmed for ${e.college} on ${e.date}.`,'🌐','success');
  renderExternal();
}

// ════════════════════════════════════
// TICKETS PAGE
// ════════════════════════════════════
function renderTickets(){
  const tg=document.getElementById('t-grid');
  if(!tg)return;

  // ── Show pending payments banner ──
  const _pendPays=(DB.g('pendingPayments')||[]).filter(x=>x.uid===CU?.id&&x.status==='pending_verify');
  const _pendEvs=DB.g('events')||[];
  let _pendBanner='';
  if(_pendPays.length>0){
    _pendBanner='<div style="margin-bottom:16px">'+_pendPays.map(p=>{
      const _e=_pendEvs.find(x=>x.id===p.eid);
      return '<div style="background:rgba(245,166,35,.07);border:1.5px solid rgba(245,166,35,.3);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">'
        +'<div style="font-size:1.8rem">⏳</div>'
        +'<div style="flex:1">'
        +'<div style="font-weight:700;font-size:.88rem">Payment Under Review</div>'
        +'<div style="font-size:.75rem;color:var(--text2)">'+(_e?_e.name:'Event')+' · ₹'+p.amt+'</div>'
        +'<div style="font-size:.7rem;color:var(--text2);margin-top:2px">UTR: <span style="font-family:monospace">'+p.utrId+'</span></div>'
        +'</div>'
        +'<span style="background:rgba(245,166,35,.15);color:var(--gold);border-radius:6px;padding:3px 8px;font-size:.68rem;font-weight:700;flex-shrink:0">PENDING</span>'
        +'</div>';
    }).join('')+'</div>';
    tg.insertAdjacentHTML('beforebegin',_pendBanner);
  }
  const S=(n,t)=>
    '<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start">'
    +'<div style="width:22px;height:22px;border-radius:50%;background:rgba(99,102,241,.15);border:1.5px solid rgba(99,102,241,.3);color:var(--blue);font-size:.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">'+n+'</div>'
    +'<div style="font-size:.77rem;color:var(--text2);line-height:1.55">'+t+'</div></div>';
  const F=(c,f)=>
    '<div style="display:flex;gap:7px;align-items:center;font-size:.75rem;color:var(--text2);margin-bottom:4px">'
    +'<span style="color:'+c+';font-weight:700">&#x2713;</span>'+f+'</div>';
  tg.innerHTML=''
    +'<div style="grid-column:1/-1;padding-bottom:4px">'
    +'<div style="font-family:\'Outfit\',sans-serif;font-size:1.35rem;font-weight:900;margin-bottom:4px">&#x1F39F; Pass Types &amp; How to Book</div>'
    +'<div style="font-size:.82rem;color:var(--text2)">Booking happens from the <strong style="color:var(--text)">Events</strong> page. Read instructions below for each pass type.</div>'
    +'</div>'

    +'<div class="tcard" style="border-top:3px solid var(--teal)">'
    +'<div style="display:flex;align-items:center;gap:11px;margin-bottom:13px;padding-bottom:11px;border-bottom:1px solid var(--border)">'
    +'<div style="width:42px;height:42px;border-radius:12px;background:rgba(0,201,177,.12);border:1.5px solid rgba(0,201,177,.25);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">&#x1F193;</div>'
    +'<div style="flex:1"><div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:.92rem;color:var(--teal)">Free Entry Pass</div><div style="font-size:.7rem;color:var(--text2)">Zero cost &middot; Instant</div></div>'
    +'<div style="font-family:\'Outfit\',sans-serif;font-size:1.4rem;font-weight:900;color:var(--teal)">FREE</div></div>'
    +'<div style="background:rgba(0,201,177,.05);border:1px solid rgba(0,201,177,.15);border-radius:9px;padding:9px 11px;margin-bottom:11px">'
    +F('var(--teal)','Digital QR pass')+F('var(--teal)','General event access')+F('var(--teal)','Event notifications')+F('var(--teal)','Email confirmation')
    +'</div>'
    +'<div style="font-size:.65rem;font-weight:700;color:var(--text3);letter-spacing:.06em;margin-bottom:8px">HOW TO BOOK</div>'
    +S(1,'Open <strong style="color:var(--text)">Events</strong> tab from bottom menu')
    +S(2,'Find event with <span style="background:rgba(0,201,177,.12);color:var(--teal);border-radius:4px;padding:1px 6px;font-size:.68rem;font-weight:700">FREE</span> badge')
    +S(3,'Tap event &rarr; press <strong>Book Pass</strong> &rarr; select <strong style="color:var(--teal)">Student</strong>')
    +S(4,'Tap <strong>Register Free</strong> &mdash; QR pass appears in My Passes instantly')
    +'<button class="btn btn-full" style="margin-top:10px;background:rgba(0,201,177,.1);color:var(--teal);border:1.5px solid rgba(0,201,177,.25);justify-content:center" onclick="page(\'events\')">Browse Free Events &rarr;</button>'
    +'</div>'

    +'<div class="tcard" style="border-top:3px solid var(--blue)">'
    +'<div style="display:flex;align-items:center;gap:11px;margin-bottom:13px;padding-bottom:11px;border-bottom:1px solid var(--border)">'
    +'<div style="width:42px;height:42px;border-radius:12px;background:rgba(61,125,232,.12);border:1.5px solid rgba(61,125,232,.25);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">&#x1F393;</div>'
    +'<div style="flex:1"><div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:.92rem;color:var(--blue)">Student Regular Pass</div><div style="font-size:.7rem;color:var(--text2)">One per student per event</div></div>'
    +'<div style="text-align:right"><div style="font-family:\'Outfit\',sans-serif;font-size:1.1rem;font-weight:900;background:linear-gradient(135deg,var(--blue),#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">&#x20B9;150+</div><div style="font-size:.63rem;color:var(--text2)">per event</div></div></div>'
    +'<div style="background:rgba(61,125,232,.05);border:1px solid rgba(61,125,232,.15);border-radius:9px;padding:9px 11px;margin-bottom:11px">'
    +F('var(--blue)','Full event access')+F('var(--blue)','Unique QR code pass')+F('var(--blue)','PDF download & email')+F('var(--blue)','Priority seating')+F('var(--blue)','Certificate on completion')+F('var(--blue)','Add non-student guest passes')
    +'</div>'
    +'<div style="font-size:.65rem;font-weight:700;color:var(--text3);letter-spacing:.06em;margin-bottom:8px">HOW TO BOOK</div>'
    +S(1,'Go to <strong>Events</strong> &rarr; tap any paid event')
    +S(2,'Press <strong>Book Pass</strong> &rarr; choose <span style="background:rgba(61,125,232,.12);color:var(--blue);border-radius:4px;padding:1px 6px;font-size:.68rem;font-weight:700">Student</span>')
    +S(3,'Pay via UPI / Card / Wallet &mdash; done in 10 seconds')
    +S(4,'QR pass ready instantly &mdash; download PDF anytime from My Passes')
    +'<div style="background:rgba(245,166,35,.06);border:1px solid rgba(245,166,35,.18);border-radius:8px;padding:8px 10px;font-size:.74rem;color:var(--text2);margin-top:8px"><span style="color:var(--gold);font-weight:700">&#x1F4A1; Tip:</span> After booking, add non-student guest passes directly from your pass screen.</div>'
    +'<button class="btn btn-blue btn-full" style="margin-top:10px;justify-content:center" onclick="page(\'events\')">Browse Paid Events &rarr;</button>'
    +'</div>'

    +'<div class="tcard" style="border-top:3px solid var(--gold);border:1.5px solid rgba(245,166,35,.30);background:rgba(245,166,35,.02)">'
    +'<div style="display:flex;align-items:center;gap:11px;margin-bottom:13px;padding-bottom:11px;border-bottom:1px solid rgba(245,166,35,.15)">'
    +'<div style="width:42px;height:42px;border-radius:12px;background:rgba(245,166,35,.12);border:1.5px solid rgba(245,166,35,.25);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">&#x1F3EB;</div>'
    +'<div style="flex:1"><div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:.92rem;color:var(--gold)">Non-Student Guest Pass</div><div style="font-size:.7rem;color:var(--text2)">Family &amp; outsiders &middot; max 4 per event</div></div>'
    +'<div style="text-align:right"><div style="font-family:\'Outfit\',sans-serif;font-size:1.1rem;font-weight:900;color:var(--gold)">+35%</div><div style="font-size:.63rem;color:var(--text2)">of event price</div></div></div>'
    +'<div style="background:rgba(245,166,35,.05);border:1px solid rgba(245,166,35,.15);border-radius:9px;padding:9px 11px;margin-bottom:11px">'
    +F('var(--gold)','Full event access for guest')+F('var(--gold)','Unique QR per guest')+F('var(--gold)','PDF pass download')+F('var(--gold)','Guest name on pass')+F('var(--gold)','Cancel & refund anytime')+F('var(--gold)','Up to 4 guests per event')
    +'</div>'
    +'<div style="font-size:.65rem;font-weight:700;color:var(--text3);letter-spacing:.06em;margin-bottom:8px">HOW TO BOOK</div>'
    +S(1,'First book your <strong>Student Pass</strong> for the event')
    +S(2,'On your pass card tap <strong style="color:var(--gold)">&#x1F3EB; Add Non-Student Guest Pass</strong>')
    +S(3,'Enter guest name, mobile number &amp; relation to you')
    +S(4,'Pay guest fee (+35%) &mdash; each guest gets their own QR pass')
    +'<div style="background:rgba(232,76,61,.05);border:1px solid rgba(232,76,61,.18);border-radius:8px;padding:8px 10px;font-size:.74rem;color:var(--text2);margin-top:8px"><span style="color:var(--accent);font-weight:700">&#x26A0; Gate Rule:</span> Guest must carry original Aadhaar / Licence / Passport for verification.</div>'
    +'<button class="btn btn-full" style="margin-top:10px;background:rgba(245,166,35,.1);color:var(--gold);border:1.5px solid rgba(245,166,35,.28);justify-content:center" onclick="page(\'events\')">Browse Events &rarr;</button>'
    +'</div>';
}
// ════════════════════════════════════
// BOOKING & PAYMENT
// ════════════════════════════════════
function openBooking(evId){
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!e){toast('Event not found','error');return;}
  if(e.status==='completed'){viewEv(evId);return;}

  // Seats full check
  if(e.booked>=e.seats){
    toast('This event is houseful! No seats available.','error');
    return;
  }

  payCurrentEventId=evId;
  document.getElementById('pay-content').innerHTML=buildBookingModal(e);
  openOv('ov-pay');
}

function buildBookingModal(e){
  const tks=DB.g('tickets')||[];
  const myStudentTk=tks.find(t=>t.eid===e.id&&t.uid===CU.id&&t.ttype==='student'&&t.status!=='cancelled');
  const nsPrice=e.price>0?Math.round(e.price*1.35):0;
  const maxNs=e.maxNonStudentGuests||4;
  const myNsTks=tks.filter(t=>t.eid===e.id&&t.ttype==='nonstu'&&t.bookedBy===CU.id&&t.status!=='cancelled');
  const nsRemaining=Math.max(0,maxNs-myNsTks.length);

  // Student already booked
  const studentAlreadyMsg=myStudentTk
    ?'<div style="background:rgba(39,174,96,.08);border:1px solid rgba(39,174,96,.2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.8rem;display:flex;align-items:center;gap:10px"><span style="font-size:1.2rem">✅</span><div><div style="font-weight:700;color:var(--green)">Student Pass Already Booked</div><div style="color:var(--text2)">You already have a pass for this event. <span style="color:var(--blue);cursor:pointer;font-weight:600" onclick="closeOv(\'ov-pay\');showPass(\''+myStudentTk.id+'\')">View Pass →</span></div></div></div>'
    :'';

  return '<div id="ps-1" class="pay-step on">'
    +'<div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--border)">'
    +'<div style="font-size:2.5rem">'+e.icon+'</div>'
    +'<div><div style="font-family:\'Outfit\',sans-serif;font-size:1.3rem;font-weight:800">'+e.name+'</div>'
    +'<div style="font-size:.78rem;color:var(--text2)">📅 '+e.date+' · 📍 '+e.venue+'</div></div></div>'
    +studentAlreadyMsg
    // Category selector
    +'<div class="fg"><label class="fl">Booking Category</label>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
    +'<div id="bcat-student" class="bcat-btn '+(myStudentTk?'bcat-disabled':'bcat-active')+'" onclick="selectBookingCat(\'student\',\''+e.id+'\')" style="border:2px solid '+(myStudentTk?'rgba(100,100,130,.2)':'var(--blue)')+';background:'+(myStudentTk?'rgba(100,100,130,.05)':'rgba(61,125,232,.1)')+';border-radius:14px;padding:14px;cursor:'+(myStudentTk?'not-allowed':'pointer')+';text-align:center;transition:all .2s">'
    +'<div style="font-size:1.5rem;margin-bottom:4px">🎓</div>'
    +'<div style="font-weight:800;font-size:.9rem;color:'+(myStudentTk?'var(--text3)':'var(--blue)')+'">Student</div>'
    +'<div style="font-size:.7rem;color:var(--text2);margin-top:3px">'+(myStudentTk?'Already booked':'One pass per student')+'</div>'
    +'<div style="font-size:.85rem;font-weight:700;color:'+(myStudentTk?'var(--text3)':'var(--blue)')+';margin-top:6px">'+( e.price===0?'FREE':'₹'+e.price)+'</div></div>'
    +'<div id="bcat-nonstu" class="bcat-btn '+(nsRemaining<=0?'bcat-disabled':'bcat-inactive')+'" onclick="selectBookingCat(\'nonstu\',\''+e.id+'\')" style="border:2px solid '+(nsRemaining<=0?'rgba(100,100,130,.2)':'var(--border)')+';background:var(--surface2);border-radius:14px;padding:14px;cursor:'+(nsRemaining<=0?'not-allowed':'pointer')+';text-align:center;transition:all .2s">'
    +'<div style="font-size:1.5rem;margin-bottom:4px">🏫</div>'
    +'<div style="font-weight:800;font-size:.9rem;color:'+(nsRemaining<=0?'var(--text3)':'var(--text)')+'">Non-Student</div>'
    +'<div style="font-size:.7rem;color:var(--text2);margin-top:3px">'+(nsRemaining<=0?'Limit reached ('+maxNs+')':nsRemaining+' guest slots left')+'</div>'
    +'<div style="font-size:.85rem;font-weight:700;color:var(--gold);margin-top:6px">'+( e.price===0?'FREE':'₹'+nsPrice)+'</div></div></div></div>'
    // Info panel (changes by selection)
    +'<div id="bcat-info"></div>'
    // Summary
    +'<div style="background:var(--surface2);border-radius:10px;padding:16px;margin-bottom:18px">'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:.84rem"><span style="color:var(--text2)">Seats Available</span><span>'+(e.seats-e.booked)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:.84rem"><span style="color:var(--text2)">Organizer</span><span>'+e.org+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border)">'
    +'<span style="font-weight:700">Total</span>'
    +'<span id="pay-total" style="font-family:\'Outfit\',sans-serif;font-size:1.5rem;font-weight:800;color:var(--gold)">Select a category</span></div></div>'
    +'<button id="bcat-proceed-btn" class="btn btn-red btn-full btn-lg" style="display:none" onclick="proceedWithCategory(\''+e.id+'\')">Proceed to Payment →</button>'
    +'<div id="bcat-free-btn" style="display:none"><button class="btn btn-red btn-full btn-lg" onclick="proceedWithCategory(\''+e.id+'\')">Register Free →</button></div>'
    +'</div>'


    // Step 2 — Simple Payment
    +'<div id="ps-2" class="pay-step">'    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)">'    +'<button class="btn btn-ghost btn-sm" onclick="backToStep1()">\u2190</button>'    +'<div style="font-family:\'Outfit\',sans-serif;font-size:1.1rem;font-weight:800">Confirm &amp; Pay</div>'    +'</div>'    +'<div style="background:linear-gradient(135deg,rgba(61,125,232,.08),rgba(99,102,241,.05));border:1.5px solid rgba(61,125,232,.18);border-radius:16px;padding:18px;margin-bottom:16px">'    +'<div style="font-size:.7rem;color:var(--text2);letter-spacing:.08em;margin-bottom:10px">ORDER SUMMARY</div>'    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'    +'<span style="font-size:.88rem;color:var(--text2)">'+e.name.substring(0,26)+'</span>'    +'<span style="font-weight:900;font-family:\'Outfit\',sans-serif;font-size:1.3rem;color:var(--gold)" id="pay-amount-big"></span>'    +'</div>'    +'<div style="font-size:.75rem;color:var(--text2)">\uD83D\uDCC5 '+e.date+(e.venue?' \u00B7 \uD83D\uDCCD '+e.venue.substring(0,18):'')+'</div>'    +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between">'    +'<span style="font-size:.72rem;color:var(--text2)">Pass Type</span>'    +'<span id="pay-type-label" style="font-size:.78rem;font-weight:700;color:var(--blue)">\u2014</span>'    +'</div>'    +'<div style="display:flex;justify-content:space-between;margin-top:4px">'    +'<span style="font-size:.72rem;color:var(--text2)">Pay To</span>'    +'<span style="font-size:.75rem;font-weight:600;color:var(--text)">'+NEXUS_UPI_NAME+'</span>'    +'</div>'    +'</div>'    +'<button class="btn btn-red btn-full btn-lg" onclick="confirmPayment(\''+e.id+'\')" style="margin-bottom:10px;height:52px;font-size:1rem">'    +'\uD83D\uDCB3 Pay <span id="pay-total2"></span> \u2192 Get Pass Instantly'    +'</button>'    +'<div style="text-align:center;font-size:.72rem;color:var(--text2)">\uD83D\uDD12 Secure \u00B7 Pass instantly confirmed</div>'    +'</div>'

    // Step 3 — Processing
    +'<div id="ps-3" class="pay-step"><div style="text-align:center;padding:30px 20px">'
    +'<div style="font-size:3.5rem;margin-bottom:14px;animation:spin .8s linear infinite">⚙️</div>'
    +'<div style="font-family:\'Outfit\',sans-serif;font-size:1.2rem;font-weight:700;margin-bottom:6px">Verifying Payment...</div>'
    +'<div style="color:var(--text2);font-size:.84rem;margin-bottom:16px">UTR verify thay rahyo chhe</div>'
    +'<div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;max-width:260px;margin:0 auto">'
    +'<div id="pay-progress" style="height:100%;background:linear-gradient(90deg,var(--green),var(--blue));border-radius:4px;width:0%;transition:width .4s"></div></div>'
    +'</div></div>';
}

let selectedBookingCat='';

function selectBookingCat(cat, evId){
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!e)return;
  const tks=DB.g('tickets')||[];
  const myStudentTk=tks.find(t=>t.eid===evId&&t.uid===CU.id&&t.ttype==='student'&&t.status!=='cancelled');

  if(cat==='student'&&myStudentTk){toast('You already have a Student pass for this event.','error');return;}
  const maxNs=e.maxNonStudentGuests||4;
  const myNs=tks.filter(t=>t.eid===evId&&t.ttype==='nonstu'&&t.bookedBy===CU.id&&t.status!=='cancelled').length;
  if(cat==='nonstu'&&myNs>=maxNs){toast('Non-Student guest limit reached for this event.','error');return;}

  selectedBookingCat=cat;
  const nsPrice=e.price>0?Math.round(e.price*1.35):0;
  const price=cat==='student'?e.price:nsPrice;
  currentPayPrice=price;

  // Update UI
  const sBtn=document.getElementById('bcat-student');
  const nsBtn=document.getElementById('bcat-nonstu');
  if(sBtn) sBtn.style.border=cat==='student'?'2px solid var(--blue)':'2px solid var(--border)';
  if(sBtn) sBtn.style.background=cat==='student'?'rgba(61,125,232,.15)':'var(--surface2)';
  if(nsBtn) nsBtn.style.border=cat==='nonstu'?'2px solid var(--gold)':'2px solid var(--border)';
  if(nsBtn) nsBtn.style.background=cat==='nonstu'?'rgba(245,166,35,.1)':'var(--surface2)';

  const infoEl=document.getElementById('bcat-info');
  if(infoEl){
    if(cat==='student'){
      infoEl.innerHTML='<div style="background:rgba(61,125,232,.07);border:1px solid rgba(61,125,232,.2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.8rem"><div style="font-weight:700;color:var(--blue);margin-bottom:3px">🎓 Student Pass</div><div style="color:var(--text2)">One pass per student. Your college ID will be on the pass. Valid for this event only.</div></div>';
    } else {
      const remaining=maxNs-myNs;
      infoEl.innerHTML='<div style="background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.8rem"><div style="font-weight:700;color:var(--gold);margin-bottom:3px">🏫 Non-Student Guest Pass</div><div style="color:var(--text2)">'+remaining+' slot'+(remaining===1?'':'s')+' available. Guest name &amp; mobile required. No student pass needed.</div></div>';
    }
  }

  const totalEl=document.getElementById('pay-total');
  if(totalEl)totalEl.textContent=price===0?'FREE':'₹'+price;
  const procBtn=document.getElementById('bcat-proceed-btn');
  const freeBtn=document.getElementById('bcat-free-btn');
  if(price===0){if(procBtn)procBtn.style.display='none';if(freeBtn)freeBtn.style.display='block';}
  else{if(procBtn)procBtn.style.display='block';if(freeBtn)freeBtn.style.display='none';}
}

// Which step came before ps-2 (student=ps-1, nonstu=ps-15)
let _ps2From='ps-1';

function proceedWithCategory(evId){
  if(!selectedBookingCat){toast('Please select a booking category first.','error');return;}
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!e)return;

  const price=selectedBookingCat==='nonstu'
    ? (e.price>0?Math.round(e.price*(e.nsMultiplier||1.35)):0)
    : e.price;

  // Free event — direct confirm
  if(price===0){
    if(selectedBookingCat==='nonstu'){
      // For free non-student: open guest details modal after confirming
      closeOv('ov-pay');
      openNonStudentModal(evId);
    } else {
      confirmBooking(evId,true);
    }
    return;
  }

  // Paid — go to payment screen
  _showPayStep2(evId, price, selectedBookingCat);
}

function _showPayStep2(evId, price, cat){
  _pendingPayEvId=evId;
  _pendingPayAmt=price;
  _pendingPayTxnRef='NX'+Date.now();
  _ps2From='ps-1';
  ['ps-1','ps-3'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('on');});
  document.getElementById('ps-2').classList.add('on');
  const fmt='₹'+price.toLocaleString('en-IN');
  ['pay-total2','pay-amount-big'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmt;});
  const typeLbl=document.getElementById('pay-type-label');
  if(typeLbl)typeLbl.textContent=cat==='nonstu'?'🏫 Non-Student Guest':'🎓 Student Pass';
}

function confirmPayment(evId){
  // Instant booking — no UTR/verification needed
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!e){toast('Event not found','error');return;}

  if(selectedBookingCat==='nonstu'){
    closeOv('ov-pay');
    toast('✅ Payment confirmed! Haju guest details bharjo.','success');
    setTimeout(()=>openNonStudentModal(evId),400);
    return;
  }

  // Student pass — create ticket instantly
  confirmBooking(evId, false);
}

function backToStep1(){
  ['ps-2','ps-3'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('on');});
  document.getElementById('ps-1').classList.add('on');
}

// ── Non-student inline guest form helpers ────────────────────────────────
let _nsInlineGuests=[];
let _nsInlineEvId='';

function _renderNsInlineForms(qty, evId){
  _nsInlineEvId=evId;
  // Ensure array has right length
  while(_nsInlineGuests.length<qty)_nsInlineGuests.push({name:'',mobile:'',relation:'',idType:'Aadhar'});
  _nsInlineGuests=_nsInlineGuests.slice(0,qty);
  const c=document.getElementById('ns-inline-forms');
  if(!c)return;
  c.innerHTML=_nsInlineGuests.map((g,i)=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-weight:700;font-size:.82rem;color:var(--gold);margin-bottom:10px">Guest ${i+1}</div>
      <div class="fg"><label class="fl">Full Name *</label><input class="fi" id="nsf-name-${i}" placeholder="Guest full name" value="${g.name}" oninput="_nsUpdate(${i},'name',this.value)"></div>
      <div class="fg" style="margin-top:8px"><label class="fl">Mobile</label><input class="fi" id="nsf-mob-${i}" placeholder="10-digit mobile" maxlength="10" value="${g.mobile||''}" oninput="_nsUpdate(${i},'mobile',this.value)"></div>
      <div class="fg" style="margin-top:8px"><label class="fl">Relation / Description</label><input class="fi" id="nsf-rel-${i}" placeholder="e.g. Friend, Parent, Sibling" value="${g.relation||''}" oninput="_nsUpdate(${i},'relation',this.value)"></div>
      <div class="fg" style="margin-top:8px"><label class="fl">ID Type</label>
        <select class="fi" oninput="_nsUpdate(${i},'idType',this.value)">
          ${['Aadhar','PAN','Passport','Driving Licence','Other'].map(t=>`<option ${g.idType===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>`).join('');
}

function _nsUpdate(idx,field,val){if(_nsInlineGuests[idx])_nsInlineGuests[idx][field]=val;}

function setNsGuestQty(n, evId){
  // Update button styles
  for(let i=1;i<=4;i++){const b=document.getElementById('nsqty-'+i);if(b){b.style.border=i===n?'2px solid var(--blue)':'2px solid var(--border)';b.style.background=i===n?'rgba(61,125,232,.12)':'var(--surface2)';b.style.color=i===n?'var(--blue)':'var(--text)';}}
  // Update total display
  const evs=DB.g('events')||[];const e=evs.find(x=>x.id===evId);if(!e)return;
  const nsPrice=e.price>0?Math.round(e.price*(e.nsMultiplier||1.35)):0;
  const tot=document.getElementById('ns-total-show');if(tot)tot.textContent='₹'+(nsPrice*n);
  const qty=document.getElementById('ns-qty-show');if(qty)qty.textContent=n;
  _renderNsInlineForms(n,evId);
}

function proceedNonStudentToPayment(evId){
  // Validate guests
  for(let i=0;i<_nsInlineGuests.length;i++){
    if(!(_nsInlineGuests[i].name||'').trim()){toast('Guest '+(i+1)+' ka naam bharjo.','error');return;}
  }
  const evs=DB.g('events')||[];const e=evs.find(x=>x.id===evId);if(!e)return;
  const nsPrice=e.price>0?Math.round(e.price*(e.nsMultiplier||1.35)):0;
  const totalPrice=nsPrice*_nsInlineGuests.length;
  if(totalPrice===0){
    // Free — book directly
    _confirmNsBookings(evId);
    return;
  }
  _showPayStep2(evId, totalPrice, 'nonstu');
}

function selPay(method,el){
  selPayMethod=method;
  document.querySelectorAll('.pay-m').forEach(m=>m.classList.remove('on'));
  el.classList.add('on');
  ['upi','card','wallet'].forEach(m=>{const pf=document.getElementById('pf-'+m);if(pf)pf.className='pay-form-'+m+(m===method?' on':'');});
}

function fmtCard(el){
  let v=el.value.replace(/\D/g,'').substring(0,16);
  el.value=v.replace(/(\d{4})(?=\d)/g,'$1 ');
}

// ── Generate UPI QR code using drawQR() ──
function generateGPayQR(amount){
  const upiLink=`upi://pay?pa=${NEXUS_UPI_ID}&pn=${encodeURIComponent(NEXUS_UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('NEXUS Event Pass')}&tr=${_pendingPayTxnRef}`;
  const canvas=document.getElementById('gpay-qr-canvas');
  if(!canvas)return;
  // drawQR works correctly with QRCode.js
  drawQR(canvas, upiLink, ()=>{
    // After QR drawn — add GPay logo overlay in center
    try{
      const ctx=canvas.getContext('2d');
      const sz=canvas.width;
      const lsz=sz*0.22, lx=(sz-lsz)/2, ly=(sz-lsz)/2;
      // White circle background for logo
      ctx.beginPath();ctx.arc(sz/2,sz/2,lsz*0.72,0,Math.PI*2);
      ctx.fillStyle='#fff';ctx.fill();
      // Draw G letter
      ctx.font=`bold ${Math.round(lsz*0.7)}px Arial`;
      ctx.fillStyle='#4285F4';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('G',sz/2,sz/2);
      ctx.textBaseline='alphabetic';ctx.textAlign='left';
    }catch(e){}
  });
}

function _buildUpiLink(){
  return `upi://pay?pa=${NEXUS_UPI_ID}&pn=${encodeURIComponent(NEXUS_UPI_NAME)}&am=${_pendingPayAmt}&cu=INR&tn=${encodeURIComponent('NEXUS Event Pass - '+_pendingPayTxnRef)}&tr=${_pendingPayTxnRef}&mc=5411`;
}
function openGPay(){
  if(!_pendingPayEvId||!_pendingPayAmt){toast('Payment details missing — reload karo','error');return;}
  // Try GPay specific intent first, fallback to generic UPI
  const gpayIntent=`intent://pay?pa=${NEXUS_UPI_ID}&pn=${encodeURIComponent(NEXUS_UPI_NAME)}&am=${_pendingPayAmt}&cu=INR&tn=${encodeURIComponent('NEXUS Event Pass')}&tr=${_pendingPayTxnRef}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
  const upiLink=_buildUpiLink();
  // On Android: intent opens GPay directly. On iOS/Desktop: fallback to upi://
  const ua=navigator.userAgent.toLowerCase();
  if(ua.includes('android')){window.location.href=gpayIntent;}
  else{window.open(upiLink,'_blank');}
}
function openPhonePe(){
  if(!_pendingPayEvId||!_pendingPayAmt){toast('Payment details missing','error');return;}
  const ppIntent=`intent://pay?pa=${NEXUS_UPI_ID}&pn=${encodeURIComponent(NEXUS_UPI_NAME)}&am=${_pendingPayAmt}&cu=INR&tr=${_pendingPayTxnRef}#Intent;scheme=upi;package=com.phonepe.app;end`;
  const ua=navigator.userAgent.toLowerCase();
  if(ua.includes('android')){window.location.href=ppIntent;}
  else{window.open(_buildUpiLink(),'_blank');}
}
function openPaytm(){
  if(!_pendingPayEvId||!_pendingPayAmt){toast('Payment details missing','error');return;}
  const ptIntent=`intent://pay?pa=${NEXUS_UPI_ID}&pn=${encodeURIComponent(NEXUS_UPI_NAME)}&am=${_pendingPayAmt}&cu=INR&tr=${_pendingPayTxnRef}#Intent;scheme=upi;package=net.one97.paytm;end`;
  const ua=navigator.userAgent.toLowerCase();
  if(ua.includes('android')){window.location.href=ptIntent;}
  else{window.open(_buildUpiLink(),'_blank');}
}
function copyUpiId(){
  navigator.clipboard.writeText(NEXUS_UPI_ID).then(()=>toast('UPI ID copied! ₹'+_pendingPayAmt+' to '+NEXUS_UPI_ID,'success')).catch(()=>{toast('UPI ID: '+NEXUS_UPI_ID,'info');});
}

// ── Student enters UTR after paying ──
function submitUTR(evId){ /* removed — instant booking, no UTR needed */ }

// ── Old processPayment kept for free events fallback ──
function processPayment(evId){
  // Only called for free events now
  confirmBooking(evId,true);
}

function _confirmNsBookings(evId){
  // For free non-student events — book all inline guests directly
  const evs=DB.g('events')||[];
  const eIdx=evs.findIndex(e=>e.id===evId);
  if(eIdx===-1){toast('Event not found','error');return;}
  const e=evs[eIdx];
  const tks=DB.g('tickets')||[];
  const created=[];
  (_nsInlineGuests||[]).forEach(g=>{
    if(!g.name.trim())return;
    const tid='NEXUS'+Math.floor(1000000+Math.random()*9000000);
    tks.push({
      id:tid,eid:evId,uid:CU.id,bookedBy:CU.id,
      evName:e.name,evDate:e.date,evVenue:e.venue,
      ttype:'nonstu',ttypeLabel:'Non-Student Guest',
      qty:1,price:0,
      guestName:g.name,guestMobile:g.mobile||'—',guestRelation:g.relation||'—',
      guestIdType:g.idType||'Aadhar',
      referenceStudentId:CU.id,referenceStudentName:CU.fn+' '+CU.ln,
      status:'upcoming',
      bookedOn:new Date().toLocaleDateString('en-IN'),
      bookedAt:new Date().toISOString(),
      payMethod:'free',txnId:'FREE'+Date.now()
    });
    created.push(tid);
  });
  evs[eIdx].booked=Math.min((evs[eIdx].booked||0)+created.length,evs[eIdx].seats);
  DB.s('tickets',tks);DB.s('events',evs);
  closeOv('ov-pay');
  toast('🎉 '+created.length+' Guest pass'+(created.length>1?'es':'')+' booked!','success');
  addNotif('🏫 Guest Passes Booked!',created.length+' free guest pass'+(created.length>1?'es':'')+' for "'+e.name+'" ready chhe.','🏫','success');
  renderPage('tickets');
}

function confirmBooking(evId,isFree){
  const evs=DB.g('events')||[];
  const idx=evs.findIndex(e=>e.id===evId);
  if(idx===-1)return;
  const e=evs[idx];

  if(e.booked>=e.seats){toast('Sorry, no seats left!','error');closeOv('ov-pay');return;}

  const allTks=DB.g('tickets')||[];
  const alreadyStudent=allTks.find(t=>t.eid===evId&&t.uid===CU.id&&t.ttype==='student'&&t.status!=='cancelled');
  if(alreadyStudent){toast('You already have a pass for this event.','error');closeOv('ov-pay');return;}

  const price=isFree?0:(_pendingPayAmt||e.price);
  const tid='NEXUS'+Math.floor(1000000+Math.random()*9000000);
  const tk={
    id:tid,eid:evId,uid:CU.id,bookedBy:CU.id,
    evName:e.name,evDate:e.date,evVenue:e.venue,
    ttype:'student',ttypeLabel:'Student',qty:1,price,
    status:'upcoming',
    bookedOn:new Date().toLocaleDateString('en-IN'),
    bookedAt:new Date().toISOString(),
    payMethod:isFree?'free':'instant',
    txnId:'TXN'+Math.floor(Math.random()*9000000+1000000)
  };
  DB.push('tickets',tk);
  evs[idx].booked=Math.min(evs[idx].booked+1,evs[idx].seats);
  DB.s('events',evs);
  addNotif('🎉 Booking Confirmed!','Pass for "'+e.name+'" ready chhe. Download karo!','✅','success');
  setTimeout(()=>checkSeatsAlert(evId),500);
  closeOv('ov-pay');
  toast('🎉 Pass confirmed!'+(price>0?' ₹'+price+' paid':''),'success');
  // Show pass + email prompt
  setTimeout(()=>{
    showPass(tid);
    // After pass opens, show email prompt if user has email
    setTimeout(()=>_showEmailPromptOnPass(tid),600);
  },350);
}

function _showEmailPromptOnPass(tkId){
  // Insert email prompt card below pass actions if not already there
  const passActs=document.querySelector('.pass-actions');
  if(!passActs||document.getElementById('inline-email-prompt'))return;
  const u=CU;
  const div=document.createElement('div');
  div.id='inline-email-prompt';
  div.style.cssText='margin-top:12px;background:rgba(61,125,232,.07);border:1.5px solid rgba(61,125,232,.2);border-radius:14px;padding:14px 16px';
  div.innerHTML=`
    <div style="font-weight:700;font-size:.83rem;margin-bottom:6px">📧 Email your pass?</div>
    <div style="display:flex;gap:8px">
      <input type="email" id="quick-email-inp" value="${u?.em||''}" placeholder="your@email.com" class="fi" style="flex:1;font-size:.8rem">
      <button class="btn btn-blue" onclick="_quickEmailPass('${tkId}')" style="white-space:nowrap;font-size:.8rem">Send →</button>
    </div>
    <div id="quick-email-msg" style="font-size:.7rem;color:var(--text2);margin-top:5px">PDF with pass will be sent to your email</div>`;
  passActs.insertAdjacentElement('afterend',div);
}

// ════════════════════════════════════
// NON-STUDENT GUEST PASS SYSTEM
// ════════════════════════════════════
function openNonStudentModal(evId){
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!e){toast('Event not found','error');return;}
  if(e.status==='completed'){toast('This event is already completed.','error');return;}
  const allTks=DB.g('tickets')||[];
  // Count existing non-student passes booked by this student for this event
  const myNonstus=allTks.filter(t=>t.eid===evId&&t.ttype==='nonstu'&&t.status!=='cancelled'&&t.bookedBy===CU.id);
  const maxNs=e.maxNonStudentGuests||4;
  if(myNonstus.length>=maxNs){
    toast('Guest pass limit reached for this event. Maximum '+maxNs+' guest passes allowed.','error');
    return;
  }
  const remaining=maxNs-myNonstus.length;
  const nsPrice=e.price>0?Math.round(e.price*(e.nsMultiplier||1.35)):0;
  // myRegular is optional now — guest booking doesn't require student pass
  const myRegular=allTks.find(t=>t.eid===evId&&t.uid===CU.id&&t.ttype==='student'&&t.status!=='cancelled');
  document.getElementById('nonstu-content').innerHTML=buildNonStudentModal(e, myNonstus, remaining, nsPrice, myRegular);
  openOv('ov-nonstu');
  setTimeout(()=>renderNstuGuestForms(1),50);
}

let nstu_guests=[]; // temp list of guests being added in this session
let nstu_payMethod='upi';

function buildNonStudentModal(e, existingNonstus, remaining, nsPrice, myRegular){
  nstu_guests=[{name:'',relation:'',idType:'Aadhar'}]; // start with 1 guest
  const existingHTML=existingNonstus.length===0?'':`
    <div style="background:rgba(39,174,96,.06);border:1px solid rgba(39,174,96,.2);border-radius:10px;padding:12px;margin-bottom:16px">
      <div style="font-weight:700;font-size:.78rem;color:var(--green);margin-bottom:8px">✅ Previously Booked Guest Passes (${existingNonstus.length}/4)</div>
      ${existingNonstus.map((t,i)=>`<div style="font-size:.76rem;color:var(--text2);padding:4px 0;border-bottom:1px solid var(--border)">${i+1}. ${t.guestName||'Guest'} — ${t.guestRelation||'—'} · ₹${t.price} · <span style="color:${t.status==='upcoming'?'var(--blue)':'var(--accent)'}">
          ${t.status.toUpperCase()}</span>
          ${t.status!=='cancelled'?`<button onclick="cancelNonStuPass('${t.id}')" style="margin-left:8px;font-size:.65rem;background:rgba(232,76,61,.1);color:var(--accent);border:1px solid rgba(232,76,61,.2);border-radius:4px;padding:1px 7px;cursor:pointer">Cancel</button>`:''}
        </div>`).join('')}
    </div>`;

  return `
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border)">
    <div style="font-size:2.5rem">${e.icon}</div>
    <div>
      <div style="font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:800">${e.name}</div>
      <div style="font-size:.78rem;color:var(--text2)">📅 ${e.date} · 📍 ${e.venue}</div>
    </div>
  </div>

  <!-- Booking Student -->
  <div style="background:rgba(61,125,232,.07);border:1px solid rgba(61,125,232,.2);border-radius:10px;padding:12px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--teal));display:flex;align-items:center;justify-content:center;font-weight:800;font-family:'Outfit',sans-serif;font-size:1.1rem;flex-shrink:0">${CU.fn[0]}</div>
    <div>
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:1px">Booked By (Student)</div>
      <div style="font-weight:700">${CU.fn} ${CU.ln}</div>
      <div style="font-size:.74rem;color:var(--text2)">ID: ${CU.id} · ${CU.dept||'—'}${myRegular?' · Student Pass: '+myRegular.id:''}</div>
    </div>
  </div>

  ${existingHTML}

  <!-- Remaining count info -->
  <div style="background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:.8rem;display:flex;justify-content:space-between;align-items:center">
    <span style="color:var(--text2)">🏫 Max <strong style="color:var(--text)">${remaining}</strong> guest passes can be added</span>
    <span style="font-weight:700;color:var(--gold)">₹${nsPrice} <span style="font-weight:400;color:var(--text2);font-size:.72rem">per guest</span></span>
  </div>

  <!-- Guest count selector -->
  <div style="margin-bottom:16px">
    <label class="fl">Number of Guests? (1 to ${remaining} )</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${Array.from({length:remaining},(_,i)=>i+1).map(n=>`
        <button class="nstu-qty-btn ${n===1?'active':''}" onclick="setNstuQty(${n})" style="padding:8px 18px;border-radius:8px;border:2px solid ${n===1?'var(--blue)':'var(--border)'};background:${n===1?'rgba(61,125,232,.12)':'var(--surface2)'};color:${n===1?'var(--blue)':'var(--text)'};font-weight:700;cursor:pointer;font-size:.9rem;transition:all .2s">${n}</button>
      `).join('')}
    </div>
  </div>

  <!-- Guest Details Form -->
  <div id="nstu-guests-form"></div>

  <!-- Price Summary -->
  <div id="nstu-price-summary" style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:18px">
    <div style="display:flex;justify-content:space-between;font-size:.84rem;margin-bottom:6px"><span style="color:var(--text2)">Per Guest</span><span>₹${nsPrice}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:.84rem;margin-bottom:6px"><span style="color:var(--text2)">Guests</span><span id="nstu-qty-disp">1</span></div>
    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border)">
      <span style="font-weight:700">Total</span>
      <span id="nstu-total-disp" data-per="${nsPrice}" style="font-family:'Outfit',sans-serif;font-size:1.4rem;font-weight:800;color:var(--gold)">₹${nsPrice}</span>
    </div>
  </div>

  <!-- Payment -->
  <div style="margin-bottom:18px">
    <div style="font-weight:700;font-size:.84rem;margin-bottom:10px;color:var(--text2)">💳 Payment Method</div>
    <div class="pay-methods" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="pay-m on" id="nspm-upi" onclick="setNstuPay('upi')"><div class="pay-m-icon">📱</div><div class="pay-m-lbl">UPI</div></div>
      <div class="pay-m" id="nspm-card" onclick="setNstuPay('card')"><div class="pay-m-icon">💳</div><div class="pay-m-lbl">Card</div></div>
      <div class="pay-m" id="nspm-wallet" onclick="setNstuPay('wallet')"><div class="pay-m-icon">👛</div><div class="pay-m-lbl">Wallet</div></div>
    </div>
    <div id="nspf-upi" style="margin-top:12px">
      <div class="fg"><label class="fl">UPI ID</label><input class="fi" id="nsupi-id" placeholder="yourname@upi" value="student@paytm"></div>
    </div>
    <div id="nspf-card" style="display:none;margin-top:12px">
      <div class="fr">
        <div class="fg"><label class="fl">Card Number</label><input class="fi" id="nscard-n" placeholder="4242 4242 4242 4242" maxlength="19" oninput="fmtCard(this)"></div>
        <div class="fg"><label class="fl">Name on Card</label><input class="fi" id="nscard-nm" placeholder="Your Name"></div>
      </div>
      <div class="fr">
        <div class="fg"><label class="fl">Expiry</label><input class="fi" id="nscard-exp" placeholder="MM/YY" maxlength="5"></div>
        <div class="fg"><label class="fl">CVV</label><input class="fi" id="nscard-cvv" placeholder="123" maxlength="3" type="password"></div>
      </div>
    </div>
    <div id="nspf-wallet" style="display:none;margin-top:12px">
      <div class="fg"><label class="fl">Select Wallet</label><select class="fi" id="nswallet-sel"><option>Paytm Wallet</option><option>PhonePe Wallet</option><option>Amazon Pay</option></select></div>
      <div class="fg"><label class="fl">Mobile</label><input class="fi" id="nswallet-mob" placeholder="Registered mobile" value="9876543210"></div>
    </div>
  </div>

  <div style="display:flex;gap:10px">
    <button class="btn btn-ghost" onclick="closeOv('ov-nonstu')">Cancel</button>
    <button class="btn btn-blue btn-full btn-lg" onclick="processNonStudentBooking('${e.id}',${nsPrice})">💳 Pay &amp; Book Guest Pass →</button>
  </div>`;
}

function setNstuQty(n){
  nstu_guests=Array.from({length:n},(_,i)=>({name:'',relation:'',idType:'Aadhar'}));
  // Update qty buttons
  document.querySelectorAll('.nstu-qty-btn').forEach((btn,i)=>{
    const isActive=(i+1)===n;
    btn.style.borderColor=isActive?'var(--blue)':'var(--border)';
    btn.style.background=isActive?'rgba(61,125,232,.12)':'var(--surface2)';
    btn.style.color=isActive?'var(--blue)':'var(--text)';
  });
  // Render guest forms
  renderNstuGuestForms(n);
  // Update price
  const nsTotal=parseInt(document.getElementById('nstu-total-disp')?.dataset?.perPrice||0)*n||0;
  const perPriceEl=document.getElementById('nstu-price-summary');
  if(perPriceEl){
    const perP=parseInt(perPriceEl.querySelector('span:last-child')?.textContent?.replace('₹','')||0);
  }
  const qdisp=document.getElementById('nstu-qty-disp');
  if(qdisp)qdisp.textContent=n;
  const totalEl=document.getElementById('nstu-total-disp');
  if(totalEl){
    const perPrice=parseInt(totalEl.dataset.per||0);
    if(perPrice) totalEl.textContent='₹'+(perPrice*n);
  }
}

function renderNstuGuestForms(qty){
  const container=document.getElementById('nstu-guests-form');
  if(!container)return;
  container.innerHTML=Array.from({length:qty},(_,i)=>`
    <div style="background:rgba(245,166,35,.05);border:1.5px solid rgba(245,166,35,.3);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-weight:700;font-size:.84rem;color:var(--gold);margin-bottom:12px">👤 Guest ${qty>1?i+1:''}</div>
      <div class="fg" style="margin-bottom:10px">
        <label class="fl">Guest Full Name *</label>
        <input class="fi" id="nsg-name-${i}" placeholder="Guest full name" autocomplete="off">
      </div>
      <div class="fg" style="margin:0">
        <label class="fl">Guest Mobile Number *</label>
        <div style="position:relative">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text2);font-weight:600">+91</span>
          <input class="fi" id="nsg-mob-${i}" placeholder="10-digit mobile number" type="tel" maxlength="10" inputmode="numeric" style="padding-left:42px">
        </div>
      </div>
    </div>`).join('');
}

function updateNstuGuest(idx,field,val){
  if(nstu_guests[idx]) nstu_guests[idx][field]=val;
}

function setNstuPay(method){
  nstu_payMethod=method;
  ['upi','card','wallet'].forEach(m=>{
    const pm=document.getElementById('nspm-'+m);
    const pf=document.getElementById('nspf-'+m);
    if(pm)pm.className='pay-m'+(m===method?' on':'');
    if(pf)pf.style.display=m===method?'block':'none';
  });
}

function processNonStudentBooking(evId,nsPrice){
  // Validate guest naam + mobile
  for(let i=0;i<nstu_guests.length;i++){
    const nameEl=document.getElementById(`nsg-name-${i}`);
    const mobEl=document.getElementById(`nsg-mob-${i}`);
    const name=nameEl?.value.trim()||'';
    const mob=(mobEl?.value||'').replace(/\D/g,'');
    if(!name){toast(`Guest ${i+1}: please enter name`,'error');nameEl?.focus();return;}
    if(mob.length!==10){toast(`Guest ${i+1}: enter valid 10-digit mobile number`,'error');mobEl?.focus();return;}
    nstu_guests[i].name=name;
    nstu_guests[i].mobile='+91'+mob;
    nstu_guests[i].relation='Guest';
    nstu_guests[i].idType='Aadhar Card';
  }
  // Validate payment
  if(nstu_payMethod==='upi'){
    const upi=document.getElementById('nsupi-id')?.value.trim()||'';
    if(!upi.includes('@')){toast('Please enter a valid UPI ID','error');return;}
  } else if(nstu_payMethod==='card'){
    const n=(document.getElementById('nscard-n')?.value||'').replace(/\s/g,'');
    const exp=document.getElementById('nscard-exp')?.value||'';
    const cvv=document.getElementById('nscard-cvv')?.value||'';
    const nm=document.getElementById('nscard-nm')?.value.trim()||'';
    if(n.length<16){toast('Please enter a valid 16-digit card number','error');return;}
    if(!exp.match(/^\d{2}\/\d{2}$/)){toast('Please enter expiry in MM/YY format','error');return;}
    if(cvv.length<3){toast('Please enter 3-digit CVV','error');return;}
    if(!nm){toast('Please enter name on card','error');return;}
  }

  // Check again how many passes left
  const allTks=DB.g('tickets')||[];
  const existingNonstus=allTks.filter(t=>t.eid===evId&&t.ttype==='nonstu'&&t.status!=='cancelled'&&t.bookedBy===CU.id);
  const evNs=DB.g('events')||[];const evNsObj=evNs.find(x=>x.id===evId);
  const canAdd=Math.max(0,(evNsObj?.maxNonStudentGuests||4)-existingNonstus.length);
  if(nstu_guests.length>canAdd){
    toast(`❌ Only ${canAdd} more guest passes can be added.`,'error');
    return;
  }

  // Show processing UI
  const content=document.getElementById('nonstu-content');
  content.innerHTML=`
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:3rem;margin-bottom:14px;animation:spin .8s linear infinite">⚙️</div>
      <div style="font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:700;margin-bottom:6px">Processing Payment...</div>
      <div style="color:var(--text2);font-size:.84rem;margin-bottom:18px">Please do not close this window</div>
      <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;max-width:260px;margin:0 auto">
        <div id="nstu-progress" style="height:100%;background:linear-gradient(90deg,var(--blue),var(--teal));border-radius:4px;width:0%;transition:width .3s"></div>
      </div>
    </div>`;

  let prog=0;
  const iv=setInterval(()=>{
    prog+=Math.random()*15+5;
    const el=document.getElementById('nstu-progress');
    if(el)el.style.width=Math.min(prog,95)+'%';
    if(prog>=95){
      clearInterval(iv);
      setTimeout(()=>{
        if(el)el.style.width='100%';
        setTimeout(()=>confirmNonStudentBookings(evId,nsPrice),400);
      },600);
    }
  },300);
}

function confirmNonStudentBookings(evId,nsPrice){
  const evs=DB.g('events')||[];
  const idx=evs.findIndex(e=>e.id===evId);
  if(idx===-1){closeOv('ov-nonstu');return;}
  const e=evs[idx];
  const allTks=DB.g('tickets')||[];
  const myRegular=allTks.find(t=>t.eid===evId&&t.uid===CU.id&&t.ttype==='student'&&t.status!=='cancelled');
  const createdIds=[];

  nstu_guests.forEach(g=>{
    if(e.booked>=e.seats){toast('❌ Seats full!','error');return;}
    const tid='NEXUS'+Math.floor(1000000+Math.random()*9000000);
    const tk={
      id:tid, eid:evId, uid:CU.id, bookedBy:CU.id,
      evName:e.name, evDate:e.date, evVenue:e.venue,
      ttype:'nonstu', ttypeLabel:'Non-Student Guest', qty:1, price:nsPrice,
      guestName:g.name, guestMobile:g.mobile||'—', guestRelation:g.relation, guestIdType:g.idType,
      referenceStudentName:CU.fn+' '+CU.ln,
      referenceStudentId:CU.id,
      referencePassId:myRegular?.id||'',
      status:'upcoming',
      bookedOn:new Date().toLocaleDateString('en-IN'),
      bookedAt:new Date().toISOString(),
      payMethod:nstu_payMethod,
      txnId:'TXN'+Math.floor(Math.random()*9000000+1000000)
    };
    DB.push('tickets',tk);
    evs[idx].booked=Math.min(evs[idx].booked+1, evs[idx].seats);
    createdIds.push(tid);
  });

  DB.s('events',evs);

  const guestNames=nstu_guests.map(g=>g.name).join(', ');
  addNotif('Guest Passes Confirmed!',`${nstu_guests.length} Non-Student guest pass${nstu_guests.length>1?'es':''} for "${e.name}" confirmed.`,'✅','success');
  toast(`🎉 ${nstu_guests.length} Guest pass${nstu_guests.length>1?'es':''} book thaya! (${guestNames})`,'success');

  // Show success screen
  const content=document.getElementById('nonstu-content');
  const allTks2=DB.g('tickets')||[];
  const myNonstusNow=allTks2.filter(t=>t.eid===evId&&t.ttype==='nonstu'&&t.status!=='cancelled'&&t.bookedBy===CU.id);
  const evForCan=DB.g('events')||[];const evCanObj=evForCan.find(x=>x.id===evId);
  const maxNsCan=evCanObj?.maxNonStudentGuests||4;
  const canAddMore=Math.max(0,maxNsCan-myNonstusNow.length);

  content.innerHTML=`
    <div style="text-align:center;padding:24px 0 16px">
      <div style="font-size:3rem;margin-bottom:10px">🎉</div>
      <div style="font-family:'Outfit',sans-serif;font-size:1.4rem;font-weight:800;margin-bottom:6px;color:var(--green)">Guest Passes Ready!</div>
      <div style="font-size:.84rem;color:var(--text2);margin-bottom:20px">${nstu_guests.length} pass${nstu_guests.length>1?'es':''} confirmed for: <strong style="color:var(--text)">${guestNames}</strong></div>
    </div>
    <div style="background:rgba(39,174,96,.06);border:1px solid rgba(39,174,96,.2);border-radius:12px;padding:14px;margin-bottom:16px">
      ${createdIds.map((tid,i)=>{
        const t=DB.g('tickets')?.find(x=>x.id===tid);
        return `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:.82rem">
          <strong>${nstu_guests[i]?.name||'Guest '+(i+1)}</strong> — ${nstu_guests[i]?.relation||'Guest'}
          <span style="float:right;font-family:'JetBrains Mono';font-size:.7rem;color:var(--teal)">${tid}</span>
        </div>`;
      }).join('')}
      <div style="font-size:.74rem;color:var(--text2);margin-top:8px">📋 Reference: ${CU.fn} ${CU.ln} (${CU.id})</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${createdIds.map((tid,i)=>`<button class="btn btn-ghost btn-sm" onclick="showPassById('${tid}')">🎫 ${nstu_guests[i]?.name||'Guest '+(i+1)} QR</button>`).join('')}
    </div>
    ${canAddMore>0?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:.78rem;color:var(--text2);margin-bottom:8px">⬆️ You can still add ${canAddMore} more guest pass${canAddMore>1?'es':''}.</div>
      <button class="btn btn-blue btn-sm" onclick="openNonStudentModal('${evId}')">🏫 Add More Guest Passes →</button>
    </div>`:'<div style="margin-top:12px;font-size:.78rem;color:var(--gold);text-align:center">✅ Maximum 4 guest passes issued for this event.</div>'}
    <div style="margin-top:12px">
      <button class="btn btn-ghost btn-full btn-sm" onclick="closeOv('ov-nonstu')">Close</button>
    </div>`;
}

function showPassById(tkId){
  closeOv('ov-nonstu');
  setTimeout(()=>showPass(tkId),200);
}

function cancelNonStuPass(tkId){
  if(!confirm('Guest pass cancel karvu che? Refund request open thase.'))return;
  requestRefund(tkId);
  // Re-render the non-student modal to reflect change (if still open)
}


function showPass(tkId){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);
  if(!t){toast('Pass not found','error');return;}
  const u=getAllUsers().find(x=>x.id===t.uid)||CU;
  const isNonStu=t.ttype==='nonstu';
  const holderName=isNonStu?(t.guestName||'Guest'):`${u?.fn||''} ${u?.ln||''}`;
  const holderId=isNonStu?`Ref: ${t.referenceStudentId||t.uid}`:u?.id||'—';
  const holderDept=isNonStu?(t.guestRelation?t.guestRelation+' of '+t.referenceStudentName:u?.dept||'—'):u?.dept||'—';
  document.getElementById('pass-content').innerHTML=`
    <div class="pass-card ${isNonStu?'nonstu-card':''}">
      <div class="pass-header">
        <div class="pass-brand">
          <div class="pass-brand-name">NEXUS</div>
          <div class="pass-brand-sub">Event Pass</div>
        </div>
        <div class="pass-badge">${isNonStu?'🏫':'🎟️'} ${t.ttypeLabel||t.ttype?.toUpperCase()||'REGULAR'}${t.qty&&t.qty>1?` ×${t.qty}`:''}</div>
      </div>
      <div class="pass-body">
        <div class="pass-title">${t.evName}</div>
        <div class="pass-sub">
          <span>📅 ${t.evDate}</span>
          <span>📍 ${t.evVenue}</span>
        </div>
        ${isNonStu?`<div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:.74rem;display:flex;gap:8px;align-items:center">
          <span style="font-size:1.1rem">🏫</span>
          <div><div style="color:var(--gold);font-weight:700">Non-Student Guest Pass</div>
          <div style="color:var(--text2)">Valid ID required at gate</div></div>
        </div>`:''}
        <div class="pass-qr-row">
          <div style="flex-shrink:0">
            <div class="pass-qr" id="qr-render-${tkId}" style="line-height:0;display:inline-block"></div>
            <div class="pass-qr-label">Scan at gate</div>
          </div>
          <div class="pass-meta" style="flex:1">
            <div class="pm-box"><div class="pm-l">${isNonStu?'Guest Name':'Holder'}</div><div class="pm-v">${holderName}</div></div>
            <div class="pm-box"><div class="pm-l">${isNonStu?'Reference':'College ID'}</div><div class="pm-v" style="font-family:'JetBrains Mono';font-size:.72rem">${holderId}</div></div>
            <div class="pm-box"><div class="pm-l">Amount Paid</div><div class="pm-v" style="color:var(--gold)">${t.price===0?'FREE':'₹'+t.price}</div></div>
            <div class="pm-box"><div class="pm-l">${isNonStu?'Relation':'Dept'}</div><div class="pm-v">${holderDept}</div></div>
            <div class="pm-box" style="grid-column:span 2"><div class="pm-l">Transaction ID</div><div class="pm-v" style="font-family:'JetBrains Mono';font-size:.7rem;color:var(--text2)">${t.id||'—'}</div></div>
          </div>
        </div>
      </div>
      <div class="pass-divider"><div class="pass-notch"></div><div style="flex:1"></div><div class="pass-notch"></div></div>
      <div class="pass-footer">
        <div class="pass-footer-id">${t.id}</div>
        <div class="pass-footer-status" style="background:${t.status==='upcoming'?'rgba(61,125,232,.15)':t.status==='used'?'rgba(136,136,168,.1)':'rgba(39,174,96,.12)'};color:${t.status==='upcoming'?'var(--blue)':t.status==='used'?'var(--text2)':'var(--green)'};border:1px solid ${t.status==='upcoming'?'rgba(61,125,232,.3)':t.status==='used'?'rgba(136,136,168,.2)':'rgba(39,174,96,.3)'}">${t.status.toUpperCase()}</div>
      </div>
    </div>
    <div class="pass-actions">
      <button class="btn btn-red" style="flex:1;justify-content:center" onclick="downloadPassPDF('${tkId}')">&#128229; Download PDF</button>
      <button onclick="saveToGoogleWallet('${tkId}')" style="background:#fff;border:none;border-radius:10px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);flex-shrink:0" title="Save to Google Wallet"><svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M43.6 20.5H24v7.5h11.2c-1 5.2-5.5 9-11.2 9-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.3-5.3C33.6 7.5 29 5.5 24 5.5 13.8 5.5 5.5 13.8 5.5 24S13.8 42.5 24 42.5c10.7 0 20-7.8 20-20 0-1.3-.2-2.7-.4-4z" fill="#4285F4"/><path d="M6.3 14.7l6.2 4.5C14.1 15.1 18.7 12 24 12c3 0 5.7 1.1 7.8 2.9l5.3-5.3C33.6 7.5 29 5.5 24 5.5c-7.5 0-14 4.3-17.7 9.2z" fill="#EA4335"/><path d="M24 42.5c4.9 0 9.4-1.8 12.8-4.8l-5.9-5c-1.9 1.4-4.3 2.2-6.9 2.2-5.6 0-10.3-3.8-11.9-8.9l-6.2 4.8C7.9 38 15.4 42.5 24 42.5z" fill="#34A853"/><path d="M43.6 20.5H24v7.5h11.2c-.5 2.5-1.8 4.7-3.7 6.2l5.9 5c3.5-3.2 5.6-8 5.6-13.2 0-1.3-.2-2.7-.4-4z" fill="#FBBC05"/></svg><span style="font-size:.7rem;font-weight:700;color:#3c4043">Save</span></button>
      <button class="btn btn-ghost btn-sm" onclick="sharePass('${tkId}')">&#128228;</button>
    </div>
    ${t.ttype==='student'&&t.status!=='cancelled'?`<div style="margin-top:8px">
      <button class="btn btn-full btn-sm" style="background:rgba(61,125,232,.08);color:var(--blue);border:1px solid rgba(61,125,232,.2)" onclick="closeOv('ov-pass');setTimeout(()=>openNonStudentModal('${t.eid}'),200)">🏫 Add Non-Student Guest Pass →</button>
    </div>`:''}
    <div style="margin-top:8px;display:flex;gap:8px;align-items:stretch">
      <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="openFeedbackFor('${t.eid}','${t.evName}')">⭐ Rate</button>
      ${t.status!=='used'&&t.status!=='cancelled'?`<button class="btn btn-sm" style="flex:1;justify-content:center;background:rgba(232,76,61,.08);color:var(--accent);border:1px solid rgba(232,76,61,.2)" onclick="requestRefund('${tkId}')">↩️ ${isNonStu?'Cancel & Refund':'Refund'}</button>`:''}
    </div>`;
  openOv('ov-pass');
  // Draw QR with proper callback to ensure it renders
  const _drawPassQR=()=>{
    const qrEl=document.getElementById(`qr-render-${tkId}`);
    if(!qrEl){setTimeout(_drawPassQR,150);return;}
    qrEl.innerHTML='';
    const qcv=document.createElement('canvas');
    qcv.width=160;qcv.height=160;
    drawQR(qcv,`NEXUS|${t.id}|${t.uid}|${t.eid}`,()=>{
      qrEl.innerHTML='';
      qrEl.appendChild(qcv);
    });
  };
  setTimeout(_drawPassQR,120);
}

function downloadPassPDF(tkId){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);
  if(!t){toast('Pass not found','error');return;}
  const u=(getAllUsers()||[]).find(x=>x.id===t.uid)||CU;
  const isNS=t.ttype==='nonstu';

  // ── Load Google Fonts into canvas via FontFace API ──────────────────────
  const _fonts=[
    new FontFace('Outfit','url(https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4S-EiAou6Y.woff2)',{weight:'900'}),
    new FontFace('Outfit','url(https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4S-EiAou6Y.woff2)',{weight:'700'}),
    new FontFace('JetBrains Mono','url(https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTk6OThhvA.woff2)',{weight:'400'}),
  ];
  Promise.allSettled(_fonts.map(f=>f.load().then(lf=>{document.fonts.add(lf);return lf;}))).then(()=>_buildPassPDF(t,u,isNS));
}

function _buildPassPDF(t,u,isNS){
  const holderName=isNS?(t.guestName||'Guest'):[u?.fn||'',u?.ln||''].join(' ').trim()||'—';
  const holderId  =isNS?('Ref: '+(t.referenceStudentId||t.uid)):(u?.id||'—');
  const holderDept=isNS?(t.guestRelation?(t.guestRelation+' of '+(t.referenceStudentName||'')):(u?.dept||'—')):(u?.dept||'—');

  const isStudent=!isNS;
  // Palette
  const bgTop=isNS?'#1c1000':'#0d1321';
  const bgMid=isNS?'#2a1800':'#141a38';
  const bgBot=isNS?'#1a1200':'#0b1526';
  const accentC=isNS?'#fbbf24':'#818cf8';
  const accentBg=isNS?'rgba(245,166,35,.14)':'rgba(99,102,241,.16)';
  const accentBd=isNS?'rgba(245,166,35,.5)':'rgba(99,102,241,.5)';
  const accentGlow=isNS?'rgba(245,166,35,.6)':'rgba(99,102,241,.65)';
  const goldC='#f5a623';
  const stC=t.status==='upcoming'?'#60a5fa':t.status==='used'?'rgba(255,255,255,.4)':'#4ade80';
  const stBg=t.status==='upcoming'?'rgba(96,165,250,.15)':t.status==='used'?'rgba(150,150,180,.10)':'rgba(74,222,128,.14)';
  const stBd=t.status==='upcoming'?'rgba(96,165,250,.35)':t.status==='used'?'rgba(150,150,180,.25)':'rgba(74,222,128,.35)';

  toast('\u23F3 Generating pass\u2026','info');

  // Canvas — fixed card proportions like screenshot
  const SC=3, W=460, H=660, PAD=24, RAD=20;
  const HDR=78, QR_SZ=152, QR_PD=9, QR_BOX=QR_SZ+QR_PD*2;
  const mColW=W-PAD-QR_BOX-14-PAD;
  const MBH=56, MBG=6, MBW=(mColW-MBG)/2;

  const cv=document.createElement('canvas');
  cv.width=W*SC; cv.height=H*SC;
  const ctx=cv.getContext('2d');
  ctx.scale(SC,SC);

  function rr(x,y,w,h,r,fill,stroke,sw){
    ctx.beginPath();
    if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);}
    else{const rr2=Math.min(r,w/2,h/2);ctx.moveTo(x+rr2,y);ctx.lineTo(x+w-rr2,y);ctx.arcTo(x+w,y,x+w,y+rr2,rr2);ctx.lineTo(x+w,y+h-rr2);ctx.arcTo(x+w,y+h,x+w-rr2,y+h,rr2);ctx.lineTo(x+rr2,y+h);ctx.arcTo(x,y+h,x,y+h-rr2,rr2);ctx.lineTo(x,y+rr2);ctx.arcTo(x,y,x+rr2,y,rr2);ctx.closePath();}
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw||1;ctx.stroke();}
  }

  const qrCv=document.createElement('canvas');
  qrCv.width=200; qrCv.height=200;

  function renderPass(){
    // Background
    const bg=ctx.createLinearGradient(0,0,W*0.55,H);
    bg.addColorStop(0,bgTop);bg.addColorStop(0.4,bgMid);bg.addColorStop(1,bgBot);
    rr(0,0,W,H,RAD,bg,isNS?'rgba(245,166,35,.28)':'rgba(99,132,255,.22)',1.2);

    // Glow corners
    const g1=ctx.createRadialGradient(W,0,0,W,0,260);g1.addColorStop(0,isNS?'rgba(245,166,35,.09)':'rgba(99,102,241,.12)');g1.addColorStop(1,'transparent');
    ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);
    const g2=ctx.createRadialGradient(0,H,0,0,H,180);g2.addColorStop(0,isNS?'rgba(200,140,0,.06)':'rgba(20,184,166,.07)');g2.addColorStop(1,'transparent');
    ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);

    // NEXUS wordmark
    ctx.save();ctx.shadowColor=accentGlow;ctx.shadowBlur=24;
    ctx.font='900 36px "Outfit",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='left';
    ctx.fillText('NEXUS',PAD,PAD+32);ctx.restore();
    ctx.font='600 8.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.28)';
    ctx.letterSpacing='0.24em';ctx.fillText('EVENT PASS',PAD,PAD+49);ctx.letterSpacing='0';

    // Pass type badge (no emoji — text only)
    const badgeTxt=isNS?'NON-STUDENT GUEST':'STUDENT';
    ctx.font='700 9.5px "Outfit",sans-serif';
    const bW=ctx.measureText(badgeTxt).width+22,bH=24,bX=W-PAD-bW,bY=PAD+10;
    ctx.save();ctx.shadowColor=isNS?'rgba(245,166,35,.25)':'rgba(99,102,241,.25)';ctx.shadowBlur=8;
    rr(bX,bY,bW,bH,12,accentBg,accentBd,1.2);ctx.restore();
    ctx.fillStyle=accentC;ctx.textAlign='center';ctx.letterSpacing='0.06em';
    ctx.fillText(badgeTxt,bX+bW/2,bY+16.5);ctx.letterSpacing='0';ctx.textAlign='left';

    // Header divider
    ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=1;
    ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(PAD,HDR);ctx.lineTo(W-PAD,HDR);ctx.stroke();ctx.setLineDash([]);

    // Event name
    let yy=HDR+19;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=10;
    ctx.font='900 20px "Outfit",sans-serif';ctx.fillStyle='#fff';
    const evN=(t.evName||'Event');
    if(ctx.measureText(evN).width>W-PAD*2){
      // Wrap
      const words=evN.split(' ');let l1='',l2='';
      for(const w of words){if(ctx.measureText(l1+w+' ').width<W-PAD*2-80)l1+=w+' ';else l2+=w+' ';}
      ctx.fillText(l1.trim(),PAD,yy+16);
      ctx.font='700 16px "Outfit",sans-serif';ctx.fillText(l2.trim(),PAD,yy+32);yy+=40;
    } else {
      ctx.fillText(evN,PAD,yy+16);yy+=24;
    }
    ctx.restore();

    // Date + venue (text, no emoji)
    if(t.evDate){
      ctx.font='11px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.36)';
      let meta=t.evDate;if(t.evVenue)meta+='  |  '+t.evVenue.substring(0,22);
      ctx.fillText(meta,PAD,yy);yy+=18;
    }

    // Non-student banner (text only)
    if(isNS){
      yy+=6;
      const banH=42;
      rr(PAD,yy,W-PAD*2,banH,9,'rgba(245,166,35,.07)','rgba(245,166,35,.22)',1);
      ctx.font='700 12px "Outfit",sans-serif';ctx.fillStyle='#fbbf24';
      ctx.fillText('Non-Student Guest Pass',PAD+12,yy+18);
      ctx.font='10px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.40)';
      ctx.fillText('Valid ID required at gate',PAD+12,yy+32);
      yy+=banH+8;
    } else {yy+=4;}

    // QR white card
    const qrX=PAD,qrY=yy;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=20;
    rr(qrX,qrY,QR_BOX,QR_BOX,12,'#fff');ctx.restore();
    ctx.drawImage(qrCv,qrX+QR_PD,qrY+QR_PD,QR_SZ,QR_SZ);
    ctx.font='600 7.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.24)';ctx.textAlign='center';
    ctx.letterSpacing='0.14em';ctx.fillText('SCAN AT GATE',qrX+QR_BOX/2,qrY+QR_BOX+13);
    ctx.letterSpacing='0';ctx.textAlign='left';

    // Meta boxes — 2x2 grid + TXN full width
    const mX=qrX+QR_BOX+14;
    const fields=isNS
      ?[['GUEST NAME',holderName],['REFERENCE',holderId],['AMOUNT PAID',t.price===0?'FREE':'Rs.'+t.price,'gold'],['RELATION',holderDept.substring(0,16)]]
      :[['HOLDER',holderName],['COLLEGE ID',holderId],['AMOUNT PAID',t.price===0?'FREE':'Rs.'+t.price,'gold'],['DEPT',holderDept.substring(0,16)]];

    fields.forEach(([lbl,val,cl],idx2)=>{
      const c=idx2%2,r=Math.floor(idx2/2);
      const bx=mX+c*(MBW+MBG),by=qrY+r*(MBH+MBG);
      rr(bx,by,MBW,MBH,9,'rgba(255,255,255,.055)','rgba(255,255,255,.09)',1);
      ctx.font='600 6.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.30)';ctx.letterSpacing='0.12em';
      ctx.fillText(lbl,bx+9,by+14);ctx.letterSpacing='0';
      const vc=cl==='gold'?goldC:'rgba(255,255,255,.92)';
      const vs=String(val);
      ctx.fillStyle=vc;
      if(ctx.measureText('700 12px Outfit') && ctx.measureText(vs).width>MBW-16){
        ctx.font='700 10.5px "Outfit",sans-serif';
        const ws=vs.split(' ');let l1='',l2='';
        for(const w of ws){if(ctx.measureText(l1+w+' ').width<MBW-12)l1+=w+' ';else l2+=w+' ';}
        ctx.fillText(l1.trim(),bx+9,by+32);ctx.font='600 10px "Outfit",sans-serif';ctx.fillText(l2.trim(),bx+9,by+44);
      } else {
        ctx.font='700 12px "Outfit",sans-serif';ctx.fillText(vs,bx+9,by+36);
      }
    });

    // TXN ID — full width
    const txY=qrY+2*(MBH+MBG);
    rr(mX,txY,mColW,MBH,9,'rgba(255,255,255,.055)','rgba(255,255,255,.09)',1);
    ctx.font='600 6.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.30)';ctx.letterSpacing='0.12em';
    ctx.fillText('TRANSACTION ID',mX+9,txY+14);ctx.letterSpacing='0';
    ctx.font='700 11px "JetBrains Mono",monospace';ctx.fillStyle='rgba(255,255,255,.48)';
    ctx.fillText(t.id||'—',mX+9,txY+36);

    // Notch divider
    const blockBot=Math.max(qrY+QR_BOX+18, txY+MBH+10);
    yy=blockBot;
    const nR=12;
    const bgFill=bgBot;
    ctx.fillStyle=bgFill;
    ctx.beginPath();ctx.arc(-nR+1,yy,nR,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(W+nR-1,yy,nR,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.2;
    ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(22,yy);ctx.lineTo(W-22,yy);ctx.stroke();ctx.setLineDash([]);
    yy+=14;

    // Footer
    ctx.font='400 9px "JetBrains Mono",monospace';ctx.fillStyle='rgba(255,255,255,.22)';
    ctx.fillText(t.id,PAD,yy+16);
    const stTxt=(t.status||'UPCOMING').toUpperCase();
    ctx.font='700 9px "Outfit",sans-serif';
    const sW=ctx.measureText(stTxt).width+24,sX=W-PAD-sW,sY=yy+4;
    ctx.save();ctx.shadowColor=stC;ctx.shadowBlur=8;
    rr(sX,sY,sW,22,11,stBg,stBd,1.1);ctx.restore();
    ctx.fillStyle=stC;ctx.textAlign='center';ctx.letterSpacing='0.09em';
    ctx.fillText(stTxt,sX+sW/2,sY+15);ctx.textAlign='left';ctx.letterSpacing='0';

    // Save PDF — A6 card size
    try{
      const {jsPDF}=window.jspdf;
      const pdfW=99,pdfH=140; // A6ish
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:[pdfW,pdfH]});
      doc.addImage(cv.toDataURL('image/jpeg',0.96),'JPEG',0,0,pdfW,pdfH);
      doc.save('NEXUS-Pass-'+t.id+'.pdf');
      toast('\u2705 Pass PDF downloaded!','success');
    }catch(e2){
      const a=document.createElement('a');a.href=cv.toDataURL('image/png',1);
      a.download='NEXUS-Pass-'+t.id+'.png';a.click();
      toast('Pass saved as PNG','info');
    }
  }

  qrCv.width=200;qrCv.height=200;
  drawQR(qrCv,'NEXUS|'+t.id+'|'+t.uid+'|'+t.eid,function(){renderPass();});
}

function printPass(tkId){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);if(!t)return;
  const allUsers=getAllUsers();
  const u=allUsers.find(x=>x.id===t.uid)||CU;
  const isNonStu=t.ttype==='nonstu';
  const holderName=isNonStu?(t.guestName||'Guest'):(u?.fn||'')+' '+(u?.ln||'');
  const holderId=isNonStu?('Ref: '+(t.referenceStudentId||t.uid)):(u?.id||'—');
  const holderDept=isNonStu?(t.guestRelation||'Guest'):(u?.dept||'—');
  const holderMob=isNonStu?(t.guestMobile||'—'):(u?.mob||'—');
  const accentColor=isNonStu?'#c8841a':'#e84c3d';
  const accentSoft=isNonStu?'rgba(200,132,26,.15)':'rgba(232,76,61,.12)';

  // Build QR as data URL synchronously via canvas
  const qrCv=document.createElement('canvas');qrCv.width=200;qrCv.height=200;
  drawQR(qrCv,'NEXUS|'+t.id+'|'+t.uid+'|'+t.eid,()=>{
    const qrDataUrl=qrCv.toDataURL('image/png');

    const win=window.open('','_blank','width=600,height=800');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>NEXUS Pass — ${t.id}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Outfit',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pass{width:420px;background:linear-gradient(145deg,#0f172a 0%,#1a1040 50%,#0f1a2e 100%);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .pass.nonstu{background:linear-gradient(145deg,#1a0f00 0%,#2a1a00 50%,#1a1200 100%)}
  .pass-top{padding:22px 24px 18px;border-bottom:1.5px dashed rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between}
  .brand{font-size:1.8rem;font-weight:900;letter-spacing:.1em;color:${accentColor};text-shadow:0 0 20px ${accentColor}44}
  .brand-sub{font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-top:2px}
  .pass-badge{background:${accentSoft};border:1px solid ${accentColor}66;border-radius:20px;padding:5px 14px;font-size:.65rem;font-weight:800;letter-spacing:.1em;color:${accentColor};text-transform:uppercase}
  .ev-section{padding:16px 24px 14px}
  .ev-name{font-size:1.3rem;font-weight:900;color:#fff;margin-bottom:5px;line-height:1.2}
  .ev-meta{color:rgba(255,255,255,.4);font-size:.75rem;display:flex;gap:14px}
  .divider{display:flex;align-items:center;margin:0;position:relative}
  .divider::before{content:'';position:absolute;left:18px;right:18px;border-top:1.5px dashed rgba(255,255,255,.1)}
  .notch{width:28px;height:28px;border-radius:50%;background:#f0f2f5;flex-shrink:0}
  .body-section{padding:16px 24px}
  .qr-row{display:flex;gap:16px;align-items:flex-start;margin-bottom:14px}
  .qr-box{background:#fff;border-radius:14px;padding:7px;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,.4)}
  .qr-box img{width:130px;height:130px;display:block}
  .qr-hint{font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.28);text-align:center;margin-top:5px}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;flex:1}
  .meta-cell{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px}
  .meta-label{font-size:.52rem;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px}
  .meta-val{font-weight:700;font-size:.78rem;color:rgba(255,255,255,.92);line-height:1.2}
  .meta-cell.full{grid-column:span 2}
  .footer{padding:12px 24px;background:rgba(0,0,0,.2);border-top:1.5px dashed rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center}
  .pass-id{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:rgba(255,255,255,.25);letter-spacing:.06em}
  .status-badge{font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:rgba(61,125,232,.15);color:#3b7de8;border:1px solid rgba(61,125,232,.3)}
  .bottom-bar{background:${accentColor};padding:10px 24px;text-align:center;font-size:.68rem;color:#fff;letter-spacing:.04em}
  @media print{
    body{background:#f0f2f5}
    .pass{box-shadow:none;page-break-inside:avoid}
    .no-print{display:none!important}
  }
</style>
</head><body>
<div style="text-align:center">
  <div class="pass ${isNonStu?'nonstu':''}">
    <div class="pass-top">
      <div><div class="brand">NEXUS</div><div class="brand-sub">Event Management · 2026</div></div>
      <div class="pass-badge">${isNonStu?'🏫 Guest Pass':'🎓 Student Pass'}</div>
    </div>
    <div class="ev-section">
      <div class="ev-name">${t.evName||'Event'}</div>
      <div class="ev-meta"><span>📅 ${t.evDate}</span><span>📍 ${t.evVenue||'Venue'}</span></div>
    </div>
    <div class="divider"><div class="notch"></div><div style="flex:1"></div><div class="notch"></div></div>
    <div class="body-section">
      <div class="qr-row">
        <div><div class="qr-box"><img src="${qrDataUrl}" alt="QR Code"></div><div class="qr-hint">Scan at gate</div></div>
        <div class="meta-grid">
          <div class="meta-cell"><div class="meta-label">${isNonStu?'Guest Name':'Holder'}</div><div class="meta-val">${holderName}</div></div>
          <div class="meta-cell"><div class="meta-label">${isNonStu?'Reference ID':'College ID'}</div><div class="meta-val" style="font-family:'JetBrains Mono',monospace;font-size:.68rem">${holderId}</div></div>
          <div class="meta-cell"><div class="meta-label">${isNonStu?'Relation':'Dept'}</div><div class="meta-val">${holderDept}</div></div>
          <div class="meta-cell"><div class="meta-label">Amount Paid</div><div class="meta-val" style="color:#f5a623">${t.price===0?'FREE':'₹'+t.price}</div></div>
          <div class="meta-cell full"><div class="meta-label">Transaction ID</div><div class="meta-val" style="font-family:'JetBrains Mono',monospace;font-size:.65rem;color:rgba(255,255,255,.5)">${t.txnId||t.id}</div></div>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="pass-id">${t.id}</div>
      <div class="status-badge">${(t.status||'upcoming').toUpperCase()}</div>
    </div>
    <div class="bottom-bar">NEXUS College Event Management Platform · support@nexus.edu · 2026</div>
  </div>
  <div class="no-print" style="margin-top:20px;display:flex;gap:12px;justify-content:center">
    <button onclick="window.print()" style="padding:10px 28px;background:#e84c3d;color:#fff;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer">🖨️ Print Now</button>
    <button onclick="window.close()" style="padding:10px 20px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;font-family:'Outfit',sans-serif;font-size:.9rem;cursor:pointer">Close</button>
  </div>
</div>
</body></html>`);
    win.document.close();
    setTimeout(()=>win.focus(),200);
  });
}

function showEmailPreview(tkId){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);if(!t)return;
  const u=CU;
  document.getElementById('email-content').innerHTML=`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2.5rem;margin-bottom:8px">📧</div>
      <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:800;margin-bottom:4px">Email Your Pass</div>
      <div style="font-size:.82rem;color:var(--text2)">We'll send your pass details to your email</div>
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:3px">Event</div>
      <div style="font-weight:700;margin-bottom:2px">${t.evName}</div>
      <div style="font-size:.76rem;color:var(--text2)">📅 ${t.evDate} · 🎟️ ${t.id}</div>
    </div>
    <div class="fg" style="margin-bottom:18px">
      <label class="fl">Email Address *</label>
      <input class="fi" id="send-email-inp" type="email" value="${u?.em||''}" placeholder="your@email.com">
      <div style="font-size:.72rem;color:var(--text2);margin-top:5px">Pass details will be sent to this email address</div>
    </div>
    <div id="email-send-status"></div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-ghost" onclick="closeOv('ov-email')">Cancel</button>
      <button class="btn btn-blue btn-full btn-lg" id="send-email-btn" onclick="sendPassEmail('${tkId}')">📤 Send Email →</button>
    </div>`;
  openOv('ov-email');
}

// ── Auto-email pass after admin approval ────────────────────────────────
function autoEmailPass(tkId){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);if(!t)return;
  const users=getAllUsers();
  const u=users.find(x=>x.id===t.uid)||CU;
  const email=u?.em||u?.email||'';
  if(!email||!/^\S+@\S+\.\S+$/.test(email))return; // No email on file

  const EMAILJS_SERVICE  = 'service_xxxxxxx';   // ← replace
  const EMAILJS_TEMPLATE = 'template_xxxxxxx';  // ← replace
  const EMAILJS_PUBLIC   = 'xxxxxxxxxxxxxxxxxxxx'; // ← replace

  if(EMAILJS_SERVICE.includes('xxxxxxx')||EMAILJS_PUBLIC.includes('xxxxxxx'))return;

  const holderName=t.ttype==='nonstu'?(t.guestName||'Guest'):[u?.fn||'',u?.ln||''].join(' ').trim()||'Guest';
  const params={
    to_email   : email,
    to_name    : holderName,
    event_name : t.evName,
    event_date : t.evDate||'',
    event_venue: t.evVenue||'—',
    ticket_id  : t.id,
    ticket_type: t.ttype==='nonstu'?'Non-Student Guest':'Student',
    amount_paid: t.price===0?'FREE':'₹'+t.price,
    txn_id     : t.id||'—',
    college_id : t.ttype==='nonstu'?('Ref: '+(t.referenceStudentId||t.uid)):(u?.id||'—'),
  };
  try{
    if(window.emailjs){
      emailjs.init(EMAILJS_PUBLIC);
      emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,params)
        .then(()=>toast('📧 Pass emailed to '+email,'success'))
        .catch(()=>{});
    }
  }catch(e){}
}

function sendPassEmail(tkId){
  const emailInp=document.getElementById('send-email-inp');
  const email=emailInp?.value.trim();
  if(!email||!/^\S+@\S+\.\S+$/.test(email)){toast('⚠️ Please enter a valid email','error');return;}
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);if(!t)return;
  const u=USERS_DB.find(x=>x.id===t.uid)||CU;
  const btn=document.getElementById('send-email-btn');
  const status=document.getElementById('email-send-status');
  if(btn){btn.disabled=true;btn.textContent='⏳ Pass generate thay chhe...';}

  // ── EmailJS Config — replace these 3 values ──────────────────────────
  const EMAILJS_SERVICE  = 'service_xxxxxxx';   // ← replace
  const EMAILJS_TEMPLATE = 'template_xxxxxxx';  // ← replace
  const EMAILJS_PUBLIC   = 'xxxxxxxxxxxxxxxxxxxx'; // ← replace
  // ─────────────────────────────────────────────────────────────────────
  // EmailJS template variables:
  //   {{to_email}} {{to_name}} {{event_name}} {{event_date}} {{event_venue}}
  //   {{ticket_id}} {{ticket_type}} {{amount_paid}} {{college_id}}
  //   {{pass_pdf_base64}} — attach this as PDF in template
  // ─────────────────────────────────────────────────────────────────────

  const isConfigured=!EMAILJS_SERVICE.includes('xxxxxxx')&&!EMAILJS_PUBLIC.includes('xxxxxxx');

  const holderName=t.ttype==='nonstu'?(t.guestName||'Guest'):`${u?.fn||''} ${u?.ln||''}`.trim();

  // Generate pass PDF as base64, then email
  _generatePassBase64(tkId, function(pdfBase64){
    const params={
      to_email    : email,
      to_name     : holderName,
      event_name  : t.evName,
      event_date  : t.evDate||'',
      event_venue : t.evVenue||'—',
      ticket_id   : t.id,
      ticket_type : t.ttype==='nonstu'?'Non-Student Guest':'Student',
      amount_paid : t.price===0?'FREE':'₹'+t.price,
      college_id  : t.ttype==='nonstu'?('Ref: '+(t.referenceStudentId||t.uid)):(u?.id||'—'),
      pass_pdf_base64: pdfBase64||'',  // PDF attached in EmailJS template
    };

    if(!isConfigured){
      if(status)status.innerHTML=`
        <div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.25);border-radius:10px;padding:14px;margin-bottom:14px">
          <div style="font-weight:700;color:var(--gold);margin-bottom:8px">⚠️ EmailJS Configure karvu pade</div>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.8">
            <strong style="color:var(--text)">1.</strong> <a href="https://emailjs.com" target="_blank" style="color:var(--blue)">emailjs.com</a> → free account banavo<br>
            <strong style="color:var(--text)">2.</strong> Gmail/Outlook service add karo → Service ID copy karo<br>
            <strong style="color:var(--text)">3.</strong> Email Template banavo — variables:<br>
            <code style="font-size:.68rem;background:var(--surface3);padding:3px 8px;border-radius:4px;display:block;margin:6px 0;line-height:1.6">{{to_email}} {{to_name}} {{event_name}}<br>{{ticket_id}} {{amount_paid}} {{pass_pdf_base64}}</code>
            <strong style="color:var(--text)">4.</strong> app.js ma line ~2090 par Service ID, Template ID, Public Key replace karo
          </div>
        </div>`;
      if(btn){btn.disabled=false;btn.textContent='📤 Send Email →';}
      return;
    }

    if(btn)btn.textContent='⏳ Sending...';
    emailjs.init(EMAILJS_PUBLIC);
    emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,params)
      .then(()=>{
        if(status)status.innerHTML=`<div style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.3);border-radius:10px;padding:14px;margin-bottom:14px;text-align:center"><div style="font-size:2rem;margin-bottom:6px">✅</div><div style="font-weight:800;color:var(--green);font-size:.95rem">Email Sent with PDF!</div><div style="font-size:.76rem;color:var(--text2);margin-top:5px">Pass + PDF delivered to <strong style="color:var(--text)">${email}</strong></div></div>`;
        if(btn){btn.disabled=false;btn.textContent='✅ Sent!';}
        toast(`✅ Pass emailed to ${email}!`,'success');
        addNotif('Pass Emailed 📧',`Pass for "${t.evName}" sent to ${email}.`,'📧','success');
      })
      .catch(err=>{
        if(status)status.innerHTML=`<div style="background:rgba(232,76,61,.08);border:1px solid rgba(232,76,61,.2);border-radius:10px;padding:12px;margin-bottom:14px"><div style="font-weight:700;color:var(--accent);margin-bottom:4px">❌ Email Failed</div><div style="font-size:.76rem;color:var(--text2)">${err?.text||'EmailJS credentials check karo'}</div></div>`;
        if(btn){btn.disabled=false;btn.textContent='📤 Try Again';}
        toast('Email failed','error');
      });
  });
}

// Generate pass as base64 PNG/PDF string for email attachment
function _generatePassBase64(tkId, callback){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);
  if(!t){callback('');return;}
  const u=(getAllUsers()||[]).find(x=>x.id===t.uid)||CU;
  const isNS=t.ttype==='nonstu';
  // Load fonts then render
  const _fonts=[
    new FontFace('Outfit','url(https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4S-EiAou6Y.woff2)',{weight:'900'}),
    new FontFace('JetBrains Mono','url(https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTk6OThhvA.woff2)',{weight:'400'}),
  ];
  Promise.allSettled(_fonts.map(f=>f.load().then(lf=>{document.fonts.add(lf);return lf;}))).then(()=>{
    // Reuse _buildPassPDF logic but return base64 instead of saving
    _buildPassBase64(t,u,isNS,callback);
  });
}

function _buildPassBase64(t,u,isNS,callback){
  // Same layout as _buildPassPDF — returns base64 JPEG string for email
  const holderName=isNS?(t.guestName||'Guest'):[u?.fn||'',u?.ln||''].join(' ').trim()||'—';
  const holderId=isNS?('Ref: '+(t.referenceStudentId||t.uid)):(u?.id||'—');
  const holderDept=isNS?(t.guestRelation?(t.guestRelation+' of '+(t.referenceStudentName||'')):(u?.dept||'—')):(u?.dept||'—');
  const goldC='#f5a623';
  const accentC=isNS?'#fbbf24':'#818cf8';
  const accentBg=isNS?'rgba(245,166,35,.14)':'rgba(99,102,241,.16)';
  const accentBd=isNS?'rgba(245,166,35,.5)':'rgba(99,102,241,.5)';
  const bgTop=isNS?'#1c1000':'#0d1321';
  const bgMid=isNS?'#2a1800':'#141a38';
  const bgBot=isNS?'#1a1200':'#0b1526';

  const SC=2,W=460,H=660,PAD=24,RAD=20,HDR=78;
  const QR_SZ=152,QR_PD=9,QR_BOX=QR_SZ+QR_PD*2;
  const mColW=W-PAD-QR_BOX-14-PAD;
  const MBH=56,MBG=6,MBW=(mColW-MBG)/2;

  const cv=document.createElement('canvas');
  cv.width=W*SC;cv.height=H*SC;
  const ctx=cv.getContext('2d');
  ctx.scale(SC,SC);

  function rr(x,y,w,h,r,fill,stroke,sw){
    ctx.beginPath();
    if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);}
    else{const r2=Math.min(r,w/2,h/2);ctx.moveTo(x+r2,y);ctx.lineTo(x+w-r2,y);ctx.arcTo(x+w,y,x+w,y+r2,r2);ctx.lineTo(x+w,y+h-r2);ctx.arcTo(x+w,y+h,x+w-r2,y+h,r2);ctx.lineTo(x+r2,y+h);ctx.arcTo(x,y+h,x,y+h-r2,r2);ctx.lineTo(x,y+r2);ctx.arcTo(x,y,x+r2,y,r2);ctx.closePath();}
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw||1;ctx.stroke();}
  }

  const qrCv=document.createElement('canvas');qrCv.width=200;qrCv.height=200;
  drawQR(qrCv,'NEXUS|'+t.id+'|'+t.uid+'|'+t.eid,function(){
    // Background
    const bg=ctx.createLinearGradient(0,0,W*0.55,H);
    bg.addColorStop(0,bgTop);bg.addColorStop(0.4,bgMid);bg.addColorStop(1,bgBot);
    rr(0,0,W,H,RAD,bg,isNS?'rgba(245,166,35,.28)':'rgba(99,132,255,.22)',1.2);
    // Glow
    const g1=ctx.createRadialGradient(W,0,0,W,0,260);g1.addColorStop(0,isNS?'rgba(245,166,35,.09)':'rgba(99,102,241,.12)');g1.addColorStop(1,'transparent');
    ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);
    // Header
    ctx.save();ctx.shadowColor=isNS?'rgba(245,166,35,.6)':'rgba(99,102,241,.65)';ctx.shadowBlur=20;
    ctx.font='900 36px "Outfit",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='left';
    ctx.fillText('NEXUS',PAD,PAD+32);ctx.restore();
    ctx.font='600 8.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.28)';
    ctx.letterSpacing='0.24em';ctx.fillText('EVENT PASS',PAD,PAD+49);ctx.letterSpacing='0';
    // Badge
    const bTxt=isNS?'NON-STUDENT GUEST':'STUDENT';
    ctx.font='700 9.5px "Outfit",sans-serif';
    const bW=ctx.measureText(bTxt).width+22,bH=24,bX=W-PAD-bW,bY=PAD+10;
    rr(bX,bY,bW,bH,12,accentBg,accentBd,1.2);
    ctx.fillStyle=accentC;ctx.textAlign='center';ctx.letterSpacing='0.06em';
    ctx.fillText(bTxt,bX+bW/2,bY+16.5);ctx.letterSpacing='0';ctx.textAlign='left';
    // Divider
    ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=1;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.moveTo(PAD,HDR);ctx.lineTo(W-PAD,HDR);ctx.stroke();ctx.setLineDash([]);
    // Event name + date
    let yy=HDR+19;
    ctx.font='900 20px "Outfit",sans-serif';ctx.fillStyle='#fff';
    ctx.fillText((t.evName||'Event').substring(0,30),PAD,yy+16);yy+=24;
    if(t.evDate){ctx.font='11px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.36)';ctx.fillText(t.evDate+(t.evVenue?' | '+t.evVenue.substring(0,20):''),PAD,yy);yy+=18;}
    if(isNS){yy+=6;rr(PAD,yy,W-PAD*2,42,9,'rgba(245,166,35,.07)','rgba(245,166,35,.22)',1);ctx.font='700 12px "Outfit",sans-serif';ctx.fillStyle='#fbbf24';ctx.fillText('Non-Student Guest Pass',PAD+12,yy+18);ctx.font='10px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillText('Valid ID required at gate',PAD+12,yy+32);yy+=50;}else{yy+=4;}
    // QR
    const qrX=PAD,qrY=yy;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=18;rr(qrX,qrY,QR_BOX,QR_BOX,12,'#fff');ctx.restore();
    ctx.drawImage(qrCv,qrX+QR_PD,qrY+QR_PD,QR_SZ,QR_SZ);
    ctx.font='600 7.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.24)';ctx.textAlign='center';
    ctx.letterSpacing='0.14em';ctx.fillText('SCAN AT GATE',qrX+QR_BOX/2,qrY+QR_BOX+13);ctx.letterSpacing='0';ctx.textAlign='left';
    // Meta
    const mX=qrX+QR_BOX+14;
    const fields=isNS?[['GUEST NAME',holderName],['REFERENCE',holderId],['AMOUNT PAID',t.price===0?'FREE':'Rs.'+t.price,'gold'],['RELATION',holderDept.substring(0,16)]]:[['HOLDER',holderName],['COLLEGE ID',holderId],['AMOUNT PAID',t.price===0?'FREE':'Rs.'+t.price,'gold'],['DEPT',holderDept.substring(0,16)]];
    fields.forEach(([lbl,val,cl],i2)=>{
      const c=i2%2,r=Math.floor(i2/2),bx=mX+c*(MBW+MBG),by=qrY+r*(MBH+MBG);
      rr(bx,by,MBW,MBH,9,'rgba(255,255,255,.055)','rgba(255,255,255,.09)',1);
      ctx.font='600 6.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.30)';ctx.letterSpacing='0.12em';ctx.fillText(lbl,bx+9,by+14);ctx.letterSpacing='0';
      ctx.font='700 12px "Outfit",sans-serif';ctx.fillStyle=cl==='gold'?goldC:'rgba(255,255,255,.92)';ctx.fillText(String(val).substring(0,16),bx+9,by+36);
    });
    const txY=qrY+2*(MBH+MBG);
    rr(mX,txY,mColW,MBH,9,'rgba(255,255,255,.055)','rgba(255,255,255,.09)',1);
    ctx.font='600 6.5px "Outfit",sans-serif';ctx.fillStyle='rgba(255,255,255,.30)';ctx.letterSpacing='0.12em';ctx.fillText('TRANSACTION ID',mX+9,txY+14);ctx.letterSpacing='0';
    ctx.font='700 11px "JetBrains Mono",monospace';ctx.fillStyle='rgba(255,255,255,.48)';ctx.fillText(t.id||'—',mX+9,txY+36);
    // Footer divider
    const blockBot=Math.max(qrY+QR_BOX+18,txY+MBH+10);yy=blockBot;
    const nR=12;ctx.fillStyle=bgBot;
    ctx.beginPath();ctx.arc(-nR+1,yy,nR,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(W+nR-1,yy,nR,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.2;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.moveTo(22,yy);ctx.lineTo(W-22,yy);ctx.stroke();ctx.setLineDash([]);yy+=14;
    // Footer ID
    ctx.font='400 9px "JetBrains Mono",monospace';ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillText(t.id,PAD,yy+16);
    callback(cv.toDataURL('image/jpeg',0.92).split(',')[1]);
  });
}




function _quickEmailPass(tkId){
  const inp=document.getElementById('quick-email-inp');
  const email=(inp?.value||'').trim();
  if(!email||!/^\S+@\S+\.\S+$/.test(email)){
    const msg=document.getElementById('quick-email-msg');
    if(msg){msg.textContent='⚠️ Valid email enter karo';msg.style.color='var(--accent)';}
    return;
  }
  const btn=inp?.nextElementSibling;
  if(btn){btn.disabled=true;btn.textContent='⏳';}
  const msg=document.getElementById('quick-email-msg');

  _generatePassBase64(tkId,function(b64){
    const tks=DB.g('tickets')||[];
    const t=tks.find(x=>x.id===tkId);
    const u=CU;
    const holderName=t?.ttype==='nonstu'?(t?.guestName||'Guest'):`${u?.fn||''} ${u?.ln||''}`.trim();

    const EMAILJS_SERVICE='service_xxxxxxx';
    const EMAILJS_TEMPLATE='template_xxxxxxx';
    const EMAILJS_PUBLIC='xxxxxxxxxxxxxxxxxxxx';
    const ok=!EMAILJS_SERVICE.includes('xxxxxxx');

    if(!ok){
      if(msg){msg.textContent='⚠️ EmailJS not configured (app.js line ~2097)';msg.style.color='var(--gold)';}
      if(btn){btn.disabled=false;btn.textContent='Send →';}
      return;
    }

    emailjs.init(EMAILJS_PUBLIC);
    emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{
      to_email:email,to_name:holderName,
      event_name:t?.evName||'',event_date:t?.evDate||'',event_venue:t?.evVenue||'—',
      ticket_id:t?.id||'',ticket_type:t?.ttype==='nonstu'?'Non-Student Guest':'Student',
      amount_paid:t?.price===0?'FREE':'₹'+(t?.price||0),college_id:u?.id||'—',
      pass_pdf_base64:b64||''
    }).then(()=>{
      if(msg){msg.textContent='✅ Sent to '+email;msg.style.color='var(--green)';}
      if(btn){btn.disabled=false;btn.textContent='✅';}
      toast('📧 Pass emailed!','success');
    }).catch(()=>{
      if(msg){msg.textContent='❌ Email failed — check EmailJS config';msg.style.color='var(--accent)';}
      if(btn){btn.disabled=false;btn.textContent='Retry';}
    });
  });
}

function saveToGoogleWallet(tkId){
  // Download PDF first so user has the pass
  downloadPassPDF(tkId);
  // Show info toast — Google Wallet requires server-side JWT signing
  setTimeout(()=>{
    toast('📲 Pass PDF downloaded! Google Wallet ma add karva → Google Wallet app kholo → "+" → "Add from file" → aa PDF select karo','info');
  },800);
}

function sharePass(tkId){
  if(navigator.share){navigator.share({title:'My NEXUS Event Pass',text:`NEXUS Event Pass - ID: ${tkId}`,url:window.location.href}).catch(()=>{});}
  else{navigator.clipboard.writeText(`NEXUS Event Pass - ID: ${tkId}`).then(()=>toast('Pass ID copied!','info'));}
}

// ════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════
function renderDash(){
  if(!CU)return;
  const u=CU;
  document.getElementById('d-av').textContent=u.fn[0];
  document.getElementById('d-name').textContent=u.fn+' '+u.ln;
  document.getElementById('d-id').textContent='ID: '+u.id;
  const myTks=(DB.g('tickets')||[]).filter(t=>t.uid===u.id);
  const spent=myTks.reduce((a,t)=>a+t.price,0);
  const certs=myTks.filter(t=>t.status==='used').length;
  document.getElementById('d-ec').textContent=myTks.length;
  document.getElementById('d-cc').textContent=certs;
  document.getElementById('d-sp').textContent='₹'+spent;
  const badges=[];
  if(myTks.length>=1)badges.push('<span class="dbg" style="background:rgba(245,166,35,.12);color:var(--gold)">🏆 Event Member</span>');
  if(myTks.length>=3)badges.push('<span class="dbg" style="background:rgba(61,125,232,.15);color:var(--blue)">⚡ Active</span>');
  badges.push(`<span class="dbg" style="background:rgba(0,201,177,.1);color:var(--teal)">${u.yr||'Student'}</span>`);
  document.getElementById('d-badges').innerHTML=badges.join('');
  dtab(document.querySelector('.dmi.on')||document.querySelector('.dmi'),'tickets');
}

function dtab(el,tab){
  document.querySelectorAll('.dmi').forEach(m=>m.classList.remove('on'));
  if(el)el.classList.add('on');
  const area=document.getElementById('d-main');
  const u=CU;
  const myTks=(DB.g('tickets')||[]).filter(t=>t.uid===u.id);

  if(tab==='tickets'){
    const myOwnTks=myTks.filter(t=>t.ttype!=='nonstu'&&t.ttype!=='regular');
    const myGuestTks=(DB.g('tickets')||[]).filter(t=>t.bookedBy===u.id&&t.ttype==='nonstu');
    area.innerHTML=`<div class="dcard"><div class="dct">🎫 My Event Passes <span class="badge b-red">${myOwnTks.length}</span></div>
      ${myOwnTks.length===0?`<div class="empty"><div class="empty-i">🎟️</div><div class="empty-m">No passes yet.</div><button class="btn btn-red" style="margin-top:14px" onclick="page('events')">Explore Events →</button></div>`
      :myOwnTks.map(t=>`<div class="titem">
        <div class="tqr" onclick="showPass('${t.id}')" title="View QR Pass"><div id="mini-qr-${t.id}" style="width:44px;height:44px;overflow:hidden"></div></div>
        <div class="tinfo"><div class="tn">${t.evName}</div><div class="td">${t.evDate} · <span style="text-transform:capitalize">${t.ttype}</span> · ${t.price===0?'FREE':'₹'+t.price}</div></div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
          <span class="tbadge ${t.status==='upcoming'?'tup':t.status==='used'?'tused':t.status==='cancelled'?'tcan':'tok'}">${t.status.toUpperCase()}</span>
          <button class="btn btn-ghost btn-sm" onclick="showPass('${t.id}')">QR Pass</button>
          ${t.ttype==='student'&&t.status!=='cancelled'?`<button class="btn btn-sm" style="background:rgba(245,166,35,.1);color:var(--gold);border:1px solid rgba(245,166,35,.2);font-size:.65rem" onclick="closeOv('ov-pass');openNonStudentModal('${t.eid}')">🏫 Guest</button>`:''}
        </div>
      </div>`).join('')}
    </div>
    ${myGuestTks.length>0?`<div class="dcard" style="margin-top:12px"><div class="dct">🏫 My Guest (Non-Student) Passes <span class="badge" style="background:rgba(245,166,35,.15);color:var(--gold)">${myGuestTks.length}</span></div>
      ${myGuestTks.map(t=>`<div class="titem">
        <div style="width:44px;height:44px;border-radius:10px;background:rgba(245,166,35,.1);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🏫</div>
        <div class="tinfo">
          <div class="tn">${t.guestName||'Guest'}</div>
          <div class="td">${t.guestRelation||'—'} · ${t.evName} · ${t.evDate}</div>
          <div class="td" style="color:var(--text2);font-size:.68rem">ID Proof: ${t.guestIdType||'—'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
          <span style="font-weight:700;color:var(--gold)">₹${t.price}</span>
          <span class="tbadge ${t.status==='upcoming'?'tup':t.status==='cancelled'?'tcan':'tok'}">${t.status.toUpperCase()}</span>
          <button class="btn btn-ghost btn-sm" onclick="showPass('${t.id}')">QR Pass</button>
        </div>
      </div>`).join('')}
    </div>`:''}`;
    setTimeout(()=>{
      myOwnTks.forEach(t=>{
        const el=document.getElementById(`mini-qr-${t.id}`);
        if(el){el.innerHTML='';const cv=document.createElement('canvas');cv.width=44;cv.height=44;drawQR(cv,`NEXUS|${t.id}`);el.appendChild(cv);}
      });
    },200);
  }
  else if(tab==='achievements'){
    const ach=[];
    if(myTks.length>=1)ach.push({icon:'🥇',title:'First Event Booked',desc:myTks[0]?.evName||'First event'});
    if(myTks.length>=3)ach.push({icon:'🔥',title:'Event Enthusiast',desc:'Booked 3+ events'});
    if(myTks.length>=5)ach.push({icon:'⭐',title:'Campus Star',desc:'Attended 5+ events'});
    if(myTks.some(t=>t.ttype==='vip'))ach.push({icon:'💎',title:'VIP Member',desc:'Booked a VIP pass'});
    area.innerHTML=`<div class="dcard"><div class="dct">🏆 Achievements</div>
      ${ach.length===0?`<div class="empty"><div class="empty-i">🏅</div><div class="empty-m">Attend events to earn achievements!</div></div>`
      :ach.map(a=>`<div style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:2rem">${a.icon}</span><div><div style="font-weight:600">${a.title}</div><div style="font-size:.76rem;color:var(--text2)">${a.desc}</div></div>
        <span class="badge b-gold" style="margin-left:auto">Unlocked ✓</span>
      </div>`).join('')}
    </div>`;
  }
  else if(tab==='certificates'){
    const done=myTks.filter(t=>t.status==='used');
    area.innerHTML=`<div class="dcard"><div class="dct">📜 Participation Certificates</div>
      ${done.length===0?`<div class="empty"><div class="empty-i">📜</div><div class="empty-m">Complete events to earn certificates!</div></div>`
      :done.map(t=>`<div class="titem">
        <div style="width:44px;height:44px;border-radius:8px;background:rgba(245,166,35,.12);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">🏅</div>
        <div class="tinfo"><div class="tn">${t.evName}</div><div class="td">Certificate · ${t.evDate}</div></div>
        <button class="btn btn-gold btn-sm" onclick="downloadCert('${t.id}')">Download PDF</button>
      </div>`).join('')}
    </div>`;
  }
  else if(tab==='payment-hist'){
    area.innerHTML=`<div class="dcard"><div class="dct">💰 Payment History</div>
      ${myTks.length===0?`<div class="empty"><div class="empty-i">💳</div><div class="empty-m">No transactions yet.</div></div>`
      :myTks.map(t=>`<div class="titem">
        <div style="width:44px;height:44px;border-radius:8px;background:${t.price===0?'rgba(39,174,96,.12)':'rgba(61,125,232,.12)'};display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">${t.price===0?'🆓':'💳'}</div>
        <div class="tinfo"><div class="tn">${t.evName}</div><div class="td">${t.bookedOn} · ${t.ttype} · TXN: <span style="font-family:'JetBrains Mono';font-size:.7rem">${t.id||'—'}</span></div></div>
        <div style="text-align:right">
          <div style="font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:800;color:${t.price===0?'var(--green)':'var(--gold)'}">${t.price===0?'FREE':'₹'+t.price}</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:5px" onclick="showEmailPreview('${t.id}')">Receipt</button>
        </div>
      </div>`).join('')}
    </div>`;
  }
  else if(tab==='feedback-hist'){
    const fbs=(DB.g('feedback')||[]).filter(f=>f.uid===u.id);
    area.innerHTML=`<div class="dcard"><div class="dct">⭐ My Reviews</div>
      ${fbs.length===0?`<div class="empty"><div class="empty-i">⭐</div><div class="empty-m">No reviews yet.</div></div>`
      :fbs.map(f=>`<div class="titem"><div style="font-size:1.5rem">${'⭐'.repeat(f.rating)}</div><div class="tinfo"><div class="tn">${f.evName}</div><div class="td">"${f.msg}"</div><div class="td">${f.date}</div></div></div>`).join('')}
    </div>`;
  }
  else if(tab==='refunds'){
    const rfs=(DB.g('refunds')||[]).filter(r=>r.uid===u.id);
    area.innerHTML=`<div class="dcard"><div class="dct">↩️ Refund Requests</div>
      ${rfs.length===0?`<div class="empty"><div class="empty-i">↩️</div><div class="empty-m">No refund requests yet.</div></div>`
      :rfs.map(r=>`<div class="titem"><div style="font-size:1.4rem">${r.status==='approved'?'✅':r.status==='rejected'?'❌':'⏳'}</div>
        <div class="tinfo"><div class="tn">${r.evName}</div><div class="td">₹${r.amount} · ${r.date}</div><div class="td">Reason: ${r.reason}</div></div>
        <span class="badge ${r.status==='approved'?'b-green':r.status==='rejected'?'b-red':'b-blue'}">${r.status.toUpperCase()}</span>
      </div>`).join('')}
    </div>`;
  }
}

// ════════════════════════════════════
// CERTIFICATES
// ════════════════════════════════════
// ════════════════════════════════════
// PREMIUM CERTIFICATE SYSTEM
// ════════════════════════════════════
function buildCertCanvas(t,ev,cb){
  var u=getAllUsers().find(function(x){return x.id===t.uid;})||CU;
  var certTitle=(ev&&ev.certTitle)||'Certificate of Participation';
  var SC=2,CW=1000,CH=700;
  var cv=document.createElement('canvas');cv.width=CW*SC;cv.height=CH*SC;
  var ctx=cv.getContext('2d');ctx.scale(SC,SC);
  var cx=CW/2;
  var bg=ctx.createLinearGradient(0,0,CW,CH);
  bg.addColorStop(0,'#06050f');bg.addColorStop(.5,'#0d0b1e');bg.addColorStop(1,'#060512');
  ctx.fillStyle=bg;ctx.fillRect(0,0,CW,CH);
  var g1=ctx.createRadialGradient(CW,0,0,CW,0,400);g1.addColorStop(0,'rgba(245,166,35,.12)');g1.addColorStop(1,'transparent');ctx.fillStyle=g1;ctx.fillRect(0,0,CW,CH);
  var g2=ctx.createRadialGradient(0,CH,0,0,CH,350);g2.addColorStop(0,'rgba(99,102,241,.10)');g2.addColorStop(1,'transparent');ctx.fillStyle=g2;ctx.fillRect(0,0,CW,CH);
  ctx.strokeStyle='#c8841a';ctx.lineWidth=3;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(18,18,CW-36,CH-36,16);else ctx.rect(18,18,CW-36,CH-36);ctx.stroke();
  ctx.strokeStyle='rgba(245,166,35,.22)';ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(30,30,CW-60,CH-60,10);else ctx.rect(30,30,CW-60,CH-60);ctx.stroke();
  [[42,42],[CW-42,42],[42,CH-42],[CW-42,CH-42]].forEach(function(pt){
    ctx.strokeStyle='rgba(245,166,35,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pt[0],pt[1],12,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(245,166,35,.15)';ctx.fill();
    ctx.fillStyle='#f5a623';ctx.beginPath();ctx.arc(pt[0],pt[1],4,0,Math.PI*2);ctx.fill();
  });
  var lG=ctx.createLinearGradient(cx-200,0,cx+200,0);lG.addColorStop(0,'transparent');lG.addColorStop(.5,'#f5a623');lG.addColorStop(1,'transparent');
  ctx.strokeStyle=lG;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-220,88);ctx.lineTo(cx+220,88);ctx.stroke();
  ctx.font='bold 16px Arial';ctx.fillStyle='rgba(245,166,35,.6)';ctx.textAlign='center';ctx.letterSpacing='6px';ctx.fillText('N E X U S',cx,72);ctx.letterSpacing='0';
  var tG=ctx.createLinearGradient(cx-250,0,cx+250,0);tG.addColorStop(0,'#c8841a');tG.addColorStop(.5,'#f5d06a');tG.addColorStop(1,'#c8841a');
  ctx.font='bold 66px Georgia,serif';ctx.fillStyle=tG;ctx.letterSpacing='3px';ctx.fillText('CERTIFICATE',cx,168);ctx.letterSpacing='0';
  ctx.font='18px Georgia,serif';ctx.fillStyle='rgba(255,255,255,.45)';ctx.letterSpacing='4px';ctx.fillText(certTitle.toUpperCase(),cx,198);ctx.letterSpacing='0';
  var dG=ctx.createLinearGradient(cx-180,0,cx+180,0);dG.addColorStop(0,'transparent');dG.addColorStop(.5,'rgba(232,76,61,.7)');dG.addColorStop(1,'transparent');
  ctx.strokeStyle=dG;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx-200,218);ctx.lineTo(cx+200,218);ctx.stroke();
  ctx.font='16px Georgia,serif';ctx.fillStyle='rgba(255,255,255,.38)';ctx.fillText('This is to certify that',cx,258);
  ctx.shadowColor='rgba(255,255,255,.15)';ctx.shadowBlur=10;
  ctx.font='bold 52px Georgia,serif';ctx.fillStyle='#ffffff';ctx.fillText((u.fn||'Student')+' '+(u.ln||''),cx,324);ctx.shadowBlur=0;
  ctx.font='15px Arial';ctx.fillStyle='rgba(255,255,255,.42)';ctx.fillText((u.id||'')+' · '+(u.dept||'—')+' · '+(u.yr||'—'),cx,358);
  ctx.font='16px Georgia,serif';ctx.fillStyle='rgba(255,255,255,.38)';ctx.fillText('has successfully participated in',cx,400);
  var evG=ctx.createLinearGradient(cx-200,0,cx+200,0);evG.addColorStop(0,'#e84c3d');evG.addColorStop(.5,'#ff7a6e');evG.addColorStop(1,'#e84c3d');
  ctx.shadowColor='rgba(232,76,61,.3)';ctx.shadowBlur=12;
  ctx.font='bold 36px Georgia,serif';ctx.fillStyle=evG;ctx.fillText((t.evName||'').substring(0,40),cx,450);ctx.shadowBlur=0;
  ctx.font='14px Arial';ctx.fillStyle='rgba(255,255,255,.38)';ctx.fillText('Held on '+(t.evDate||'—')+' · Organized by '+((ev&&ev.org)||'NEXUS'),cx,482);
  var dG2=ctx.createLinearGradient(cx-180,0,cx+180,0);dG2.addColorStop(0,'transparent');dG2.addColorStop(.5,'rgba(245,166,35,.4)');dG2.addColorStop(1,'transparent');
  ctx.strokeStyle=dG2;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-200,510);ctx.lineTo(cx+200,510);ctx.stroke();
  ctx.shadowColor='rgba(232,76,61,.4)';ctx.shadowBlur=10;ctx.font='bold 28px Georgia,serif';ctx.fillStyle='#e84c3d';ctx.fillText('NEXUS',cx,556);ctx.shadowBlur=0;
  ctx.font='11px Arial';ctx.fillStyle='rgba(255,255,255,.28)';ctx.letterSpacing='2px';ctx.fillText('College Event Management Platform',cx,575);ctx.letterSpacing='0';
  ctx.strokeStyle='rgba(245,166,35,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,618,32,0,Math.PI*2);ctx.stroke();
  ctx.font='bold 11px Arial';ctx.fillStyle='rgba(245,166,35,.7)';ctx.letterSpacing='1px';ctx.fillText('VERIFIED',cx,615);ctx.letterSpacing='0';
  ctx.font='9px Arial';ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillText('2026',cx,628);
  ctx.font='10px "Courier New"';ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillText('CERT-'+t.id.substring(0,20)+' | Issued: '+new Date().toLocaleDateString('en-IN'),cx,670);
  cb(cv);
}

function downloadCert(tkId,evObj){
  var tks=DB.g('tickets')||[];
  var t=tks.find(function(x){return x.id===tkId;});if(!t)return;
  var ev=evObj||(DB.g('events')||[]).find(function(x){return x.id===t.eid;})||{};
  buildCertCanvas(t,ev,function(cv){
    try{
      var u=getAllUsers().find(function(x){return x.id===t.uid;})||CU;
      var jsPDFLib=window.jspdf&&window.jspdf.jsPDF;
      if(!jsPDFLib)throw new Error('no jsPDF');
      var doc=new jsPDFLib({orientation:'landscape',unit:'mm',format:'a4'});
      doc.addImage(cv.toDataURL('image/jpeg',.97),'JPEG',0,0,297,210);
      doc.save('NEXUS-Certificate-'+(u.fn||'Student')+'.pdf');
      toast('🎓 Certificate PDF downloaded!','success');
    }catch(err2){
      var u2=getAllUsers().find(function(x){return x.id===t.uid;})||CU;
      var a=document.createElement('a');a.href=cv.toDataURL('image/png',1);
      a.download='NEXUS-Certificate-'+(u2.fn||'Student')+'.png';a.click();
      toast('🎓 Certificate downloaded!','success');
    }
  });
}

function sendCertsForEvent(evId){
  var evs=DB.g('events')||[];
  var ev=evs.find(function(x){return x.id===evId;});
  if(!ev||!ev.hasCertificate)return;
  var tks=(DB.g('tickets')||[]).filter(function(t){return t.eid===evId&&t.ttype!=='nonstu'&&t.status!=='cancelled';});
  if(!tks.length)return;
  tks.forEach(function(t,i){
    setTimeout(function(){
      var u=getAllUsers().find(function(x){return x.id===t.uid;});
      if(!u)return;
      addNotif('🎓 Certificate Ready',
        '🎓 Your certificate for "'+ev.name+'" is ready. Download from My Passes → Certificates.',
        '📜','success');
    },i*400);
  });
  toast('🎓 '+(tks.length)+' certificate'+(tks.length>1?'s':'')+' ready for download!','success');
}


// ════════════════════════════════════
// FEEDBACK
// ════════════════════════════════════
function openFeedback(){openFeedbackFor('general','General Feedback')}
function openFeedbackFor(evId,evName){
  feedbackRating=0;
  document.getElementById('fb-content').innerHTML=`
    <h3 style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;margin-bottom:18px">⭐ Rate & Review</h3>
    <div style="color:var(--text2);font-size:.83rem;margin-bottom:16px">Event: <strong style="color:var(--text)">${evName}</strong></div>
    <div class="fg"><label class="fl">Your Rating</label>
      <div class="star-row" id="stars"><span class="star" onclick="setStar(1)">⭐</span><span class="star" onclick="setStar(2)">⭐</span><span class="star" onclick="setStar(3)">⭐</span><span class="star" onclick="setStar(4)">⭐</span><span class="star" onclick="setStar(5)">⭐</span></div>
    </div>
    <div class="fg"><label class="fl">Quick Tags</label>
      <div class="rating-cards">
        <div class="rc" onclick="this.classList.toggle('on')">🎵 Great Music</div>
        <div class="rc" onclick="this.classList.toggle('on')">🎤 Good Speakers</div>
        <div class="rc" onclick="this.classList.toggle('on')">🏅 Well Organized</div>
        <div class="rc" onclick="this.classList.toggle('on')">🎨 Creative</div>
      </div>
    </div>
    <div class="fg"><label class="fl">Your Review</label><textarea class="fi" id="fb-msg" rows="4" placeholder="Share your experience..."></textarea></div>
    <button class="btn btn-red btn-full" onclick="submitFeedback('${evId}','${evName}')">Submit Review →</button>`;
  openOv('ov-fb');
}

function setStar(n){feedbackRating=n;document.querySelectorAll('#stars .star').forEach((s,i)=>s.classList.toggle('on',i<n));}

function submitFeedback(evId,evName){
  if(!feedbackRating){toast('Please select a star rating','error');return;}
  const msg=gv('fb-msg');
  const tags=[...document.querySelectorAll('.rc.on')].map(el=>el.textContent.trim());
  const fb={id:'f'+Date.now(),uid:CU.id,eid:evId,evName,rating:feedbackRating,msg:msg||'(No comment)',tags,date:new Date().toLocaleDateString('en-IN')};
  DB.push('feedback',fb);
  closeOv('ov-fb');
  toast('✅ Review submitted! Thank you!','success');
}

// ════════════════════════════════════
// REFUND
// ════════════════════════════════════
function requestRefund(tkId){
  const tks=DB.g('tickets')||[];
  const t=tks.find(x=>x.id===tkId);
  if(!t)return;
  if(t.price===0){toast('Free registrations cannot be refunded','info');return;}
  const reason=prompt(`Request refund for "${t.evName}" (₹${t.price})?\n\nEnter reason:`);
  if(!reason)return;

  const refund={id:'r'+Date.now(),uid:CU.id,tkId,evName:t.evName,amount:t.price,reason,status:'pending',date:new Date().toLocaleDateString('en-IN')};
  DB.push('refunds',refund);

  // Cancel ticket
  const idx=tks.findIndex(x=>x.id===tkId);
  if(idx!==-1){tks[idx].status='cancelled';DB.s('tickets',tks);}

  // ── Decrement booked count ──
  const evs=DB.g('events')||[];
  const eidx=evs.findIndex(e=>e.id===t.eid);
  if(eidx!==-1){
    evs[eidx].booked=Math.max(0,evs[eidx].booked-1);
    DB.s('events',evs);
  }

  closeOv('ov-pass');
  addNotif('Refund Requested',`Your refund of ₹${t.price} for "${t.evName}" is under review.`,'↩️','info');
  toast(`Refund of ₹${t.price} requested. Processing in 3-5 days.`,'info');
}

// ════════════════════════════════════
// EVENT DETAIL
// ════════════════════════════════════
function viewEv(evId){
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);if(!e)return;
  const myTks=DB.g('tickets')||[];
  const booked=myTks.find(t=>t.eid===e.id&&t.uid===CU?.id);
  const pct=Math.min(100,Math.round(e.booked/e.seats*100));
  const fillColor=pct>80?'var(--accent)':pct>50?'var(--blue)':'var(--green)';
  const fbs=(DB.g('feedback')||[]).filter(f=>f.eid===e.id);
  const avgRating=fbs.length?Math.round(fbs.reduce((a,f)=>a+f.rating,0)/fbs.length*10)/10:0;
  document.getElementById('edh').className=`ed-hero ${e.bg}`;
  document.getElementById('edh').innerHTML=`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:6rem;opacity:.08">${e.icon}</div><span style="position:relative;z-index:1;font-size:5rem">${e.icon}</span><span class="ebadge ${e.status==='live'?'eb-live':e.status==='completed'?'eb-done':'eb-up'}" style="position:absolute;top:20px;right:24px;font-size:.82rem">${e.status==='live'?'● LIVE NOW':e.status.toUpperCase()}</span>`;
  document.getElementById('edb').innerHTML=`
    <div>
      <div class="ed-info">
        <div style="font-family:'Outfit',sans-serif;font-size:1.8rem;font-weight:800;margin-bottom:8px">${e.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <span class="tag">📁 ${e.cat}</span><span class="tag">👤 ${e.org}</span>
          ${e.prize?`<span class="tag">🏆 ${e.prize}</span>`:''}
          ${fbs.length?`<span class="tag">⭐ ${avgRating}/5 (${fbs.length} reviews)</span>`:''}
        </div>
        <p style="color:var(--text2);line-height:1.72;font-size:.9rem">${e.desc||'No description.'}</p>
      </div>
      <div class="ed-info">
        <div class="ed-it">📋 Event Details</div>
        <div class="irow"><div class="ii">📅</div><div class="iv"><strong>Date & Time</strong>${e.date} at ${e.time}</div></div>
        <div class="irow"><div class="ii">📍</div><div class="iv"><strong>Venue</strong>${e.venue}</div></div>
        <div class="irow"><div class="ii">👤</div><div class="iv"><strong>Organizer</strong>${e.org}</div></div>
        <div class="irow"><div class="ii">🪑</div><div class="iv"><strong>Availability</strong>${e.seats-e.booked} / ${e.seats} seats</div></div>
        <div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text2);margin-bottom:5px"><span>Booking progress</span><span>${pct}%</span></div>
        <div style="background:var(--bg);height:7px;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${fillColor};border-radius:4px"></div></div></div>
      </div>
      ${fbs.length?`<div class="ed-info"><div class="ed-it">⭐ Reviews (${fbs.length})</div>
        ${fbs.slice(0,3).map(f=>`<div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span>${'⭐'.repeat(f.rating)}</span><span style="font-size:.72rem;color:var(--text2)">${f.date}</span></div>
          <div style="font-size:.84rem;color:var(--text2)">"${f.msg}"</div>
        </div>`).join('')}
      </div>`:''}
    </div>
    <div>
      <div class="book-box">
        <div style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;margin-bottom:4px">BOOK YOUR PASS</div>
        <div style="font-family:'Outfit',sans-serif;font-size:2.6rem;font-weight:800;color:var(--gold);line-height:1;margin-bottom:3px">${e.price===0?'FREE':'₹'+e.price}</div>
        <div style="color:var(--text2);font-size:.78rem;margin-bottom:18px">per ticket</div>
        ${booked?`<div style="background:rgba(39,174,96,.08);border:1px solid rgba(39,174,96,.2);border-radius:8px;padding:13px;text-align:center;margin-bottom:12px"><div style="color:var(--green);font-weight:700;margin-bottom:3px">✅ You're Booked!</div><div style="font-size:.75rem;color:var(--text2)">ID: ${booked.id}</div></div>
        <div style="display:flex;gap:8px"><button class="btn btn-ghost btn-full btn-sm" onclick="showPass('${booked.id}')">View QR Pass</button><button class="btn btn-sm" style="background:rgba(61,125,232,.1);color:var(--blue);border:1px solid rgba(61,125,232,.2)" onclick="showEmailPreview('${booked.id}')">📧</button></div>`
        :e.status==='completed'?`<button class="btn btn-ghost btn-full" disabled>Event Completed</button>`
        :e.seats===e.booked?`<button class="btn btn-ghost btn-full" disabled>🔴 Sold Out</button>`
        :`<button class="btn btn-red btn-full btn-lg" onclick="openBooking('${e.id}')">Book Pass Now →</button>`}
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:7px">
          <div style="font-size:.78rem;color:var(--text2)">✅ Instant QR pass generation</div>
          <div style="font-size:.78rem;color:var(--text2)">✅ PDF download & email confirmation</div>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
          <button class="btn btn-ghost btn-sm btn-full" onclick="openFeedbackFor('${e.id}','${e.name}')">⭐ Write a Review</button>
        </div>
      </div>
    </div>`;
  page('detail');
}

// ════════════════════════════════════
// ADMIN
// ════════════════════════════════════
function atab(el,tab){
  document.querySelectorAll('.ami').forEach(m=>m.classList.remove('on'));
  el.classList.add('on');
  if(tab==='overview')renderAdminOverview();
  else if(tab==='events')renderAdminEvents();
  else if(tab==='extevents')renderAdminExtEvents();
  else if(tab==='students')renderAdminStudents();
  else if(tab==='scan')renderAdminScan();
  else if(tab==='announcements')renderAdminAnn();
  else if(tab==='revenue')renderAdminRevenue();
  else if(tab==='analytics')renderAdminAnalytics();
  else if(tab==='feedback')renderAdminFeedback();
  else if(tab==='payments')renderAdminPayments();
}

function renderAdminOverview(){
  const evs=DB.g('events')||[];const tks=DB.g('tickets')||[];
  const rev=tks.reduce((a,t)=>a+t.price,0);
  document.getElementById('a-main').innerHTML=`
  <div class="ah">
    <div>
      <div class="at">Dashboard Overview</div>
      <div style="font-size:.76rem;color:var(--text2);margin-top:2px;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block;animation:nbp 1.5s ease infinite"></span>Live data</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-blue btn-sm" onclick="openEvForm()">＋ Event</button>
      <button class="btn btn-ghost btn-sm" onclick="openOv('ov-ann')">📢 Announce</button>
    </div>
  </div>
  <div class="mgrid">
    <div class="mbox mbox-gold"><div class="mv" style="color:var(--gold)">₹${rev.toLocaleString()}</div><div class="ml">Revenue</div></div>
    <div class="mbox mbox-teal"><div class="mv" style="color:var(--teal)">${tks.length}</div><div class="ml">Passes Issued</div></div>
    <div class="mbox mbox-blue"><div class="mv" style="color:var(--blue)">${USERS_DB.length}</div><div class="ml">Total Users</div></div>
    <div class="mbox mbox-red"><div class="mv" style="color:var(--accent)">${evs.filter(e=>e.status!=='completed').length}</div><div class="ml">Active Events</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
    <div class="dcard"><div class="dct">📈 Event Popularity</div>
      <div class="bar-l">${[...evs].sort((a,b)=>(b.booked/b.seats)-(a.booked/a.seats)).slice(0,5).map((e,i)=>{
        const p=Math.min(100,Math.round(e.booked/e.seats*100));
        const clr=['linear-gradient(90deg,var(--accent),#ff6b6b)','linear-gradient(90deg,var(--blue),#60a5fa)','linear-gradient(90deg,var(--teal),#34d399)','linear-gradient(90deg,var(--gold),#fbbf24)','linear-gradient(90deg,var(--purple),#c084fc)'];
        return `<div class="brow"><span class="bn">${e.name.split(' ').slice(0,2).join(' ')}</span><div class="btr"><div class="bf" style="width:${p}%;background:${clr[i]}"></div></div><span class="bv">${p}%</span></div>`;
      }).join('')}</div>
    </div>
    <div class="dcard"><div class="dct">🎫 Recent Passes</div>
      ${tks.slice(-4).reverse().map(t=>`<div class="titem"><div style="font-size:1.4rem">🎫</div><div class="tinfo"><div class="tn">${t.evName}</div><div class="td">${t.bookedOn} · ₹${t.price}</div></div><span class="badge b-${t.price===0?'teal':'gold'}">${t.price===0?'FREE':'₹'+t.price}</span></div>`).join('')||'<div class="empty"><div class="empty-m">No passes yet</div></div>'}
    </div>
  </div>
  <div class="dcard"><div class="dct">⚡ Quick Actions</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-red" onclick="openEvForm()">➕ Create Event</button>
      <button class="btn btn-blue" onclick="openOv('ov-ann')">📢 Announcement</button>
      <button class="btn btn-ghost" onclick="atab(document.querySelectorAll('.ami')[3],'scan')">📷 QR Scanner</button>
      
      <button class="btn btn-ghost" onclick="exportData()">📊 Export JSON</button>
    </div>
  </div>`;
}

function renderAdminEvents(){
  autoSetEventStatuses();
  const evs=DB.g('events')||[];const tks=DB.g('tickets')||[];
  const total=evs.length,active=evs.filter(e=>e.status!=='completed').length;
  document.getElementById('a-main').innerHTML=`
  <div class="ah">
    <div>
      <div class="at">Manage Events</div>
      <div style="font-size:.76rem;color:var(--text2);margin-top:2px">${total} events total · ${active} active · ${tks.length} passes issued</div>
    </div>
    <button class="btn btn-blue" onclick="openEvForm()">＋ New Event</button>
  </div>
  <div class="aev-list">
    ${evs.length===0
      ?`<div class="empty"><div class="empty-i">📭</div><div class="empty-m">No events yet. Create your first event!</div></div>`
      :evs.map(e=>{
        const passes=tks.filter(t=>t.eid===e.id).length;
        const pct=e.seats>0?Math.min(100,Math.round((e.booked/e.seats)*100)):0;
        const progClr=pct>80?'var(--accent)':pct>50?'var(--gold)':'var(--blue)';
        const stClr=e.status==='live'?'var(--accent)':e.status==='completed'?'var(--text3)':'var(--blue)';
        const stBg=e.status==='live'?'rgba(232,76,61,.1)':e.status==='completed'?'var(--surface3)':'var(--blue-soft)';
        return `<div class="aev-card">
          <div class="aev-icon-col">${e.icon||'🎭'}</div>
          <div class="aev-body">
            <div class="aev-title">${e.name}</div>
            <div class="aev-meta">
              <span>📂 ${e.cat||'—'}</span>
              <span>📅 ${e.date||'TBD'}</span>
              <span>📍 ${e.venue||'—'}</span>
              <span>👤 ${e.org||'—'}</span>
            </div>
            <div class="aev-prog-wrap">
              <div class="aev-prog-label"><span>Seats: ${e.booked}/${e.seats}</span><span style="font-weight:700">${pct}% filled</span></div>
              <div class="aev-prog-bar"><div class="aev-prog-fill" style="width:${pct}%;background:${progClr}"></div></div>
            </div>
            <div class="aev-badges">
              <span style="padding:3px 10px;border-radius:100px;font-size:.66rem;font-weight:700;background:${stBg};color:${stClr}">${e.status.toUpperCase()}</span>
              <span class="badge b-${e.price===0?'teal':'gold'}">${e.price===0?'FREE':'₹'+e.price}</span>
              <span class="badge b-purple">${passes} passes</span>
              ${e.prize?`<span class="badge b-gold">🏆 ${e.prize}</span>`:''}
            </div>
          </div>
          <div class="aev-actions">
            <button class="btn btn-blue btn-sm" onclick="openEvForm('${e.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="btn btn-sm" style="background:var(--teal-soft);color:var(--teal);border:1.5px solid rgba(8,145,178,.2)" onclick="toggleStatus('${e.id}')" title="Toggle status"><i class="fa-solid fa-arrows-rotate"></i></button>
            <button class="btn btn-sm" style="background:rgba(232,76,61,.08);color:var(--accent);border:1.5px solid rgba(232,76,61,.15)" onclick="delEv('${e.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

function openEvForm(evId){
  editingEventId=evId||null;
  const evs=DB.g('events')||[];
  const e=evId?evs.find(x=>x.id===evId):null;
  const existingImg=evId?getEvImg(evId):null;
  document.getElementById('ev-form-content').innerHTML=`
    <h3 style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;margin-bottom:20px">${e?'✏️ EDIT EVENT':'➕ CREATE NEW EVENT'}</h3>

    <!-- Image Upload -->
    <div class="fg">
      <label class="fl">Event Image (Device Photo)</label>
      <div id="ev-img-preview" style="width:100%;height:160px;border-radius:10px;overflow:hidden;margin-bottom:8px;background:var(--surface2);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:all .2s" onclick="document.getElementById('ef-img-inp').click()">
        ${existingImg
          ?`<img src="${existingImg}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:.2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><span style="color:#fff;font-size:.82rem;font-weight:600">📷 Change Image</span></div>`
          :`<div style="text-align:center;color:var(--text2)">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;opacity:.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <div style="font-size:.8rem;font-weight:600">Click to upload image</div>
              <div style="font-size:.7rem;margin-top:3px;opacity:.6">JPG, PNG, WEBP · Max 2MB</div>
            </div>`}
      </div>
      <input type="file" id="ef-img-inp" accept="image/*" style="display:none" onchange="previewEvImg(this)">
      ${existingImg?`<button type="button" class="btn btn-outline btn-sm" onclick="removeEvImg()">🗑️ Remove Image</button>`:''}
    </div>

    <div class="fg">
      <label class="fl">Event Icon</label>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div id="ef-icon-prev" style="width:56px;height:56px;border-radius:14px;background:var(--blue-soft);border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0">${e?.icon||'🎭'}</div>
        <div style="flex:1">
          <input class="fi" id="ef-icon" value="${e?.icon||'🎭'}" placeholder="Type or pick an emoji" oninput="document.getElementById('ef-icon-prev').textContent=this.value||'🎭'" style="margin-bottom:6px">
          <div style="font-size:.72rem;color:var(--text2)">Click below or type an emoji</div>
        </div>
      </div>
      <div class="icon-picker-wrap">
        <div class="icon-picker-grid">
          ${['🎭','💻','⚽','🛠️','🎙️','🎪','🎉','🌐','🎵','🎨','📚','🏆','🎬','🤖','🔬','🎯','🏅','🌟','🎤','🧠','🎮','📊','🚀','💡','🎓','🎸','🏋️','🎲','🤝','🌍','📸','🎺','🏄','🧪','🎠','🏕️','🎻','🥊','🤸','🎃'].map(em=>`<button type="button" class="ipbtn ${(e?.icon||'🎭')===em?'sel':''}" onclick="(function(el,em){document.getElementById('ef-icon').value=em;document.getElementById('ef-icon-prev').textContent=em;el.closest('.icon-picker-grid').querySelectorAll('.ipbtn').forEach(b=>b.classList.remove('sel'));el.classList.add('sel')})(this,'${em}')">${em}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="fg"><label class="fl">Event Name *</label><input class="fi" id="ef-name" value="${e?.name||''}" placeholder="Enter event name"></div>
    <div class="fr">
      <div class="fg"><label class="fl">Category <span style="color:var(--accent)">*</span></label><select class="fi" id="ef-cat">${CATS.map(c=>`<option value="${c.name}" ${e?.cat===c.name?'selected':''}>${c.name}</option>`).join('')}</select></div>
      <div class="fg"><label class="fl">Status <span style="font-size:.68rem;color:var(--teal);font-weight:600;margin-left:6px"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-set based on date</span></label><select class="fi" id="ef-status"><option value="upcoming" ${e?.status==='upcoming'?'selected':''}>Upcoming</option><option value="live" ${e?.status==='live'?'selected':''}>Live</option><option value="completed" ${e?.status==='completed'?'selected':''}>Completed</option></select>
        <div style="font-size:.68rem;color:var(--text2);margin-top:4px"><i class="fa-solid fa-circle-info"></i> Based on date: past = Completed, today = Live, future = Upcoming</div>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">Date <span style="color:var(--accent)">*</span></label><input class="fi" id="ef-date" type="date" value="${e?.date||''}"></div>
      <div class="fg"><label class="fl">Time</label><input class="fi" id="ef-time" value="${e?.time||''}" placeholder="7:00 PM"></div>
    </div>
    <div class="fg"><label class="fl">Venue <span style="color:var(--accent)">*</span></label><input class="fi" id="ef-venue" value="${e?.venue||''}" placeholder="e.g. Main Auditorium"></div>
    <div class="fr">
      <div class="fg"><label class="fl">Price (₹, 0 = Free)</label><input class="fi" id="ef-price" type="number" value="${e?.price||0}" min="0"></div>
      <div class="fg"><label class="fl">Total Seats <span style="color:var(--accent)">*</span></label><input class="fi" id="ef-seats" type="number" value="${e?.seats||100}" min="1"></div>
    </div>
    <div class="fr">
      <div class="fg">
        <label class="fl">Max Non-Student Guests <span style="font-size:.68rem;color:var(--gold);margin-left:6px">per event</span></label>
        <input class="fi" id="ef-maxns" type="number" value="${e?.maxNonStudentGuests||4}" min="0" max="100">
        <div style="font-size:.68rem;color:var(--text2);margin-top:4px">Maximum number of non-student guest passes allowed for this event (default: 4)</div>
      </div>
      <div class="fg">
        <label class="fl">Non-Student Price Multiplier</label>
        <select class="fi" id="ef-nsmul">
          <option value="1.35" ${(!e?.nsMultiplier||e?.nsMultiplier==1.35)?'selected':''}>+35% (Default)</option>
          <option value="1.50" ${e?.nsMultiplier==1.50?'selected':''}>+50%</option>
          <option value="1.25" ${e?.nsMultiplier==1.25?'selected':''}>+25%</option>
          <option value="2.00" ${e?.nsMultiplier==2.00?'selected':''}>+100% (2x)</option>
          <option value="1.00" ${e?.nsMultiplier==1.00?'selected':''}>Same price</option>
        </select>
      </div>
    </div>
    <div class="fg"><label class="fl">Organizer</label><input class="fi" id="ef-org" value="${e?.org||''}" placeholder="Dept / Club name"></div>
    <div class="fg"><label class="fl">Prize (optional)</label><input class="fi" id="ef-prize" value="${e?.prize||''}" placeholder="e.g. ₹50,000 prize pool"></div>
    <div class="fg"><label class="fl">Description</label><textarea class="fi" id="ef-desc" rows="3">${e?.desc||''}</textarea></div>
    <div style="margin-top:12px;background:rgba(245,166,35,.05);border:1.5px solid rgba(245,166,35,.2);border-radius:12px;padding:14px 16px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div style="flex:1"><div style="font-weight:700;color:var(--gold);margin-bottom:2px">&#x1F3C6; Participation Certificate</div><div style="font-size:.72rem;color:var(--text2)">Auto-send premium PDF certificate to all attendees when event ends</div></div><div onclick="(function(){var cb=document.getElementById('ef-cert');cb.checked=!cb.checked;document.getElementById('ef-tog-tr').style.background=cb.checked?'#f5a623':'var(--surface3)';document.getElementById('ef-tog-dt').style.left=cb.checked?'22px':'2px';var op=document.getElementById('ef-cert-opts');if(op)op.style.display=cb.checked?'':'none'})()" style="cursor:pointer;position:relative;width:44px;height:24px;flex-shrink:0"><input type="checkbox" id="ef-cert" ${e?.hasCertificate?'checked':''} style="display:none"><div id="ef-tog-tr" style="position:absolute;inset:0;border-radius:24px;background:${e?.hasCertificate?'#f5a623':'var(--surface3)'};border:1px solid var(--border2);transition:.3s"></div><div id="ef-tog-dt" style="position:absolute;top:2px;left:${e?.hasCertificate?'22px':'2px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div></div></div><div id="ef-cert-opts" style="margin-top:10px;${e?.hasCertificate?'':'display:none'}"><label class="fl">Certificate Sub-title (optional)</label><input class="fi" id="ef-cert-title" value="${e?.certTitle||''}" placeholder="Certificate of Participation" style="margin-top:4px"></div></div>    <button class="btn btn-red btn-full btn-lg" style="margin-top:10px" onclick="saveEv().catch(e=>toast(e.message,'error'))">${e?'Update Event →':'Create Event →'}</button>`;
  openOv('ov-ev');
}

// Image preview & helpers
let _evImgData=null; // holds new base64 image during form session

function previewEvImg(inp){
  const file=inp.files[0];
  if(!file) return;
  if(file.size>5*1024*1024){toast('Image must be under 5MB','error');inp.value='';return;}
  // Store file for Cloudinary upload
  window._evImgFile = file;
  _evImgData = 'PENDING_UPLOAD';
  const rd=new FileReader();
  rd.onload=function(e){
    const prev=document.getElementById('ev-img-preview');
    if(prev) prev.innerHTML=`<img src="${e.target.result}" style="width:100%;height:160px;object-fit:cover;border-radius:8px"><button type="button" onclick="_evImgData='REMOVE';window._evImgFile=null;document.getElementById('ev-img-preview').innerHTML='';document.getElementById('ev-img-inp').value=''" style="margin-top:6px;font-size:.75rem;color:var(--accent);background:none;border:none;cursor:pointer">✕ Remove</button>`;
  };
  rd.readAsDataURL(file);
}


function removeEvImg(){
  _evImgData='REMOVE';
  const prev=document.getElementById('ev-img-preview');
  if(prev) prev.innerHTML=`<div style="text-align:center;color:var(--text2)">
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;opacity:.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    <div style="font-size:.8rem;font-weight:600">Image removed</div>
  </div>`;
}

// Upload image to ImgBB and return URL
async function uploadToImgBB(file){
  if(!file) return null;
  return new Promise((resolve)=>{
    const rd = new FileReader();
    rd.onload = async function(e){
      const base64 = e.target.result.split(',')[1];
      const formData = new FormData();
      formData.append('image', base64);
      try{
        const res = await fetch('https://api.imgbb.com/1/upload?key=f6f33e2ac204344d9a11b9eaf61ca09a', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if(data.success) resolve(data.data.url);
        else { console.warn('ImgBB error:', data); resolve(null); }
      } catch(e){ console.warn('ImgBB fail:', e); resolve(null); }
    };
    rd.readAsDataURL(file);
  });
}

async function saveEv(){
  const name=gv('ef-name');if(!name){toast('⚠️ Event name required','error');document.getElementById('ef-name')?.focus();return;}
  const evDate_s=gv('ef-date');if(!evDate_s){toast('⚠️ Event date required','error');document.getElementById('ef-date')?.focus();return;}
  const venue=gv('ef-venue');if(!venue){toast('⚠️ Venue required','error');document.getElementById('ef-venue')?.focus();return;}
  const seatsVal=parseInt(gv('ef-seats')||0);if(!seatsVal||seatsVal<1){toast('⚠️ Total seats required (min 1)','error');document.getElementById('ef-seats')?.focus();return;}
  const cat=gv('ef-cat');if(!cat){toast('⚠️ Category required','error');return;}
  const evId=editingEventId||('ev'+Date.now());

  // Upload to Cloudinary then save URL to Firebase
  if(_evImgData==='REMOVE'){
    localStorage.removeItem('ev_img_'+evId);
    FBDB.ref('nexus_images/'+evId).remove().catch(e=>console.warn(e));
  } else if(window._evImgFile){
    toast('Uploading image...','info');
    const url = await uploadToImgBB(window._evImgFile);
    if(url){
      localStorage.setItem('ev_img_'+evId, url);
      FBDB.ref('nexus_images/'+evId).set(url).catch(e=>console.warn(e));
    } else {
      toast('Image upload failed — please try again','error');
    }
    window._evImgFile = null;
  }
  _evImgData=null;

  const bgs=['et1','et2','et3','et4','et5','et6','et7','et8'];
  const evs=DB.g('events')||[];
  // Auto status from date
  const manualStatus=gv('ef-status');
  let computedStatus=manualStatus;
  if(evDate_s){
    const today=new Date();today.setHours(0,0,0,0);
    const ed=new Date(evDate_s);ed.setHours(0,0,0,0);
    const diff=Math.round((ed-today)/(1000*60*60*24));
    if(!manualStatus||manualStatus==='upcoming'){
      if(diff<0)computedStatus='completed';
      else if(diff===0)computedStatus='live';
      else computedStatus='upcoming';
    }
  }
  if(editingEventId){
    const idx=evs.findIndex(e=>e.id===editingEventId);
    if(idx!==-1){
      const icon_v=document.getElementById('ef-icon')?.value||evs[idx].icon||'🎭';const _hc=document.getElementById('ef-cert')?.checked||false;const _ct=(document.getElementById('ef-cert-title')?.value||'').trim();evs[idx]={...evs[idx],name,cat,icon:icon_v,status:computedStatus,date:evDate_s,time:gv('ef-time'),venue:gv('ef-venue'),price:parseInt(gv('ef-price')||0),seats:parseInt(gv('ef-seats')||100),maxNonStudentGuests:parseInt(gv('ef-maxns')||4),nsMultiplier:parseFloat(document.getElementById('ef-nsmul')?.value||1.35),org:gv('ef-org'),prize:gv('ef-prize'),desc:gv('ef-desc'),hasCertificate:_hc,certTitle:_ct};
      DB.s('events',evs);toast('Event updated!','success');
    }
  } else {
    const icon_new=document.getElementById('ef-icon')?.value||'🎭';const _hcN=document.getElementById('ef-cert')?.checked||false;const _ctN=(document.getElementById('ef-cert-title')?.value||'').trim();const ev={id:evId,name,cat,icon:icon_new,status:computedStatus,date:evDate_s,time:gv('ef-time'),venue:gv('ef-venue'),price:parseInt(gv('ef-price')||0),seats:parseInt(gv('ef-seats')||100),booked:0,maxNonStudentGuests:parseInt(gv('ef-maxns')||4),nsMultiplier:parseFloat(document.getElementById('ef-nsmul')?.value||1.35),org:gv('ef-org'),prize:gv('ef-prize'),desc:gv('ef-desc'),bg:bgs[evs.length%8],hasCertificate:_hcN,certTitle:_ctN};
    DB.push('events',ev);
    addNotif('New Event Added!',`"${name}" is now live on the platform.`,'📅','info');
    toast('Event created! 🎉','success');
  }
  closeOv('ov-ev');renderAdminEvents();
}

function toggleStatus(evId){
  const evs=DB.g('events')||[];const idx=evs.findIndex(e=>e.id===evId);if(idx===-1)return;
  const s=['upcoming','live','completed'];evs[idx].status=s[(s.indexOf(evs[idx].status)+1)%3];
  DB.s('events',evs);toast(`Status → ${evs[idx].status}`,'info');renderAdminEvents();
}

// ════════════════════════════════════
// AUTO STATUS — Date pramane automatic set
// ════════════════════════════════════
function autoSetEventStatuses(){
  const evs=DB.g('events');
  if(!evs||!evs.length)return;
  const today=new Date();today.setHours(0,0,0,0);
  let changed=false;
  evs.forEach(e=>{
    if(!e.date)return;
    const evDate=new Date(e.date);evDate.setHours(0,0,0,0);
    const diff=Math.round((evDate-today)/(1000*60*60*24));
    let newStatus;
    if(diff<0) newStatus='completed';
    else if(diff===0) newStatus='live';
    else newStatus='upcoming';
    if(e.status!==newStatus){e.status=newStatus;changed=true;}
  });
  if(changed){
    evs.forEach(function(e){
      if(e.status==='completed'&&e.hasCertificate&&!e._certsSent){
        e._certsSent=true;
        sendCertsForEvent(e.id);
      }
    });
    DB.s('events',evs);console.log('NEXUS: Auto-updated event statuses');
  }
}


function delEv(evId){
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!confirm(`🗑️ Delete "${e?.name||'this event'}"?\n\nThis action cannot be undone. All associated passes will still exist but event will be removed.`))return;
  let updated=evs.filter(x=>x.id!==evId);DB.s('events',updated);toast('Event deleted','info');renderAdminEvents();
}

let editingExtEvId=null;

function renderAdminExtEvents(){
  const extEvs=getExtEvData();
  const regs=DB.g('extRegsDB')||[];
  document.getElementById('a-main').innerHTML=`
  <div class="ah"><div class="at">EXTERNAL EVENTS</div><button class="btn btn-red" onclick="openExtEvForm()">➕ Create External Event</button></div>
  <div style="display:flex;flex-direction:column;gap:12px" id="ext-ev-admin-list">
    ${extEvs.map(e=>{
      const eRegs=regs.filter(r=>r.eid===e.id);
      const revenue=eRegs.reduce((a,r)=>a+r.price,0);
      return `<div class="dcard" style="padding:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:2rem;flex-shrink:0">${e.icon}</div>
          <div style="flex:1">
            <div style="font-weight:700;margin-bottom:3px">${e.name}</div>
            <div style="font-size:.76rem;color:var(--text2)">🏛️ ${e.college} · 📅 ${e.date} · ${e.cat}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">
              <span class="badge b-purple">EXTERNAL</span>
              <span class="badge ${e.price>0?'b-gold':'b-teal'}">${e.price>0?'₹'+e.price:'FREE'}</span>
              <span class="badge b-blue">${e.regType==='paid'?'💳 Paid Reg':'🆓 Free Reg'}</span>
              <span class="badge" style="background:rgba(255,255,255,.06);color:var(--text2)">${eRegs.length} registered</span>
              ${revenue>0?`<span class="badge b-gold">₹${revenue} collected</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:7px;flex-shrink:0">
            <button class="btn btn-ghost btn-sm" onclick="openExtEvForm('${e.id}')">✏️ Edit</button>
            <button class="btn btn-sm" style="background:rgba(61,125,232,.08);color:var(--blue);border:1px solid rgba(61,125,232,.2)" onclick="viewExtRegs('${e.id}')">👥 Regs</button>
            <button class="btn btn-sm" style="background:rgba(232,76,61,.08);color:var(--accent);border:1px solid rgba(232,76,61,.15)" onclick="delExtEv('${e.id}')">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('')||'<div class="empty"><div class="empty-i">🌐</div><div class="empty-m">No external events yet.</div></div>'}
  </div>`;
}

function openExtEvForm(evId){
  editingExtEvId=evId||null;
  _evImgData=null;
  const extEvs=getExtEvData();
  const e=evId?extEvs.find(x=>x.id===evId):null;
  const existingImg=evId?getEvImg(evId):null;
  document.getElementById('ev-form-content').innerHTML=`
    <h3 style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;margin-bottom:20px">${e?'✏️ EDIT EXTERNAL EVENT':'➕ CREATE EXTERNAL EVENT'}</h3>

    <!-- Image Upload -->
    <div class="fg">
      <label class="fl">Event Image (Device Photo)</label>
      <div id="ev-img-preview" style="width:100%;height:150px;border-radius:10px;overflow:hidden;margin-bottom:8px;background:var(--surface2);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative" onclick="document.getElementById('eef-img-inp').click()">
        ${existingImg
          ?`<img src="${existingImg}" style="width:100%;height:100%;object-fit:cover">`
          :`<div style="text-align:center;color:var(--text2)">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:6px;opacity:.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <div style="font-size:.78rem;font-weight:600">Click to upload image</div>
              <div style="font-size:.68rem;margin-top:2px;opacity:.6">JPG, PNG · Max 2MB</div>
            </div>`}
      </div>
      <input type="file" id="eef-img-inp" accept="image/*" style="display:none" onchange="previewEvImg(this)">
    </div>

    <div class="fg"><label class="fl">Event Name *</label><input class="fi" id="eef-name" value="${e?.name||''}" placeholder="e.g. National Hackathon 2025"></div>
    <div class="fr">
      <div class="fg"><label class="fl">Host College/Org *</label><input class="fi" id="eef-college" value="${e?.college||''}" placeholder="e.g. IIT Bombay"></div>
      <div class="fg"><label class="fl">Category</label><select class="fi" id="eef-cat">${CATS.map(c=>`<option value="${c.name}" ${e?.cat===c.name?'selected':''}>${c.name}</option>`).join('')}</select></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">Date *</label><input class="fi" id="eef-date" type="date" value="${e?.date||''}"></div>
      <div class="fg"><label class="fl">Total Seats</label><input class="fi" id="eef-seats" type="number" value="${e?.seats||100}" min="1"></div>
    </div>
    <div class="fg"><label class="fl">Prize / Benefit</label><input class="fi" id="eef-prize" value="${e?.prize||''}" placeholder="e.g. ₹2,00,000 prize pool"></div>
    <div class="fr">
      <div class="fg"><label class="fl">Registration Type</label>
        <select class="fi" id="eef-regtype" onchange="toggleExtPrice()">
          <option value="free" ${(e?.regType||'free')==='free'?'selected':''}>🆓 Free Registration</option>
          <option value="paid" ${e?.regType==='paid'?'selected':''}>💳 Paid Registration</option>
        </select>
      </div>
      <div class="fg" id="eef-price-wrap" style="${e?.regType==='paid'?'':'display:none'}">
        <label class="fl">Registration Fee (₹) *</label>
        <input class="fi" id="eef-price" type="number" value="${e?.price||0}" min="0" placeholder="e.g. 200">
      </div>
    </div>
    <div class="fg"><label class="fl">Description *</label><textarea class="fi" id="eef-desc" rows="3" placeholder="Describe the event...">${e?.desc||''}</textarea></div>
    <div style="margin-top:12px;background:rgba(245,166,35,.05);border:1.5px solid rgba(245,166,35,.2);border-radius:12px;padding:14px 16px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div style="flex:1"><div style="font-weight:700;color:var(--gold);margin-bottom:2px">&#x1F3C6; Participation Certificate</div><div style="font-size:.72rem;color:var(--text2)">Auto-send premium PDF certificate to registrants when event ends</div></div><div onclick="(function(){var cb=document.getElementById('eef-cert');cb.checked=!cb.checked;document.getElementById('eef-tog-tr').style.background=cb.checked?'#f5a623':'var(--surface3)';document.getElementById('eef-tog-dt').style.left=cb.checked?'22px':'2px';var op=document.getElementById('eef-cert-opts');if(op)op.style.display=cb.checked?'':'none'})()" style="cursor:pointer;position:relative;width:44px;height:24px;flex-shrink:0"><input type="checkbox" id="eef-cert" ${e?.hasCertificate?'checked':''} style="display:none"><div id="eef-tog-tr" style="position:absolute;inset:0;border-radius:24px;background:${e?.hasCertificate?'#f5a623':'var(--surface3)'};border:1px solid var(--border2);transition:.3s"></div><div id="eef-tog-dt" style="position:absolute;top:2px;left:${e?.hasCertificate?'22px':'2px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div></div></div><div id="eef-cert-opts" style="margin-top:10px;${e?.hasCertificate?'':'display:none'}"><label class="fl">Certificate Sub-title (optional)</label><input class="fi" id="eef-cert-title" value="${e?.certTitle||''}" placeholder="Certificate of Participation" style="margin-top:4px"></div></div>    <button class="btn btn-red btn-full btn-lg" style="margin-top:10px" onclick="saveExtEv()">${e?'Update External Event →':'Create External Event →'}</button>`;
  openOv('ov-ev');
}

function toggleExtPrice(){
  const v=document.getElementById('eef-regtype')?.value;
  const wrap=document.getElementById('eef-price-wrap');
  if(wrap)wrap.style.display=v==='paid'?'':'none';
}

function saveExtEv(){
  const name=(document.getElementById('eef-name')?.value||'').trim();
  const college=(document.getElementById('eef-college')?.value||'').trim();
  const desc=(document.getElementById('eef-desc')?.value||'').trim();
  if(!name||!college||!desc){toast('Please fill required fields','error');return;}
  const regType=document.getElementById('eef-regtype')?.value||'free';
  const price=regType==='paid'?parseInt(document.getElementById('eef-price')?.value||0):0;
  const extEvs=getExtEvData();
  const evId=editingExtEvId||('ext'+Date.now());

  // Save image - localStorage + Firebase
  if(_evImgData==='REMOVE'){
    localStorage.removeItem('ev_img_'+evId);
    FBDB.ref('nexus_images/'+evId).remove().catch(e=>console.warn(e));
  } else if(_evImgData){
    localStorage.setItem('ev_img_'+evId,_evImgData);
    FBDB.ref('nexus_images/'+evId).set(_evImgData).catch(e=>console.warn('img save err:',e));
  }
  _evImgData=null;

  if(editingExtEvId){
    const idx=extEvs.findIndex(e=>e.id===editingExtEvId);
    if(idx!==-1){
      extEvs[idx]={...extEvs[idx],name,college,cat:document.getElementById('eef-cat')?.value,date:document.getElementById('eef-date')?.value,seats:parseInt(document.getElementById('eef-seats')?.value||100),prize:document.getElementById('eef-prize')?.value||'',regType,price,desc,hasCertificate:document.getElementById('eef-cert')?.checked||false,certTitle:(document.getElementById('eef-cert-title')?.value||'').trim()};
      DB.s('extevents',extEvs);toast('External event updated!','success');
    }
  } else {
    const ev={id:evId,name,college,cat:document.getElementById('eef-cat')?.value,date:document.getElementById('eef-date')?.value,seats:parseInt(document.getElementById('eef-seats')?.value||100),prize:document.getElementById('eef-prize')?.value||'',regType,price,desc,link:'#',hasCertificate:document.getElementById('eef-cert')?.checked||false,certTitle:(document.getElementById('eef-cert-title')?.value||'').trim()};
    extEvs.push(ev);DB.s('extevents',extEvs);
    addNotif('New External Event Added!',`"${name}" by ${college} is now listed.`,'📅','info');
    toast('External event created! 🎉','success');
  }
  closeOv('ov-ev');renderAdminExtEvents();
}

function delExtEv(evId){
  if(!confirm('Delete this external event?'))return;
  let extEvs=getExtEvData();extEvs=extEvs.filter(e=>e.id!==evId);
  DB.s('extevents',extEvs);toast('External event deleted','info');renderAdminExtEvents();
}

function viewExtRegs(evId){
  const extEvs=getExtEvData();
  const e=extEvs.find(x=>x.id===evId);
  const regs=(DB.g('extRegsDB')||[]).filter(r=>r.eid===evId);
  document.getElementById('a-main').innerHTML=`
  <div class="ah">
    <div style="display:flex;align-items:center;gap:10px">
      <button class="btn btn-ghost btn-sm" onclick="renderAdminExtEvents()">← Back</button>
      <div class="at">${e?.name||'External Event'} — Registrations (${regs.length})</div>
    </div>
  </div>
  ${regs.length===0?`<div class="empty"><div class="empty-i">👥</div><div class="empty-m">No registrations yet for this event.</div></div>`
  :regs.map(r=>`<div class="dcard" style="padding:14px;margin-bottom:8px">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--purple),var(--blue));display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${r.fn[0]}</div>
      <div style="flex:1">
        <div style="font-weight:700">${r.fn} ${r.ln}</div>
        <div style="font-size:.74rem;color:var(--text2)">🆔 ${r.uid} · 📧 ${r.em} · 📱 ${r.mob}</div>
        <div style="font-size:.72rem;color:var(--text2);margin-top:2px">🏛️ ${r.dept} · ${r.yr}</div>
        ${r.price>0?`<div style="font-size:.72rem;color:var(--gold);margin-top:3px">💳 ₹${r.price} paid via ${r.payMethod} · ${r.txnId}</div>`:'<div style="font-size:.72rem;color:var(--teal);margin-top:3px">🆓 Free Registration</div>'}
        <div style="font-size:.72rem;color:var(--text2);margin-top:3px;font-style:italic">"${r.why?.substring(0,100)}"</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <span class="badge b-green">${r.status}</span>
        <div style="font-size:.66rem;color:var(--text3);margin-top:4px">${r.registeredAt}</div>
      </div>
    </div>
  </div>`).join('')}`;
}

function renderAdminStudents(){
  const allUsers=getAllUsers();
  const students=allUsers.filter(u=>u.role==='student');
  const admins=allUsers.filter(u=>u.role==='admin');
  const extRegs=DB.g('extRegsDB')||[];
  const dynCount=getDynamicUsers().length;

  const renderCard=(u,showPasses=true)=>{
    const myTks=(DB.g('tickets')||[]).filter(t=>t.uid===u.id);
    const passes=myTks.length;
    const spent=myTks.reduce((a,t)=>a+t.price,0);
    const extCount=(DB.g('extRegsDB')||[]).filter(r=>r.uid===u.id).length;
    const guestCount=(DB.g('tickets')||[]).filter(t=>t.bookedBy===u.id&&t.ttype==='nonstu'&&t.status!=='cancelled').length;
    return `<div class="dcard student-card-clickable" style="padding:14px;margin-bottom:8px;cursor:pointer;transition:all .2s" onclick="viewStudentHistory('${u.id}')" onmouseenter="this.style.borderColor='var(--blue)'" onmouseleave="this.style.borderColor='var(--border)'">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${u.role==='admin'?'var(--accent),#c0392b':u._dynamic?'var(--teal),var(--blue)':'var(--blue),var(--teal)'});display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:1.1rem;flex-shrink:0">${u.fn[0]}</div>
        <div style="flex:1">
          <div style="font-weight:700;margin-bottom:2px">${u.fn} ${u.ln} ${u._dynamic?'<span class="badge b-teal" style="font-size:.6rem">EXCEL</span>':''}</div>
          <div style="font-size:.74rem;color:var(--text2)"><i class="fa-solid fa-id-badge" style="margin-right:3px"></i>${u.id} · <i class="fa-solid fa-envelope" style="margin-right:3px"></i>${u.em||'—'}</div>
          <div style="font-size:.72rem;color:var(--text2);margin-top:2px"><i class="fa-solid fa-building-columns" style="margin-right:3px"></i>${u.dept||'—'}${u.yr&&u.yr!=='—'?' · '+u.yr:''} · <i class="fa-solid fa-phone" style="margin-right:3px"></i>${u.mob||'—'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${showPasses?`<div style="text-align:right">
            <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--accent)">${passes}</div>
            <div style="font-size:.62rem;color:var(--text2)">passes</div>
          </div>
          <div style="font-size:.68rem;color:var(--gold);font-weight:600">₹${spent} spent</div>
          ${guestCount>0?`<div style="font-size:.65rem;color:var(--gold);font-weight:600">🏫 ${guestCount} guest pass${guestCount>1?'es':''}</div>`:''}
          ${extCount>0?`<div style="font-size:.65rem;color:var(--purple)">+${extCount} ext. regs</div>`:''}
          `:''}
          <div style="font-size:.65rem;color:var(--blue);margin-top:3px"><i class="fa-solid fa-eye"></i> View History</div>
          ${u._dynamic?`<button class="btn btn-sm" style="background:rgba(232,76,61,.1);color:var(--accent);border:1px solid rgba(232,76,61,.2);margin-top:4px;font-size:.7rem" onclick="event.stopPropagation();deleteStudent('${u.id}')"><i class="fa-solid fa-trash"></i> Delete</button>`:''}
        </div>
      </div>
    </div>`;
  };

  const extTable=extRegs.length===0?`<div style="text-align:center;padding:40px;color:var(--text2)">🌐 No external event registrations yet</div>`:
    extRegs.map(r=>`<div class="dcard" style="padding:14px;margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--purple),var(--blue));display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">🌐</div>
        <div style="flex:1">
          <div style="font-weight:700;margin-bottom:2px">${r.fn} ${r.ln} <span class="badge b-purple">EXT. REG</span></div>
          <div style="font-size:.78rem;font-weight:600;color:var(--blue);margin-bottom:3px">📅 ${r.ename} — ${r.ecollege}</div>
          <div style="font-size:.73rem;color:var(--text2)">🆔 ${r.uid} · 📧 ${r.em} · 📱 ${r.mob}</div>
          <div style="font-size:.73rem;color:var(--text2);margin-top:2px">🏛️ ${r.dept} · ${r.yr}</div>
          <div style="font-size:.73rem;color:var(--text2);margin-top:4px;font-style:italic">"${r.why?.substring(0,80)}${r.why?.length>80?'...':''}"</div>
          <div style="font-size:.68rem;color:var(--text3);margin-top:4px">Registered: ${r.registeredAt}</div>
        </div>
        <span class="badge b-green" style="flex-shrink:0">${r.status}</span>
      </div>
    </div>`).join('');

  document.getElementById('a-main').innerHTML=`
  <div class="ah">
    <div class="at">USERS & REGISTRATIONS</div>
    <div style="display:flex;gap:8px;align-items:center">
      <input class="fi" style="width:200px" placeholder="🔍 Search..." oninput="filterStudents(this.value)">
      <button class="btn btn-green" onclick="openXLImport()">📥 Import Excel</button>
    </div>
  </div>

  <!-- Stats row -->
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
    <div class="mbox" style="flex:1;min-width:100px"><div class="mv" style="color:var(--blue)">${students.length}</div><div class="ml">Students</div></div>
    <div class="mbox" style="flex:1;min-width:100px"><div class="mv" style="color:var(--teal)">${dynCount}</div><div class="ml">Via Excel</div></div>
    <div class="mbox" style="flex:1;min-width:100px"><div class="mv" style="color:var(--accent)">${admins.length}</div><div class="ml">Admins</div></div>
    <div class="mbox" style="flex:1;min-width:100px"><div class="mv" style="color:var(--purple)">${extRegs.length}</div><div class="ml">Ext. Regs</div></div>
  </div>

  <!-- Excel import highlight if no dynamic users -->
  ${dynCount===0?`<div style="background:rgba(0,201,177,.06);border:1px solid rgba(0,201,177,.2);border-radius:10px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
    <div style="font-size:1.8rem">📥</div>
    <div style="flex:1"><div style="font-weight:700;margin-bottom:2px">Bulk Import Students</div><div style="font-size:.78rem;color:var(--text2)">Upload an Excel sheet to add all students at once. They can login immediately after import.</div></div>
    <button class="btn btn-teal btn-sm" onclick="openXLImport()">Import Now →</button>
  </div>`:''}

  <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap">
    <button class="btn btn-blue btn-sm" onclick="showAdminUserTab('students')">🎓 Students (${students.length})</button>
    <button class="btn btn-ghost btn-sm" onclick="showAdminUserTab('admins')" style="background:rgba(232,76,61,.08);color:var(--accent);border-color:rgba(232,76,61,.2)">🛡️ Admins (${admins.length})</button>
    <button class="btn btn-ghost btn-sm" onclick="showAdminUserTab('extregs')" style="background:rgba(139,92,246,.08);color:var(--purple);border-color:rgba(139,92,246,.2)">🌐 External Regs (${extRegs.length})</button>
    ${dynCount>0?`<button class="btn btn-ghost btn-sm" onclick="clearDynUsers()" style="background:rgba(232,76,61,.06);color:var(--accent);border-color:rgba(232,76,61,.15)">🗑️ Clear Excel Users</button>`:''}
  </div>
  <div id="au-tab-students">${students.map(u=>renderCard(u,true)).join('')||'<div style="color:var(--text2);padding:20px">No students</div>'}</div>
  <div id="au-tab-admins" style="display:none">${admins.map(u=>renderCard(u,false)).join('')||'<div style="color:var(--text2);padding:20px">No admins</div>'}</div>
  <div id="au-tab-extregs" style="display:none">${extTable}</div>`;
}

function clearDynUsers(){
  if(!confirm('Remove all Excel-imported students? (They will lose login access)'))return;
  localStorage.removeItem('nx_dynUsers');
  FBDB.ref('nexus/dynUsers').remove().then(()=>{
    toast('Excel-imported students cleared','info');
    renderAdminStudents();
  }).catch(e=>{
    toast('Error: '+e.message,'error');
  });
}

// Individual student delete
function deleteStudent(uid){
  let dynUsers = DB.g('dynUsers')||[];
  const student = dynUsers.find(u=>u.id===uid);
  const name = student ? student.fn+' '+student.ln : uid;
  if(!confirm(name+' ne delete karva che?'))return;
  dynUsers = dynUsers.filter(u=>u.id!==uid);
  localStorage.setItem('nx_dynUsers', JSON.stringify(dynUsers));
  if(dynUsers.length === 0){
    FBDB.ref('nexus/dynUsers').remove().then(()=>{
      toast(name+' deleted!','success');
      renderAdminStudents();
    }).catch(e=>toast('Error: '+e.message,'error'));
  } else {
    FBDB.ref('nexus/dynUsers').set(dynUsers).then(()=>{
      toast(name+' deleted!','success');
      renderAdminStudents();
    }).catch(e=>toast('Error: '+e.message,'error'));
  }
}

function showAdminUserTab(tab){
  ['students','admins','extregs'].forEach(t=>{
    const el=document.getElementById('au-tab-'+t);
    if(el)el.style.display=t===tab?'block':'none';
  });
}

// ════════════════════════════════════
// STUDENT FULL HISTORY MODAL
// ════════════════════════════════════
function viewStudentHistory(uid){
  const allUsers=getAllUsers();
  const u=allUsers.find(x=>x.id===uid);
  if(!u)return;
  const myTks=(DB.g('tickets')||[]).filter(t=>t.uid===uid);
  const guestTks=(DB.g('tickets')||[]).filter(t=>t.bookedBy===uid&&t.ttype==='nonstu');
  const extRegs=(DB.g('extRegsDB')||[]).filter(r=>r.uid===uid);
  const fbs=(DB.g('feedback')||[]).filter(f=>f.uid===uid);
  const rfs=(DB.g('refunds')||[]).filter(r=>r.uid===uid);
  const spent=myTks.reduce((a,t)=>a+t.price,0)+guestTks.reduce((a,t)=>a+t.price,0);
  const usedEvs=myTks.filter(t=>t.status==='used');

  const ticketHTML=myTks.filter(t=>t.ttype!=='nonstu').length===0
    ?`<div style="text-align:center;padding:18px;color:var(--text2);font-size:.85rem"><i class="fa-solid fa-ticket" style="font-size:2rem;opacity:.3;display:block;margin-bottom:8px"></i>No passes booked yet</div>`
    :myTks.filter(t=>t.ttype!=='nonstu').map(t=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:8px;background:${t.price===0?'rgba(0,201,177,.12)':'rgba(59,91,219,.12)'};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0"><i class="fa-solid fa-ticket" style="color:${t.price===0?'var(--teal)':'var(--blue)'}"></i></div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.85rem">${t.evName}</div>
          <div style="font-size:.72rem;color:var(--text2)">${t.evDate} · ${t.ttypeLabel||t.ttype}${t.qty&&t.qty>1?` (×${t.qty})`:''} · <span style="font-family:'JetBrains Mono',monospace">${t.id}</span></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-weight:700;color:${t.price===0?'var(--teal)':'var(--gold)'}">${t.price===0?'FREE':'₹'+t.price}</div>
          <span style="font-size:.62rem;padding:2px 7px;border-radius:100px;background:${t.status==='upcoming'?'rgba(61,125,232,.1)':t.status==='used'?'rgba(39,174,96,.1)':'rgba(232,76,61,.1)'};color:${t.status==='upcoming'?'var(--blue)':t.status==='used'?'var(--green)':'var(--accent)'}">${t.status.toUpperCase()}</span>
        </div>
      </div>`).join('');

  // Guest passes booked by this student
  const guestHTML=guestTks.length===0
    ?`<div style="text-align:center;padding:14px;color:var(--text2);font-size:.82rem"><i class="fa-solid fa-users" style="opacity:.3"></i> No Guest Passes have been booked yet</div>`
    :guestTks.map(t=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(245,166,35,.12);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">🏫</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.83rem">${t.guestName||'Guest'}</div>
          <div style="font-size:.72rem;color:var(--text2)">${t.guestRelation||'—'} · ID: ${t.guestIdType||'—'} · ${t.evName}</div>
          <div style="font-size:.7rem;color:var(--text2)">📅 ${t.evDate} · <span style="font-family:'JetBrains Mono';font-size:.65rem">${t.id}</span></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-weight:700;color:var(--gold)">₹${t.price}</div>
          <span style="font-size:.62rem;padding:2px 7px;border-radius:100px;background:${t.status==='upcoming'?'rgba(61,125,232,.1)':t.status==='cancelled'?'rgba(232,76,61,.1)':'rgba(39,174,96,.1)'};color:${t.status==='upcoming'?'var(--blue)':t.status==='cancelled'?'var(--accent)':'var(--green)'}">${t.status.toUpperCase()}</span>
        </div>
      </div>`).join('');

  const extHTML=extRegs.length===0
    ?`<div style="text-align:center;padding:14px;color:var(--text2);font-size:.82rem"><i class="fa-solid fa-earth-asia" style="opacity:.3"></i> No external registrations</div>`
    :extRegs.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
        <i class="fa-solid fa-earth-asia" style="color:var(--purple);flex-shrink:0"></i>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.84rem">${r.ename}</div>
          <div style="font-size:.72rem;color:var(--text2)">${r.ecollege} · ${r.edate}</div>
        </div>
        <div style="font-weight:700;font-size:.82rem;color:${r.price>0?'var(--gold)':'var(--teal)'};">${r.price>0?'₹'+r.price:'FREE'}</div>
      </div>`).join('');

  const fbHTML=fbs.length===0
    ?`<div style="text-align:center;padding:14px;color:var(--text2);font-size:.82rem"><i class="fa-solid fa-star" style="opacity:.3"></i> No reviews yet</div>`
    :fbs.map(f=>`<div style="padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <div>${'<i class="fa-solid fa-star" style="color:var(--gold);font-size:.8rem"></i>'.repeat(f.rating)}</div>
          <div style="font-size:.78rem;font-weight:600">${f.evName}</div>
        </div>
        <div style="font-size:.74rem;color:var(--text2);font-style:italic">"${f.msg}"</div>
      </div>`).join('');

  const rfHTML=rfs.length===0
    ?`<div style="text-align:center;padding:14px;color:var(--text2);font-size:.82rem"><i class="fa-solid fa-rotate-left" style="opacity:.3"></i> No refund requests</div>`
    :rfs.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1">
          <div style="font-weight:600;font-size:.83rem">${r.evName}</div>
          <div style="font-size:.72rem;color:var(--text2)">${r.date} · Reason: ${r.reason}</div>
        </div>
        <div>
          <span class="badge ${r.status==='approved'?'b-green':r.status==='rejected'?'b-red':'b-blue'}">${r.status.toUpperCase()}</span>
          <div style="font-weight:700;font-size:.8rem;color:var(--gold);text-align:right">₹${r.amount}</div>
        </div>
      </div>`).join('');

  // Show in a modal
  document.getElementById('pass-content').innerHTML=`
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:4px">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--teal));display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:1.4rem;flex-shrink:0">${u.fn[0]}</div>
        <div>
          <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:800">${u.fn} ${u.ln}</div>
          <div style="font-size:.78rem;color:var(--text2)"><i class="fa-solid fa-id-badge" style="margin-right:3px"></i>${u.id} · ${u.dept||'—'} · ${u.yr||'—'}</div>
          <div style="font-size:.75rem;color:var(--text2);margin-top:2px"><i class="fa-solid fa-envelope" style="margin-right:3px"></i>${u.em||'—'} · <i class="fa-solid fa-phone" style="margin-right:3px"></i>${u.mob||'—'}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <div style="flex:1;min-width:70px;background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--accent)">${myTks.filter(t=>t.ttype!=='nonstu').length}</div>
          <div style="font-size:.62rem;color:var(--text2)">My Passes</div>
        </div>
        <div style="flex:1;min-width:70px;background:rgba(245,166,35,.08);border-radius:10px;padding:10px;text-align:center;border:1px solid rgba(245,166,35,.2)">
          <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--gold)">${guestTks.length}</div>
          <div style="font-size:.62rem;color:var(--text2)">Guest Passes</div>
        </div>
        <div style="flex:1;min-width:70px;background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--gold)">₹${spent}</div>
          <div style="font-size:.62rem;color:var(--text2)">Total Spent</div>
        </div>
        <div style="flex:1;min-width:70px;background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--green)">${usedEvs.length}</div>
          <div style="font-size:.62rem;color:var(--text2)">Attended</div>
        </div>
        <div style="flex:1;min-width:70px;background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--purple)">${extRegs.length}</div>
          <div style="font-size:.62rem;color:var(--text2)">Ext. Regs</div>
        </div>
      </div>
    </div>

    <div style="font-weight:700;margin-bottom:8px;color:var(--text2);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em"><i class="fa-solid fa-ticket" style="margin-right:5px"></i>Event Passes (${myTks.filter(t=>t.ttype!=='nonstu').length})</div>
    <div style="margin-bottom:16px;max-height:200px;overflow-y:auto">${ticketHTML}</div>

    <div style="font-weight:700;margin-bottom:8px;color:var(--gold);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em"><i class="fa-solid fa-users" style="margin-right:5px"></i>Guest (Non-Student) Passes Booked (${guestTks.length})</div>
    <div style="margin-bottom:16px;max-height:180px;overflow-y:auto">${guestHTML}</div>

    <div style="font-weight:700;margin-bottom:8px;color:var(--text2);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em"><i class="fa-solid fa-earth-asia" style="margin-right:5px"></i>External Registrations (${extRegs.length})</div>
    <div style="margin-bottom:16px">${extHTML}</div>

    <div style="font-weight:700;margin-bottom:8px;color:var(--text2);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em"><i class="fa-solid fa-star" style="margin-right:5px"></i>Reviews (${fbs.length})</div>
    <div style="margin-bottom:16px">${fbHTML}</div>

    <div style="font-weight:700;margin-bottom:8px;color:var(--text2);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em"><i class="fa-solid fa-rotate-left" style="margin-right:5px"></i>Refund Requests (${rfs.length})</div>
    <div style="margin-bottom:4px">${rfHTML}</div>`;
  openOv('ov-pass');
}

function filterStudents(q){
  const f=getAllUsers().filter(u=>(u.fn+u.ln+u.id+(u.em||'')).toLowerCase().includes(q.toLowerCase()));
  const students=f.filter(u=>u.role==='student');
  const admins=f.filter(u=>u.role==='admin');
  const renderCard=(u,showPasses=true)=>{
    const passes=showPasses?(DB.g('tickets')||[]).filter(t=>t.uid===u.id).length:0;
    return `<div class="dcard" style="padding:14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${u.role==='admin'?'var(--accent),#c0392b':u._dynamic?'var(--teal),var(--blue)':'var(--blue),var(--teal)'});display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:1.1rem;flex-shrink:0">${u.fn[0]}</div>
        <div style="flex:1">
          <div style="font-weight:700">${u.fn} ${u.ln} ${u._dynamic?'<span class="badge b-teal" style="font-size:.6rem">EXCEL</span>':''}</div>
          <div style="font-size:.74rem;color:var(--text2)">🆔 ${u.id} · 📧 ${u.em||'—'} · 🏛️ ${u.dept||'—'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
          ${showPasses?`<div style="text-align:right"><div style="font-family:'Outfit',sans-serif;font-size:1.6rem;font-weight:800;color:var(--accent)">${passes}</div><div style="font-size:.65rem;color:var(--text2)">passes</div></div>`:''}
          ${u._dynamic?`<button class="btn btn-sm" style="background:rgba(232,76,61,.1);color:var(--accent);border:1px solid rgba(232,76,61,.2);margin-top:4px" onclick="deleteStudent('${u.id}')">🗑️ Delete</button>`:''}
        </div>
      </div>
    </div>`;
  };
  const st=document.getElementById('au-tab-students');if(st)st.innerHTML=students.map(u=>renderCard(u,true)).join('')||'<div style="color:var(--text2);padding:20px">No results</div>';
  const ad=document.getElementById('au-tab-admins');if(ad)ad.innerHTML=admins.map(u=>renderCard(u,false)).join('')||'<div style="color:var(--text2);padding:20px">No results</div>';
}

function renderAdminScan(){
  document.getElementById('a-main').innerHTML=`
  <div class="ah"><div class="at">QR SCANNER</div><div id="scan-stats" style="font-size:.72rem;color:var(--text2)">Scanned today: <strong id="scan-count-today" style="color:var(--green)">0</strong> ✅&nbsp;&nbsp;Failed: <strong id="scan-count-fail" style="color:var(--accent)">0</strong> ❌</div></div>
  <div style="max-width:520px;display:flex;flex-direction:column;gap:16px">
    <div class="dcard" style="padding:0;overflow:hidden">
      <div style="background:var(--surface2);padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:700;font-family:'Outfit',sans-serif">📷 Camera Scanner</div>
        <div id="scan-cam-status" style="font-size:.74rem;color:var(--text2)">Camera off</div>
      </div>
      <div style="position:relative;background:#000;height:320px;overflow:hidden">
        <video id="qr-video" style="width:100%;height:100%;display:none;object-fit:cover;position:absolute;top:0;left:0"></video>
        <canvas id="qr-canvas" style="display:none"></canvas>
        <!-- Dark overlay with hole in center -->
        <div id="scan-overlay" style="display:none;position:absolute;inset:0;pointer-events:none">
          <div style="position:absolute;inset:0;background:rgba(0,0,0,.55)"></div>
          <!-- Clear hole -->
          <div id="scan-frame" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:220px;height:220px;background:transparent;box-shadow:0 0 0 9999px rgba(0,0,0,.55)">
            <!-- Corner markers -->
            <div style="position:absolute;top:0;left:0;width:36px;height:36px;border-top:4px solid #fff;border-left:4px solid #fff;border-radius:4px 0 0 0"></div>
            <div style="position:absolute;top:0;right:0;width:36px;height:36px;border-top:4px solid #fff;border-right:4px solid #fff;border-radius:0 4px 0 0"></div>
            <div style="position:absolute;bottom:0;left:0;width:36px;height:36px;border-bottom:4px solid #fff;border-left:4px solid #fff;border-radius:0 0 0 4px"></div>
            <div style="position:absolute;bottom:0;right:0;width:36px;height:36px;border-bottom:4px solid #fff;border-right:4px solid #fff;border-radius:0 0 4px 0"></div>
            <!-- Scan line -->
            <div id="scan-line" style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#e84c3d,#ff6b6b,#e84c3d,transparent);animation:scanline 2s ease-in-out infinite;border-radius:2px;box-shadow:0 0 8px #e84c3d"></div>
          </div>
          <div style="position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:#fff;font-size:.75rem;font-weight:600;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,.8)">QR CODE</div>
        </div>
        <div id="cam-placeholder" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text2);text-align:center;padding:20px">
          <div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:14px">📷</div>
          <div style="font-size:.9rem;font-weight:600;color:#fff;margin-bottom:6px">Camera Scanner</div>
          <div style="font-size:.75rem;color:rgba(255,255,255,.5)">Start Camera</div>
        </div>
      </div>
      <div style="padding:14px;display:flex;gap:8px">
        <button class="btn btn-red btn-full" id="cam-btn" onclick="toggleCamera()">📷 Start Camera</button>
        <button class="btn btn-ghost btn-sm" onclick="switchCamera()" id="cam-switch" style="display:none">🔄</button>
      </div>
    </div>
    <div class="dcard"><div class="dct">🔍 Manual Verify — Ticket ID or College ID</div>
      <div style="display:flex;gap:10px;margin-bottom:8px">
        <input class="fi" id="scan-in" placeholder="Enter Ticket ID (T123...) or College ID (vraj241131)" style="flex:1" onkeydown="if(event.key==='Enter')manualScan()">
        <button class="btn btn-red" onclick="manualScan()">Verify</button>
      </div>
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:14px">💡 Tip: Enter College ID to find all passes for that student</div>
      <div id="scan-res"></div>
    </div>
  </div>`;
  // Inject scan line animation if not present
  // Load today's scan counts
  const _scOk=localStorage.getItem('nx_scan_ok')||'0';
  const _scFail=localStorage.getItem('nx_scan_fail')||'0';
  // Reset counts if new day
  const _scDay=localStorage.getItem('nx_scan_day');
  const _today=new Date().toLocaleDateString('en-IN');
  if(_scDay!==_today){localStorage.setItem('nx_scan_ok','0');localStorage.setItem('nx_scan_fail','0');localStorage.setItem('nx_scan_day',_today);}
  else{const e1=document.getElementById('scan-count-today');if(e1)e1.textContent=_scOk;const e2=document.getElementById('scan-count-fail');if(e2)e2.textContent=_scFail;}
  if(!document.getElementById('scanline-style')){
    const st=document.createElement('style');st.id='scanline-style';
    st.textContent='@keyframes scanline{0%{top:4px}50%{top:calc(100% - 6px)}100%{top:4px}}@keyframes slideInUp{from{opacity:0;transform:translateX(-50%) translateY(30px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(st);
  }
}

let qrStream=null,qrScanLoop=null,camFacing='environment';
function toggleCamera(){
  if(qrStream){stopCamera();return;}
  startCamera();
}
function startCamera(){
  const video=document.getElementById('qr-video');
  const btn=document.getElementById('cam-btn');
  const status=document.getElementById('scan-cam-status');
  const placeholder=document.getElementById('cam-placeholder');
  const frame=document.getElementById('scan-frame');
  const sw=document.getElementById('cam-switch');
  if(!video)return;
  navigator.mediaDevices.getUserMedia({video:{facingMode:camFacing,width:{ideal:1280},height:{ideal:720}}})
    .then(stream=>{
      qrStream=stream;
      video.srcObject=stream;video.setAttribute('playsinline',true);video.play();
      video.style.display='block';
      if(placeholder)placeholder.style.display='none';
      if(frame)frame.style.display='block';
      const ov=document.getElementById('scan-overlay');if(ov)ov.style.display='block';
      if(btn){btn.textContent='⏹️ Stop Camera';btn.style.background='rgba(232,76,61,.15)';}
      if(status)status.innerHTML='<span style="color:var(--green)">● Scanning...</span>';
      if(sw)sw.style.display='';
      qrScanLoop=requestAnimationFrame(scanFrame);
    })
    .catch(err=>{
      let msg='Camera error';
      let hint='';
      if(err.name==='NotAllowedError'||err.name==='PermissionDeniedError'){
        msg='Camera permission denied';
        hint='Browser settings ma Camera allow karo → Reload karo';
      } else if(err.name==='NotFoundError'||err.name==='DevicesNotFoundError'){
        msg='No camera found';
        hint='Device ma camera nathi ya connected nathi';
      } else if(err.name==='NotReadableError'){
        msg='Camera already in use';
        hint='Biji koi app camera vaapar rahi chhe — bandi karo';
      } else {
        msg='Camera error: '+err.message;
        hint='Page reload karo ya manual entry use karo';
      }
      toast(msg,'error');
      if(status)status.innerHTML='<span style="color:var(--accent)">'+msg+'</span>';
      // Show hint in placeholder
      const ph=document.getElementById('cam-placeholder');
      if(ph)ph.innerHTML='<div style="font-size:2rem;margin-bottom:8px">⚠️</div>'
        +'<div style="font-size:.85rem;color:var(--accent);font-weight:700;margin-bottom:6px">'+msg+'</div>'
        +'<div style="font-size:.75rem;color:var(--text2)">'+hint+'</div>'
        +'<button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="startCamera()">🔄 Retry</button>';
    });
}
function stopCamera(){
  if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null;}
  if(qrScanLoop){cancelAnimationFrame(qrScanLoop);qrScanLoop=null;}
  const video=document.getElementById('qr-video');
  const placeholder=document.getElementById('cam-placeholder');
  const frame=document.getElementById('scan-frame');
  const btn=document.getElementById('cam-btn');
  const status=document.getElementById('scan-cam-status');
  const sw=document.getElementById('cam-switch');
  if(video)video.style.display='none';
  if(placeholder)placeholder.style.display='block';
  if(frame)frame.style.display='none';
  const _ov=document.getElementById('scan-overlay');if(_ov)_ov.style.display='none';
  if(btn){btn.textContent='📷 Start Camera';btn.style.background='';}
  if(status)status.textContent='Camera off';
  if(sw)sw.style.display='none';
}
function switchCamera(){
  camFacing=camFacing==='environment'?'user':'environment';
  stopCamera();setTimeout(()=>startCamera(),200);
}
function scanFrame(){
  const video=document.getElementById('qr-video');
  const canvas=document.getElementById('qr-canvas');
  if(!video||!canvas||!qrStream){return;}
  if(video.readyState===video.HAVE_ENOUGH_DATA){
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(typeof jsQR!=='undefined'){
      const code=jsQR(imgData.data,imgData.width,imgData.height,{inversionAttempts:'attemptBoth'});
      if(code&&code.data){
        stopCamera();
        const raw=code.data.trim();
        // Parse NEXUS|ticketId|... format
        const parts=raw.split('|');
        if(parts[0]==='NEXUS'&&parts[1]){
          verifyScan(parts[1]);
        } else {
          // Try as raw ticket ID or college ID
          verifyScan(raw);
        }
        return;
      }
    }
  }
  qrScanLoop=requestAnimationFrame(scanFrame);
}

function playBeep(type){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    if(type==='success'){
      osc.frequency.setValueAtTime(880,ctx.currentTime);
      osc.frequency.setValueAtTime(1100,ctx.currentTime+0.1);
      gain.gain.setValueAtTime(0.3,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.35);
    } else {
      osc.frequency.setValueAtTime(300,ctx.currentTime);
      gain.gain.setValueAtTime(0.3,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.25);
    }
  }catch(e){}
}

function simulateScan(){
  const tks=DB.g('tickets')||[];
  const upcoming=tks.filter(t=>t.status==='upcoming');
  if(!upcoming.length){toast('No upcoming passes to scan. Book events first!','info');return;}
  verifyScan(upcoming[upcoming.length-1].id);
}

function manualScan(){
  const raw=gv('scan-in').trim();
  if(!raw){toast('Enter a Ticket ID or College ID','error');return;}
  verifyScan(raw);
}

function verifyScan(raw){
  const tks=DB.g('tickets')||[];
  const res=document.getElementById('scan-res');
  const today=new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  function getDateStatus(evDate){
    if(!evDate) return 'unknown';
    // Parse various date formats
    const d = new Date(evDate);
    if(isNaN(d.getTime())){
      // Try DD/MM/YYYY or DD-MM-YYYY
      const parts = evDate.split(/[\/\-]/);
      if(parts.length===3){
        const parsed = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
        if(!isNaN(parsed.getTime())){
          const ev = parsed.toISOString().split('T')[0];
          if(ev < today) return 'past';
          if(ev > today) return 'future';
          return 'today';
        }
      }
      return 'unknown';
    }
    const ev = d.toISOString().split('T')[0];
    if(ev < today) return 'past';
    if(ev > today) return 'future';
    return 'today';
  }

  function showResult(html){ if(res) res.innerHTML=html; }
  function errBox(icon,title,sub){ return `<div style="background:rgba(232,76,61,.08);border:1px solid rgba(232,76,61,.25);border-radius:10px;padding:16px;text-align:center"><div style="font-size:2.5rem;margin-bottom:8px">${icon}</div><div style="font-weight:700;color:var(--accent)">${title}</div><div style="font-size:.8rem;color:var(--text2);margin-top:6px">${sub}</div></div>`; }
  function warnBox(icon,title,sub){ return `<div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.25);border-radius:10px;padding:16px;text-align:center"><div style="font-size:2.5rem;margin-bottom:8px">${icon}</div><div style="font-weight:700;color:var(--gold)">${title}</div><div style="font-size:.8rem;color:var(--text2);margin-top:6px">${sub}</div></div>`; }

  // ── Step 1: Try direct Ticket ID ──
  let idx=tks.findIndex(t=>t.id===raw);

  // ── Step 2: Try College ID (ALL users - hardcoded + Excel imported) ──
  if(idx===-1){
    const u = getAllUsers().find(x=>x.id===raw);
    if(u){
      // Find ALL tickets for this user
      const userTks = tks.map((t,i)=>({...t,_i:i}));
      const allUserTks = userTks.filter(t=>t.uid===u.id);

      if(allUserTks.length===0){
        showResult(errBox('❌','NO PASSES FOUND',`No tickets booked for College ID: ${raw}`));
        toast('No passes found for this student','error'); return;
      }

      // Filter by date status
      const todayTks   = allUserTks.filter(t=>getDateStatus(t.evDate)==='today' && t.status==='upcoming');
      const futureTks  = allUserTks.filter(t=>getDateStatus(t.evDate)==='future' && t.status==='upcoming');
      const usedTks    = allUserTks.filter(t=>t.status==='used');
      const pastTks    = allUserTks.filter(t=>getDateStatus(t.evDate)==='past' && t.status!=='used');
      const unknownTks = allUserTks.filter(t=>getDateStatus(t.evDate)==='unknown' && t.status==='upcoming');

      // Today's ticket - directly verify
      if(todayTks.length===1){ idx=todayTks[0]._i; }
      else if(todayTks.length>1){
        showResult(`<div style="background:rgba(61,125,232,.07);border:1px solid rgba(61,125,232,.2);border-radius:10px;padding:16px">
          <div style="font-weight:700;color:var(--blue);margin-bottom:10px;font-family:'Outfit',sans-serif">👤 ${u.fn} ${u.ln} — Aaj na Events</div>
          ${todayTks.map(t=>`<div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px">
            <div><div style="font-weight:600;font-size:.84rem">${t.evName}</div><div style="font-size:.72rem;color:var(--text2)">${t.evDate} · ${t.ttype}</div></div>
            <button class="btn btn-green btn-sm" onclick="verifyScan('${t.id}')">✅ Verify</button>
          </div>`).join('')}
        </div>`); return;
      }
      // Future tickets
      else if(futureTks.length>0 && todayTks.length===0 && unknownTks.length===0){
        const evDates = futureTks.map(t=>t.evDate||'Date N/A').join(', ');
        showResult(warnBox('📅','FUTURE EVENT',`${u.fn} ${u.ln} has tickets for future events: ${evDates}. Entry not allowed today.`));
        toast('Future event ticket - aaj entry nahi','error'); return;
      }
      // Past unused tickets
      else if(pastTks.length>0 && todayTks.length===0 && futureTks.length===0 && unknownTks.length===0){
        showResult(warnBox('⏰','JUNU TICKET',`${u.fn} ${u.ln} no ticket expire thay gayo. Event date vaiti gayi.`));
        toast('Ticket expired - event date vaiti gayi','error'); return;
      }
      // All used
      else if(usedTks.length>0 && todayTks.length===0 && futureTks.length===0 && unknownTks.length===0){
        showResult(warnBox('⚠️','ALREADY SCANNED',`${u.fn} ${u.ln} - Badha passes pahela j scan thay gaya che.`));
        toast('All passes already used','error'); return;
      }
      // Unknown date - show for manual selection
      else if(unknownTks.length>0){
        showResult(`<div style="background:rgba(61,125,232,.07);border:1px solid rgba(61,125,232,.2);border-radius:10px;padding:16px">
          <div style="font-weight:700;color:var(--blue);margin-bottom:10px;font-family:'Outfit',sans-serif">👤 ${u.fn} ${u.ln} — Passes Select karo</div>
          ${unknownTks.map(t=>`<div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px">
            <div><div style="font-weight:600;font-size:.84rem">${t.evName}</div><div style="font-size:.72rem;color:var(--text2)">${t.ttype}</div></div>
            <button class="btn btn-green btn-sm" onclick="verifyScan('${t.id}')">✅ Verify</button>
          </div>`).join('')}
        </div>`); return;
      }
      else {
        showResult(errBox('❌','NO VALID PASS',`${u.fn} ${u.ln} has no valid pass for today.`));
        toast('No valid pass for today','error'); return;
      }
    }
  }

  if(idx===-1){
    showResult(errBox('❌','INVALID PASS','Ticket ID not found in system'));
    toast('Invalid ticket/student ID!','error'); return;
  }

  const t=tks[idx];

  // ── Status checks ──
  if(t.status==='used'){
    showResult(warnBox('⚠️','ALREADY SCANNED',`Pass pahela j use thayo che at ${t.usedAt||'—'}. Duplicate entry nahi.`));
    toast('⚠️ Pass already used!','error'); return;
  }
  if(t.status==='cancelled'){
    showResult(errBox('🚫','CANCELLED PASS','Aa pass cancel thayel che. Entry nahi.'));
    toast('Pass is cancelled','error'); return;
  }

  // ── Date check ──
  const ds = getDateStatus(t.evDate);
  if(ds==='past'){
    showResult(warnBox('⏰','JUNU TICKET',`Aa ticket expire thay gayo. Event date (${t.evDate}) vaiti gayi.`));
    toast('Ticket expired!','error'); return;
  }
  if(ds==='future'){
    showResult(warnBox('📅','FUTURE EVENT',`This event is on ${t.evDate}. Entry not allowed today.`));
    toast('Event is in future - entry not allowed today','error'); return;
  }

  // ── GRANT ENTRY ──
  tks[idx].status='used';
  tks[idx].usedAt=new Date().toLocaleString('en-IN');
  DB.s('tickets',tks);

  const u2=getAllUsers().find(x=>x.id===t.uid);
  showResult(`<div style="background:rgba(39,174,96,.07);border:1px solid rgba(39,174,96,.25);border-radius:10px;padding:18px;text-align:center">
    <div style="color:var(--green);font-size:3rem;margin-bottom:10px">✅</div>
    <div style="font-weight:800;color:var(--green);font-size:1.15rem;margin-bottom:12px;font-family:'Outfit',sans-serif">ENTRY GRANTED</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left">
      <div style="background:var(--surface2);border-radius:7px;padding:9px"><div style="font-size:.62rem;color:var(--text2)">NAME</div><div style="font-weight:600;font-size:.82rem">${u2?.fn||'—'} ${u2?.ln||''}</div></div>
      <div style="background:var(--surface2);border-radius:7px;padding:9px"><div style="font-size:.62rem;color:var(--text2)">COLLEGE ID</div><div style="font-weight:600;font-size:.78rem">${u2?.id||'—'}</div></div>
      <div style="background:var(--surface2);border-radius:7px;padding:9px;grid-column:span 2"><div style="font-size:.62rem;color:var(--text2)">EVENT</div><div style="font-weight:600;font-size:.82rem">${t.evName}</div></div>
      <div style="background:var(--surface2);border-radius:7px;padding:9px"><div style="font-size:.62rem;color:var(--text2)">PASS TYPE</div><div style="font-weight:600;font-size:.82rem;text-transform:capitalize">${t.ttype}</div></div>
      <div style="background:var(--surface2);border-radius:7px;padding:9px"><div style="font-size:.62rem;color:var(--text2)">TICKET ID</div><div style="font-weight:600;font-size:.7rem;font-family:'JetBrains Mono'">${t.id}</div></div>
    </div>
    <div style="margin-top:10px;font-size:.72rem;color:var(--text2)">✅ Scanned at ${new Date().toLocaleTimeString('en-IN')}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="document.getElementById('scan-res').innerHTML='';document.getElementById('scan-in').value=''">🔄 Next Scan</button>
  </div>`);
  toast('✅ Entry granted!','success');
  playBeep('success');
  // Increment today's scan count
  const sc=parseInt(localStorage.getItem('nx_scan_ok')||'0')+1;
  localStorage.setItem('nx_scan_ok',sc);
  const el=document.getElementById('scan-count-today');
  if(el)el.textContent=sc;
  // Auto-restart camera after 2.5s for next scan
  setTimeout(()=>{
    if(document.getElementById('qr-video')&&!qrStream){startCamera();}
    const si=document.getElementById('scan-in');
    if(si)si.value='';
  },2500);
}


function openAdminPayments(){
  // Switch to payments tab or show overlay
  renderAdminPayments();
  // Make payments tab visible in admin
  const mainEl=document.getElementById('a-main');
  if(mainEl)mainEl.scrollIntoView({behavior:'smooth'});
}

function renderAdminPayments(){
  const el=document.getElementById('a-main');
  if(el)el.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--text2)"><div style="font-size:3rem;margin-bottom:16px">✅</div><div style="font-size:1.1rem;font-weight:700;margin-bottom:8px">Payment Verification Removed</div><div style="font-size:.82rem">Bookings are now instant — no manual verification needed.</div></div>';
}

function approveUTR(pendingId, evId){
  const pending=DB.g('pendingPayments')||[];
  const idx=pending.findIndex(p=>p.id===pendingId);
  if(idx===-1){toast('Not found','error');return;}
  const p=pending[idx];

  const evs=DB.g('events')||[];
  const eIdx=evs.findIndex(e=>e.id===evId);
  if(eIdx===-1){toast('Event not found','error');return;}
  const e=evs[eIdx];
  const tks=DB.g('tickets')||[];

  let createdIds=[];

  if(p.ttype==='nonstu'&&p.nsGuests&&p.nsGuests.length>0){
    // Create one ticket per non-student guest
    const perPrice=Math.round(p.amt/p.nsGuests.length);
    p.nsGuests.forEach(g=>{
      const tid='NEXUS'+Math.floor(1000000+Math.random()*9000000);
      tks.push({
        id:tid,eid:evId,uid:p.uid,bookedBy:p.uid,
        evName:e.name,evDate:e.date,evVenue:e.venue,
        ttype:'nonstu',ttypeLabel:'Non-Student Guest',
        qty:1,price:perPrice,
        guestName:g.name,guestMobile:g.mobile||'—',guestRelation:g.relation||'—',
        guestIdType:g.idType||'Aadhar',
        referenceStudentId:p.uid,
        status:'upcoming',
        bookedOn:new Date().toLocaleDateString('en-IN'),
        bookedAt:new Date().toISOString(),
        payMethod:'upi_gpay',utrId:p.utrId,txnRef:p.txnRef,
        txnId:'TXN'+Math.floor(Math.random()*9000000+1000000)
      });
      createdIds.push(tid);
    });
    evs[eIdx].booked=Math.min((evs[eIdx].booked||0)+p.nsGuests.length,evs[eIdx].seats);
  } else {
    // Student pass
    const tid='NEXUS'+Math.floor(1000000+Math.random()*9000000);
    tks.push({
      id:tid,eid:evId,uid:p.uid,bookedBy:p.uid,
      evName:e.name,evDate:e.date,evVenue:e.venue,
      ttype:p.ttype||'student',ttypeLabel:'Student',
      qty:1,price:p.amt,
      status:'upcoming',
      bookedOn:new Date().toLocaleDateString('en-IN'),
      bookedAt:new Date().toISOString(),
      payMethod:'upi_gpay',utrId:p.utrId,txnRef:p.txnRef,
      txnId:'TXN'+Math.floor(Math.random()*9000000+1000000)
    });
    evs[eIdx].booked=Math.min((evs[eIdx].booked||0)+1,evs[eIdx].seats);
    createdIds.push(tid);
  }

  DB.s('tickets',tks);
  DB.s('events',evs);

  pending[idx].status='approved';
  pending[idx].ticketIds=createdIds;
  DB.s('pendingPayments',pending);

  const passCount=createdIds.length;
  addNotif('✅ Payment Approved!',`Taro ₹${p.amt} payment verify thayo! "${e.name}" — ${passCount} pass${passCount>1?'es':''} ready chhe.`,'✅','success');
  toast('✅ Payment approved! '+passCount+' pass'+(passCount>1?'es':'')+' generated.','success');
  // Auto-email each pass to student
  setTimeout(()=>{ createdIds.forEach(tid=>autoEmailPass(tid)); },600);
  renderAdminPayments();
}

function rejectUTR(pendingId){
  if(!confirm('Aa payment reject karvo chhe?'))return;
  const pending=DB.g('pendingPayments')||[];
  const idx=pending.findIndex(p=>p.id===pendingId);
  if(idx===-1)return;
  pending[idx].status='rejected';
  DB.s('pendingPayments',pending);
  addNotif('Payment Rejected','Taro payment verify nahi thayo. Support ne contact karo.','❌','error');
  toast('Payment rejected','error');
  renderAdminPayments();
}

function renderAdminAnn(){
  const notifs=DB.g('notifs')||[];
  document.getElementById('a-main').innerHTML=`
  <div class="ah"><div class="at">ANNOUNCEMENTS</div><button class="btn btn-red" onclick="openOv('ov-ann')">📢 New</button></div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${notifs.slice().reverse().map(n=>`<div class="nitem ${n.read?'':'unread'}"><div class="ni-ico" style="background:rgba(61,125,232,.12)">${n.icon}</div><div class="tinfo"><div class="nbt">${n.title}</div><div class="nbm">${n.msg}</div></div><div class="ntime">${n.time}</div></div>`).join('')}
  </div>`;
}

function renderAdminRevenue(){
  const evs=DB.g('events')||[];const tks=DB.g('tickets')||[];
  const total=tks.reduce((a,t)=>a+t.price,0);
  const nstuTks=tks.filter(t=>t.ttype==='nonstu'&&t.status!=='cancelled');
  const nstuRev=nstuTks.reduce((a,t)=>a+t.price,0);
  const allUsers=getAllUsers();
  document.getElementById('a-main').innerHTML=`
  <div class="ah"><div class="at">REVENUE</div></div>
  <div class="mgrid" style="margin-bottom:22px">
    <div class="mbox"><div class="mv" style="color:var(--gold)">₹${total.toLocaleString()}</div><div class="ml">Total Revenue</div></div>
    <div class="mbox"><div class="mv" style="color:var(--green)">${tks.filter(t=>t.price>0).length}</div><div class="ml">Paid Passes</div></div>
    <div class="mbox"><div class="mv" style="color:var(--teal)">${tks.filter(t=>t.price===0).length}</div><div class="ml">Free Passes</div></div>
    <div class="mbox" style="border-color:rgba(245,166,35,.3)"><div class="mv" style="color:var(--gold)">${nstuTks.length}</div><div class="ml">Guest Passes Sold</div></div>
    <div class="mbox"><div class="mv" style="color:var(--blue)">₹${tks.length?Math.round(total/tks.filter(t=>t.price>0).length||0):0}</div><div class="ml">Avg Paid Price</div></div>
    <div class="mbox" style="border-color:rgba(245,166,35,.2)"><div class="mv" style="color:var(--gold)">₹${nstuRev.toLocaleString()}</div><div class="ml">Guest Pass Revenue</div></div>
  </div>

  <!-- Non-Student Passes Section -->
  <div class="dcard" style="margin-bottom:18px">
    <div class="dct">🏫 Non-Student / Guest Passes — Full Details (${nstuTks.length})</div>
    ${nstuTks.length===0
      ?`<div class="empty"><div class="empty-i">🏫</div><div class="empty-m">No Guest Passes sold yet.</div></div>`
      :`<div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.76rem">
          <thead>
            <tr style="background:var(--surface2);color:var(--text2)">
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">#</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Guest Name</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Relation</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">ID Proof</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Reference Student</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Event</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Price</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Date</th>
              <th style="text-align:left;padding:8px 10px;white-space:nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            ${nstuTks.map((t,i)=>{
              const refStudent=allUsers.find(u=>u.id===(t.bookedBy||t.uid));
              return `<tr style="border-top:1px solid var(--border);${i%2?'background:rgba(255,255,255,.02)':''}">
                <td style="padding:8px 10px;color:var(--text2)">${i+1}</td>
                <td style="padding:8px 10px;font-weight:700">${t.guestName||'—'}</td>
                <td style="padding:8px 10px;color:var(--text2)">${t.guestRelation||'—'}</td>
                <td style="padding:8px 10px;color:var(--text2)">${t.guestIdType||'—'}</td>
                <td style="padding:8px 10px">
                  <div style="font-weight:600">${t.referenceStudentName||refStudent?.fn+' '+refStudent?.ln||'—'}</div>
                  <div style="font-size:.68rem;color:var(--text2);font-family:'JetBrains Mono'">${t.referenceStudentId||t.bookedBy||t.uid}</div>
                </td>
                <td style="padding:8px 10px;font-size:.72rem">${t.evName}</td>
                <td style="padding:8px 10px;font-weight:700;color:var(--gold)">₹${t.price}</td>
                <td style="padding:8px 10px;color:var(--text2);white-space:nowrap">${t.bookedOn}</td>
                <td style="padding:8px 10px"><span style="padding:2px 8px;border-radius:100px;font-size:.65rem;font-weight:700;background:${t.status==='upcoming'?'rgba(61,125,232,.12)':t.status==='cancelled'?'rgba(232,76,61,.1)':'rgba(39,174,96,.1)'};color:${t.status==='upcoming'?'var(--blue)':t.status==='cancelled'?'var(--accent)':'var(--green)'}">${t.status.toUpperCase()}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 12px;font-size:.75rem;color:var(--text2);border-top:1px solid var(--border)">
        Total Guest Pass Revenue: <strong style="color:var(--gold)">₹${nstuRev.toLocaleString()}</strong> from ${nstuTks.length} passes
      </div>`}
  </div>

  <div class="dcard"><div class="dct">💰 Revenue by Event</div>
    ${evs.map(e=>{
      const et=tks.filter(t=>t.eid===e.id);
      const r=et.reduce((a,t)=>a+t.price,0);
      const nstuCount=et.filter(t=>t.ttype==='nonstu'&&t.status!=='cancelled').length;
      return `<div class="titem"><div style="font-size:1.5rem">${e.icon}</div>
        <div class="tinfo">
          <div class="tn">${e.name}</div>
          <div class="td">${et.length} total passes${nstuCount>0?` · <span style="color:var(--gold)">🏫 ${nstuCount} guest</span>`:''}</div>
        </div>
        <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:800;color:var(--gold)">₹${r}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderAdminFeedback(){
  const fbs=DB.g('feedback')||[];
  document.getElementById('a-main').innerHTML=`
  <div class="ah"><div class="at">REVIEWS (${fbs.length})</div></div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${fbs.slice().reverse().map(f=>{const u=USERS_DB.find(x=>x.id===f.uid);return`<div class="dcard" style="padding:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem">${u?.fn[0]||'?'}</div>
        <div><div style="font-weight:600;font-size:.86rem">${u?.fn||'—'} ${u?.ln||''}</div><div style="font-size:.72rem;color:var(--text2)">${f.evName} · ${f.date}</div></div>
        <div style="margin-left:auto;font-size:1.1rem">${'⭐'.repeat(f.rating)}</div>
      </div>
      <div style="font-size:.84rem;color:var(--text2)">"${f.msg}"</div>
    </div>`}).join('')||'<div class="empty"><div class="empty-i">⭐</div><div class="empty-m">No reviews yet.</div></div>'}
  </div>`;
}

// Analytics date range state
let _anaRange='7d';
let _anaFrom='', _anaTo='';

function renderAdminAnalytics(range,from,to){
  if(range)_anaRange=range;
  if(from!==undefined)_anaFrom=from;
  if(to!==undefined)_anaTo=to;

  const evs=DB.g('events')||[];
  let tks=DB.g('tickets')||[];
  const fbs=DB.g('feedback')||[];
  const allUsers=getAllUsers();
  const today=new Date(); today.setHours(23,59,59,999);

  function parseBooked(ds){
    if(!ds)return null;
    const p=ds.split('/');
    if(p.length===3)return new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
    return new Date(ds);
  }

  let filterFrom=null, filterTo=new Date(today);
  if(_anaRange==='7d'){filterFrom=new Date(today);filterFrom.setDate(filterFrom.getDate()-6);filterFrom.setHours(0,0,0,0);}
  else if(_anaRange==='30d'){filterFrom=new Date(today);filterFrom.setDate(filterFrom.getDate()-29);filterFrom.setHours(0,0,0,0);}
  else if(_anaRange==='month'){filterFrom=new Date(today.getFullYear(),today.getMonth(),1);}
  else if(_anaRange==='year'){filterFrom=new Date(today.getFullYear(),0,1);}
  else if(_anaRange==='custom'&&_anaFrom&&_anaTo){filterFrom=new Date(_anaFrom);filterTo=new Date(_anaTo);filterTo.setHours(23,59,59,999);}

  const filteredTks=filterFrom?tks.filter(t=>{const d=parseBooked(t.bookedOn);return d&&d>=filterFrom&&d<=filterTo;}):tks;

  const freeTks=filteredTks.filter(t=>t.price===0);
  const nstuTks=filteredTks.filter(t=>t.ttype==='nonstu'&&t.status!=='cancelled');
  const stuTks=filteredTks.filter(t=>t.ttype==='student'&&t.status!=='cancelled');
  const usedTks=filteredTks.filter(t=>t.status==='used');
  const cancelTks=filteredTks.filter(t=>t.status==='cancelled');
  const rev=filteredTks.reduce((a,t)=>a+t.price,0);
  const avgRating=fbs.length?(fbs.reduce((a,f)=>a+f.rating,0)/fbs.length).toFixed(1):0;
  const nstuRev=nstuTks.reduce((a,t)=>a+t.price,0);

  const evRev=evs.map(e=>({name:e.name.substring(0,14),icon:e.icon||'🎭',rev:filteredTks.filter(t=>t.eid===e.id).reduce((a,t)=>a+t.price,0),passes:filteredTks.filter(t=>t.eid===e.id).length})).sort((a,b)=>b.rev-a.rev).filter(e=>e.passes>0).slice(0,6);
  const maxRev=Math.max(...evRev.map(e=>e.rev),1);

  // Bar chart — dynamic range
  const isYear=_anaRange==='year', isMonth=_anaRange==='month';
  const barDays=isYear?12:isMonth?new Date(today.getFullYear(),today.getMonth()+1,0).getDate():(_anaRange==='30d'?30:7);
  const barLabels=[],barConf=[],barCanc=[];
  for(let i=0;i<barDays;i++){
    if(isYear){
      const m=new Date(today.getFullYear(),today.getMonth()-11+i,1);
      const mEnd=new Date(today.getFullYear(),today.getMonth()-11+i+1,0);mEnd.setHours(23,59,59,999);
      const mTks=filteredTks.filter(t=>{const bd=parseBooked(t.bookedOn);return bd&&bd>=m&&bd<=mEnd;});
      barLabels.push(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m.getMonth()]);
      barConf.push(mTks.filter(t=>t.status!=='cancelled').length);
      barCanc.push(mTks.filter(t=>t.status==='cancelled').length);
    } else if(isMonth){
      const day=new Date(today.getFullYear(),today.getMonth(),i+1);
      const ds=day.toLocaleDateString('en-IN');
      barLabels.push(String(i+1));
      barConf.push(filteredTks.filter(t=>t.bookedOn===ds&&t.status!=='cancelled').length);
      barCanc.push(filteredTks.filter(t=>t.bookedOn===ds&&t.status==='cancelled').length);
    } else {
      const d2=new Date(today);d2.setDate(d2.getDate()-(barDays-1-i));d2.setHours(12);
      const ds=d2.toLocaleDateString('en-IN');
      barLabels.push(['Su','Mo','Tu','We','Th','Fr','Sa'][d2.getDay()]);
      barConf.push(filteredTks.filter(t=>t.bookedOn===ds&&t.status!=='cancelled').length);
      barCanc.push(filteredTks.filter(t=>t.bookedOn===ds&&t.status==='cancelled').length);
    }
  }
  const maxDay=Math.max(...barConf.map((c,i)=>c+barCanc[i]),1);

  const donutData=[
    {label:'Student',    val:stuTks.length,  col:'#3b7de8', icon:'\uD83C\uDF93'},
    {label:'Non-Student',val:nstuTks.length, col:'#f5a623', icon:'\uD83C\uDFEB'},
    {label:'Free',       val:freeTks.filter(t=>t.status!=='cancelled').length, col:'#00c9b1', icon:'\uD83C\uDD93'},
    {label:'Cancelled',  val:cancelTks.length, col:'#e84c3d', icon:'\u274C'},
    {label:'Verified',   val:usedTks.length,   col:'#27ae60', icon:'\u2705'},
  ].filter(d=>d.val>0);
  const donutTotal=donutData.reduce((a,d)=>a+d.val,0)||1;

  const revBarsHTML=evRev.length===0
    ?'<div style="color:var(--text2);text-align:center;padding:30px">No data</div>'
    :evRev.map(e=>'<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:.74rem;margin-bottom:4px"><span style="color:var(--text2)">'+e.icon+' '+e.name+'</span><span style="font-weight:700;color:var(--gold)">&#8377;'+e.rev.toLocaleString()+'</span></div><div style="background:var(--surface2);border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,var(--gold),#f59e0b);width:'+Math.round(e.rev/maxRev*100)+'%;transition:width .6s ease"></div></div><div style="font-size:.65rem;color:var(--text2);margin-top:2px">'+e.passes+' passes</div></div>').join('');

  const dayBarsHTML=barLabels.map((lbl,i)=>{
    const conf=barConf[i],canc=barCanc[i],total=conf+canc;
    const hConf=Math.round(conf/maxDay*88),hCanc=Math.round(canc/maxDay*88);
    const isLast=i===barDays-1;
    const cancBar=canc>0?`<div style="width:100%;height:${Math.max(hCanc,2)}px;background:rgba(232,76,61,.7);border-radius:3px 3px 0 0;transition:height .5s"></div>`:'';
    const confBar=`<div style="width:100%;height:${total?Math.max(hConf,3):0}px;background:${isLast?'linear-gradient(180deg,var(--blue),var(--teal))':'rgba(99,102,241,.6)'};border-radius:3px 3px 0 0;transition:height .5s"></div>`;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0"><div style="font-size:.58rem;font-weight:700;color:${isLast?'var(--blue)':'var(--text2)'}">${total||''}</div><div style="width:80%;display:flex;flex-direction:column;justify-content:flex-end;height:90px;gap:1px">${cancBar}${confBar}</div><div style="font-size:.52rem;font-weight:${isLast?700:400};color:${isLast?'var(--blue)':'var(--text2)'}">${lbl}</div></div>`;
  }).join('');

  const fillHTML=evs.length===0?'<div style="color:var(--text2);text-align:center;padding:20px">No events</div>':evs.slice(0,5).map(e=>{const pct=e.seats>0?Math.round(e.booked/e.seats*100):0;const col=pct>=90?'var(--accent)':pct>=60?'var(--gold)':'var(--green)';return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:.73rem;margin-bottom:4px"><span style="color:var(--text2)">'+(e.icon||'🎭')+' '+e.name.substring(0,18)+'</span><span style="font-weight:700;color:'+col+'">'+pct+'%</span></div><div style="background:var(--surface2);border-radius:4px;height:7px;overflow:hidden"><div style="height:100%;border-radius:4px;background:'+col+';width:'+pct+'%;transition:width .6s ease"></div></div><div style="font-size:.63rem;color:var(--text2);margin-top:2px">'+e.booked+'/'+e.seats+' seats</div></div>';}).join('');

  const legendHTML=donutData.map(d=>{
    const pct=Math.round(d.val/donutTotal*100),isCanc=d.label==='Cancelled';
    return '<div style="display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid var(--border)'+(isCanc?';background:rgba(232,76,61,.05);border-radius:8px;padding:8px 10px;margin:-2px 0':'')+'">'
      +'<div style="display:flex;align-items:center;gap:9px;font-size:.78rem">'
      +'<div style="width:12px;height:12px;border-radius:3px;background:'+d.col+';flex-shrink:0;box-shadow:0 0 6px '+d.col+'88'+(isCanc?';outline:1.5px solid '+d.col:'')+';"></div>'
      +'<span style="flex:1;color:'+(isCanc?'var(--accent)':'var(--text2)')+'">'+d.icon+' '+d.label+'</span>'
      +'<span style="font-weight:800;font-size:.85rem;color:'+(isCanc?'var(--accent)':'var(--text)')+'">'+d.val+'</span>'
      +'<span style="color:'+d.col+';font-weight:900;font-size:.8rem;min-width:38px;text-align:right">'+pct+'%</span>'
      +'</div>'
      +'<div style="background:var(--surface2);border-radius:3px;height:4px;overflow:hidden"><div style="height:100%;background:'+d.col+';width:'+pct+'%;border-radius:3px;transition:width .7s ease'+(isCanc?';box-shadow:0 0 5px '+d.col:'')+'"></div></div>'
      +'</div>';
  }).join('');

  const rangeLabel=_anaRange==='7d'?'Last 7 Days':_anaRange==='30d'?'Last 30 Days':_anaRange==='month'?'This Month':_anaRange==='year'?'This Year':'Custom';
  const barTitle=(isYear?'\u{1F4C8} Monthly (This Year)':isMonth?'\u{1F4C8} This Month (Daily)':'\u{1F4C8} Bookings \u2014 '+rangeLabel);

  const rangeUI='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;background:var(--surface2);border-radius:12px;border:1px solid var(--border)">'
    +'<span style="font-size:.74rem;color:var(--text2);font-weight:600">\uD83D\uDCC5 Range:</span>'
    +['7d','30d','month','year'].map(r=>'<button onclick="renderAdminAnalytics(\''+r+'\')" style="padding:5px 12px;border-radius:8px;border:1.5px solid '+(r===_anaRange?'var(--blue)':'var(--border)')+';background:'+(r===_anaRange?'rgba(61,125,232,.15)':'transparent')+';color:'+(r===_anaRange?'var(--blue)':'var(--text2)')+';font-size:.73rem;font-weight:'+(r===_anaRange?700:400)+';cursor:pointer">'+(r==='7d'?'7 Days':r==='30d'?'30 Days':r==='month'?'This Month':'This Year')+'</button>').join('')
    +'<span style="color:var(--border)">|</span>'
    +'<input type="date" id="ana-from" value="'+_anaFrom+'" style="font-size:.72rem;padding:4px 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface3);color:var(--text)">'
    +'<span style="font-size:.72rem;color:var(--text2)">to</span>'
    +'<input type="date" id="ana-to" value="'+_anaTo+'" style="font-size:.72rem;padding:4px 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface3);color:var(--text)">'
    +'<button onclick="renderAdminAnalytics(\'custom\',document.getElementById(\'ana-from\').value,document.getElementById(\'ana-to\').value)" style="padding:5px 12px;border-radius:8px;border:1.5px solid '+(_anaRange==='custom'?'var(--blue)':'var(--border)')+';background:'+(_anaRange==='custom'?'rgba(61,125,232,.15)':'transparent')+';color:'+(_anaRange==='custom'?'var(--blue)':'var(--text2)')+';font-size:.73rem;cursor:pointer">Apply</button>'
    +'<span style="font-size:.72rem;color:var(--teal);margin-left:auto;font-weight:600">'+rangeLabel+': '+filteredTks.length+' passes</span>'
    +'</div>';

  document.getElementById('a-main').innerHTML=
    '<div class="ah" data-ana="1"><div><div class="at">Analytics Dashboard</div><div style="font-size:.72rem;color:var(--teal);margin-top:2px;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:var(--teal);display:inline-block;animation:pulse 1.5s ease-in-out infinite"></span> Live \xB7 <span id="analytics-live-time"></span></div></div><button class="btn btn-ghost btn-sm" onclick="exportData()">&#128228; Export</button></div>'
    +rangeUI
    +'<div class="mgrid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));margin-bottom:20px">'
    +'<div class="mbox"><div class="mv" style="color:var(--gold)">&#8377;'+rev.toLocaleString()+'</div><div class="ml">Revenue</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--blue)">'+stuTks.length+'</div><div class="ml">Student Passes</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--gold)">'+nstuTks.length+'</div><div class="ml">Guest Passes</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--teal)">'+allUsers.length+'</div><div class="ml">Users</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--purple)">'+avgRating+'\u2B50</div><div class="ml">Rating</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--green)">'+usedTks.length+'</div><div class="ml">Verified</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--accent)">'+cancelTks.length+'</div><div class="ml">Cancelled</div></div>'
    +'<div class="mbox"><div class="mv" style="color:var(--teal)">&#8377;'+nstuRev+'</div><div class="ml">Guest Rev</div></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'
    +'<div class="dcard" style="padding:18px"><div class="dct" style="margin-bottom:14px">&#128176; Revenue by Event</div>'+revBarsHTML+'</div>'
    +'<div class="dcard" style="padding:18px"><div class="dct" style="margin-bottom:14px">&#129383; Pass Breakdown</div>'
    +'<div style="display:flex;justify-content:center;margin-bottom:12px;position:relative">'
    +'<canvas id="donut-canvas" width="180" height="180" style="cursor:pointer"></canvas>'
    +'<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">'
    +'<div style="font-size:1.6rem;font-weight:900;color:rgba(255,255,255,.9)" id="donut-center-num">'+donutTotal+'</div>'
    +'<div style="font-size:.65rem;color:rgba(255,255,255,.4)" id="donut-center-lbl">total</div></div></div>'
    +'<div id="donut-legend">'+legendHTML+'</div>'
    +'</div></div>'
    +'<div class="dcard" style="padding:18px;margin-bottom:14px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    +'<div class="dct">'+barTitle+'</div>'
    +'<div style="display:flex;gap:10px;font-size:.65rem">'
    +'<span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:rgba(99,102,241,.5);display:inline-block"></span>Confirmed</span>'
    +'<span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:rgba(232,76,61,.6);display:inline-block"></span>Cancelled</span>'
    +'</div></div>'
    +'<div style="display:flex;gap:4px;align-items:flex-end;height:120px;padding-bottom:4px">'+dayBarsHTML+'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'
    +'<div class="dcard" style="padding:18px"><div class="dct" style="margin-bottom:14px">&#127891; Seat Fill Rate</div>'+fillHTML+'</div>'
    +'<div class="dcard" style="padding:18px"><div class="dct" style="margin-bottom:14px">&#128101; User Stats</div>'
    +'<div style="display:flex;flex-direction:column;gap:10px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface2);border-radius:10px"><span style="font-size:.78rem;color:var(--text2)">Total Students</span><span style="font-weight:700;color:var(--blue)">'+allUsers.filter(u=>u.role==='student').length+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface2);border-radius:10px"><span style="font-size:.78rem;color:var(--text2)">Avg Passes / Student</span><span style="font-weight:700;color:var(--teal)">'+(allUsers.filter(u=>u.role==='student').length?((stuTks.length)/Math.max(allUsers.filter(u=>u.role==='student').length,1)).toFixed(1):0)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface2);border-radius:10px"><span style="font-size:.78rem;color:var(--text2)">Feedback Count</span><span style="font-weight:700;color:var(--purple)">'+fbs.length+'</span></div>'
    +'</div></div></div>';

  // Donut canvas interaction
  setTimeout(()=>{
    const canvas=document.getElementById('donut-canvas');
    if(!canvas)return;
    const ctx2=canvas.getContext('2d');
    const cx=90,cy=90,r=72,ri=46,gap=0.018;
    function drawDonut(hi){
      ctx2.clearRect(0,0,180,180);
      // Background ring
      ctx2.beginPath();ctx2.arc(cx,cy,r,0,Math.PI*2);ctx2.fillStyle='rgba(255,255,255,.06)';ctx2.fill();
      let ang=-Math.PI/2;
      donutData.forEach((d,i)=>{
        const sw=Math.max((d.val/donutTotal)*(Math.PI*2)-gap,0.01);
        const isHL=hi===i;
        ctx2.save();
        if(isHL){
          const mid=ang+sw/2+gap/2;
          ctx2.translate(Math.cos(mid)*5,Math.sin(mid)*5);
        }
        // Draw proper donut segment
        ctx2.beginPath();
        ctx2.arc(cx,cy,r,ang+gap/2,ang+sw+gap/2);
        ctx2.arc(cx,cy,ri,ang+sw+gap/2,ang+gap/2,true);
        ctx2.closePath();
        ctx2.fillStyle=d.col;
        ctx2.globalAlpha=isHL?1:.85;
        // Glow on highlight
        if(isHL){ctx2.shadowColor=d.col;ctx2.shadowBlur=12;}
        ctx2.fill();
        ctx2.restore();
        ang+=sw+gap;
      });
      ctx2.globalAlpha=1;ctx2.shadowBlur=0;
      // Centre hole fill
      ctx2.beginPath();ctx2.arc(cx,cy,ri-1,0,Math.PI*2);
      ctx2.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#1a1a2e';
      ctx2.fill();
      // Centre text
      const cN=document.getElementById('donut-center-num'),cL=document.getElementById('donut-center-lbl');
      if(hi!==-1&&donutData[hi]){
        const d=donutData[hi];
        const p=Math.round(d.val/donutTotal*100);
        if(cN){cN.textContent=p+'%';cN.style.color=d.col;cN.style.fontSize='1.5rem';}
        if(cL)cL.textContent=d.label;
      } else {
        if(cN){cN.textContent=donutTotal;cN.style.color='rgba(255,255,255,.9)';cN.style.fontSize='1.6rem';}
        if(cL)cL.textContent='total passes';
      }
    }
    drawDonut(-1);
    canvas.addEventListener('mousemove',ev=>{
      const rect=canvas.getBoundingClientRect(),mx=ev.clientX-rect.left-cx,my=ev.clientY-rect.top-cy;
      const dist=Math.sqrt(mx*mx+my*my);
      if(dist<ri||dist>r){drawDonut(-1);return;}
      let a=Math.atan2(my,mx)-(-Math.PI/2);if(a<0)a+=Math.PI*2;
      let cum=0,found=-1;
      const gapTotal=gap*donutData.length;
      for(let i=0;i<donutData.length;i++){
        const sw=(donutData[i].val/donutTotal)*(Math.PI*2)-gap;
        cum+=sw+gap;
        if(a<=cum){found=i;break;}
      }
      drawDonut(found);
    });
    canvas.addEventListener('mouseleave',()=>drawDonut(-1));
    canvas.addEventListener('click',ev=>{
      const rect=canvas.getBoundingClientRect(),mx=ev.clientX-rect.left-cx,my=ev.clientY-rect.top-cy;
      const dist=Math.sqrt(mx*mx+my*my);
      if(dist<ri||dist>r)return;
      let a=Math.atan2(my,mx)-(-Math.PI/2);if(a<0)a+=Math.PI*2;
      let cum=0,found=-1;
      for(let i=0;i<donutData.length;i++){const sw=(donutData[i].val/donutTotal)*(Math.PI*2)-gap;cum+=sw+gap;if(a<=cum){found=i;break;}}
      if(found!==-1&&donutData[found])toast(donutData[found].icon+' '+donutData[found].label+': '+donutData[found].val+' passes ('+Math.round(donutData[found].val/donutTotal*100)+'%)','info');
    });
  },100);
  startAnalyticsLiveClock();
}


function sendAnn(){
  const t=gv('an-t'),m=gv('an-m');
  if(!t||!m){toast('Fill all fields','error');return;}
  const typeMap={info:'ℹ️',success:'✅',warn:'⚠️',event:'🎪'};
  const tp=document.getElementById('an-tp')?.value||'info';
  addNotif(t,m,typeMap[tp],tp);closeOv('ov-ann');
  document.getElementById('an-t').value='';document.getElementById('an-m').value='';
  toast('Announcement sent!','success');
}

function exportData(){
  const d={events:DB.g('events'),tickets:DB.g('tickets'),users:USERS_DB.map(u=>({...u,pw:'[hidden]'})),feedback:DB.g('feedback')};
  const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='nexus-data-export.json';a.click();
  toast('Data exported!','success');
}

// ════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════
function addNotif(title,msg,icon,type){
  const n={id:'n'+Date.now(),title,msg,icon,type,time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),read:false};
  DB.push('notifs',n);
  updateNDot();
  showInAppNotif(title,msg,icon,type);
  sendBrowserPush(title,msg,icon);
}

function sendBrowserPush(title,msg,icon){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
    const svgIcon='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>'+encodeURIComponent(icon||'🔔')+'</text></svg>';
    const n=new Notification('NEXUS — '+title,{body:msg,icon:svgIcon,badge:svgIcon,tag:'nexus-'+Date.now()});
    setTimeout(()=>n.close(),8000);
  }catch(e){}
}

// ── Event tomorrow reminder (run once daily) ──
function checkEventReminders(){
  const lastCheck=localStorage.getItem('nx_last_reminder_check');
  const today=new Date().toLocaleDateString('en-IN');
  if(lastCheck===today)return; // already checked today
  localStorage.setItem('nx_last_reminder_check',today);

  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr=tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  const tks=DB.g('tickets')||[];
  const myTks=tks.filter(t=>t.uid===CU?.id&&t.status==='upcoming');
  myTks.forEach(t=>{
    if(!t.evDate)return;
    // handle DD/MM/YYYY format
    let evDate=t.evDate;
    const parts=evDate.split('/');
    if(parts.length===3)evDate=`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    if(evDate===tomorrowStr){
      setTimeout(()=>{
        addNotif('📅 Event Tomorrow!',`"${t.evName}" is tomorrow. Don't forget your QR pass! 🎟️`,'📅','info');
      },2000);
    }
  });
}

// ── Seats almost full alert ──
function checkSeatsAlert(evId){
  const evs=DB.g('events')||[];
  const e=evs.find(x=>x.id===evId);
  if(!e||!e.seats)return;
  const pct=Math.round(e.booked/e.seats*100);
  if(pct>=90&&pct<100){
    sendBrowserPush('🔥 Almost Full!',`"${e.name}" is ${pct}% full — only ${e.seats-e.booked} seats left!`,'🔥');
  }
}

function showInAppNotif(title,msg,icon,type){
  const el=document.createElement('div');
  const color=type==='success'?'var(--green)':type==='warn'?'var(--gold)':type==='error'?'var(--accent)':'var(--blue)';
  const bg=type==='success'?'rgba(39,174,96,.12)':type==='warn'?'rgba(245,166,35,.1)':type==='error'?'rgba(232,76,61,.1)':'rgba(61,125,232,.1)';
  el.style.cssText=`position:fixed;bottom:80px;right:16px;z-index:9999;max-width:320px;padding:14px 16px;border-radius:16px;background:var(--surface);border:1px solid ${color};box-shadow:0 8px 32px rgba(0,0,0,.4);display:flex;gap:12px;align-items:flex-start;animation:slideInRight .3s cubic-bezier(.34,1.56,.64,1);backdrop-filter:blur(12px)`;
  el.innerHTML=`<div style="font-size:1.5rem;flex-shrink:0;line-height:1">${icon}</div><div style="flex:1"><div style="font-weight:700;font-size:.84rem;margin-bottom:2px;color:${color}">${title}</div><div style="font-size:.75rem;color:var(--text2);line-height:1.4">${msg}</div></div><button onclick="this.parentNode.remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:.9rem;padding:0;line-height:1;flex-shrink:0">✕</button>`;
  document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .4s,transform .4s';el.style.opacity='0';el.style.transform='translateX(20px)';setTimeout(()=>el.remove(),400);},5000);
}

function _dismissNotifBanner(){
  const b=document.getElementById('notif-perm-banner');
  if(b){b.style.transition='opacity .4s,transform .4s';b.style.opacity='0';b.style.transform='translateX(-50%) translateY(20px)';setTimeout(()=>b.remove(),400);}
}
function _allowNotifs(){
  Notification.requestPermission().then(function(p){
    if(p==='granted')toast('🔔 Notifications ON!','success');
    _dismissNotifBanner();
  });
}
function requestBrowserNotifPerm(){
  if(!('Notification' in window))return;
  if(Notification.permission==='granted')return;
  if(Notification.permission==='denied')return;
  setTimeout(function(){
    const b=document.createElement('div');
    b.id='notif-perm-banner';
    b.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9998;background:var(--surface);border:1px solid var(--border2);border-radius:16px;padding:14px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,.5);max-width:340px;width:90%;animation:slideInUp .35s cubic-bezier(.34,1.56,.64,1)';
    const ico=document.createElement('div');ico.style.fontSize='1.6rem';ico.textContent='🔔';
    const txt=document.createElement('div');txt.style.flex='1';
    txt.innerHTML='<div style="font-weight:700;font-size:.83rem;margin-bottom:2px">Enable Notifications</div><div style="font-size:.72rem;color:var(--text2)">Event reminders, booking updates & more</div>';
    const btn1=document.createElement('button');
    btn1.textContent='Allow';btn1.onclick=_allowNotifs;
    btn1.style.cssText='background:var(--blue);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap';
    const btn2=document.createElement('button');
    btn2.textContent='✕';btn2.onclick=_dismissNotifBanner;
    btn2.style.cssText='background:none;border:none;color:var(--text2);cursor:pointer;font-size:.9rem;padding:0';
    b.appendChild(ico);b.appendChild(txt);b.appendChild(btn1);b.appendChild(btn2);
    document.body.appendChild(b);
    setTimeout(function(){_dismissNotifBanner();},8000);
  },3000);
}

function renderNotifs(){
  const ns=DB.g('notifs')||[];
  const el=document.getElementById('n-list');if(!el)return;
  el.innerHTML=ns.slice().reverse().map(n=>`<div class="nitem ${n.read?'':'unread'}" onclick="markRead('${n.id}')">
    <div class="ni-ico" style="background:${n.type==='success'?'rgba(39,174,96,.12)':n.type==='warn'?'rgba(245,166,35,.1)':'rgba(61,125,232,.12)'}">${n.icon}</div>
    <div style="flex:1"><div class="nbt">${n.title}</div><div class="nbm">${n.msg}</div></div>
    <div class="ntime">${n.time}</div>
  </div>`).join('')||'<div class="empty"><div class="empty-i">🔔</div><div class="empty-m">No notifications</div></div>';
}

function markRead(id){const ns=DB.g('notifs')||[];const i=ns.findIndex(n=>n.id===id);if(i!==-1){ns[i].read=true;DB.s('notifs',ns);}updateNDot();renderNotifs()}
function markAllRead(){const ns=(DB.g('notifs')||[]).map(n=>({...n,read:true}));DB.s('notifs',ns);updateNDot();renderNotifs();toast('All marked as read','info')}
function updateNDot(){const ns=DB.g('notifs')||[];const el=document.getElementById('ndot');if(el)el.style.display=ns.some(n=>!n.read)?'block':'none'}

// ════════════════════════════════════
// MODALS
// ════════════════════════════════════
function openOv(id){document.getElementById(id)?.classList.add('on')}
function closeOv(id){document.getElementById(id)?.classList.remove('on')}
document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('on')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.ov.on').forEach(o=>o.classList.remove('on'))});

// ════════════════════════════════════
// THEME
// ════════════════════════════════════

function toggleUtkarshEdit(){
  const form=document.getElementById('ub-edit-form');
  if(!form)return;
  const isOpen=form.style.display==='block';
  form.style.display=isOpen?'none':'block';
}
function saveUtkarshBoard(){
  const board={
    name:document.getElementById('ube-name')?.value||'Utkarsh Annual Fest',
    tagline:document.getElementById('ube-tagline')?.value||'',
    members:document.getElementById('ube-members')?.value||'2400+',
    editions:document.getElementById('ube-editions')?.value||'8th',
    year:document.getElementById('ube-year')?.value||'2025',
    desc:document.getElementById('ube-desc')?.value||'',
    web:document.getElementById('ube-web')?.value||'',
    ig:document.getElementById('ube-ig')?.value||'',
    email:document.getElementById('ube-email')?.value||''
  };
  DB.s('utkarsh_board',board);
  toast('✅ Utkarsh Board saved!','success');
  renderAdminOverview();
}
function toggleTheme(){
  const isDark=document.body.classList.toggle('dark');
  const btn=document.getElementById('theme-toggle');
  if(btn)btn.innerHTML=isDark?'<i class="fa-solid fa-sun"></i>':'<i class="fa-solid fa-moon"></i>';
  localStorage.setItem('nx_theme',isDark?'dark':'light');
  toast(isDark?'🌙 Dark Mode':'☀️ Light Mode','info');
}
(function(){
  const saved=localStorage.getItem('nx_theme');
  if(saved==='dark'){
    document.body.classList.add('dark');
    const btn=document.getElementById('theme-toggle');
    if(btn)btn.innerHTML='<i class="fa-solid fa-sun"></i>';
  }
})();

// ════════════════════════════════════
// FLOWCHART
// ════════════════════════════════════
function flowTab(btn,id){
  document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.fpanel').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');const el=document.getElementById('fp-'+id);if(el)el.classList.add('on');
}
function renderFlowchart(){updateNDot();}

// ════════════════════════════════════
// COUNTDOWN
// ════════════════════════════════════
function startCountdown(){
  const target=new Date('2025-05-15T10:00:00');
  function tick(){
    const diff=target-new Date();if(diff<=0)return;
    const dd=Math.floor(diff/86400000),hh=Math.floor((diff%86400000)/3600000),mm=Math.floor((diff%3600000)/60000),ss=Math.floor((diff%60000)/1000);
    const s=v=>String(v).padStart(2,'0');
    ['d','h','m','s'].forEach((k,i)=>{const el=document.getElementById('cd-'+k);if(el)el.textContent=s([dd,hh,mm,ss][i]);});
  }
  tick();setInterval(tick,1000);
}

// Scroll Reveal
function initReveal(){
  const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')})},{threshold:.1});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
}

// Toast
function toast(msg,type='info'){
  const icons={success:'✅',error:'❌',info:'ℹ️',warn:'⚠️'};
  const c=document.getElementById('toasts');
  const el=document.createElement('div');el.className=`t-item t-${type}`;
  el.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(()=>{el.style.cssText='opacity:0;transform:translateX(14px);transition:all .3s';setTimeout(()=>el.remove(),310)},3200);
}


// ════════════════════════════════════
// EXCEL IMPORT — STUDENTS & ADMINS
// ════════════════════════════════════
function getDynamicUsers(){return DB.g('dynUsers')||[];}
function getAllUsers(){return [...USERS_DB,...getDynamicUsers()];}

let _pendingImport=[];
let _importRole='student';

// ── Download CSV Template ──
function dlTemplate(role){
  const isAdmin=role==='admin';
  const hdr=['"College ID *"','"Password *"','"First Name *"','"Last Name *"','"Department"','"Year"','"Email"','"Mobile"'];
  const s1=isAdmin
    ?['"ADMIN001"','"pass123"','"Ravi"','"Desai"','"Admin Office"','"—"','"ravi@college.edu"','"9800000020"']
    :['"CS240001"','"240001"','"Arjun"','"Patel"','"Computer Science"','"1st Year"','"arjun@college.edu"','"9800000010"'];
  const s2=isAdmin
    ?['"ADMIN002"','"pass456"','"Meera"','"Shah"','"HOD Office"','"—"','"meera@college.edu"','"9800000021"']
    :['"EC240002"','"240002"','"Priya"','"Shah"','"Electronics"','"2nd Year"','"priya@college.edu"','"9800000011"'];
  const s3=isAdmin
    ?[]
    :['"ME240003"','"240003"','"Rohit"','"Mehta"','"Mechanical"','"3rd Year"','"rohit@college.edu"','"9800000012"'];

  let csv=hdr.join(',')+'\r\n';
  csv+=s1.join(',')+'\r\n';
  csv+=s2.join(',')+'\r\n';
  if(s3.length) csv+=s3.join(',')+'\r\n';
  // 47 blank rows
  for(let i=0;i<47;i++) csv+='"","","","","","","",""\r\n';

  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=(isAdmin?'NEXUS_Admin_Template':'NEXUS_Student_Template')+'.csv';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},300);
  toast('✅ Template downloaded!','success');
}

// ── Open Import Modal ──
function openXLImport(){
  _pendingImport=[];
  _importRole='student';
  document.getElementById('xl-import-content').innerHTML=buildImportUI();
  openOv('ov-xl-import');
}

function buildImportUI(){
  return `
    <div style="font-family:'Outfit',sans-serif;font-size:1.4rem;font-weight:800;margin-bottom:18px">📥 Bulk Account Import</div>

    <!-- ── STUDENT SECTION ── -->
    <div style="background:rgba(61,125,232,.06);border:1px solid rgba(61,125,232,.2);border-radius:14px;padding:18px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.4rem">🎓</span>
        <div>
          <div style="font-weight:700;font-size:1rem">Student Import</div>
          <div style="font-size:.75rem;color:var(--text2)">Upload CSV → Students get login access</div>
        </div>
        <button class="btn btn-blue btn-sm" style="margin-left:auto" onclick="dlTemplate('student')">⬇️ Template</button>
      </div>
      <div style="border:2px dashed rgba(61,125,232,.35);border-radius:10px;padding:18px;text-align:center;cursor:pointer"
           onclick="document.getElementById('imp-file-s').click()"
           ondragover="event.preventDefault()"
           ondrop="event.preventDefault();handleImpFile(event.dataTransfer.files[0],'student')">
        <div style="font-size:1.8rem;margin-bottom:6px">📂</div>
        <div style="font-weight:600;font-size:.85rem;margin-bottom:3px">Student CSV Upload</div>
        <div style="font-size:.72rem;color:var(--text2)">.csv ya .xlsx — click or drag & drop</div>
      </div>
      <input type="file" id="imp-file-s" accept=".csv,.xlsx,.xls" style="display:none"
             onchange="handleImpFile(this.files[0],'student');this.value=''">
      <div id="imp-prev-s" style="margin-top:10px"></div>
    </div>

    <!-- ── ADMIN SECTION ── -->
    <div style="background:rgba(232,76,61,.05);border:1px solid rgba(232,76,61,.2);border-radius:14px;padding:18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.4rem">🛡️</span>
        <div>
          <div style="font-weight:700;font-size:1rem">Admin Import</div>
          <div style="font-size:.75rem;color:var(--text2)">Upload CSV → Admins get full panel access</div>
        </div>
        <button class="btn btn-sm" style="background:rgba(232,76,61,.15);color:var(--accent);border:1px solid rgba(232,76,61,.3);margin-left:auto" onclick="dlTemplate('admin')">⬇️ Template</button>
      </div>
      <div style="border:2px dashed rgba(232,76,61,.3);border-radius:10px;padding:18px;text-align:center;cursor:pointer"
           onclick="document.getElementById('imp-file-a').click()"
           ondragover="event.preventDefault()"
           ondrop="event.preventDefault();handleImpFile(event.dataTransfer.files[0],'admin')">
        <div style="font-size:1.8rem;margin-bottom:6px">📂</div>
        <div style="font-weight:600;font-size:.85rem;margin-bottom:3px">Admin CSV Upload</div>
        <div style="font-size:.72rem;color:var(--text2)">.csv ya .xlsx — click or drag & drop</div>
      </div>
      <input type="file" id="imp-file-a" accept=".csv,.xlsx,.xls" style="display:none"
             onchange="handleImpFile(this.files[0],'admin');this.value=''">
      <div id="imp-prev-a" style="margin-top:10px"></div>
    </div>
  `;
}

// ── Handle file upload ──
function handleImpFile(file,role){
  if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['csv','xlsx','xls'].includes(ext)){toast('CSV ya XLSX file upload karo','error');return;}
  const prevId='imp-prev-'+role[0];
  const prev=document.getElementById(prevId);
  if(prev) prev.innerHTML='<div style="padding:10px;color:var(--text2);font-size:.8rem">⚙️ Reading...</div>';

  if(ext==='csv'){
    const rd=new FileReader();
    rd.onload=function(ev){
      try{
        const txt=ev.target.result.replace(/^\uFEFF/,'');
        const rows=parseCSVText(txt);
        processRows(rows,role,prevId);
      }catch(e){showImpErr(prevId,e.message);}
    };
    rd.readAsText(file,'UTF-8');
  } else {
    const rd=new FileReader();
    rd.onload=function(ev){
      try{
        if(typeof XLSX==='undefined'){showImpErr(prevId,'Excel library not loaded. Please use a CSV file.');return;}
        const wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        processRows(rows,role,prevId);
      }catch(e){showImpErr(prevId,e.message);}
    };
    rd.readAsArrayBuffer(file);
  }
}

function showImpErr(prevId,msg){
  const el=document.getElementById(prevId);
  if(el) el.innerHTML=`<div style="color:var(--accent);font-size:.8rem;padding:8px">❌ ${msg}</div>`;
}

// ── Parse CSV text → 2D array ──
function parseCSVText(txt){
  const lines=txt.split(/\r?\n/);
  return lines.map(line=>{
    const cells=[];let cur='';let inQ=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){
        if(inQ&&line[i+1]==='"'){cur+='"';i++;}
        else inQ=!inQ;
      } else if(c===','&&!inQ){cells.push(cur.trim());cur='';}
      else cur+=c;
    }
    cells.push(cur.trim());
    return cells;
  }).filter(r=>r.some(c=>c.trim()));
}

// ── Process rows → validate → show preview ──
function processRows(rows,role,prevId){
  const prev=document.getElementById(prevId);
  if(!rows||rows.length<2){
    if(prev) prev.innerHTML='<div style="color:var(--accent);font-size:.8rem;padding:8px">❌ File khali che ya invalid.</div>';
    return;
  }

  // Find header row
  let hIdx=0;
  for(let i=0;i<Math.min(5,rows.length);i++){
    if(rows[i].some(c=>String(c).toLowerCase().includes('college'))){hIdx=i;break;}
  }

  // Clean headers
  const hdrs=rows[hIdx].map(h=>String(h).toLowerCase().replace(/[*\s]+/g,' ').trim());

  // Find columns flexibly
  function col(...keys){
    for(const k of keys){
      const i=hdrs.findIndex(h=>h.includes(k));
      if(i!==-1) return i;
    }
    return -1;
  }

  const iID  = col('college id','id');
  const iPW  = col('password','pass');
  const iFN  = col('first name','firstname','name');
  const iLN  = col('last name','lastname','surname');
  const iDEPT= col('department','dept','branch');
  const iYR  = col('year','sem');
  const iEM  = col('email','mail');
  const iMOB = col('mobile','phone','contact');

  if(iID===-1||iPW===-1||iFN===-1){
    if(prev) prev.innerHTML=`<div style="color:var(--accent);font-size:.8rem;padding:10px;background:rgba(232,76,61,.07);border-radius:8px">
      ❌ Required columns not found.<br>
      <span style="color:var(--text2)">File ma headers: <strong>${hdrs.filter(Boolean).join(', ')}</strong></span><br>
      <span style="color:var(--text2)">Joiye: <strong>College ID, Password, First Name</strong></span>
    </div>`;
    return;
  }

  const g=(row,i)=>i!==-1?String(row[i]||'').replace(/^"|"$/g,'').trim():'';

  const existingIds=getAllUsers().map(u=>u.id);
  const valid=[];const errors=[];

  rows.slice(hIdx+1).forEach((row,ri)=>{
    const id  =g(row,iID);
    const pw  =g(row,iPW);
    const fn  =g(row,iFN);
    const ln  =g(row,iLN);
    const dept=g(row,iDEPT);
    const yr  =g(row,iYR);
    const em  =g(row,iEM);
    const mob =g(row,iMOB).replace(/\D/g,'');

    if(!id&&!pw&&!fn) return; // blank row

    const errs=[];
    if(!id) errs.push('College ID missing');
    if(!pw) errs.push('Password missing');
    if(!fn) errs.push('Name missing');
    if(id&&existingIds.includes(id)) errs.push(`"${id}" pehle thi che`);
    if(em&&!/^\S+@\S+\.\S+$/.test(em)) errs.push('Email invalid');
    if(mob&&mob.length>0&&mob.length!==10) errs.push('Mobile 10 digit joie');

    if(errs.length){
      errors.push({r:hIdx+ri+2,id,fn,errs});
    } else {
      valid.push({id,pw,fn,ln,dept,yr,em,mob,role,_dynamic:true});
      existingIds.push(id);
    }
  });

  // Store pending separately by role
  if(role==='student') window._pendingS=valid;
  else window._pendingA=valid;

  // Build preview HTML
  let html='';

  if(errors.length){
    html+=`<div style="background:rgba(232,76,61,.07);border:1px solid rgba(232,76,61,.2);border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="font-weight:700;font-size:.78rem;color:var(--accent);margin-bottom:6px">⚠️ ${errors.length} row skip thase:</div>
      ${errors.map(e=>`<div style="font-size:.72rem;color:var(--text2);margin-bottom:3px">Row ${e.r}: <b style="color:var(--text)">${e.id||'?'} ${e.fn||''}</b> — ${e.errs.join(', ')}</div>`).join('')}
    </div>`;
  }

  if(valid.length){
    html+=`<div style="background:rgba(39,174,96,.06);border:1px solid rgba(39,174,96,.2);border-radius:8px;overflow:hidden;margin-bottom:8px">
      <div style="padding:8px 12px;font-weight:700;font-size:.8rem;color:var(--green)">✅ ${valid.length} ${role==='admin'?'Admin':'Student'}${valid.length>1?'s':''} ready</div>
      <div style="overflow-x:auto;max-height:180px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.72rem">
          <thead style="background:var(--surface2);position:sticky;top:0">
            <tr style="color:var(--text2)">
              <th style="text-align:left;padding:5px 8px">ID</th>
              <th style="text-align:left;padding:5px 8px">Name</th>
              <th style="text-align:left;padding:5px 8px">Dept</th>
              <th style="text-align:left;padding:5px 8px">Year</th>
            </tr>
          </thead>
          <tbody>
            ${valid.map((u,i)=>`<tr style="border-top:1px solid var(--border);${i%2?'background:rgba(255,255,255,.02)':''}">
              <td style="padding:5px 8px;font-family:'JetBrains Mono';font-size:.68rem;color:var(--teal)">${u.id}</td>
              <td style="padding:5px 8px;font-weight:600">${u.fn} ${u.ln}</td>
              <td style="padding:5px 8px;color:var(--text2)">${u.dept||'—'}</td>
              <td style="padding:5px 8px;color:var(--text2)">${u.yr||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <button class="btn btn-full btn-lg ${role==='admin'?'btn-red':'btn-green'}" onclick="doImport('${role}')">
      ✅ ${role==='admin'?'🛡️ Import '+valid.length+' Admin'+(valid.length>1?'s':''):'🎓 Import '+valid.length+' Student'+(valid.length>1?'s':'')} →
    </button>`;
  } else if(!errors.length) {
    html='<div style="color:var(--text2);font-size:.8rem;padding:8px">⚠️ No valid rows found.</div>';
  }

  if(prev) prev.innerHTML=html;
}

// ── Do actual import ──
function doImport(role){
  const list=role==='admin'?(window._pendingA||[]):(window._pendingS||[]);
  if(!list.length){toast('No data to import','error');return;}

  const dynUsers=getDynamicUsers();
  const existingIds=getAllUsers().map(u=>u.id);
  let added=0;

  list.forEach(u=>{
    if(!existingIds.includes(u.id)){
      dynUsers.push({...u, _dynamic:true});  // _dynamic flag SET - delete button dekhay
      existingIds.push(u.id);
      added++;
    }
  });

  // Save to localStorage AND Firebase
  localStorage.setItem('nx_dynUsers', JSON.stringify(dynUsers));
  if(dynUsers.length === 0){
    FBDB.ref('nexus/dynUsers').remove().catch(e=>console.warn('FB dynUsers err:',e));
  } else {
    FBDB.ref('nexus/dynUsers').set(dynUsers).catch(e=>console.warn('FB dynUsers err:',e));
  }

  // Clear pending
  if(role==='admin') window._pendingA=[];
  else window._pendingS=[];

  // Reset preview
  const prevId='imp-prev-'+role[0];
  const prev=document.getElementById(prevId);
  if(prev) prev.innerHTML=`<div style="background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.3);border-radius:8px;padding:10px;text-align:center;color:var(--green);font-weight:700">
    🎉 ${added} ${role==='admin'?'Admin':'Student'}${added>1?'s':''} imported! Login ready.
  </div>`;

  toast(`🎉 ${added} ${role} account${added>1?'s':''} import thayaa!`,'success');
  addNotif(`${added} ${role==='admin'?'Admins':'Students'} Added`,`Excel import via ${role} panel. They can login now.`,'👥','success');
  renderAdminStudents();
}

// ════════════════════════════════════
// INIT — Firebase sync first, then start app
startRealtimeSync();
syncFromFirebase(()=>{
  initDB();
  // Push any missing data to Firebase
  FBDB.ref('nexus/events').once('value').then(snap=>{
    if(!snap.val()) forceSyncToFirebase();
  });
  const savedId = DB.g('cu_id');
  if(savedId){ const u = getAllUsers().find(x=>x.id===savedId); if(u) loginOK(u); }
});
