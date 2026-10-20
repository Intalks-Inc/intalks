/**
 * Loading State Management
 * 
 * Centralized loading state management for async operations
 */

// ============================================================================
// LOADING OVERLAY
// ============================================================================

/**
 * Create and manage a loading overlay
 */
class LoadingOverlay {
  /**
   * @param {Object} [options] - Configuration options
   * @param {string} [options.id='loadingOverlay'] - Element ID
   * @param {string} [options.spinnerColor='#6f5bff'] - Spinner accent color
   * @param {string} [options.background='rgba(0,0,0,0.5)'] - Background color
   */
  constructor(options = {}) {
    this.id = options.id || 'loadingOverlay';
    this.spinnerColor = options.spinnerColor || '#6f5bff';
    this.background = options.background || 'rgba(0,0,0,0.5)';
    this.element = null;
    this.activeCount = 0;
    this.init();
  }

  init() {
    // Check if element already exists
    let overlay = document.getElementById(this.id);
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = this.id;
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: ${this.background};
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      `;
      
      // Create spinner
      const spinner = document.createElement('div');
      spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 3px solid #fff;
        border-top-color: ${this.spinnerColor};
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      `;
      
      overlay.appendChild(spinner);
      
      // Add animation keyframes
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #${this.id}.visible {
          opacity: 1;
          visibility: visible;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }
    
    this.element = overlay;
  }

  /**
   * Show loading overlay
   * @param {string} [message] - Optional message to display
   */
  show(message) {
    this.activeCount++;
    
    if (this.activeCount === 1) {
      // Add message if provided
      if (message) {
        const msgElement = document.createElement('div');
        msgElement.className = 'loading-message';
        msgElement.style.cssText = `
          position: absolute;
          top: 60px;
          color: #fff;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          text-align: center;
        `;
        msgElement.textContent = message;
        this.element.appendChild(msgElement);
      }
      
      this.element.classList.add('visible');
    }
  }

  /**
   * Hide loading overlay
   */
  hide() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    
    if (this.activeCount === 0) {
      // Remove any message elements
      const messages = this.element.querySelectorAll('.loading-message');
      messages.forEach(msg => msg.remove());
      
      this.element.classList.remove('visible');
    }
  }

  /**
   * Force hide loading overlay (ignore counter)
   */
  forceHide() {
    this.activeCount = 0;
    const messages = this.element.querySelectorAll('.loading-message');
    messages.forEach(msg => msg.remove());
    this.element.classList.remove('visible');
  }

  /**
   * Destroy the loading overlay
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// ============================================================================
// GLOBAL LOADING MANAGER
// ============================================================================

/** @type {LoadingOverlay|null} */
let globalLoadingOverlay = null;

/**
 * Get or create the global loading overlay
 * @returns {LoadingOverlay}
 */
function getGlobalLoadingOverlay() {
  if (!globalLoadingOverlay) {
    globalLoadingOverlay = new LoadingOverlay();
  }
  return globalLoadingOverlay;
}

/**
 * Show global loading overlay
 * @param {string} [message] - Optional message
 */
export function showLoading(message) {
  getGlobalLoadingOverlay().show(message);
}

/**
 * Hide global loading overlay
 */
export function hideLoading() {
  getGlobalLoadingOverlay().hide();
}

/**
 * Force hide global loading overlay
 */
export function forceHideLoading() {
  getGlobalLoadingOverlay().forceHide();
}

/**
 * Create a scoped loading manager for a specific component or operation
 */
export class ScopedLoadingManager {
  /**
   * @param {HTMLElement} [container] - Optional container for scoped overlay
   */
  constructor(container = null) {
    this.container = container;
    this.activeOperations = new Set();
    this.overlay = null;
  }

  /**
   * Start a loading operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {string} [message] - Optional message
   */
  start(operationId, message) {
    this.activeOperations.add(operationId);
    
    if (this.activeOperations.size === 1) {
      this.showOverlay(message);
    }
    
    return operationId;
  }

  /**
   * Stop a loading operation
   * @param {string} operationId - Operation identifier
   */
  stop(operationId) {
    this.activeOperations.delete(operationId);
    
    if (this.activeOperations.size === 0) {
      this.hideOverlay();
    }
  }

  /**
   * Show loading overlay
   * @param {string} [message] - Optional message
   */
  showOverlay(message) {
    if (!this.container) {
      showLoading(message);
      return;
    }

    if (!this.overlay) {
      this.overlay = new LoadingOverlay({
        id: `loading-${Date.now()}`,
        background: 'rgba(0,0,0,0.3)'
      });
      this.container.appendChild(this.overlay.element);
    }
    
    this.overlay.show(message);
  }

  /**
   * Hide loading overlay
   */
  hideOverlay() {
    if (this.overlay) {
      this.overlay.hide();
    } else {
      hideLoading();
    }
  }

  /**
   * Create a promise that automatically manages loading state
   * @template T
   * @param {Promise<T>} promise - The async operation
   * @param {string} [operationId] - Optional operation identifier
   * @param {string} [message] - Optional loading message
   * @returns {Promise<T>} The original promise
   */
  withLoading(promise, operationId = 'op', message) {
    this.start(operationId, message);
    
    return promise
      .then(result => {
        this.stop(operationId);
        return result;
      })
      .catch(error => {
        this.stop(operationId);
        throw error;
      });
  }
}

