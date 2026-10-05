const $=id=>document.getElementById(id);
let mode="login", catalog={}, currentQuestions=[];

function toast(msg){const t=$("toast");t.textContent=msg;t.className="show";setTimeout(()=>t.className="",2200)}
function showApp(name){
  $("auth").classList.add("hidden"); $("app").classList.remove("hidden"); $("hello").textContent="Hi, "+name;
  loadCatalog(); analytics();
}
async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||"Something went wrong");return d}

$("loginTab").onclick=()=>{mode="login";$("loginTab").classList.add("active");$("registerTab").classList.remove("active");$("nameWrap").classList.add("hidden");$("authBtn").textContent="Sign in";$("authMsg").textContent=""};
$("registerTab").onclick=()=>{mode="register";$("registerTab").classList.add("active");$("loginTab").classList.remove("active");$("nameWrap").classList.remove("hidden");$("authBtn").textContent="Create account";$("authMsg").textContent=""};

$("authForm").onsubmit=async e=>{
 e.preventDefault(); $("authMsg").textContent="";
 try{
  const d=await api(mode==="login"?"/api/login":"/api/register",{method:"POST",body:JSON.stringify({name:$("name").value,email:$("email").value,password:$("password").value})});
  showApp(d.name); toast(mode==="login"?"Welcome back":"Account created");
 }catch(err){$("authMsg").textContent=err.message}
};

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>page(b.dataset.page));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>page(b.dataset.go));
function page(p){
 document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
 $(p).classList.remove("hidden");
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 if(p==="analytics"||p==="dashboard")analytics();
}
$("logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.reload()};

async function loadCatalog(){
 const d=await api("/api/catalog"); catalog=d.catalog;
 const subjects=["All",...Object.keys(catalog)];
 $("subject").innerHTML=subjects.map(x=>`<option>${x}</option>`).join("");
 updateTopics();
}
$("subject").onchange=updateTopics;
function updateTopics(){
 const s=$("subject").value;
 const topics=s==="All"?["All"]:["All",...(catalog[s]||[])];
 $("topic").innerHTML=topics.map(x=>`<option>${x}</option>`).join("");
}

$("generate").onclick=generateQuiz;
async function generateQuiz(){
 const qbox=$("quiz"); qbox.innerHTML="<div class='card'>Loading questions…</div>";
 try{
  const d=await api(`/api/questions?subject=${encodeURIComponent($("subject").value)}&topic=${encodeURIComponent($("topic").value)}&difficulty=${encodeURIComponent($("difficulty").value)}&count=${$("count").value}`);
  currentQuestions=d.questions;
  if(!currentQuestions.length){qbox.innerHTML="<div class='card'>No questions available for this selection.</div>";return}
  qbox.innerHTML=`
    <div class="submitbar"><span>${currentQuestions.length} questions ready · write your answers, then check them together.</span><button class="primary" id="submitTop">Submit & Check Answers</button></div>
    ${currentQuestions.map((q,i)=>`
      <article class="question" data-id="${q.id}">
        <div class="qtop"><span>Question ${i+1}</span><span>${q.subject} · ${q.topic} · ${q.difficulty}</span></div>
        <h3>${escapeHtml(q.question)}</h3>
        <textarea class="answer" placeholder="Write your answer here…"></textarea>
        <div class="feedback hidden" id="fb-${q.id}"></div>
      </article>`).join("")}
    <div class="submitbar"><span>Ready to see your results?</span><button class="primary" id="submitBottom">Submit & Check All Answers</button></div>`;
  $("submitTop").onclick=submitAll; $("submitBottom").onclick=submitAll;
  window.scrollTo({top:0,behavior:"smooth"});
 }catch(err){qbox.innerHTML=`<div class="card error">${escapeHtml(err.message)}</div>`}
}
async function submitAll(){
 if(!currentQuestions.length)return;
 const answers=currentQuestions.map(q=>({id:q.id,answer:document.querySelector(`[data-id="${q.id}"] .answer`).value}));
 try{
  const d=await api("/api/evaluate-batch",{method:"POST",body:JSON.stringify({answers})});
  d.results.forEach(r=>{
   const el=$("fb-"+r.id); el.classList.remove("hidden");
   el.innerHTML=`<div class="score">${r.score}/10 · ${r.level}</div><strong>Feedback</strong><div>${escapeHtml(r.feedback)}</div><strong>Next step</strong><div>${escapeHtml(r.next_step)}</div><details><summary>View answer</summary><p>${escapeHtml(r.model_answer)}</p></details>`;
  });
  document.querySelectorAll(".submitbar").forEach(x=>x.insertAdjacentHTML("afterend",""));
  const old=document.querySelector(".result-banner"); if(old)old.remove();
  const banner=document.createElement("div");banner.className="result-banner";
  banner.innerHTML=`<b>Session complete — ${d.average}/10</b><br>${d.average>=8?"Excellent work. Keep challenging yourself.":d.average>=6?"Good progress. Review the weaker answers and try again.":"Use the answers to revise the core concepts, then repeat the set."}`;
  $("quiz").prepend(banner);
  $("submitTop").disabled=true;
  toast("Answers checked successfully");
  analytics();
 }catch(err){toast(err.message)}
}

async function analytics(){
 try{
  const d=await api("/api/analytics");
  $("sAttempts").textContent=d.attempts.length;$("sAverage").textContent=Number(d.average).toFixed(1);$("sBest").textContent=Number(d.best).toFixed(1);
  if(d.attempts.length){$("insightTitle").textContent=d.average>=8?"You’re building strong mastery.":d.average>=6?"You’re making steady progress.":"Your next gains are in revision.";
   $("insightText").textContent=`Your current average is ${d.average}/10. Focus on the topics with the lowest scores and practise them again.`}
  drawLine("dashChart",d.attempts.slice().reverse().slice(-8).map(x=>x.score));
  drawLine("scoreChart",d.attempts.slice().reverse().slice(-12).map(x=>x.score));
  drawBars("masteryChart",d.mastery.slice(0,8).map(x=>({label:x.topic,value:x.avg_score})));
  $("history").innerHTML=d.attempts.length?d.attempts.slice(0,12).map(x=>`<div class="history-row"><span>${escapeHtml(x.subject)} / ${escapeHtml(x.topic)}</span><span>${escapeHtml(x.difficulty)}</span><b>${x.score}/10</b><span>${escapeHtml(x.level)}</span></div>`).join(""):"<p class='muted'>No attempts yet. Complete a practice set to see your history.</p>";
 }catch{}
}
function setupCanvas(c){
 if(!c)return null; const ratio=window.devicePixelRatio||1,w=c.clientWidth||500,h=230;c.width=w*ratio;c.height=h*ratio;const x=c.getContext("2d");x.scale(ratio,ratio);return{x,w,h}
}
function drawLine(id,values){
 const c=$(id), z=setupCanvas(c);if(!z)return;const {x,w,h}=z;x.clearRect(0,0,w,h);
 x.strokeStyle="#e6dfd6";x.lineWidth=1;for(let i=1;i<5;i++){let y=i*h/5;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}
 if(!values.length){x.fillStyle="#9a9288";x.font="14px system-ui";x.fillText("Complete a practice session to see your trend.",20,h/2);return}
 const max=10,min=0; x.strokeStyle="#8b7355";x.lineWidth=3;x.beginPath();
 values.forEach((v,i)=>{const px=20+(w-40)*(values.length===1?.5:i/(values.length-1));const py=h-25-(h-50)*(v-min)/(max-min);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
 values.forEach((v,i)=>{const px=20+(w-40)*(values.length===1?.5:i/(values.length-1));const py=h-25-(h-50)*v/10;x.fillStyle="#29251f";x.beginPath();x.arc(px,py,4,0,Math.PI*2);x.fill()});
}
function drawBars(id,items){
 const c=$(id),z=setupCanvas(c);if(!z)return;const {x,w,h}=z;x.clearRect(0,0,w,h);
 if(!items.length){x.fillStyle="#9a9288";x.font="14px system-ui";x.fillText("No topic data yet.",20,h/2);return}
 const gap=12,bw=Math.max(18,(w-gap*(items.length+1))/items.length);items.forEach((it,i)=>{const bh=(h-55)*it.value/10;const px=gap+i*(bw+gap);const py=h-35-bh;x.fillStyle="#8b7355";x.fillRect(px,py,bw,bh);x.fillStyle="#5f584f";x.font="11px system-ui";x.save();x.translate(px+bw/2,h-8);x.rotate(-.45);x.textAlign="right";x.fillText(it.label,0,0);x.restore()});
}
window.addEventListener("resize",()=>{if(!$("app").classList.contains("hidden"))analytics()});
$("chatForm").onsubmit=async e=>{e.preventDefault();const input=$("chatInput"),msg=input.value.trim();if(!msg)return;addBubble(msg,"user");input.value="";try{const d=await api("/api/chat",{method:"POST",body:JSON.stringify({message:msg})});addBubble(d.response,"bot")}catch(err){addBubble(err.message,"bot")}};
function addBubble(t,c){const d=document.createElement("div");d.className="bubble "+c;d.textContent=t;$("messages").appendChild(d);$("messages").scrollTop=$("messages").scrollHeight}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

(async()=>{try{const d=await api("/api/me");if(d.logged_in)showApp(d.name)}catch{}})();
