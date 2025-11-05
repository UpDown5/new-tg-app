// app.js
document.addEventListener("DOMContentLoaded", () => {
  /* ==============================
     Хранилище: пользователи / баланс / статистика / рефералы
     ============================== */
  const Store = (() => {
    function _get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch{ return def } }
    function _set(key, val){ localStorage.setItem(key, JSON.stringify(val)) }

    let currentNick = null;

    function users(){ return _get("mell_users", {}) }
    function saveUsers(obj){ _set("mell_users", obj) }

    function register(nick, pass){
      nick = nick.trim(); pass = pass.trim();
      if(!nick || !pass) return {ok:false, msg:"Пустой ник или пароль"};
      const u = users();
      if(u[nick]) return {ok:false, msg:"Такой ник уже есть"};
      u[nick] = {
        pass, balance: 1000, spins: 0,
        stats: {
          roulette: {plays:0, wins:0, losses:0, wagered:0, won:0, maxWin:0},
          slots:    {plays:0, wins:0, losses:0, wagered:0, won:0, maxWin:0},
          mines:    {plays:0, wins:0, losses:0, wagered:0, won:0, maxWin:0},
        },
        ref: { code: genRefCode(nick), friends:0, bonusEarned:0, turnoverBonus:0 }
      };
      saveUsers(u);
      return {ok:true}
    }
    function login(nick, pass){
      const u = users();
      if(!u[nick]) return {ok:false, msg:"Нет такого ника"};
      if(u[nick].pass !== pass) return {ok:false, msg:"Неверный пароль"};
      currentNick = nick;
      return {ok:true}
    }

    function meRaw(){
      const u = users();
      if(!currentNick || !u[currentNick]) return null;
      return u[currentNick];
    }
    function meNick(){ return currentNick || "Player" }
    function meBalance(){ const m=meRaw(); return m? m.balance:0 }
    function meSpins(){ const m=meRaw(); return m? (m.spins||0):0 }
    function meStats(){ const m=meRaw(); return m? m.stats:null }
    function meRef(){ const m=meRaw(); return m? m.ref:null }

    function saveMe(m){
      const u = users();
      u[currentNick] = m;
      saveUsers(u);
    }

    function addSpin(){ const m=meRaw(); if(!m)return; m.spins=(m.spins||0)+1; saveMe(m); }
    function addBalance(sum){ const m=meRaw(); if(!m)return; m.balance += sum; saveMe(m); }
    function spendBalance(sum){
      const m=meRaw(); if(!m) return false;
      if(m.balance < sum) return false;
      m.balance -= sum; saveMe(m); return true;
    }

    function addStat(game, bet, win){
      const m=meRaw(); if(!m) return;
      const s=m.stats[game];
      s.plays += 1;
      s.wagered += bet;
      if(win>0){ s.wins += 1; s.won += win; s.maxWin = Math.max(s.maxWin, win); }
      else{ s.losses += 1; }
      saveMe(m);
    }

    function genRefCode(nick){ // простой детерминированный код
      const salt = "MELL17";
      let hash = 0;
      for(const ch of (nick+salt)) hash = (hash*31 + ch.charCodeAt(0)) >>> 0;
      return "MELL-" + (hash.toString(16).toUpperCase()).padStart(8,"0");
    }

    function simulateFriendBonus(){
      const m=meRaw(); if(!m) return;
      m.balance += 500;
      m.ref.friends += 1;
      m.ref.bonusEarned += 500;
      saveMe(m);
    }

    return {
      register, login, meNick, meBalance, meSpins, addSpin,
      addBalance, spendBalance, addStat, meStats, meRef, genRefCode
    }
  })();

  /* ==============================
     RNG (крипто)
     ============================== */
  const RNG = {
    bytes(n){ const a=new Uint8Array(n); crypto.getRandomValues(a); return a; },
    float(){ const b=this.bytes(7); let n=0n; for(const x of b) n=(n<<8n)|BigInt(x); return Number(n)/Number(1n<<56n); },
    int(min,max){ return Math.floor(min + this.float()*(max-min+1)); },
    pick(arr){ return arr[this.int(0,arr.length-1)] }
  };

  /* ==============================
     UI helpers
     ============================== */
  function showToast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.remove("hidden"); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.add("hidden"),1800) }
  function goPage(id){
    ["authView","lobbyView","gameView","accountView"].forEach(x=>document.getElementById(x).classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    refreshTopline();
  }
  function refreshTopline(){
    const nick=Store.meNick(), bal=Store.meBalance();
    ["accNickTop","accNick","accNickGame","accNickAcc"].forEach(id=>{const el=document.getElementById(id); if(el) el.textContent=nick;});
    ["accBalanceTop","accBalance","accBalanceGame","accBalanceAcc"].forEach(id=>{const el=document.getElementById(id); if(el) el.textContent=bal+" ₽";});
  }

  // Навигация
  const navLobby   = document.getElementById("navLobby");
  const navAccount = document.getElementById("navAccount");
  navLobby.addEventListener("click",()=>{navLobby.classList.add("active");navAccount.classList.remove("active");goPage("lobbyView")});
  navAccount.addEventListener("click",()=>{navAccount.classList.add("active");navLobby.classList.remove("active");renderAccount();goPage("accountView")});
  document.getElementById("goGames").addEventListener("click",()=>{navLobby.click()});

  /* ==============================
     Авторизация
     ============================== */
  const loginTabBtn=document.getElementById("authLoginTab");
  const regTabBtn  =document.getElementById("authRegisterTab");
  const loginForm  =document.getElementById("loginForm");
  const registerForm=document.getElementById("registerForm");
  loginTabBtn.addEventListener("click",()=>{loginTabBtn.classList.add("active");regTabBtn.classList.remove("active");loginForm.classList.remove("hidden");registerForm.classList.add("hidden");});
  regTabBtn.addEventListener("click",()=>{regTabBtn.classList.add("active");loginTabBtn.classList.remove("active");registerForm.classList.remove("hidden");loginForm.classList.add("hidden");});

  document.getElementById("registerBtn").addEventListener("click",()=>{
    const nick=document.getElementById("regNick").value.trim();
    const pass=document.getElementById("regPass").value.trim();
    const r=Store.register(nick,pass);
    if(!r.ok) return showToast(r.msg);
    showToast("Аккаунт создан. Войдите.");
    loginTabBtn.click();
  });
  document.getElementById("loginBtn").addEventListener("click",()=>{
    const nick=document.getElementById("loginNick").value.trim();
    const pass=document.getElementById("loginPass").value.trim();
    const r=Store.login(nick,pass);
    if(!r.ok) return showToast(r.msg);
    refreshTopline();
    navLobby.classList.add("active"); navAccount.classList.remove("active");
    goPage("lobbyView");
  });

  // Пополнение демо в лобби
  document.addEventListener("click",(e)=>{
    if(e.target?.id==="addDemo"){ Store.addBalance(1000); refreshTopline(); showToast("+1000 демо ₽"); }
  });

  /* ==============================
     Лобби: кнопки запуск игр
     ============================== */
  document.querySelectorAll(".play-btn").forEach(b=>b.addEventListener("click",()=>{
    const g=b.dataset.game;
    if(g==="roulette") enterGame("Roulette 3D");
    if(g==="slots")    enterGame("Slots 3D");
    if(g==="mines")    enterGame("Mines");
  }));
  document.getElementById("backToLobby").addEventListener("click",()=>{ goPage("lobbyView"); });

  function enterGame(name){
    goPage("gameView");
    document.getElementById("gameTitle").textContent = name;
    // hide all
    ["rouletteSection","slotsSection","minesSection"].forEach(id=>document.getElementById(id).classList.add("hidden"));
    if(name.includes("Roulette")){ document.getElementById("rouletteSection").classList.remove("hidden"); rouletteInitOnce(); }
    if(name.includes("Slots")){ document.getElementById("slotsSection").classList.remove("hidden"); slotsInitOnce(); }
    if(name==="Mines"){ document.getElementById("minesSection").classList.remove("hidden"); minesInitOnce(); }
  }

  /* ==============================
     Модалка результата
     ============================== */
  function openResultModal(game, outcome, amount){
    const modal = document.getElementById("resultModal");
    modal.dataset.game = game;
    document.getElementById("modalMessage").textContent = outcome==="win" ? "Вы выиграли!" : "Вы проиграли";
    document.getElementById("modalAmount").textContent  = (outcome==="win" ? "+" : "−") + amount;
    modal.classList.remove("hidden");
  }
  function closeResultModal(){ document.getElementById("resultModal").classList.add("hidden") }
  document.getElementById("modalOk").addEventListener("click", closeResultModal);
  document.getElementById("modalRetry").addEventListener("click", ()=>{
    const g=document.getElementById("resultModal").dataset.game;
    closeResultModal();
    if(g==="roulette") rouletteSpin();
    if(g==="slots")    slotsSpin();
    if(g==="mines")    minesStart();
  });

  /* ==============================
     Рулетка 3D — видимый шар, подсветка, badge результата
     ============================== */
  let rInit=false,rSpinning=false, rc, rctx, rW=420, rH=420, rDpr=1;
  // const reds=... (УДАЛЯЕМ, ЛОГИКА ТЕПЕРЬ ДРУГАЯ)
  const nums=Array.from({length:17},(_,i)=>i), seg=2*Math.PI/17; // 0-16
  const hist=[], freq=new Array(17).fill(0); // 17 ячеек
  const easeOutQuint = t => 1-(--t)*t*t*t*t; // Плавная анимация

  function rFit(){
    rDpr=Math.max(1,window.devicePixelRatio||1);
    const size=Math.min(rc.clientWidth||360,480);
    rW=size; rH=size; rc.width=size*rDpr; rc.height=size*rDpr; rc.style.width=size+"px"; rc.style.height=size+"px";
    rctx.setTransform(rDpr,0,0,rDpr,0,0);
    rDraw(0,0,false,-1);
  }
  function rUpdate(hit){
    hist.unshift(hit); if(hist.length>20) hist.pop(); freq[hit]++;
    const total=freq.reduce((a,b)=>a+b,0);
    // Новая логика подсчета RED (четные) и BLACK (нечетные)
    const r = freq.reduce((s,_,n)=>(n!==0 && n%2===0) ? s+freq[n] : s, 0); // Evens (Red)
    const b = freq.reduce((s,_,n)=>(n%2===1) ? s+freq[n] : s, 0); // Odds (Black)
    const pct = n=> total? ((freq[n]/total)*100).toFixed(1):"0.0";
    document.getElementById("rouletteStats").innerHTML =
      `<div>Последние: ${hist.join(", ")}</div><div>Всего: ${total}</div><div>0: ${freq[0]} (${pct(0)}%) • Красн: ${r} • Черн: ${b}</div>`;
  }

  let wheelA=0, ballA=0;
  function rDraw(wa, ba, drawBall, highlightIdx){
    const ctx=rctx,w=rW,h=rH,R=w/2;
    ctx.clearRect(0,0,w,h);
    ctx.save(); ctx.translate(R,R);

    // обод
    const g=ctx.createRadialGradient(0,0,0,0,0,R);
    g.addColorStop(0,"#e0e0e0"); g.addColorStop(0.6,"#f0f0f0"); g.addColorStop(1,"#ffffff");
    ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,R*0.96,0,Math.PI*2); ctx.lineWidth=4; ctx.strokeStyle="#d2b676"; ctx.stroke();

    // сегменты
    ctx.save(); ctx.rotate(wa);
    nums.forEach((n,i)=>{
      const a1=i*seg, a2=(i+1)*seg;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R*0.82,a1,a2); ctx.closePath();
      
      // Новая логика цветов: 0=Зеленый, Чет=Красный, Нечет=Черный
      let color = "#0a0a0a"; // Черный (нечет) по умолчанию
      if(n === 0) { color = "#19a866"; } // Зеленый
      else if (n % 2 === 0) { color = "#b91c1c"; } // Красный
      ctx.fillStyle = color;
      
      ctx.fill();
      ctx.strokeStyle="#d2b676"; ctx.lineWidth=1.1; ctx.stroke();
    });

    // цифры
    ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.font="12px Space Mono";
    nums.forEach((n,i)=>{ const m=(i+0.5)*seg; ctx.save(); ctx.rotate(m); ctx.fillText(String(n), R*0.66, 0); ctx.restore(); });
    ctx.restore();

    // центр
    const cg=ctx.createRadialGradient(0,0,0,0,0,R*0.5);
    cg.addColorStop(0,"#f0f0f0"); cg.addColorStop(1,"#e0e0e0");
    ctx.beginPath(); ctx.arc(0,0,R*0.55,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,R*0.55,0,Math.PI*2); ctx.lineWidth=3; ctx.strokeStyle="#d2b676"; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,R*0.15,0,Math.PI*2); ctx.fillStyle="#d2b676"; ctx.fill();

    ctx.restore();

    // шар
    if(drawBall){
      const cx=w/2, cy=h/2, track=R*0.78;
      const baN=((ba%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
      const bx=cx+Math.sin(baN)*track, by=cy-Math.cos(baN)*track;
      ctx.beginPath(); ctx.fillStyle="#333"; ctx.arc(bx,by,6,0,Math.PI*2); ctx.fill(); ctx.lineWidth=1; ctx.strokeStyle="#000"; ctx.stroke();
    }

    // стрелка
    ctx.beginPath(); ctx.fillStyle="#333"; ctx.moveTo(w/2,8); ctx.lineTo(w/2-10,28); ctx.lineTo(w/2+10,28); ctx.closePath(); ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle="#d2b676"; ctx.stroke();

    // подсветка победного сектора
    const badge=document.getElementById("rouletteBadge");
    if(highlightIdx>=0){
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  function rouletteInitOnce(){
    if(rInit){ rFit(); return; }
    rInit=true;
    rc=document.getElementById("rouletteCanvas");
    rctx=rc.getContext("2d");
    window.addEventListener("resize", rFit);
    rFit();

    document.getElementById("rouletteType").addEventListener("change",()=>{
      document.getElementById("rouletteNumberWrap").style.display =
        (document.getElementById("rouletteType").value==="single") ? "" : "none";
    });

    document.querySelectorAll('.chip[data-target="rouletteBet"]').forEach(c=>c.addEventListener("click",()=>{
      document.getElementById("rouletteBet").value = c.dataset.val;
    }));

    document.getElementById("rouletteSpin").addEventListener("click", rouletteSpin);
  }

  function resolveRoulettePayout(bet,type,pick,n){
    let w=0;
    // Выплата за число 16:1 (т.к. 17 чисел)
    if(type==="single"){ if(pick===n) w=bet*16 } 
    // Красное == Четное
    else if(type==="red"){ if(n!==0 && n%2===0) w=bet*2 } 
    // Черное == Нечетное
    else if(type==="black"){ if(n!==0 && n%2===1) w=bet*2 } 
    else if(type==="even"){ if(n!==0 && n%2===0) w=bet*2 }
    else if(type==="odd"){ if(n!==0 && n%2===1) w=bet*2 }
    return w;
  }

  function rouletteSpin(){
    if(rSpinning) return;
    const bet = Math.max(1, (document.getElementById("rouletteBet").value|0));
    if(!Store.spendBalance(bet)) return showToast("Недостаточно средств");
    refreshTopline();
    Store.addSpin();

    const tSel=document.getElementById("rouletteType").value;
    const pickNum=parseInt(document.getElementById("rouletteNumber").value, 10) || 0;

    // --- ИЗМЕНЕНИЕ ЛОГИКИ: 0-16 ---
    const hitIdx = RNG.int(0,16);
    const hitNum = nums[hitIdx];
    // ---

    // стартовые фазы/скорости
    const target = (2*Math.PI - (hitIdx+0.5)*seg); // центр сектора под стрелкой
    rSpinning=true;
    document.getElementById("rouletteInfo").textContent="Крутим...";

    // --- НОВАЯ ПЛАВНАЯ АНИМАЦИЯ ---
    const startTime = performance.now();
    const duration = 7000; // 7 секунд
    const startWheelA = wheelA;
    const startBallA = ballA;

    // 5-8 полных оборотов + доводка до цели
    const totalWheelRot = (RNG.int(5, 8) * 2 * Math.PI) + (target - (wheelA % (2*Math.PI)));
    // 10-15 оборотов в другую сторону
    const totalBallRot = -(RNG.int(10, 15) * 2 * Math.PI) - (ballA % (2*Math.PI));

    let landed = false;

    function step(timestamp){
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / duration);
      const p = easeOutQuint(t); // Прогресс 0..1 по кривой

      if (t < 1) {
        wheelA = startWheelA + totalWheelRot * p;
        ballA = startBallA + totalBallRot * p;
        rDraw(wheelA, ballA, true, -1);
        requestAnimationFrame(step);
      }
      // Финиш: остановка, подсветка и бейдж
      else if (!landed) {
        landed=true; rSpinning=false;
        wheelA = startWheelA + totalWheelRot; // Фиксируем конечную позицию
        ballA = startBallA + totalBallRot;
        rDraw(wheelA, ballA, true, hitIdx);

        // бейдж результата на холсте (в углу)
        const badge = document.getElementById("rouletteBadge");
        // --- ИЗМЕНЕНИЕ ЛОГИКИ: ЦВЕТ ---
        const col = hitNum === 0 ? "GREEN" : (hitNum % 2 === 0 ? "RED" : "BLACK");
        badge.textContent = `№${hitNum} • ${col}`;

        const win = resolveRoulettePayout(bet,tSel,pickNum,hitNum);
        rUpdate(hitNum);

        // обновление баланса/инфо и задержка перед модалкой
        if(win>0){
          Store.addBalance(win); refreshTopline();
          document.getElementById("rouletteInfo").textContent=`WIN №${hitNum}: +${win}`;
          Store.addStat("roulette", bet, win);
        } else {
          document.getElementById("rouletteInfo").textContent=`LOSE №${hitNum}`;
          Store.addStat("roulette", bet, 0);
        }

        setTimeout(()=>{
          openResultModal("roulette", win>0?"win":"lose", win>0?win:bet);
        }, 1100);
      }
    }
    requestAnimationFrame(step);
    // --- КОНЕЦ НОВОЙ АНИМАЦИИ ---
  }

  /* ==============================
     Slots — 3 независимых барабана
     ============================== */
  let sInit=false, sSpinning=false;
  const symbols = [
    {icon:"💎", mult:12, weight:1},
    {icon:"7",  mult:6,  weight:2},
    {icon:"⭐", mult:3,  weight:4},
    {icon:"BAR",mult:2,  weight:5},
    {icon:"🍒", mult:1.5,weight:6},
    {icon:"X",  mult:0,  weight:6},
  ];
  function weightedPick(){
    const total = symbols.reduce((s,x)=>s+x.weight,0);
    let r=RNG.float()*total;
    for(const s of symbols){ if(r<s.weight) return s; r-=s.weight; }
    return symbols[symbols.length-1];
  }
  function buildStrip(el){
    const strip = document.createElement("div"); strip.className="strip";
    // длинная лента для плавного скролла
    const pool = [];
    for(let k=0;k<8;k++){ for(const s of symbols) pool.push(s) }
    RNG.pick; // to use rng
    for(const s of pool){
      const d=document.createElement("div"); d.className="symbol";
      if(s.icon==="BAR") d.classList.add("bar"); if(s.icon==="X") d.classList.add("dim");
      d.textContent=s.icon; strip.appendChild(d);
    }
    el.innerHTML=""; el.appendChild(strip);
    return strip;
  }

  let reel1,reel2,reel3, stripH=50; // высота символа
  function slotsInitOnce(){
    if(sInit) return; sInit=true;
    reel1=document.getElementById("reel1");
    reel2=document.getElementById("reel2");
    reel3=document.getElementById("reel3");
    buildStrip(reel1); buildStrip(reel2); buildStrip(reel3);

    document.getElementById("slotsSpin").addEventListener("click", slotsSpin);
    document.querySelectorAll('.chip[data-target="slotsBet"]').forEach(c=>c.addEventListener("click",()=>{
      document.getElementById("slotsBet").value = c.dataset.val;
    }));
  }

  function slotsSpin(){
    if(sSpinning) return;
    const bet = Math.max(1,(document.getElementById("slotsBet").value|0));
    if(!Store.spendBalance(bet)) return showToast("Недостаточно средств");
    refreshTopline(); Store.addSpin();

    sSpinning=true;
    document.getElementById("slotsInfo").textContent="Крутим...";

    const reels=[reel1,reel2,reel3].map(buildStrip); // rebuild strips for randomness

    // финальные символы
    const finals=[weightedPick(), weightedPick(), weightedPick()];
    // время остановки
    const stops=[900+RNG.int(0,300), 1100+RNG.int(0,300), 1300+RNG.int(0,300)];

    reels.forEach((strip,i)=>{
      // бесконечный «скролл»
      let t=0, tick;
      function spinTick(){
        t+=16;
        const y = -((t*0.6) % (stripH*symbols.length*8));
        strip.style.transform = `translateY(${y}px)`;
        strip._tick = requestAnimationFrame(spinTick);
      }
      spinTick();

      setTimeout(()=>{
        cancelAnimationFrame(strip._tick);
        // вычислим позицию так, чтобы целевой символ оказался по центру
        const idx = Array.from(strip.children).findIndex(c=>c.textContent===finals[i].icon);
        const visibleCenter = 2; // элемент по центру окна (0.. N-1) при высоте 150px и elem=50px
        const targetOffset = -(idx - visibleCenter) * stripH;
        strip.style.transition = "transform 420ms cubic-bezier(.2,.9,.2,1)";
        strip.style.transform  = `translateY(${targetOffset}px)`;
      }, stops[i]);
    });

    // По завершении всех — считаем выигрыш
    const totalDelay = Math.max(...stops)+500;
    setTimeout(()=>{
      const icons = finals.map(x=>x.icon);
      const same3 = icons[0]===icons[1] && icons[1]===icons[2];
      let mult=0, win=0;
      if(same3){
        mult = symbols.find(s=>s.icon===icons[0]).mult;
        win = Math.round(bet*mult);
      }
      if(win>0){ Store.addBalance(win); refreshTopline(); document.getElementById("slotsInfo").textContent=`${icons.join(" | ")} • 3× = x${mult} • +${win}`; Store.addStat("slots",bet,win); }
      else{ document.getElementById("slotsInfo").textContent=`${icons.join(" | ")} • мимо • −${bet}`; Store.addStat("slots",bet,0); }

      // модалка после видимого результата
      openResultModal("slots", win>0?"win":"lose", win>0?win:bet);

      sSpinning=false;
    }, totalDelay);
  }

  /* ==============================
     Mines (как раньше, + статистика)
     ============================== */
  let mInit=false, mTiles=[], mBombs=new Set(), mPlaying=false, mBet=0, mSafe=0;
  function minesInitOnce(){
    if(mInit) return; mInit=true;
    const grid=document.getElementById("minesGrid");
    function build(){
      grid.innerHTML=""; mTiles = Array.from({length:16},(_,i)=>{
        const b=document.createElement("button"); b.className="tile"; b.textContent="?"; b.disabled=true; b.addEventListener("click",()=>open(i)); grid.appendChild(b); return b;
      });
    }
    build();
    document.getElementById("minesStart").addEventListener("click", start);
    document.getElementById("minesCashout").addEventListener("click", cashout);
    document.getElementById("minesDec").addEventListener("click",()=>{const el=document.getElementById("minesCount"); el.value=Math.max(1,(+el.value||1)-1)});
    document.getElementById("minesInc").addEventListener("click",()=>{const el=document.getElementById("minesCount"); el.value=Math.min(15,(+el.value||1)+1)});
    document.querySelectorAll('.chip[data-target="minesBet"]').forEach(c=>c.addEventListener("click",()=>{document.getElementById("minesBet").value=c.dataset.val}));
    function start(){
      const bet=Math.max(1,(document.getElementById("minesBet").value|0));
      const cnt=Math.min(15,Math.max(1,(document.getElementById("minesCount").value|0)));
      if(!Store.spendBalance(bet)) return showToast("Недостаточно средств");
      refreshTopline(); Store.addSpin();
      mBet=bet; mSafe=0; mPlaying=true; mBombs.clear();
      while(mBombs.size<cnt){ mBombs.add(RNG.int(0,15)) }
      mTiles.forEach(t=>{ t.className="tile"; t.textContent="?"; t.disabled=false; });
      document.getElementById("minesCashout").disabled=false;
      document.getElementById("minesInfo").textContent=`Мины: ${cnt}. Открывай.`;
    }
    function mult(safe,bombs){ return (1+bombs*0.05)*Math.pow(1.12,safe) }
    function open(i){
      if(!mPlaying) return;
      const info=document.getElementById("minesInfo"), cash=document.getElementById("minesCashout");
      if(mBombs.has(i)){
        revealAll(); info.textContent="Бум! Проигрыш."; cash.disabled=true; mPlaying=false; Store.addStat("mines",mBet,0); openResultModal("mines","lose",mBet); return;
      }
      const t=mTiles[i]; if(t.classList.contains("revealed")) return;
      t.classList.add("revealed"); t.textContent="✓"; mSafe++;
      info.textContent=`Рискни ещё или Забери • ×${mult(mSafe,mBombs.size).toFixed(2)}`;
    }
    function cashout(){
      if(!mPlaying) return;
      const info=document.getElementById("minesInfo"), cash=document.getElementById("minesCashout");
      const win=Math.round(mBet*mult(mSafe,mBombs.size));
      Store.addBalance(win); refreshTopline(); Store.addStat("mines",mBet,win);
      info.textContent=`Забрал: +${win}`; revealAll(); cash.disabled=true; mPlaying=false;
      openResultModal("mines","win",win);
    }
    function revealAll(){
      mTiles.forEach((t,idx)=>{ t.disabled=true; if(mBombs.has(idx)){ t.classList.add("bomb"); t.textContent="✖"; } else if(!t.classList.contains("revealed")){ t.classList.add("revealed"); t.textContent="•"; } });
    }
  }

  /* ==============================
     Аккаунт
     ============================== */
  function renderAccount(){
    const stats = Store.meStats();
    document.getElementById("statsUpdated").textContent = new Date().toLocaleString();
    const grid = document.getElementById("statsGrid");
    const tiles = [];
    for(const [game,s] of Object.entries(stats)){
      tiles.push(`
        <div class="stat-tile">
          <div class="stat-name">${game.toUpperCase()}</div>
          <div class="stat-val">Сыграно: ${s.plays}</div>
          <div class="info-line">Победы: ${s.wins} • Поражения: ${s.losses}</div>
          <div class="info-line">Поставлено: ${s.wagered} ₽</div>
          <div class="info-line">Выиграно: ${s.won} ₽</div>
          <div class="info-line">Макс выигрыш: ${s.maxWin} ₽</div>
        </div>
      `);
    }
    grid.innerHTML = tiles.join("");

    const ref = Store.meRef();
    const code = ref?.code || Store.genRefCode(Store.meNick());
    document.getElementById("refCode").textContent = code;
  }
  document.getElementById("copyRef").addEventListener("click", ()=>{
    const code=document.getElementById("refCode").textContent;
    navigator.clipboard?.writeText(code);
    showToast("Код скопирован");
  });
  document.getElementById("simulateFriend").addEventListener("click", ()=>{
    // демо-начисление
    const u = localStorage.getItem("mell_users"); // просто триггер через Store
    const users = JSON.parse(u);
    // нашёл текущего — начислим через Store
    Store.addBalance(500);
    refreshTopline();
    showToast("+500 демо начислено");
  });

  /* ==============================
     Иллюстрация рулетки в карточке лобби
     ============================== */
  (function lobbyRouletteIll(){
    const c = document.querySelector(".ill-roulette");
    if(!c) return;
    const ctx = c.getContext("2d");
    function draw(){
      const w=c.width, h=c.height, R=Math.min(w,h)/2 - 6;
      ctx.clearRect(0,0,w,h);
      ctx.save(); ctx.translate(w/2,h/2);
      ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fillStyle="#f0f0f0"; ctx.fill();
      ctx.beginPath(); ctx.arc(0,0,R*0.92,0,Math.PI*2); ctx.strokeStyle="#d2b676"; ctx.lineWidth=3; ctx.stroke();
      const a=2*Math.PI/12;
      for(let i=0;i<12;i++){
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0,0,R*0.78,i*a,(i+1)*a);
        ctx.closePath();
        ctx.fillStyle = (i%2)?"#b91c1c":"#0a0a0a";
        ctx.fill();
      }
      ctx.restore();
      // Убрал requestAnimationFrame, чтобы не грузить ЦП в лобби
      // requestAnimationFrame(draw); 
    }
    draw();
  })();

  /* ==============================
     Старт: на авторизацию
     ============================== */
  goPage("authView");
});