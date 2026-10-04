// apps/api/src/utils/passwords.ts
import bcrypt from 'bcryptjs';

/** bcrypt work factor; ~250 ms per hash on 2024 hardware, re-tune as CPUs get faster. */
const SALT_ROUNDS = 12;

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, SALT_ROUNDS);

export const comparePassword = (password: string, hashedPassword: string): Promise<boolean> =>
  bcrypt.compare(password, hashedPassword);
