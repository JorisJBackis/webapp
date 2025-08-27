

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."listing_status_enum" AS ENUM (
    'active',
    'inactive',
    'completed'
);


ALTER TYPE "public"."listing_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."listing_type_enum" AS ENUM (
    'loan',
    'transfer'
);


ALTER TYPE "public"."listing_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."loan_visibility_enum" AS ENUM (
    'clubs',
    'agents',
    'both'
);


ALTER TYPE "public"."loan_visibility_enum" OWNER TO "postgres";


CREATE TYPE "public"."review_category" AS ENUM (
    'Salary Punctuality',
    'Training Conditions',
    'Club Management',
    'Fair Salary'
);


ALTER TYPE "public"."review_category" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_players_for_club"("p_club_id" integer) RETURNS TABLE("id" integer, "name" "text", "club_id" integer, "player_pos" "text", "stats" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "wyscout_player_id" bigint, "listing_status" "text", "player_league_name" "text")
    LANGUAGE "sql"
    AS $$
  SELECT DISTINCT ON (p.wyscout_player_id)
      p.id,
      p.name,
      p.club_id,
      p.position as player_pos, -- Alias from table column
      p.stats,
      p.created_at,
      p.updated_at,
      p.wyscout_player_id,
      COALESCE(pl.listing_type::text, 'Not Listed') as listing_status,
      c.league as player_league_name -- <<< SELECT the league name from clubs table
  FROM
      public.players p
  LEFT JOIN public.player_listings pl
      ON p.wyscout_player_id = pl.wyscout_player_id
      AND pl.listed_by_club_id = p.club_id
      AND pl.status = 'active'
  LEFT JOIN public.clubs c ON p.club_id = c.id -- Join to clubs table to get league
  WHERE
      p.club_id = p_club_id
  ORDER BY
      p.wyscout_player_id, p.updated_at DESC;
$$;


