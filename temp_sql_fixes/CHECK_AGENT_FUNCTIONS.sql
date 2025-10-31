-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO CHECK IF FUNCTIONS EXIST
-- =====================================================

-- 1. Check if agent_rosters table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'agent_rosters'
) AS agent_rosters_exists;

-- 2. Check if get_agent_roster function exists
SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_agent_roster'
) AS get_agent_roster_exists;

-- 3. Check if match_roster_with_needs function exists
SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'match_roster_with_needs'
) AS match_roster_with_needs_exists;

-- 4. Check if add_player_to_roster function exists
SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'add_player_to_roster'
) AS add_player_to_roster_exists;

-- 5. Check if remove_player_from_roster function exists
SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'remove_player_from_roster'
) AS remove_player_from_roster_exists;

-- 6. Check if update_roster_notes function exists
SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'update_roster_notes'
) AS update_roster_notes_exists;

-- 7. List all agent-related functions with their parameter types
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname LIKE '%agent%' OR p.proname LIKE '%roster%')
ORDER BY p.proname;

-- 8. Check RLS policies on agent_rosters
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'agent_rosters';

-- 9. Count rows in agent_rosters (should be 0 for new install)
SELECT COUNT(*) as roster_count FROM agent_rosters;

-- =====================================================
-- EXPECTED RESULTS:
-- All "exists" checks should return "true"
-- You should see 5-6 agent functions listed
-- You should see 4-5 RLS policies
-- roster_count should be 0 (or > 0 if you've added players)
-- =====================================================
