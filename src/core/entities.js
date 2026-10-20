/**
 * Entity Management Module
 * 
 * Centralized entity data management including:
 * - Entity loading and initialization
 * - Entity lookup and indexing
 * - Labs catalog management
 * - Entity filtering and grouping
 */

import type { 
  Entity, 
  EntityType, 
  EntityKind,
  University,
  Company,
  Lab,
  CatalogRow
} from '../types/index.js';

// ============================================================================
// GLOBAL STATE
// ============================================================================

/** @type {Entity[]} */
let ENTITIES = [];

/** @type {Record<string, Entity>} */
let entityById = {};

/** @type {Record<string, Entity>} */
let uniById = {}; // Alias for backwards compatibility

/** @type {Entity[]} */
let COMPANIES_LIST = [];

/** @type {Entity[]} */
let STARTUPS_LIST = [];

/** @type {Entity[]} */
let SP500_LIST = [];

/** @type {Lab[]} */
let LABS_LIST = [];

let labsLoading = null;
let labsLoadFailed = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize entities from global data (from data.js or data.live.js)
 * Called at application startup
 */
export function initializeEntities() {
  // Check for global data (injected by data.js or data.live.js)
  const globalCompanies = typeof COMPANIES !== 'undefined' && Array.isArray(COMPANIES) ? COMPANIES : [];
  const globalStartups = typeof STARTUPS !== 'undefined' && Array.isArray(STARTUPS) ? STARTUPS : [];
  const globalSp500 = typeof SP500 !== 'undefined' && Array.isArray(SP500) ? SP500 : [];
  const globalLabs = typeof LABS !== 'undefined' && Array.isArray(LABS) ? LABS.filter(e => e && e.type === 'lab') : [];
  const globalUni = typeof UNIVERSITIES !== 'undefined' && Array.isArray(UNIVERSITIES) ? UNIVERSITIES : [];

  // Initialize lists
  COMPANIES_LIST = globalCompanies.map(c => ({ type: 'company', ...c }));
  STARTUPS_LIST = globalStartups.map(s => ({ type: 'startup', ...s }));
  SP500_LIST = globalSp500.map(c => ({ type: 'company', ...c }));
  LABS_LIST = globalLabs;

  // Build entity array
  ENTITIES = [
    ...globalUni.map(u => ({ type: 'university', ...u })),
    ...COMPANIES_LIST,
    ...STARTUPS_LIST,
    ...SP500_LIST,
    ...LABS_LIST,
  ];

  // Build lookup maps
  entityById = Object.fromEntries(ENTITIES.map(e => [e.id, e]));
  uniById = entityById; // Alias

  console.log(`Initialized ${ENTITIES.length} entities`);
  return ENTITIES;
}

/**
 * Reset entities to initial state
 * Useful for reloading data
 */
export function resetEntities() {
  ENTITIES = [];
  entityById = {};
  uniById = {};
  COMPANIES_LIST = [];
  STARTUPS_LIST = [];
  SP500_LIST = [];
  LABS_LIST = [];
}

// ============================================================================
// ACCESSORS
// ============================================================================

/**
 * Get all entities
 * @returns {Entity[]} Array of all entities
 */
export function getAllEntities() {
  return ENTITIES;
}

/**
 * Get entity by ID
 * @param {string} id - Entity ID
 * @returns {Entity|undefined} Entity or undefined if not found
 */
export function getEntityById(id) {
  return entityById[id];
}

/**
 * Get entities by type
 * @param {EntityType} type - Entity type to filter by
 * @returns {Entity[]} Filtered entities
 */
export function getEntitiesByType(type) {
  return ENTITIES.filter(e => e.type === type);
}

/**
 * Get entities by kind
 * @param {EntityKind} kind - Entity kind to filter by
 * @returns {Entity[]} Filtered entities
 */
export function getEntitiesByKind(kind) {
  return ENTITIES.filter(e => e.kind === kind);
}

/**
 * Get entities by field
 * @param {string} field - Field to filter by
 * @returns {Entity[]} Filtered entities
 */
export function getEntitiesByField(field) {
  return ENTITIES.filter(e => e.field && e.field.includes(field));
}

/**
 * Get entities by country
 * @param {string} country - Country to filter by
 * @returns {Entity[]} Filtered entities
 */
