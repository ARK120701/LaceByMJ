'use strict';
/* Laced by MJ — shared script for every page.
   Builds the header, footer, product popup and inquiry popup, loads the catalog,
   and runs the catalog page logic when the catalog grid is present. */

// Images and fonts load from the live site until you copy the /images folder next to these files.
// Set ASSET_BASE to '' once the images folder is local.
const ASSET_BASE='https://laced-by-mj.yummydream.chatgpt.site/';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],config={name:'Laced by MJ',email:''},visible=24,activeProduct=null,inquiry=[];
const selected={brand:new Set(),category:new Set(),fit:new Set()};
try{inquiry=JSON.parse(localStorage.getItem('lacedbymj-inquiry')||'[]');if(!Array.isArray(inquiry))inquiry=[];}catch{inquiry=[];}

const friendly=n=>n.replace(/^W-/,'').replace(/^AJ-(\d+)/,'Air Jordan $1').replace(/^AJ1 /,'Air Jordan 1 ').replace(/^NB /,'New Balance ');
const fitLabel=x=>x==='General'?'General sizing':x==='Women'?"Women’s":x;
function photo(p,extra=''){return p.image?`<img src="${esc(p.image)}" alt="${esc(friendly(p.name))}" loading="lazy" ${extra}>`:`<div class="no-photo"><b>${esc(p.brand)}</b><small>PHOTO ON REQUEST</small></div>`;}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
function persist(){try{localStorage.setItem('lacedbymj-inquiry',JSON.stringify(inquiry));}catch{}const c=$('#bag-count');if(c)c.textContent=inquiry.length;}

