// Server-only helpers for couple-messages.functions.ts.

import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";

export type AdminClient = typeof _admin;

export function getAdmin(): AdminClient {
  return _admin;
}

export type CoupleMessage = {
  id: string;
  superintendent_id: string;
  parent_id: string | null;
  author: "super" | "wife";
  title: string | null;
  body: string;
  read_by_super: boolean;
  read_by_wife: boolean;
  created_at: string;
  updated_at: string;
};

export type CoupleThread = {
  root: CoupleMessage;
  replies: CoupleMessage[];
};

export function groupThreads(rows: CoupleMessage[]): CoupleThread[] {
  const roots = rows.filter((r) => !r.parent_id);
  const byParent = new Map<string, CoupleMessage[]>();
  for (const r of rows) {
    if (r.parent_id) {
      const arr = byParent.get(r.parent_id) ?? [];
      arr.push(r);
      byParent.set(r.parent_id, arr);
    }
  }
  return roots
    .map((root) => ({
      root,
      replies: (byParent.get(root.id) ?? []).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
    }))
    .sort((a, b) => {
      const al = a.replies[a.replies.length - 1]?.created_at ?? a.root.created_at;
      const bl = b.replies[b.replies.length - 1]?.created_at ?? b.root.created_at;
      return bl.localeCompare(al);
    });
}

export async function resolveWifeSuperId(inviteCode: string): Promise<string | null> {
  const { data: prof } = await _admin
    .from("profiles")
    .select("id")
    .eq("wife_invite_code", inviteCode)
    .maybeSingle();
  return prof?.id ?? null;
}