export function getEntitiesByCountry(country) {
  return ENTITIES.filter(e => e.country === country);
}

/**
 * Get entities by region
 * @param {string} region - Region to filter by
 * @returns {Entity[]} Filtered entities
 */
export function getEntitiesByRegion(region) {
  return ENTITIES.filter(e => e.region === region);
}

// ============================================================================
// LABS CATALOG
// ============================================================================

/**
 * Fetch all labs from the API with pagination
 * @returns {Promise<Lab[]>} Promise resolving to labs array
 */
async function itkFetchAllLabs() {
  const LIMIT = 5000;
  const BATCH = 4;

  /** @type {(offset: number, tries: number) => Promise<{total?: number, rows?: CatalogRow[]}>} */
  const page = (offset, tries) => {
    return fetch(`api/labs?limit=${LIMIT}&offset=${offset}`, { 
      headers: { Accept: 'application/json' } 
    })
      .then(r => {
        if (!r.ok) throw new Error(`labs HTTP ${r.status}`);
        return r.json();
      })
      .catch(err => {
        if (tries <= 0) throw err;
        return new Promise(res => setTimeout(res, 600)).then(() => page(offset, tries - 1));
      });
  };

  const first = await page(0, 3);
  const total = (first && typeof first.total === 'number') ? first.total : (first ? first.rows?.length : 0);
  const offsets = [];

  for (let off = LIMIT; off < total; off += LIMIT) {
    offsets.push(off);
  }

  const pages = [first];
  let i = 0;

  /** @type {() => Promise<void>} */
  const pump = () => {
    if (i >= offsets.length) return Promise.resolve();
    const idx = i++;
    return page(offsets[idx], 3)
      .then(p => { 
        if (p) pages[idx + 1] = p; 
      })
      .then(pump);
  };

  const workers = [];
  for (let w = 0; w < BATCH; w++) {
    workers.push(pump());
  }

  await Promise.all(workers);

  const out = [];
  for (let k = 0; k < pages.length; k++) {
    const p = pages[k];
    if (p && Array.isArray(p.rows)) {
      for (let j = 0; j < p.rows.length; j++) {
        out.push(p.rows[j]);
      }
    }
  }

  return out;
}

/**
 * Ensure labs catalog is loaded
 * Loads from global data first, then falls back to API
 * @returns {Promise<void>}
 */
export async function ensureLabs() {
  // Check if already loaded
  const windowLabs = typeof window !== 'undefined' && Array.isArray(window.LABS) ? window.LABS : null;
  
  if (LABS_LIST.length || (windowLabs && windowLabs.length)) {
    if (!LABS_LIST.length && windowLabs && windowLabs.length) {
      LABS_LIST = windowLabs.filter(e => e && e.type === 'lab');
    }
    return Promise.resolve();
  }

  // Avoid duplicate loads
  if (!labsLoading) {
    labsLoading = itkFetchAllLabs()
      .then(rows => {
        if (!Array.isArray(rows) || !rows.length) {
          throw new Error('empty labs catalog');
        }
        
        window.LABS = rows;
        LABS_LIST = rows.filter(e => e && e.type === 'lab');
        
        // Merge with existing entities
        const seen = new Set(ENTITIES.map(e => e.id));
        const n0 = ENTITIES.length;
        
        LABS_LIST.forEach(e => {
          if (e && e.id && !seen.has(e.id)) {
            seen.add(e.id);
            ENTITIES.push(e);
            entityById[e.id] = e;
          }
        });

        if (ENTITIES.length !== n0) {
          // Registry grew - notify other modules
          try {
            if (typeof itkNameAdopt === 'function') itkNameAdopt();
            else if (typeof ITK_ACT !== 'undefined') window.ITK_ACT = null;
          } catch (e3) {}
          
          try {
            if (typeof activeTab === 'string') {
              // Refresh active tab if render functions exist
              if (activeTab === 'companies' && typeof renderCompanies === 'function') renderCompanies();
              else if (activeTab === 'academic' && typeof renderAcademic === 'function') renderAcademic();
              else if (activeTab === 'ngo' && typeof renderNGO === 'function') renderNGO();
              else if (activeTab === 'otherinst' && typeof renderOtherInst === 'function') renderOtherInst();
            }
          } catch (e2) {}
        }
      })
      .catch(() => { 
        labsLoadFailed = true; 
      })
      .then(() => {});
  }

  return labsLoading;
}

