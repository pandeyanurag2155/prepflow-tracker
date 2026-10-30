/**
 * Build "col = $n, …" for an UPDATE from a camelCase patch.
 * Only keys present in `columns` ({ apiField: 'sql_column' }) and not undefined are used.
 */
export function buildSet(patch, columns, startAt = 1) {
  const sets = [];
  const values = [];
  for (const [field, column] of Object.entries(columns)) {
    if (patch[field] === undefined) continue;
    values.push(patch[field]);
    sets.push(`${column} = $${startAt + values.length - 1}`);
  }
  return { sql: sets.join(', '), values };
}
