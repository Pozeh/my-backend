/* ========================================
   SAMSUNG GALAXY A16 MOBILE RESTRUCTURING JAVASCRIPT
   ========================================
   Baseline: 720px visible height
   Dynamic scaling and viewport calculations
   Automatic content fitting and animation scaling
   ======================================== */

class GalaxyA16MobileRestructuring {
    constructor() {
        // Galaxy A16 baseline specifications
        this.galaxyA16Height = 720; // Baseline height in pixels
        this.currentViewportHeight = window.innerHeight;
        this.mobileBreakpoint = 768;
        
        // Component heights
        this.headerHeight = 48;
        this.footerHeight = 36;
        this.contentHeight = 0;
        
        // Scaling factors
        this.scaleFactor = 1;
        this.animationScale = 0.6;
        
        this.init();
    }
    
    init() {
        // Only apply on mobile view
        if (window.innerWidth <= this.mobileBreakpoint) {
            this.setupGalaxyA16Optimization();
            this.handleResize();
            this.handleOrientationChange();
            this.setupContentWrapping();
            this.initializeDynamicScaling();
            this.optimizeAnimations();
        }
    }
    
    setupGalaxyA16Optimization() {
        // Add Galaxy A16 optimization class
        document.body.classList.add('galaxy-a16-optimized');
        
        // Calculate initial scaling
        this.calculateScaling();
        
        // Setup fixed layout structure
        this.setupFixedLayout();
        
        // Apply Galaxy A16 specific styles
        this.applyGalaxyA16Styles();
        
        // Initialize viewport safety checks
        this.initializeViewportSafety();
        
        console.log(`Galaxy A16 Optimization: Viewport ${this.currentViewportHeight}px, Scale ${this.scaleFactor}`);
    }
    
    calculateScaling() {
        this.currentViewportHeight = window.innerHeight;
        
        // Calculate scaling factor based on Galaxy A16 baseline
        this.scaleFactor = Math.min(1, this.currentViewportHeight / this.galaxyA16Height);
        
        // Calculate available content height
        this.contentHeight = this.currentViewportHeight - this.headerHeight - this.footerHeight;
        
        // Adjust animation scale based on viewport
        this.animationScale = Math.max(0.4, Math.min(0.8, this.scaleFactor * 0.6));
        
        // Update CSS custom properties
        this.updateCSSVariables();
        
        // Log scaling information
        console.log(`Galaxy A16 Scaling: Factor=${this.scaleFactor.toFixed(2)}, Content Height=${this.contentHeight}px`);
    }
    
    updateCSSVariables() {
        // Update root CSS variables with calculated values
        document.documentElement.style.setProperty("--current-viewport-height", `${this.currentViewportHeight}px`);
        document.documentElement.style.setProperty("--mobile-scale-factor", this.scaleFactor);
        document.documentElement.style.setProperty("--available-content-height", `${this.contentHeight}px`);
        document.documentElement.style.setProperty("--animation-scale", this.animationScale);
        
        // Update component heights
        document.documentElement.style.setProperty("--compact-header-height", `${this.headerHeight}px`);
        document.documentElement.style.setProperty("--compact-footer-height", `${this.footerHeight}px`);
        
        // Calculate and set animation height
        const animationHeight = Math.max(20, Math.min(30, this.contentHeight * 0.08));
        document.documentElement.style.setProperty("--animation-height", `${animationHeight}px`);
    }
    
    setupFixedLayout() {
        // Check if layout wrapper already exists
        if (document.querySelector('.mobile-main-content')) {
            return;
        }
        
        // Create main content wrapper
        const mainContent = document.createElement('div');
        mainContent.className = 'mobile-main-content';
        mainContent.setAttribute('data-galaxy-a16', 'true');
        
        // Get header and footer
        const header = document.querySelector('.mobile-header, header, .header');
        const footer = document.querySelector('.mobile-footer, footer, .footer');
        
        // Insert main content after header
        if (header) {
            header.insertAdjacentElement('afterend', mainContent);
        } else {
            // Fallback: insert at beginning of body
            document.body.insertBefore(mainContent, document.body.firstChild);
        }
        
        // Move all content between header and footer to main content
        this.moveContentToMainArea();
        
        // Update body spacing
        this.updateBodySpacing();
    }
    
