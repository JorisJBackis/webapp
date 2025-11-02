-- Add realistic reviews for Banga (club_id = 4)
-- Review 1: 5 stars, Review 2: 4 stars = 4.5 average
-- Using IDs 61 and 62 since there are 60 existing records

INSERT INTO club_reviews (id, club_id, overall_rating, category_ratings, comment, created_at)
VALUES
(
  61,
  4,
  5,
  '{
    "Salary Punctuality": 5,
    "Fair Salary": 5,
    "Training Conditions": 5,
    "Club Management": 5
  }'::jsonb,
  'Fantastic club to play for! Management is very professional and always pays on time. Training facilities are excellent and the team atmosphere is great. They really take care of their players and provide all the support needed. Would highly recommend to any player looking for a stable and well-run club in Lithuania.',
  NOW() - INTERVAL '3 months'
),
(
  62,
  4,
  4,
  '{
    "Salary Punctuality": 5,
    "Fair Salary": 4,
    "Training Conditions": 4,
    "Club Management": 4
  }'::jsonb,
  'Very good experience overall. The club is well organized and professional. Salaries are always paid on time which is rare in this region. Training facilities are good, could be better but definitely adequate for this level. Management is approachable and fair. A solid club that keeps their promises.',
  NOW() - INTERVAL '1 month'
);

-- Verify the average rating
SELECT
  club_id,
  AVG(overall_rating) as avg_rating,
  COUNT(*) as review_count
FROM club_reviews
WHERE club_id = 4
GROUP BY club_id;