// ============================================================================
// SPINNER COMPONENTS
// ============================================================================

/**
 * Create a standalone spinner element
 * @param {Object} [options] - Configuration options
 * @param {string} [options.color='#6f5bff'] - Spinner color
 * @param {number} [options.size=40] - Spinner size in pixels
 * @param {number} [options.borderWidth=3] - Border width in pixels
 * @returns {HTMLDivElement}
 */
export function createSpinner(options = {}) {
  const spinner = document.createElement('div');
  const color = options.color || '#6f5bff';
  const size = options.size || 40;
  const borderWidth = options.borderWidth || 3;
  
  spinner.style.cssText = `
    display: inline-block;
    width: ${size}px;
    height: ${size}px;
    border: ${borderWidth}px solid currentColor;
    border-top-color: ${color};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;
  
  return spinner;
}

/**
 * Create a button with built-in loading state
 * @param {Object} options - Button configuration
 * @param {string} options.text - Button text
 * @param {Function} options.onClick - Click handler
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {string} [options.loadingText='Loading...'] - Text during loading
 * @returns {HTMLButtonElement}
 */
export function createLoadingButton(options) {
  const button = document.createElement('button');
  const originalText = options.text;
  let isLoading = false;
  
  button.textContent = originalText;
  button.className = options.className || '';
  button.disabled = false;
  
  button.addEventListener('click', async (event) => {
    if (isLoading) return;
    
    isLoading = true;
    button.disabled = true;
    button.textContent = options.loadingText || 'Loading...';
    
    // Add spinner
    const spinner = createSpinner({
      color: 'currentColor',
      size: 16,
      borderWidth: 2
    });
    
    button.prepend(spinner);
    button.prepend(' ');
    
    try {
      await options.onClick(event);
    } finally {
      isLoading = false;
      button.disabled = false;
      button.textContent = originalText;
    }
  });
  
  return button;
}

// ============================================================================
// SKELETON LOADING
// ============================================================================

/**
 * Create a skeleton loading element
 * @param {Object} [options] - Configuration options
 * @param {string} [options.tag='div'] - HTML tag name
 * @param {number} [options.width=100] - Width in pixels or '100%'
 * @param {number} [options.height=20] - Height in pixels
 * @param {string} [options.className=''] - Additional CSS classes
 * @returns {HTMLElement}
 */
export function createSkeleton(options = {}) {
  const tag = options.tag || 'div';
  const element = document.createElement(tag);
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  
  element.className = `skeleton ${options.className || ''}`;
  element.style.cssText = `
    background: linear-gradient(
      90deg,
      var(--line) 25%,
      var(--bg) 50%,
      var(--line) 75%
    );
    background-size: 200% 100%;
    animation: skeleton 1.5s infinite;
    border-radius: 4px;
    width: ${typeof width === 'number' ? `${width}px` : width};
    height: ${typeof height === 'number' ? `${height}px` : height};
  `;
  
  return element;
}

/**
 * Apply skeleton loading to an existing element
 * @param {HTMLElement} element - Element to apply skeleton to
 * @param {Object} [options] - Configuration options
 */
export function applySkeleton(element, options = {}) {
  element.classList.add('skeleton');
  element.style.background = 'linear-gradient(90deg, var(--line) 25%, var(--bg) 50%, var(--line) 75%)';
  element.style.backgroundSize = '200% 100%';
  element.style.animation = 'skeleton 1.5s infinite';
  
  if (!document.getElementById('skeleton-styles')) {
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = `
      @keyframes skeleton {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .skeleton {
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Remove skeleton loading from an element
 * @param {HTMLElement} element - Element to remove skeleton from
 */
export function removeSkeleton(element) {
  element.classList.remove('skeleton');
  element.style.background = '';
  element.style.backgroundSize = '';
  element.style.animation = '';
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

/**
 * Create a progress bar
 * @param {Object} [options] - Configuration options
 * @param {number} [options.value=0] - Current value (0-100)
 * @param {number} [options.max=100] - Maximum value
 * @param {string} [options.color='#6f5bff'] - Progress color
 * @param {number} [options.height=4] - Bar height in pixels
 * @returns {HTMLDivElement}
 */
export function createProgressBar(options = {}) {
  const value = options.value || 0;
  const max = options.max || 100;
  const color = options.color || '#6f5bff';
  const height = options.height || 4;
  
  const container = document.createElement('div');
  container.className = 'progress-bar';
  container.style.cssText = `
    height: ${height}px;
    background: var(--line);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  `;
  
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: absolute;
    inset: 0;
    background: ${color};
    width: ${Math.min(100, (value / max) * 100)}%;
    transition: width 0.3s ease;
  `;
  
  container.appendChild(bar);
  
  /**
   * Update progress value
   * @param {number} newValue - New value
   */
  container.update = function(newValue) {
    const percentage = Math.min(100, (newValue / max) * 100);
    bar.style.width = `${percentage}%`;
  };
  
  return container;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  LoadingOverlay,
  ScopedLoadingManager,
  getGlobalLoadingOverlay,
};
