!function(){"use strict";var e=JSON.parse('{"FP":{"h0":"adRenderFailed","gV":"adRenderSucceeded"},"q_":{"XW":"exception"},"X3":{"Z":"Prebid Request","YC":"Prebid Response","Ks":"Prebid Event"}}');const n=e.X3.Z,t=e.X3.YC,r=e.X3.Ks,s=e.FP.h0,o=e.FP.gV,i=e.q_.XW,a=(()=>{const e={frameBorder:0,scrolling:"no",marginHeight:0,marginWidth:0,topMargin:0,leftMargin:0,allowTransparency:"true"};return(n,t)=>{const r=n.createElement("iframe");return Object.entries(Object.assign({},t,e)).forEach((([e,n])=>r.setAttribute(e,n))),r}})();var c;window.pbRender=(c=window,function({adId:e,pubUrl:d,clickUrl:l}){const g=new URL(d,window.location).origin;function u(n,t,r){const s=new MessageChannel;s.port1.onmessage=f(r),c.parent.postMessage(JSON.stringify(Object.assign({message:n,adId:e},t)),g,[s.port2])}function p(e){u(r,{event:s,info:{reason:e?.reason||i,message:e?.message}}),e?.stack&&console.error(e)}function f(e){return function(){try{return e.apply(this,arguments)}catch(e){p(e)}}}u(n,{options:{clickUrl:l}},(function(n){let s;try{s=JSON.parse(n.data)}catch(e){return}if(s.message===t&&s.adId===e){const e=a(c.document,{width:0,height:0,style:"display: none",srcdoc:`<script>${s.renderer}<\/script>`});e.onload=f((function(){const n=e.contentWindow;n.Promise.resolve(n.render(s,{sendMessage:u,mkFrame:a},c)).then((()=>u(r,{event:o})),p)})),c.document.body.appendChild(e)}}))})}();