export type EmailJobData =
  | {
      eventType: 'USER_REGISTERED';
      payload: {
        email: string;
        username: string;
        verificationToken: string;
      };
      deduplicationKey: string;
    }
  | {
      eventType: 'USER_ACTIVATED';
      payload: {
        email: string;
        username: string;
      };
      deduplicationKey: string;
    };
