/**
 * Lightweight SPA Router for AutoBookkeeping
 * Handles breadcrumb routes without external dependencies
 * v1.0 - Routes Migration
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.history = [];
        this.params = {};

        console.log('🧭 Router initialized');

        // Listen to browser back/forward
        window.addEventListener('popstate', (e) => {
            console.log('⬅️ Browser back/forward detected');
            this.loadRoute(window.location.pathname, false);
        });

        // Listen to hash changes (for file:// URLs)
        window.addEventListener('hashchange', (e) => {
            console.log('🔗 Hash change detected');
            const path = window.location.hash.substring(1) || '/transactions';
            this.loadRoute(path, false);
        });

        // Intercept link clicks
        document.addEventListener('click', (e) => {
            // Check for data-route attribute
            const routeLink = e.target.closest('[data-route]');
            if (routeLink) {
                e.preventDefault();
                const path = routeLink.getAttribute('data-route');
                this.navigate(path);
            }
        });

        console.log('✅ Router ready - event listeners attached');
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/vendors' or '/vendors/:id')
     * @param {function} handler - Function to call when route loads
     */
    register(path, handler) {
        this.routes[path] = handler;
        console.log(`📝 Route registered: ${path}`);
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {boolean} addToHistory - Whether to add to browser history
     */
    navigate(path, addToHistory = true) {
        console.log(`\n🧭 Navigate to: ${path}`);

        // Detect file:// protocol (can't use pushState)
        const isFileProtocol = window.location.protocol === 'file:';

        if (addToHistory && !isFileProtocol) {
            try {
                window.history.pushState({ path }, '', path);
            } catch (e) {
                console.warn('⚠️ pushState failed (file:// protocol?), using hash fallback');
                window.location.hash = path;
            }
        } else if (isFileProtocol) {
            // Use hash for file:// URLs
            window.location.hash = path;
        }

        this.loadRoute(path, addToHistory);
    }

    /**
     * Load and execute route handler
     */
    loadRoute(path, addToHistory = true) {
        console.log(`📄 Loading route: ${path}`);

        // Hide all pages
        document.querySelectorAll('[data-page]').forEach(page => {
            page.style.display = 'none';
        });

        // Find matching route
        let handler = this.routes[path];
        let matchedRoute = path;

        // Try dynamic routes (e.g., /vendors/:id)
        if (!handler) {
            const match = this.matchDynamicRoute(path);
            if (match) {
                handler = match.handler;
                matchedRoute = match.route;
                this.params = match.params;
            }
        }

        if (handler) {
            this.currentRoute = path;
            if (addToHistory) {
                this.history.push(path);
            }

            // Update breadcrumbs
            this.updateBreadcrumbs(path);

            // Execute route handler
            console.log(`✅ Executing handler for: ${matchedRoute}`);
            handler(this.params);
        } else {
            console.error(`❌ Route not found: ${path}`);
            console.log('📋 Available routes:', Object.keys(this.routes));
            // Fallback to home
            this.navigate('/transactions');
        }
    }

    /**
     * Match dynamic routes like /vendors/:id
     */
    matchDynamicRoute(path) {
        for (const [routePath, handler] of Object.entries(this.routes)) {
            if (routePath.includes(':')) {
                // Convert route pattern to regex
                const pattern = routePath.replace(/:[^/]+/g, '([^/]+)');
                const regex = new RegExp('^' + pattern + '$');
                const match = path.match(regex);

                if (match) {
                    // Extract param names and values
                    const paramNames = routePath.match(/:[^/]+/g) || [];
                    const params = {};
                    paramNames.forEach((name, idx) => {
                        const cleanName = name.substring(1); // Remove :
                        params[cleanName] = match[idx + 1];
                    });

                    console.log(`✅ Matched dynamic route: ${routePath}`, params);
                    return { handler, route: routePath, params };
                }
            }
        }
        return null;
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumbs(path) {
        const breadcrumbContainer = document.getElementById('breadcrumbNav');
        if (!breadcrumbContainer) {
            console.warn('⚠️ Breadcrumb container not found');
            return;
        }

        const crumbs = this.generateBreadcrumbs(path);

        breadcrumbContainer.innerHTML = crumbs.map((crumb, idx) => {
            if (idx === crumbs.length - 1) {
                // Last crumb (current page) - not clickable
                return `<span class="breadcrumb-current">${crumb.label}</span>`;
            } else {
                // Clickable crumb
                return `<a href="#" data-route="${crumb.path}" class="breadcrumb-link">${crumb.label}</a>`;
            }
        }).join('<span class="breadcrumb-separator">›</span>');

        console.log('🍞 Breadcrumbs updated:', crumbs.map(c => c.label).join(' › '));
    }

    /**
     * Generate breadcrumb array from path
     */
    generateBreadcrumbs(path) {
        if (path === '/') {
            return [{ path: '/transactions', label: '📊 Transactions' }];
        }

        const segments = path.split('/').filter(Boolean);
        const crumbs = [];
        let currentPath = '';

        segments.forEach((segment, idx) => {
            currentPath += '/' + segment;

            // Map segment to friendly label
            const label = this.segmentToLabel(segment, idx, segments);

            crumbs.push({
                path: currentPath,
                label: label
            });
        });

        return crumbs;
    }

    /**
     * Convert URL segment to friendly breadcrumb label
     */
    segmentToLabel(segment, index, allSegments) {
        // Static mappings
        const labels = {
            'transactions': '📊 Transactions',
            'vendors': '🏢 Vendors',
            'accounts': '📋 Accounts',
            'reports': '📈 Reports',
            'settings': '⚙️ Settings',
            'dashboard': '🏠 Dashboard',
            'banks': 'Bank Accounts',
            'new': 'New'
        };

        // Check if it's a known segment
        if (labels[segment]) {
            return labels[segment];
        }

        // Check if it's an ID (follows specific patterns)
        if (index > 0) {
            const prevSegment = allSegments[index - 1];

            // Vendor ID
            if (prevSegment === 'vendors') {
                return this.getVendorName(segment) || decodeURIComponent(segment);
            }

            // Account ID  
            if (prevSegment === 'accounts') {
                return `Account ${segment}`;
            }
        }

        // Default: capitalize and decode
        return decodeURIComponent(segment).charAt(0).toUpperCase() +
            decodeURIComponent(segment).slice(1);
    }

    /**
     * Helper to get vendor name from ID
     */
    getVendorName(vendorId) {
        // Try to get from VendorManager if available
        if (window.VendorMatcher && window.VendorMatcher.vendors) {
            const vendor = window.VendorMatcher.vendors.find(v => v.name === decodeURIComponent(vendorId));
            if (vendor) return vendor.name;
        }

        // Return decoded ID as fallback
        return decodeURIComponent(vendorId);
    }

    /**
     * Start the router (call on page load)
     */
    start() {
        // Check if using file:// protocol - use hash
        const isFileProtocol = window.location.protocol === 'file:';

        let path;
        if (isFileProtocol && window.location.hash) {
            // Use hash for file:// URLs
            path = window.location.hash.substring(1);
            console.log(`🚀 Router starting with hash: ${path}`);
        } else if (!isFileProtocol) {
            // Use pathname for http://
            path = window.location.pathname;
            console.log(`🚀 Router starting with path: ${path}`);
        } else {
            // file:// with no hash, default to home
            path = '/transactions';
            console.log(`🚀 Router starting (file://, no hash), defaulting to: ${path}`);
        }

        // Clean up path - if it includes .html, extract just the hash part or default
        if (path.includes('.html')) {
            path = '/transactions';
            console.log(`🧹 Cleaned path (had .html): ${path}`);
        }

        // Default to /transactions if root
        if (path === '/' || path === '') {
            this.navigate('/transactions', false);
        } else {
            this.loadRoute(path, false);
        }
    }
}

// Initialize global router
console.log('🎬 Creating AppRouter instance...');
window.AppRouter = new Router();
console.log('✅ window.AppRouter ready');