/* ---------- shared header, footer, popups ---------- */
function buildChrome(){
  const page=document.body.dataset.page||'';
  const link=(href,label,key)=>`<a href="${href}"${page===key?' aria-current="page" style="text-decoration:underline;text-underline-offset:6px"':''}>${label}</a>`;
  document.body.insertAdjacentHTML('afterbegin',`
  <a class="skip" href="#main">Skip to content</a>
  <header id="home">
    <a class="logo" href="index.html">Laced by MJ</a>
    <nav aria-label="Main">
      ${link('catalog.html','Catalog','catalog')}
      ${link('how-to-inquire.html','How to inquire','how')}
      ${link('about.html','About us','about')}
      ${link('contact.html','Contact','contact')}
    </nav>
    <button class="bag" id="open-inquiry" type="button" aria-label="Open inquiry list">Inquiry <span id="bag-count">0</span> ↗</button>
  </header>`);
  document.body.insertAdjacentHTML('beforeend',`
  <footer class="city-footer">
    <p class="footer-location">LOCAL DELIVERY<span>|</span>CONSISTENT COMMUNICATION<span>|</span>GvO</p>
    <div class="footer-end">
      <a class="logo" href="index.html">Laced by MJ</a>
      <div class="footer-links"><a href="contact.html">Contact</a><span>©&nbsp;<span id="year"></span></span></div>
    </div>
  </footer>
  <dialog id="product-dialog" aria-labelledby="product-title">
    <button class="close" data-close aria-label="Close">×</button>
    <div id="product-content"></div>
  </dialog>
  <dialog id="inquiry-dialog" aria-labelledby="inquiry-title">
    <button class="close" data-close aria-label="Close">×</button>
    <div class="inquiry-inner">
      <p class="eyebrow">THE NEXT STEP</p>
      <h2 id="inquiry-title">Your inquiry list.</h2>
      <p class="muted">A few good finds, ready for a conversation.</p>
      <div id="inquiry-items"></div>
      <form id="inquiry-actions" hidden novalidate>
        <label for="inquiry-name">Full name *</label>
        <input id="inquiry-name" class="requested-size" name="name" autocomplete="name" required placeholder="Your name">
        <label for="inquiry-phone">Phone number *</label>
        <input id="inquiry-phone" class="requested-size" name="phone" type="tel" autocomplete="tel" required placeholder="(555) 555-5555">
        <label for="inquiry-email">Email address *</label>
        <input id="inquiry-email" class="requested-size" name="email" type="email" autocomplete="email" required placeholder="you@example.com">
        <label for="inquiry-method">Best way to reach you</label>
        <select id="inquiry-method" class="requested-size">
          <option>Email</option><option>Phone call</option><option>Text message</option>
        </select>
        <label for="inquiry-notes">Notes (optional)</label>
        <textarea id="inquiry-notes" rows="3" placeholder="Anything we should know?"></textarea>
        <input type="text" id="inquiry-botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;width:0">
        <button class="button dark" id="send-inquiry" type="submit">Send inquiry <span>↗</span></button>
        <p class="recipient-note" id="form-status" role="status" aria-live="polite"></p>
        <p class="fine">We confirm pricing and availability directly with you. Your details are only used to reply to this inquiry.</p>
      </form>
    </div>
  </dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  const y=$('#year');if(y)y.textContent=new Date().getFullYear();
}

/* ---------- inquiry list + email ---------- */
const val=id=>($(id)?.value||'').trim();
function inquiryText(){
  const notes=val('#inquiry-notes');
  return 'NEW INQUIRY — '+inquiry.length+(inquiry.length===1?' item':' items')+'\n\n'
   +'Name: '+val('#inquiry-name')+'\n'
   +'Phone: '+val('#inquiry-phone')+'\n'
   +'Email: '+val('#inquiry-email')+'\n'
   +'Best way to reach them: '+val('#inquiry-method')+'\n\n'
   +'ITEMS\n'
   +inquiry.map((v,i)=>{const p=products.find(p=>p.id===v.id);return p?`${i+1}. ${p.name}\n   Brand: ${p.brand}\n   Style: ${p.sku}`:''}).filter(Boolean).join('\n\n')
   +(notes?'\n\nNOTES\n'+notes:'');
}
// Sends the form through Web3Forms (free). Falls back to opening the visitor's email app
// if no web3formsKey has been added to config.json yet.
async function submitInquiry(e){
  e.preventDefault();
  const status=$('#form-status'),btn=$('#send-inquiry'),form=$('#inquiry-actions');
  if(!inquiry.length){status.textContent='Add at least one item first.';return;}
  if(!form.checkValidity()){form.reportValidity();return;}
  if($('#inquiry-botcheck').value)return; // spam trap
  const subject=(config.name||'Laced by MJ')+' inquiry from '+val('#inquiry-name');
  if(!config.web3formsKey){
    const email=(config.email||'').trim();
    if(!email){status.textContent='Sending isn’t set up yet. Please use the Contact page.';return;}
    location.href='mailto:'+email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(inquiryText());
    status.textContent='Your email app should open with the inquiry. Press send there to finish.';
    return;
  }
  btn.disabled=true;status.textContent='Sending…';
  try{
    const res=await fetch('https://api.web3forms.com/submit',{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({
        access_key:config.web3formsKey,
        subject,
        from_name:config.name||'Laced by MJ',
        name:val('#inquiry-name'),
        email:val('#inquiry-email'),
        phone:val('#inquiry-phone'),
        message:inquiryText(),
        botcheck:''
      })
    });
    const data=await res.json();
    if(!res.ok||!data.success)throw Error(data.message||'failed');
    inquiry=[];persist();form.reset();status.textContent='';
    $('#inquiry-actions').hidden=true;
    $('#inquiry-items').innerHTML='<div class="empty-inquiry"><p><strong>Inquiry sent.</strong><br>Thank you! We’ll contact you soon to confirm pricing and availability.</p><a class="button dark" href="catalog.html">Keep browsing <span>↗</span></a></div>';
  }catch{
    status.textContent='Something went wrong. Please try again, or contact us directly.';
  }finally{btn.disabled=false;}
}
function updateEmail(){}
function renderInquiry(){
  persist();
  $('#inquiry-items').innerHTML=inquiry.length?inquiry.map((v,i)=>{const p=products.find(p=>p.id===v.id);if(!p)return'';return `<div class="inquiry-item">${p.image?`<img src="${esc(p.image)}" alt="">`:'<span></span>'}<div><h3>${esc(friendly(p.name))}</h3><p>${esc(p.brand)} · ${esc(p.sku)}</p></div><button class="remove-item" data-remove="${i}" aria-label="Remove ${esc(friendly(p.name))}">×</button></div>`;}).join(''):'<div class="empty-inquiry"><p>Your next find is waiting. Add a style to get started.</p><a class="button dark" href="catalog.html">Explore the catalog <span>↗</span></a></div>';
  $('#inquiry-actions').hidden=!inquiry.length;
  updateEmail();
}
function openInquiry(){renderInquiry();$('#inquiry-dialog').showModal();}

function wireChrome(){
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('#open-inquiry').addEventListener('click',openInquiry);
  $('#inquiry-items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){inquiry.splice(+b.dataset.remove,1);renderInquiry();}});
  $('#inquiry-actions').addEventListener('submit',submitInquiry);
  $('#product-content').addEventListener('click',e=>{
    if(e.target.closest('#add-to-inquiry')&&activeProduct){
      if(inquiry.some(x=>x.id===activeProduct.id)){toast('This item is already in your list.');return;}
      inquiry.push({id:activeProduct.id});persist();$('#product-dialog').close();toast('Added to your inquiry list.');
    }
  });
}
function showProduct(id){
  const p=products.find(p=>p.id===id);if(!p)return;activeProduct=p;
  $('#product-content').innerHTML=`<div class="product-detail"><div class="detail-image">${photo(p,'decoding="async"')}</div><div class="detail-copy"><p class="eyebrow">${esc(p.brand)} / ${esc(p.category)}</p><h2 id="product-title">${esc(friendly(p.name))}</h2><p class="detail-code">STYLE ${esc(p.sku)}</p><button class="button dark" id="add-to-inquiry">Add to inquiry <span>↗</span></button><p class="fine">Inquire for pricing and availability. We’ll confirm everything with you directly.</p></div></div>`;
  $('#product-dialog').showModal();
}

/* ---------- branding / contact links ---------- */
function applyBranding(){
  const name=config.name||'Laced by MJ';
  $$('header .logo, footer .logo').forEach(el=>{el.innerHTML=config.logoUrl?'<img class="business-logo" src="'+esc(config.logoUrl)+'" alt="'+esc(name)+'">':esc(name);el.setAttribute('aria-label',name+' home');});
  const email=(config.email||'').trim();
  $$('[data-contact-email]').forEach(el=>{el.textContent=email||'Email coming soon';if(email)el.href='mailto:'+email;});
  const phone=(config.phone||'').replace(/\D/g,'');
  const pretty=phone.length===10?`(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`:config.phone||'';
  $$('[data-contact-phone]').forEach(el=>{el.textContent=pretty;if(phone){el.href='tel:+1'+phone;}});
  $$('[data-contact-text]').forEach(el=>{if(phone)el.href='sms:+1'+phone;else el.hidden=true;});
  $$('[data-contact-button]').forEach(el=>{if(email)el.href='mailto:'+email+'?subject='+encodeURIComponent(name+' inquiry');else el.hidden=true;});
}

/* ---------- catalog page ---------- */
function initCatalog(){
  const fields=[['category','categories'],['brand','brands'],['fit','fits']];
  for(const [field,id] of fields){
    const values=[...new Set(products.map(p=>p[field]))].sort();
    $('#'+id).innerHTML=values.map(v=>`<label><input type="checkbox" data-field="${field}" value="${esc(v)}"><span>${esc(field==='fit'?fitLabel(v):v)}</span><small>${products.filter(p=>p[field]===v).length}</small></label>`).join('');
  }
}
function filtered(){
  const q=$('#search').value.toLowerCase().trim();
  const result=products.filter(p=>(!q||[p.name,p.sku,friendly(p.name),p.brand,...p.aliases].join(' ').toLowerCase().includes(q))&&Object.entries(selected).every(([k,vs])=>!vs.size||vs.has(p[k])));
  const sort=$('#sort').value;
  return result.sort((a,b)=>sort==='az'?friendly(a.name).localeCompare(friendly(b.name)):sort==='za'?friendly(b.name).localeCompare(friendly(a.name)):sort==='brand'?a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name):Number(!!b.image)-Number(!!a.image)||a.order-b.order);
}
function render(){
  $('#catalog-heading').textContent=selected.brand.size===1?[...selected.brand][0]+'.':'The full catalog.';
  const result=filtered();
  $('#result-count').textContent=`${result.length} ${result.length===1?'style':'styles'}`;
  const count=Object.values(selected).reduce((n,s)=>n+s.size,0);
  $('#active-filter').textContent=count?`${count} ${count===1?'filter':'filters'} applied`:'';
  $('#grid').innerHTML=result.slice(0,visible).map(p=>`<article class="card"><button class="product-image" data-product="${esc(p.id)}" aria-label="View ${esc(friendly(p.name))}"><span class="image-tag">${esc(p.fit==='General'?p.category:fitLabel(p.fit))}</span>${photo(p)}<span class="quick-arrow" aria-hidden="true">↗</span></button><div class="card-meta"><span>${esc(p.brand)}</span><span>${esc(p.sku)}</span></div><h3><button class="card-title" data-product="${esc(p.id)}">${esc(friendly(p.name))}</button></h3><div class="card-bottom"><span>Request pricing</span><button data-product="${esc(p.id)}">Inquire ↗</button></div></article>`).join('');
  $('#empty').hidden=!!result.length;
  $('#load-more').hidden=result.length<=visible;
  $('#showing').textContent=result.length?`Showing ${Math.min(visible,result.length)} of ${result.length} styles`:'';
}
function resetFilters(){
  Object.values(selected).forEach(s=>s.clear());
  $$('#filters input').forEach(i=>i.checked=false);
  $('#search').value='';visible=24;render();
}
function wireCatalog(){
  $('#grid').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)showProduct(b.dataset.product);});
  $('#search').addEventListener('input',()=>{visible=24;render();});
  $('#sort').addEventListener('change',render);
  $('#filters').addEventListener('change',e=>{const f=e.target.dataset.field;if(f){e.target.checked?selected[f].add(e.target.value):selected[f].delete(e.target.value);visible=24;render();}});
  $('#reset').addEventListener('click',resetFilters);
  $('#empty-reset').addEventListener('click',resetFilters);
  $('#load-more').addEventListener('click',()=>{visible+=24;render();});
  $('#mobile-filters').addEventListener('click',()=>{const open=$('#filters').classList.toggle('open');$('#mobile-filters').setAttribute('aria-expanded',String(open));$('#mobile-filters span').textContent=open?'−':'+';});
  // arriving from a brand card on the home page: catalog.html?brand=Jordan
  const brand=new URLSearchParams(location.search).get('brand');
  if(brand){selected.brand.add(brand);$$('#brands input').forEach(i=>i.checked=i.value===brand);}
}

/* ---------- start ---------- */
buildChrome();
wireChrome();
(async()=>{
  try{
    const [p,c]=await Promise.all([
      fetch('catalog.json').then(r=>{if(!r.ok)throw Error();return r.json();}),
      fetch('config.json').then(r=>r.json()).catch(()=>({}))
    ]);
    products=p.map((v,i)=>({...v,image:v.image&&!/^https?:/.test(v.image)?ASSET_BASE+v.image:v.image,order:i}));
    config={...config,...c};
    inquiry=inquiry.filter((x,i,a)=>products.some(p=>p.id===x.id)&&a.findIndex(y=>y.id===x.id)===i).map(x=>({id:x.id}));
    persist();applyBranding();
    if($('#grid')){initCatalog();wireCatalog();render();}
  }catch{
    persist();applyBranding();
    const rc=$('#result-count');if(rc)rc.textContent='The catalog couldn’t load. Please refresh to try again.';
  }
})();
