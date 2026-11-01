import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
export async function GET() { try { const { data, error } = await getSupabaseServer().from("section_audit_log").select("*").order("created_at", { ascending: false }).limit(200); if (error) throw error; return NextResponse.json({ data: data ?? [] }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
