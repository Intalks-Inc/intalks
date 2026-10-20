/**
 * Intalks Application Entry Point
 * 
 * This is the main entry point for the Intalks application.
 * It initializes the application and coordinates between modules.
 */

// Re-export all public APIs
export * from './types/index.js';
export * from './core/entities.js';
export * from './utils/index.js';

// Initialize the application
import { initializeEntities } from './core/entities.js';
import { initGlobalErrorHandler } from './utils/errors.js';
import { store } from './utils/storage.js';

/**
 * Application initialization
 */
function initApp() {
  // Initialize error handling first
  initGlobalErrorHandler();

  // Initialize entities
  initializeEntities();

  // Log initialization
  console.log('Intalks application initialized');

  // Set up global error handler for async operations
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for backwards compatibility
export default {
  initApp,
  store,
};
