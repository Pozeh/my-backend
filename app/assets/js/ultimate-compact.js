/* ========================================
   ULTIMATE MOBILE COMPACT-SCALING JAVASCRIPT
   ========================================
   Dynamic scaling system for perfect viewport fit
   Auto-adjusts scale based on viewport height
   ======================================== */

class UltimateCompactScaling {
    constructor() {
        this.init();
    }
    
    init() {
        // Only apply on mobile view
        if (window.innerWidth <= 768) {
            this.setupCompactMode();
            this.handleResize();
            this.handleOrientationChange();
            this.setupContentWrapping();
        }
    }
    
    setupCompactMode() {
        // Add compact class to body
        document.body.classList.add('mobile-compact');
        
        // Set initial scale
        this.adjustScale();
        
        // Setup fixed layout structure
        this.setupFixedLayout();
        
        // Apply compact styles to all elements
        this.applyCompactStyles();
    }
    
    adjustScale() {
        const vh = window.innerHeight;
        let scale = 1;
        
        // Dynamic scaling based on viewport height
        if (vh <= 640) scale = 0.70;
        else if (vh <= 700) scale = 0.75;
        else if (vh <= 770) scale = 0.78;
        else if (vh <= 820) scale = 0.82;
        else if (vh <= 880) scale = 0.85;
        else scale = 0.90;
        
        // Set CSS custom property
        document.documentElement.style.setProperty("--compact-scale", scale);
        
        console.log(`Viewport height: ${vh}px, Scale: ${scale}`);
    }
    
    setupFixedLayout() {
        // Check if layout wrapper already exists
        if (document.querySelector('.middle-scroll-area')) {
            return;
        }
        
        // Create middle scrollable area
        const scrollArea = document.createElement('div');
        scrollArea.className = 'middle-scroll-area';
        scrollArea.setAttribute('data-compact-layout', 'true');
        
        // Get header and footer
        const header = document.querySelector('.mobile-header, header, .header');
        const footer = document.querySelector('.mobile-footer, footer, .footer');
        
        // Insert scroll area after header
        if (header) {
            header.insertAdjacentElement('afterend', scrollArea);
        } else {
            // Fallback: insert at beginning of body
            document.body.insertBefore(scrollArea, document.body.firstChild);
        }
        
        // Move all content between header and footer to scroll area
        this.moveContentToScrollArea();
        
        // Update body spacing
        this.updateBodySpacing();
    }
    
    moveContentToScrollArea() {
        const scrollArea = document.querySelector('.middle-scroll-area');
        if (!scrollArea) return;
        
        const header = document.querySelector('.mobile-header, header, .header');
        const footer = document.querySelector('.mobile-footer, footer, .footer');
        
        // Get all elements that should be in the scrollable area
        const allElements = document.body.children;
        const elementsToMove = [];
        
        for (let element of allElements) {
            // Skip if it's the scroll area itself
            if (element === scrollArea) continue;
            
            // Skip if it's the header
            if (header && (element === header || header.contains(element))) continue;
            
            // Skip if it's the footer
            if (footer && (element === footer || footer.contains(element))) continue;
            
            // Skip scripts and meta tags
            if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || element.tagName === 'META' || element.tagName === 'LINK') continue;
            
            elementsToMove.push(element);
        }
        
