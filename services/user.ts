import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'

const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

interface UserStats {
  totalTrips: number
  totalActivities: number
  visitedCountries: number
  upcomingTrips: number
  favoriteCategory: string | null
  memberSince: string
}

export const statsHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    // Get user profile
    const { data: user } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single()

    // Count trips
    const { count: totalTrips } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Count activities
    const { count: totalActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Count unique countries
    const { data: countries } = await supabase
      .from('trips')
      .select('country')
      .eq('user_id', userId)

    const uniqueCountries = new Set(countries?.map(t => t.country).filter(Boolean))

    // Count upcoming trips
    const today = new Date().toISOString()
    const { count: upcomingTrips } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('start_date', today)

    // Get favorite category from activities
    const { data: categories } = await supabase
      .from('activities')
      .select('type')
      .eq('user_id', userId)

    const typeCounts: Record<string, number> = {}
    categories?.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1
    })
    const favoriteCategory = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const response: UserStats = {
      totalTrips: totalTrips || 0,
      totalActivities: totalActivities || 0,
      visitedCountries: uniqueCountries.size,
      upcomingTrips: upcomingTrips || 0,
      favoriteCategory,
      memberSince: user?.created_at,
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[user/stats] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}