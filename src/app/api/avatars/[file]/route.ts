import { NextResponse } from "next/server";
import { readAvatarFile, AVATAR_MIME } from "@/lib/avatar-fs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!file || file.includes("/") || file.includes("\\") || file.includes("..") || file.includes("%")) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = await readAvatarFile(file);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const mime = AVATAR_MIME[ext] ?? "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
