import LinkClient from "./LinkClient";

/** Approval page for the widget pairing flow. Signed-out users are sent to /auth by proxy.ts and returned here. */
export default async function LinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
    const { code } = await searchParams;
    return <LinkClient code={typeof code === "string" ? code.slice(0, 20) : ""} />;
}