        // Move elements to scroll area
        elementsToMove.forEach(element => {
            scrollArea.appendChild(element);
        });
    }
    
    updateBodySpacing() {
        const header = document.querySelector('.mobile-header, header, .header');
        const footer = document.querySelector('.mobile-footer, footer, .footer');
        
        if (header && footer) {
            const headerHeight = header.offsetHeight || 60;
            const footerHeight = footer.offsetHeight || 40;
            
            // Update CSS custom properties
            document.documentElement.style.setProperty("--compact-header-height", headerHeight + 'px');
            document.documentElement.style.setProperty("--compact-footer-height", footerHeight + 'px');
            document.documentElement.style.setProperty("--compact-middle-height", `calc(100vh - ${headerHeight + footerHeight}px)`);
            
            console.log(`Header: ${headerHeight}px, Footer: ${footerHeight}px, Middle: calc(100vh - ${headerHeight + footerHeight}px)`);
        }
    }
    
    applyCompactStyles() {
        // Apply compact styles to common elements
        const compactElements = document.querySelectorAll(
            '.card, .product-card, .category-card, .stat-card, .dashboard-card, ' +
            '.btn, .button, .cta-button, .action-btn, ' +
            '.form-input, .form-control, input, select, textarea, ' +
            '.modal, .popup, .dialog, ' +
            '.animated-bg, .canvas-animation, .particle-bg'
        );
        
        compactElements.forEach(element => {
            // Add compact class for additional styling
            element.classList.add('compact-element');
        });
        
        // Setup compact grids
        this.setupCompactGrids();
        
        // Setup compact animations
        this.setupCompactAnimations();
    }
    
    setupCompactGrids() {
        // Convert product grids to compact 2-column layout
        const productGrids = document.querySelectorAll('.product-grid, .featured-grid, .mobile-featured-section');
        productGrids.forEach(grid => {
            grid.classList.add('compact-grid');
        });
        
        // Convert category grids to 3-column layout
        const categoryGrids = document.querySelectorAll('.category-grid, .icon-grid');
        categoryGrids.forEach(grid => {
            grid.classList.add('compact-3-column-grid');
        });
    }
    
    setupCompactAnimations() {
        // Scale down animations
        const animations = document.querySelectorAll(
            '.animated-bg, .canvas-animation, .particle-bg, #ecoloopProductLayer, ' +
            '.futuristic-hero-bg, .futuristic-nyumba-bg, .futuristic-footer-bg, .futuristic-header-bg'
        );
        
        animations.forEach(animation => {
            animation.classList.add('compact-animation');
        });
    }
    
    handleResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth <= 768) {
                    this.adjustScale();
                    this.updateBodySpacing();
                } else {
                    this.removeCompactMode();
                }
            }, 100);
        });
    }
    
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustScale();
                this.updateBodySpacing();
            }, 150);
        });
    }
    
    setupContentWrapping() {
        // Monitor for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Refresh layout if new content was added
                    setTimeout(() => {
                        this.refreshLayout();
                    }, 50);
                }
            });
        });
        
        // Start observing the scroll area
        const scrollArea = document.querySelector('.middle-scroll-area');
        if (scrollArea) {
            observer.observe(scrollArea, {
                childList: true,
                subtree: true
            });
        }
    }
    
    removeCompactMode() {
        // Remove compact mode on desktop
        document.body.classList.remove('mobile-compact');
        
        const scrollArea = document.querySelector('.middle-scroll-area');
        if (scrollArea) {
            // Move content back to body
            while (scrollArea.firstChild) {
                document.body.appendChild(scrollArea.firstChild);
            }
            scrollArea.remove();
        }
        
        // Reset CSS custom properties
        document.documentElement.style.setProperty("--compact-scale", "1");
    }
    
    refreshLayout() {
        if (window.innerWidth <= 768) {
            this.adjustScale();
            this.updateBodySpacing();
            this.applyCompactStyles();
        }
    }
    
    // Public method to manually adjust scale
    manualScale(scale) {
        if (scale >= 0.5 && scale <= 1.0) {
            document.documentElement.style.setProperty("--compact-scale", scale);
            console.log(`Manual scale set to: ${scale}`);
        }
    }
    
    // Public method to get current scale
    getCurrentScale() {
        const scale = document.documentElement.style.getPropertyValue("--compact-scale") || "0.78";
        return parseFloat(scale);
    }
    
    // Public method to check if compact mode is active
    isCompactMode() {
        return document.body.classList.contains('mobile-compact');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ultimateCompactScaling = new UltimateCompactScaling();
});

// Handle dynamic content loading
const globalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            // Refresh layout if new content was added to body
            if (window.ultimateCompactScaling) {
                setTimeout(() => {
                    window.ultimateCompactScaling.refreshLayout();
                }, 100);
            }
        }
    });
});

// Start observing the entire document
globalObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Export for manual control
window.UltimateCompactScaling = UltimateCompactScaling;

// Global functions for manual control
window.adjustMobileScale = (scale) => {
    if (window.ultimateCompactScaling) {
        window.ultimateCompactScaling.manualScale(scale);
    }
};

window.getMobileScale = () => {
    if (window.ultimateCompactScaling) {
        return window.ultimateCompactScaling.getCurrentScale();
    }
    return 1.0;
};

window.isMobileCompact = () => {
    if (window.ultimateCompactScaling) {
        return window.ultimateCompactScaling.isCompactMode();
    }
    return false;
};

export default UltimateCompactScaling;
