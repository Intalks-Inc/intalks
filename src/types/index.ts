/**
 * Intalks Type Definitions
 * Central type definitions for the Intalks application
 */

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type EntityType = 
  | 'university'
  | 'company'
  | 'startup'
  | 'lab'
  | 'government'
  | 'funder'
  | 'bschool'
  | 'thinktank'
  | 'unagency'
  | 'intlorg'
  | 'ngo'
  | 'resorg'
  | 'artsschool'
  | 'policyschool'
  | 'engschool'
  | 'medschool'
  | 'lawschool';

export type EntityKind = 
  | 'university'
  | 'company'
  | 'startup'
  | 'lab'
  | 'government'
  | 'funder'
  | 'bschool'
  | 'thinktank'
  | 'unagency'
  | 'intlorg'
  | 'ngo'
  | 'resorg'
  | 'artsschool'
  | 'policyschool'
  | 'engschool'
  | 'medschool'
  | 'lawschool';

export interface EntityBase {
  id: string;
  name: string;
  type: EntityType;
  kind?: EntityKind;
}

export interface University extends EntityBase {
  type: 'university';
  kind?: 'university';
  country?: string;
  region?: string;
  field?: string[];
  status?: string;
  alias?: string[];
}

export interface Company extends EntityBase {
  type: 'company';
  kind?: 'company' | 'startup';
  country?: string;
  region?: string;
  field?: string[];
  status?: string;
  alias?: string[];
  industry?: string;
}

export interface Lab extends EntityBase {
  type: 'lab';
  kind?: 'lab' | 'program' | 'course';
  university?: string;
  field?: string[];
  status?: string;
}

export type Entity = University | Company | Lab | EntityBase;

// ============================================================================
// NEWS & CONTENT TYPES
// ============================================================================

export interface NewsItem {
  id: string;
  title: string;
  entity: string;
  entity_type: EntityType;
  field?: string;
  topic?: string;
  published?: string;
  date?: string;
  source?: string;
  link?: string;
  heat?: number;
  ageH?: number;
  live?: boolean;
  sourceName?: string;
  kind?: EntityKind;
}

export interface NormalizedNewsItem extends NewsItem {
  entity: string;
  entity_type: EntityType;
  field: string;
  title: string;
  heat: number;
  link: string;
  sourceName: string;
  ageH: number;
}

// ============================================================================
// CLUSTER & SIGNAL TYPES
// ============================================================================

export interface Cluster {
  id: string;
  title: string;
  entities: string[];
  momentum: number;
  days: number;
  items: NewsItem[];
  count: number;
  date?: string;
  kind?: string;
  field?: string;
}

export interface SignalCluster extends Cluster {
  whyLines?: string[];
  evidence?: EvidenceItem[];
  score?: number;
}