/**
 * Check if labs catalog failed to load
 * @returns {boolean} True if load failed
 */
export function didLabsLoadFail() {
  return labsLoadFailed;
}

// ============================================================================
// FILTERING & SEARCH
// ============================================================================

/**
 * Search entities by name
 * @param {string} query - Search query
 * @param {number} [limit=20] - Maximum results
 * @returns {Entity[]} Matching entities
 */
export function searchEntities(query, limit = 20) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) return [];

  return ENTITIES
    .filter(e => 
      e.name?.toLowerCase().includes(searchTerm) ||
      (e.alias && e.alias.some(a => a.toLowerCase().includes(searchTerm)))
    )
    .slice(0, limit);
}

/**
 * Get entity suggestions for autocomplete
 * @param {string} query - Search query
 * @param {number} [limit=10] - Maximum suggestions
 * @returns {Entity[]} Suggestions
 */
export function getEntitySuggestions(query, limit = 10) {
  return searchEntities(query, limit);
}

// ============================================================================
// GROUPING & AGGREGATION
// ============================================================================

/**
 * Group entities by type
 * @returns {Record<EntityType, Entity[]>}
 */
export function groupByType() {
  /** @type {Record<EntityType, Entity[]>} */
  const groups = {};
  
  for (const entity of ENTITIES) {
    if (!groups[entity.type]) {
      groups[entity.type] = [];
    }
    groups[entity.type].push(entity);
  }
  
  return groups;
}

/**
 * Group entities by country
 * @returns {Record<string, Entity[]>}
 */
export function groupByCountry() {
  /** @type {Record<string, Entity[]>} */
  const groups = {};
  
  for (const entity of ENTITIES) {
    if (entity.country) {
      if (!groups[entity.country]) {
        groups[entity.country] = [];
      }
      groups[entity.country].push(entity);
    }
  }
  
  return groups;
}

/**
 * Group entities by region
 * @returns {Record<string, Entity[]>}
 */
export function groupByRegion() {
  /** @type {Record<string, Entity[]>} */
  const groups = {};
  
  for (const entity of ENTITIES) {
    if (entity.region) {
      if (!groups[entity.region]) {
        groups[entity.region] = [];
      }
      groups[entity.region].push(entity);
    }
  }
  
  return groups;
}

/**
 * Group entities by field
 * @returns {Record<string, Entity[]>}
 */
export function groupByField() {
  /** @type {Record<string, Entity[]>} */
  const groups = {};
  
  for (const entity of ENTITIES) {
    if (entity.field) {
      for (const field of Array.isArray(entity.field) ? entity.field : [entity.field]) {
        if (!groups[field]) {
          groups[field] = [];
        }
        if (!groups[field].some(e => e.id === entity.id)) {
          groups[field].push(entity);
        }
      }
    }
  }
  
  return groups;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an entity ID exists
 * @param {string} id - Entity ID to check
 * @returns {boolean}
 */
export function hasEntity(id) {
  return id in entityById;
}

/**
 * Get entity count
 * @returns {number}
 */
export function getEntityCount() {
  return ENTITIES.length;
}

/**
 * Get count by type
 * @param {EntityType} type - Entity type
 * @returns {number}
 */
export function getCountByType(type) {
  return getEntitiesByType(type).length;
}

// ============================================================================
// EXPORT GLOBALS FOR BACKWARDS COMPATIBILITY
// ============================================================================

// Export for backwards compatibility with existing code
window.ENTITIES = ENTITIES;
window.entityById = entityById;
window.uniById = uniById;
window.COMPANIES_LIST = COMPANIES_LIST;
window.STARTUPS_LIST = STARTUPS_LIST;
window.SP500_LIST = SP500_LIST;
window.LABS_LIST = LABS_LIST;
window.labsLoading = labsLoading;
window.labsLoadFailed = labsLoadFailed;

// Export public API
export {
  ENTITIES as entities,
  entityById,
  uniById,
  COMPANIES_LIST as companiesList,
  STARTUPS_LIST as startupsList,
  SP500_LIST as sp500List,
  LABS_LIST as labsList,
};
