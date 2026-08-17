const data = {
  "Motivation": [
    "मुश्किल रास्ते अक्सर खूबसूरत मंज़िल तक ले जाते हैं।",
    "आज की छोटी कोशिश, कल की बड़ी सफलता बन सकती है।",
    "खुद पर विश्वास रखो, रास्ते खुद बनेंगे।",
    "हार सिर्फ तब होती है जब हम कोशिश करना छोड़ देते हैं।"
  ],
  "Love": [
    "सच्चा रिश्ता शब्दों से नहीं, एहसासों से पहचाना जाता है।",
    "जहाँ सम्मान और भरोसा हो, वहीं प्यार खूबसूरत बनता है।",
    "कुछ लोग जिंदगी में आते हैं और जिंदगी खूबसूरत बना देते हैं।"
  ],
  "Sad": [
    "हर मुस्कान के पीछे एक कहानी होती है, हर खामोशी के पीछे एक एहसास।",
    "समय बदलता है, और इंसान भी बहुत कुछ सीख जाता है।",
    "कुछ बातें दिल में रह जाती हैं, क्योंकि हर बात कही नहीं जाती।"
  ],
  "Good Morning": [
    "नई सुबह, नई उम्मीद और एक नई शुरुआत। शुभ प्रभात! 🌅",
    "आज का दिन कल से बेहतर बनाने की कोशिश करें। सुप्रभात! ☀️"
  ],
  "Good Night": [
    "दिन खत्म हुआ, उम्मीद नहीं। कल फिर एक नई शुरुआत होगी। शुभ रात्रि! 🌙",
    "सुकून भरी नींद और खूबसूरत सपनों के साथ शुभ रात्रि। ✨"
  ],
  "Friendship": [
    "अच्छे दोस्त जिंदगी की सबसे खूबसूरत यादों का हिस्सा होते हैं।",
    "सच्ची दोस्ती दूरी से नहीं, दिल से जुड़ी रहती है।"
  ],
  "Spiritual": [
    "सच्ची शांति बाहर नहीं, हमारे विचारों और कर्मों की पवित्रता में मिलती है।",
    "प्रेम, दया, सत्य और सेवा—हर इंसान को बेहतर बनाने वाले रास्ते हैं।",
    "ईश्वर की ओर बढ़ने का एक सुंदर रास्ता अच्छे कर्म और करुणा है।"
  ],
  "Festival": [
    "खुशियाँ बाँटिए, प्यार बढ़ाइए और हर त्योहार को यादगार बनाइए। 🎉",
    "त्योहार का असली आनंद अपनों के साथ खुशियाँ बाँटने में है। ❤️"
  ]
};

const categories = Object.keys(data);
const categorySelect = document.getElementById("categorySelect");
const quoteInput = document.getElementById("quoteInput");
const userName = document.getElementById("userName");
const canvas = document.getElementById("statusCanvas");
const ctx = canvas.getContext("2d");

categories.forEach(cat => {
  categorySelect.add(new Option(cat, cat));
});

const categoryBox = document.getElementById("categories");
categories.forEach((cat, i) => {
  const b = document.createElement("button");
  b.className = "cat" + (i === 0 ? " active" : "");
  b.textContent = cat;
  b.onclick = () => {
    document.querySelectorAll(".cat").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    categorySelect.value = cat;
    setRandomQuote();
  };
  categoryBox.appendChild(b);
});

function setRandomQuote() {
  const cat = categorySelect.value;
  const list = data[cat];
  quoteInput.value = list[Math.floor(Math.random() * list.length)];
  drawStatus();
}

function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

function drawStatus() {
  const w = canvas.width, h = canvas.height;
  const cat = categorySelect.value;
  const quote = quoteInput.value.trim() || "आज एक नई शुरुआत है।";
  const name = userName.value.trim();

  const gradients = {
    Motivation:["#1e1b4b","#7c3aed"],
    Love:["#831843","#ec4899"],
    Sad:["#172554","#334155"],
    "Good Morning":["#7c2d12","#f59e0b"],
    "Good Night":["#111827","#312e81"],
    Friendship:["#134e4a","#0f766e"],
    Spiritual:["#3b0764","#7e22ce"],
    Festival:["#7c2d12","#dc2626"]
  };
  const [a,b] = gradients[cat] || ["#111827","#6d28d9"];
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,a); g.addColorStop(1,b);
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  // soft decorative circles
  ctx.globalAlpha=.13;
  ctx.fillStyle="#fff";
  [[120,170,90],[920,300,140],[150,1630,170],[920,1770,100]].forEach(([x,y,r])=>{
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  ctx.fillStyle="rgba(255,255,255,.18)";
  roundedRect(ctx,70,75,260,62,31);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="700 30px system-ui";ctx.fillText(cat,105,116);

  ctx.textAlign="center";
  ctx.fillStyle="#fff";
  ctx.font="800 62px system-ui";
  ctx.fillText("✨ Daily Status",w/2,250);

  ctx.font="700 46px system-ui";
  wrapText(ctx, quote, w/2, 760, 850, 72);

  ctx.font="500 27px system-ui";
  ctx.fillStyle="rgba(255,255,255,.82)";
  ctx.fillText("Make today beautiful.",w/2,1480);

  if(name){
    ctx.font="700 34px system-ui";
    ctx.fillStyle="#fff";
    ctx.fillText("— " + name,w/2,1590);
  }

  ctx.font="600 25px system-ui";
  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.fillText("Daily Status AI",w/2,1820);
  ctx.textAlign="left";
}

function wrapText(ctx,text,x,y,maxWidth,lineHeight){
  const words=text.split(/\s+/); let line="", lines=[];
  for(const word of words){
    const test=line ? line+" "+word : word;
    if(ctx.measureText(test).width > maxWidth && line){ lines.push(line); line=word; }
    else line=test;
  }
  if(line) lines.push(line);
  const start=y-(lines.length-1)*lineHeight/2;
  lines.forEach((l,i)=>ctx.fillText(l,x,start+i*lineHeight));
}

document.getElementById("randomBtn").onclick=setRandomQuote;
categorySelect.onchange=setRandomQuote;
quoteInput.oninput=drawStatus;
userName.oninput=drawStatus;
document.getElementById("createBtn").onclick=drawStatus;

document.getElementById("downloadBtn").onclick=()=>{
  const a=document.createElement("a");
  a.download="daily-status.png";
  a.href=canvas.toDataURL("image/png");
  a.click();
};

document.getElementById("shareBtn").onclick=async()=>{
  canvas.toBlob(async blob=>{
    const file=new File([blob],"daily-status.png",{type:"image/png"});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({title:"My Daily Status",files:[file]});
    } else {
      alert("Image download करके WhatsApp/Instagram/Facebook पर share करें।");
    }
  });
};

const today = new Date().toISOString().slice(0,10);
const allQuotes = Object.values(data).flat();
document.getElementById("dailyQuote").textContent = allQuotes[
  Math.abs(hash(today)) % allQuotes.length
];

function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h)+s.charCodeAt(i)|0;return h;}

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault(); deferredPrompt=e;
  document.getElementById("installBtn").hidden=false;
});
document.getElementById("installBtn").onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  deferredPrompt=null;
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
setRandomQuote();
