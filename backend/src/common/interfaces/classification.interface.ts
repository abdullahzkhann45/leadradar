export interface Classification {
  is_relevant: boolean;
  service_line: number;
  is_nontechnical_founder: boolean;
  intent_to_pay: 'explicit' | 'implied' | 'none';
  budget_signal: boolean;
  urgency: 'high' | 'medium' | 'low';
  one_line_summary: string;
  suggested_proof: string;
  confidence: number;
}
