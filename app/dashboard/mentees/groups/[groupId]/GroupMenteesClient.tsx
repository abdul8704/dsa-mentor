"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MenteeTable } from "../../MenteeTable";
import { NoteModal } from "../../MenteesClient";
import type { MenteeSummary } from "@/app/lib/types/mentorship";

interface GroupMenteesClientProps {
    groupName: string;
    mentees: MenteeSummary[];
}

/** Group detail page: the exact roster table, scoped to this group's members. */
export default function GroupMenteesClient({ groupName, mentees }: GroupMenteesClientProps) {
    const router = useRouter();
    const [noteTarget, setNoteTarget] = useState<{ kind: "mentee"; id: string; label: string } | null>(null);

    function refresh() {
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <Link
                href="/dashboard/mentees"
                className="inline-flex items-center gap-1 text-[13px] text-[#dfc0b6] hover:text-[#ffb59d] transition-colors w-fit"
            >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to mentees
            </Link>

            <div>
                <h1 className="text-[28px] lg:text-[32px] font-semibold tracking-[-0.02em] text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                    {groupName}
                </h1>
                <p className="text-[#dfc0b6] opacity-80 mt-1">
                    {mentees.length} {mentees.length === 1 ? "mentee" : "mentees"} in this group
                </p>
            </div>

            <MenteeTable
                mentees={mentees}
                onNote={(id, label) => setNoteTarget({ kind: "mentee", id, label })}
                emptyState={
                    <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center gap-4">
                        <span className="material-symbols-outlined text-[48px] text-[#ffb59d] opacity-70">group</span>
                        <div>
                            <p className="text-[18px] font-semibold text-[#e5e1e4]">No mentees in this group yet</p>
                            <p className="text-[#dfc0b6] opacity-80 mt-1 max-w-md">
                                Go back to the mentees page and use the &quot;Add mentees&quot; icon on this group&apos;s card.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/mentees"
                            className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined">group_add</span>
                            Back to mentees
                        </Link>
                    </div>
                }
            />

            {noteTarget && (
                <NoteModal
                    target={noteTarget}
                    mentees={mentees}
                    onClose={() => setNoteTarget(null)}
                    onSent={refresh}
                />
            )}
        </div>
    );
}

