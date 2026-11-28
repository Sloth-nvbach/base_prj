import { Link } from 'react-router-dom';
import { ChevronRight, Users, ClipboardList, FileText, Clock, ShieldCheck, BadgeCheck, NotebookText } from 'lucide-react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/data-table';
import { useAssignments } from '@/modules/assignment/hooks/use-assignments';
import type { Assignment } from '@/modules/assignment/types/assignment.types';
import { StatCard } from '@/shared/components/stat-card';
import { PageHeader } from '@/shared/components/page-header';
import { AssignmentStatusBadge } from '@/modules/assignment/components/AssignmentStatusBadge';
import { useMySubmissions, useReviewSubmissions } from '@/modules/submission/hooks/use-submissions';
import { useAdminStats } from '@/modules/admin/hooks/use-admin';

const teacherQuickActions = [
  { title: 'Create Assignment', description: 'Create a new programming assignment', icon: FileText, to: '/assignments', action: true },
  { title: 'View Submissions', description: 'Review and grade student submissions', icon: ClipboardList, to: '/submissions' },
];

const studentQuickActions = [
  { title: 'My Assignments', description: 'View assigned exercises, deadlines and your submissions', icon: ClipboardList, to: '/my-assignments' },
];

const adminQuickActions = [
  { title: 'Admin Dashboard', description: 'System overview and statistics', icon: ShieldCheck, to: '/admin' },
  { title: 'Manage Users', description: 'View and manage all users', icon: Users, to: '/admin/users' },
];

export const HomePage = () => {
  const { data: user } = useCurrentUser();
  const role = user?.role || 'student';

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  // Get assignments based on role
  const assignments = useAssignments({ limit: 5, sort: '-createdAt' });
  const isStudent = role === 'student';
  const mySubmissions = useMySubmissions({ limit: 1 }, isStudent);
  const pendingReview = useReviewSubmissions({ limit: 1, status: 'submitted' }, role === 'teacher');
  const adminStats = useAdminStats(role === 'admin');

  const getQuickActions = () => {
    switch (role) {
      case 'teacher':
        return teacherQuickActions;
      case 'admin':
        return adminQuickActions;
      default:
        return studentQuickActions;
    }
  };

  const getStatCards = () => {
    switch (role) {
      case 'teacher':
        return [
          { label: 'My Assignments', icon: ClipboardList, value: assignments.data?.total ?? 0, isLoading: assignments.isPending },
          { label: 'Published', icon: FileText, value: assignments.data?.items.filter(a => a.status === 'published').length ?? 0, isLoading: assignments.isPending },
          { label: 'Drafts', icon: FileText, value: assignments.data?.items.filter(a => a.status === 'draft').length ?? 0, isLoading: assignments.isPending },
          { label: 'Pending Grading', icon: Clock, value: pendingReview.data?.total ?? 0, hint: 'Submissions need review', isLoading: pendingReview.isPending },
        ];
      case 'student':
        return [
          { label: 'Assigned', icon: ClipboardList, value: assignments.data?.items.filter(a => a.status === 'published').length ?? 0, isLoading: assignments.isPending },
          { label: 'Submitted', icon: FileText, value: mySubmissions.data?.total ?? 0, hint: 'Your submissions', isLoading: mySubmissions.isPending },
          { label: 'Upcoming Deadlines', icon: Clock, value: assignments.data?.items.filter(a => a.status === 'published' && a.dueDate && new Date(a.dueDate) > new Date()).length ?? 0, isLoading: assignments.isPending },
        ];
      case 'admin':
      default:
        return [
          { label: 'Users', icon: Users, value: adminStats.data?.users, hint: adminStats.data && `${adminStats.data.newUsersThisWeek} new this week`, isLoading: adminStats.isPending },
          { label: 'Admins', icon: ShieldCheck, value: adminStats.data?.admins, isLoading: adminStats.isPending },
          { label: 'Verified emails', icon: BadgeCheck, value: adminStats.data?.verified, isLoading: adminStats.isPending },
          { label: 'Assignments', icon: NotebookText, value: assignments.data?.total, isLoading: assignments.isPending },
        ];
    }
  };

  const assignmentColumns = [
    {
      id: 'title',
      header: 'Title',
      cell: (a: Assignment) => (
        <div>
          <p className="font-medium">{a.title}</p>
          <p className="text-sm text-muted-foreground truncate max-w-xs">{a.description}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (a: Assignment) => <AssignmentStatusBadge status={a.status} />,
      className: 'w-32',
    },
    {
      id: 'maxScore',
      header: 'Max Score',
      cell: (a: Assignment) => <span className="font-mono tabular-nums">{a.maxScore}</span>,
      className: 'w-24 text-center',
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: (a: Assignment) => a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—',
      className: 'w-36 text-center',
    },
    {
      id: 'actions',
      header: '',
      cell: (a: Assignment) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to={isStudent ? `/my-assignments/${a._id}` : `/assignments/${a._id}`}>{isStudent ? 'Open' : 'Edit'}</Link>
          </Button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  const quickActions = getQuickActions();
  const statCards = getStatCards();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description={
          role === 'teacher' ? 'Manage your assignments and review submissions.' :
          role === 'student' ? 'View your assigned exercises and track progress.' :
          'System overview and administration.'
        }
      />

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} label={stat.label} icon={stat.icon} value={stat.value} hint={stat.hint} isLoading={stat.isLoading} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Quick actions</h2>
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {quickActions.map((action) => (
            <li key={action.title}>
              <Link
                to={action.to}
                className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60 focus-visible:outline-offset-[-2px]"
              >
                <action.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-medium group-hover:text-primary">{action.title}</span>
                  <span className="block text-sm text-muted-foreground">{action.description}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent Assignments Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Recent assignments
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/assignments">View all</Link>
          </Button>
        </div>
        <DataTable
          label="Recent Assignments"
          columns={assignmentColumns}
          rows={assignments.data?.items ?? []}
          getRowId={(a) => a._id}
          isLoading={assignments.isPending}
          emptyState={
            <div className="py-8 text-center text-sm text-muted-foreground">
              No assignments yet. {role === 'teacher' || role === 'admin' ? 'Create your first assignment.' : 'Check back when assignments are published.'}
            </div>
          }
        />
      </section>
    </div>
  );
};