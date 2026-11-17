import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { TestCaseTable } from '@/modules/testcase/components/TestCaseTable';
import { RubricBuilder } from '@/modules/rubric/components/RubricBuilder';

interface AssignmentEditTabsProps {
  assignmentId: string;
  isTeacherOrAdmin: boolean;
}

export const AssignmentEditTabs = ({ assignmentId, isTeacherOrAdmin }: AssignmentEditTabsProps) => {
  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
        <TabsTrigger value="rubric">Rubric</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="pt-4">
        <div className="text-muted-foreground text-center py-8">
          Assignment details editing - implement as needed
        </div>
      </TabsContent>

      <TabsContent value="test-cases" className="pt-4">
        <TestCaseTable assignmentId={assignmentId} isTeacherOrAdmin={isTeacherOrAdmin} />
      </TabsContent>

      <TabsContent value="rubric" className="pt-4">
        <RubricBuilder assignmentId={assignmentId} isTeacherOrAdmin={isTeacherOrAdmin} />
      </TabsContent>
    </Tabs>
  );
};