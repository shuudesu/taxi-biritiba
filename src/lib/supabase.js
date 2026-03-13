import { createClient } from '@supabase/supabase-js'

// Você vai pegar esses dois dados no painel do Supabase!
const supabaseUrl = 'https://unoobjwabadtcgqcpvhj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVub29iandhYmFkdGNncWNwdmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzc5NTEsImV4cCI6MjA4ODkxMzk1MX0.P8ry1JOJiUWCrQkz9EFpYdtpPqc4l-zvf4Byio0k-8g'

export const supabase = createClient(supabaseUrl, supabaseKey)