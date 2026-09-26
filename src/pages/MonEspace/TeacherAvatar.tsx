function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TeacherAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export default function TeacherAvatar({ avatarUrl, name, size = 40, className = "" }: TeacherAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsFrom(name)}
    </div>
  );
}
