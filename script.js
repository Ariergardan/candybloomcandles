let products = [];
let settings = {};
let currentCategory = 'Wszystkie';
let cart = JSON.parse(localStorage.getItem('candy_cart') || '[]');
const money = value => `${Number(value).toFixed(0)} zł`;

async function loadData(){
  const [productsRes, settingsRes] = await Promise.all([fetch('/data/products.json'), fetch('/data/settings.json')]);
  products = (await productsRes.json()).products.filter(p => p.visible !== false);
  settings = await settingsRes.json();
  renderFilters();
  renderProducts();
  renderCart();
}
function renderFilters(){
  const wrap = document.getElementById('categoryFilters');
  const cats = ['Wszystkie', ...settings.categories];
  wrap.innerHTML = cats.map(c => `<button class="filter ${c===currentCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');
  wrap.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {currentCategory = btn.dataset.cat; renderFilters(); renderProducts();}));
}
function renderProducts(){
  const grid = document.getElementById('productsGrid');
  const filtered = currentCategory === 'Wszystkie' ? products : products.filter(p => p.category === currentCategory);
  grid.innerHTML = filtered.map((p,i) => `
    <article class="product">
      <div class="product-image"><img src="${p.image}" alt="${p.name}"></div>
      <div class="product-body">
        <p class="eyebrow">${p.category}</p>
        <h3>${p.name}</h3>
        <p>${p.description || ''}</p>
        <div class="price">${money(p.price)}</div>
        <label>Zapach
          <select id="scent-${i}">${settings.scentOptions.map(s => `<option>${s}</option>`).join('')}</select>
        </label>
        <label>Kolor na zamówienie
          <input id="color-${i}" placeholder="Np. kremowy, pudrowy róż, beżowy">
        </label>
        <label>Ilość
          <input id="qty-${i}" type="number" min="1" value="1">
        </label>
        <button class="add" data-index="${products.indexOf(p)}" data-local="${i}">Dodaj do koszyka</button>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.add').forEach(btn => btn.addEventListener('click', addToCart));
}
function addToCart(e){
  const local = e.target.dataset.local;
  const p = products[e.target.dataset.index];
  const item = {id: Date.now(), name:p.name, price:Number(p.price), scent:document.getElementById(`scent-${local}`).value, color:document.getElementById(`color-${local}`).value || 'Do ustalenia', qty:Number(document.getElementById(`qty-${local}`).value || 1)};
  cart.push(item); saveCart(); openCart();
}
function saveCart(){localStorage.setItem('candy_cart', JSON.stringify(cart)); renderCart();}
function renderCart(){
  document.getElementById('cartCount').textContent = cart.reduce((sum,i)=>sum+i.qty,0);
  const items = document.getElementById('cartItems');
  if(!cart.length){items.innerHTML='<p class="small-note">Koszyk jest pusty.</p>';} else {
    items.innerHTML = cart.map(i => `<div class="cart-item"><div><strong>${i.name}</strong><small>Zapach: ${i.scent}<br>Kolor: ${i.color}<br>Ilość: ${i.qty}</small></div><div><strong>${money(i.price*i.qty)}</strong><br><button class="remove" data-id="${i.id}">Usuń</button></div></div>`).join('');
  }
  items.querySelectorAll('.remove').forEach(btn => btn.addEventListener('click', ()=>{cart=cart.filter(i=>i.id != btn.dataset.id); saveCart();}));
  const total = cart.reduce((sum,i)=>sum+i.price*i.qty,0);
  document.getElementById('cartTotal').textContent = money(total);
  document.getElementById('cartData').value = cart.map(i => `${i.name} | zapach: ${i.scent} | kolor: ${i.color} | ilość: ${i.qty} | cena: ${money(i.price*i.qty)}`).join('\n');
  document.getElementById('cartAmount').value = money(total);
}
function openCart(){document.getElementById('cartPanel').classList.add('open');document.getElementById('cartPanel').setAttribute('aria-hidden','false')}
function closeCart(){document.getElementById('cartPanel').classList.remove('open');document.getElementById('cartPanel').setAttribute('aria-hidden','true')}
document.getElementById('openCart').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('orderForm').addEventListener('submit', e => { if(!cart.length){ e.preventDefault(); alert('Dodaj najpierw świecę do koszyka.'); } else { renderCart(); localStorage.removeItem('candy_cart'); }});
loadData();
