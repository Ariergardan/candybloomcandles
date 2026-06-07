let products = [];
let settings = {};
let currentCategory = 'Wszystkie';
let cart = JSON.parse(localStorage.getItem('candy_cart') || '[]');

const money = value => `${Number(value).toFixed(0)} zł`;

async function loadData(){
  const [productsRes, settingsRes] = await Promise.all([
    fetch('/data/products.json'),
    fetch('/data/settings.json')
  ]);

  products = (await productsRes.json()).products.filter(p => p.visible !== false);
  settings = await settingsRes.json();

  if (!settings.colorOptions) {
    settings.colorOptions = ['Domyślny (jak na zdjęciu)', 'Zapytaj o kolor'];
  }

  if (!settings.scentOptions.includes('Zapytaj o zapach')) {
    settings.scentOptions.push('Zapytaj o zapach');
  }

  renderFilters();
  renderProducts();
  renderCart();
}

function renderFilters(){
  const wrap = document.getElementById('categoryFilters');
  const cats = ['Wszystkie', ...settings.categories];

  wrap.innerHTML = cats
    .map(c => `<button class="filter ${c===currentCategory?'active':''}" data-cat="${c}">${c}</button>`)
    .join('');

  wrap.querySelectorAll('button').forEach(btn =>
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderFilters();
      renderProducts();
    })
  );
}

