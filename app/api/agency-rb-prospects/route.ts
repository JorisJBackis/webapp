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
        const limit = parseInt(url.searchParams.get("limit") || "15");
        const searchQuery = url.searchParams.get("search") || "";
        const offset = (page - 1) * limit;

        let query = supabase
            .from("agency_rb_prospects")
            .select("*", { count: 'exact' })
            .order("footy_labs_score", { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1);

        // If there is a search query, add a filter
        if (searchQuery) {
            query = query.ilike('player_name', `%${searchQuery}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return NextResponse.json({ data, count });
    } catch (error) {
        console.error("Error fetching agency prospects:", error);
        return NextResponse.json({ error: "Failed to fetch agency prospects" }, { status: 500 });
    }
}