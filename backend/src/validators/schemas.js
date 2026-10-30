import { z } from 'zod';
import { SECTION_IDS, KINDS, TRACKS, LEVELS, DIFFICULTIES, THEMES } from '../domain/constants.js';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD').refine(s => !Number.isNaN(Date.parse(s)), 'invalid date');
const uuid = z.string().uuid();
const blankOr = values => z.enum(['', ...values]);
const nonEmpty = obj => obj.refine(v => Object.keys(v).length > 0, 'send at least one field');

export const idParams = z.object({ id: uuid });

export const login = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
}).strict();

const newPassword = z.string().min(8, 'at least 8 characters').max(200);

export const signup = z.object({
  username: z.string().trim().min(3, 'at least 3 characters').max(50).regex(/^[\w.@-]+$/, 'letters, numbers, . _ - @ only'),
  password: newPassword,
}).strict();

export const resumeRename = z.object({ label: z.string().trim().max(100) }).strict();

export const changePassword = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword,
}).strict();

export const settingsPatch = nonEmpty(z.object({
  planStart: ymd,
  planMonths: z.number().int().min(1).max(12),
  theme: z.enum(THEMES),
  linkDuplicates: z.boolean(),
  hideCompleted: z.boolean(),
}).partial().strict());

const itemFields = {
  title: z.string().trim().min(1).max(500),
  kind: z.enum(KINDS),
  track: blankOr(TRACKS),
  level: blankOr(LEVELS),
  difficulty: blankOr(DIFFICULTIES),
  notes: z.string().max(10_000),
  link: z.string().max(2_000),
};

export const itemCreate = z.object({
  id: uuid.optional(),
  groupId: uuid,
  ...itemFields,
}).partial({ kind: true, track: true, level: true, difficulty: true, notes: true, link: true }).strict();

export const itemUpdate = nonEmpty(z.object({
  ...itemFields,
  groupId: uuid,
  revisitDates: z.array(ymd).max(10),
}).partial().strict());

export const itemDone = z.object({ done: z.boolean() }).strict();

export const positions = z.array(z.object({ id: uuid, order: z.number().int().min(0).max(1e6) }).strict()).min(1).max(5_000);

export const bulkAdd = z.object({
  groupId: uuid,
  text: z.string().max(200_000),
  dryRun: z.boolean().default(false),
}).strict();

const groupFields = {
  title: z.string().trim().max(200),
  focus: z.string().trim().max(500),
  month: z.number().int().min(0).max(12).nullable(),
  step: z.number().int().min(1).max(99).nullable(),
};

export const groupCreate = z.object({
  id: uuid.optional(),
  sectionId: z.enum(SECTION_IDS),
  parentId: uuid.nullable().optional(),
  ...groupFields,
}).partial({ title: true, focus: true, month: true, step: true }).strict()
  .refine(g => g.title || g.month != null, { message: 'title is required', path: ['title'] });

export const groupUpdate = nonEmpty(z.object(groupFields).partial().strict());

// Import and restore payloads are cleaned record by record in domain/normalise.js;
// here we only bound their size and basic shape.
const looseRecords = max => z.array(z.record(z.unknown())).max(max);

export const importDocument = z.object({
  schemaVersion: z.number().int().optional(),
  settings: z.record(z.unknown()).optional(),
  groups: looseRecords(5_000),
  items: looseRecords(20_000),
}).passthrough();

export const restore = z.object({
  groups: looseRecords(5_000).default([]),
  items: looseRecords(20_000).default([]),
}).strict();
