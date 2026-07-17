import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

export const AVATAR_DIR = "data/avatars"
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export const AVATAR_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

const SAFE_NAME = /^[a-z0-9]+-\d+\.(jpg|jpeg|png|webp|gif)$/i

export function avatarRoot(): string {
  return path.resolve(process.cwd(), AVATAR_DIR)
}

/** 校验 URL 段/文件名，拒绝路径穿越 */
export function safeAvatarFilename(file: string): string | null {
  if (!file || file.includes("\0")) return null
  let decoded = file
  try {
    decoded = decodeURIComponent(file)
  } catch {
    return null
  }
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) {
    return null
  }
  const base = path.basename(decoded)
  if (base !== decoded) return null
  if (!SAFE_NAME.test(base)) return null
  return base
}

export function resolveAvatarPath(filename: string): string | null {
  const safe = safeAvatarFilename(filename)
  if (!safe) return null
  const root = avatarRoot()
  const full = path.resolve(root, safe)
  if (!full.startsWith(root + path.sep) && full !== root) {
    return null
  }
  return full
}

export function detectImageExt(buffer: Buffer): keyof typeof AVATAR_MIME | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg"
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png"
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "gif"
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp"
  }
  return null
}

export async function ensureAvatarDir() {
  await mkdir(avatarRoot(), { recursive: true })
}

export async function writeAvatarFile(filename: string, buffer: Buffer) {
  const full = resolveAvatarPath(filename)
  if (!full) throw new Error("非法文件名")
  await ensureAvatarDir()
  await writeFile(full, buffer)
}

export async function readAvatarFile(filename: string) {
  const full = resolveAvatarPath(filename)
  if (!full) return null
  try {
    return await readFile(full)
  } catch {
    return null
  }
}

export async function deleteAvatarFile(filenameOrUrl: string | null | undefined) {
  if (!filenameOrUrl) return
  const name = filenameOrUrl.includes("/")
    ? path.basename(filenameOrUrl)
    : filenameOrUrl
  const full = resolveAvatarPath(name)
  if (!full) return
  await unlink(full).catch(() => {})
}
