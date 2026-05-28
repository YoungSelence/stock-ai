// Sina Finance real-time API integration
var isOnline=false,quoteCache={},idxCache=null,STOCK_NAMES={},refreshTimer=null;

function sCode(c){return(c.startsWith("60")||c.startsWith("68"))?"sh"+c:"sz"+c}
function loadScript(u){return new Promise(function(r,j){var s=document.createElement("script"),d=false;s.src=u;s.onload=function(){d=true;r()};s.onerror=function(){if(!d)j(Error("fail"))};setTimeout(function(){if(!d){d=true;j(Error("timeout"))}},8e3);document.head.appendChild(s)})}

async function fetchQuotes(codes){
  if(!codes.length)return{};
  try{
    await loadScript("https://hq.sinajs.cn/list="+codes.map(sCode).join(","));
    var r={};
    codes.forEach(function(c){
      var raw=window["hq_str_"+sCode(c)];
      if(raw){var p=raw.split(",");if(p.length>=10){var n=p[0],pr=parseFloat(p[3])||0,pc=parseFloat(p[2])||0;STOCK_NAMES[c]=n;r[c]={code:c,name:n,price:pr,change:pc>0?(pr-pc)/pc*100:0,high:parseFloat(p[4])||0,low:parseFloat(p[5])||0,open:parseFloat(p[1])||0,vol:parseFloat(p[8])||0}}delete window["hq_str_"+sCode(c)]}
    });
    return r;
  }catch(e){console.log(e);return null}
}

async function fetchIndex(){
  try{
    await loadScript("https://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sz399006,s_sh000688");
    var m={"s_sh000001":"SSE","s_sz399001":"SZSE","s_sz399006":"ChiNext","s_sh000688":"STAR50"},r={};
    for(var k in m){var raw=window["hq_str_"+k];if(raw){var p=raw.split(",");if(p.length>=4)r[m[k]]={price:parseFloat(p[1])||0,change:parseFloat(p[3])||0};delete window["hq_str_"+k]}}
    return Object.keys(r).length?r:null;
  }catch(e){return null}
}

var MOCK_IDX={SSE:{price:3215.48,change:0.37},SZSE:{price:10786.32,change:-0.21},ChiNext:{price:2156.78,change:0.85},STAR50:{price:876.54,change:1.23}};

function mockQ(c){var b=c.startsWith("688")?55:c.startsWith("60")?28:c.startsWith("00")?22:c.startsWith("30")?65:45;return{code:c,name:STOCK_NAMES[c]||c,price:+(b+Math.random()*30).toFixed(2),change:+((Math.random()-0.45)*6).toFixed(2),high:b+32,low:b-1,open:b+0.5,vol:~~(Math.random()*5e7)}}
function getQuote(c){return isOnline&&quoteCache[c]?quoteCache[c]:mockQ(c)}
function getIdx(){return isOnline&&idxCache?idxCache:MOCK_IDX}

async function toggleOnline(){
  isOnline=!isOnline;
  var b=document.getElementById("btnMode"),t=document.getElementById("modeTip"),s=document.getElementById("apiStatus");
  if(isOnline){
    b.className="btn-t on";b.innerHTML='<span class="dot on"></span>Online';
    t.textContent="Live (Sina Finance)";s.textContent="Fetching...";
    try{var idx=await fetchIndex();if(idx){idxCache=idx;s.textContent="Updated "+new Date().toLocaleTimeString()}}catch(e){}
    var codes=getPos().map(function(p){return p.code});
    if(codes.length){try{var qs=await fetchQuotes(codes);if(qs)Object.assign(quoteCache,qs)}catch(e){}}
    refreshTimer=setInterval(refreshOnline,1e4);
  }else{
    b.className="btn-t";b.innerHTML='<span class="dot off"></span>Offline';
    t.textContent="Offline (tap to switch)";s.textContent="";
    quoteCache={};idxCache=null;
    if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}
  }
  renderAll()
}

async function refreshOnline(){
  if(!isOnline)return;
  var s=document.getElementById("apiStatus");
  try{var idx=await fetchIndex();if(idx)idxCache=idx}catch(e){}
  var codes=getPos().map(function(p){return p.code});
  if(codes.length){try{var qs=await fetchQuotes(codes);if(qs)Object.assign(quoteCache,qs);s.textContent="Refresh "+new Date().toLocaleTimeString()}catch(e){s.textContent="Error: "+e.message}}
  if(document.getElementById("pg-dash").classList.contains("show"))renderDash()
}
