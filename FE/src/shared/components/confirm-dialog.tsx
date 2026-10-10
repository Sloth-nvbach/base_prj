import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Red confirm button, for deletes. */
  destructive?: boolean;
  /** Disables the buttons and shows a spinner while the action runs. */
  pending?: boolean;
  onConfirm: () => void;
}

/** "Are you sure?" dialog. Close it from `onConfirm` once the action succeeds. */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant={destructive ? 'destructive' : 'default'} disabled={pending} onClick={onConfirm}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