export interface EvidenceItem {
  id: string;
  entity: string;
  title: string;
  date: string;
  source: string;
  kind: EntityKind;
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export type TimeRange = 
  | 'hour1'
  | 'hour6'
  | 'hour12'
  | 'day'
  | 'week'
  | 'month'
  | 'all';

export type SortOrder = 'latest' | 'heat';

export type DatePart = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface Filters {
  region?: string;
  country?: string;
  entity?: string;
  field?: string;
  kind?: EntityKind;
  dateRange?: TimeRange;
  timeRange?: TimeRange;
  sort?: SortOrder;
  datePart?: DatePart;
  followOnly?: boolean;
  searchQuery?: string;
}

// ============================================================================
// TAB & NAVIGATION TYPES
// ============================================================================

export type TabName = 
  | 'today'
  | 'signal'
  | 'fields'
  | 'watchlists'
  | 'feed'
  | 'topics'
  | 'labs'
  | 'rating'
  | 'analytics'
  | 'digest'
  | 'entities'
  | 'import'
  | 'ops'
  | 'method'
  | 'about'
  | 'saved'
  | 'library'
  | 'events'
  | 'green'
  | 'jobs'
  | 'companies'
  | 'academic'
  | 'ngo'
  | 'otherinst'
  | 'reports'
  | 'books'
  | 'conferences'
  | 'funding'
  | 'blogs'
  | 'opinions'
  | 'magazines'
  | 'papers'
  | 'preprints'
  | 'trials'
  | 'datasets'
  | 'courses'
  | 'opportunities';

export type TabGroup = 'discover' | 'intelligence' | 'manage' | 'about' | 'library';

export interface TabConfig {
  name: TabName;
  label: string;
  group: TabGroup;
  icon?: string;
  title: string;
  hidden?: boolean;
  proOnly?: boolean;
}

// ============================================================================
// USER & TIER TYPES
// ============================================================================

export type Tier = 'free' | 'pro' | 'team' | 'enterprise';

export type Feature = 
  | 'today'
  | 'signal'
  | 'feed'
  | 'rating'
  | 'digest'
  | 'method'
  | 'fields'
  | 'watchlists'
  | 'exports'
  | 'api-key'
  | 'oi-delta'
  | 'shared'
  | 'team-dashboard'
  | 'weekly-briefs'
  | 'custom-fields'
  | 'white-label'
  | 'quarterly-briefs'
  | 'sla';

export interface User {
  id: string;
  email?: string;
  tier: Tier;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// DATA TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  total: number;
  rows: T[];
  limit?: number;
  offset?: number;
}

export interface CatalogRow {
  id: string;
  name: string;
  type: string;
  kind?: string;
  university?: string;
  field?: string;
  status?: string;
}

// ============================================================================
// STATE TYPES
// ============================================================================

export interface AppState {
  activeTab: TabName;
  filters: Filters;
  searchQuery: string;
  tier: Tier;
  user?: User;
  isLoading: boolean;
  error?: Error;
}

export interface TabState {
  filters: Filters;
  scrollPosition: number;
  lastUpdated: number;
}

// ============================================================================
// WATCHLIST TYPES
// ============================================================================

export interface Watchlist {
  id: string;
  name: string;
  filters: Filters;
  createdAt: string;
  updatedAt: string;
  alertFrequency?: 'instant' | 'daily' | 'weekly';
  alertMethod?: 'email' | 'slack';
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AnalyticsData {
  totalItems: number;
  byEntity: Record<string, number>;
  byField: Record<string, number>;
  byDate: Record<string, number>;
  byKind: Record<EntityKind, number>;
  momentum: number;
  growthRate: number;
}

// ============================================================================
// ORIGINATOR INDEX TYPES
// ============================================================================

export interface OriginatorStats {
  entity: string;
  originations: number;
  followings: number;
  share: number;
  rank: number;
  change?: number;
}

// ============================================================================
// AI & DIGEST TYPES
// ============================================================================

export interface DigestOptions {
  length: 'quick' | 'deep';
  scope: 'today' | 'watchlists' | string; // field or custom
  preset?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AICommand {
  query: string;
  context?: string;
  options?: Record<string, unknown>;
}

// ============================================================================
// WORKER TYPES
// ============================================================================

export type WorkerOperation = 
  | 'filter'
  | 'normalize'
  | 'cluster'
  | 'analyze'
  | 'search'
  | 'aggregate';

export interface WorkerMessage {
  type: 'operation';
  operation: WorkerOperation;
  data: unknown;
  options?: Record<string, unknown>;
}

export interface WorkerResult {
  type: 'result';
  operation: WorkerOperation;
  data: unknown;
  error?: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface AppEvent {
  type: string;
  detail?: unknown;
  timestamp: number;
}

export interface TabSwitchEvent extends AppEvent {
  type: 'tab:switch';
  detail: { from: TabName; to: TabName };
}

export interface FilterChangeEvent extends AppEvent {
  type: 'filter:change';
  detail: { filters: Filters };
}

export interface SearchEvent extends AppEvent {
  type: 'search';
  detail: { query: string; scope: string };
}

export interface DataLoadEvent extends AppEvent {
  type: 'data:load' | 'data:loaded' | 'data:error';
  detail: { source: string; count?: number; error?: string };
}
