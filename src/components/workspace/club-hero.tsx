import {AvatarImage} from "@/components/avatar-image";
import {Icon,PLACEHOLDER_IMAGE} from "@/components/ui";
import {safeUrl,type Row} from "./common";
import {Location} from "./location";
export function ClubHero({club}:{club?:Row}){
  return <header className="club-hero"><img className="hero-cover" src={safeUrl(club?.coverUrl)||PLACEHOLDER_IMAGE} alt="Portada del club"/>
    <div className="hero-identity"><span className="hero-logo">{safeUrl(club?.logoUrl)?<AvatarImage src={safeUrl(club?.logoUrl)} alt=""/>:<Icon name="users" size={38}/>}</span>
    <div><h1>{club?.name||"Club"}</h1><p>{club?.description}</p><Location value={club?.address}/>{safeUrl(club?.googleMapsUrl)&&<a href={safeUrl(club?.googleMapsUrl)} target="_blank" rel="noreferrer">Ver en Google Maps ↗</a>}</div>
    <aside>{club?.createdAt&&<small>DESDE {new Date(club.createdAt).getFullYear()}</small>}<strong>{club?._count?.memberships??"—"}</strong><span>Miembros</span></aside></div></header>
}
