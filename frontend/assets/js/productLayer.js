/**
 * Ecoloop Product Layer - GPU-Friendly Animated Product Showcase
 * Additive layer that integrates with existing futuristic background
 */

class EcoloopProductLayer {
    constructor(options = {}) {
        this.options = {
            containerId: 'welcome-panel',
            canvasId: 'ecoloopProductLayer',
            maxItems: this.getMaxItemsByWidth(),
            physics: {
                gravity: 0.35,
                restitution: 0.78,
                friction: 0.98
            },
            rotation: {
                min: -0.02,
                max: 0.02
            },
            ...options
        };

        // Use real database products
        this.products = this.getDatabaseProducts();

        this.canvas = null;
        this.ctx = null;
        this.items = [];
        this.isRunning = false;
        this.animationId = null;
        this.lastTime = 0;
        this.imageCache = new Map();
        this.intersectionObserver = null;
        this.isVisible = true;

        this.init();
    }

    // Get real database products
    getDatabaseProducts() {
        // Try to get from global sampleProducts, otherwise use fallback
        if (typeof sampleProducts !== 'undefined' && sampleProducts.length > 0) {
            return sampleProducts.map((product, index) => ({
                id: product.id || `product-${index + 1}`,
                file: `product-${index + 1}.webp`,
                alt: product.title || `Product ${index + 1}`,
                image: product.image,
                title: product.title,
                price: product.price,
                base64: this.createProductBase64(product.title, index)
            }));
        }
        
        // Fallback products if database not available
        return [
            { id: 'product-01', file: 'product-01.webp', alt: 'Wireless Headphones', base64: this.createProductBase64('Wireless Headphones', 0) },
            { id: 'product-02', file: 'product-02.webp', alt: 'Smartphone', base64: this.createProductBase64('Smartphone', 1) },
            { id: 'product-03', file: 'product-03.webp', alt: 'Laptop', base64: this.createProductBase64('Laptop', 2) },
            { id: 'product-04', file: 'product-04.webp', alt: 'Smartwatch', base64: this.createProductBase64('Smartwatch', 3) },
            { id: 'product-05', file: 'product-05.webp', alt: 'Camera', base64: this.createProductBase64('Camera', 4) },
            { id: 'product-06', file: 'product-06.webp', alt: 'Speaker', base64: this.createProductBase64('Speaker', 5) }
        ];
    }

    // Create product-specific base64 image
    createProductBase64(title, index) {
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff6600', '#0099ff'];
        const icons = ['🎧', '📱', '💻', '⌚', '📷', '🔊'];
        const color = colors[index % colors.length];
        const icon = icons[index % icons.length];
        
        return this.createPlaceholderBase64(color, icon);
    }

    // Get max items based on screen width
    getMaxItemsByWidth() {
        const width = window.innerWidth;
        if (width <= 480) return 3;
        if (width <= 768) return 5;
        return 8;
    }

    // Create placeholder base64 image
    createPlaceholderBase64(color, emoji) {
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = color + '20';
        ctx.fillRect(0, 0, 80, 80);
        
        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 76, 76);
        
        // Emoji/text
        ctx.font = '40px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 40, 40);
        
