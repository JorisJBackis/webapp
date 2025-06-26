// app/api/agency-rb-prospects/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "25"); // Or a suitable default
        const offset = (page - 1) * limit;

        // Fetch data with count for pagination
        const { data, error, count } = await supabase
            .from("agency_rb_prospects")
            .select("*", { count: 'exact' }) // Get all columns and total count
            .order("footy_labs_score", { ascending: false, nullsFirst: false }) // Example sort
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Supabase error fetching agency RB prospects:", error);
            throw error;
        }

        return NextResponse.json({ data, count }); // Return data and total count
    } catch (error: any) {
        console.error("Catch block: Error fetching agency RB prospects:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch agency RB prospects" },
            { status: 500 }
        );
    }
}