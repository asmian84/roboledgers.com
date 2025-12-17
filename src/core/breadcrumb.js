/**
 * AutoBookkeeping v3.0 - Breadcrumb Navigation System
 * Automatic breadcrumb generation from routes
 */

class BreadcrumbManager {
    constructor(containerId = 'breadcrumb') {
        this.container = document.getElementById(containerId);
        this.routeLabels = {
            '': 'Home',
            'home': 'Home',
            'transactions': 'Transactions',
            'vendors': 'Vendors',
            'accounts': 'Accounts',
            'reports': 'Reports',
            'settings': 'Settings',
            'appearance': 'Appearance',
            'data': 'Data & Files',
            'subscription': 'Subscription',
            'about': 'About',
            'team': 'Team',
            'audit': 'Audit Log'
        };

        this.routeIcons = {
            '': '🏠',
            'home': '🏠',
            'transactions': '💰',
            'vendors': '🏢',
            'accounts': '📊',
            'reports': '📈',
            'settings': '⚙️',
            'team': '👥',
            'subscription': '💳',
            'audit': '📋'
        };
    }

    /**
     * Update breadcrumbs based on current route
     * @param {string} path - Current route path (e.g., '/vendors/123')
     * @param {Object} params - Route parameters
     */
    update(path, params = {}) {
        if (!this.container) {
            console.warn('🍞 Breadcrumb container not found');
            return;
        }

        const breadcrumbs = this._generateBreadcrumbs(path, params);
        this.container.innerHTML = this._renderBreadcrumbs(breadcrumbs);

        console.log('🍞 Breadcrumbs updated:', breadcrumbs.map(b => b.label).join(' › '));
    }

    /**
     * Generate breadcrumb data from path
     * @private
     */
    _generateBreadcrumbs(path, params) {
        const crumbs = [];

        // Always start with Home
        crumbs.push({
            label: 'Home',
            icon: '🏠',
            path: '/',
            isActive: false
        });

        // Parse path segments
        const segments = path.split('/').filter(Boolean);
        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath += '/' + segment;
            const isLast = index === segments.length - 1;

            // Check if segment is a parameter (numeric ID, etc.)
            const isParam = this._isParameter(segment);

            let label = segment;
            let icon = '';

            if (isParam) {
                // Use parameter name or fetch from state/API
                label = this._getParameterLabel(segment, params);
            } else {
                // Use predefined label or capitalize
                label = this.routeLabels[segment] || this._capitalize(segment);
                icon = this.routeIcons[segment] || '';
            }

            crumbs.push({
                label,
                icon,
                path: currentPath,
                isActive: isLast
            });
        });

        return crumbs;
    }

    /**
     * Render breadcrumbs HTML
     * @private
     */
    _renderBreadcrumbs(breadcrumbs) {
        return breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const icon = crumb.icon ? `<span class="breadcrumb-icon">${crumb.icon}</span>` : '';
            const separator = index > 0 ? '<span class="breadcrumb-separator">›</span>' : '';

            if (isLast) {
                // Active crumb - not clickable
                return `
          ${separator}
          <span class="breadcrumb-item active">
            ${icon}
            <span class="breadcrumb-label">${crumb.label}</span>
          </span>
        `;
            } else {
                // Clickable crumb
                return `
          ${separator}
          <a href="#${crumb.path}" class="breadcrumb-item">
            ${icon}
            <span class="breadcrumb-label">${crumb.label}</span>
          </a>
        `;
            }
        }).join('');
    }

    /**
     * Check if segment is a parameter (ID, etc.)
     * @private
     */
    _isParameter(segment) {
        // Consider numeric segments or UUIDs as parameters
        return /^\d+$/.test(segment) ||
            /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment);
    }

    /**
     * Get user-friendly label for parameter
     * @private
     */
    _getParameterLabel(segment, params) {
        // Try to get from params object
        if (params.vendorId === segment) {
            return params.vendorName || `Vendor #${segment}`;
        }
        if (params.accountId === segment) {
            return params.accountName || `Account #${segment}`;
        }

        // Default: show the ID
        return `#${segment}`;
    }

    /**
     * Capitalize first letter
     * @private
     */
    _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Add custom route label
     */
    addRouteLabel(route, label, icon = '') {
        this.routeLabels[route] = label;
        if (icon) {
            this.routeIcons[route] = icon;
        }
    }
}

// Create global breadcrumb manager
window.breadcrumbManager = new BreadcrumbManager();

console.log('🍞 Breadcrumb system ready');
