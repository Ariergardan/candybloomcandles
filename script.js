let products = [];
let settings = {};
let currentCategory = 'Wszystkie';
let cart = JSON.parse(localStorage.getItem('candy_cart') || '[]');

const money = value => `${Number(value).toFixed(0)} zł`;

async function loadData(){
  const [productsRes, settingsRes] = await Promise.all([
    fetch('/data/products.json?cb=' + Date.now()),
    fetch('/data/settings.json?cb=' + Date.now())
  ]);

  products = (await productsRes.json()).products.filter(p => p.visible !== false);
  settings = await settingsRes.json();

  if (!settings.colorOptions) {
    settings.colorOptions = ['Domyślny (jak na zdjęciu)', 'Zapytaj o kolor'];
  }

  if (!settings.scentOptions.includes('Zapytaj o zapach')) {
    settings.scentOptions.push('Zapytaj o zapach');
  }

  if (!settings.scentPricing) {
    settings.scentPricing = {};
  }

  renderFilters();
  renderProducts();
  renderCart();
}

function getScentExtraPrice(scent, weight){
  if (!scent || scent === 'Bez zapachu' || scent === 'Zapytaj o zapach') return 0;

  const pricing = settings.scentPricing?.[scent];
  if (!pricing) return 0;

  const grams = Number(weight || 0);

  if (grams <= 60) return Number(pricing.upTo60 || 0);
  if (grams <= 120) return Number(pricing.upTo120 || 0);
  return Number(pricing.above120 || 0);
}

function getItemUnitPrice(item){
  return Number(item.price || 0) + getScentExtraPrice(item.scent, item.weight);
}

function getScentLabel(scent, weight){
  const extra = getScentExtraPrice(scent, weight);
  if (scent === 'Bez zapachu') return 'Bez zapachu (+0 zł)';
  if (scent === 'Zapytaj o zapach') return 'Zapytaj o zapach';
  return `${scent} (+${extra} zł)`;
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
      <div class="product-image"><img src="${p.image}" alt="${p.name}" style="object-position:${p.imagePosition || 'center center'}; transform:scale(${p.imageZoom || 1});"></div>
      <div class="product-body">
        <p class="eyebrow">${p.category}</p>
        <h3>${p.name}</h3>
        <p>${p.description || ''}</p>
        <p class="product-weight">⚖️ Waga: ${Number(p.weight || 0)} g</p>
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
      weight: Number(p.weight || 0),
      image: p.image,
      imagePosition: p.imagePosition || 'center center',
      imageZoom: p.imageZoom || 1,
      scent: 'Bez zapachu',
      customScent: '',
      colorChoice: 'Domyślny (jak na zdjęciu)',
      customColor: '',
      qty: 1
    });
  }

  saveCart();
}

function saveCart(shouldRender = true){
  localStorage.setItem('candy_cart', JSON.stringify(cart));
  if (shouldRender) renderCart();
}

function updateCartItem(id, updates, shouldRender = true){
  cart = cart.map(item => item.id == id ? {...item, ...updates} : item);
  saveCart(shouldRender);
}

