
import { Issue, MonthlyEntry, SystemDowntime, SettingItem, BrandingConfig } from '../types';
import { supabase, isLocalMode } from '../lib/supabase';

export const DEFAULT_BRANDING: BrandingConfig = {
  id: 'default',
  brand_name: 'Issue Tracker',
  subtitle: 'Inovace Technologies Ltd.',
  logo_url: null,
};

export function applyFaviconAndTitle(branding: Partial<BrandingConfig>): void {
  if (typeof document === 'undefined') return;

  if (branding.brand_name) {
    document.title = branding.brand_name;
  }

  const faviconUrl = branding.logo_url;
  if (faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }
}

// Default initial settings
const INITIAL_SETTINGS: Omit<SettingItem, 'id' | 'created_at'>[] = [
  { category: 'issue_type', name: 'System Bugs' },
  { category: 'issue_type', name: 'Device Issues' },
  { category: 'issue_type', name: 'Awareness' },
  { category: 'issue_type', name: 'Help Requests' },
  { category: 'priority', name: 'Low' },
  { category: 'priority', name: 'Medium' },
  { category: 'priority', name: 'High' },
  { category: 'status', name: 'Open' },
  { category: 'status', name: 'Close' },
  { category: 'status', name: 'Pending' },
  { category: 'status', name: 'In Progress' },
  { category: 'status', name: 'Done' },
  { category: 'assigned_person', name: 'Fuad' },
  { category: 'assigned_person', name: 'Rahat' },
  { category: 'assigned_person', name: 'Foysal' },
  { category: 'assigned_person', name: 'Taqi' },
  { category: 'assigned_person', name: 'Fariha' },
  { category: 'system_name', name: 'CS' },
  { category: 'system_name', name: 'HRM' },
  { category: 'system_name', name: 'APP' },
  { category: 'system_name', name: 'BEP' },
  { category: 'system_name', name: 'ALL WITHOUT BEP' },
  { category: 'issue_category', name: 'Software' },
  { category: 'issue_category', name: 'Hardware' },
  { category: 'issue_category', name: 'Network' },
  { category: 'segment', name: 'Segment A' },
  { category: 'segment', name: 'Segment B' },
];

export function parseIssueVirtualFields(issue: any): any {
  if (!issue) return issue;
  let details = issue.issue_details || '';
  let response_time = issue.response_time || '';
  let resolution_time = issue.resolution_time || '';
  let resolution_date = issue.resolution_date || '';
  let client_reporting_time = issue.client_reporting_time || '';
  let issue_resolved_confirmed = issue.issue_resolved_confirmed || '';
  let customer_satisfaction = issue.customer_satisfaction || '';
  let feedback_date = issue.feedback_date || '';
  let feedback_rating = issue.feedback_rating || '';
  let called_by = issue.called_by || '';

  // Fallback to metadata tag format if the actual columns are empty
  if (!response_time || !resolution_time || !resolution_date || !client_reporting_time || !issue_resolved_confirmed || !customer_satisfaction || !feedback_date || !feedback_rating || !called_by) {
    const tagRegex = /\[Metadata: [^\]]*\]/;
    const match = details.match(tagRegex);
    if (match) {
      const tagContent = match[0];
      
      const rtMatch = tagContent.match(/ResponseTime="([^"]*)"/);
      if (rtMatch && !response_time) response_time = rtMatch[1];
      
      const rsMatch = tagContent.match(/ResolutionTime="([^"]*)"/);
      if (rsMatch && !resolution_time) resolution_time = rsMatch[1];

      const rsdMatch = tagContent.match(/ResolutionDate="([^"]*)"/);
      if (rsdMatch && !resolution_date) resolution_date = rsdMatch[1];

      const crMatch = tagContent.match(/ClientReportingTime="([^"]*)"/);
      if (crMatch && !client_reporting_time) client_reporting_time = crMatch[1];

      const ircMatch = tagContent.match(/IssueResolvedConfirmed="([^"]*)"/);
      if (ircMatch && !issue_resolved_confirmed) issue_resolved_confirmed = ircMatch[1];

      const csMatch = tagContent.match(/CustomerSatisfaction="([^"]*)"/);
      if (csMatch && !customer_satisfaction) customer_satisfaction = csMatch[1];

      const fdMatch = tagContent.match(/FeedbackDate="([^"]*)"/);
      if (fdMatch && !feedback_date) feedback_date = fdMatch[1];

      const frMatch = tagContent.match(/FeedbackRating="([^"]*)"/);
      if (frMatch && !feedback_rating) feedback_rating = frMatch[1];

      const cbMatch = tagContent.match(/CalledBy="([^"]*)"/);
      if (cbMatch && !called_by) called_by = cbMatch[1];

      details = details.replace(tagRegex, '').trim();
    }
  }
  
  return {
    ...issue,
    segment: issue.segment || '',
    clickup_ticket_id: issue.clickup_ticket_id || '',
    issue_details: details,
    response_time: response_time || '',
    resolution_time: resolution_time || '',
    resolution_date: resolution_date || '',
    client_reporting_time: client_reporting_time || '',
    issue_resolved_confirmed: issue_resolved_confirmed || '',
    feedback_rating: feedback_rating ? Number(feedback_rating) : undefined,
    customer_satisfaction: customer_satisfaction || '',
    feedback_date: feedback_date || '',
    called_by: called_by || ''
  };
}

