import Image from "next/image";
import type { ReactNode } from "react";

type AthleteProfileCardProps = {
  name: string;
  club: string;
  clubLogo?: string;
  photoSrc?: string;
  children?: ReactNode;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AthleteProfileCard({ name, club, clubLogo, photoSrc, children }: AthleteProfileCardProps) {
  return (
    <aside className="athlete-column" aria-label="Athlete profile">
      <div className="athlete-photo">
        {photoSrc ? (
          <Image
            src={photoSrc}
            alt={name}
            width={340}
            height={453}
            className="athlete-photo__img"
            priority
            sizes="(max-width: 900px) 100vw, 320px"
          />
        ) : (
          <div className="athlete-photo__img athlete-photo__placeholder" aria-hidden="true">
            <span className="athlete-photo__initials">{initials(name)}</span>
          </div>
        )}
        <div className="athlete-photo__overlay">
          <p className="athlete-photo__label">Athlete</p>
          <h2 className="athlete-photo__name">{name}</h2>
          <p className="athlete-photo__club">
            {clubLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clubLogo} alt="" className="club-logo" />
            ) : null}
            {club}
          </p>
        </div>
      </div>
      {children ? <div className="athlete-column__actions">{children}</div> : null}
    </aside>
  );
}
