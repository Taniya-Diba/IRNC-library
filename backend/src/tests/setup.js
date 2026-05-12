import 'dotenv/config';
import { vi } from 'vitest';

// Persistent chain object — every .from() call returns the same object so that
// test helpers like  supabaseAdmin.from().select().eq().single.mockResolvedValueOnce()
// affect the exact same vi.fn() that the route/middleware calls.
const dbChain = {
  select:      vi.fn().mockReturnThis(),
  insert:      vi.fn().mockReturnThis(),
  update:      vi.fn().mockReturnThis(),
  delete:      vi.fn().mockReturnThis(),
  upsert:      vi.fn().mockReturnThis(),
  eq:          vi.fn().mockReturnThis(),
  neq:         vi.fn().mockReturnThis(),
  in:          vi.fn().mockReturnThis(),
  lt:          vi.fn().mockReturnThis(),
  like:        vi.fn().mockReturnThis(),
  ilike:       vi.fn().mockReturnThis(),
  or:          vi.fn().mockReturnThis(),
  single:      vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  order:       vi.fn().mockReturnThis(),
  range:       vi.fn().mockReturnThis(),
  limit:       vi.fn().mockReturnThis(),
  not:         vi.fn().mockReturnThis(),
  head:        vi.fn().mockReturnThis(),
};

const storageChain = {
  upload:          vi.fn(),
  remove:          vi.fn(),
  getPublicUrl:    vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
  createSignedUrl: vi.fn(),
};

vi.mock('../db/supabase.js', () => ({
  supabaseAdmin: {
    from:    vi.fn(() => dbChain),
    auth: {
      admin: {
        createUser:   vi.fn(),
        deleteUser:   vi.fn(),
        signOut:      vi.fn(),
        generateLink: vi.fn(),
      }
    },
    storage: {
      from: vi.fn(() => storageChain)
    }
  },
  supabaseClient: {
    auth: {
      signInWithPassword: vi.fn(),
      getUser:            vi.fn(),
      refreshSession:     vi.fn(),
    }
  }
}));

// Silence console.warn during tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
