import { supabase } from '../lib/supabase';
import type { Issue } from '../types';

export const feedbackService = {
  async getIssue(id: string): Promise<Issue | null> {
    const { data, error } = await supabase.rpc('get_public_issue_feedback', { p_issue_id: id });
    if (error) throw error;
    return data as Issue | null;
  },
  async submit(input: { issueId: string; resolvedConfirmed: string; rating: number; feedbackDate: string; comment: string }) {
    const { error } = await supabase.rpc('submit_public_issue_feedback', {
      p_issue_id: input.issueId, p_resolved: input.resolvedConfirmed, p_rating: input.rating,
      p_feedback_date: input.feedbackDate, p_comment: input.comment,
    });
    if (error) throw error;
  },
};
