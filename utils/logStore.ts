/* eslint-disable @typescript-eslint/no-explicit-any */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, any>;
}

type Subscriber = (logs: LogEntry[]) => void;

const STORAGE_KEY = 'sativar.logs.active';
const ARCHIVE_KEY_PREFIX = 'sativar.logs.archive.';
const MAX_ACTIVE_LOGS = 1000;
const MAX_ARCHIVES = 5;

export interface ArchiveInfo {
  key: string;
  timestamp: Date;
  count: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeParse(json: string | null): LogEntry[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as (Omit<LogEntry, 'timestamp'> & { timestamp: string })[];
    return arr.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

function persist(logs: LogEntry[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        logs.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() }))
      )
    );
  } catch {
    // ignore persistence errors
  }
}

class LogStoreImpl {
  private logs: LogEntry[] = [];
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    // hydrate from storage
    if (typeof window !== 'undefined' && window.localStorage) {
      this.logs = safeParse(localStorage.getItem(STORAGE_KEY));
    }
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    // initial push
    callback(this.logs.slice());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getLogs(): LogEntry[] {
    return this.logs.slice();
  }

  clear(): void {
    this.logs = [];
    persist(this.logs);
    this.emit();
  }

  add(entry: Omit<LogEntry, 'id' | 'timestamp'> & { timestamp?: Date }): void {
    const withId: LogEntry = {
      id: generateId(),
      timestamp: entry.timestamp ?? new Date(),
      level: entry.level,
      message: entry.message,
      context: entry.context,
      metadata: entry.metadata,
    };
    this.logs.push(withId);
    this.rotateIfNeeded();
    persist(this.logs);
    this.emit();
  }

  private emit(): void {
    const snapshot = this.logs.slice();
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  private rotateIfNeeded(): void {
    if (this.logs.length <= MAX_ACTIVE_LOGS) return;

    const overflow = this.logs.length - MAX_ACTIVE_LOGS;
    const toArchive = this.logs.splice(0, overflow);
    this.archive(toArchive);
  }

  private archive(entries: LogEntry[]): void {
    try {
      const key = `${ARCHIVE_KEY_PREFIX}${new Date().toISOString()}`;
      localStorage.setItem(
        key,
        JSON.stringify(entries.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })))
      );

      // enforce archive cap
      const archiveKeys = Object.keys(localStorage)
        .filter((k) => k.startsWith(ARCHIVE_KEY_PREFIX))
        .sort();
      if (archiveKeys.length > MAX_ARCHIVES) {
        const toDelete = archiveKeys.slice(0, archiveKeys.length - MAX_ARCHIVES);
        toDelete.forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // ignore archival errors
    }
  }

  listArchives(): ArchiveInfo[] {
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(ARCHIVE_KEY_PREFIX))
        .sort()
        .map((key) => {
          const tsIso = key.substring(ARCHIVE_KEY_PREFIX.length);
          const raw = localStorage.getItem(key);
          const items = safeParse(raw);
          return { key, timestamp: new Date(tsIso), count: items.length } as ArchiveInfo;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch {
      return [];
    }
  }

  readArchive(key: string): LogEntry[] {
    if (!key.startsWith(ARCHIVE_KEY_PREFIX)) return [];
    return safeParse(localStorage.getItem(key));
  }

  deleteArchive(key: string): void {
    if (!key.startsWith(ARCHIVE_KEY_PREFIX)) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  importLogsFromJSON(json: string): { imported: number } {
    try {
      const data = JSON.parse(json) as any[];
      const normalized: LogEntry[] = data.map((e: any) => ({
        id: e.id || generateId(),
        level: (e.level as LogLevel) || 'info',
        message: String(e.message ?? ''),
        context: e.context,
        metadata: e.metadata,
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      }));
      normalized.forEach((n) => this.add({ level: n.level, message: n.message, context: n.context, metadata: n.metadata, timestamp: n.timestamp }));
      return { imported: normalized.length };
    } catch {
      return { imported: 0 };
    }
  }
}

export const LogStore = new LogStoreImpl();


