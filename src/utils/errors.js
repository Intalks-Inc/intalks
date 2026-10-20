/**
 * Error Handling Module
 * 
 * Centralized error handling for the Intalks application including:
 * - Global error boundary
 * - Error tracking and reporting
 * - User-friendly error messages
 * - Error notification system
 */

import { showLoading, hideLoading } from './loading.js';

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom error classes for different error types
 */

export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [code='APP_ERROR'] - Error code
   * @param {number} [status=500] - HTTP status code (if applicable)
   * @param {unknown} [data] - Additional error data
   */
  constructor(message, code = 'APP_ERROR', status = 500, data = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class NetworkError extends AppError {
  constructor(message, status = 0, url = null, data = null) {
    super(message, 'NETWORK_ERROR', status, data);
    this.name = 'NetworkError';
    this.url = url;
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 'AUTHZ_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message, resourceType = null, resourceId = null) {
    super(message, 'NOT_FOUND', 404, { resourceType, resourceId });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

export class RateLimitError extends AppError {
  constructor(message, retryAfter = null) {
    super(message, 'RATE_LIMIT', 429, { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

/**
 * Error tracking service configuration
 */
const errorTrackingConfig = {
  enabled: true,
  endpoint: '/api/errors',
  maxQueueSize: 100,
  batchSize: 10,
  flushInterval: 5000 // 5 seconds
};

/** @type {Array<{error: Error, context: unknown, timestamp: string}>} */
const errorQueue = [];
let isFlushing = false;

/**
 * Report an error to the tracking service
 * @param {Error} error - The error to report
 * @param {unknown} [context] - Additional context
 */
async function reportError(error, context = {}) {
  if (!errorTrackingConfig.enabled) return;

  const errorData = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code || (error instanceof AppError ? error.code : null),
    status: error.status || (error instanceof AppError ? error.status : null),
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    path: window.location.pathname,
    ...(error.data ? { data: error.data } : {})
  };

  // Queue the error
  errorQueue.push({ error, context, timestamp: errorData.timestamp });

  // Flush queue if it exceeds max size
  if (errorQueue.length >= errorTrackingConfig.maxQueueSize) {
    await flushErrorQueue();
  }

  // Start periodic flushing if not already running
  if (!isFlushing) {
    setTimeout(flushErrorQueue, errorTrackingConfig.flushInterval);
  }
}

/**
 * Flush the error queue to the server
 */
async function flushErrorQueue() {
  if (isFlushing || errorQueue.length === 0) return;

  isFlushing = true;

  try {
    const batch = errorQueue.slice(0, errorTrackingConfig.batchSize);
    
    await fetch(errorTrackingConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batch.map(item => ({
        error: {
          message: item.error.message,
          name: item.error.name,
          stack: item.error.stack,
          code: item.error.code,
          status: item.error.status
        },
        context: item.context,
        timestamp: item.timestamp
      })))
    });

    // Remove processed errors from queue
    errorQueue.splice(0, batch.length);
  } catch (flushError) {
    console.error('Failed to flush error queue:', flushError);
  } finally {
    isFlushing = false;
    
    // If there are more errors, schedule another flush
    if (errorQueue.length > 0) {
      setTimeout(flushErrorQueue, errorTrackingConfig.flushInterval);
    }
  }
}

/**
 * Enable or disable error tracking
 * @param {boolean} enabled - Whether to enable tracking
 */
export function setErrorTracking(enabled) {
  errorTrackingConfig.enabled = enabled;
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Notification types
 */
export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/** @type {HTMLDivElement|null} */
let notificationContainer = null;

/**
 * Create notification container
 */
function createNotificationContainer() {
  if (notificationContainer) return;

  notificationContainer = document.createElement('div');
  notificationContainer.id = 'intalks-notifications';
  notificationContainer.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 360px;
    pointer-events: none;
  `;

  // Add notification styles
  const style = document.createElement('style');
  style.id = 'intalks-notification-styles';
  style.textContent = `
    .intalks-notification {
      padding: 12px 16px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      color: #fff;
      position: relative;
    }
    
    .intalks-notification.info {
      background: #1a56db;
    }
    
    .intalks-notification.success {
      background: #15803d;
    }
    
    .intalks-notification.warning {
      background: #f59e0b;
    }
    
    .intalks-notification.error {
      background: #dc2626;
    }
    
    .intalks-notification-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }
    
    .intalks-notification-message {
      flex: 1;
    }
    
    .intalks-notification-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    
    .intalks-notification-close:hover {
      opacity: 1;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    .intalks-notification.closing {
      animation: slideOut 0.3s ease-in forwards;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(notificationContainer);
}

/**
 * Show a notification
 * @param {Object} options - Notification options
 * @param {string} options.message - Notification message
 * @param {NotificationType} [options.type=NotificationType.INFO] - Notification type
 * @param {number} [options.duration=5000] - Duration in milliseconds (0 for persistent)
 * @param {string} [options.title] - Optional title
 * @param {Function} [options.onClose] - Callback when closed
 * @returns {HTMLDivElement} The notification element
 */
export function showNotification({ message, type = NotificationType.INFO, duration = 5000, title, onClose }) {
  createNotificationContainer();

  const notification = document.createElement('div');
  notification.className = `intalks-notification ${type}`;

  // Create icon
  const icon = document.createElement('div');
  icon.className = 'intalks-notification-icon';
  
  // Set icon based on type
  switch (type) {
    case NotificationType.INFO:
      icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`;
      break;
    case NotificationType.SUCCESS:
      icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`;
      break;
    case NotificationType.WARNING:
      icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`;
      break;
    case NotificationType.ERROR:
      icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`;
      break;
  }

  // Create message container
  const messageContainer = document.createElement('div');
  messageContainer.className = 'intalks-notification-message';

  if (title) {
    const titleElement = document.createElement('div');
    titleElement.style.fontWeight = '600';
    titleElement.style.marginBottom = '4px';
    titleElement.textContent = title;
    messageContainer.appendChild(titleElement);
  }

  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageContainer.appendChild(messageElement);

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.className = 'intalks-notification-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => closeNotification(notification));

  notification.appendChild(icon);
  notification.appendChild(messageContainer);
  notification.appendChild(closeButton);

  notificationContainer.appendChild(notification);

  // Auto-close if duration is set
  if (duration > 0) {
    setTimeout(() => closeNotification(notification), duration);
  }

  return notification;
}

/**
 * Close a notification
 * @param {HTMLDivElement} notification - Notification element
 */
function closeNotification(notification) {
  notification.classList.add('closing');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

/**
 * Close all notifications
 */
export function closeAllNotifications() {
  if (!notificationContainer) return;

  const notifications = notificationContainer.querySelectorAll('.intalks-notification');
  notifications.forEach(notification => closeNotification(notification));
}

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

/** @type {HTMLDivElement|null} */
let errorOverlay = null;

/**
 * Initialize global error handling
 */
export function initGlobalErrorHandler() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    handleUnhandledError(event.error || new Error(event.message));
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    handleUnhandledError(event.reason);
  });
}

/**
 * Handle an uncaught error
 * @param {unknown} error - The error to handle
 */
function handleUnhandledError(error) {
  // Report the error
  reportError(error instanceof Error ? error : new Error(String(error)));

  // Don't show overlay for network errors during page load
  if (window.location.pathname !== '/' && !window.alreadyShownError) {
    showErrorOverlay(error);
    window.alreadyShownError = true;
  }

  // Log to console
  console.error('Unhandled error:', error);
}

/**
 * Show error overlay
 * @param {unknown} error - The error to display
 */
function showErrorOverlay(error) {
  hideLoading();

  if (errorOverlay) {
    errorOverlay.remove();
  }

  const isError = error instanceof Error;
  const message = isError ? error.message : String(error);
  const stack = isError ? error.stack : null;

  errorOverlay = document.createElement('div');
  errorOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #dc2626;
    color: white;
    padding: 1rem;
    z-index: 9999;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.style.cssText = `
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0.5rem;
  `;
  closeButton.textContent = '\u00D7';
  closeButton.addEventListener('click', () => {
    errorOverlay.remove();
    errorOverlay = null;
  });

  // Create error content
  const content = document.createElement('div');
  content.style.marginTop = '2rem';
  
  const title = document.createElement('h2');
  title.style.margin = '0 0 0.5rem';
  title.style.fontSize = '18px';
  title.textContent = 'Something went wrong';
  
  const messageElement = document.createElement('p');
  messageElement.style.margin = '0 0 1rem';
  messageElement.textContent = message;

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Show details';
  summary.style.cursor = 'pointer';
  summary.style.marginBottom = '0.5rem';
  
  const code = document.createElement('code');
  code.style.cssText = `
    display: block;
    background: rgba(0,0,0,0.1);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 12px;
    white-space: pre-wrap;
    max-height: 200px;
    overflow: auto;
  `;
  code.textContent = stack || 'No stack trace available';
  
  details.appendChild(summary);
  details.appendChild(code);

  content.appendChild(title);
  content.appendChild(messageElement);
  content.appendChild(details);

  // Add refresh suggestion
  const refresh = document.createElement('p');
  refresh.style.margin = '1rem 0 0';
  refresh.style.fontSize = '14px';
  refresh.innerHTML = 'Please <button onclick="location.reload()" style="background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;">refresh the page</button> and try again.';
  content.appendChild(refresh);

  errorOverlay.appendChild(closeButton);
  errorOverlay.appendChild(content);
  document.body.prepend(errorOverlay);

  // Auto-hide after 30 seconds
  setTimeout(() => {
    if (errorOverlay && errorOverlay.parentNode) {
      errorOverlay.style.opacity = '0.8';
    }
  }, 30000);
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

/**
 * Create an error boundary for a component
 * @param {Object} options - Error boundary options
 * @param {Function} options.render - Function to render the component
 * @param {HTMLElement} [options.container] - Container element
 * @param {Function} [options.onError] - Error callback
 * @returns {Object} Error boundary instance
 */
export function createErrorBoundary({ render, container = document.body, onError }) {
  let hasError = false;
  let originalContent = null;

  return {
    render: async function() {
      if (hasError) return;

      try {
        showLoading();
        await render();
        hasError = false;
      } catch (error) {
        hasError = true;
        onError?.(error);
        
        // Clear the container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Show error message
        const errorElement = document.createElement('div');
        errorElement.style.cssText = `
          padding: 2rem;
          text-align: center;
          color: #dc2626;
          background: rgba(220, 38, 38, 0.05);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: 8px;
          font-family: system-ui, sans-serif;
        `;

        const title = document.createElement('h3');
        title.style.margin = '0 0 0.5rem';
        title.textContent = 'Error loading content';

        const message = document.createElement('p');
        message.style.margin = '0 0 1rem';
        message.textContent = error instanceof Error ? error.message : 'An unexpected error occurred';

        const retryButton = document.createElement('button');
        retryButton.textContent = 'Try again';
        retryButton.style.cssText = `
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-family: system-ui, sans-serif;
        `;
        retryButton.addEventListener('click', () => {
          hasError = false;
          this.render();
        });

        errorElement.appendChild(title);
        errorElement.appendChild(message);
        errorElement.appendChild(retryButton);

        container.appendChild(errorElement);
      } finally {
        hideLoading();
      }
    },

    reset: function() {
      hasError = false;
    },

    hasError: function() {
      return hasError;
    }
  };
}

// ============================================================================
// SAFE FUNCTION WRAPPERS
// ============================================================================

/**
 * Wrap a function to catch and report errors
 * @template T
 * @param {Function} fn - Function to wrap
 * @param {string} [context] - Context for error reporting
 * @returns {Function} Wrapped function
 */
export function safe(fn, context) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      reportError(error, { context, args });
      throw error;
    }
  };
}

/**
 * Wrap an async function to catch and report errors
 * @template T
 * @param {Function} fn - Async function to wrap
 * @param {string} [context] - Context for error reporting
 * @returns {Function} Wrapped function
 */
export function safeAsync(fn, context) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      reportError(error, { context, args });
      throw error;
    }
  };
}

/**
 * Retry a function with exponential backoff
 * @template T
 * @param {Function} fn - Function to retry
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelay=1000] - Base delay in ms
 * @param {number} [options.maxDelay=30000] - Maximum delay in ms
 * @param {Function} [options.onRetry] - Callback before each retry
 * @returns {Promise<T>} Result of the function
 */
export async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options;

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt > maxRetries) break;

      // Calculate delay with exponential backoff
      const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, delay, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  reportError,
  setErrorTracking,
  initGlobalErrorHandler,
  showErrorOverlay,
  NotificationType,
};
