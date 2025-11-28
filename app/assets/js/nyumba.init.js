/**
 * NyumbaSure - Premium Urban Housing Marketplace
 * Modern, isolated JavaScript module for housing listings
 * Uses IIFE pattern to avoid global namespace pollution
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        API_BASE: '/api/nyumba',
        BACKEND_URL: window.BACKEND_URL || 'http://localhost:5000',
        LISTINGS_PER_PAGE: 12,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 300,
        MAPBOX_TOKEN: null, // Add if using Mapbox
        OPENSTREETMAP_TILE: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    // State Management
    const STATE = {
        currentListings: [],
        currentPage: 1,
        totalPages: 1,
        filters: {
            location: '',
            minPrice: 0,
            maxPrice: 100000,
            propertyType: '',
            furnished: null
        },
        selectedListing: null,
        isLoading: false,
        user: null,
        mapInstance: null
    };

    // DOM Cache
    const DOM = {
        elements: {},
        cacheElements() {
            this.elements = {
                // Main containers
                nyumbaContainer: document.querySelector('.nyumba-container'),
                heroSection: document.querySelector('.nyumba-hero'),
                featuredSection: document.querySelector('.nyumba-featured-section'),
                
                // Search elements
                searchForm: document.querySelector('.nyumba-search-form'),
                locationInput: document.querySelector('.nyumba-location-input'),
                budgetSlider: document.querySelector('.nyumba-budget-slider'),
                budgetDisplay: document.querySelector('.nyumba-budget-display'),
                propertyTypeSelect: document.querySelector('.nyumba-property-type-select'),
                furnishedToggle: document.querySelector('.nyumba-furnished-toggle'),
                searchButton: document.querySelector('.nyumba-search-button'),
                
                // Listings
                listingsGrid: document.querySelector('.nyumba-featured-grid'),
                loadingSpinner: document.querySelector('.nyumba-loading'),
                emptyState: document.querySelector('.nyumba-empty-state'),
                
                // Modal
                modal: document.querySelector('.nyumba-modal'),
                modalContent: document.querySelector('.nyumba-modal-content'),
                modalClose: document.querySelector('.nyumba-modal-close'),
                
                // Filters
                filtersSidebar: document.querySelector('.nyumba-filters-sidebar'),
                filterCheckboxes: document.querySelectorAll('.nyumba-filter-checkbox'),
                
                // Pagination
                pagination: document.querySelector('.nyumba-pagination'),
                prevButton: document.querySelector('.nyumba-prev-page'),
                nextButton: document.querySelector('.nyumba-next-page'),
                pageNumbers: document.querySelector('.nyumba-page-numbers')
            };
        }
    };

    // Utility Functions
    const Utils = {
        // Debounce function for search
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Format currency
        formatCurrency(amount) {
            return new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES',
                minimumFractionDigits: 0
            }).format(amount);
        },

        // Format date
        formatDate(date) {
            return new Intl.DateTimeFormat('en-KE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(new Date(date));
        },

        // Generate slug from title
        slugify(text) {
            return text
                .toString()
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
        },

        // Check if element is in viewport
        isInViewport(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },

        // Show toast notification
        showToast(message, type = 'info') {
            // Use existing toast system if available
            if (window.showToast) {
                window.showToast(message, type);
                return;
            }

            // Fallback toast implementation
            const toast = document.createElement('div');
            toast.className = `nyumba-toast nyumba-toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        // Get authenticated user
        getCurrentUser() {
            return window.currentUser || null;
        },

        // Check if user is authenticated
        isAuthenticated() {
            return this.getCurrentUser() !== null;
        },

        // Check if user is agent
        isAgent() {
            const user = this.getCurrentUser();
            return user && user.role === 'seller';
        },

        // Check if user is admin
        isAdmin() {
            const user = this.getCurrentUser();
            return user && user.role === 'admin';
        }
    };

    // API Service
    const API = {
        // Make API request
        async request(endpoint, options = {}) {
            const url = `${CONFIG.API_BASE}${endpoint}`;
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const finalOptions = { ...defaultOptions, ...options };
            
            // Add authentication if available
            if (Utils.isAuthenticated()) {
                // The session will be handled by the backend automatically
                finalOptions.credentials = 'include';
            }

            try {
                const response = await fetch(url, finalOptions);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'API request failed');
                }

                return data;
            } catch (error) {
                console.error('API Error:', error);
                Utils.showToast(error.message || 'Network error occurred', 'error');
                throw error;
            }
        },

        // Get listings with filters
        async getListings(page = 1, filters = {}) {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: CONFIG.LISTINGS_PER_PAGE.toString(),
                ...filters
            });

            return this.request(`/listings?${params}`);
        },

        // Get single listing
        async getListing(id) {
            return this.request(`/listings/${id}`);
        },

        // Create listing (agent only)
        async createListing(listingData) {
            if (!Utils.isAgent()) {
                throw new Error('Agent access required');
            }
            return this.request('/listings', {
                method: 'POST',
                body: JSON.stringify(listingData)
            });
        },

        // Update listing (agent only)
        async updateListing(id, listingData) {
            if (!Utils.isAgent()) {
                throw new Error('Agent access required');
            }
            return this.request(`/listings/${id}`, {
                method: 'PUT',
                body: JSON.stringify(listingData)
            });
        },

        // Delete listing (agent only)
        async deleteListing(id) {
            if (!Utils.isAgent()) {
                throw new Error('Agent access required');
            }
            return this.request(`/listings/${id}`, {
                method: 'DELETE'
            });
        },

        // Report listing
        async reportListing(id, reportData) {
            return this.request(`/listings/${id}/report`, {
                method: 'POST',
                body: JSON.stringify(reportData)
            });
        },

        // Get statistics
        async getStats() {
            return this.request('/stats');
        },

        // Initiate escrow
        async initiateEscrow(escrowData) {
            return this.request('/escrow/initiate', {
                method: 'POST',
                body: JSON.stringify(escrowData)
            });
        }
    };

    // UI Components
    const UI = {
        // Render listing card
        renderListingCard(listing) {
            const isVerified = listing.verifiedPhotos && listing.verifiedAgent;
            const imageUrl = listing.images && listing.images.length > 0 
                ? listing.images[0] 
                : '/assets/nyumba/placeholder-house.jpg';

            return `
                <div class="nyumba-listing-card" data-listing-id="${listing._id}">
                    <div class="nyumba-listing-image">
                        <img src="${imageUrl}" alt="${listing.title}" loading="lazy">
                        ${isVerified ? `
                            <div class="nyumba-verified-badge">
                                <i class="fas fa-check-circle"></i>
                                Verified
                            </div>
                        ` : ''}
                    </div>
                    <div class="nyumba-listing-content">
                        <div class="nyumba-listing-price">
                            ${Utils.formatCurrency(listing.price)}
                            <span class="nyumba-listing-price-period">/month</span>
                        </div>
                        <h3 class="nyumba-listing-title">${listing.title}</h3>
                        <div class="nyumba-listing-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${listing.location.area}, ${listing.location.city}
                        </div>
                        <div class="nyumba-listing-specs">
                            <div class="nyumba-spec-item">
                                <i class="fas fa-bed"></i>
                                <span>${listing.propertyType}</span>
                            </div>
                            ${listing.furnished ? `
                                <div class="nyumba-spec-item">
                                    <i class="fas fa-couch"></i>
                                    <span>Furnished</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="nyumba-listing-utilities">
                            <div class="nyumba-utility-item">
                                <span class="nyumba-utility-label">Deposit:</span>
                                <span class="nyumba-utility-value">${Utils.formatCurrency(listing.deposit)}</span>
                            </div>
                            <div class="nyumba-utility-item">
                                <span class="nyumba-utility-label">Est. Utilities:</span>
                                <span class="nyumba-utility-value">${Utils.formatCurrency(listing.estUtilities)}</span>
                            </div>
                        </div>
                        <button class="nyumba-view-details-btn" onclick="window.nyumba.showListingDetails('${listing._id}')">
                            View Details
                        </button>
                    </div>
                </div>
            `;
        },

        // Render pagination
        renderPagination(currentPage, totalPages) {
            if (totalPages <= 1) return '';

            let pagination = '<div class="nyumba-pagination">';
            
            // Previous button
            pagination += `
                <button class="nyumba-prev-page" ${currentPage === 1 ? 'disabled' : ''} 
                        onclick="window.nyumba.loadPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
            `;

            // Page numbers
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);

            for (let i = startPage; i <= endPage; i++) {
                pagination += `
                    <button class="nyumba-page-number ${i === currentPage ? 'active' : ''}" 
                            onclick="window.nyumba.loadPage(${i})">
                        ${i}
                    </button>
                `;
            }

            // Next button
            pagination += `
                <button class="nyumba-next-page" ${currentPage === totalPages ? 'disabled' : ''} 
                        onclick="window.nyumba.loadPage(${currentPage + 1})">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            `;

            pagination += '</div>';
            return pagination;
        },

        // Show loading state
        showLoading() {
            if (DOM.elements.listingsGrid) {
                DOM.elements.listingsGrid.innerHTML = `
                    <div class="nyumba-loading">
                        <div class="nyumba-spinner"></div>
                        <span>Loading listings...</span>
                    </div>
                `;
            }
        },

        // Show empty state
        showEmptyState(title = 'No listings found', description = 'Try adjusting your filters to see more results') {
            if (DOM.elements.listingsGrid) {
                DOM.elements.listingsGrid.innerHTML = `
                    <div class="nyumba-empty-state">
                        <div class="nyumba-empty-icon">
                            <i class="fas fa-home"></i>
                        </div>
                        <h3 class="nyumba-empty-title">${title}</h3>
                        <p class="nyumba-empty-description">${description}</p>
                        <button class="nyumba-view-details-btn" onclick="window.nyumba.clearFilters()">
                            Clear Filters
                        </button>
                    </div>
                `;
            }
        },

        // Update budget display
        updateBudgetDisplay(min, max) {
            if (DOM.elements.budgetDisplay) {
                DOM.elements.budgetDisplay.textContent = 
                    `${Utils.formatCurrency(min)} - ${Utils.formatCurrency(max)}`;
            }
        },

        // Show modal
        showModal(content) {
            if (DOM.elements.modal && DOM.elements.modalContent) {
                DOM.elements.modalContent.innerHTML = content;
                DOM.elements.modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        },

        // Hide modal
        hideModal() {
            if (DOM.elements.modal) {
                DOM.elements.modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    };

    // Event Handlers
    const Events = {
        // Initialize all event listeners
        init() {
            this.setupSearchEvents();
            this.setupFilterEvents();
            this.setupModalEvents();
            this.setupScrollEvents();
        },

        // Search form events
        setupSearchEvents() {
            if (DOM.elements.searchForm) {
                DOM.elements.searchForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSearch();
                });
            }

            // Budget slider events
            if (DOM.elements.budgetSlider) {
                DOM.elements.budgetSlider.addEventListener('input', 
                    Utils.debounce(this.handleBudgetChange.bind(this), CONFIG.DEBOUNCE_DELAY)
                );
            }

            // Location input autocomplete
            if (DOM.elements.locationInput) {
                DOM.elements.locationInput.addEventListener('input', 
                    Utils.debounce(this.handleLocationInput.bind(this), CONFIG.DEBOUNCE_DELAY)
                );
            }
        },

        // Filter sidebar events
        setupFilterEvents() {
            DOM.elements.filterCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.handleFilterChange();
                });
            });
        },

        // Modal events
        setupModalEvents() {
            if (DOM.elements.modalClose) {
                DOM.elements.modalClose.addEventListener('click', () => {
                    UI.hideModal();
                });
            }

            if (DOM.elements.modal) {
                DOM.elements.modal.addEventListener('click', (e) => {
                    if (e.target === DOM.elements.modal) {
                        UI.hideModal();
                    }
                });
            }

            // Escape key to close modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && DOM.elements.modal.classList.contains('active')) {
                    UI.hideModal();
                }
            });
        },

        // Scroll events for lazy loading
        setupScrollEvents() {
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.handleScroll();
                }, 100);
            });
        },

        // Handle search submission
        handleSearch() {
            const location = DOM.elements.locationInput?.value || '';
            const propertyType = DOM.elements.propertyTypeSelect?.value || '';
            const furnished = DOM.elements.furnishedToggle?.checked || null;

            STATE.filters = {
                location,
                propertyType,
                furnished,
                minPrice: STATE.filters.minPrice,
                maxPrice: STATE.filters.maxPrice
            };

            STATE.currentPage = 1;
            this.loadListings();
        },

        // Handle budget slider change
        handleBudgetChange(e) {
            const value = parseInt(e.target.value);
            const min = Math.floor(value * 0.3);
            const max = value;

            STATE.filters.minPrice = min;
            STATE.filters.maxPrice = max;

            UI.updateBudgetDisplay(min, max);
            
            // Auto-search if not loading
            if (!STATE.isLoading) {
                this.handleSearch();
            }
        },

        // Handle location input (autocomplete simulation)
        handleLocationInput(e) {
            const value = e.target.value;
            if (value.length >= 2) {
                // In a real implementation, this would call a geocoding API
                console.log('Searching for location:', value);
            }
        },

        // Handle filter changes
        handleFilterChange() {
            const checkedFilters = Array.from(DOM.elements.filterCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            // Update filters based on checked items
            checkedFilters.forEach(filter => {
                if (filter.startsWith('amenity_')) {
                    // Handle amenity filters
                    const amenity = filter.replace('amenity_', '');
                    if (!STATE.filters.amenities) STATE.filters.amenities = [];
                    STATE.filters.amenities.push(amenity);
                }
            });

            this.handleSearch();
        },

        // Handle scroll for lazy loading
        handleScroll() {
            if (STATE.isLoading) return;

            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.offsetHeight;

            // Load more when near bottom
            if (scrollPosition >= documentHeight - 1000) {
                if (STATE.currentPage < STATE.totalPages) {
                    STATE.currentPage++;
                    this.loadListings(true); // Append mode
                }
            }
        },

        // Load specific page
        loadListings(append = false) {
            STATE.isLoading = true;
            UI.showLoading();

            API.getListings(STATE.currentPage, STATE.filters)
                .then(data => {
                    STATE.currentListings = append 
                        ? [...STATE.currentListings, ...data.listings]
                        : data.listings;
                    STATE.totalPages = data.pagination.pages;

                    this.renderListings(append);
                    this.renderPagination(data.pagination.page, data.pagination.pages);
                })
                .catch(error => {
                    console.error('Failed to load listings:', error);
                    UI.showEmptyState('Error loading listings', 'Please try again later');
                })
                .finally(() => {
                    STATE.isLoading = false;
                });
        },

        // Render listings to DOM
        renderListings(append = false) {
            if (!DOM.elements.listingsGrid) return;

            if (STATE.currentListings.length === 0) {
                UI.showEmptyState();
                return;
            }

            const listingsHTML = STATE.currentListings
                .map(listing => UI.renderListingCard(listing))
                .join('');

            if (append) {
                DOM.elements.listingsGrid.innerHTML += listingsHTML;
            } else {
                DOM.elements.listingsGrid.innerHTML = listingsHTML;
            }

            // Lazy load images
            this.lazyLoadImages();
        },

        // Render pagination
        renderPagination(currentPage, totalPages) {
            if (DOM.elements.pagination) {
                DOM.elements.pagination.innerHTML = UI.renderPagination(currentPage, totalPages);
            }
        },

        // Lazy load images
        lazyLoadImages() {
            const images = DOM.elements.listingsGrid?.querySelectorAll('img[loading="lazy"]') || [];
            
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.add('loaded');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        }
    };

    // Main NyumbaSure Application
    const NyumbaSure = {
        // Initialize the application
        init() {
            console.log('🏠 Initializing NyumbaSure Housing Marketplace...');
            
            DOM.cacheElements();
            
            if (!DOM.elements.nyumbaContainer) {
                console.warn('NyumbaSure container not found');
                return;
            }

            Events.init();
            this.loadInitialData();
            this.setupAnimations();
            
            console.log('✅ NyumbaSure initialized successfully');
        },

        // Load initial data
        loadInitialData() {
            Events.loadListings();
            
            // Load user stats if authenticated
            if (Utils.isAuthenticated()) {
                API.getStats()
                    .then(data => {
                        console.log('User stats loaded:', data.stats);
                    })
                    .catch(error => {
                        console.error('Failed to load stats:', error);
                    });
            }
        },

        // Setup animations and micro-interactions
        setupAnimations() {
            // Intersection Observer for scroll animations
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, observerOptions);

            // Observe listing cards
            document.querySelectorAll('.nyumba-listing-card').forEach(card => {
                animationObserver.observe(card);
            });

            // Parallax effect for hero section
            if (DOM.elements.heroSection) {
                window.addEventListener('scroll', () => {
                    const scrolled = window.pageYOffset;
                    const hero = DOM.elements.heroSection;
                    hero.style.transform = `translateY(${scrolled * 0.5}px)`;
                });
            }
        },

        // Public API methods
        async showListingDetails(listingId) {
            try {
                const data = await API.getListing(listingId);
                STATE.selectedListing = data.listing;
                this.renderListingModal(data.listing);
            } catch (error) {
                console.error('Failed to load listing details:', error);
            }
        },

        renderListingModal(listing) {
            const modalContent = `
                <button class="nyumba-modal-close">
                    <i class="fas fa-times"></i>
                </button>
                <div class="nyumba-listing-details">
                    <div class="nyumba-detail-images">
                        <img src="${listing.images[0] || '/assets/nyumba/placeholder-house.jpg'}" 
                             alt="${listing.title}" class="nyumba-main-image">
                        <div class="nyumba-image-thumbnails">
                            ${listing.images.map((img, index) => `
                                <img src="${img}" alt="Image ${index + 1}" 
                                     class="nyumba-thumbnail ${index === 0 ? 'active' : ''}"
                                     onclick="this.parentElement.previousElementSibling.src='${img}'">
                            `).join('')}
                        </div>
                    </div>
                    <div class="nyumba-detail-info">
                        <h2>${listing.title}</h2>
                        <div class="nyumba-detail-price">
                            ${Utils.formatCurrency(listing.price)}
                            <span class="nyumba-listing-price-period">/month</span>
                        </div>
                        <p class="nyumba-detail-description">${listing.description}</p>
                        
                        <div class="nyumba-detail-specs">
                            <div class="nyumba-spec-grid">
                                <div class="nyumba-spec-item">
                                    <span class="nyumba-spec-label">Type:</span>
                                    <span class="nyumba-spec-value">${listing.propertyType}</span>
                                </div>
                                <div class="nyumba-spec-item">
                                    <span class="nyumba-spec-label">Furnished:</span>
                                    <span class="nyumba-spec-value">${listing.furnished ? 'Yes' : 'No'}</span>
                                </div>
                                <div class="nyumba-spec-item">
                                    <span class="nyumba-spec-label">Deposit:</span>
                                    <span class="nyumba-spec-value">${Utils.formatCurrency(listing.deposit)}</span>
                                </div>
                                <div class="nyumba-spec-item">
                                    <span class="nyumba-spec-label">Service Charge:</span>
                                    <span class="nyumba-spec-value">${Utils.formatCurrency(listing.serviceCharge)}</span>
                                </div>
                            </div>
                        </div>

                        ${listing.amenities && listing.amenities.length > 0 ? `
                            <div class="nyumba-amenities">
                                <h4>Amenities</h4>
                                <div class="nyumba-amenity-tags">
                                    ${listing.amenities.map(amenity => `
                                        <span class="nyumba-amenity-tag">${amenity}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="nyumba-map-preview" onclick="window.nyumba.showFullMap()">
                            <img src="https://picsum.photos/seed/map-${listing._id}/600/300.jpg" 
                                 alt="Map location">
                            <div class="nyumba-map-overlay">
                                <i class="fas fa-map-marked-alt"></i> Click to view full map
                            </div>
                        </div>

                        ${listing.agent ? `
                            <div class="nyumba-agent-info">
                                <div class="nyumba-agent-name">${listing.agent.name}</div>
                                <div class="nyumba-agent-status">
                                    <i class="fas fa-check-circle"></i>
                                    Verified Agent
                                </div>
                                <div class="nyumba-contact-buttons">
                                    <a href="tel:${listing.agent.phone}" class="nyumba-contact-btn">
                                        <i class="fas fa-phone"></i> Call Agent
                                    </a>
                                    <button class="nyumba-contact-btn" onclick="window.nyumba.contactAgent('${listing._id}')">
                                        <i class="fas fa-envelope"></i> Send Message
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <button class="nyumba-report-btn" onclick="window.nyumba.reportListing('${listing._id}')">
                            <i class="fas fa-flag"></i> Report Listing
                        </button>
                    </div>
                </div>
            `;

            UI.showModal(modalContent);
        },

        async reportListing(listingId) {
            if (!Utils.isAuthenticated()) {
                Utils.showToast('Please login to report a listing', 'error');
                return;
            }

            const modalContent = `
                <div class="nyumba-report-form">
                    <h3>Report Listing</h3>
                    <form id="nyumba-report-form">
                        <div class="nyumba-form-group">
                            <label class="nyumba-form-label">Your Email</label>
                            <input type="email" class="nyumba-form-input" 
                                   value="${Utils.getCurrentUser().email}" readonly>
                        </div>
                        <div class="nyumba-form-group">
                            <label class="nyumba-form-label">Reason for Report</label>
                            <select class="nyumba-form-input" name="reason" required>
                                <option value="">Select a reason</option>
                                <option value="fraud">Fraud or scam</option>
                                <option value="inaccurate">Inaccurate information</option>
                                <option value="inappropriate">Inappropriate content</option>
                                <option value="spam">Spam or duplicate</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="nyumba-form-group">
                            <label class="nyumba-form-label">Detailed Description</label>
                            <textarea class="nyumba-form-textarea" name="message" 
                                      placeholder="Please provide details about your report..." required></textarea>
                        </div>
                        <div class="nyumba-form-buttons">
                            <button type="button" class="nyumba-cancel-btn" onclick="window.nyumba.hideModal()">
                                Cancel
                            </button>
                            <button type="submit" class="nyumba-submit-btn">
                                Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            `;

            UI.showModal(modalContent);

            // Handle form submission
            const form = document.getElementById('nyumba-report-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const reportData = {
                    reporterEmail: Utils.getCurrentUser().email,
                    reason: formData.get('reason'),
                    message: formData.get('message')
                };

                try {
                    await API.reportListing(listingId, reportData);
                    Utils.showToast('Report submitted successfully', 'success');
                    UI.hideModal();
                } catch (error) {
                    console.error('Failed to submit report:', error);
                }
            });
        },

        async contactAgent(listingId) {
            if (!Utils.isAuthenticated()) {
                Utils.showToast('Please login to contact agent', 'error');
                return;
            }

            const modalContent = `
                <div class="nyumba-report-form">
                    <h3>Contact Agent</h3>
                    <form id="nyumba-contact-form">
                        <div class="nyumba-form-group">
                            <label class="nyumba-form-label">Your Name</label>
                            <input type="text" class="nyumba-form-input" 
                                   value="${Utils.getCurrentUser().name || ''}" readonly>
                        </div>
                        <div class="nyumba-form-group">
                            <label class="nyumba-form-label">Your Email</label>
                            <input type="email" class="nyumba-form-input" 
                                   value="${Utils.getCurrentUser().email}" readonly>
                        </div>
                        <div class="nyumba-form-group">
                            <label class="nyumba-form-label">Message</label>
                            <textarea class="nyumba-form-textarea" name="message" 
                                      placeholder="I'm interested in this property. Please provide more information..." required></textarea>
                        </div>
                        <div class="nyumba-form-buttons">
                            <button type="button" class="nyumba-cancel-btn" onclick="window.nyumba.hideModal()">
                                Cancel
                            </button>
                            <button type="submit" class="nyumba-submit-btn">
                                Send Message
                            </button>
                        </div>
                    </form>
                </div>
            `;

            UI.showModal(modalContent);

            // Handle form submission
            const form = document.getElementById('nyumba-contact-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // In a real implementation, this would send the message to the agent
                Utils.showToast('Message sent to agent successfully', 'success');
                UI.hideModal();
            });
        },

        showFullMap() {
            // In a real implementation, this would show a full interactive map
            Utils.showToast('Full map view coming soon', 'info');
        },

        loadPage(page) {
            STATE.currentPage = page;
            Events.loadListings();
        },

        clearFilters() {
            STATE.filters = {
                location: '',
                minPrice: 0,
                maxPrice: 100000,
                propertyType: '',
                furnished: null
            };

            // Reset form elements
            if (DOM.elements.locationInput) DOM.elements.locationInput.value = '';
            if (DOM.elements.propertyTypeSelect) DOM.elements.propertyTypeSelect.value = '';
            if (DOM.elements.furnishedToggle) DOM.elements.furnishedToggle.checked = false;
            if (DOM.elements.budgetSlider) DOM.elements.budgetSlider.value = 100000;

            UI.updateBudgetDisplay(0, 100000);
            STATE.currentPage = 1;
            Events.loadListings();
        },

        hideModal() {
            UI.hideModal();
        },

        // Get current state (for debugging)
        getState() {
            return STATE;
        },

        // Get configuration (for debugging)
        getConfig() {
            return CONFIG;
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            NyumbaSure.init();
        });
    } else {
        NyumbaSure.init();
    }

    // Expose to global scope
    window.nyumba = NyumbaSure;

})();
