import { Link } from 'react-router-dom';
import { TestCaseTable } from '@/modules/testcase/components/TestCaseTable';
import { RubricBuilder } from '@/modules/rubric/components/RubricBuilder';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import type { Assignment } from '../types/assignment.types';
import { AssignmentDetailsForm } from './AssignmentDetailsForm';

interface AssignmentEditTabsProps {
  assignment: Assignment;
  isTeacherOrAdmin: boolean;
}

export const AssignmentEditTabs = ({ assignment, isTeacherOrAdmin }: AssignmentEditTabsProps) => (
  <Tabs defaultValue="details" className="w-full">
    <TabsList className="grid w-full grid-cols-4">
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
      <TabsTrigger value="rubric">Rubric</TabsTrigger>
      <TabsTrigger value="submissions">Submissions</TabsTrigger>
    </TabsList>

    <TabsContent value="details" className="pt-4">
      <AssignmentDetailsForm key={assignment.updatedAt} assignment={assignment} />
    </TabsContent>

    <TabsContent value="test-cases" className="pt-4">
      <TestCaseTable assignmentId={assignment._id} isTeacherOrAdmin={isTeacherOrAdmin} />
    </TabsContent>

    <TabsContent value="rubric" className="pt-4">
      <RubricBuilder assignmentId={assignment._id} isTeacherOrAdmin={isTeacherOrAdmin} />
    </TabsContent>

    <TabsContent value="submissions" className="pt-4">
      <Button asChild>
        <Link to={`/submissions?assignment=${assignment._id}`}>Open grading queue for this assignment</Link>
      </Button>
    </TabsContent>
  </Tabs>
);