export function serializeIssueVirtualFields(issue: any): any {
  // Returns issue unaltered now since we support actual columns!
  return issue;
}

export const dbService = {
  // Settings
  async getSettings(): Promise<SettingItem[]> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .neq('category', 'module_config')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching settings:', error);
      return [];
    }

    if (data.length === 0) {
      // Seed initial settings if none exist
      const settingsToInsert = INITIAL_SETTINGS.map(s => ({
        ...s,
        created_at: new Date().toISOString()
      }));
      const { data: seededData, error: seedError } = await supabase
        .from('settings')
        .insert(settingsToInsert)
        .select();
      
      if (seedError) {
        console.error('Error seeding settings:', seedError);
        return [];
      }
      return seededData as SettingItem[];
    }

    return data as SettingItem[];
  },

  async getSettingsByCategory(category: SettingItem['category']): Promise<SettingItem[]> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(`Error fetching settings for ${category}:`, error);
      return [];
    }
    return data as SettingItem[];
  },

  async saveSetting(setting: Omit<SettingItem, 'id' | 'created_at'>): Promise<SettingItem> {
    const { data, error } = await supabase
      .from('settings')
      .insert([setting])
      .select()
      .single();
    
    if (error) throw error;
    return data as SettingItem;
  },

  async updateSetting(id: string, name: string): Promise<SettingItem> {
    const { data, error } = await supabase
      .from('settings')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as SettingItem;
  },

  async deleteSetting(id: string): Promise<void> {
    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Issues
  async getIssues(): Promise<Issue[]> {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching issues batch:', error);
        break;
      }

      if (data && data.length > 0) {
        allData.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    return allData.map(item => parseIssueVirtualFields(item)) as Issue[];
  },

  async getClientNames(): Promise<{ name: string; count: number }[]> {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('client_name')
        .not('client_name', 'is', null);

      if (error) {
        console.error('Error fetching client names from Supabase:', error);
      }

      const clientCounts = new Map<string, number>();
      if (data && data.length > 0) {
        data.forEach(item => {
          const name = (item.client_name || '').trim();
          if (name) {
            clientCounts.set(name, (clientCounts.get(name) || 0) + 1);
          }
        });
      }

      // Check localStorage for previously remembered client names
      try {
        const cached = localStorage.getItem('known_client_names');
        if (cached) {
          const parsed: string[] = JSON.parse(cached);
          parsed.forEach(name => {
            const trimmed = (name || '').trim();
            if (trimmed && !clientCounts.has(trimmed)) {
              clientCounts.set(trimmed, 1);
            }
          });
        }
      } catch (e) {}

      const result = Array.from(clientCounts.entries()).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

      try {
        localStorage.setItem('known_client_names', JSON.stringify(result.map(r => r.name)));
      } catch (e) {}

      return result;
    } catch (err) {
      console.error('Failed to get client names:', err);
      try {
        const cached = localStorage.getItem('known_client_names');
        if (cached) {
          return JSON.parse(cached).map((name: string) => ({ name, count: 1 }));
        }
      } catch (e) {}
      return [];
    }
  },

  async saveIssue(issue: Omit<Issue, 'id' | 'created_at' | 'updated_at'> & { created_at?: string }): Promise<Issue> {
    const serialized = serializeIssueVirtualFields(issue);
    console.log('Attempting to save issue to Supabase:', serialized);
    let { data, error } = await supabase
      .from('issues')
      .insert([serialized])
      .select();
    
    // Fallback if newly added columns do not exist in the remote Supabase schema
    if (error && (
      error.message?.includes('column') || 
      error.message?.includes('schema cache') || 
      error.code === 'PGRST204' || 
      error.code === '42703'
    )) {
      console.warn('Column issue in Supabase, using metadata fallback:', error.message);
      const metaParts: string[] = [];
      if (issue.response_time) metaParts.push(`ResponseTime="${issue.response_time}"`);
      if (issue.resolution_time) metaParts.push(`ResolutionTime="${issue.resolution_time}"`);
      if (issue.resolution_date) metaParts.push(`ResolutionDate="${issue.resolution_date}"`);
      if (issue.client_reporting_time) metaParts.push(`ClientReportingTime="${issue.client_reporting_time}"`);
      if (issue.issue_resolved_confirmed) metaParts.push(`IssueResolvedConfirmed="${issue.issue_resolved_confirmed}"`);
      if (issue.customer_satisfaction) metaParts.push(`CustomerSatisfaction="${issue.customer_satisfaction}"`);
      if (issue.feedback_date) metaParts.push(`FeedbackDate="${issue.feedback_date}"`);
      if (issue.feedback_rating) metaParts.push(`FeedbackRating="${issue.feedback_rating}"`);
      if (issue.called_by) metaParts.push(`CalledBy="${issue.called_by}"`);

      let cleanDetails = (issue.issue_details || '').replace(/\[Metadata: [^\]]*\]/, '').trim();
      if (metaParts.length > 0) {
        cleanDetails = `${cleanDetails} [Metadata: ${metaParts.join(' ')}]`;
      }

      const fallbackPayload: any = { ...serialized, issue_details: cleanDetails };
      delete fallbackPayload.issue_resolved_confirmed;
      delete fallbackPayload.customer_satisfaction;
      delete fallbackPayload.feedback_date;
      delete fallbackPayload.resolution_date;
      delete fallbackPayload.feedback_rating;
      delete fallbackPayload.called_by;

      const retryRes = await supabase
        .from('issues')
        .insert([fallbackPayload])
        .select();

      if (!retryRes.error && retryRes.data && retryRes.data.length > 0) {
        data = retryRes.data;
        error = null;
      } else if (retryRes.error) {
        error = retryRes.error;
      }
    }
    
    if (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }
    if (!data || data.length === 0) {
      console.error('Supabase Insert returned no data');
      throw new Error('No data returned from Supabase after insert');
    }

    try {
      const name = (issue.client_name || '').trim();
      if (name) {
        const cached = localStorage.getItem('known_client_names');
        const list: string[] = cached ? JSON.parse(cached) : [];
        if (!list.some(n => n.toLowerCase() === name.toLowerCase())) {
          list.push(name);
          localStorage.setItem('known_client_names', JSON.stringify(list));
        }
      }
    } catch (e) {}

    console.log('Successfully saved to Supabase:', data[0]);
    return parseIssueVirtualFields(data[0]) as Issue;
  },

  async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue> {
    const finalUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    let { data, error } = await supabase
      .from('issues')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();
    
    // Fallback if newly added columns do not exist in the remote Supabase schema
    if (error && (
      error.message?.includes('column') || 
      error.message?.includes('schema cache') || 
      error.code === 'PGRST204' || 
      error.code === '42703'
    )) {
      console.warn('Column issue during update in Supabase, using metadata fallback:', error.message);
      const metaParts: string[] = [];
      if (updates.response_time !== undefined) metaParts.push(`ResponseTime="${updates.response_time}"`);
      if (updates.resolution_time !== undefined) metaParts.push(`ResolutionTime="${updates.resolution_time}"`);
      if (updates.resolution_date !== undefined) metaParts.push(`ResolutionDate="${updates.resolution_date}"`);
      if (updates.client_reporting_time !== undefined) metaParts.push(`ClientReportingTime="${updates.client_reporting_time}"`);
      if (updates.issue_resolved_confirmed !== undefined) metaParts.push(`IssueResolvedConfirmed="${updates.issue_resolved_confirmed}"`);
      if (updates.customer_satisfaction !== undefined) metaParts.push(`CustomerSatisfaction="${updates.customer_satisfaction}"`);
      if (updates.feedback_date !== undefined) metaParts.push(`FeedbackDate="${updates.feedback_date}"`);
      if (updates.feedback_rating !== undefined) metaParts.push(`FeedbackRating="${updates.feedback_rating}"`);
      if (updates.called_by !== undefined) metaParts.push(`CalledBy="${updates.called_by}"`);

      let cleanDetails = ((updates.issue_details || '') as string).replace(/\[Metadata: [^\]]*\]/, '').trim();
      if (metaParts.length > 0) {
        cleanDetails = `${cleanDetails} [Metadata: ${metaParts.join(' ')}]`;
      }

      const fallbackUpdates: any = { ...finalUpdates, issue_details: cleanDetails };
      delete fallbackUpdates.issue_resolved_confirmed;
      delete fallbackUpdates.customer_satisfaction;
      delete fallbackUpdates.feedback_date;
      delete fallbackUpdates.resolution_date;
      delete fallbackUpdates.feedback_rating;
      delete fallbackUpdates.called_by;

      const retryRes = await supabase
        .from('issues')
        .update(fallbackUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (!retryRes.error && retryRes.data) {
        data = retryRes.data;
        error = null;
      }
    }

    if (error) throw error;
    return parseIssueVirtualFields(data) as Issue;
  },

  async getIssueById(id: string): Promise<Issue | null> {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching issue by ID directly, falling back to getIssues:', error);
        const all = await this.getIssues();
        return all.find(i => String(i.id) === String(id)) || null;
      }

      if (!data) {
        const all = await this.getIssues();
        return all.find(i => String(i.id) === String(id)) || null;
      }

      return parseIssueVirtualFields(data) as Issue;
    } catch (err) {
      console.error('getIssueById error:', err);
      const all = await this.getIssues();
      return all.find(i => String(i.id) === String(id)) || null;
    }
  },

  async deleteIssue(id: string): Promise<void> {
    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteIssues(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('issues')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
  },

  // Monthly Entries
  async getMonthlyEntries(): Promise<MonthlyEntry[]> {
    const { data, error } = await supabase
      .from('monthly_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching monthly entries:', error);
      return [];
    }
    return data as MonthlyEntry[];
  },

  async saveMonthlyEntry(entry: Omit<MonthlyEntry, 'id' | 'created_at'>): Promise<MonthlyEntry> {
    const { data, error } = await supabase
      .from('monthly_entries')
      .insert([entry])
      .select()
      .single();
    
    if (error) throw error;
    return data as MonthlyEntry;
  },

  async updateMonthlyEntry(id: string, updates: Partial<MonthlyEntry>): Promise<MonthlyEntry> {
    const { data, error } = await supabase
      .from('monthly_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as MonthlyEntry;
  },

  async deleteMonthlyEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('monthly_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // System Downtime
  async getDowntime(): Promise<SystemDowntime[]> {
    const { data, error } = await supabase
      .from('system_downtime')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching downtime:', error);
      return [];
    }
    return data as SystemDowntime[];
  },

  async saveDowntime(entry: Omit<SystemDowntime, 'id' | 'created_at'>): Promise<SystemDowntime> {
    const { data, error } = await supabase
      .from('system_downtime')
      .insert([entry])
      .select()
      .single();
    
    if (error) throw error;
    return data as SystemDowntime;
  },

  async deleteDowntime(id: string): Promise<void> {
    const { error } = await supabase
      .from('system_downtime')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateDowntime(id: string, updates: Partial<SystemDowntime>): Promise<SystemDowntime> {
    const { data, error } = await supabase
      .from('system_downtime')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as SystemDowntime;
  },

  // Branding & Logo
  getCachedBranding(): BrandingConfig {
    try {
      const cached = localStorage.getItem('app_branding');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.subtitle === 'INOVACE' || parsed.subtitle === 'Inovace') {
          parsed.subtitle = 'Inovace Technologies Ltd.';
        }
        return { ...DEFAULT_BRANDING, ...parsed };
      }
    } catch (e) {}
    return DEFAULT_BRANDING;
  },

  async getBranding(): Promise<BrandingConfig> {
    const cached = this.getCachedBranding();
    try {
      const { data, error } = isLocalMode
        ? await supabase.from('branding_settings').select('*').eq('id', 'default').maybeSingle()
        : await supabase.rpc('get_public_branding');

      if (error) {
        console.warn('Could not fetch branding from Supabase, using local settings:', error.message);
        return cached;
      }

      if (data) {
        let sub = data.subtitle !== undefined ? data.subtitle : DEFAULT_BRANDING.subtitle;
        if (sub === 'INOVACE' || sub === 'Inovace') {
          sub = 'Inovace Technologies Ltd.';
        }
        const branding: BrandingConfig = {
          id: data.id || 'default',
          brand_name: data.brand_name || DEFAULT_BRANDING.brand_name,
          subtitle: sub,
          logo_url: data.logo_url || null,
          updated_at: data.updated_at
        };
        try {
          localStorage.setItem('app_branding', JSON.stringify(branding));
        } catch (e) {}
        applyFaviconAndTitle(branding);
        return branding;
      }
    } catch (err) {
      console.warn('Error connecting to Supabase branding table:', err);
    }
    return cached;
  },

  async saveBranding(branding: { brand_name: string; subtitle: string; logo_url: string | null }): Promise<BrandingConfig> {
    const updated: BrandingConfig = {
      id: 'default',
      brand_name: branding.brand_name.trim() || DEFAULT_BRANDING.brand_name,
      subtitle: branding.subtitle.trim(),
      logo_url: branding.logo_url || null,
      updated_at: new Date().toISOString()
    };

    // Cache locally immediately so user sees immediate results
    try {
      localStorage.setItem('app_branding', JSON.stringify(updated));
    } catch (e) {}
    applyFaviconAndTitle(updated);

    // Notify components (like Layout) instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('branding-changed', { detail: updated }));
    }

    // Upsert into Supabase branding_settings table
    try {
      const { data, error } = await supabase
        .from('branding_settings')
        .upsert({
          id: 'default',
          brand_name: updated.brand_name,
          subtitle: updated.subtitle,
          logo_url: updated.logo_url,
          updated_at: updated.updated_at
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save branding in Supabase table (please ensure SQL table is created):', error);
      } else if (data) {
        return {
          id: data.id,
          brand_name: data.brand_name,
          subtitle: data.subtitle,
          logo_url: data.logo_url,
          updated_at: data.updated_at
        };
      }
    } catch (err) {
      console.error('Error saving branding to Supabase:', err);
    }

    return updated;
  }
};

