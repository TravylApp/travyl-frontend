import { z } from 'zod';
import type { DbPackingItem, PackingAuditEntry, PackingSuggestion } from '../types';

export const dbPackingItemSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  user_id: z.string(),
  name: z.string(),
  category: z.string(),
  is_packed: z.boolean(),
  packed_by: z.string().nullable(),
  packed_at: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  owner_id: z.string().nullable(),
  group_tag: z.string().nullable(),
  quantity: z.number(),
  packed_count: z.number(),
  user_display_name: z.string().optional(),
  user_avatar_url: z.string().optional(),
  owner_display_name: z.string().optional(),
});

const _dpi: DbPackingItem = {} as z.infer<typeof dbPackingItemSchema>;
void _dpi;

export const packingAuditEntrySchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  user_id: z.string(),
  item_id: z.string().nullable(),
  action: z.enum(['added', 'packed', 'unpacked', 'removed', 'claimed', 'released', 'transferred']),
  item_name: z.string(),
  created_at: z.string(),
  target_user_id: z.string().nullable(),
  user_display_name: z.string().optional(),
  user_avatar_url: z.string().optional(),
  target_display_name: z.string().optional(),
});

const _pae: PackingAuditEntry = {} as z.infer<typeof packingAuditEntrySchema>;
void _pae;

export const packingSuggestionSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  user_id: z.string(),
  name: z.string(),
  category: z.string(),
  reason: z.string(),
  status: z.enum(['pending', 'accepted', 'dismissed']),
  created_at: z.string(),
});

const _ps: PackingSuggestion = {} as z.infer<typeof packingSuggestionSchema>;
void _ps;

// Inbound — POST packing item
export const createPackingItemBodySchema = z.object({
  trip_id: z.string(),
  name: z.string().min(1).max(200),
  category: z.string(),
  quantity: z.number().int().min(1).default(1),
  sort_order: z.number().int().optional(),
  group_tag: z.string().nullable().optional(),
});
export type CreatePackingItemBody = z.infer<typeof createPackingItemBodySchema>;
