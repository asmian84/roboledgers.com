# AutoBookkeeping v3.0

**Route-First Architecture** • **Zero Dependencies** • **File Protocol Compatible**

A modern, lightweight bookkeeping application built with vanilla JavaScript, featuring client-side routing and reactive state management.

## 🚀 Quick Start

Simply open `index.html` in any modern web browser. No build process required!

```bash
# Clone or navigate to project
cd AutoBookkeeping-v3

# Open in browser (file:// protocol works!)
start index.html  # Windows
open index.html   # macOS
xdg-open index.html  # Linux
```

## 📁 Project Structure

```
AutoBookkeeping-v3/
├── index.html              # Main entry point
├── src/
│   ├── core/
│   │   ├── router.js       # Hash-based client-side router
│   │   └── state.js        # Reactive state management
│   ├── pages/              # Page components (future)
│   ├── components/         # Reusable components (future)
│   ├── styles/
│   │   └── styles.css      # Global styles with CSS variables
│   └── data/               # Data management (future)
└── README.md
```

## ✨ Core Features

### 🧭 Router (`router.js`)
- **Hash-based routing** - Works on `file://` protocol
- **Nested routes** - Support for `/vendors/:vendorId`
- **Query parameters** - Parse URL query strings
- **Browser history** - Back/forward button integration
- **Route deduplication** - Prevents unnecessary reloads
- **Event-driven** - Subscribe to route changes

### 📦 State Management (`state.js`)
- **Reactive state** - Subscribe to state changes
- **localStorage sync** - Automatic persistence
- **Deep merging** - Smart state updates
- **Dot notation** - Easy nested value access

### 🎨 Design System (`styles.css`)
- **CSS custom properties** - Easy theming
- **Dark mode ready** - `[data-theme="dark"]` support
- **Mobile-first responsive** - Breakpoints at 768px, 1024px
- **Fixed sidebar** - 260px width, collapsible on mobile
- **Breadcrumb navigation** - Always visible, auto-updates

## 🧪 Testing Checklist

- [x] Router navigates on hash change
- [x] Breadcrumbs update automatically
- [x] Sidebar active state highlights current route
- [x] Browser back/forward works
- [x] Mobile: sidebar hidden by default
- [x] Mobile: hamburger menu shows/hides sidebar
- [ ] No console errors (test in browser)

## 🎯 Usage Examples

### Registering Routes

```javascript
// Simple route
router.register('/', () => {
  document.getElementById('app').innerHTML = '<h1>Home</h1>';
});

// Route with parameters
router.register('/vendors/:vendorId', (route) => {
  const { vendorId } = route.params;
  console.log('Viewing vendor:', vendorId);
});

// Access query parameters
router.onChange((route) => {
  console.log('Query params:', route.query);
  // URL: #/search?q=invoice&filter=pending
  // route.query = { q: 'invoice', filter: 'pending' }
});
```

### Managing State

```javascript
// Create store
const store = createStore({
  user: null,
  theme: 'light'
}, {
  storageKey: 'my_app_state',
  persist: true
});

// Update state
store.setState({ user: { name: 'John' } });

// Subscribe to changes
store.subscribe((newState, oldState) => {
  console.log('State changed!', newState);
});

// Get state
const currentUser = store.getState('user');
```

### Navigation

```javascript
// Navigate programmatically
router.navigate('/vendors');
router.navigate('/vendors/123');
router.navigate('/search?q=test');

// Or use links in HTML
<a href="#/vendors">View Vendors</a>
```

## 🎨 Theming

Toggle dark mode by setting the `data-theme` attribute:

```javascript
document.documentElement.setAttribute('data-theme', 'dark');
```

Customize colors by overriding CSS variables:

```css
:root {
  --primary-color: #10b981;  /* Custom green */
  --sidebar-width: 300px;     /* Wider sidebar */
}
```

## 📊 Size Target

- **router.js**: ~5KB
- **state.js**: ~4KB
- **styles.css**: ~8KB
- **index.html**: ~5KB
- **Total Foundation**: ~22KB (well under 50KB target!)

## 🔮 What's Next

This is the foundation. Future additions:
- AG Grid integration for transaction tables
- Vendor management pages
- CSV import/export
- Rule automation
- Financial reports

## 📝 Developer Notes

### Console Debugging

The app logs helpful debug messages:
- 🧭 Router events (route changes, registrations)
- 📦 State updates (changes, subscribers)
- ✅ Initialization confirmations

Open browser DevTools to see these logs.

### Mobile Development

The sidebar collapses on screens < 768px:
- Hidden by default
- Hamburger menu in top-left
- Overlay when open
- Click outside to close

### Route-First Philosophy

Unlike modal-based UIs, every view is a route:
- ✅ `/settings` renders settings page
- ❌ No "open settings modal"
- ✅ Shareable URLs, browser history
- ✅ Better user experience

## 📄 License

MIT - Build something awesome!

---

**Made with ❤️ using Vanilla JavaScript**
