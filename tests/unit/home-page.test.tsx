import { render, screen } from '@testing-library/react';

import HomePage from '@/app/page';
import { Providers } from '@/app/providers';
import { useProjectStore } from '@/state/project-store';

describe('HomePage', () => {
  beforeEach(() => {
    useProjectStore.getState().hardReset();
  });

  it('renders scaffold headline with core regions', () => {
    render(
      <Providers>
        <HomePage />
      </Providers>,
    );

    expect(screen.getByRole('heading', { name: /graph builder/i })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: /field list/i })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByLabelText(/inspector/i)).toBeTruthy();
  });
});
