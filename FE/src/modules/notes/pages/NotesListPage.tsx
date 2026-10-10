// Reference module: copy this folder when creating a new feature (or run `npm run gen:module <name>`).
import { Plus, Search, StickyNote, X } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { LoadingState } from '@/shared/components/loading-state';
import { PageHeader } from '@/shared/components/page-header';
import { Pagination } from '@/shared/components/pagination';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { usePagination } from '@/shared/hooks/use-pagination';
import { NoteCard } from '../components/NoteCard';
import { NoteFormDialog } from '../components/NoteFormDialog';
import { useDeleteNote, useNotes } from '../hooks/use-notes';
import type { Note } from '../types/note.types';

const PAGE_SIZE = 12;

export const NotesListPage = () => {
  const { data: user } = useCurrentUser();
  const { page, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const q = useDebounce(search.trim());

  const notes = useNotes({ page, limit: PAGE_SIZE, q, tag, all: showAll });
  const deleteNote = useDeleteNote();

  // `undefined` = closed, `null` = creating, a note = editing it.
  const [editing, setEditing] = useState<Note | null>();
  const [deleting, setDeleting] = useState<Note>();

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const isFiltered = Boolean(q || tag);

  const renderList = () => {
    if (notes.isPending) return <LoadingState rows={4} />;
    if (notes.isError) return <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />;
    if (notes.data.items.length === 0) {
      return isFiltered ? (
        <EmptyState icon={Search} title="No matching notes" description="Try another search or tag." />
      ) : (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Write your first note to get started."
          action={<Button onClick={() => setEditing(null)}>Create note</Button>}
        />
      );
    }

    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.data.items.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={setEditing}
              onDelete={setDeleting}
              onTagClick={(next) => changeFilter(() => setTag(next))}
            />
          ))}
        </div>
        <Pagination page={notes.data.page} totalPages={notes.data.totalPages} onPageChange={setPage} />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Example feature: list, search, create, edit and delete."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New note
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search notes"
            className="pl-9"
            placeholder="Search title or content…"
            value={search}
            onChange={(event) => changeFilter(() => setSearch(event.target.value))}
          />
        </div>
        {tag && (
          <Badge variant="outline" className="gap-1 py-1">
            #{tag}
            <button type="button" aria-label="Clear tag filter" onClick={() => changeFilter(() => setTag(undefined))}>
              <X className="size-3" />
            </button>
          </Badge>
        )}
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <Switch id="all-notes" checked={showAll} onCheckedChange={(checked) => changeFilter(() => setShowAll(checked))} />
            <Label htmlFor="all-notes">All users</Label>
          </div>
        )}
      </div>

      {renderList()}

      {editing !== undefined && (
        <NoteFormDialog
          key={editing?._id ?? 'new'}
          open
          note={editing ?? undefined}
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete this note?"
        description={deleting ? `"${deleting.title}" will be removed permanently.` : undefined}
        confirmLabel="Delete"
        destructive
        pending={deleteNote.isPending}
        onConfirm={() => deleting && deleteNote.mutate(deleting._id, { onSuccess: () => setDeleting(undefined) })}
      />
    </div>
  );
};
