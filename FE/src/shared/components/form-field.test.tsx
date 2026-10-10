import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './form-field';
import { Input } from './ui/input';

describe('FormField', () => {
  it('connects the label to the input', () => {
    render(
      <FormField id="title" label="Title">
        <Input id="title" />
      </FormField>,
    );
    expect(screen.getByLabelText('Title')).toBeInstanceOf(HTMLInputElement);
  });

  it('shows the error message only when there is one', () => {
    const { rerender } = render(
      <FormField id="title" label="Title">
        <Input id="title" />
      </FormField>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <FormField id="title" label="Title" error="Title is required" hint="0/100">
        <Input id="title" />
      </FormField>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });
});
