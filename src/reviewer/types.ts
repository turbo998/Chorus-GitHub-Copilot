export interface ReviewComment {
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ReviewResult {
  approved: boolean;
  confirmationRequired?: boolean;
  summary: string;
  comments: ReviewComment[];
}
