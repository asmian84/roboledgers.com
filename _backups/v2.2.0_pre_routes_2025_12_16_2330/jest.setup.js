// Mock browser APIs that might be missing in JSDOM
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};

// Mock console to keep test output clean (optional, keeping it enabled for now)
// global.console = { ...global.console, log: jest.fn() };
