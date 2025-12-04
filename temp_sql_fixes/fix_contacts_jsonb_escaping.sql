-- =====================================================
-- Fix contacts JSONB escaping issue
-- =====================================================
-- Problem: Contacts were stored as escaped JSON strings
-- instead of proper JSONB objects
-- =====================================================

-- Fix contacts that are stored as stringified JSON
UPDATE agent_favorite_clubs
SET contacts =
  CASE
    -- If contacts is a string representation of JSON, parse it
    WHEN jsonb_typeof(contacts) = 'string' THEN
      (contacts->>0)::jsonb
    -- If it's already an array, keep it as is
    ELSE
      contacts
  END
WHERE jsonb_typeof(contacts) = 'string'
   OR (jsonb_typeof(contacts) = 'array' AND jsonb_array_length(contacts) > 0);

-- Alternative approach: Handle all cases safely
UPDATE agent_favorite_clubs
SET contacts =
  CASE
    -- If the first element is a string (escaped JSON), parse it
    WHEN jsonb_typeof(contacts->0) = 'string' THEN
      (contacts->>0)::jsonb
    -- Otherwise keep as is
    ELSE
      contacts
  END
WHERE jsonb_array_length(contacts) > 0
  AND jsonb_typeof(contacts->0) = 'string';

-- =====================================================
-- Verify the fix
-- =====================================================
SELECT
  id,
  club_id,
  jsonb_typeof(contacts) as contacts_type,
  jsonb_array_length(contacts) as array_length,
  contacts
FROM agent_favorite_clubs
WHERE jsonb_array_length(contacts) > 0
LIMIT 5;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Fixed contacts JSONB escaping!' as status;
