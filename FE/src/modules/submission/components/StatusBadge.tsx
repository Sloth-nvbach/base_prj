import { Badge } from '@/shared/components/ui/badge';
import type { SubmissionStatus } from '../types/submission.types';

export const StatusBadge = ({ status }: { status: SubmissionStatus }) => (
  <Badge variant={status === 'graded' ? 'default' : 'secondary'}>{status === 'graded' ? 'Graded' : 'Submitted'}</Badge>
);