ALTER FUNCTION "public"."get_latest_players_for_club"("p_club_id" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."league_position_metric_averages" (
    "league_name" "text" NOT NULL,
    "position" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "average_value" numeric,
    "last_calculated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."league_position_metric_averages" OWNER TO "postgres";


COMMENT ON TABLE "public"."league_position_metric_averages" IS 'Stores pre-calculated league-wide average values for key player metrics, broken down by position and league.';



CREATE OR REPLACE FUNCTION "public"."get_metric_averages_for_position_league"("p_position_name" "text", "p_league_name" "text") RETURNS SETOF "public"."league_position_metric_averages"
    LANGUAGE "sql"
    AS $$
    SELECT *
    FROM public.league_position_metric_averages
    WHERE "position" = p_position_name AND league_name = p_league_name;
$$;


ALTER FUNCTION "public"."get_metric_averages_for_position_league"("p_position_name" "text", "p_league_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_player_listings"("requesting_club_id" integer) RETURNS TABLE("listing_id" bigint, "listed_by_club_id" integer, "wyscout_player_id_out" bigint, "listing_type" "text", "status" "text", "asking_price" numeric, "loan_fee" numeric, "loan_duration" "text", "listing_created_at" timestamp with time zone, "player_name" "text", "player_pos" "text")
    LANGUAGE "sql"
    AS $$
SELECT
    pl.listing_id,
    pl.listed_by_club_id,
    pl.wyscout_player_id as wyscout_player_id_out, -- Alias if needed for consistency
    pl.listing_type::text, -- Cast enum to text
    pl.status::text,       -- Cast enum to text
    pl.asking_price,
    pl.loan_fee,
    pl.loan_duration,
    pl.created_at as listing_created_at,
    -- Get latest player info based on wyscout_id
    latest_p.name as player_name,
    latest_p.position as player_pos -- Alias the table column here
FROM
    public.player_listings pl
LEFT JOIN LATERAL (
    SELECT p.name, p.position
    FROM public.players p
    WHERE p.wyscout_player_id = pl.wyscout_player_id
    ORDER BY p.updated_at DESC
    LIMIT 1
) latest_p ON true
WHERE
    pl.listed_by_club_id = requesting_club_id; -- Only own club's listings
$$;


ALTER FUNCTION "public"."get_my_player_listings"("requesting_club_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_recruitment_needs"("p_requesting_club_id" integer) RETURNS TABLE("need_id" bigint, "created_by_club_id" integer, "position_needed" "text", "min_age" integer, "max_age" integer, "min_height" integer, "max_height" integer, "preferred_foot" "text", "status" "text", "budget_transfer_max" numeric, "budget_loan_fee_max" numeric, "salary_range" "text", "notes" "text", "need_created_at" timestamp with time zone)
    LANGUAGE "sql"
    AS $$
SELECT
    rn.need_id,
    rn.created_by_club_id,
    rn.position_needed,
    rn.min_age,
    rn.max_age,
    rn.min_height,
    rn.max_height,
    rn.preferred_foot,
    rn.status, -- Select status
    rn.budget_transfer_max,
    rn.budget_loan_fee_max,
    rn.salary_range,
    rn.notes,
    rn.created_at as need_created_at
FROM
    public.recruitment_needs rn
WHERE
    rn.created_by_club_id = p_requesting_club_id; -- Only own club's needs
$$;


ALTER FUNCTION "public"."get_my_recruitment_needs"("p_requesting_club_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_listings"("requesting_club_id" integer, "listing_status" "text" DEFAULT 'active'::"text") RETURNS TABLE("listing_id" bigint, "listed_by_club_id" integer, "wyscout_player_id_out" bigint, "listing_type" "text", "status" "text", "asking_price" numeric, "loan_fee" numeric, "loan_duration" "text", "listing_created_at" timestamp with time zone, "player_name" "text", "player_position" "text", "listed_by_club_name" "text")
    LANGUAGE "sql"
    AS $$
SELECT
    pl.listing_id,
    pl.listed_by_club_id,
    pl.wyscout_player_id,
    pl.listing_type,
    pl.status::text, -- Cast ENUM output back to TEXT for function return
    pl.asking_price,
    pl.loan_fee,
    pl.loan_duration,
    pl.created_at as listing_created_at,
    latest_p.name as player_name,
    latest_p.position as player_position,
    c.name as listed_by_club_name
FROM
    public.player_listings pl
LEFT JOIN public.clubs c ON pl.listed_by_club_id = c.id
LEFT JOIN LATERAL (
    SELECT p.name, p.position
    FROM public.players p
    WHERE p.wyscout_player_id = pl.wyscout_player_id
    ORDER BY p.updated_at DESC -- Or created_at DESC
    LIMIT 1
) latest_p ON true
WHERE
    pl.status = listing_status::listing_status_enum
    AND pl.listed_by_club_id != requesting_club_id;
$$;


ALTER FUNCTION "public"."get_player_listings"("requesting_club_id" integer, "listing_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recruitment_needs"("p_requesting_club_id" integer) RETURNS TABLE("need_id" bigint, "created_by_club_id" integer, "position_needed" "text", "min_age" integer, "max_age" integer, "min_height" integer, "max_height" integer, "preferred_foot" "text", "budget_transfer_max" numeric, "budget_loan_fee_max" numeric, "salary_range" "text", "notes" "text", "need_created_at" timestamp with time zone, "posting_club_name" "text")
    LANGUAGE "sql"
    AS $$
SELECT
    rn.need_id,
    rn.created_by_club_id,
    rn.position_needed,
    rn.min_age,
    rn.max_age,
    rn.min_height,
    rn.max_height,
    rn.preferred_foot,
    rn.budget_transfer_max,
    rn.budget_loan_fee_max,
    rn.salary_range,
    rn.notes,
    rn.created_at as need_created_at,
    c.name as posting_club_name
FROM
    public.recruitment_needs rn
LEFT JOIN public.clubs c ON rn.created_by_club_id = c.id
WHERE
    rn.status = 'active' -- Only show active needs
    AND rn.created_by_club_id != p_requesting_club_id; -- Exclude own club's needs
$$;


ALTER FUNCTION "public"."get_recruitment_needs"("p_requesting_club_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_scouting_players"("p_requesting_club_id" integer, "p_name_filter" "text" DEFAULT NULL::"text", "p_position_filter" "text" DEFAULT NULL::"text", "p_min_height" integer DEFAULT NULL::integer, "p_max_height" integer DEFAULT NULL::integer, "p_foot_filter" "text" DEFAULT NULL::"text", "p_sort_column" "text" DEFAULT 'name'::"text", "p_sort_direction" "text" DEFAULT 'asc'::"text", "p_contract_start" "date" DEFAULT NULL::"date", "p_contract_end" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0, "p_league_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("player_id" integer, "wyscout_player_id" bigint, "name" "text", "club_id" integer, "player_pos" "text", "stats" "jsonb", "updated_at" timestamp with time zone, "age" integer, "height" integer, "foot" "text", "contract_expiry" "date", "avg_percentile" numeric, "club_name" "text", "listing_status" "text", "player_league_name" "text", "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    sql_query text;
    -- This order_clause will refer to the aliases defined in the INNERMOST SELECT
    -- which are then selected by the intermediate subquery "DataWithInternalAliases"
    order_clause_internal text;
BEGIN
    p_sort_column := lower(p_sort_column);
    CASE p_sort_column
        WHEN 'name' THEN order_clause_internal := 'name_col';
        WHEN 'club_name' THEN order_clause_internal := 'club_name_col';
        WHEN 'player_pos' THEN order_clause_internal := 'player_pos_col'; -- Sorting by the alias from the inner select
        WHEN 'age' THEN order_clause_internal := 'age_col';
        WHEN 'height' THEN order_clause_internal := 'height_col';
        WHEN 'foot' THEN order_clause_internal := 'foot_col';
        WHEN 'contract_expiry' THEN order_clause_internal := 'contract_expiry_col';
        WHEN 'avg_percentile' THEN order_clause_internal := 'avg_percentile_col';
        WHEN 'minutes' THEN order_clause_internal := 'minutes_played_col';
        WHEN 'listing_status' THEN order_clause_internal := 'listing_status_col';
        ELSE order_clause_internal := 'name_col'; -- Default sort
    END CASE;

    IF lower(p_sort_direction) = 'desc' THEN
        order_clause_internal := order_clause_internal || ' DESC NULLS LAST';
    ELSE
        order_clause_internal := order_clause_internal || ' ASC NULLS LAST';
    END IF;

    sql_query := format(
        $q$
        -- Outermost SELECT to match RETURNS TABLE exactly
        SELECT
            sub.player_id_col as player_id,
            sub.wyscout_player_id_col as wyscout_player_id,
            sub.name_col as name,
            sub.club_id_col as club_id,
            sub.player_pos_col as player_pos,
            sub.stats_col as stats,
            sub.updated_at_col as updated_at,
            sub.age_col as age,
            sub.height_col as height,
            sub.foot_col as foot,
            sub.contract_expiry_col as contract_expiry,
            sub.avg_percentile_col as avg_percentile,
            sub.club_name_col as club_name,
            sub.listing_status_col as listing_status,
            sub.player_league_name_col as player_league_name,
            sub.total_count_col as total_count
        FROM (
            -- Inner query that defines consistent aliases for sorting and selection
            WITH LatestPlayers AS (
                SELECT DISTINCT ON (p.wyscout_player_id)
                       p.id as player_table_id, -- This is the players.id from the specific row
                       p.*
                FROM public.players p
                ORDER BY p.wyscout_player_id, p.updated_at DESC
            )
            SELECT
                lp.player_table_id as player_id_col,
                lp.wyscout_player_id as wyscout_player_id_col,
                lp.name as name_col,
                lp.club_id as club_id_col,
                lp.position as player_pos_col, -- Original column aliased for consistent use
                lp.stats as stats_col,
                lp.updated_at as updated_at_col,
                (lp.stats->>'Age')::numeric::int as age_col,
                (lp.stats->>'Height')::numeric::int as height_col,
                lp.stats->>'Foot' as foot_col,
                public.try_cast_to_date(lp.stats->>'Contract expires') as contract_expiry_col,
                (lp.stats->>'avg_percentile')::numeric as avg_percentile_col,
                c.name as club_name_col,
                COALESCE(pl.listing_type::text, 'Not Listed') as listing_status_col,
                c.league as player_league_name_col,
                (lp.stats->>'Minutes played')::numeric as minutes_played_col, -- For sorting by minutes
                COUNT(*) OVER() as total_count_col
            FROM LatestPlayers lp
            LEFT JOIN public.clubs c ON lp.club_id = c.id
            LEFT JOIN public.player_listings pl
                ON lp.wyscout_player_id = pl.wyscout_player_id
                AND pl.listed_by_club_id = lp.club_id
                AND pl.status = 'active'
            WHERE
                lp.club_id IS NOT NULL AND lp.club_id != %1$L
                AND (%2$L IS NULL OR lp.name ILIKE ('%%' || %2$L || '%%'))
                AND (%3$L IS NULL OR lp.position = %3$L) -- Filter on original 'lp.position'
                AND (%4$L IS NULL OR (lp.stats->>'Height')::numeric >= %4$L::numeric)
                AND (%5$L IS NULL OR (lp.stats->>'Height')::numeric <= %5$L::numeric)
                AND (%6$L IS NULL OR lower(lp.stats->>'Foot') = lower(%6$L))
                AND (%7$L IS NULL OR public.try_cast_to_date(lp.stats->>'Contract expires') >= %7$L)
                AND (%8$L IS NULL OR public.try_cast_to_date(lp.stats->>'Contract expires') <= %8$L)
                AND (%12$L IS NULL OR c.league = %12$L)
        ) AS sub -- This is the subquery whose columns are aliased with _col
        ORDER BY %9$s -- This order_clause_internal will use sub.name_col, sub.player_pos_col etc.
        LIMIT %10$L OFFSET %11$L;
        $q$,
        p_requesting_club_id, p_name_filter, p_position_filter, p_min_height, p_max_height,
        p_foot_filter, p_contract_start, p_contract_end, order_clause_internal, p_limit, p_offset,
        p_league_filter
    );

    RAISE NOTICE 'Executing SQL for Scouting (v9 - Option B): %', sql_query;
    RETURN QUERY EXECUTE sql_query;
END;
$_$;


ALTER FUNCTION "public"."get_scouting_players"("p_requesting_club_id" integer, "p_name_filter" "text", "p_position_filter" "text", "p_min_height" integer, "p_max_height" integer, "p_foot_filter" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_contract_start" "date", "p_contract_end" "date", "p_limit" integer, "p_offset" integer, "p_league_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Debug logging
  RAISE LOG 'Creating profile for user: %, with metadata: %', NEW.id, NEW.raw_user_meta_data;
  
  -- Insert profile with club_id from metadata
  INSERT INTO public.profiles (
    id, 
    club_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    (NEW.raw_user_meta_data->>'club_id')::integer,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_cast_to_date"("p_text" "text") RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN p_text::date;
EXCEPTION WHEN others THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."try_cast_to_date"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_league_position_averages"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    -- Define the raw metrics for each position group
    -- NOTE: You MUST ensure these metric_name_raw keys EXACTLY match keys in your player stats JSON
    -- AND that their values are numeric for averaging.
    pos_metrics RECORD;
    league_record RECORD;
    pos_name TEXT;
    metric_key TEXT;
    metric_avg NUMERIC;

    -- Configuration of positions and their key raw metrics
    -- This is a simplified version of sixMetricsWithLegend, focusing on the RAW metric names
    -- Adjust these RAW metric names to be exactly what's in your player.stats JSON
    -- For example, if 'Accurate passes, %_percentile' comes from 'Accurate passes, %' in JSON
    metrics_to_average jsonb := '{
        "Goalkeeper": ["Conceded goals per 90", "Accurate passes, %", "xG against per 90", "Prevented goals per 90", "Save rate, %", "Exits per 90"],
        "Full Back": ["Successful defensive actions per 90", "Defensive duels won, %", "Accurate crosses, %", "Accurate passes, %", "Key passes per 90", "xA per 90"],
        "Centre Back": ["Successful defensive actions per 90", "Defensive duels won, %", "Aerial duels won, %", "Accurate passes to final third per 90", "Accurate passes, %", "Interceptions per 90"],
        "Defensive Midfielder": ["Interceptions per 90", "Sliding tackles per 90", "Aerial duels won, %", "Accurate passes to penalty area per 90", "Accurate passes to final third per 90", "Accurate progressive passes per 90"],
        "Central Midfielder": ["Successful defensive actions per 90", "Defensive duels won, %", "Accurate passes, %", "Accurate passes to final third per 90", "Key passes per 90", "xA per 90"],
        "Attacking Midfielder": ["Defensive duels won, %", "Successful defensive actions per 90", "Accurate smart passes per 90", "Accurate passes to penalty area per 90", "Goals per 90", "Successful dribbles per 90"],
        "Winger": ["Non-penalty goals per 90", "xG per 90", "Shots on target per 90", "Successful dribbles per 90", "Assists per 90", "xA per 90"],
        "Centre Forward": ["Non-penalty goals per 90", "xG per 90", "Shots on target per 90", "Touches in box per 90", "xA per 90", "Offensive duels won, %"]
    }';

BEGIN
    RAISE NOTICE 'Starting update of league position metric averages...';

    -- Loop through each distinct league found in the clubs table
    FOR league_record IN SELECT DISTINCT league FROM public.clubs WHERE league IS NOT NULL LOOP
        RAISE NOTICE 'Processing league: %', league_record.league;

        -- Loop through each position defined in our metrics_to_average JSON
        FOR pos_name IN SELECT key FROM jsonb_each_text(metrics_to_average) LOOP
            RAISE NOTICE '  Processing position: % in league: %', pos_name, league_record.league;

            -- Loop through each raw metric key for the current position
            FOR metric_key IN SELECT value FROM jsonb_array_elements_text(metrics_to_average->pos_name) LOOP
                RAISE NOTICE '    Calculating average for metric: %', metric_key;

                -- Calculate the average for this specific metric, position, and league
                -- This query gets the latest stats for each player in the given league and position
                -- then calculates the average of the specified metric from their stats JSON.
                SELECT AVG( (lp_stats.stats ->> metric_key)::numeric )
                INTO metric_avg
                FROM (
                    SELECT DISTINCT ON (p.wyscout_player_id) p.stats
                    FROM public.players p
                    JOIN public.clubs cl ON p.club_id = cl.id
                    WHERE cl.league = league_record.league AND p.position = pos_name -- Filter by league AND position
                    ORDER BY p.wyscout_player_id, p.updated_at DESC
                ) AS lp_stats
                WHERE (lp_stats.stats ->> metric_key) IS NOT NULL; -- Only average non-null numeric values


                -- Upsert the calculated average into the aggregate table
                INSERT INTO public.league_position_metric_averages (league_name, "position", metric_name, average_value, last_calculated)
                VALUES (league_record.league, pos_name, metric_key, metric_avg, now())
                ON CONFLICT (league_name, "position", metric_name)
                DO UPDATE SET
                    average_value = EXCLUDED.average_value,
                    last_calculated = EXCLUDED.last_calculated;

            END LOOP; -- End metric_key loop
        END LOOP; -- End pos_name loop
    END LOOP; -- End league_record loop

    RAISE NOTICE 'Finished updating league position metric averages.';
END;
$$;


ALTER FUNCTION "public"."update_league_position_averages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agency_rb_prospects" (
    "player_name" "text",
    "transfermarkt_url" "text",
    "instagram_url" "text",
    "reached_out_on" "date",
    "their_response" "text",
    "goals" integer,
    "assists" integer,
    "matches_played" integer,
    "original_league_name" "text",
    "original_team_name" "text",
    "position_excel" "text",
    "age" integer,
    "market_value" integer,
    "contract_expires" "date",
    "passport_country" "text",
    "foot" "text",
    "height" integer,
    "weight" integer,
    "on_loan" "text",
    "successful_defensive_actions_p90" numeric,
    "defensive_duels_won_pct" numeric,
    "accurate_crosses_pct" numeric,
    "accurate_passes_pct" numeric,
    "key_passes_p90" numeric,
    "xa_p90" numeric,
    "footy_labs_score" numeric
);


ALTER TABLE "public"."agency_rb_prospects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_reviews" (
    "id" bigint NOT NULL,
    "club_id" integer NOT NULL,
    "overall_rating" integer NOT NULL,
    "comment" "text",
    "category_ratings" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "club_reviews_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 5)))
);


ALTER TABLE "public"."club_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."club_reviews" IS 'Stores player/agent reviews of clubs.';



ALTER TABLE "public"."club_reviews" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."club_reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "league_id" integer,
    "league" "text"
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clubs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."clubs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clubs_id_seq" OWNED BY "public"."clubs"."id";



CREATE TABLE IF NOT EXISTS "public"."final_position_averages" (
    "position" bigint,
    "stats" "json"
);


ALTER TABLE "public"."final_position_averages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "country" "text",
    "division_name" "text",
    "tier" integer,
    "total_games_per_season" integer,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "number_of_teams" integer
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."leagues_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."leagues_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."leagues_id_seq" OWNED BY "public"."leagues"."id";



CREATE TABLE IF NOT EXISTS "public"."player_listings" (
    "listing_id" bigint NOT NULL,
    "listed_by_club_id" integer NOT NULL,
    "wyscout_player_id" bigint NOT NULL,
    "listing_type" "public"."listing_type_enum" NOT NULL,
    "status" "public"."listing_status_enum" DEFAULT 'active'::"public"."listing_status_enum" NOT NULL,
    "asking_price" numeric,
    "loan_fee" numeric,
    "loan_duration" "text",
    "listing_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_listings" OWNER TO "postgres";


COMMENT ON TABLE "public"."player_listings" IS 'Stores player transfer or loan listings created by clubs.';



ALTER TABLE "public"."player_listings" ALTER COLUMN "listing_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."player_listings_listing_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "club_id" integer,
    "position" "text" NOT NULL,
    "stats" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "wyscout_player_id" bigint
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."players_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."players_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."players_id_seq" OWNED BY "public"."players"."id";



CREATE TABLE IF NOT EXISTS "public"."previous_years_positions" (
    "team_id" integer,
    "Year" bigint,
    "Position" bigint,
    "Team" "text",
    "Goals Scored (Įv +)" bigint,
    "Goals Conceded (Įv -)" bigint,
    "Points" bigint,
    "name" "text",
    "uid" "text" NOT NULL
);


ALTER TABLE "public"."previous_years_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "club_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recruitment_needs" (
    "need_id" bigint NOT NULL,
    "created_by_club_id" integer NOT NULL,
    "position_needed" "text" NOT NULL,
    "min_age" integer,
    "max_age" integer,
    "min_height" integer,
    "max_height" integer,
    "preferred_foot" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "budget_transfer_max" numeric,
    "budget_loan_fee_max" numeric,
    "salary_range" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recruitment_needs" OWNER TO "postgres";


COMMENT ON TABLE "public"."recruitment_needs" IS 'Stores recruitment needs posted by clubs.';



ALTER TABLE "public"."recruitment_needs" ALTER COLUMN "need_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."recruitment_needs_need_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."recruitment_suggestions" (
    "id" integer NOT NULL,
    "user_email" "text" NOT NULL,
    "club_id" integer,
    "player_id" integer,
    "player_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_type" "text" DEFAULT 'salary_estimation'::"text"
);


ALTER TABLE "public"."recruitment_suggestions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recruitment_suggestions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."recruitment_suggestions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recruitment_suggestions_id_seq" OWNED BY "public"."recruitment_suggestions"."id";



CREATE TABLE IF NOT EXISTS "public"."team_match_stats" (
    "match_id" "text",
    "date" timestamp without time zone,
    "competition" "text",
    "team_id" bigint,
    "stats" "json"
);


ALTER TABLE "public"."team_match_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_metrics_aggregated" (
    "team_id" bigint,
    "Team" "text",
    "League" "text",
    "Goals" double precision,
    "xG" double precision,
    "Total Shots" double precision,
    "Shots on Target" double precision,
    "Shot Accuracy" double precision,
    "Total Passes" double precision,
    "Accurate Passes" double precision,
    "Pass Accuracy" double precision,
    "Possession %" double precision,
    "Total Losses" double precision,
    "Low Losses" double precision,
    "Medium Losses" double precision,
    "High Losses" double precision,
    "Total Recoveries" double precision,
    "Low Recoveries" double precision,
    "Medium Recoveries" double precision,
    "High Recoveries" double precision,
    "Total Duels" double precision,
    "Duels Won" double precision,
    "Duels Success %" double precision,
    "Shots Outside Box" double precision,
    "Shots Outside Box on Target" double precision,
    "Shots Outside Box Accuracy" double precision,
    "Positional Attacks" double precision,
    "Positional Attacks with Shots" double precision,
    "Positional Attacks Success %" double precision,
    "Counterattacks" double precision,
    "Counterattacks with Shots" double precision,
    "Counterattack Success %" double precision,
    "Set Pieces" double precision,
    "Set Pieces with Shots" double precision,
    "Set Piece Success %" double precision,
    "Corners" double precision,
    "Corners with Shots" double precision,
    "Corner Success %" double precision,
    "Free Kicks" double precision,
    "Free Kicks with Shots" double precision,
    "Free Kick Success %" double precision,
    "Penalties" double precision,
    "Penalties Converted" double precision,
    "Penalty Success %" double precision,
    "Total Crosses" double precision,
    "Accurate Crosses" double precision,
    "Cross Accuracy" double precision,
    "Deep Completed Crosses" double precision,
    "Deep Completed Passes" double precision,
    "Total Penalty Area Entries" double precision,
    "Penalty Area Entries (Runs)" double precision,
    "Penalty Area Entries (Crosses)" double precision,
    "Touches in Penalty Area" double precision,
    "Offensive Duels" double precision,
    "Offensive Duels Won" double precision,
    "Offensive Duels Success %" double precision,
    "Offsides" double precision,
    "Conceded Goals" double precision,
    "Shots Against" double precision,
    "Shots Against on Target" double precision,
    "Shots Against Accuracy" double precision,
    "Defensive Duels" double precision,
    "Defensive Duels Won" double precision,
    "Defensive Duels Success %" double precision,
    "Aerial Duels" double precision,
    "Aerial Duels Won" double precision,
    "Aerial Duels Success %" double precision,
    "Sliding Tackles" double precision,
    "Successful Sliding Tackles" double precision,
    "Sliding Tackle Success %" double precision,
    "Interceptions" double precision,
    "Clearances" double precision,
    "Fouls" double precision,
    "Yellow Cards" double precision,
    "Red Cards" double precision,
    "Forward Passes" double precision,
    "Accurate Forward Passes" double precision,
    "Forward Pass Accuracy" double precision,
    "Back Passes" double precision,
    "Accurate Back Passes" double precision,
    "Back Pass Accuracy" double precision,
    "Lateral Passes" double precision,
    "Accurate Lateral Passes" double precision,
    "Lateral Pass Accuracy" double precision,
    "Long Passes" double precision,
    "Accurate Long Passes" double precision,
    "Long Pass Accuracy" double precision,
    "Passes to Final Third" double precision,
    "Accurate Passes to Final Third" double precision,
    "Pass to Final Third Accuracy" double precision,
    "Progressive Passes" double precision,
    "Accurate Progressive Passes" double precision,
    "Progressive Pass Accuracy" double precision,
    "Smart Passes" double precision,
    "Accurate Smart Passes" double precision,
    "Smart Pass Accuracy" double precision,
    "Throw Ins" double precision,
    "Accurate Throw Ins" double precision,
    "Throw In Accuracy" double precision,
    "Goal Kicks" double precision,
    "Match Tempo" double precision,
    "Average Passes per Possession" double precision,
    "Long Pass %" double precision,
    "Average Shot Distance" double precision,
    "Average Pass Length" double precision,
    "PPDA" double precision,
    "Penalty Area Entries (Passes)" double precision,
    "Points Earned" bigint,
    "Goals Scored 0-15" double precision,
    "Goals Scored 16-30" double precision,
    "Goals Scored 31-45" double precision,
    "Goals Scored 46-60" double precision,
    "Goals Scored 61-75" double precision,
    "Goals Scored 76-90" double precision,
    "Goals Conceded 0-15" double precision,
    "Goals Conceded 16-30" double precision,
    "Goals Conceded 31-45" double precision,
    "Goals Conceded 46-60" double precision,
    "Goals Conceded 61-75" double precision,
    "Goals Conceded 76-90" double precision
);


ALTER TABLE "public"."team_metrics_aggregated" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watchlist" (
    "id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "player_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watchlist" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."watchlist_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."watchlist_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."watchlist_id_seq" OWNED BY "public"."watchlist"."id";



ALTER TABLE ONLY "public"."clubs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clubs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."leagues" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."leagues_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."players" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."players_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."recruitment_suggestions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recruitment_suggestions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."watchlist" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."watchlist_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."club_reviews"
    ADD CONSTRAINT "club_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_position_metric_averages"
    ADD CONSTRAINT "league_position_metric_averages_pkey" PRIMARY KEY ("league_name", "position", "metric_name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_listings"
    ADD CONSTRAINT "player_listings_pkey" PRIMARY KEY ("listing_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."previous_years_positions"
    ADD CONSTRAINT "previous_years_positions_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruitment_needs"
    ADD CONSTRAINT "recruitment_needs_pkey" PRIMARY KEY ("need_id");



ALTER TABLE ONLY "public"."recruitment_suggestions"
    ADD CONSTRAINT "recruitment_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_club_id_player_id_key" UNIQUE ("club_id", "player_id");



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_listings_club_id" ON "public"."player_listings" USING "btree" ("listed_by_club_id");



CREATE INDEX "idx_listings_status" ON "public"."player_listings" USING "btree" ("status");



CREATE INDEX "idx_listings_wyscout_id" ON "public"."player_listings" USING "btree" ("wyscout_player_id");



CREATE INDEX "idx_lpma_league_position" ON "public"."league_position_metric_averages" USING "btree" ("league_name", "position");



CREATE INDEX "idx_player_listings_club_id" ON "public"."player_listings" USING "btree" ("listed_by_club_id");



CREATE INDEX "idx_player_listings_status" ON "public"."player_listings" USING "btree" ("status");



CREATE INDEX "idx_player_listings_type" ON "public"."player_listings" USING "btree" ("listing_type");



CREATE INDEX "idx_player_listings_wyscout_id" ON "public"."player_listings" USING "btree" ("wyscout_player_id");



CREATE INDEX "idx_players_club_id" ON "public"."players" USING "btree" ("club_id");



CREATE INDEX "idx_players_club_wyscout" ON "public"."players" USING "btree" ("club_id", "wyscout_player_id");



CREATE INDEX "idx_players_stats_gin" ON "public"."players" USING "gin" ("stats" "jsonb_path_ops");



CREATE INDEX "idx_players_updated_at" ON "public"."players" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_players_updated_at_desc" ON "public"."players" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_players_wyscout_id" ON "public"."players" USING "btree" ("wyscout_player_id");



CREATE INDEX "idx_players_wyscout_id_updated_at" ON "public"."players" USING "btree" ("wyscout_player_id", "updated_at" DESC);



CREATE INDEX "idx_recruitment_needs_club_id" ON "public"."recruitment_needs" USING "btree" ("created_by_club_id");



CREATE INDEX "idx_recruitment_needs_position" ON "public"."recruitment_needs" USING "btree" ("position_needed");



CREATE INDEX "idx_recruitment_needs_status" ON "public"."recruitment_needs" USING "btree" ("status");



CREATE INDEX "idx_recruitment_suggestions_club_id" ON "public"."recruitment_suggestions" USING "btree" ("club_id");



CREATE INDEX "idx_recruitment_suggestions_player_id" ON "public"."recruitment_suggestions" USING "btree" ("player_id");



CREATE INDEX "idx_recruitment_suggestions_user_email" ON "public"."recruitment_suggestions" USING "btree" ("user_email");



CREATE INDEX "idx_watchlist_club_id" ON "public"."watchlist" USING "btree" ("club_id");



CREATE INDEX "idx_watchlist_player_id" ON "public"."watchlist" USING "btree" ("player_id");



CREATE INDEX "players_club_id_idx" ON "public"."players" USING "btree" ("club_id");



CREATE INDEX "profiles_club_id_idx" ON "public"."profiles" USING "btree" ("club_id");



CREATE OR REPLACE TRIGGER "update_players_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."club_reviews"
    ADD CONSTRAINT "club_reviews_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id");



ALTER TABLE ONLY "public"."player_listings"
    ADD CONSTRAINT "player_listings_listed_by_club_id_fkey" FOREIGN KEY ("listed_by_club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."previous_years_positions"
    ADD CONSTRAINT "previous_years_positions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruitment_needs"
    ADD CONSTRAINT "recruitment_needs_created_by_club_id_fkey" FOREIGN KEY ("created_by_club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruitment_suggestions"
    ADD CONSTRAINT "recruitment_suggestions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."recruitment_suggestions"
    ADD CONSTRAINT "recruitment_suggestions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



CREATE POLICY "Allow updates to on_loan and loan_visibility" ON "public"."players" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view clubs" ON "public"."clubs" FOR SELECT USING (true);



CREATE POLICY "Anyone can view players" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "Clubs can only access their own watchlist" ON "public"."watchlist" USING (("club_id" IN ( SELECT "profiles"."club_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Enable read access for all users" ON "public"."previous_years_positions" FOR SELECT USING (true);



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."previous_years_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watchlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."get_latest_players_for_club"("p_club_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_players_for_club"("p_club_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_players_for_club"("p_club_id" integer) TO "service_role";



GRANT ALL ON TABLE "public"."league_position_metric_averages" TO "anon";
GRANT ALL ON TABLE "public"."league_position_metric_averages" TO "authenticated";
GRANT ALL ON TABLE "public"."league_position_metric_averages" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metric_averages_for_position_league"("p_position_name" "text", "p_league_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metric_averages_for_position_league"("p_position_name" "text", "p_league_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metric_averages_for_position_league"("p_position_name" "text", "p_league_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_player_listings"("requesting_club_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_player_listings"("requesting_club_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_player_listings"("requesting_club_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_recruitment_needs"("p_requesting_club_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_recruitment_needs"("p_requesting_club_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_recruitment_needs"("p_requesting_club_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_listings"("requesting_club_id" integer, "listing_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_listings"("requesting_club_id" integer, "listing_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_listings"("requesting_club_id" integer, "listing_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recruitment_needs"("p_requesting_club_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recruitment_needs"("p_requesting_club_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recruitment_needs"("p_requesting_club_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_scouting_players"("p_requesting_club_id" integer, "p_name_filter" "text", "p_position_filter" "text", "p_min_height" integer, "p_max_height" integer, "p_foot_filter" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_contract_start" "date", "p_contract_end" "date", "p_limit" integer, "p_offset" integer, "p_league_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_scouting_players"("p_requesting_club_id" integer, "p_name_filter" "text", "p_position_filter" "text", "p_min_height" integer, "p_max_height" integer, "p_foot_filter" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_contract_start" "date", "p_contract_end" "date", "p_limit" integer, "p_offset" integer, "p_league_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_scouting_players"("p_requesting_club_id" integer, "p_name_filter" "text", "p_position_filter" "text", "p_min_height" integer, "p_max_height" integer, "p_foot_filter" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_contract_start" "date", "p_contract_end" "date", "p_limit" integer, "p_offset" integer, "p_league_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."try_cast_to_date"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."try_cast_to_date"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_cast_to_date"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_league_position_averages"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_league_position_averages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_league_position_averages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agency_rb_prospects" TO "anon";
GRANT ALL ON TABLE "public"."agency_rb_prospects" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_rb_prospects" TO "service_role";



GRANT ALL ON TABLE "public"."club_reviews" TO "anon";
GRANT ALL ON TABLE "public"."club_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."club_reviews" TO "service_role";



GRANT ALL ON SEQUENCE "public"."club_reviews_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."club_reviews_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."club_reviews_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clubs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clubs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clubs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."final_position_averages" TO "anon";
GRANT ALL ON TABLE "public"."final_position_averages" TO "authenticated";
GRANT ALL ON TABLE "public"."final_position_averages" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."player_listings" TO "anon";
GRANT ALL ON TABLE "public"."player_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."player_listings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_listings_listing_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_listings_listing_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_listings_listing_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."previous_years_positions" TO "anon";
GRANT ALL ON TABLE "public"."previous_years_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."previous_years_positions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_needs" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_needs" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_needs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recruitment_needs_need_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recruitment_needs_need_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recruitment_needs_need_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_suggestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recruitment_suggestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recruitment_suggestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recruitment_suggestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_match_stats" TO "anon";
GRANT ALL ON TABLE "public"."team_match_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."team_match_stats" TO "service_role";



GRANT ALL ON TABLE "public"."team_metrics_aggregated" TO "anon";
GRANT ALL ON TABLE "public"."team_metrics_aggregated" TO "authenticated";
GRANT ALL ON TABLE "public"."team_metrics_aggregated" TO "service_role";



GRANT ALL ON TABLE "public"."watchlist" TO "anon";
GRANT ALL ON TABLE "public"."watchlist" TO "authenticated";
GRANT ALL ON TABLE "public"."watchlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
