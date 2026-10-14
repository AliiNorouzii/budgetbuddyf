import { Matches } from 'class-validator';
import { RAND_ID_PATTERN } from './rand-id';

/** Validates a public 6-char id coming from the client. */
export const IsRandId = () => Matches(RAND_ID_PATTERN, { message: 'شناسه نامعتبر است.' });
