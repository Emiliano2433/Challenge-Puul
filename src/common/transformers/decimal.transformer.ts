import type { ValueTransformer } from 'typeorm';

/** Postgres devuelve NUMERIC como string; lo convertimos a number al leer. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
