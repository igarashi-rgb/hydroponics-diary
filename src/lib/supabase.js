import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ujqlfxgeueuwcfwxipsf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcWxmeGdldWV1d2Nmd3hpcHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTY3MDgsImV4cCI6MjA5MDc5MjcwOH0.6KNIJwrYxtZuzdEz-CWLBondeQ_mGWxCgIAVvmKZRtU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)