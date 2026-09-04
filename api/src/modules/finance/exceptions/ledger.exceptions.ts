export class LedgerPostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerPostingError';
  }
}

export class LedgerInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerInvariantError';
  }
}
