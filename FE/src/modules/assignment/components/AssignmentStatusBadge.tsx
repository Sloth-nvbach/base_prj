import { Badge } from '@/shared/components/ui/badge';
import type { Assignment } from '../types/assignment.types';

const STATUS = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'success' },
  closed: { label: 'Closed', variant: 'destructive' },
} as const;

/** Draft / Published / Closed chip, shared by the assignment list and the home page. */
export const AssignmentStatusBadge = ({ status }: { status: Assignment['status'] }) => {
  const config = STATUS[status] ?? STATUS.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
