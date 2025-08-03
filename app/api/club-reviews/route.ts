// app/api/club-reviews/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        const { searchParams } = new URL(request.url);
        const league = searchParams.get("league");

        if (!league) {
            return NextResponse.json({ error: "League parameter is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("clubs")
            .select(`
        id,
        name,
        club_reviews (
          id,
          overall_rating,
          comment,
          category_ratings,
          created_at
        )
      `)
            .eq("league", league);

        if (error) throw error;

        const aggregatedData = data.map(club => {
            const reviews = club.club_reviews;
            const reviewCount = reviews.length;

            if (reviewCount === 0) {
                return {
                    clubName: club.name,
                    reviewCount: 0,
                    avgOverall: 0,
                    avgPunctuality: 0,
                    avgConditions: 0,
                    avgManagement: 0,
                    avgFairSalary: 0,
                    reviews: [] // Add empty reviews array
                };
            }

            let totalWeightedScore = 0;
            const categorySums = { p: 0, c: 0, m: 0, s: 0 };

            reviews.forEach(review => {
                const catRatings = review.category_ratings || {}; // Ensure it's an object
                const categoryValues = [
                    catRatings["Salary Punctuality"], // CORRECT KEY
                    catRatings["Training Conditions"], // CORRECT KEY
                    catRatings["Club Management"], // CORRECT KEY
                    catRatings["Fair Salary"] // CORRECT KEY
                ].filter(r => typeof r === 'number');

                const categoryAverage = categoryValues.length > 0
                    ? categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length
                    : review.overall_rating;

                const weightedScore = (review.overall_rating * 0.5) + (categoryAverage * 0.5);
                totalWeightedScore += weightedScore;

                categorySums.p += catRatings["Salary Punctuality"] || 0; // CORRECT KEY
                categorySums.c += catRatings["Training Conditions"] || 0; // CORRECT KEY
                categorySums.m += catRatings["Club Management"] || 0; // CORRECT KEY
                categorySums.s += catRatings["Fair Salary"] || 0; // CORRECT KEY
            });

            return {
                clubName: club.name,
                reviewCount,
                avgOverall: totalWeightedScore / reviewCount,
                avgPunctuality: categorySums.p / reviewCount,
                avgConditions: categorySums.c / reviewCount,
                avgManagement: categorySums.m / reviewCount,
                avgFairSalary: categorySums.s / reviewCount,
                reviews: reviews // Pass through the individual reviews for the modal
            };
        });

        return NextResponse.json(aggregatedData);

    } catch (error: any) {
        console.error("Error fetching club reviews:", error);
        return NextResponse.json({ error: `Failed to fetch club reviews: ${error.message}` }, { status: 500 });
    }
}