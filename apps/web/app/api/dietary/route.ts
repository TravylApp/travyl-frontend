import { NextRequest, NextResponse } from 'next/server'

// Open Food Facts — dietary and allergen information
// Free, unlimited, no API key
// Docs: https://wiki.openfoodfacts.org/API

const BASE = 'https://world.openfoodfacts.org'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const query = sp.get('q')
  const category = sp.get('category') // e.g., "snacks", "beverages"
  const allergen = sp.get('allergen') // e.g., "gluten", "milk", "nuts"
  const limit = parseInt(sp.get('limit') || '10', 10)

  if (!query && !category) {
    return NextResponse.json({ error: 'Missing q or category parameter' }, { status: 400 })
  }

  try {
    let url: string

    if (query) {
      // Search for products
      url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}`
    } else {
      // Browse by category
      url = `${BASE}/category/${encodeURIComponent(category!)}.json?page_size=${limit}`
    }

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Open Food Facts fetch failed')

    const data = await res.json()
    const products = (data.products || []).map((p: any) => {
      const allergens = (p.allergens_tags || []).map((a: string) => a.replace('en:', ''))
      const traces = (p.traces_tags || []).map((t: string) => t.replace('en:', ''))

      return {
        id: p.code || p._id,
        name: p.product_name || 'Unknown',
        brand: p.brands || null,
        image: p.image_front_small_url || p.image_url || null,
        nutriscore: p.nutriscore_grade || null,
        novaGroup: p.nova_group || null,
        allergens,
        traces,
        isVegan: p.labels_tags?.includes('en:vegan') || false,
        isVegetarian: p.labels_tags?.includes('en:vegetarian') || false,
        isGlutenFree: p.labels_tags?.includes('en:gluten-free') || !allergens.includes('gluten'),
        categories: (p.categories_tags || []).map((c: string) => c.replace('en:', '')).slice(0, 3),
      }
    })

    // Filter by allergen if specified
    const filtered = allergen
      ? products.filter((p: any) => !p.allergens.includes(allergen) && !p.traces.includes(allergen))
      : products

    return NextResponse.json(filtered)
  } catch {
    return NextResponse.json({ error: 'Dietary info service unavailable' }, { status: 500 })
  }
}
