
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseKey)
