const { createApp } = Vue;

        createApp({
            data() {
                return {
                    // API Configuration
                    API_URL: 'http://localhost:5173/api',
                    
                    // UI State
                    currentView: 'home',
                    showModal: false,
                    modalType: 'login',
                    isLoading: false,
                    loadingCars: false,
                    loadingFeatured: false,
                    loadingFavorites: false,
                    
                    // Authentication
                    isLoggedIn: false,
                    token: null,
                    user: {
                        name: '',
                        email: ''
                    },
                    
                    // Forms
                    searchQuery: '',
                    loginForm: {
                        email: '',
                        password: ''
                    },
                    signupForm: {
                        name: '',
                        email: '',
                        password: '',
                        confirmPassword: ''
                    },
                    loginError: '',
                    signupError: '',
                    
                    // Filters
                    filters: {
                        make: '',
                        priceRange: '',
                        year: '',
                        fuel: ''
                    },
                    
                    // Data
                    cars: [],
                    featuredCars: [],
                    favorites: [],
                    favoriteIds: new Set(),
                    
                    // Pagination
                    pagination: {
                        current: 1,
                        pages: 1,
                        total: 0
                    },
                    
                    // Toast notifications
                    toasts: []
                }
            },
            computed: {
                visiblePages() {
                    const pages = [];
                    const start = Math.max(1, this.pagination.current - 2);
                    const end = Math.min(this.pagination.pages, this.pagination.current + 2);
                    
                    for (let i = start; i <= end; i++) {
                        pages.push(i);
                    }
                    
                    return pages;
                }
            },
            methods: {
                // Enhanced image handling methods
        getCarImageUrl(car) {
            // Use the primaryImageUrl from the API response
            if (car.primaryImageUrl) {
                return `http://localhost:5000${car.primaryImageUrl}`;
            }
            
            // Fallback: construct URL from images array
            if (car.images && car.images.length > 0) {
                return `http://localhost:5000/api/car-image/${car.images[0]}`;
            }
            
            // Final fallback: placeholder
            return `http://localhost:5000/api/car-image/placeholder.jpg`;
        },
        
        getAllCarImageUrls(car) {
            // Use the imageUrls from the API response
            if (car.imageUrls && car.imageUrls.length > 0) {
                return car.imageUrls.map(url => `http://localhost:5000${url}`);
            }
            
            // Fallback: construct URLs from images array
            if (car.images && car.images.length > 0) {
                return car.images.map(img => `http://localhost:5000/api/car-image/${img}`);
            }
            
            // Final fallback: placeholder
            return [`http://localhost:5000/api/car-image/placeholder.jpg`];
        },
        
        // Handle image load errors with retry mechanism
        handleImageError(event, car) {
            const img = event.target;
            const currentSrc = img.src;
            const carId = car._id || car.id;
            
            // Avoid infinite loops by tracking failed attempts
            if (this.imageLoadErrors.has(currentSrc)) {
                // Create a placeholder div with car info
                this.createImagePlaceholder(img, car);
                return;
            }
            
            this.imageLoadErrors.add(currentSrc);
            
            // Try the API endpoint if we haven't already
            if (!currentSrc.includes('/api/car-image/')) {
                const fallbackUrl = `http://localhost:5000/api/car-image/${car.images?.[0] || 'placeholder.jpg'}`;
                img.src = fallbackUrl;
                return;
            }
            
            // If API endpoint also fails, create a styled placeholder
            this.createImagePlaceholder(img, car);
        },
        
        createImagePlaceholder(img, car) {
            const container = img.parentElement;
            if (!container) return;
            
            // Hide the broken image
            img.style.display = 'none';
            
            // Create a styled placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                border-radius: 8px;
            `;
            
            placeholder.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">🚗</div>
                <div style="font-size: 0.9rem; font-weight: 500;">${car.make} ${car.model}</div>
                <div style="font-size: 0.7rem; opacity: 0.8;">${car.year}</div>
            `;
            
            container.appendChild(placeholder);
        },
                // Toast Notifications
                showToast(message, type = 'success') {
                    const toast = {
                        id: Date.now(),
                        message,
                        type
                    };
                    
                    this.toasts.push(toast);
                    
                    setTimeout(() => {
                        this.toasts = this.toasts.filter(t => t.id !== toast.id);
                    }, 3000);
                },
                
                // Authentication Methods
                async checkAuth() {
                    const token = localStorage.getItem('token');
                    if (token) {
                        this.token = token;
                        try {
                            const response = await axios.get(`${this.API_URL}/auth/me`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            this.user = response.data;
                            this.isLoggedIn = true;
                            await this.loadFavorites();
                        } catch (error) {
                            console.error('Auth check failed:', error);
                            this.logout();
                        }
                    }
                },
                
                openLogin() {
                    this.modalType = 'login';
                    this.showModal = true;
                },
                
                openSignup() {
                    this.modalType = 'signup';
                    this.showModal = true;
                },
                
                closeModal() {
                    this.showModal = false;
                    this.resetForms();
                },
                
                resetForms() {
                    this.loginForm = { email: '', password: '' };
                    this.signupForm = { name: '', email: '', password: '', confirmPassword: '' };
                    this.loginError = '';
                    this.signupError = '';
                },
                
                async handleLogin() {
                    this.isLoading = true;
                    this.loginError = '';
                    
                    try {
                        const response = await axios.post(`${this.API_URL}/auth/login`, this.loginForm);
                        
                        this.token = response.data.token;
                        this.user = response.data.user;
                        this.isLoggedIn = true;
                        
                        localStorage.setItem('token', this.token);
                        
                        this.closeModal();
                        this.showToast('Login successful! Welcome back.');
                        
                        // Load favorites after login
                        await this.loadFavorites();
                        
                    } catch (error) {
                        this.loginError = error.response?.data?.error || 'Login failed. Please try again.';
                    } finally {
                        this.isLoading = false;
                    }
                },
                
                async handleSignup() {
                    this.isLoading = true;
                    this.signupError = '';
                    
                    if (this.signupForm.password !== this.signupForm.confirmPassword) {
                        this.signupError = 'Passwords do not match!';
                        this.isLoading = false;
                        return;
                    }
                    
                    try {
                        const response = await axios.post(`${this.API_URL}/auth/register`, {
                            name: this.signupForm.name,
                            email: this.signupForm.email,
                            password: this.signupForm.password
                        });
                        
                        this.token = response.data.token;
                        this.user = response.data.user;
                        this.isLoggedIn = true;
                        
                        localStorage.setItem('token', this.token);
                        
                        this.closeModal();
                        this.showToast('Account created successfully! Welcome to AutoSphere.');
                        
                    } catch (error) {
                        this.signupError = error.response?.data?.error || 'Signup failed. Please try again.';
                    } finally {
                        this.isLoading = false;
                    }
                },
                
                logout() {
                    this.isLoggedIn = false;
                    this.user = { name: '', email: '' };
                    this.token = null;
                    this.favorites = [];
                    this.favoriteIds.clear();
                    localStorage.removeItem('token');
                    this.showToast('You have been logged out.');
                    
                    if (this.currentView === 'favorites') {
                        this.currentView = 'home';
                    }
                },
                
                // Car Methods
                async loadCars(page = 1) {
                    this.loadingCars = true;
                    
                    try {
                        const params = {
                            page,
                            
                            search: this.searchQuery,
                            make: this.filters.make,
                            year: this.filters.year,
                            fuel: this.filters.fuel
                        };
                        
                        // Handle price range
                        if (this.filters.priceRange) {
                            if (this.filters.priceRange === '0-50000') {
                                params.priceMax = 50000;
                            } else if (this.filters.priceRange === '50000-100000') {
                                params.priceMin = 50000;
                                params.priceMax = 100000;
                            } else if (this.filters.priceRange === '100000-200000') {
                                params.priceMin = 100000;
                                params.priceMax = 200000;
                            } else if (this.filters.priceRange === '200000+') {
                                params.priceMin = 200000;
                            }
                        }
                        
                        const response = await axios.get(`${this.API_URL}/cars`, { params });
                        
                        this.cars = response.data.cars;
                        this.pagination = response.data.pagination;
                        
                    } catch (error) {
                        console.error('Error loading cars:', error);
                        this.showToast('Failed to load cars. Please try again.', 'error');
                    } finally {
                        this.loadingCars = false;
                    }
                },
                
                async loadFeaturedCars() {
                    this.loadingFeatured = true;
                    
                    try {
                        const response = await axios.get(`${this.API_URL}/cars`, {
                            params: { featured: true, limit: 6 }
                        });
                        
                        this.featuredCars = response.data.cars;
                        
                    } catch (error) {
                        console.error('Error loading featured cars:', error);
                        this.showToast('Failed to load featured cars.', 'error');
                    } finally {
                        this.loadingFeatured = false;
                    }
                },
                
                async loadFavorites() {
                    if (!this.isLoggedIn) return;
                    
                    this.loadingFavorites = true;
                    
                    try {
                        const response = await axios.get(`${this.API_URL}/favorites`, {
                            headers: { 'Authorization': `Bearer ${this.token}` }
                        });
                        
                        this.favorites = response.data;
                        this.favoriteIds = new Set(response.data.map(car => car._id));
                        
                    } catch (error) {
                        console.error('Error loading favorites:', error);
                    } finally {
                        this.loadingFavorites = false;
                    }
                },
                
                searchCars() {
                    this.currentView = 'browse';
                    this.loadCars();
                },
                
                changePage(page) {
                    if (page >= 1 && page <= this.pagination.pages) {
                        this.loadCars(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                },
                
                viewCarDetails(car) {
                    // In a real app, this would navigate to a detailed view
                    this.showToast(`Viewing details for ${car.make} ${car.model}`);
                },
                
                async toggleFavorite(car) {
                    if (!this.isLoggedIn) {
                        this.showToast('Please login to add favorites!', 'error');
                        this.openLogin();
                        return;
                    }
                    
                    try {
                        if (this.isFavorite(car._id)) {
                            // Remove from favorites
                            await axios.delete(`${this.API_URL}/favorites/${car._id}`, {
                                headers: { 'Authorization': `Bearer ${this.token}` }
                            });
                            
                            this.favoriteIds.delete(car._id);
                            this.favorites = this.favorites.filter(f => f._id !== car._id);
                            this.showToast('Removed from favorites');
                            
                        } else {
                            // Add to favorites
                            await axios.post(`${this.API_URL}/favorites/${car._id}`, {}, {
                                headers: { 'Authorization': `Bearer ${this.token}` }
                            });
                            
                            this.favoriteIds.add(car._id);
                            if (this.currentView === 'favorites') {
                                await this.loadFavorites();
                            }
                            this.showToast('Added to favorites');
                        }
                        
                    } catch (error) {
                        console.error('Error toggling favorite:', error);
                        this.showToast('Failed to update favorites', 'error');
                    }
                },
                
                isFavorite(carId) {
                    return this.favoriteIds.has(carId);
                }
            },
            async mounted() {
                // Check authentication on mount
                await this.checkAuth();
                
                // Load featured cars on home page
                await this.loadFeaturedCars();
                
                // Watch for view changes
                this.$watch('currentView', (newView) => {
                    if (newView === 'browse' && this.cars.length === 0) {
                        this.loadCars();
                    } else if (newView === 'favorites' && this.isLoggedIn) {
                        this.loadFavorites();
                    }
                });
            }
        }).mount('#app');