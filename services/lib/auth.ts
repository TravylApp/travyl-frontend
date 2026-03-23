import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'

export async function validateAuth(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)
  const supabase = createClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseServiceRoleKey.value,
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Invalid token')
  }

  return data.user.id
}
