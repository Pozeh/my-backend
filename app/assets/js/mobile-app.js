// Mobile App JavaScript for EcoLoop Kenya
// Optimized for Android WebView

// ===== GLOBAL VARIABLES =====
const API_BASE_URL = window.location.origin;
let cartItems = [];
let wishlistItems = [];
let currentUser = null;
let products = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check for existing user session
    checkUserSession();
    
    // Load initial data
    loadProducts();
    updateCartCount();
    
    // Initialize mobile-specific features
    initializeMobileFeatures();
    
    // Setup WebView specific optimizations
    setupWebViewOptimizations();
}

// ===== WEBVIEW OPTIMIZATIONS =====
function setupWebViewOptimizations() {
    // Prevent double-tap zoom
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    });
    
    // Fix viewport issues
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover'
        );
    }
    
    // Prevent pull-to-refresh
    document.body.addEventListener('touchmove', function(e) {
        if (e.target === document.body) {
            e.preventDefault();
        }
    }, { passive: false });
}

// ===== MOBILE FEATURES =====
function initializeMobileFeatures() {
    // Setup swipe gestures for product cards
    setupSwipeGestures();
    
    // Setup touch feedback
    setupTouchFeedback();
    
    // Initialize animations
    initializeAnimations();
}

function setupSwipeGestures() {
    const productCards = document.querySelectorAll('.mobile-product-card');
    
    productCards.forEach(card => {
        let startX = 0;
        let startY = 0;
        
        card.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        card.addEventListener('touchend', function(e) {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Detect swipe left for wishlist
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX < 0) {
                    addToWishlist(card.dataset.productId);
                }
            }
        }, { passive: true });
    });
}

function setupTouchFeedback() {
    const buttons = document.querySelectorAll('.mobile-icon-btn, .mobile-action-btn, .mobile-cta-button');
    
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// ===== USER AUTHENTICATION =====
function checkUserSession() {
    const token = Cookies.get('auth_token');
    if (token) {
        // Verify token with backend
        fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                currentUser = data.user;
                updateUserInterface();
            }
        })
        .catch(error => {
            console.error('Session verification failed:', error);
            Cookies.remove('auth_token');
        });
    }
}

function updateUserInterface() {
    if (currentUser) {
        // Update UI for logged-in user
        const loginBtn = document.querySelector('.mobile-login-btn');
        if (loginBtn) {
            loginBtn.textContent = currentUser.name || 'Account';
            loginBtn.onclick = showUserDashboard;
        }
    }
}

// ===== PRODUCT MANAGEMENT =====
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Failed to load products:', error);
        renderFallbackProducts();
    }
}

function renderProducts() {
    const grid = document.getElementById('mobileProductsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    products.slice(0, 6).forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'mobile-product-card';
    card.dataset.productId = product.id;
    
    card.innerHTML = `
        <div class="mobile-product-image">
            <img src="${product.image || 'assets/images/placeholder-product.jpg'}" 
                 alt="${product.name}" 
                 onerror="this.src='assets/images/placeholder-product.jpg'">
        </div>
        <div class="mobile-product-info">
            <h3 class="mobile-product-name">${product.name}</h3>
            <div class="mobile-product-price">KES ${product.price}</div>
            <p class="mobile-product-description">${product.description || 'Eco-friendly product'}</p>
            <div class="mobile-product-actions">
                <button class="mobile-view-btn" onclick="viewProduct('${product.id}')">
                    View Details
                </button>
                <button class="mobile-wishlist-btn" onclick="toggleWishlist('${product.id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function renderFallbackProducts() {
    const fallbackProducts = [
        {
            id: '1',
            name: 'Wireless Headphones',
            price: '2,500',
            description: 'Eco-friendly wireless headphones with noise cancellation',
            image: 'assets/images/headphones.jpg'
        },
        {
            id: '2',
            name: 'Smart Watch',
            price: '3,200',
            description: 'Sustainable smartwatch with health tracking',
            image: 'assets/images/smartwatch.jpg'
        },
        {
            id: '3',
            name: 'Running Shoes',
            price: '1,800',
            description: 'Recycled material running shoes',
            image: 'assets/images/shoes.jpg'
        }
    ];
    
    products = fallbackProducts;
    renderProducts();
}

// ===== CART FUNCTIONALITY =====
function openCart() {
    showMobileModal('Shopping Cart', renderCartContent());
}

function renderCartContent() {
    if (cartItems.length === 0) {
        return `
            <div class="mobile-empty-cart">
                <i class="fas fa-shopping-cart" style="font-size: 48px; color: #ccc;"></i>
                <p>Your cart is empty</p>
                <button class="mobile-action-btn primary" onclick="closeMobileModal()">
                    Continue Shopping
                </button>
            </div>
        `;
    }
    
    let cartHTML = '<div class="mobile-cart-items">';
    
    cartItems.forEach(item => {
        cartHTML += `
            <div class="mobile-cart-item">
                <div class="mobile-cart-item-info">
                    <h4>${item.name}</h4>
                    <p>KES ${item.price}</p>
                </div>
                <div class="mobile-cart-item-actions">
                    <button onclick="removeFromCart('${item.id}')" class="mobile-remove-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartHTML += '</div>';
    cartHTML += `
        <div class="mobile-cart-summary">
            <div class="mobile-cart-total">
                <strong>Total: KES ${calculateCartTotal()}</strong>
            </div>
            <button class="mobile-action-btn primary" onclick="checkout()">
                Checkout
            </button>
        </div>
    `;
    
    return cartHTML;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product && !cartItems.find(item => item.id === productId)) {
        cartItems.push(product);
        updateCartCount();
        showToast('Product added to cart');
    }
}

