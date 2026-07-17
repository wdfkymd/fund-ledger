import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME,
  detectImageExt,
  writeAvatarFile,
  deleteAvatarFile,
} from "@/lib/avatar-fs";

const ALLOWED_MIME = new Set(Object.values(AVATAR_MIME));

export const POST = withApi(async ({ user, req }) => {
  const form = await req.formData();
  const file = form.get("avatar");
  if (!file || typeof file === "string") {
    return Response.json({ ok: false, error: "请选择图片文件" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json({ ok: false, error: "仅支持 JPG/PNG/WebP/GIF" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return Response.json({ ok: false, error: "图片不能超过 2MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(buffer);
  if (!ext) {
    return Response.json({ ok: false, error: "文件内容不是有效图片" }, { status: 400 });
  }

  const safeExt = ext === "jpeg" ? "jpg" : ext;
  const filename = `${user.id}-${Date.now()}.${safeExt}`;
  await writeAvatarFile(filename, buffer);

  const avatarUrl = `/api/avatars/${filename}`;

  const oldAvatarUrl = user.avatarUrl;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    }),
  ]);

  await deleteAvatarFile(oldAvatarUrl);

  return Response.json({ ok: true, data: { avatarUrl } });
});

export const DELETE = withApi(async ({ user }) => {
  const current = user.avatarUrl;
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });
  await deleteAvatarFile(current);
  return Response.json({ ok: true, data: null });
});
