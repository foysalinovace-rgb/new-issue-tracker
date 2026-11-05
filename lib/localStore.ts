type Row = Record<string, any>;
type Result = { data: any; error: { message: string; code?: string } | null; count?: number };
const PREFIX = 'issue_tracker_local_v1_';
const defaults: Record<string, string[]> = {
  issue_type: ['System Bugs', 'Device Issues', 'Awareness', 'Help Requests'],
  priority: ['Low', 'Medium', 'High'], status: ['Open', 'Close', 'Pending', 'In Progress', 'Done'],
  assigned_person: ['Fuad', 'Rahat', 'Foysal', 'Taqi', 'Fariha'],
  system_name: ['CS', 'HRM', 'APP', 'BEP', 'ALL WITHOUT BEP'],
  issue_category: ['Software', 'Hardware', 'Network'], segment: ['Segment A', 'Segment B'],
};

function read(table: string): Row[] {
  const raw = localStorage.getItem(PREFIX + table);
  if (raw !== null) return JSON.parse(raw);
  if (table === 'settings') {
    const rows = Object.entries(defaults).flatMap(([category, names]) => names.map(name => ({
      id: crypto.randomUUID(), category, name, created_at: new Date().toISOString(),
    })));
    localStorage.setItem(PREFIX + table, JSON.stringify(rows));
    return rows;
  }
  return [];
}

class LocalQuery implements PromiseLike<Result> {
  private filters: ((row: Row) => boolean)[] = [];
  private sorts: { key: string; ascending: boolean }[] = [];
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Row[] = [];
  private start = 0;
  private end = Infinity;
  private one = false;
  private required = false;
  private conflict = 'id';
  private result?: Promise<Result>;
  constructor(private table: string) {}
  select(..._args: any[]) { return this; }
  insert(value: Row | Row[]) { this.action = 'insert'; this.payload = Array.isArray(value) ? value : [value]; return this; }
  upsert(value: Row | Row[], options?: { onConflict?: string }) { this.insert(value); this.action = 'upsert'; this.conflict = options?.onConflict || 'id'; return this; }
  update(value: Row) { this.action = 'update'; this.payload = [value]; return this; }
  delete() { this.action = 'delete'; return this; }
  eq(key: string, value: any) { this.filters.push(row => row[key] === value); return this; }
  neq(key: string, value: any) { this.filters.push(row => row[key] !== value); return this; }
  in(key: string, values: any[]) { this.filters.push(row => values.includes(row[key])); return this; }
  not(key: string, operator: string, value: any) { this.filters.push(row => operator === 'is' && value === null ? row[key] != null : row[key] !== value); return this; }
  or(expression: string) {
    const conditions = expression.split(',').map(part => { const [key, op, ...value] = part.split('.'); return { key, op, value: value.join('.') }; });
    this.filters.push(row => conditions.some(c => c.op === 'eq' && String(row[c.key]) === c.value)); return this;
  }
  order(key: string, options?: { ascending?: boolean }) { this.sorts.push({ key, ascending: options?.ascending !== false }); return this; }
  range(start: number, end: number) { this.start = start; this.end = end; return this; }
  limit(count: number) { this.end = this.start + count - 1; return this; }
  single() { this.one = true; this.required = true; return this; }
  maybeSingle() { this.one = true; return this; }
  private async execute(): Promise<Result> {
    try {
      let rows = read(this.table);
      const matches = (row: Row) => this.filters.every(filter => filter(row));
      let selected = rows.filter(matches);
      const now = new Date().toISOString();
      if (this.action === 'insert' || this.action === 'upsert') {
        selected = this.payload.map(value => {
          const existing = this.action === 'upsert' ? rows.find(row => row[this.conflict] === value[this.conflict]) : undefined;
          const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...existing, ...value };
          if (existing) rows[rows.indexOf(existing)] = row; else rows.push(row);
          return row;
        });
      } else if (this.action === 'update') {
        selected = selected.map(row => ({ ...row, ...this.payload[0], updated_at: now }));
        const updates = new Map(selected.map(row => [row.id, row]));
        rows = rows.map(row => updates.get(row.id) || row);
      } else if (this.action === 'delete') rows = rows.filter(row => !matches(row));
      if (this.action !== 'select') {
        localStorage.setItem(PREFIX + this.table, JSON.stringify(rows));
        window.dispatchEvent(new CustomEvent('local-data-changed', { detail: { table: this.table } }));
      }
      selected.sort((a, b) => {
        for (const sort of this.sorts) {
          const result = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), undefined, { numeric: true });
          if (result) return sort.ascending ? result : -result;
        }
        return 0;
      });
      const count = selected.length;
      selected = selected.slice(this.start, this.end === Infinity ? undefined : this.end + 1);
      if (this.required && selected.length !== 1) return { data: null, error: { message: 'Local record was not found.' } };
      return { data: this.one ? selected[0] ?? null : selected, error: null, count };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : 'Unable to save local data.' } };
    }
  }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    this.result ??= this.execute();
    return this.result.then(onfulfilled, onrejected);
  }
}
class LocalChannel {
  private table = '';
  private callback = () => {};
  private listener = (event: Event) => {
    if (event instanceof StorageEvent ? event.key === PREFIX + this.table : (event as CustomEvent).detail?.table === this.table) this.callback();
  };
  on(_event: string, filter: { table: string; event?: string; schema?: string }, callback: () => void) { this.table = filter.table; this.callback = callback; return this; }
  subscribe() { window.addEventListener('local-data-changed', this.listener); window.addEventListener('storage', this.listener); return this; }
  unsubscribe() { window.removeEventListener('local-data-changed', this.listener); window.removeEventListener('storage', this.listener); }
}
export const localStore = {
  from: (table: string) => new LocalQuery(table),
  channel: (_name: string) => new LocalChannel(),
  removeChannel: (channel: LocalChannel) => channel.unsubscribe(),
  rpc: async (fn: string, params?: any) => {
    try {
      if (fn === 'get_public_issue_feedback') {
        const issues = read('issues');
        const found = issues.find(i => i.id === params?.p_issue_id);
        return { data: found || null, error: null };
      }
      if (fn === 'submit_public_issue_feedback') {
        const issues = read('issues');
        const idx = issues.findIndex(i => i.id === params?.p_issue_id);
        if (idx !== -1) {
          issues[idx] = {
            ...issues[idx],
            feedback_rating: params?.p_rating,
            feedback_comment: params?.p_comment,
            feedback_date: params?.p_feedback_date,
            status: params?.p_resolved === 'Yes' ? 'Close' : issues[idx].status,
          };
          localStorage.setItem(PREFIX + 'issues', JSON.stringify(issues));
          window.dispatchEvent(new CustomEvent('local-data-changed', { detail: { table: 'issues' } }));
        }
        return { data: null, error: null };
      }
      if (fn === 'get_public_branding') {
        const rows = read('branding_settings');
        return { data: rows[0] || null, error: null };
      }
    } catch {}
    return { data: null, error: null };
  },
};
