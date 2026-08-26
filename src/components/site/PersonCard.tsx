import type { ReactNode } from 'react';
import Photo from './Photo';

/** 90px-radius capsule with a circular avatar on top — people and donations. */
export default function PersonCard({
  name,
  role,
  photo,
  bio,
  avatarSize = 78,
  children,
}: {
  name: ReactNode;
  role?: ReactNode;
  photo?: string | null;
  bio?: ReactNode;
  avatarSize?: 78 | 86;
  children?: ReactNode;
}) {
  return (
    <div className="capsule-card flex h-full flex-col items-center">
      <div className="shrink-0" style={{ width: avatarSize, height: avatarSize }}>
        <Photo
          src={photo}
          alt={typeof name === 'string' ? name : 'Photo'}
          placeholder="photo"
          className="h-full w-full rounded-full"
        />
      </div>
      <div className="mt-4 font-archivo text-[16px] font-bold leading-tight text-site-ink">
        {name}
      </div>
      {role && <div className="mt-2 font-dmsans text-[12px] text-site-faint">{role}</div>}
      {bio && <p className="mt-3.5 font-dmsans text-[12.5px] leading-[1.7] text-site-muted">{bio}</p>}
      {children}
    </div>
  );
}