    moveContentToMainArea() {
        const mainContent = document.querySelector('.mobile-main-content');
        if (!mainContent) return;
        
        const header = document.querySelector('.mobile-header, header, .header');
        const footer = document.querySelector('.mobile-footer, footer, .footer');
        
        // Get all elements that should be in the main content area
        const allElements = document.body.children;
        const elementsToMove = [];
        
        for (let element of allElements) {
            // Skip if it's the main content itself
            if (element === mainContent) continue;
            
            // Skip if it's the header
            if (header && (element === header || header.contains(element))) continue;
            
            // Skip if it's the footer
            if (footer && (element === footer || footer.contains(element))) continue;
            
            // Skip scripts and meta tags
            if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || element.tagName === 'META' || element.tagName === 'LINK') continue;
            
            elementsToMove.push(element);
        }
        
        // Move elements to main content
        elementsToMove.forEach(element => {
            mainContent.appendChild(element);
        });
    }
    
    updateBodySpacing() {
        const header = document.querySelector('.mobile-header, header, .header');
        const footer = document.querySelector('.mobile-footer, footer, .footer');
        
        if (header && footer) {
            const actualHeaderHeight = header.offsetHeight || this.headerHeight;
            const actualFooterHeight = footer.offsetHeight || this.footerHeight;
            
            // Update CSS custom properties with actual heights
            document.documentElement.style.setProperty("--compact-header-height", `${actualHeaderHeight}px`);
            document.documentElement.style.setProperty("--compact-footer-height", `${actualFooterHeight}px`);
            
            // Recalculate content height
            const newContentHeight = this.currentViewportHeight - actualHeaderHeight - actualFooterHeight;
            document.documentElement.style.setProperty("--available-content-height", `${newContentHeight}px`);
            
            console.log(`Galaxy A16 Layout: Header=${actualHeaderHeight}px, Footer=${actualFooterHeight}px, Content=${newContentHeight}px`);
        }
    }
    
    applyGalaxyA16Styles() {
        // Apply Galaxy A16 specific optimizations
        const galaxyA16Elements = document.querySelectorAll(
            '.hero, .welcome-section, .mobile-welcome-panel, ' +
            '.seller-dashboard, .dashboard-panel, .stats-panel, ' +
            '.categories-section, .mobile-categories-section, ' +
            '.featured-section, .mobile-featured-section, ' +
            '.nyumbasure-section, .mobile-nyumbasure-panel, ' +
            '.shop-banners, .mobile-shop-banners'
        );
        
        galaxyA16Elements.forEach(element => {
            element.classList.add('galaxy-a16-compact');
        });
        
        // Setup compact grids
        this.setupCompactGrids();
        
        // Optimize animations
        this.optimizeAnimations();
        
        // Setup modal optimizations
        this.setupModalOptimizations();
    }
    
    setupCompactGrids() {
        // Convert grids to Galaxy A16 optimized layouts
        const productGrids = document.querySelectorAll('.product-grid, .featured-grid, .mobile-featured-section');
        productGrids.forEach(grid => {
            grid.classList.add('galaxy-a16-grid');
        });
        
        const categoryGrids = document.querySelectorAll('.category-grid, .icon-grid');
        categoryGrids.forEach(grid => {
            grid.classList.add('galaxy-a16-3-column-grid');
        });
        
        const statsGrids = document.querySelectorAll('.stats-grid, .dashboard-stats');
        statsGrids.forEach(grid => {
            grid.classList.add('galaxy-a16-stats-grid');
        });
    }
    
    optimizeAnimations() {
        // Scale and optimize all animations for Galaxy A16
        const animations = document.querySelectorAll(
            '.animated-bg, .canvas-animation, .particle-bg, #ecoloopProductLayer, ' +
            '.futuristic-hero-bg, .futuristic-nyumba-bg, .futuristic-footer-bg, .futuristic-header-bg, ' +
            '.welcome-animation, .hero-animation, .mobile-welcome-animation'
        );
        
        animations.forEach(animation => {
            animation.classList.add('galaxy-a16-animation');
            
            // Apply scaling transform
            animation.style.transform = `scale(${this.animationScale})`;
            animation.style.transformOrigin = 'center';
            
            // Reduce animation intensity for performance
            if (animation.style.opacity) {
                animation.style.opacity = parseFloat(animation.style.opacity) * 0.7;
            } else {
                animation.style.opacity = '0.3';
            }
        });
        
        // Optimize canvas animations
        this.optimizeCanvasAnimations();
    }
    
    optimizeCanvasAnimations() {
        // Find and optimize canvas elements
        const canvasElements = document.querySelectorAll('canvas');
        canvasElements.forEach(canvas => {
            // Scale down canvas resolution for performance
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.style.transform = `scale(${this.animationScale})`;
                canvas.style.transformOrigin = 'center';
                
                // Reduce particle count if animation system supports it
                if (window.particleSystem && window.particleSystem.reduceParticles) {
                    window.particleSystem.reduceParticles(0.5);
                }
            }
        });
    }
    
    setupModalOptimizations() {
        // Optimize all modals for Galaxy A16
        const modals = document.querySelectorAll('.modal, .popup, .dialog, .mobile-modal');
        modals.forEach(modal => {
            modal.classList.add('galaxy-a16-modal');
            
            // Ensure modal fits within viewport
            modal.style.maxHeight = `${this.contentHeight * 0.7}px`;
            modal.style.overflowY = 'auto';
        });
    }
    
    initializeViewportSafety() {
        // Ensure no element overflows the viewport
        this.checkViewportOverflow();
        
        // Monitor for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    setTimeout(() => {
                        this.checkViewportOverflow();
                    }, 100);
                }
            });
        });
        
        // Start observing the main content area
        const mainContent = document.querySelector('.mobile-main-content');
        if (mainContent) {
            observer.observe(mainContent, {
                childList: true,
                subtree: true
            });
        }
    }
    
    checkViewportOverflow() {
        // Check if any element overflows the viewport
        const allElements = document.querySelectorAll('*');
        let overflowDetected = false;
        
        allElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            
            // Check if element extends beyond viewport
            if (rect.bottom > this.currentViewportHeight) {
                // Apply overflow correction
                element.style.maxHeight = `${this.contentHeight}px`;
                element.style.overflowY = 'auto';
                overflowDetected = true;
            }
            
            // Check if element extends beyond viewport width
            if (rect.right > window.innerWidth) {
                element.style.maxWidth = '100%';
                element.style.overflowX = 'auto';
                overflowDetected = true;
            }
        });
        
        if (overflowDetected) {
            console.log('Galaxy A16: Viewport overflow detected and corrected');
        }
    }
    
    initializeDynamicScaling() {
        // Setup dynamic scaling for responsive behavior
        this.setupResponsiveScaling();
        this.setupTouchOptimizations();
        this.setupPerformanceOptimizations();
    }
    
    setupResponsiveScaling() {
        // Adjust scaling based on content height
        const contentElements = document.querySelectorAll('.mobile-main-content > *');
        let totalContentHeight = 0;
        
        contentElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            totalContentHeight += rect.height + parseInt(getComputedStyle(element).marginTop) + parseInt(getComputedStyle(element).marginBottom);
        });
        
        // If content is too tall, apply additional scaling
        if (totalContentHeight > this.contentHeight) {
            const additionalScale = this.contentHeight / totalContentHeight;
            const finalScale = Math.min(this.scaleFactor, additionalScale);
            
            document.documentElement.style.setProperty("--mobile-scale-factor", finalScale);
            console.log(`Galaxy A16: Applied additional scaling ${finalScale.toFixed(2)}`);
        }
    }
    
    setupTouchOptimizations() {
        // Optimize touch targets for mobile
        const touchElements = document.querySelectorAll('button, .btn, a, input, select, textarea');
        touchElements.forEach(element => {
            // Ensure minimum touch target size (44px recommended, but we use smaller for compact design)
            const rect = element.getBoundingClientRect();
            if (rect.height < 20 || rect.width < 20) {
                element.style.minHeight = '20px';
                element.style.minWidth = '20px';
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
            }
        });
    }
    
    setupPerformanceOptimizations() {
        // Optimize performance for Galaxy A16
        // Reduce animation frame rate for better performance
        if (window.requestAnimationFrame) {
            let lastTime = 0;
            const fps = 30; // Reduce to 30 FPS for better performance
            const interval = 1000 / fps;
            
            window.requestAnimationFrame = (function(originalRAF) {
                return function(callback) {
                    const currentTime = performance.now();
                    const deltaTime = currentTime - lastTime;
                    
                    if (deltaTime >= interval) {
                        lastTime = currentTime - (deltaTime % interval);
                        return originalRAF(callback);
                    }
                };
            })(window.requestAnimationFrame);
        }
    }
    
    handleResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth <= this.mobileBreakpoint) {
                    this.calculateScaling();
                    this.updateBodySpacing();
                    this.checkViewportOverflow();
                    this.setupResponsiveScaling();
                } else {
                    this.removeGalaxyA16Optimization();
                }
            }, 150);
        });
    }
    
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (window.innerWidth <= this.mobileBreakpoint) {
                    this.calculateScaling();
                    this.updateBodySpacing();
                    this.optimizeAnimations();
                    this.checkViewportOverflow();
                }
            }, 200);
        });
    }
    
    setupContentWrapping() {
        // Monitor for dynamic content loading
        const globalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Refresh optimizations if new content was added
                    setTimeout(() => {
                        this.refreshOptimizations();
                    }, 100);
                }
            });
        });
        
        // Start observing the entire document
        globalObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    refreshOptimizations() {
        if (window.innerWidth <= this.mobileBreakpoint) {
            this.calculateScaling();
            this.applyGalaxyA16Styles();
            this.optimizeAnimations();
            this.checkViewportOverflow();
        }
    }
    
    removeGalaxyA16Optimization() {
        // Remove Galaxy A16 optimization on desktop
        document.body.classList.remove('galaxy-a16-optimized');
        
        const mainContent = document.querySelector('.mobile-main-content');
        if (mainContent) {
            // Move content back to body
            while (mainContent.firstChild) {
                document.body.appendChild(mainContent.firstChild);
            }
            mainContent.remove();
        }
        
        // Reset CSS custom properties
        document.documentElement.style.setProperty("--mobile-scale-factor", "1");
        document.documentElement.style.setProperty("--animation-scale", "1");
    }
    
    // Public methods for manual control
    getCurrentScale() {
        return this.scaleFactor;
    }
    
    getContentHeight() {
        return this.contentHeight;
    }
    
    getViewportHeight() {
        return this.currentViewportHeight;
    }
    
    isGalaxyA16Optimized() {
        return document.body.classList.contains('galaxy-a16-optimized');
    }
    
    // Manual scaling adjustment
    setCustomScale(scale) {
        if (scale >= 0.3 && scale <= 1.0) {
            this.scaleFactor = scale;
            document.documentElement.style.setProperty("--mobile-scale-factor", scale);
            console.log(`Galaxy A16: Manual scale set to ${scale}`);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.galaxyA16Mobile = new GalaxyA16MobileRestructuring();
});

// Handle dynamic content loading
window.addEventListener('load', () => {
    if (window.galaxyA16Mobile) {
        setTimeout(() => {
            window.galaxyA16Mobile.refreshOptimizations();
        }, 500);
    }
});

// Export for manual control
window.GalaxyA16MobileRestructuring = GalaxyA16MobileRestructuring;

// Global functions for manual control
window.getGalaxyA16Scale = () => {
    if (window.galaxyA16Mobile) {
        return window.galaxyA16Mobile.getCurrentScale();
    }
    return 1.0;
};

window.getGalaxyA16ContentHeight = () => {
    if (window.galaxyA16Mobile) {
        return window.galaxyA16Mobile.getContentHeight();
    }
    return 0;
};

window.isGalaxyA16Optimized = () => {
    if (window.galaxyA16Mobile) {
        return window.galaxyA16Mobile.isGalaxyA16Optimized();
    }
    return false;
};

export default GalaxyA16MobileRestructuring;
