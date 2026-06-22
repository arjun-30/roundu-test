import{r as s,j as e}from"./vendor-query-BKy-jsDF.js";import{u as A,j as G,h as U,n as z,i as V}from"./index-C0VqXlIj.js";import{loadMap as W,getDirections as D}from"./mapProvider-DglzKYOc.js";import{u as J,f as X}from"./vendor-react-Cd7zpMEO.js";import{aE as Z,T as ee,aL as O,a1 as te,d as re,aM as ie,k as ae,a7 as ne,M as oe,ao as se}from"./vendor-utils-7LbUWpcY.js";import"./vendor-ui-Do1l80lB.js";import"./vendor-supabase-CXL1HgsM.js";import"./vendor-charts-CInyygCP.js";const ce=({bookingId:c,customerLocation:a,providerLocation:o,onRouteUpdate:h})=>{const d=s.useRef(null),l=s.useRef(null),t=s.useRef(null),i=s.useRef(null),m=s.useRef(null);return s.useEffect(()=>{if(!d.current)return;let k=!0;const b={lat:a[0],lng:a[1]},g={lat:o[0],lng:o[1]},f={lat:(b.lat+g.lat)/2,lng:(b.lng+g.lng)/2};return W(d.current,f,13).then(j=>{if(!k){j.destroy();return}l.current=j,t.current=j.addMarker({position:b,type:"customer",popup:"Your Location"}),i.current=j.addMarker({position:g,type:"provider",popup:"Provider"}),D(g,b).then(y=>{!k||!l.current||(m.current=l.current.drawRoute(y.coordinates,"#f97316"),h&&h({distanceKm:Number((y.distanceMetres/1e3).toFixed(1)),durationMin:Math.ceil(y.durationSeconds/60)}))}).catch(y=>console.warn("Failed to load initial directions:",y))}).catch(j=>console.error("Failed to load Mapbox map:",j)),()=>{k=!1,t.current&&t.current(),i.current&&i.current(),m.current&&m.current(),l.current&&(l.current.destroy(),l.current=null)}},[]),s.useEffect(()=>{const k=l.current;if(!k)return;const b={lat:a[0],lng:a[1]},g={lat:o[0],lng:o[1]};i.current&&i.current(),i.current=k.addMarker({position:g,type:"provider",popup:"Provider"}),D(g,b).then(f=>{m.current&&m.current(),l.current&&(m.current=l.current.drawRoute(f.coordinates,"#f97316")),h&&h({distanceKm:Number((f.distanceMetres/1e3).toFixed(1)),durationMin:Math.ceil(f.durationSeconds/60)})}).catch(f=>console.warn("Failed to update directions:",f))},[o[0],o[1],a[0],a[1]]),e.jsx("div",{className:"w-full h-full relative",children:e.jsx("div",{ref:d,className:"w-full h-full bg-gray-100"})})},L=[{key:"on_the_way",label:"On the way",icon:"🛵"},{key:"arrived",label:"Arrived",icon:"👤"},{key:"in_progress",label:"On Progress",icon:"🔧"},{key:"completed",label:"Completed",icon:"✓"}],le=["assigned","on_the_way","arrived","in_progress","completed"],de=c=>{const a=c==="payment_pending"?"completed":c,o=le.indexOf(a);return Math.max(o-1,-1)},ve=()=>{var $,R,q;const c=J(),{id:a=""}=X(),{user:o,bookings:h,dispatch:d,currentLocation:l}=A(),t=h.find(r=>r.id===a),[i,m]=s.useState(()=>{if(!t)return;if(t.providerDetails)return t.providerDetails;const r=G(t.providerId);return r||{id:t.providerId,name:"Professional",rating:4.8,reviews:120,pricePerHr:399,experienceYrs:5,avatar:"P",verified:!0,available:!0,serviceId:t.serviceId}}),[k,b]=s.useState((t==null?void 0:t.otp)||"8306"),[g,f]=s.useState(null),[j,y]=s.useState({}),[v,B]=s.useState(null),[T,K]=s.useState((i==null?void 0:i.etaMin)||12),[_,C]=s.useState({text:"",emoji:""}),P=s.useRef(null),[E,I]=s.useState(null);if((A().chatHistories||{})[a],s.useEffect(()=>{t!=null&&t.providerId&&(i!=null&&i.phone||U.get(`/providers/${t.providerId}`).then(r=>{var n,w,u;(n=r.data)!=null&&n.success&&((u=(w=r.data)==null?void 0:w.data)!=null&&u.provider)&&m(r.data.data.provider)}).catch(r=>{console.warn("Could not fetch provider details via api:",r)}))},[t==null?void 0:t.providerId]),s.useEffect(()=>{a&&fetch(`/api/bookings/${a}/otp`).then(r=>r.json()).then(r=>{r!=null&&r.otp&&b(String(r.otp))}).catch(()=>{})},[a]),s.useEffect(()=>{a&&z.emit("join_chat_room",{bookingId:a})},[a]),s.useEffect(()=>{const r=n=>{if(n.bookingId.replace("req-","")!==a&&n.bookingId!==a)return;f(n.status),d({type:"UPDATE_BOOKING_STATUS",bookingId:a,status:n.status});const u=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});y(Y=>({...Y,[n.status]:u})),n.status==="quote_set"&&n.quote?(I({amount:n.quote}),x("💰",`Provider sent a quote: ₹${n.quote}`)):n.status==="on_the_way"?x("🛵","Provider is on the way!"):n.status==="arrived"?x("📍","Provider has arrived!"):n.status==="in_progress"?x("🔧","Service has started!"):n.status==="completed"||n.status==="payment_pending"?x("✅","Service completed! Please complete payment below."):n.status==="paid"&&(x("✅","Payment confirmed! Redirecting to ratings..."),d({type:"PAY_BOOKING",id:a}),setTimeout(()=>c(`/rating/${a}`,{replace:!0}),1500))};return z.on("job_status_updated",r),()=>{z.off("job_status_updated",r)}},[a,d,c]),s.useEffect(()=>{if(!t){const r=setTimeout(()=>{h.find(n=>n.id===a)||c("/home",{replace:!0})},500);return()=>clearTimeout(r)}},[t,h,a,c]),s.useEffect(()=>{if(t&&t.paid&&(t.status==="completed"||t.status==="paid")){x("✅","Payment confirmed! Redirecting to ratings...");const r=setTimeout(()=>{c(`/rating/${t.id}`,{replace:!0})},1500);return()=>clearTimeout(r)}},[t==null?void 0:t.status,t==null?void 0:t.paid,c]),!t)return null;s.useEffect(()=>{const r=setInterval(()=>K(n=>Math.max(0,n-1)),6e4);return()=>clearInterval(r)},[]);const x=(r,n)=>{C({text:n,emoji:r}),P.current&&clearTimeout(P.current),P.current=setTimeout(()=>C({text:"",emoji:""}),4e3)},F=()=>{const r=(i==null?void 0:i.phone)||"+919999999999";window.open(`tel:${r}`,"_self")},Q=()=>{d({type:"UPDATE_BOOKING_STATUS",bookingId:a,status:"in_progress"}),z.emit("update_job_status",{bookingId:a,status:"in_progress"}),I(null),x("✅","Quote approved!")},H=()=>{I(null),x("❌","Quote rejected.")},p=g||t.status,M=de(p),N=V(t.serviceId);return e.jsxs("div",{className:"tracking-root",children:[e.jsxs("div",{className:"tracking-header",children:[e.jsx("button",{className:"tracking-header-back",onClick:()=>c("/home"),children:e.jsx(Z,{size:20})}),e.jsxs("div",{className:"tracking-header-provider",children:[e.jsx("div",{className:"tracking-provider-avatar",children:o!=null&&o.profilePicture||o!=null&&o.avatar_url?e.jsx("img",{src:o.profilePicture||o.avatar_url,alt:o==null?void 0:o.name}):e.jsx("span",{children:(($=o==null?void 0:o.name)==null?void 0:$[0])||"C"})}),e.jsxs("div",{children:[e.jsx("p",{className:"tracking-provider-name",children:(o==null?void 0:o.name)||"Customer"}),e.jsx("p",{className:"tracking-provider-role",children:"Customer"})]})]})]}),e.jsxs("div",{className:"tracking-safety-banner",children:[e.jsx(ee,{size:14,className:"tracking-safety-icon"}),e.jsxs("span",{children:[e.jsx("strong",{children:"For your safety:"})," Do not negotiate prices or share payment details outside the app."]})]}),e.jsxs("div",{className:"tracking-map",children:[e.jsx(ce,{bookingId:a,customerLocation:t.lat&&t.lng?[Number(t.lat),Number(t.lng)]:l?[l.lat,l.lng]:[12.9716,77.5946],providerLocation:t.providerLat&&t.providerLng?[Number(t.providerLat),Number(t.providerLng)]:t.lat&&t.lng?[Number(t.lat)+.003,Number(t.lng)+.003]:l?[l.lat+.003,l.lng+.003]:[12.9766,77.5996],onRouteUpdate:r=>B(r)}),e.jsxs("div",{className:"tracking-eta-badge",children:[e.jsx("span",{children:"⏱"}),e.jsxs("div",{children:[e.jsx("span",{className:"tracking-eta-num",children:v?`${v.durationMin} min`:`${T} min`}),e.jsxs("span",{className:"tracking-eta-label",children:["Away ",v?`(${v.distanceKm} km)`:""]})]})]})]}),e.jsxs("div",{className:"tracking-sheet",children:[e.jsx("div",{className:"tracking-sheet-handle"}),_.text&&e.jsxs("div",{className:"tracking-toast",children:[e.jsx("span",{children:_.emoji})," ",_.text]}),E&&e.jsxs("div",{className:"tracking-quote-card",children:[e.jsxs("p",{className:"tracking-quote-title",children:[e.jsx(O,{size:14})," Provider Sent a Quote"]}),e.jsxs("p",{className:"tracking-quote-amount",children:["₹",E.amount]}),e.jsxs("div",{className:"tracking-quote-actions",children:[e.jsx("button",{className:"tracking-quote-approve",onClick:Q,children:"✓ Approve"}),e.jsx("button",{className:"tracking-quote-reject",onClick:H,children:"✕ Reject"})]})]}),e.jsxs("div",{className:"tracking-status-section",children:[e.jsx("h2",{className:"tracking-status-heading",children:p==="on_the_way"?"Provider is on the way":p==="arrived"?"Provider has arrived":p==="in_progress"?"Service in progress":p==="completed"||p==="payment_pending"?"Service completed":"Provider assigned"}),(p==="on_the_way"||p==="arrived")&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"tracking-otp-label",children:"Please show this OTP to your provider"}),e.jsx("div",{className:"tracking-otp-row",children:k.split("").map((r,n)=>e.jsx("span",{className:"tracking-otp-digit",children:r},n))})]})]}),e.jsxs("div",{className:"tracking-provider-row",children:[e.jsx("div",{className:"tracking-provider-row-avatar",children:typeof(i==null?void 0:i.avatar)=="string"&&i.avatar.startsWith("http")?e.jsx("img",{src:i.avatar,alt:i==null?void 0:i.name}):e.jsx("span",{children:((R=i==null?void 0:i.name)==null?void 0:R[0])||"P"})}),e.jsxs("div",{className:"tracking-provider-row-info",children:[e.jsx("p",{className:"tracking-provider-row-name",children:(i==null?void 0:i.name)||"Provider"}),e.jsx("p",{className:"tracking-provider-row-role",children:(N==null?void 0:N.label)||"Service"}),e.jsxs("p",{className:"tracking-provider-row-rating",children:["⭐ ",((q=i==null?void 0:i.rating)==null?void 0:q.toFixed(1))||"4.8"]})]}),e.jsx("div",{className:"tracking-provider-row-btns",children:e.jsx("button",{className:"tracking-icon-btn",onClick:r=>{r.stopPropagation(),F()},children:e.jsx(te,{size:18})})})]}),e.jsx("div",{className:"tracking-divider"}),e.jsx("div",{className:"tracking-steps",children:L.map((r,n)=>{const w=M>n,u=M===n;return e.jsxs("div",{className:`tracking-step ${u?"tracking-step--active":w?"tracking-step--done":""}`,children:[e.jsx("div",{className:`tracking-step-icon ${u?"tracking-step-icon--active":w?"tracking-step-icon--done":""}`,children:r.icon}),e.jsx("p",{className:`tracking-step-label ${u?"tracking-step-label--active":""}`,children:r.label}),n<L.length-1&&e.jsx("div",{className:`tracking-step-connector ${w||u?"tracking-step-connector--filled":""}`})]},r.key)})}),e.jsxs("p",{className:"tracking-eta-text",children:["Expected arrival in ",e.jsx("strong",{style:{color:"#f97316"},children:v?`${v.durationMin} min`:`${T} min`}),v&&` (${v.distanceKm} km)`]}),e.jsx("div",{className:"tracking-divider"}),e.jsxs("div",{className:"tracking-details",children:[e.jsx(S,{icon:e.jsx(re,{size:15}),label:"Service",value:(N==null?void 0:N.label)||t.serviceId||"Service"}),e.jsx(S,{icon:e.jsx(ie,{size:15}),label:"Booking ID",value:`KA${String(t.id).slice(-6).toUpperCase()}`}),e.jsx(S,{icon:e.jsx(ae,{size:15}),label:"Scheduled Time",value:`${t.date||"Today"}, ${t.time||"Now"}`}),e.jsx(S,{icon:e.jsx(O,{size:15}),label:"Price",value:t.price?`₹${t.price}`:"After inspection"}),e.jsx(S,{icon:e.jsx(ne,{size:15}),label:"Payment Mode",value:"Cash after service"})]}),e.jsx("div",{className:"tracking-divider"}),e.jsxs("button",{className:"tracking-chat-btn",onClick:()=>c(`/chat/${t.id}`),children:[e.jsx(oe,{size:17})," Start Conversation"]}),(p==="completed"||p==="payment_pending")&&e.jsx("button",{className:"tracking-pay-btn",onClick:()=>{t.paid?c(`/rating/${t.id}`):(d({type:"SELECT_PROVIDER",id:t.providerId}),d({type:"SELECT_SERVICE",id:t.serviceId}),c("/booking/payment",{state:{bookingId:t.id}}))},children:t.paid?"Rate Your Experience":"Complete & Pay"})]}),e.jsx("style",{children:`
        /* ── Root ── */
        .tracking-root {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
          font-family: 'Inter', sans-serif;
          max-width: 430px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .tracking-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 12px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
        }
        .tracking-header-back {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #f5f5f5; border: none; cursor: pointer; flex-shrink: 0;
          color: #111;
        }
        .tracking-header-provider {
          display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
        }
        .tracking-provider-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: #1e293b; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 17px; flex-shrink: 0; overflow: hidden;
        }
        .tracking-provider-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tracking-provider-name { font-weight: 700; font-size: 15px; color: #111; line-height: 1.2; }
        .tracking-provider-role { font-size: 12px; color: #f97316; font-weight: 600; }
        .tracking-header-actions {
          display: flex; gap: 8px; align-items: center;
        }
        .tracking-header-actions button {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer;
        }

        /* ── Safety Banner ── */
        .tracking-safety-banner {
          background: #fffbeb; border-bottom: 1px solid #fde68a;
          padding: 8px 14px; display: flex; align-items: flex-start; gap: 8px;
          font-size: 12px; color: #92400e;
        }
        .tracking-safety-icon { color: #f59e0b; margin-top: 1px; flex-shrink: 0; }

        /* ── Map ── */
        .tracking-map {
          height: 220px; position: relative; background: #e2e8f0;
        }
        .tracking-map > div:first-child { height: 100%; }
        .tracking-eta-badge {
          position: absolute; bottom: 14px; right: 14px;
          background: #fff; border-radius: 12px; padding: 6px 12px;
          display: flex; align-items: center; gap: 6px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          font-size: 12px; color: #374151;
          z-index: 10;
        }
        .tracking-eta-num { font-weight: 700; font-size: 15px; color: #111; display: block; }
        .tracking-eta-label { font-size: 11px; color: #6b7280; display: block; }

        /* ── Bottom Sheet ── */
        .tracking-sheet {
          flex: 1; background: #fff;
          border-radius: 22px 22px 0 0; margin-top: -14px;
          padding: 8px 20px 40px; overflow-y: auto;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.07);
        }
        .tracking-sheet-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: #d1d5db; margin: 4px auto 16px;
        }

        /* ── Toast ── */
        .tracking-toast {
          background: #1e293b; color: #fff; border-radius: 12px;
          padding: 10px 14px; font-size: 13px; font-weight: 600;
          margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
          animation: slideDown 0.3s ease;
        }

        /* ── Quote card ── */
        .tracking-quote-card {
          background: #fffbeb; border: 2px solid #fcd34d; border-radius: 16px;
          padding: 16px; margin-bottom: 14px;
        }
        .tracking-quote-title {
          font-size: 13px; font-weight: 700; color: #92400e;
          display: flex; align-items: center; gap: 4px; margin-bottom: 6px;
        }
        .tracking-quote-amount { font-size: 28px; font-weight: 800; color: #b45309; margin-bottom: 12px; }
        .tracking-quote-actions { display: flex; gap: 10px; }
        .tracking-quote-approve {
          flex: 1; padding: 10px; border-radius: 10px;
          background: #22c55e; color: #fff; font-weight: 700; border: none; cursor: pointer; font-size: 14px;
        }
        .tracking-quote-reject {
          flex: 1; padding: 10px; border-radius: 10px;
          background: #fee2e2; color: #dc2626; font-weight: 700;
          border: 1px solid #fecaca; cursor: pointer; font-size: 14px;
        }

        /* ── Status heading + OTP ── */
        .tracking-status-section { text-align: center; margin-bottom: 16px; }
        .tracking-status-heading { font-size: 17px; font-weight: 800; color: #111; margin-bottom: 4px; }
        .tracking-otp-label { font-size: 12px; color: #6b7280; margin-bottom: 10px; }
        .tracking-otp-row { display: flex; justify-content: center; gap: 10px; }
        .tracking-otp-digit {
          width: 48px; height: 56px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 800; color: #111; background: #fff;
        }

        /* ── Provider info row ── */
        .tracking-provider-row {
          display: flex; align-items: center; gap: 12px; width: 100%;
          background: none; border: none; padding: 4px 0; text-align: left;
          margin-bottom: 4px;
        }
        .tracking-provider-row-avatar {
          width: 50px; height: 50px; border-radius: 50%; overflow: hidden;
          background: #1e293b; color: #fff; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0;
        }
        .tracking-provider-row-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tracking-provider-row-info { flex: 1; min-width: 0; }
        .tracking-provider-row-name { font-size: 15px; font-weight: 700; color: #111; }
        .tracking-provider-row-role { font-size: 12px; color: #6b7280; }
        .tracking-provider-row-rating { font-size: 13px; color: #374151; margin-top: 2px; }
        .tracking-provider-row-btns { display: flex; gap: 8px; }
        .tracking-icon-btn {
          width: 38px; height: 38px; border-radius: 50%;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer;
        }

        /* ── Divider ── */
        .tracking-divider { height: 1px; background: #f3f4f6; margin: 14px 0; }

        /* ── Horizontal steps ── */
        .tracking-steps {
          display: flex; align-items: flex-start; justify-content: space-between;
          position: relative; margin-bottom: 8px;
        }
        .tracking-step {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; flex: 1; position: relative;
        }
        .tracking-step-icon {
          width: 42px; height: 42px; border-radius: 50%;
          background: #f3f4f6; display: flex; align-items: center; justify-content: center;
          font-size: 18px; border: 2px solid #e5e7eb; z-index: 1; position: relative;
        }
        .tracking-step-icon--active {
          background: #fff7ed; border-color: #f97316; color: #f97316;
        }
        .tracking-step-icon--done {
          background: #fff7ed; border-color: #f97316;
        }
        .tracking-step-label { font-size: 10px; color: #9ca3af; text-align: center; font-weight: 500; }
        .tracking-step-label--active { color: #f97316; font-weight: 700; }
        .tracking-step-connector {
          position: absolute; top: 20px; left: 50%; width: 100%;
          height: 2px; background: #e5e7eb; z-index: 0;
        }
        .tracking-step-connector--filled { background: #f97316; }
        .tracking-eta-text { text-align: center; font-size: 12px; color: #6b7280; margin-top: 4px; }

        /* ── Booking details ── */
        .tracking-details { display: flex; flex-direction: column; }
        .tracking-detail-row {
          display: flex; align-items: center; padding: 11px 0;
          border-bottom: 1px solid #f3f4f6; gap: 10px;
        }
        .tracking-detail-row:last-child { border-bottom: none; }
        .tracking-detail-icon { color: #6b7280; flex-shrink: 0; }
        .tracking-detail-label { font-size: 13px; color: #374151; flex: 1; }
        .tracking-detail-value { font-size: 13px; font-weight: 600; color: #111; }
        .tracking-detail-arrow { color: #9ca3af; }

        /* ── Start conversation button ── */
        .tracking-chat-btn {
          width: 100%; padding: 14px; border-radius: 14px;
          border: 1.5px solid #e5e7eb; background: #fff;
          font-size: 14px; font-weight: 700; color: #111;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; margin-bottom: 4px;
        }
        .tracking-chat-btn:active { background: #f9fafb; }

        /* ── Chat panel ── */
        .tracking-chat-panel {
          border: 1.5px solid #e5e7eb; border-radius: 16px;
          overflow: hidden; margin-top: 8px; background: #fff;
        }
        .tracking-chat-date {
          text-align: center; font-size: 11px; color: #9ca3af;
          padding: 10px 0 4px; font-weight: 500;
        }
        .tracking-chat-messages {
          padding: 8px 12px; max-height: 240px; overflow-y: auto;
          display: flex; flex-direction: column; gap: 12px;
        }
        .tracking-chat-msg { display: flex; gap: 8px; align-items: flex-end; }
        .tracking-chat-msg--customer { flex-direction: row-reverse; }
        .tracking-chat-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: #1e293b; color: #fff; display: flex;
          align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        .tracking-chat-bubble {
          background: #f3f4f6; padding: 10px 13px; border-radius: 16px 16px 16px 4px;
          font-size: 13px; color: #111; max-width: 220px;
        }
        .tracking-chat-bubble--customer {
          background: #e0e7ff; border-radius: 16px 16px 4px 16px;
        }
        .tracking-chat-time { font-size: 10px; color: #9ca3af; margin-top: 3px; }
        .tracking-chat-time--right { text-align: right; }
        .tracking-chat-input-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-top: 1px solid #f3f4f6;
        }
        .tracking-chat-mic {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer; flex-shrink: 0;
        }
        .tracking-chat-input {
          flex: 1; border: 1.5px solid #e5e7eb; border-radius: 20px;
          padding: 8px 14px; font-size: 13px; color: #111;
          outline: none; background: #f9fafb;
        }
        .tracking-chat-input::placeholder { color: #9ca3af; }
        .tracking-chat-send {
          width: 36px; height: 36px; border-radius: 50%;
          background: #1e293b; color: #fff; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
        }

        /* ── Pay button ── */
        .tracking-pay-btn {
          width: 100%; padding: 15px; margin-top: 14px; border-radius: 14px;
          background: #1e293b; color: #fff; font-weight: 700; font-size: 15px;
          border: none; cursor: pointer;
        }
        .tracking-pay-btn:active { opacity: 0.9; }

        /* ── Animations ── */
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `})]})},S=({icon:c,label:a,value:o})=>e.jsxs("div",{className:"tracking-detail-row",children:[e.jsx("span",{className:"tracking-detail-icon",children:c}),e.jsx("span",{className:"tracking-detail-label",children:a}),e.jsx("span",{className:"tracking-detail-value",children:o}),e.jsx(se,{size:14,className:"tracking-detail-arrow"})]});export{ve as default};