function renderProducts(){
  const grid = document.getElementById('productsGrid');
  const filtered = currentCategory === 'Wszystkie'
    ? products
    : products.filter(p => p.category === currentCategory);

  grid.innerHTML = filtered.map((p) => `
    <article class="product">
      <div class="product-image"><img src="${p.image}" alt="${p.name}"></div>
      <div class="product-body">
        <p class="eyebrow">${p.category}</p>
        <h3>${p.name}</h3>
        <p>${p.description || ''}</p>
        <div class="product-footer">
          <div class="price">${money(p.price)}</div>
          <button class="add" data-index="${products.indexOf(p)}">Dodaj do koszyka</button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.add').forEach(btn => btn.addEventListener('click', addToCart));
}

function addToCart(e){
  const p = products[e.target.dataset.index];

  const existing = cart.find(item =>
    item.name === p.name &&
    item.scent === 'Bez zapachu' &&
    item.colorChoice === 'Domyślny (jak na zdjęciu)' &&
    !item.customColor &&
    !item.customScent
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: Date.now(),
      name: p.name,
      price: Number(p.price),
      image: p.image,
      scent: 'Bez zapachu',
      customScent: '',
      colorChoice: 'Domyślny (jak na zdjęciu)',
      customColor: '',
      qty: 1
    });
  }

  saveCart();
  openCart();
}

function saveCart(){
  localStorage.setItem('candy_cart', JSON.stringify(cart));
  renderCart();
}

function updateCartItem(id, updates){
  cart = cart.map(item => item.id == id ? {...item, ...updates} : item);
  saveCart();
}

function renderCart(){
  document.getElementById('cartCount').textContent = cart.reduce((sum,i)=>sum+i.qty,0);
  const items = document.getElementById('cartItems');

  if(!cart.length){
    items.innerHTML = '<p class="small-note">Koszyk jest pusty.</p>';
  } else {
    items.innerHTML = cart.map(i => {
      const showColorInput = i.colorChoice === 'Zapytaj o kolor';
      const showScentInput = i.scent === 'Zapytaj o zapach';

      return `
        <div class="cart-item premium-cart-item">
          <img class="cart-thumb" src="${i.image || '/assets/images/hero.png'}" alt="${i.name}">
          <div class="cart-info">
            <div class="cart-topline">
              <div>
                <strong>${i.name}</strong>
                <small>${money(i.price)} / szt.</small>
              </div>
              <button class="remove" data-id="${i.id}" type="button">Usuń</button>
            </div>

            <label>Kolor
              <select class="cart-color-choice" data-id="${i.id}">
                ${(settings.colorOptions || ['Domyślny (jak na zdjęciu)', 'Zapytaj o kolor']).map(option =>
                  `<option ${option===i.colorChoice?'selected':''}>${option}</option>`
                ).join('')}
              </select>
            </label>

            <label class="custom-field ${showColorInput ? '' : 'hidden-field'}" id="color-field-${i.id}">
              Jaki kolor Cię interesuje?
              <input class="cart-custom-color" data-id="${i.id}" value="${i.customColor || ''}" placeholder="Np. niebieski, różowy, czerwony">
            </label>

            <label>Zapach
              <select class="cart-scent" data-id="${i.id}">
                ${settings.scentOptions.map(s =>
                  `<option ${s===i.scent?'selected':''}>${s}</option>`
                ).join('')}
              </select>
            </label>

            <label class="custom-field ${showScentInput ? '' : 'hidden-field'}" id="scent-field-${i.id}">
              Jaki zapach Cię interesuje?
              <input class="cart-custom-scent" data-id="${i.id}" value="${i.customScent || ''}" placeholder="Np. wanilia, kokos, truskawka">
            </label>

            <div class="cart-bottomline">
              <div class="qty-box" aria-label="Ilość">
                <button class="minus" data-id="${i.id}" type="button">−</button>
                <span>${i.qty}</span>
                <button class="plus" data-id="${i.id}" type="button">+</button>
              </div>
              <strong>${money(i.price*i.qty)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  items.querySelectorAll('.remove').forEach(btn =>
    btn.addEventListener('click', () => {
      cart = cart.filter(i => i.id != btn.dataset.id);
      saveCart();
    })
  );

  items.querySelectorAll('.plus').forEach(btn =>
    btn.addEventListener('click', () => {
      const item = cart.find(i => i.id == btn.dataset.id);
      if(item) updateCartItem(item.id, {qty: item.qty + 1});
    })
  );

  items.querySelectorAll('.minus').forEach(btn =>
    btn.addEventListener('click', () => {
      const item = cart.find(i => i.id == btn.dataset.id);
      if(!item) return;
      if(item.qty <= 1){
        cart = cart.filter(i => i.id != item.id);
        saveCart();
      } else {
        updateCartItem(item.id, {qty: item.qty - 1});
      }
    })
  );

  items.querySelectorAll('.cart-color-choice').forEach(select =>
    select.addEventListener('change', e => {
      const customColor = e.target.value === 'Zapytaj o kolor'
        ? (cart.find(i => i.id == e.target.dataset.id)?.customColor || '')
        : '';
      updateCartItem(e.target.dataset.id, {colorChoice: e.target.value, customColor});
    })
  );

  items.querySelectorAll('.cart-custom-color').forEach(input =>
    input.addEventListener('input', e =>
      updateCartItem(e.target.dataset.id, {customColor: e.target.value})
    )
  );

  items.querySelectorAll('.cart-scent').forEach(select =>
    select.addEventListener('change', e => {
      const customScent = e.target.value === 'Zapytaj o zapach'
        ? (cart.find(i => i.id == e.target.dataset.id)?.customScent || '')
        : '';
      updateCartItem(e.target.dataset.id, {scent: e.target.value, customScent});
    })
  );

  items.querySelectorAll('.cart-custom-scent').forEach(input =>
    input.addEventListener('input', e =>
      updateCartItem(e.target.dataset.id, {customScent: e.target.value})
    )
  );

  const total = cart.reduce((sum,i)=>sum+i.price*i.qty,0);
  document.getElementById('cartTotal').textContent = money(total);

  document.getElementById('cartData').value = cart.map(i => {
    const colorText = i.colorChoice === 'Zapytaj o kolor'
      ? `Zapytaj o kolor: ${i.customColor || 'brak wpisanego koloru'}`
      : i.colorChoice;

    const scentText = i.scent === 'Zapytaj o zapach'
      ? `Zapytaj o zapach: ${i.customScent || 'brak wpisanego zapachu'}`
      : i.scent;

    return `${i.name} | kolor: ${colorText} | zapach: ${scentText} | ilość: ${i.qty} | cena: ${money(i.price*i.qty)}`;
  }).join('\n');

  document.getElementById('cartAmount').value = money(total);
}

function openCart(){
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartPanel').setAttribute('aria-hidden','false');
}

function closeCart(){
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartPanel').setAttribute('aria-hidden','true');
}

document.getElementById('openCart').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);

document.getElementById('orderForm').addEventListener('submit', e => {
  if(!cart.length){
    e.preventDefault();
    alert('Dodaj najpierw świecę do koszyka.');
    return;
  }

  renderCart();
  localStorage.removeItem('candy_cart');
});

loadData();
