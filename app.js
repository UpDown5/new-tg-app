document.addEventListener("DOMContentLoaded", () => {

  /* ==============================
     STORAGE / USERS / BALANCE
     ============================== */
  const Store = (() => {
    // users = { nickname: { pass: "xxx", balance: 1234 } }
    function _loadUsers() {
      try {
        return JSON.parse(localStorage.getItem("mell_users")) || {};
      } catch {
        return {};
      }
    }
    function _saveUsers(obj) {
      localStorage.setItem("mell_users", JSON.stringify(obj));
    }

    let currentNick = null;

    function register(nick, pass) {
      nick = nick.trim();
      pass = pass.trim();
      if (!nick || !pass) return { ok:false, msg:"Пустой ник или пароль" };

      const users = _loadUsers();
      if (users[nick]) {
        return { ok:false, msg:"Такой ник уже есть" };
      }
      users[nick] = { pass, balance: 1000 }; // стартовый демо-баланс
      _saveUsers(users);
      return { ok:true, msg:"Аккаунт создан" };
    }

    function login(nick, pass) {
      nick = nick.trim();
      pass = pass.trim();
      const users = _loadUsers();
      if (!users[nick]) return { ok:false, msg:"Нет такого ника" };
      if (users[nick].pass !== pass) return { ok:false, msg:"Неверный пароль" };
      currentNick = nick;
      return { ok:true };
    }

    function _getMe() {
      const users = _loadUsers();
      if (!currentNick || !users[currentNick]) return null;
      return users[currentNick];
    }

    function meNick() {
      return currentNick || "Player";
    }

    function meBalance() {
      const me = _getMe();
      return me ? me.balance : 0;
    }

    function saveBalance(newBal) {
      const users = _loadUsers();
      if (!currentNick || !users[currentNick]) return;
      users[currentNick].balance = newBal;
      _saveUsers(users);
    }

    function addBalance(amount) {
      const bal = meBalance();
      saveBalance(bal + amount);
    }

    function spendBalance(amount) {
      const bal = meBalance();
      if (bal < amount) return false;
      saveBalance(bal - amount);
      return true;
    }

    return {
      register,
      login,
      meNick,
      meBalance,
      addBalance,
      spendBalance,
    };
  })();


  /* ==============================
     BASIC UI HELPERS
     ============================== */
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.classList.add("hidden");
    }, 2000);
  }

  // показать нужную страницу
  function goPage(pageId) {
    document.getElementById("authView").classList.add("hidden");
    document.getElementById("lobbyView").classList.add("hidden");
    document.getElementById("gameView").classList.add("hidden");

    document.getElementById(pageId).classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // обновить ник/баланс в лобби и в игре
  function refreshAccountInfo() {
    const nick = Store.meNick();
    const bal = Store.meBalance();

    const accNick = document.getElementById("accNick");
    const accBal  = document.getElementById("accBalance");
    const accNickG= document.getElementById("accNickGame");
    const accBalG = document.getElementById("accBalanceGame");

    if (accNick)   accNick.textContent = nick;
    if (accBal)    accBal.textContent = bal + " ₽";
    if (accNickG)  accNickG.textContent = nick;
    if (accBalG)   accBalG.textContent = bal + " ₽";
  }

  // модалка выигрыша / проигрыша
  function openResultModal(game, outcome, amount) {
    const modal = document.getElementById("resultModal");
    const msgEl = document.getElementById("modalMessage");
    const amtEl = document.getElementById("modalAmount");

    msgEl.textContent = (outcome==="win") ? "Вы выиграли!" : "Вы проиграли!";
    amtEl.textContent = (outcome==="win" ? "+" : "-") + amount;
    modal.dataset.game = game;
    modal.classList.remove("hidden");
  }
  function closeResultModal() {
    document.getElementById("resultModal").classList.add("hidden");
  }

  // динамически переключать экран с игрой
  function enterGame(gameName) {
    goPage("gameView");
    refreshAccountInfo();
    document.getElementById("gameTitle").textContent = gameName;

    // скрываем все секции игр
    document.getElementById("rouletteSection").classList.add("hidden");
    document.getElementById("plinkoSection").classList.add("hidden");
    document.getElementById("minesSection").classList.add("hidden");

    if (gameName==="Roulette") {
      document.getElementById("rouletteSection").classList.remove("hidden");
      rouletteInitOnce();
    } else if (gameName==="Plinko") {
      document.getElementById("plinkoSection").classList.remove("hidden");
      plinkoInitOnce();
    } else if (gameName==="Mines") {
      document.getElementById("minesSection").classList.remove("hidden");
      minesInitOnce();
    }
  }


  /* ==============================
     AUTH UI (Вход / Регистрация)
     ============================== */
  const loginTabBtn = document.getElementById("authLoginTab");
  const regTabBtn   = document.getElementById("authRegisterTab");
  const loginForm   = document.getElementById("loginForm");
  const registerForm= document.getElementById("registerForm");

  loginTabBtn.addEventListener("click", () => {
    loginTabBtn.classList.add("active");
    regTabBtn.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  });
  regTabBtn.addEventListener("click", () => {
    regTabBtn.classList.add("active");
    loginTabBtn.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  });

  // регистрация
  document.getElementById("registerBtn").addEventListener("click", () => {
    const nick = document.getElementById("regNick").value.trim();
    const pass = document.getElementById("regPass").value.trim();

    const res = Store.register(nick, pass);
    if (!res.ok) {
      showToast(res.msg);
      return;
    }
    showToast("Аккаунт создан. Теперь войдите.");
    // переключаемся на "Войти"
    loginTabBtn.click();
  });

  // логин
  document.getElementById("loginBtn").addEventListener("click", () => {
    const nick = document.getElementById("loginNick").value.trim();
    const pass = document.getElementById("loginPass").value.trim();

    const res = Store.login(nick, pass);
    if (!res.ok) {
      showToast(res.msg);
      return;
    }

    refreshAccountInfo();
    goPage("lobbyView");
  });

  // пополнение демо
  document.getElementById("addDemo").addEventListener("click", () => {
    Store.addBalance(1000);
    refreshAccountInfo();
    showToast("+1000 демо ₽");
  });


  /* ==============================
     ЛОББИ -> ВХОД В ИГРУ
     ============================== */
  document.querySelectorAll(".play-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const game = btn.dataset.game;
      if (game === "roulette") {
        enterGame("Roulette");
      } else if (game === "plinko") {
        enterGame("Plinko");
      } else if (game === "mines") {
        enterGame("Mines");
      }
    });
  });

  document.getElementById("backToLobby").addEventListener("click", () => {
    goPage("lobbyView");
    refreshAccountInfo();
  });


  /* ==============================
     МОДАЛКА ДЕЙСТВИЯ (OK / Поставить ещё)
     ============================== */
  document.getElementById("modalOk").addEventListener("click", () => {
    closeResultModal();
  });
  document.getElementById("modalRetry").addEventListener("click", () => {
    const modal = document.getElementById("resultModal");
    const game = modal.dataset.game;
    closeResultModal();
    if (game === "plinko") {
      plinkoPlay();
    } else if (game === "roulette") {
      rouletteSpin();
    } else if (game === "mines") {
      minesStart();
    }
  });


  /* ==============================
     ROULETTE GAME
     ============================== */
  let rouletteInited = false;
  let rouletteSpinning = false;
  let rouletteCanvas, rctx;
  let rW=360, rH=360, rDpr=1;
  const rouletteReds = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const rouletteNums = Array.from({length:37},(_,i)=>i);

  function rouletteFitCanvas() {
    const canvas = rouletteCanvas;
    rDpr = Math.max(1, window.devicePixelRatio || 1);
    const size = Math.min(canvas.clientWidth||360,480);
    rW = size;
    rH = size;
    canvas.width = size*rDpr;
    canvas.height= size*rDpr;
    canvas.style.width=size+"px";
    canvas.style.height=size+"px";
    rctx.setTransform(rDpr,0,0,rDpr,0,0);
    rouletteDrawWheel(0,0,false);
  }

  function rouletteDrawWheel(angle, ballAngle, drawBall) {
    const ctx = rctx;
    const w=rW,h=rH;
    const r = w/2;

    ctx.clearRect(0,0,w,h);

    // "деревянная чаша стола" (фон канваса уже коричневый через css, но усилим)
    // rim
    ctx.save();
    ctx.translate(r,r);
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fillStyle = rctx.createRadialGradient(0,0,0, 0,0,r);
    ctx.fillStyle = "#2c1b12";
    ctx.fill();

    // вращающаяся часть с секторами
    ctx.rotate(angle);

    rouletteNums.forEach((n,i)=>{
      const a1 = (i/37)*2*Math.PI;
      const a2 = ((i+1)/37)*2*Math.PI;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,r*0.9,a1,a2);
      ctx.closePath();

      let c;
      if (n===0) c="#27ae60";           // зелёный
      else c = rouletteReds.has(n)?"#e74c3c":"#000000"; // красн/чёрн
      ctx.fillStyle=c;
      ctx.fill();

      // белая тонкая граница между ячейками
      ctx.strokeStyle="rgba(255,255,255,.5)";
      ctx.lineWidth=1;
      ctx.stroke();
    });

    // цифры по кругу
    ctx.fillStyle="#fff";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font="12px Space Mono";
    rouletteNums.forEach((n,i)=>{
      const mid=(i+0.5)/37*2*Math.PI;
      ctx.save();
      ctx.rotate(mid);
      const rr=r*0.72;
      ctx.fillText(String(n), rr, 0);
      ctx.restore();
    });

    // чёрная часть в центре
    ctx.beginPath();
    ctx.arc(0,0,r*0.55,0,Math.PI*2);
    ctx.fillStyle="#000";
    ctx.fill();

    ctx.restore();

    // шарик
    if (drawBall) {
      const cx=w/2,cy=h/2;
      const br=r*0.8;
      const ba=((ballAngle%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
      const bx=cx+Math.sin(ba)*br;
      const by=cy-Math.cos(ba)*br;
      ctx.beginPath();
      ctx.fillStyle="#fff";
      ctx.arc(bx,by,6,0,Math.PI*2);
      ctx.fill();
    }

    // маркер сверху
    ctx.beginPath();
    ctx.fillStyle="#fff";
    ctx.moveTo(w/2,8);
    ctx.lineTo(w/2-10,26);
    ctx.lineTo(w/2+10,26);
    ctx.closePath();
    ctx.fill();
  }

  let rouletteAngle=0;
  let rouletteBallAngle=0;
  let rouletteBallSpeed=0;
  let rouletteStop=false;
  let rouletteResult=null;

  function rouletteResolvePayout(bet, type, pick, n) {
    let win=0;
    if (type==="single") {
      if (pick===n) win=bet*36;
    } else if (type==="red") {
      if (rouletteReds.has(n)) win=bet*2;
    } else if (type==="black") {
      if (n!==0 && !rouletteReds.has(n)) win=bet*2;
    } else if (type==="even") {
      if (n!==0 && n%2===0) win=bet*2;
    } else if (type==="odd") {
      if (n%2===1) win=bet*2;
    }
    return win;
  }

  function rouletteSpin() {
    if (rouletteSpinning) return;

    const betInput = document.getElementById("rouletteBet");
    const typeSel  = document.getElementById("rouletteType");
    const numInput = document.getElementById("rouletteNumber");
    const info     = document.getElementById("rouletteInfo");

    const bet = Math.max(1, betInput.value|0);
    if (!Store.spendBalance(bet)) {
      showToast("Недостаточно средств");
      return;
    }
    refreshAccountInfo();
    info.textContent = "Крутим...";

    rouletteSpinning=true;
    rouletteStop=false;
    rouletteResult=null;
    rouletteAngle=0;
    let wheelSpeed=0.35;
    const wheelDecay=0.985;

    rouletteBallAngle=0;
    rouletteBallSpeed=-0.6;
    const ballDecay=0.992;

    const frame = () => {
      // колесо замедляется
      if (!rouletteStop) {
        rouletteAngle += wheelSpeed;
        wheelSpeed *= wheelDecay;
      }

      // шарик едет по ободу, потом замедляется
      if (rouletteStop) {
        rouletteBallSpeed *= 0.85;
      } else {
        rouletteBallSpeed *= ballDecay;
      }
      rouletteBallAngle += rouletteBallSpeed;

      rouletteDrawWheel(rouletteAngle, rouletteBallAngle, true);

      // колесо почти остановилось -> фиксируем номер
      if (!rouletteStop && wheelSpeed < 0.005) {
        rouletteStop=true;
        const aNorm=((rouletteAngle%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
        const seg=(2*Math.PI)/37;
        const hitIdx=Math.floor(((2*Math.PI-aNorm)+seg/2)/seg)%37;
        const hitNum=rouletteNums[hitIdx];

        const pickNum = numInput.value|0;
        const w = rouletteResolvePayout(bet, typeSel.value, pickNum, hitNum);
        rouletteResult={num:hitNum, win:w, bet};
      }

      // шарик тоже почти встал -> закончили
      if (rouletteStop && Math.abs(rouletteBallSpeed) < 0.01) {
        rouletteSpinning=false;
        rouletteDrawWheel(rouletteAngle, rouletteBallAngle, true);

        if (rouletteResult) {
          if (rouletteResult.win>0) {
            Store.addBalance(rouletteResult.win);
            refreshAccountInfo();
            info.textContent = `WIN №${rouletteResult.num}: +${rouletteResult.win}`;
            openResultModal("roulette","win",rouletteResult.win);
          } else {
            info.textContent = `LOSE №${rouletteResult.num}`;
            openResultModal("roulette","lose",rouletteResult.bet);
          }
        }
        return;
      }

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function rouletteSyncTypeField() {
    const wrap=document.getElementById("rouletteNumberWrap");
    const t=document.getElementById("rouletteType").value;
    wrap.style.display=(t==="single")?"":"none";
  }

  function rouletteInitOnce() {
    if (rouletteInited) {
      rouletteFitCanvas();
      return;
    }
    rouletteInited=true;

    rouletteCanvas=document.getElementById("rouletteCanvas");
    rctx=rouletteCanvas.getContext("2d");

    rouletteFitCanvas();
    window.addEventListener("resize", rouletteFitCanvas);

    document.getElementById("rouletteType").addEventListener("change", rouletteSyncTypeField);
    rouletteSyncTypeField();

    // чипы ставок
    document.querySelectorAll('.chip[data-target="rouletteBet"]').forEach(ch => {
      ch.addEventListener("click",()=>{
        const val=ch.dataset.val;
        document.getElementById("rouletteBet").value=val;
      });
    });

    document.getElementById("rouletteSpin").addEventListener("click", rouletteSpin);
  }


  /* ==============================
     PLINKO GAME
     ============================== */
  let plinkoInited=false;
  let plinkoCanvas, pctx;
  let pW=360,pH=480,pDpr=1;
  let pRows=10;
  let pCols=11;
  let pPegs=[];
  let pBall=null;
  let pAnim=null;

  function plinkoFitCanvas() {
    pDpr=Math.max(1,window.devicePixelRatio||1);
    const size=Math.min(plinkoCanvas.clientWidth||360,360);
    pW=size;
    pH=480;
    plinkoCanvas.width=size*pDpr;
    plinkoCanvas.height=pH*pDpr;
    plinkoCanvas.style.width=size+"px";
    plinkoCanvas.style.height=pH+"px";
    pctx.setTransform(pDpr,0,0,pDpr,0,0);

    plinkoLayoutBoard();
    plinkoDraw();
  }

  function plinkoLayoutBoard() {
    const rowsInput=document.getElementById("plinkoRows");
    pRows=(rowsInput.value|0);
    pCols=pRows+1;
    pPegs=[];

    const margin=24;
    const top=60;
    const bottomPad=80;
    const spacingX=(pW-margin*2)/pCols;
    const spacingY=(pH-top-bottomPad)/pRows;

    for (let r=0;r<pRows;r++){
      const count=r+1;
      const rowY=top+r*spacingY;
      const rowW=(count-1)*spacingX;
      const rowX0=(pW/2)-rowW/2;
      for(let c=0;c<count;c++){
        pPegs.push({x:rowX0+c*spacingX,y:rowY});
      }
    }
  }

  // теоретический базовый множитель без ребаланса
  function plinkoBaseMult(slotIndex,totalSlots){
    const mid=(totalSlots-1)/2;
    const d=Math.abs(slotIndex-mid);
    // края -> высокий x, центр -> низкий x
    return 0.5 + (d/mid)*3.0;
  }

  // доминация казино: понижаем выплату рандомно,
  // иногда даже меньше ставки => можно "проиграть"
  function plinkoPayout(bet, slotIndex, totalSlots){
    const baseMult=plinkoBaseMult(slotIndex,totalSlots);

    // дом даёт минус ожидание:
    // шанс жёстко занизить множитель
    let effectiveMult=baseMult;

    const houseEdgeRoll=Math.random();
    if (houseEdgeRoll < 0.5){
      // половина случаев - режем множитель
      effectiveMult *= 0.6 + Math.random()*0.2; // 0.6-0.8 от base
    } else if (houseEdgeRoll < 0.8){
      // средние выплаты обычные, но с разбросом
      effectiveMult *= 0.9 + Math.random()*0.3; // ~0.9-1.2 * base
    } else {
      // иногда даём почти честно/чуть жирно
      effectiveMult *= 1.0 + Math.random()*0.5;
    }

    const win = Math.round(bet * effectiveMult);

    return {win, effectiveMult};
  }

  function plinkoDraw() {
    pctx.clearRect(0,0,pW,pH);

    // нижние слоты
    const slotH=50;
    const slotW=pW/pCols;
    for(let i=0;i<pCols;i++){
      pctx.fillStyle=(i%2===0)?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.3)";
      pctx.fillRect(i*slotW,pH-slotH,slotW,slotH);
    }

    // подписи множителей (базовые)
    pctx.textAlign="center";
    pctx.textBaseline="middle";
    pctx.font="14px Space Mono";
    for(let i=0;i<pCols;i++){
      const mult=plinkoBaseMult(i,pCols);
      if (mult <= 1.00){
        pctx.fillStyle="#27ae60"; // зелёный
      } else if (mult >= 3.00){
        pctx.fillStyle="#e74c3c"; // красный
      } else {
        pctx.fillStyle="#9a86ff"; // средний фиолетово-голубой
      }
      pctx.fillText(`×${mult.toFixed(2)}`, (i+0.5)*slotW, pH-slotH/2);
    }

    // пины
    pPegs.forEach(p=>{
      pctx.beginPath();
      pctx.fillStyle="#9a86ff";
      pctx.shadowColor="rgba(156,132,255,.8)";
      pctx.shadowBlur=8;
      pctx.arc(p.x,p.y,4,0,Math.PI*2);
      pctx.fill();
    });
    pctx.shadowBlur=0;

    // шарик
    if (pBall){
      pctx.beginPath();
      pctx.fillStyle="#fff";
      pctx.shadowColor="rgba(255,255,255,.7)";
      pctx.shadowBlur=12;
      pctx.arc(pBall.x,pBall.y,7,0,Math.PI*2);
      pctx.fill();
      pctx.shadowBlur=0;
    }
  }

  function plinkoStep() {
    const g=0.08;
    const drag=0.995;

    pBall.vy+=g;
    pBall.vx*=drag;
    pBall.vy*=drag;

    pBall.x+=pBall.vx;
    pBall.y+=pBall.vy;

    // отскоки от пинов
    for(const peg of pPegs){
      const dx=pBall.x-peg.x;
      const dy=pBall.y-peg.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<10){
        const dir=(Math.random()<0.5?-1:1);
        pBall.vx+=dir*(0.8+Math.random()*0.6);
        pBall.vy*=0.7;
      }
    }

    // стены
    if(pBall.x<8){
      pBall.x=8;
      pBall.vx=Math.abs(pBall.vx)*0.6;
    }
    if(pBall.x>pW-8){
      pBall.x=pW-8;
      pBall.vx=-Math.abs(pBall.vx)*0.6;
    }

    // приземление
    if(pBall.y>=pH-60){
      const slotIndex=Math.max(0,Math.min(pCols-1,Math.floor(pBall.x/(pW/pCols))));
      const {win,effectiveMult} = plinkoPayout(pBall.bet,slotIndex,pCols);

      const info=document.getElementById("plinkoInfo");

      if (win>0){
        Store.addBalance(win);
        refreshAccountInfo();
        info.textContent=`×${effectiveMult.toFixed(2)} | +${win}`;
        openResultModal("plinko","win",win);
      } else {
        info.textContent=`Пусто. Потеряно ${pBall.bet}`;
        openResultModal("plinko","lose",pBall.bet);
      }

      pBall=null;
      plinkoDraw();
      return;
    }

    plinkoDraw();
    pAnim=requestAnimationFrame(plinkoStep);
  }

  function plinkoPlay() {
    const bet = Math.max(1,(document.getElementById("plinkoBet").value|0));
    if (!Store.spendBalance(bet)){
      showToast("Недостаточно средств");
      return;
    }
    refreshAccountInfo();
    document.getElementById("plinkoInfo").textContent="...";

    pBall={x:pW/2,y:30,vx:0,vy:1.5,bet};
    cancelAnimationFrame(pAnim);
    pAnim=requestAnimationFrame(plinkoStep);
  }

  function plinkoInitOnce(){
    if(plinkoInited){
      plinkoFitCanvas();
      return;
    }
    plinkoInited=true;

    plinkoCanvas=document.getElementById("plinkoCanvas");
    pctx=plinkoCanvas.getContext("2d");

    plinkoFitCanvas();
    window.addEventListener("resize",plinkoFitCanvas);

    document.getElementById("plinkoRows").addEventListener("change",()=>{
      plinkoLayoutBoard();
      plinkoDraw();
    });

    document.getElementById("plinkoPlay").addEventListener("click",plinkoPlay);

    // чипы ставок
    document.querySelectorAll('.chip[data-target="plinkoBet"]').forEach(ch=>{
      ch.addEventListener("click",()=>{
        document.getElementById("plinkoBet").value=ch.dataset.val;
      });
    });
  }


  /* ==============================
     MINES GAME
     ============================== */
  let minesInited=false;
  let minesTiles=[];
  let minesBombs=new Set();
  let minesPlaying=false;
  let minesBet=0;
  let minesSafeOpened=0;

  function minesBuildGrid(){
    const grid=document.getElementById("minesGrid");
    grid.innerHTML="";
    minesTiles=Array.from({length:16},(_,i)=>{
      const el=document.createElement("button");
      el.className="tile";
      el.textContent="?";
      el.disabled=true;
      el.addEventListener("click",()=>minesOpen(i));
      grid.appendChild(el);
      return el;
    });
  }

  function minesStart(){
    const betInput=document.getElementById("minesBet");
    const cntInput=document.getElementById("minesCount");
    const info=document.getElementById("minesInfo");
    const cashBtn=document.getElementById("minesCashout");

    const bet=Math.max(1,betInput.value|0);
    const bombCount=Math.min(15,Math.max(1,cntInput.value|0));
    if(!Store.spendBalance(bet)){
      showToast("Недостаточно средств");
      return;
    }
    refreshAccountInfo();

    minesBet=bet;
    minesPlaying=true;
    minesSafeOpened=0;
    minesBombs.clear();

    while(minesBombs.size<bombCount){
      minesBombs.add(Math.floor(Math.random()*16));
    }

    minesTiles.forEach(t=>{
      t.className="tile";
      t.textContent="?";
      t.disabled=false;
    });

    cashBtn.disabled=false;
    info.textContent=`Мины: ${bombCount}. Открывай.`;
  }

  function minesCalcMultiplier(safeCount,bombCount){
    // растёт мультипликатор (жадно к риску)
    const base=1+bombCount*0.05;
    return base*Math.pow(1.12,safeCount);
  }

  function minesOpen(i){
    if(!minesPlaying)return;
    const info=document.getElementById("minesInfo");
    const cashBtn=document.getElementById("minesCashout");

    if(minesBombs.has(i)){
      // взрыв
      minesRevealAll();
      info.textContent="Бум! Проигрыш.";
      cashBtn.disabled=true;
      minesPlaying=false;
      openResultModal("mines","lose",minesBet);
      return;
    }
    const t=minesTiles[i];
    if(t.classList.contains("revealed"))return;

    t.classList.add("revealed");
    t.textContent="✓";
    minesSafeOpened++;

    const mult=minesCalcMultiplier(minesSafeOpened,minesBombs.size);
    info.textContent=`Рискни ещё или Забери • ×${mult.toFixed(2)}`;
  }

  function minesCashout(){
    if(!minesPlaying)return;
    const info=document.getElementById("minesInfo");
    const cashBtn=document.getElementById("minesCashout");

    const mult=minesCalcMultiplier(minesSafeOpened,minesBombs.size);
    const win=Math.round(minesBet*mult);

    Store.addBalance(win);
    refreshAccountInfo();

    info.textContent=`Забрал: +${win}`;
    openResultModal("mines","win",win);

    minesRevealAll();
    cashBtn.disabled=true;
    minesPlaying=false;
  }

  function minesRevealAll(){
    minesTiles.forEach((t,idx)=>{
      t.disabled=true;
      if(minesBombs.has(idx)){
        t.classList.add("bomb");
        t.textContent="✖";
      } else {
        if(!t.classList.contains("revealed")){
          t.classList.add("revealed");
          t.textContent="•";
        }
      }
    });
  }

  function minesInitOnce(){
    if(minesInited){
      return;
    }
    minesInited=true;
    minesBuildGrid();

    document.getElementById("minesStart").addEventListener("click",minesStart);
    document.getElementById("minesCashout").addEventListener("click",minesCashout);

    // +/- мины
    document.getElementById("minesDec").addEventListener("click",()=>{
      const inp=document.getElementById("minesCount");
      let v=Number(inp.value)||1;
      v=Math.max(1,v-1);
      inp.value=v;
    });
    document.getElementById("minesInc").addEventListener("click",()=>{
      const inp=document.getElementById("minesCount");
      let v=Number(inp.value)||1;
      v=Math.min(15,v+1);
      inp.value=v;
    });

    // чипы ставок
    document.querySelectorAll('.chip[data-target="minesBet"]').forEach(ch=>{
      ch.addEventListener("click",()=>{
        document.getElementById("minesBet").value=ch.dataset.val;
      });
    });
  }

  /* ==============================
     INIT FIRST PAGE
     ============================== */
  goPage("authView");
});
