import { Icon } from "@/components/ui";
export function Location({value}:{value?:string|null}){return <span className="location-line"><Icon name="pin" size={16}/>{value || "Ubicación por confirmar"}</span>}
