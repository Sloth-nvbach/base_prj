import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/shared/components/ui/input';

interface SearchInputProps {
  /** Starting text, e.g. the `q` value from the URL. */
  defaultValue?: string;
  /** Called with the trimmed text once the user stops typing (and at once when cleared). */
  onSearch: (value: string) => void;
  placeholder?: string;
  label?: string;
  delay?: number;
}

/** Search box with a debounce and a clear button. */
export const SearchInput = ({
  defaultValue = '',
  onSearch,
  placeholder = 'Search…',
  label = 'Search',
  delay = 300,
}: SearchInputProps) => {
  const [text, setText] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(value.trim()), delay);
  };

  const clear = () => {
    setText('');
    clearTimeout(timer.current);
    onSearch('');
  };

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={label}
        className="pl-9 pr-9"
        placeholder={placeholder}
        value={text}
        onChange={(event) => change(event.target.value)}
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={clear}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
};