function removeFromCart(productId) {
    cartItems = cartItems.filter(item => item.id !== productId);
    updateCartCount();
    openCart(); // Refresh cart view
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cartItems.length;
    }
}

function calculateCartTotal() {
    return cartItems.reduce((total, item) => {
        const price = parseFloat(item.price.replace(',', ''));
        return total + price;
    }, 0).toLocaleString();
}

// ===== WISHLIST FUNCTIONALITY =====
function addToWishlist(productId) {
    const product = products.find(p => p.id === productId);
    if (product && !wishlistItems.find(item => item.id === productId)) {
        wishlistItems.push(product);
        showToast('Added to wishlist');
    }
}

function toggleWishlist(productId) {
    const index = wishlistItems.findIndex(item => item.id === productId);
    if (index > -1) {
        wishlistItems.splice(index, 1);
        showToast('Removed from wishlist');
    } else {
        addToWishlist(productId);
    }
}

// ===== SEARCH FUNCTIONALITY =====
function performSearch(event) {
    event.preventDefault();
    const searchTerm = document.getElementById('mobileSearchInput').value;
    const category = document.getElementById('mobileCategorySelect').value;
    
    // Filter products based on search
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !category || product.category === category;
        return matchesSearch && matchesCategory;
    });
    
    // Render filtered products
    renderFilteredProducts(filteredProducts);
}

function renderFilteredProducts(filteredProducts) {
    const grid = document.getElementById('mobileProductsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="mobile-no-results">
                <i class="fas fa-search" style="font-size: 48px; color: #ccc;"></i>
                <p>No products found</p>
            </div>
        `;
        return;
    }
    
    filteredProducts.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// ===== CATEGORY BROWSING =====
function browseCategory(category) {
    const categoryProducts = products.filter(product => product.category === category);
    renderFilteredProducts(categoryProducts);
    
    // Scroll to products section
    document.getElementById('mobileProductsSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// ===== MODAL SYSTEM =====
function showMobileModal(title, content) {
    const modalContainer = document.getElementById('mobileModalsContainer');
    
    const modalHTML = `
        <div class="mobile-modal" id="mobileModal">
            <div class="mobile-modal-content">
                <div class="mobile-modal-header">
                    <h2 class="mobile-modal-title">${title}</h2>
                    <button class="mobile-modal-close" onclick="closeMobileModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mobile-modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    modalContainer.innerHTML = modalHTML;
    
    // Add modal open animation
    setTimeout(() => {
        document.getElementById('mobileModal').classList.add('modal-open');
    }, 10);
}

function closeMobileModal() {
    const modal = document.getElementById('mobileModal');
    if (modal) {
        modal.classList.remove('modal-open');
        setTimeout(() => {
            document.getElementById('mobileModalsContainer').innerHTML = '';
        }, 300);
    }
}

// ===== AUTHENTICATION MODALS =====
function showLoginModal() {
    const loginContent = `
        <form class="mobile-auth-form" onsubmit="handleLogin(event)">
            <div class="mobile-form-group">
                <label>Email</label>
                <input type="email" name="email" required class="mobile-input">
            </div>
            <div class="mobile-form-group">
                <label>Password</label>
                <input type="password" name="password" required class="mobile-input">
            </div>
            <button type="submit" class="mobile-action-btn primary">
                Login
            </button>
            <p class="mobile-auth-link">
                Don't have an account? 
                <a href="#" onclick="showRegisterModal()">Register</a>
            </p>
        </form>
    `;
    
    showMobileModal('Login', loginContent);
}

function showRegisterModal() {
    const registerContent = `
        <form class="mobile-auth-form" onsubmit="handleRegister(event)">
            <div class="mobile-form-group">
                <label>Full Name</label>
                <input type="text" name="name" required class="mobile-input">
            </div>
            <div class="mobile-form-group">
                <label>Email</label>
                <input type="email" name="email" required class="mobile-input">
            </div>
            <div class="mobile-form-group">
                <label>Password</label>
                <input type="password" name="password" required class="mobile-input">
            </div>
            <button type="submit" class="mobile-action-btn primary">
                Register
            </button>
            <p class="mobile-auth-link">
                Already have an account? 
                <a href="#" onclick="showLoginModal()">Login</a>
            </p>
        </form>
    `;
    
    showMobileModal('Register', registerContent);
}

function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    // Send login request to backend
    fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password')
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Cookies.set('auth_token', data.token, { expires: 7 });
            currentUser = data.user;
            updateUserInterface();
            closeMobileModal();
            showToast('Login successful');
        } else {
            showToast(data.message || 'Login failed');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.');
    });
}

