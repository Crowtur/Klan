import type {ImgHTMLAttributes} from "react";

export function AvatarImage({src,sizes="80px",...props}:ImgHTMLAttributes<HTMLImageElement>){
  if(typeof src!=="string" || !src)return null;
  if(src.startsWith("/api/avatars/"))return <img {...props} src={src} srcSet={src+" 128w, "+src+"?size=300 300w"} sizes={sizes}/>;
  // Original URLs from earlier versions are resized and cached by Next's image endpoint.
  if(/^https:\/\/(?:[a-z0-9-]+\.ufs\.sh|utfs\.io)\/f\//i.test(src)){
    const variant=(width:number)=>"/_next/image?url="+encodeURIComponent(src)+"&w="+width+"&q=75";
    return <img {...props} src={variant(128)} srcSet={variant(128)+" 128w, "+variant(300)+" 300w"} sizes={sizes}/>;
  }
  return <img {...props} src={src}/>;
}
