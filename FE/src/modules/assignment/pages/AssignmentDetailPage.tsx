import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '@/shared/components/error-state';
import { LoadingState } from '@/shared/components/loading-state';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/components/ui/button';
import { AssignmentEditTabs } from '../components/AssignmentEditTabs';
import { useAssignment } from '../hooks/use-assignments';

/** Teacher: edit one assignment, its test cases and rubric. */
export const AssignmentDetailPage = () => {
  const { id = '' } = useParams();
  const assignment = useAssignment(id);

  if (assignment.isPending) return <LoadingState />;
  if (assignment.isError) return <ErrorState error={assignment.error} onRetry={() => void assignment.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.data.title}
        description={`Status: ${assignment.data.status}, max score ${assignment.data.maxScore}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/assignments">
              <ArrowLeft className="mr-1 size-4" /> All assignments
            </Link>
          </Button>
        }
      />
      <AssignmentEditTabs assignment={assignment.data} isTeacherOrAdmin />
    </div>
  );
};