// ===== NAVIGATION FUNCTIONS =====
function scrollToProducts() {
    document.getElementById('mobileProductsSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function openMessages() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showMobileModal('Messages', '<p>No new messages</p>');
}

function showContactInfo() {
    const contactContent = `
        <div class="mobile-contact-info">
            <div class="mobile-contact-item">
                <i class="fas fa-phone"></i>
                <span>+254 700 123 456</span>
            </div>
            <div class="mobile-contact-item">
                <i class="fas fa-envelope"></i>
                <span>info@ecoloop.co.ke</span>
            </div>
            <div class="mobile-contact-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>Nairobi, Kenya</span>
            </div>
        </div>
    `;
    
    showMobileModal('Contact Us', contactContent);
}

function openSellerDashboard() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Scroll to seller dashboard section
    document.getElementById('mobileSellerSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function openAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') {
        showMobileModal('Access Denied', '<p>Admin access required</p>');
        return;
    }
    
    window.location.href = 'admin/index.html';
}

function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const productContent = `
        <div class="mobile-product-detail">
            <div class="mobile-product-image">
                <img src="${product.image || 'assets/images/placeholder-product.jpg'}" 
                     alt="${product.name}">
            </div>
            <h2>${product.name}</h2>
            <div class="mobile-product-price">KES ${product.price}</div>
            <p>${product.description || 'Eco-friendly product'}</p>
            <div class="mobile-product-actions">
                <button class="mobile-action-btn primary" onclick="addToCart('${product.id}')">
                    <i class="fas fa-cart-plus"></i>
                    Add to Cart
                </button>
                <button class="mobile-action-btn secondary" onclick="toggleWishlist('${product.id}')">
                    <i class="fas fa-heart"></i>
                    Wishlist
                </button>
            </div>
        </div>
    `;
    
    showMobileModal(product.name, productContent);
}

// ===== DASHBOARD FUNCTIONS =====
function openFullDashboard() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showMobileModal('Dashboard', '<p>Full dashboard coming soon</p>');
}

function addNewProduct() {
    if (!currentUser || currentUser.role !== 'seller') {
        showMobileModal('Access Denied', '<p>Seller access required</p>');
        return;
    }
    showMobileModal('Add Product', '<p>Add product form coming soon</p>');
}

function viewOrders() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showMobileModal('Orders', '<p>No orders yet</p>');
}

function learnMoreAboutNyumbaSure() {
    const nyumbasureContent = `
        <div class="mobile-nyumbasure-info">
            <h3>NyumbaSure Protection</h3>
            <p>Shop with confidence knowing that all your purchases are protected:</p>
            <ul>
                <li>Secure payment processing</li>
                <li>Quality guarantee</li>
                <li>Fast dispute resolution</li>
                <li>Delivery tracking</li>
            </ul>
            <p>Buy with peace of mind on EcoLoop Kenya!</p>
        </div>
    `;
    
    showMobileModal('NyumbaSure Protection', nyumbasureContent);
}

// ===== UTILITY FUNCTIONS =====
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        z-index: 3000;
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

function loadMoreProducts() {
    // Load more products (pagination)
    showToast('Loading more products...');
}

function checkout() {
    if (cartItems.length === 0) {
        showToast('Your cart is empty');
        return;
    }
    
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    showMobileModal('Checkout', '<p>Checkout process coming soon</p>');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('mobile-modal')) {
        closeMobileModal();
    }
});

// Handle browser back button for modals
window.addEventListener('popstate', function() {
    closeMobileModal();
});
