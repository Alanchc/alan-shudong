import Editor from "@/components/Editor";

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <Editor entryId={id ?? null} />;
}
