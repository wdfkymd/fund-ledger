import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { readAvatarFile, AVATAR_MIME } from "@/lib/avatar-fs";
import { unauthorized } from "@/lib/api";

/**
 * 需登录可读。文件名仍校验防穿越；Cache-Control 改为 private，避免 CDN/共享缓存。
 * 侧栏头像由 layout 内联 data URL，不依赖本接口未登录访问。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }

  const { file } = await params;
  if (
    !file ||
    file.includes("/") ||
    file.includes("\\") ||
    file.includes("..") ||
    file.includes("%")
  ) {
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
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