        return canvas.toDataURL('image/webp', 0.8);
    }

    // Initialize the product layer
    async init() {
        try {
            this.setupCanvas();
            await this.preloadImages();
            this.createItems();
            this.setupIntersectionObserver();
            this.start();
            console.log('🌟 Ecoloop Product Layer initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Product Layer:', error);
            this.fallback();
        }
    }

    // Setup canvas element
    setupCanvas() {
        const container = document.getElementById(this.options.containerId);
        if (!container) {
            throw new Error(`Container with id '${this.options.containerId}' not found`);
        }

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = this.options.canvasId;
        this.canvas.setAttribute('aria-hidden', 'true');
        
        // Position canvas absolutely within container
        container.style.position = 'relative';
        container.appendChild(this.canvas);

        // Setup context
        this.ctx = this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true,
            willReadFrequently: false
        });

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    // Resize canvas to match container
    resizeCanvas() {
        const container = document.getElementById(this.options.containerId);
        if (!container || !this.canvas) return;

        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.ctx.scale(dpr, dpr);
        this.bounds = {
            width: rect.width,
            height: rect.height
        };
    }

    // Preload product images
    async preloadImages() {
        const loadPromises = this.products.map(async (product) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(product.id, img);
                    resolve();
                };
                img.onerror = () => {
                    // Use base64 fallback
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        this.imageCache.set(product.id, fallbackImg);
                        resolve();
                    };
                    fallbackImg.src = product.base64;
                };
                img.src = `assets/products/${product.file}`;
            });
        });

        await Promise.all(loadPromises);
    }

    // Create animated product items
    createItems() {
        for (let i = 0; i < this.options.maxItems; i++) {
            this.items.push(this.createItem());
        }
    }

    // Create single item
    createItem() {
        const product = this.products[Math.floor(Math.random() * this.products.length)];
        const size = this.getItemSize();
        
        return {
            id: Math.random().toString(36).substr(2, 9),
            product: product,
            x: Math.random() * (this.bounds.width - size),
            y: Math.random() * (this.bounds.height * 0.5), // Start in upper half
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2,
            size: size,
            rotation: 0,
            rotationSpeed: this.options.rotation.min + Math.random() * (this.options.rotation.max - this.options.rotation.min),
            scale: 1,
            opacity: 1,
            swapCooldown: 0,
            bounceAnimation: 0
        };
    }

    // Get item size based on screen
    getItemSize() {
        const width = window.innerWidth;
        if (width <= 480) return 35; // Increased from 25
        if (width <= 768) return 45; // Increased from 30
        return 60; // Increased from 40
    }

    // Setup intersection observer for performance
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    this.isVisible = entries[0].isIntersecting;
                    if (this.isVisible && !this.isRunning) {
                        this.start();
                    } else if (!this.isVisible && this.isRunning) {
                        this.pause();
                    }
                },
                { threshold: 0.1 }
            );

            const container = document.getElementById(this.options.containerId);
            if (container) {
                this.intersectionObserver.observe(container);
            }
        }
    }

    // Start animation
    start() {
        if (this.isRunning) return;
        
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('📱 Reduced motion detected, using simplified animation');
            this.options.physics.gravity = 0.1;
            this.options.rotation.max = 0.005;
        }

        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    // Pause animation
    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // Main animation loop
    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap delta time
        this.lastTime = currentTime;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);

        // Update and draw items
        this.items.forEach(item => {
            this.updateItem(item, deltaTime);
            this.drawItem(item);
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // Update item physics
    updateItem(item, deltaTime) {
        const { physics } = this.options;

        // Apply gravity
        item.vy += physics.gravity;

        // Apply friction to horizontal movement
        item.vx *= physics.friction;

        // Update position
        item.x += item.vx;
        item.y += item.vy;

        // Update rotation
        item.rotation += item.rotationSpeed;

        // Update bounce animation
        if (item.bounceAnimation > 0) {
            item.bounceAnimation -= deltaTime;
            item.scale = 1 + Math.sin(item.bounceAnimation * 10) * 0.1;
        } else {
            item.scale = 1;
        }

        // Update swap cooldown
        if (item.swapCooldown > 0) {
            item.swapCooldown -= deltaTime;
        }

        // Boundary collision detection
        this.checkBoundaries(item);
    }

    // Check boundary collisions
    checkBoundaries(item) {
        const { physics } = this.options;
        const halfSize = item.size / 2;

        // Bottom boundary - bounce and swap
        if (item.y + halfSize >= this.bounds.height) {
            item.y = this.bounds.height - halfSize;
            item.vy = -item.vy * physics.restitution;
            
            // Trigger swap effect
            if (item.swapCooldown <= 0) {
                this.swapProduct(item);
                item.swapCooldown = 1; // 1 second cooldown
                item.bounceAnimation = 0.3; // 300ms bounce animation
                this.createSwapParticles(item.x, item.y);
            }
        }

        // Top boundary - bounce
        if (item.y - halfSize <= 0) {
            item.y = halfSize;
            item.vy = Math.abs(item.vy) * physics.restitution;
        }

        // Left boundary - wrap
        if (item.x - halfSize <= 0) {
            item.x = this.bounds.width + halfSize;
        }

        // Right boundary - wrap
        if (item.x + halfSize >= this.bounds.width) {
            item.x = -halfSize;
        }
    }

    // Swap product image
    swapProduct(item) {
        const availableProducts = this.products.filter(p => p.id !== item.product.id);
        const newProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        item.product = newProduct;
        
        // Add slight horizontal nudge to neighbors
        this.items.forEach(otherItem => {
            if (otherItem.id !== item.id) {
                const dx = otherItem.x - item.x;
                const dy = otherItem.y - item.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100 && distance > 0) {
                    const force = 20 / distance;
                    otherItem.vx += (dx / distance) * force;
                    otherItem.vy += (dy / distance) * force;
                }
            }
        });
    }

    // Create swap particle effect
    createSwapParticles(x, y) {
        // For canvas implementation, we'll add this to the draw loop
        // This is a simplified version
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.drawParticle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
            }, i * 50);
        }
    }

    // Draw single particle
    drawParticle(x, y) {
        if (!this.ctx) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        this.ctx.fillStyle = '#00ffff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffff';
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    // Draw item
    drawItem(item) {
        if (!this.ctx) return;

        const img = this.imageCache.get(item.product.id);
        if (!img) return;

        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(item.x, item.y);
        this.ctx.rotate(item.rotation);
        this.ctx.scale(item.scale, item.scale);
        
        // Enhanced drawing style for better visibility
        this.ctx.globalAlpha = item.opacity * 0.9;
        this.ctx.shadowBlur = 20; // Increased from 15
        this.ctx.shadowColor = '#00ffff';
        
        // Draw product image
        const halfSize = item.size / 2;
        this.ctx.drawImage(img, -halfSize, -halfSize, item.size, item.size);
        
        // Enhanced neon border
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2; // Increased from 1
        this.ctx.strokeRect(-halfSize, -halfSize, item.size, item.size);
        
        // Add inner glow
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = item.opacity * 0.5;
        this.ctx.strokeRect(-halfSize + 2, -halfSize + 2, item.size - 4, item.size - 4);
        
        this.ctx.restore();
    }

    // Fallback for non-canvas environments
    fallback() {
        const container = document.getElementById(this.options.containerId);
        if (!container) return;

        const fallback = document.createElement('div');
        fallback.className = 'product-layer-fallback';
        fallback.innerHTML = '🌟';
        fallback.setAttribute('aria-hidden', 'true');
        container.appendChild(fallback);
        
        console.log('🔄 Product Layer fallback activated');
    }

    // Destroy and cleanup
    destroy() {
        this.pause();
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Remove fallback if exists
        const fallback = document.querySelector('.product-layer-fallback');
        if (fallback && fallback.parentNode) {
            fallback.parentNode.removeChild(fallback);
        }
        
        console.log('🗑️ Product Layer destroyed');
    }

    // Public API methods
    updateConfig(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        // Adjust item count if needed
        const targetCount = this.options.maxItems;
        if (this.items.length < targetCount) {
            for (let i = this.items.length; i < targetCount; i++) {
                this.items.push(this.createItem());
            }
        } else if (this.items.length > targetCount) {
            this.items = this.items.slice(0, targetCount);
        }
    }

    // Get performance metrics
    getMetrics() {
        return {
            itemCount: this.items.length,
            isRunning: this.isRunning,
            isVisible: this.isVisible,
            canvasSize: {
                width: this.canvas?.width || 0,
                height: this.canvas?.height || 0
            },
            cachedImages: this.imageCache.size
        };
    }
}

// Auto-initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if container exists and if we should initialize
    const container = document.getElementById('welcome-panel');
    if (container && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            window.ecoloopProductLayer = new EcoloopProductLayer();
        }, 100);
    }
});

// Export for manual initialization
window.EcoloopProductLayer = EcoloopProductLayer;