function updateHiddenOrderFields(){
  const total = cart.reduce((sum,i)=>sum + getItemUnitPrice(i) * i.qty,0);
  document.getElementById('cartTotal').textContent = money(total);

  document.getElementById('cartData').value = cart.map(i => {
    const scentExtra = getScentExtraPrice(i.scent, i.weight);
    const colorText = i.colorChoice === 'Zapytaj o kolor'
      ? `Zapytaj o kolor: ${i.customColor || 'brak wpisanego koloru'}`
      : i.colorChoice;

    const scentText = i.scent === 'Zapytaj o zapach'
      ? `Zapytaj o zapach: ${i.customScent || 'brak wpisanego zapachu'}`
      : `${i.scent} (+${scentExtra} zł)`;

    return `${i.name} | waga: ${i.weight || 0} g | kolor: ${colorText} | zapach: ${scentText} | ilość: ${i.qty} | cena szt.: ${money(getItemUnitPrice(i))} | razem: ${money(getItemUnitPrice(i)*i.qty)}`;
  }).join('\n');

  document.getElementById('cartAmount').value = money(total);
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
      const unitPrice = getItemUnitPrice(i);
      const scentExtra = getScentExtraPrice(i.scent, i.weight);

      return `
        <div class="cart-item premium-cart-item">
          <img class="cart-thumb" src="${i.image || '/assets/images/hero.png'}" alt="${i.name}" style="object-position:${i.imagePosition || 'center center'}; transform:scale(${i.imageZoom || 1});">
          <div class="cart-info">
            <div class="cart-topline">
              <div>
                <strong>${i.name}</strong>
                <small>⚖️ ${i.weight || 0} g<br>Cena bazowa: ${money(i.price)} / szt.</small>
              </div>
              <button class="remove" data-id="${i.id}" type="button">Usuń</button>
            </div>

            <label>🎨 Kolor
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

            <label>🌸 Zapach
              <select class="cart-scent" data-id="${i.id}">
                ${settings.scentOptions.map(s =>
                  `<option value="${s}" ${s===i.scent?'selected':''}>${getScentLabel(s, i.weight)}</option>`
                ).join('')}
              </select>
            </label>

            <label class="custom-field ${showScentInput ? '' : 'hidden-field'}" id="scent-field-${i.id}">
              Jaki zapach Cię interesuje?
              <input class="cart-custom-scent" data-id="${i.id}" value="${i.customScent || ''}" placeholder="Np. wanilia, kokos, truskawka">
            </label>

            <p class="small-note">Dopłata za zapach: <strong>${money(scentExtra)}</strong> · Cena z wybranym zapachem: <strong>${money(unitPrice)}</strong></p>

            <div class="cart-bottomline">
              <div class="qty-box" aria-label="Ilość">
                <button class="minus" data-id="${i.id}" type="button">−</button>
                <span>${i.qty}</span>
                <button class="plus" data-id="${i.id}" type="button">+</button>
              </div>
              <strong>${money(unitPrice*i.qty)}</strong>
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
    input.addEventListener('input', e => {
      updateCartItem(e.target.dataset.id, {customColor: e.target.value}, false);
      updateHiddenOrderFields();
    })
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
    input.addEventListener('input', e => {
      updateCartItem(e.target.dataset.id, {customScent: e.target.value}, false);
      updateHiddenOrderFields();
    })
  );

  updateHiddenOrderFields();
}

function generateOrderNumber(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CB-${year}${month}${day}-${random}`;
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

document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();

  if(!cart.length){
    alert('Dodaj najpierw świecę do koszyka.');
    return;
  }

  const form = e.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const previousButtonText = submitButton ? submitButton.textContent : '';

  const orderNumber = generateOrderNumber();
  const orderNumberField = document.getElementById('orderNumber');
  if(orderNumberField) orderNumberField.value = orderNumber;

  updateHiddenOrderFields();

  const formData = new FormData(form);
  const orderPayload = {
    orderNumber,
    total: document.getElementById('cartAmount').value || '0 zł',
    cartText: document.getElementById('cartData').value || '',
    cartItems: cart,
    customer: {
      name: formData.get('imie_i_nazwisko') || '',
      email: formData.get('email') || '',
      phone: formData.get('telefon') || '',
      address: formData.get('adres_dostawy') || '',
      notes: formData.get('uwagi') || ''
    }
  };

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Wysyłanie zamówienia...';
    }

    const response = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Nie udało się wysłać zamówienia.');
    }

    localStorage.setItem('candy_last_order_number', orderNumber);
    localStorage.setItem('candy_last_order_total', document.getElementById('cartAmount').value || '0 zł');
    localStorage.removeItem('candy_cart');
    cart = [];
    saveCart(false);

    window.location.assign('/dziekujemy.html?nr=' + encodeURIComponent(orderNumber));
  } catch (error) {
    alert(error.message || 'Nie udało się wysłać zamówienia. Spróbuj ponownie albo napisz do nas mailowo.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = previousButtonText;
    }
  }
});

loadData();
