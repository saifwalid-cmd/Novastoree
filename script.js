const API = "https://dummyjson.com/products";
const grid = document.getElementById("productGrid");
const statusBox = document.getElementById("status");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const loadMoreButton = document.getElementById("loadMore");
const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");
const modalBackdrop = document.getElementById("modalBackdrop");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const toast = document.getElementById("toast");

let allProducts = [];
let visibleProducts = [];
let cart = [];
let shownCount = 12;
let searchTimer;

const money = value => `$${Number(value).toFixed(2)}`;
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

async function loadProducts() {
  statusBox.hidden = false;
  statusBox.textContent = "Loading the collection…";
  try {
    // DummyJSON returns 30 items by default; limit=0 asks for all products.
    const response = await fetch(`${API}?limit=0`);
    if (!response.ok) throw new Error("Could not load products.");
    const data = await response.json();
    allProducts = data.products || [];
    fillCategories(allProducts);
    applyFilters();
    statusBox.hidden = true;
  } catch (error) {
    statusBox.hidden = false;
    statusBox.className = "status error";
    statusBox.innerHTML = 'We couldn’t load the products. Check your internet connection and <button class="secondary-button" onclick="loadProducts()">try again</button>.';
    resultCount.textContent = "Connection error";
  }
}

function fillCategories(products) {
  const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort();
  categorySelect.innerHTML = '<option value="">All categories</option>' +
    categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category.replaceAll("-", " "))}</option>`).join("");
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  const sort = sortSelect.value;

  visibleProducts = allProducts.filter(product => {
    const matchesText = !query || `${product.title} ${product.description} ${product.brand || ""} ${product.category}`.toLowerCase().includes(query);
    return matchesText && (!category || product.category === category);
  });

  if (sort === "price-asc") visibleProducts.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") visibleProducts.sort((a, b) => b.price - a.price);
  if (sort === "rating") visibleProducts.sort((a, b) => b.rating - a.rating);
  if (sort === "title") visibleProducts.sort((a, b) => a.title.localeCompare(b.title));

  shownCount = 12;
  renderProducts();
}

function renderProducts() {
  const products = visibleProducts.slice(0, shownCount);
  resultCount.textContent = `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} found`;
  grid.innerHTML = products.map(product => {
    const discount = Math.round(product.discountPercentage || 0);
    const image = product.thumbnail || (product.images && product.images[0]) || "";
    return `
      <article class="product-card">
        <div class="product-image-wrap">
          ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ""}
          <img src="${escapeHTML(image)}" alt="${escapeHTML(product.title)}" loading="lazy" onerror="this.style.opacity='.2'">
          <button class="quick-add" data-add="${product.id}">＋ Add to bag</button>
        </div>
        <div class="product-info">
          <div class="product-category">${escapeHTML((product.category || "General").replaceAll("-", " "))}</div>
          <h3 class="product-title" title="${escapeHTML(product.title)}">${escapeHTML(product.title)}</h3>
          <div class="product-bottom"><span class="price">${money(product.price)}</span><span class="rating"><span>★</span> ${Number(product.rating || 0).toFixed(1)}</span></div>
        </div>
      </article>`;
  }).join("");

  if (!products.length) {
    grid.innerHTML = "";
    statusBox.hidden = false;
    statusBox.className = "status";
    statusBox.textContent = "No products found. Try another search or category.";
  } else {
    statusBox.hidden = true;
  }
  loadMoreButton.hidden = shownCount >= visibleProducts.length || visibleProducts.length === 0;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

function addToCart(productId) {
  const product = allProducts.find(item => item.id === Number(productId));
  if (!product) return;
  const item = cart.find(item => item.id === product.id);
  if (item) item.quantity++;
  else cart.push({ ...product, quantity: 1 });
  updateCart();
  showToast(`${product.title} added to your bag`);
}

function changeQuantity(productId, amount) {
  const item = cart.find(item => item.id === Number(productId));
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(product => product.id !== Number(productId));
  updateCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== Number(productId));
  updateCart();
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartCount.textContent = count;
  cartTotal.textContent = money(total);

  if (!cart.length) {
    cartItems.innerHTML = '<p class="empty-cart">Your bag is empty for now.</p>';
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <article class="cart-item">
      <img src="${escapeHTML(item.thumbnail || "")}" alt="${escapeHTML(item.title)}">
      <div>
        <h3>${escapeHTML(item.title)}</h3><p>${money(item.price)}</p>
        <div class="qty-control">
          <button data-qty="${item.id}" data-change="-1" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button data-qty="${item.id}" data-change="1" aria-label="Increase quantity">＋</button>
        </div>
        <button class="remove-item" data-remove="${item.id}">Remove</button>
      </div>
      <strong style="font-size:12px">${money(item.price * item.quantity)}</strong>
    </article>`).join("");
}

function openCart() {
  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  modalBackdrop.classList.remove("open");
  document.body.style.overflow = "";
}

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});
cartItems.addEventListener("click", event => {
  const qtyButton = event.target.closest("[data-qty]");
  const removeButton = event.target.closest("[data-remove]");
  if (qtyButton) changeQuantity(qtyButton.dataset.qty, Number(qtyButton.dataset.change));
  if (removeButton) removeFromCart(removeButton.dataset.remove);
});

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 180);
});
categorySelect.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);
loadMoreButton.addEventListener("click", () => {
  shownCount += 12;
  renderProducts();
});
cartButton.addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
modalBackdrop.addEventListener("click", event => {
  if (event.target === modalBackdrop) closeCart();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCart();
});
document.getElementById("checkoutButton").addEventListener("click", () => {
  showToast(cart.length ? "Checkout is a demo — no payment was taken." : "Your bag is empty.");
});

loadProducts();
