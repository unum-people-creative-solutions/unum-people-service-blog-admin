import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ServiceAgreementWaiting from './ServiceAgreementWaiting';

describe('ServiceAgreementWaiting', () => {
  it('não exibe nenhum controle de ação — só texto informativo de espera', () => {
    render(<ServiceAgreementWaiting />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/aguardando/i)).toBeInTheDocument();
  });
});
