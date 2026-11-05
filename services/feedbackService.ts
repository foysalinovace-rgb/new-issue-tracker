import { supabase } from '../lib/supabase';
import { dbService, parseIssueVirtualFields } from './dbService';
import type { Issue } from '../types';

export const feedbackService = {
  async getIssue(id: string): Promise<Issue | null> {
    if (!id || typeof id !== 'string') return null;
    const cleanId = id.trim();

    // 1. Direct query from Supabase issues table by primary ID
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        return parseIssueVirtualFields(data) as Issue;
      }
    } catch (err) {
      console.warn('Direct query on issues by id failed:', err);
    }

    // 2. Query by clickup_ticket_id in case link was generated with ticket ID
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('clickup_ticket_id', cleanId)
        .maybeSingle();

      if (!error && data) {
        return parseIssueVirtualFields(data) as Issue;
      }
    } catch {}

    // 3. Fallback to dbService.getIssueById (which includes cached issues fallback)
    try {
      const issue = await dbService.getIssueById(cleanId);
      if (issue) return issue;
    } catch {}

    // 4. Fallback to RPC get_public_issue_feedback if present on backend
    try {
      const { data, error } = await supabase.rpc('get_public_issue_feedback', { p_issue_id: cleanId });
      if (!error && data) {
        return parseIssueVirtualFields(data) as Issue;
      }
    } catch {}

    return null;
  },

  async submit(input: { issueId: string; resolvedConfirmed: string; rating: number; feedbackDate: string; comment: string }) {
    if (!input.issueId) throw new Error('Issue ID is required');

    let satisfaction = 'Average';
    if (input.rating === 5) satisfaction = 'Excellent';
    else if (input.rating === 4) satisfaction = 'Good';
    else if (input.rating === 3) satisfaction = 'Average';
    else if (input.rating === 2) satisfaction = 'Poor';
    else if (input.rating === 1) satisfaction = 'Very Poor';

    // Fetch existing issue to append customer comment cleanly to issue details
    const existing = await this.getIssue(input.issueId);
    let updatedDetails = existing?.issue_details || '';
    if (input.comment && input.comment.trim()) {
      const commentEntry = `\n[Customer Feedback (${input.feedbackDate})]: ${input.comment.trim()}`;
      if (!updatedDetails.includes(commentEntry.trim())) {
        updatedDetails = updatedDetails ? `${updatedDetails}${commentEntry}` : input.comment.trim();
      }
    }

    const updates: Partial<Issue> = {
      issue_resolved_confirmed: input.resolvedConfirmed as 'Yes' | 'No',
      feedback_rating: input.rating,
      customer_satisfaction: satisfaction,
      feedback_date: input.feedbackDate,
      issue_details: updatedDetails
    };

    // 1. Update directly via dbService.updateIssue (handles schema column fallbacks safely)
    try {
      await dbService.updateIssue(input.issueId, updates);
      return;
    } catch (err) {
      console.warn('dbService.updateIssue failed, trying RPC fallback:', err);
    }

    // 2. RPC fallback if defined
    try {
      const { error } = await supabase.rpc('submit_public_issue_feedback', {
        p_issue_id: input.issueId,
        p_resolved: input.resolvedConfirmed,
        p_rating: input.rating,
        p_feedback_date: input.feedbackDate,
        p_comment: input.comment,
      });
      if (error) throw error;
    } catch (rpcErr) {
      console.error('All methods to submit feedback failed:', rpcErr);
      throw rpcErr;
    }
  },
};
