(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function s(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function r(o){if(o.ep)return;o.ep=!0;const n=s(o);fetch(o.href,n)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const L=globalThis,G=L.ShadowRoot&&(L.ShadyCSS===void 0||L.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Y=Symbol(),at=new WeakMap;let bt=class{constructor(t,s,r){if(this._$cssResult$=!0,r!==Y)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=s}get styleSheet(){let t=this.o;const s=this.t;if(G&&t===void 0){const r=s!==void 0&&s.length===1;r&&(t=at.get(s)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&at.set(s,t))}return t}toString(){return this.cssText}};const St=e=>new bt(typeof e=="string"?e:e+"",void 0,Y),P=(e,...t)=>{const s=e.length===1?e[0]:t.reduce((r,o,n)=>r+(i=>{if(i._$cssResult$===!0)return i.cssText;if(typeof i=="number")return i;throw Error("Value passed to 'css' function must be a 'css' function result: "+i+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+e[n+1],e[0]);return new bt(s,e,Y)},Et=(e,t)=>{if(G)e.adoptedStyleSheets=t.map(s=>s instanceof CSSStyleSheet?s:s.styleSheet);else for(const s of t){const r=document.createElement("style"),o=L.litNonce;o!==void 0&&r.setAttribute("nonce",o),r.textContent=s.cssText,e.appendChild(r)}},lt=G?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let s="";for(const r of t.cssRules)s+=r.cssText;return St(s)})(e):e;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Ct,defineProperty:Pt,getOwnPropertyDescriptor:Ot,getOwnPropertyNames:Tt,getOwnPropertySymbols:Mt,getPrototypeOf:Ut}=Object,W=globalThis,dt=W.trustedTypes,Ht=dt?dt.emptyScript:"",Nt=W.reactiveElementPolyfillSupport,T=(e,t)=>e,j={toAttribute(e,t){switch(t){case Boolean:e=e?Ht:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let s=e;switch(t){case Boolean:s=e!==null;break;case Number:s=e===null?null:Number(e);break;case Object:case Array:try{s=JSON.parse(e)}catch{s=null}}return s}},X=(e,t)=>!Ct(e,t),ct={attribute:!0,type:String,converter:j,reflect:!1,useDefault:!1,hasChanged:X};Symbol.metadata??=Symbol("metadata"),W.litPropertyMetadata??=new WeakMap;let A=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=ct){if(s.state&&(s.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=!0),this.elementProperties.set(t,s),!s.noAccessor){const r=Symbol(),o=this.getPropertyDescriptor(t,r,s);o!==void 0&&Pt(this.prototype,t,o)}}static getPropertyDescriptor(t,s,r){const{get:o,set:n}=Ot(this.prototype,t)??{get(){return this[s]},set(i){this[s]=i}};return{get:o,set(i){const d=o?.call(this);n?.call(this,i),this.requestUpdate(t,d,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??ct}static _$Ei(){if(this.hasOwnProperty(T("elementProperties")))return;const t=Ut(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(T("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(T("properties"))){const s=this.properties,r=[...Tt(s),...Mt(s)];for(const o of r)this.createProperty(o,s[o])}const t=this[Symbol.metadata];if(t!==null){const s=litPropertyMetadata.get(t);if(s!==void 0)for(const[r,o]of s)this.elementProperties.set(r,o)}this._$Eh=new Map;for(const[s,r]of this.elementProperties){const o=this._$Eu(s,r);o!==void 0&&this._$Eh.set(o,s)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const s=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const o of r)s.unshift(lt(o))}else t!==void 0&&s.push(lt(t));return s}static _$Eu(t,s){const r=s.attribute;return r===!1?void 0:typeof r=="string"?r:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const r of s.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Et(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,s,r){this._$AK(t,r)}_$ET(t,s){const r=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,r);if(o!==void 0&&r.reflect===!0){const n=(r.converter?.toAttribute!==void 0?r.converter:j).toAttribute(s,r.type);this._$Em=t,n==null?this.removeAttribute(o):this.setAttribute(o,n),this._$Em=null}}_$AK(t,s){const r=this.constructor,o=r._$Eh.get(t);if(o!==void 0&&this._$Em!==o){const n=r.getPropertyOptions(o),i=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:j;this._$Em=o;const d=i.fromAttribute(s,n.type);this[o]=d??this._$Ej?.get(o)??d,this._$Em=null}}requestUpdate(t,s,r,o=!1,n){if(t!==void 0){const i=this.constructor;if(o===!1&&(n=this[t]),r??=i.getPropertyOptions(t),!((r.hasChanged??X)(n,s)||r.useDefault&&r.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,r))))return;this.C(t,s,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,s,{useDefault:r,reflect:o,wrapped:n},i){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,i??s??this[t]),n!==!0||i!==void 0)||(this._$AL.has(t)||(this.hasUpdated||r||(s=void 0),this._$AL.set(t,s)),o===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(s){Promise.reject(s)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[o,n]of this._$Ep)this[o]=n;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[o,n]of r){const{wrapped:i}=n,d=this[o];i!==!0||this._$AL.has(o)||d===void 0||this.C(o,void 0,n,d)}}let t=!1;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(s)):this._$EM()}catch(r){throw t=!1,this._$EM(),r}t&&this._$AE(s)}willUpdate(t){}_$AE(t){this._$EO?.forEach(s=>s.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(s=>this._$ET(s,this[s])),this._$EM()}updated(t){}firstUpdated(t){}};A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[T("elementProperties")]=new Map,A[T("finalized")]=new Map,Nt?.({ReactiveElement:A}),(W.reactiveElementVersions??=[]).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const tt=globalThis,pt=e=>e,F=tt.trustedTypes,ht=F?F.createPolicy("lit-html",{createHTML:e=>e}):void 0,_t="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,yt="?"+$,Rt=`<${yt}>`,w=document,M=()=>w.createComment(""),U=e=>e===null||typeof e!="object"&&typeof e!="function",et=Array.isArray,zt=e=>et(e)||typeof e?.[Symbol.iterator]=="function",Q=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ut=/-->/g,ft=/>/g,b=RegExp(`>|${Q}(?:([^\\s"'>=/]+)(${Q}*=${Q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),vt=/'/g,gt=/"/g,wt=/^(?:script|style|textarea|title)$/i,Dt=e=>(t,...s)=>({_$litType$:e,strings:t,values:s}),a=Dt(1),k=Symbol.for("lit-noChange"),h=Symbol.for("lit-nothing"),mt=new WeakMap,_=w.createTreeWalker(w,129);function xt(e,t){if(!et(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return ht!==void 0?ht.createHTML(t):t}const It=(e,t)=>{const s=e.length-1,r=[];let o,n=t===2?"<svg>":t===3?"<math>":"",i=O;for(let d=0;d<s;d++){const l=e[d];let p,u,c=-1,g=0;for(;g<l.length&&(i.lastIndex=g,u=i.exec(l),u!==null);)g=i.lastIndex,i===O?u[1]==="!--"?i=ut:u[1]!==void 0?i=ft:u[2]!==void 0?(wt.test(u[2])&&(o=RegExp("</"+u[2],"g")),i=b):u[3]!==void 0&&(i=b):i===b?u[0]===">"?(i=o??O,c=-1):u[1]===void 0?c=-2:(c=i.lastIndex-u[2].length,p=u[1],i=u[3]===void 0?b:u[3]==='"'?gt:vt):i===gt||i===vt?i=b:i===ut||i===ft?i=O:(i=b,o=void 0);const m=i===b&&e[d+1].startsWith("/>")?" ":"";n+=i===O?l+Rt:c>=0?(r.push(p),l.slice(0,c)+_t+l.slice(c)+$+m):l+$+(c===-2?d:m)}return[xt(e,n+(e[s]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),r]};class H{constructor({strings:t,_$litType$:s},r){let o;this.parts=[];let n=0,i=0;const d=t.length-1,l=this.parts,[p,u]=It(t,s);if(this.el=H.createElement(p,r),_.currentNode=this.el.content,s===2||s===3){const c=this.el.content.firstChild;c.replaceWith(...c.childNodes)}for(;(o=_.nextNode())!==null&&l.length<d;){if(o.nodeType===1){if(o.hasAttributes())for(const c of o.getAttributeNames())if(c.endsWith(_t)){const g=u[i++],m=o.getAttribute(c).split($),I=/([.?@])?(.*)/.exec(g);l.push({type:1,index:n,name:I[2],strings:m,ctor:I[1]==="."?jt:I[1]==="?"?Ft:I[1]==="@"?qt:V}),o.removeAttribute(c)}else c.startsWith($)&&(l.push({type:6,index:n}),o.removeAttribute(c));if(wt.test(o.tagName)){const c=o.textContent.split($),g=c.length-1;if(g>0){o.textContent=F?F.emptyScript:"";for(let m=0;m<g;m++)o.append(c[m],M()),_.nextNode(),l.push({type:2,index:++n});o.append(c[g],M())}}}else if(o.nodeType===8)if(o.data===yt)l.push({type:2,index:n});else{let c=-1;for(;(c=o.data.indexOf($,c+1))!==-1;)l.push({type:7,index:n}),c+=$.length-1}n++}}static createElement(t,s){const r=w.createElement("template");return r.innerHTML=t,r}}function S(e,t,s=e,r){if(t===k)return t;let o=r!==void 0?s._$Co?.[r]:s._$Cl;const n=U(t)?void 0:t._$litDirective$;return o?.constructor!==n&&(o?._$AO?.(!1),n===void 0?o=void 0:(o=new n(e),o._$AT(e,s,r)),r!==void 0?(s._$Co??=[])[r]=o:s._$Cl=o),o!==void 0&&(t=S(e,o._$AS(e,t.values),o,r)),t}class Lt{constructor(t,s){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=s}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:s},parts:r}=this._$AD,o=(t?.creationScope??w).importNode(s,!0);_.currentNode=o;let n=_.nextNode(),i=0,d=0,l=r[0];for(;l!==void 0;){if(i===l.index){let p;l.type===2?p=new R(n,n.nextSibling,this,t):l.type===1?p=new l.ctor(n,l.name,l.strings,this,t):l.type===6&&(p=new Jt(n,this,t)),this._$AV.push(p),l=r[++d]}i!==l?.index&&(n=_.nextNode(),i++)}return _.currentNode=w,o}p(t){let s=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(t,r,s),s+=r.strings.length-2):r._$AI(t[s])),s++}}class R{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,s,r,o){this.type=2,this._$AH=h,this._$AN=void 0,this._$AA=t,this._$AB=s,this._$AM=r,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const s=this._$AM;return s!==void 0&&t?.nodeType===11&&(t=s.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,s=this){t=S(this,t,s),U(t)?t===h||t==null||t===""?(this._$AH!==h&&this._$AR(),this._$AH=h):t!==this._$AH&&t!==k&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):zt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==h&&U(this._$AH)?this._$AA.nextSibling.data=t:this.T(w.createTextNode(t)),this._$AH=t}$(t){const{values:s,_$litType$:r}=t,o=typeof r=="number"?this._$AC(t):(r.el===void 0&&(r.el=H.createElement(xt(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===o)this._$AH.p(s);else{const n=new Lt(o,this),i=n.u(this.options);n.p(s),this.T(i),this._$AH=n}}_$AC(t){let s=mt.get(t.strings);return s===void 0&&mt.set(t.strings,s=new H(t)),s}k(t){et(this._$AH)||(this._$AH=[],this._$AR());const s=this._$AH;let r,o=0;for(const n of t)o===s.length?s.push(r=new R(this.O(M()),this.O(M()),this,this.options)):r=s[o],r._$AI(n),o++;o<s.length&&(this._$AR(r&&r._$AB.nextSibling,o),s.length=o)}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(!1,!0,s);t!==this._$AB;){const r=pt(t).nextSibling;pt(t).remove(),t=r}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class V{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,s,r,o,n){this.type=1,this._$AH=h,this._$AN=void 0,this.element=t,this.name=s,this._$AM=o,this.options=n,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=h}_$AI(t,s=this,r,o){const n=this.strings;let i=!1;if(n===void 0)t=S(this,t,s,0),i=!U(t)||t!==this._$AH&&t!==k,i&&(this._$AH=t);else{const d=t;let l,p;for(t=n[0],l=0;l<n.length-1;l++)p=S(this,d[r+l],s,l),p===k&&(p=this._$AH[l]),i||=!U(p)||p!==this._$AH[l],p===h?t=h:t!==h&&(t+=(p??"")+n[l+1]),this._$AH[l]=p}i&&!o&&this.j(t)}j(t){t===h?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class jt extends V{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===h?void 0:t}}class Ft extends V{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==h)}}class qt extends V{constructor(t,s,r,o,n){super(t,s,r,o,n),this.type=5}_$AI(t,s=this){if((t=S(this,t,s,0)??h)===k)return;const r=this._$AH,o=t===h&&r!==h||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,n=t!==h&&(r===h||o);o&&this.element.removeEventListener(this.name,this,r),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Jt{constructor(t,s,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=s,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){S(this,t)}}const Bt=tt.litHtmlPolyfillSupport;Bt?.(H,R),(tt.litHtmlVersions??=[]).push("3.3.2");const Wt=(e,t,s)=>{const r=s?.renderBefore??t;let o=r._$litPart$;if(o===void 0){const n=s?.renderBefore??null;r._$litPart$=o=new R(t.insertBefore(M(),n),n,void 0,s??{})}return o._$AI(e),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const st=globalThis;class f extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const s=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Wt(s,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return k}}f._$litElement$=!0,f.finalized=!0,st.litElementHydrateSupport?.({LitElement:f});const Vt=st.litElementPolyfillSupport;Vt?.({LitElement:f});(st.litElementVersions??=[]).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=e=>(t,s)=>{s!==void 0?s.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Kt={attribute:!0,type:String,converter:j,reflect:!1,hasChanged:X},Zt=(e=Kt,t,s)=>{const{kind:r,metadata:o}=s;let n=globalThis.litPropertyMetadata.get(o);if(n===void 0&&globalThis.litPropertyMetadata.set(o,n=new Map),r==="setter"&&((e=Object.create(e)).wrapped=!0),n.set(s.name,e),r==="accessor"){const{name:i}=s;return{set(d){const l=t.get.call(this);t.set.call(this,d),this.requestUpdate(i,l,e,!0,d)},init(d){return d!==void 0&&this.C(i,void 0,e,d),d}}}if(r==="setter"){const{name:i}=s;return function(d){const l=this[i];t.call(this,d),this.requestUpdate(i,l,e,!0,d)}}throw Error("Unsupported decorator location: "+r)};function v(e){return(t,s)=>typeof s=="object"?Zt(e,t,s):((r,o,n)=>{const i=o.hasOwnProperty(n);return o.constructor.createProperty(n,r),i?Object.getOwnPropertyDescriptor(o,n):void 0})(e,t,s)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function z(e){return v({...e,state:!0,attribute:!1})}async function Qt(){const e=await fetch("/api/snapshot");if(!e.ok)throw new Error(`snapshot ${e.status}`);return e.json()}function Gt(e){const t=new EventSource("/api/events");return t.addEventListener("snapshot",s=>{try{e(JSON.parse(s.data))}catch{}}),()=>t.close()}class Yt{constructor(t){this.snapshot={tasks:[],flows:[],cronJobs:[],generatedAt:0},this.mode="live",this.liveTab="tasks",this.configTab="standing-orders",this.loading=!0,this.error=null,this.acks=new Set,this.host=t,t.addController(this);try{const s=localStorage.getItem("opsdash.acks");s&&(this.acks=new Set(JSON.parse(s)))}catch{}}async hostConnected(){try{this.snapshot=await Qt(),this.loading=!1,this.host.requestUpdate()}catch(t){this.error=t.message,this.loading=!1,this.host.requestUpdate()}this.closeStream=Gt(t=>{this.snapshot=t,this.host.requestUpdate()})}hostDisconnected(){this.closeStream?.()}setMode(t){this.mode=t,this.host.requestUpdate()}setLiveTab(t){this.liveTab=t,this.host.requestUpdate()}setConfigTab(t){this.configTab=t,this.host.requestUpdate()}toggleAck(t){this.acks.has(t)?this.acks.delete(t):this.acks.add(t);try{localStorage.setItem("opsdash.acks",JSON.stringify([...this.acks]))}catch{}this.host.requestUpdate()}}function rt(e){const t=Math.max(0,Math.floor((Date.now()-e)/1e3));if(t<60)return`${t}s`;const s=Math.floor(t/60);if(s<60)return`${s}m`;const r=Math.floor(s/60);return r<48?`${r}h`:`${Math.floor(r/24)}d`}function y(e){return e?new Date(e).toLocaleString():"—"}const ot=P`
  :host {
    display: block;
    font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
    color: var(--fg);
    font-size: 12px;
    line-height: 1.45;
    letter-spacing: 0.01em;
  }
  * {
    box-sizing: border-box;
  }
  a {
    color: var(--accent);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;P`
  .panel {
    position: relative;
    border: 1px solid var(--rule);
    background: var(--panel);
    padding: 16px 18px;
  }
  .panel::before,
  .panel::after,
  .panel > .tl,
  .panel > .tr {
    position: absolute;
    width: 10px;
    height: 10px;
    color: var(--fg);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    line-height: 1;
    opacity: 0.85;
    pointer-events: none;
  }
  .panel::before {
    content: "└";
    left: -1px;
    bottom: -6px;
  }
  .panel::after {
    content: "┘";
    right: -1px;
    bottom: -6px;
  }
  .panel > .tl {
    content: "";
  }
  .panel-label {
    position: absolute;
    top: -7px;
    left: 14px;
    background: var(--bg);
    padding: 0 8px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--fg-dim);
  }
`;P`
  .brk {
    position: relative;
    padding: 10px 12px;
  }
  .brk::before,
  .brk::after {
    position: absolute;
    font-family: "JetBrains Mono", monospace;
    color: var(--fg-dim);
    font-size: 14px;
    line-height: 1;
    pointer-events: none;
  }
  .brk::before {
    content: "⌐";
    top: 2px;
    left: 2px;
  }
  .brk::after {
    content: "¬";
    top: 2px;
    right: 2px;
  }
`;const nt={queued:"var(--fg-dim)",running:"var(--amber)",waiting:"var(--violet)",blocked:"var(--red)",succeeded:"var(--green)",failed:"var(--red)",timed_out:"var(--red)",cancelled:"var(--fg-dimmer)",lost:"var(--fg-dimmer)",error:"var(--red)",ok:"var(--green)"};var Xt=Object.defineProperty,te=Object.getOwnPropertyDescriptor,K=(e,t,s,r)=>{for(var o=r>1?void 0:r?te(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=(r?i(t,s,o):i(o))||o);return r&&o&&Xt(t,s,o),o};let E=class extends f{constructor(){super(...arguments),this.mode="live",this.liveTab="tasks",this.now=new Date}connectedCallback(){super.connectedCallback(),this.timer=setInterval(()=>this.now=new Date,1e3)}disconnectedCallback(){super.disconnectedCallback(),this.timer&&clearInterval(this.timer)}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}tab(e,t,s){return a`
      <button
        class=${this.liveTab===e?"active":""}
        @click=${()=>this.emit("live-tab",e)}
      >
        <span class="num">${t}</span>${s}
      </button>
    `}fmtTs(){const e=this.now,t=s=>String(s).padStart(2,"0");return`${e.getUTCFullYear()}.${t(e.getUTCMonth()+1)}.${t(e.getUTCDate())} ${t(e.getUTCHours())}:${t(e.getUTCMinutes())}:${t(e.getUTCSeconds())} UTC`}render(){return a`
      <div class="strip">
        <div class="brand">
          <span class="brand-mark">OpsDash</span>
        </div>
        <div class="clock">
          <span class="live-dot"></span>
          <span>LIVE</span>
          <span class="ts">${this.fmtTs()}</span>
        </div>
        <div class="modes">
          <button
            class=${this.mode==="live"?"active":""}
            @click=${()=>this.emit("mode","live")}
          >
            Live
          </button>
          <button
            class=${this.mode==="config"?"active":""}
            @click=${()=>this.emit("mode","config")}
          >
            Config
          </button>
        </div>
      </div>
      <div class="tabs">
        ${this.tab("tasks","01","Tasks")}
        ${this.tab("taskflows","02","TaskFlows")}
        ${this.tab("cron-jobs","03","Cron Jobs")}
        ${this.tab("heartbeat","04","Heartbeat")}
      </div>
    `}};E.styles=[ot,P`
      :host {
        display: block;
      }
      .strip {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 18px 24px 14px;
        border-bottom: 1px solid var(--rule);
        gap: 32px;
        background:
          linear-gradient(180deg, rgba(255, 140, 26, 0.02) 0%, transparent 100%),
          var(--bg);
      }
      .brand {
        display: flex;
        align-items: baseline;
        gap: 14px;
      }
      .brand-mark {
        font-family: "Fraunces", serif;
        font-weight: 600;
        font-size: 28px;
        letter-spacing: -0.02em;
        color: var(--cream);
        font-variation-settings: "opsz" 144;
      }
      .brand-sub {
        font-size: 10px;
        letter-spacing: 0.22em;
        color: var(--fg-dim);
        text-transform: uppercase;
      }
      .brand-sub span.sep {
        color: var(--fg-dimmer);
        margin: 0 6px;
      }
      .clock {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--fg-dim);
        justify-self: center;
      }
      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--green);
        box-shadow: 0 0 8px rgba(142, 192, 124, 0.6);
        animation: pulse 1.8s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.45;
          transform: scale(0.85);
        }
      }
      .clock .ts {
        color: var(--cream);
        font-variant-numeric: tabular-nums;
      }
      .modes {
        justify-self: end;
        display: flex;
        gap: 0;
        border: 1px solid var(--rule-strong);
      }
      .modes button {
        background: transparent;
        color: var(--fg-dim);
        border: 0;
        padding: 6px 14px;
        font: inherit;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        border-right: 1px solid var(--rule-strong);
      }
      .modes button:last-child {
        border-right: 0;
      }
      .modes button.active {
        background: var(--fg);
        color: var(--bg);
      }
      .tabs {
        display: flex;
        padding: 0 24px;
        gap: 0;
        border-bottom: 1px solid var(--rule);
        background: var(--bg);
      }
      .tabs button {
        background: transparent;
        color: var(--fg-dim);
        border: 0;
        padding: 14px 22px 12px;
        font: inherit;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        position: relative;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .tabs button:hover {
        color: var(--fg);
      }
      .tabs button.active {
        color: var(--cream);
        border-bottom-color: var(--amber);
      }
      .tabs button .num {
        color: var(--fg-dimmer);
        margin-right: 8px;
        font-size: 9px;
      }
      .tabs button.active .num {
        color: var(--amber);
      }
    `];K([v()],E.prototype,"mode",2);K([v()],E.prototype,"liveTab",2);K([z()],E.prototype,"now",2);E=K([x("ops-nav")],E);var ee=Object.defineProperty,se=Object.getOwnPropertyDescriptor,At=(e,t,s,r)=>{for(var o=r>1?void 0:r?se(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=(r?i(t,s,o):i(o))||o);return r&&o&&ee(t,s,o),o};const re=4*60*60*1e3;let q=class extends f{constructor(){super(...arguments),this.snapshot={tasks:[],flows:[],cronJobs:[],generatedAt:0}}counts(){const e=this.snapshot.flows.filter(n=>n.status==="blocked").length,t=this.snapshot.tasks.filter(n=>["failed","timed_out","lost"].includes(n.status)).length,s=Date.now(),r=this.snapshot.flows.filter(n=>n.status==="waiting"&&s-n.updatedAt>re).length,o=this.snapshot.cronJobs.filter(n=>(n.state?.consecutiveErrors??0)>=3).length;return{blocked:e,failed:t,stuckWaiting:r,cronFailing:o}}cell(e,t,s,r){const o=t>0?r:"";return a`
      <div class="cell ${o}">
        <span class="k">${e}</span>
        <span class="v">
          <span class="num">${String(t).padStart(2,"0")}</span>
          <span class="unit">${s}</span>
        </span>
      </div>
    `}render(){const{blocked:e,failed:t,stuckWaiting:s,cronFailing:r}=this.counts();return a`
      <div class="strip">
        ${this.cell("flows blocked",e,"flows","hot")}
        ${this.cell("tasks failed",t,"runs","hot")}
        ${this.cell("waiting stuck",s,">4h","warn")}
        ${this.cell("cron ≥3 fails",r,"jobs","hot")}
      </div>
    `}};q.styles=[ot,P`
      .strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 1px solid var(--rule);
        background: var(--bg);
      }
      .cell {
        padding: 10px 20px;
        border-right: 1px solid var(--rule);
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: relative;
      }
      .cell:last-child {
        border-right: 0;
      }
      .cell .k {
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-dim);
      }
      .cell .v {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-variant-numeric: tabular-nums;
      }
      .cell .num {
        font-family: "Fraunces", serif;
        font-size: 28px;
        font-weight: 600;
        line-height: 1;
        color: var(--fg-dimmer);
      }
      .cell .unit {
        font-size: 10px;
        color: var(--fg-dim);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .cell.hot .num {
        color: var(--red);
      }
      .cell.hot {
        background: linear-gradient(
          180deg,
          rgba(224, 108, 94, 0.08) 0%,
          transparent 100%
        );
      }
      .cell.hot::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--red);
        animation: hot-pulse 1.2s ease-in-out infinite;
      }
      .cell.warn .num {
        color: var(--amber);
      }
      @keyframes hot-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }
    `];At([v({attribute:!1})],q.prototype,"snapshot",2);q=At([x("ops-pull-me")],q);var oe=Object.defineProperty,ne=Object.getOwnPropertyDescriptor,Z=(e,t,s,r)=>{for(var o=r>1?void 0:r?ne(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=(r?i(t,s,o):i(o))||o);return r&&o&&oe(t,s,o),o};let N=class extends f{constructor(){super(...arguments),this.items=[],this.columns=[],this.renderCard=()=>a``}createRenderRoot(){return this}render(){const e=new Map;for(const t of this.columns)e.set(t,[]);for(const t of this.items){const s=e.get(t.status);s&&s.push(t)}return a`
      <div
        class="ops-kanban"
        style="--cols:${this.columns.length}"
      >
        ${this.columns.map(t=>a`
            <div class="ops-col">
              <div class="ops-col-head">
                <span
                  class="ops-col-name"
                  style="color:${nt[t]??"var(--fg-dim)"}"
                >
                  <span class="ops-col-dot"></span>
                  ${t.replace("_"," ")}
                </span>
                <span class="ops-col-count">
                  ${String(e.get(t)?.length??0).padStart(2,"0")}
                </span>
              </div>
              <div class="ops-col-items">
                ${(e.get(t)??[]).length?(e.get(t)??[]).map(s=>this.renderCard(s)):a`<div class="ops-col-empty">— nil —</div>`}
              </div>
            </div>
          `)}
      </div>
    `}};Z([v({attribute:!1})],N.prototype,"items",2);Z([v({attribute:!1})],N.prototype,"columns",2);Z([v({attribute:!1})],N.prototype,"renderCard",2);N=Z([x("ops-kanban")],N);var ie=Object.defineProperty,ae=Object.getOwnPropertyDescriptor,D=(e,t,s,r)=>{for(var o=r>1?void 0:r?ae(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=(r?i(t,s,o):i(o))||o);return r&&o&&ie(t,s,o),o};const le=["queued","running","succeeded","failed","cancelled"];let C=class extends f{constructor(){super(...arguments),this.tasks=[],this.runtimeFilter="",this.agentFilter="",this.expanded=new Set}createRenderRoot(){return this}toggle(e,t){t.stopPropagation();const s=new Set(this.expanded);s.has(e)?s.delete(e):s.add(e),this.expanded=s}get filtered(){return this.tasks.filter(e=>(!this.runtimeFilter||e.runtime===this.runtimeFilter)&&(!this.agentFilter||e.agentId===this.agentFilter))}renderCard(e){const t=this.expanded.has(e.taskId),s=e.label||e.task,r=e.progressSummary||e.terminalSummary,o=nt[e.status]??"var(--fg-dim)";return a`
      <div
        class="ops-card ${t?"open":""}"
        @click=${n=>this.toggle(e.taskId,n)}
      >
        <div class="ops-card-bar" style="background:${o}"></div>
        <div class="ops-card-head">
          <span class="ops-card-title">${s}</span>
          ${e.error?a`<span class="ops-card-dot" title="has error"></span>`:""}
          <span class="ops-card-chev">›</span>
        </div>
        <div class="ops-card-meta">
          <span class="runtime">${e.runtime}</span>
          ${e.agentId?a`<span class="agent">${e.agentId}</span>`:""}
          <span class="age">T+${rt(e.createdAt)}</span>
        </div>
        ${t?a`
              <div class="ops-card-body" @click=${n=>n.stopPropagation()}>
                ${r?a`
                      <div class="section">
                        <div class="k">Summary</div>
                        <div class="v">${r}</div>
                      </div>
                    `:""}
                ${e.task&&e.task!==s?a`
                      <div class="section">
                        <div class="k">Task</div>
                        <div class="v mono">${e.task}</div>
                      </div>
                    `:""}
                ${e.error?a`
                      <div class="section">
                        <div class="k">Error</div>
                        <div class="v err">${e.error}</div>
                      </div>
                    `:""}
                <dl class="kv">
                  <dt>task id</dt>
                  <dd>${e.taskId}</dd>
                  <dt>status</dt>
                  <dd>${e.status}</dd>
                  <dt>created</dt>
                  <dd>${y(e.createdAt)}</dd>
                  ${e.startedAt?a`<dt>started</dt>
                        <dd>${y(e.startedAt)}</dd>`:""}
                  ${e.endedAt?a`<dt>ended</dt>
                        <dd>${y(e.endedAt)}</dd>`:""}
                  ${e.runId?a`<dt>run id</dt>
                        <dd>${e.runId}</dd>`:""}
                  ${e.parentFlowId?a`<dt>flow</dt>
                        <dd>${e.parentFlowId}</dd>`:""}
                  ${e.parentCronJobId?a`<dt>cron job</dt>
                        <dd>${e.parentCronJobId}</dd>`:""}
                </dl>
              </div>
            `:""}
      </div>
    `}render(){const e=[...new Set(this.tasks.map(s=>s.runtime))].sort(),t=[...new Set(this.tasks.map(s=>s.agentId).filter(Boolean))].sort();return a`
      <div class="ops-filters">
        <div class="ops-filter-group">
          <label>Runtime</label>
          <select
            @change=${s=>this.runtimeFilter=s.target.value}
          >
            <option value="">all</option>
            ${e.map(s=>a`<option value=${s}>${s}</option>`)}
          </select>
        </div>
        <div class="ops-filter-group">
          <label>Agent</label>
          <select
            @change=${s=>this.agentFilter=s.target.value}
          >
            <option value="">all</option>
            ${t.map(s=>a`<option value=${s}>${s}</option>`)}
          </select>
        </div>
        <div class="ops-filter-summary">
          Showing <span>${this.filtered.length}</span>
        </div>
      </div>
      <ops-kanban
        .items=${this.filtered.map(s=>({...s,id:s.taskId}))}
        .columns=${le}
        .renderCard=${s=>this.renderCard(s)}
      ></ops-kanban>
    `}};D([v({attribute:!1})],C.prototype,"tasks",2);D([z()],C.prototype,"runtimeFilter",2);D([z()],C.prototype,"agentFilter",2);D([z()],C.prototype,"expanded",2);C=D([x("ops-tasks")],C);var de=Object.defineProperty,ce=Object.getOwnPropertyDescriptor,it=(e,t,s,r)=>{for(var o=r>1?void 0:r?ce(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=(r?i(t,s,o):i(o))||o);return r&&o&&de(t,s,o),o};const pe=["queued","running","waiting","blocked","succeeded","failed"];let J=class extends f{constructor(){super(...arguments),this.flows=[],this.expanded=new Set}createRenderRoot(){return this}toggle(e,t){t.stopPropagation();const s=new Set(this.expanded);s.has(e)?s.delete(e):s.add(e),this.expanded=s}renderCard(e){const t=this.expanded.has(e.flowId),s=nt[e.status]??"var(--fg-dim)";return a`
      <div
        class="ops-card ${t?"open":""}"
        @click=${r=>this.toggle(e.flowId,r)}
      >
        <div class="ops-card-bar" style="background:${s}"></div>
        <div class="ops-card-head">
          <span class="ops-card-title">${e.goal}</span>
          ${e.blockedSummary?a`<span class="ops-card-dot"></span>`:""}
          <span class="ops-card-chev">›</span>
        </div>
        <div class="ops-card-meta">
          ${e.currentStep?a`<span class="step">→ ${e.currentStep}</span>`:""}
          ${e.childTaskCount!=null?a`<span>${e.childTaskCount} tasks</span>`:""}
          <span class="age">T+${rt(e.updatedAt)}</span>
        </div>
        ${t?a`
              <div class="ops-card-body" @click=${r=>r.stopPropagation()}>
                ${e.blockedSummary?a`
                      <div class="section">
                        <div class="k">Blocked reason</div>
                        <div class="v err">⊘ ${e.blockedSummary}</div>
                      </div>
                    `:""}
                <dl class="kv">
                  <dt>flow id</dt>
                  <dd>${e.flowId}</dd>
                  <dt>status</dt>
                  <dd>${e.status}</dd>
                  <dt>created</dt>
                  <dd>${y(e.createdAt)}</dd>
                  <dt>updated</dt>
                  <dd>${y(e.updatedAt)}</dd>
                  ${e.endedAt?a`<dt>ended</dt>
                        <dd>${y(e.endedAt)}</dd>`:""}
                </dl>
              </div>
            `:""}
      </div>
    `}render(){return this.flows.length?a`
      <ops-kanban
        .items=${this.flows.map(e=>({...e,id:e.flowId}))}
        .columns=${pe}
        .renderCard=${e=>this.renderCard(e)}
      ></ops-kanban>
    `:a`
        <div class="ops-empty-panel">
          <div class="kicker">§ TaskFlows — Offline</div>
          <div class="head">nothing flowing yet.</div>
          <div class="sub">
            This console lights up once the conductor wires in. Until then,
            individual Tasks carry the signal and this panel stays dark by
            design.
          </div>
        </div>
      `}};it([v({attribute:!1})],J.prototype,"flows",2);it([z()],J.prototype,"expanded",2);J=it([x("ops-taskflows")],J);var he=Object.defineProperty,ue=Object.getOwnPropertyDescriptor,kt=(e,t,s,r)=>{for(var o=r>1?void 0:r?ue(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=(r?i(t,s,o):i(o))||o);return r&&o&&he(t,s,o),o};let B=class extends f{constructor(){super(...arguments),this.jobs=[]}statusClass(e){const t=e.state?.lastStatus;return t?(e.state?.consecutiveErrors??0)>=3?"err":t==="ok"||t==="succeeded"?"ok":t==="error"||t==="failed"?"err":"warn":"muted"}succeedClass(e){return e==null?"dim":e>=90?"":e>=50?"mid":"low"}renderSpark(e){const t=(e.recentRuns??[]).slice(0,10).reverse();return t.length?a`
      <span class="spark">
        ${t.map(s=>{const r=s.status==="succeeded";return a`<span style="height:${r?10:14}px;background:${r?"var(--green)":"var(--red)"}"></span>`})}
      </span>
    `:a`<span style="color:var(--fg-dimmer)">—</span>`}render(){return a`
      <div class="wrap">
        <div class="head">
          <span></span>
          <span>Job Name</span>
          <span>Schedule</span>
          <span>Agent</span>
          <span>Last Run</span>
          <span>Status</span>
          <span>Next</span>
          <span style="text-align:right">24h</span>
          <span style="text-align:right">OK%</span>
        </div>
        ${this.jobs.map((e,t)=>a`
            <div
              class="row ${e.enabled?"":"disabled"} ${(e.state?.consecutiveErrors??0)>=3?"fail-streak":""}"
            >
              <span class="idx">${String(t+1).padStart(2,"0")}</span>
              <span class="name">${e.name}</span>
              <span class="schedule">
                ${e.schedule.kind==="cron"?e.schedule.expr:e.schedule.kind}
                ${e.schedule.tz?a`<span class="tz">${e.schedule.tz}</span>`:""}
              </span>
              <span class="agent">${e.agentId}</span>
              <span class="ago">
                ${e.state?.lastRunAtMs?"T−"+rt(e.state.lastRunAtMs):"—"}
              </span>
              <span class="status ${this.statusClass(e)}">
                <span class="dot"></span>
                ${(e.state?.consecutiveErrors??0)>=3?`err ×${e.state?.consecutiveErrors}`:e.state?.lastStatus??"idle"}
              </span>
              <span class="next">${y(e.state?.nextRunAtMs)}</span>
              <span class="num ${(e.runs24h??0)===0?"dim":""}">
                ${e.runs24h??0}
              </span>
              <span class="num ${this.succeedClass(e.successPct24h)}">
                ${e.successPct24h!=null?e.successPct24h:"—"}
              </span>
            </div>
          `)}
      </div>
    `}};B.styles=[ot,P`
      .wrap {
        border: 1px solid var(--rule);
        background: var(--panel);
      }
      .head {
        display: grid;
        grid-template-columns: 24px 2fr 1.2fr 1fr 1fr 1fr 1.3fr 70px 70px;
        gap: 0;
        padding: 12px 16px;
        border-bottom: 1px solid var(--rule);
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-dim);
      }
      .row {
        display: grid;
        grid-template-columns: 24px 2fr 1.2fr 1fr 1fr 1fr 1.3fr 70px 70px;
        gap: 0;
        padding: 14px 16px;
        border-bottom: 1px solid var(--rule);
        align-items: center;
        transition: background 0.1s;
        position: relative;
      }
      .row:last-child {
        border-bottom: 0;
      }
      .row:hover {
        background: rgba(255, 255, 255, 0.015);
      }
      .row.disabled {
        opacity: 0.45;
      }
      .row .idx {
        font-family: "Fraunces", serif;
        font-size: 13px;
        color: var(--fg-dimmer);
        font-variant-numeric: tabular-nums;
        font-style: italic;
      }
      .row .name {
        color: var(--cream);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 12px;
      }
      .row .schedule {
        color: var(--fg-dim);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .row .schedule .tz {
        color: var(--fg-dimmer);
        margin-left: 6px;
      }
      .row .agent {
        color: var(--fg);
        font-size: 11px;
      }
      .row .ago,
      .row .next {
        font-size: 11px;
        color: var(--fg-dim);
        font-variant-numeric: tabular-nums;
      }
      .row .next {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row .status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .row .status .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .row .status.ok {
        color: var(--green);
      }
      .row .status.ok .dot {
        background: var(--green);
        box-shadow: 0 0 6px rgba(142, 192, 124, 0.5);
      }
      .row .status.err {
        color: var(--red);
      }
      .row .status.err .dot {
        background: var(--red);
        box-shadow: 0 0 6px rgba(224, 108, 94, 0.5);
      }
      .row .status.warn {
        color: var(--amber);
      }
      .row .status.warn .dot {
        background: var(--amber);
      }
      .row .status.muted {
        color: var(--fg-dimmer);
      }
      .row .status.muted .dot {
        background: var(--fg-dimmer);
      }
      .row .num {
        font-family: "Fraunces", serif;
        font-size: 15px;
        font-variant-numeric: tabular-nums;
        color: var(--cream);
        text-align: right;
      }
      .row .num.low {
        color: var(--red);
      }
      .row .num.mid {
        color: var(--amber);
      }
      .row .num.dim {
        color: var(--fg-dimmer);
      }
      .row.fail-streak::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--red);
      }
      .spark {
        display: inline-flex;
        gap: 2px;
        align-items: flex-end;
        height: 14px;
      }
      .spark span {
        width: 3px;
        background: currentColor;
      }
    `];kt([v({attribute:!1})],B.prototype,"jobs",2);B=kt([x("ops-cron-jobs")],B);var fe=Object.getOwnPropertyDescriptor,ve=(e,t,s,r)=>{for(var o=r>1?void 0:r?fe(t,s):t,n=e.length-1,i;n>=0;n--)(i=e[n])&&(o=i(o)||o);return o};let $t=class extends f{constructor(){super(...arguments),this.state=new Yt(this)}createRenderRoot(){return this}sectionHead(e,t,s){return a`
      <div class="section-head">
        <span class="num">${e}</span>
        <span class="title">${t}</span>
        <span class="rule"></span>
        <span class="hint">${s}</span>
      </div>
    `}renderActive(){if(this.state.mode==="config")return a`
        ${this.sectionHead("§","config mode","standing orders · hooks · webhooks")}
        <div class="placeholder">
          <div class="kicker">§ Queued for M2</div>
          <div class="head">Config console coming online.</div>
        </div>
      `;const e=this.state.liveTab;return e==="tasks"?a`
        ${this.sectionHead("01","tasks",`${this.state.snapshot.tasks.length} rows · runs.sqlite`)}
        <ops-tasks .tasks=${this.state.snapshot.tasks}></ops-tasks>
      `:e==="taskflows"?a`
        ${this.sectionHead("02","taskflows",`${this.state.snapshot.flows.length} flows · flows/registry.sqlite`)}
        <ops-taskflows .flows=${this.state.snapshot.flows}></ops-taskflows>
      `:e==="cron-jobs"?a`
        ${this.sectionHead("03","cron jobs",`${this.state.snapshot.cronJobs.length} schedules · jobs.json`)}
        <ops-cron-jobs .jobs=${this.state.snapshot.cronJobs}></ops-cron-jobs>
      `:a`
      ${this.sectionHead("04","heartbeat","queued for M2")}
      <div class="placeholder">
        <div class="kicker">§ Queued for M2</div>
        <div class="head">Heartbeat telemetry coming online.</div>
      </div>
    `}render(){if(this.state.error)return a`<div class="ops-error">⊘ failed to load: ${this.state.error}</div>`;const e=this.state.snapshot,t=e.generatedAt?new Date(e.generatedAt).toLocaleTimeString():"—";return a`
      <ops-nav
        .mode=${this.state.mode}
        .liveTab=${this.state.liveTab}
        @mode=${s=>this.state.setMode(s.detail)}
        @live-tab=${s=>this.state.setLiveTab(s.detail)}
      ></ops-nav>
      <ops-pull-me .snapshot=${this.state.snapshot}></ops-pull-me>
      <main class="ops-main">${this.renderActive()}</main>
      <div class="ops-footer">
        <div class="stat">snapshot · <span>${t}</span></div>
        <div class="stat">
          t:<span>${e.tasks.length}</span> f:<span>${e.flows.length}</span>
          c:<span>${e.cronJobs.length}</span>
        </div>
        <div>opsdash · m1 · 127.0.0.1:7890</div>
      </div>
    `}};$t=ve([x("ops-dash")],$t);
