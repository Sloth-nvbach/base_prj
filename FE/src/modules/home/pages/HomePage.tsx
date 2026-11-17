import { Link } from 'react-router-dom';
import { Users, ClipboardList, FileText, Clock, ShieldCheck, BadgeCheck, NotebookText } from 'lucide-react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/data-table';
import { useAssignments } from '@/modules/assignment/hooks/use-assignments';
import type { Assignment } from '@/modules/assignment/types/assignment.types';
import { StatCard } from '@/shared/components/stat-card';

const teacherQuickActions = [
  { title: 'Create Assignment', description: 'Create a new programming assignment', icon: FileText, to: '/assignments', action: true },
  { title: 'View Submissions', description: 'Review and grade student submissions', icon: ClipboardList, to: '/submissions' },
];

const studentQuickActions = [
  { title: 'My Assignments', description: 'View assigned exercises and deadlines', icon: ClipboardList, to: '/assignments' },
  { title: 'My Submissions', description: 'View your submission history', icon: FileText, to: '/submissions' },
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
          { label: 'Pending Grading', icon: Clock, value: assignments.data?.items.filter(a => a.status === 'published').length ?? 0, hint: 'Submissions need review', isLoading: assignments.isPending },
        ];
      case 'student':
        return [
          { label: 'Assigned', icon: ClipboardList, value: assignments.data?.items.filter(a => a.status === 'published').length ?? 0, isLoading: assignments.isPending },
          { label: 'Submitted', icon: FileText, value: 0, hint: 'Track your submissions', isLoading: assignments.isPending },
          { label: 'Upcoming Deadlines', icon: Clock, value: assignments.data?.items.filter(a => a.status === 'published' && a.dueDate && new Date(a.dueDate) > new Date()).length ?? 0, isLoading: assignments.isPending },
        ];
      case 'admin':
      default:
        return [
          { label: 'Users', icon: Users, value: 0, hint: 'Total users', isLoading: true },
          { label: 'Admins', icon: ShieldCheck, value: 0, isLoading: true },
          { label: 'Verified', icon: BadgeCheck, value: 0, hint: '96% verified', isLoading: true },
          { label: 'Assignments', icon: NotebookText, value: 0, isLoading: true },
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
      cell: (a: Assignment) => {
        const statusConfig = {
          draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
          published: { label: 'Published', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
          closed: { label: 'Closed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
        };
        const config = statusConfig[a.status as keyof typeof statusConfig] || statusConfig.draft;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        );
      },
      className: 'w-32',
    },
    {
      id: 'maxScore',
      header: 'Max Score',
      cell: (a: Assignment) => a.maxScore,
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
            <Link to={`/assignments/${a._id}/edit`}>Edit</Link>
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
      {/* Hero section */}
      <section className="rounded-2xl border bg-card p-8">
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold">
          Welcome back, <span className="text-primary">{displayName}</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {role === 'teacher' ? 'Manage your assignments and review submissions.' :
           role === 'student' ? 'View your assigned exercises and track progress.' :
           'System overview and administration.'}
        </p>
      </section>

      {/* Stat Cards */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <StatCard
              key={index}
              label={stat.label}
              icon={stat.icon}
              value={stat.value}
              hint={stat.hint}
              isLoading={stat.isLoading}
            />
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.to} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-card/80">
                <CardHeader className="pb-3">
                  <div className="mb-2 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <action.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{action.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Assignments Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="size-5" />
            Recent Assignments
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
            <div className="py-8 text-center text-muted-foreground">
              No assignments yet. {role === 'teacher' || role === 'admin' ? 'Create your first assignment!' : 'Check back when assignments are published.'}
            </div>
          }
        />
      </section>
    </div>
  );
};