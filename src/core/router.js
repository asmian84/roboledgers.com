/**
 * AutoBookkeeping v3.0 - Client-Side Router
 * Hash-based routing for file:// protocol compatibility
 * Zero dependencies, fully reactive
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentPath = null;
    this.params = {};
    this.query = {};
    this.listeners = [];

    // Initialize
    this._init();
  }

  /**
   * Register a route with handler
   * @param {string} path - Route path (e.g., '/', '/vendors/:id')
   * @param {Function} handler - Route handler function
   */
  register(path, handler) {
    this.routes.set(path, handler);
    console.log(`🧭 Registered route: ${path}`);
  }

  /**
   * Navigate to a path
   * @param {string} path - Path to navigate to
   * @param {boolean} replace - Replace history instead of push
   */
  navigate(path, replace = false) {
    // Normalize path
    if (!path.startsWith('#')) {
      path = '#' + path;
    }

    if (replace) {
      window.location.replace(path);
    } else {
      window.location.hash = path;
    }
  }

  /**
   * Add listener for route changes
   * @param {Function} callback - Called on route change
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Get current route information
   */
  getCurrentRoute() {
    return {
      path: this.currentPath,
      params: this.params,
      query: this.query
    };
  }

  /**
   * Initialize router
   * @private
   */
  _init() {
    // Listen to hash changes
    window.addEventListener('hashchange', () => this._handleRouteChange());

    // Handle initial load
    window.addEventListener('DOMContentLoaded', () => this._handleRouteChange());

    // Handle page load if DOMContentLoaded already fired
    if (document.readyState !== 'loading') {
      setTimeout(() => this._handleRouteChange(), 0);
    }
  }

  /**
   * Handle route change
   * @private
   */
  _handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const [pathPart, queryPart] = hash.split('?');

    // Deduplication: don't reload same route
    if (this.currentPath === pathPart) {
      console.log(`🧭 Route unchanged: ${pathPart}`);
      return;
    }

    // Parse query parameters
    this.query = this._parseQuery(queryPart);

    // Match route
    const match = this._matchRoute(pathPart);

    if (match) {
      this.currentPath = pathPart;
      this.params = match.params;

      console.log(`🧭 Route changed to: ${pathPart}`, {
        params: this.params,
        query: this.query
      });

      // Check if route requires authentication
      if (this._requiresAuth(pathPart)) {
        if (!window.Session || !window.Session.isAuthenticated()) {
          console.warn('🔒 Route requires authentication, showing login modal');
          sessionStorage.setItem('intended_route', pathPart);
          if (typeof showAuthModal === 'function') {
            showAuthModal('login');
          }
          return;
        }
      }

      // Execute handler
      match.handler({
        path: pathPart,
        params: this.params,
        query: this.query
      });

      // Notify listeners
      this.listeners.forEach(listener => {
        listener({
          path: pathPart,
          params: this.params,
          query: this.query
        });
      });
    } else {
      console.warn(`🧭 No route matched for: ${pathPart}`);
      this._handle404(pathPart);
    }
  }

  /**
   * Check if route requires authentication
   * @private
   */
  _requiresAuth(path) {
    // Public routes that don't require auth
    const publicRoutes = [
      '/',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password'
    ];

    // Check if current path is public
    return !publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  }

  /**
   * Match path to registered routes
   * @private
   */
  _matchRoute(path) {
    // Try exact match first
    if (this.routes.has(path)) {
      return {
        handler: this.routes.get(path),
        params: {}
      };
    }

    // Try pattern matching
    for (const [pattern, handler] of this.routes) {
      const params = this._matchPattern(pattern, path);
      if (params !== null) {
        return { handler, params };
      }
    }

    return null;
  }

  /**
   * Match path against pattern with parameters
   * @private
   */
  _matchPattern(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Parameter
        const paramName = patternPart.slice(1);
        params[paramName] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        // No match
        return null;
      }
    }

    return params;
  }

  /**
   * Parse query string
   * @private
   */
  _parseQuery(queryString) {
    if (!queryString) return {};

    const params = {};
    const pairs = queryString.split('&');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    }

    return params;
  }

  /**
   * Handle 404 - route not found
   * @private
   */
  _handle404(path) {
    // Check if there's a 404 handler registered
    if (this.routes.has('404')) {
      this.routes.get('404')({ path });
    } else {
      // Default 404 handling
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = `
          <div class="page">
            <div class="error-container">
              <h1>404 - Page Not Found</h1>
              <p>The route <code>${path}</code> does not exist.</p>
              <button onclick="window.router.navigate('/')">Go Home</button>
            </div>
          </div>
        `;
      }
    }
  }
}

// Create global router instance
window.router = new Router();

console.log('🧭 Router initialized and ready');
