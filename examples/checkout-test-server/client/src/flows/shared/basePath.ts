import { useLocation } from "react-router-dom";

export function useFlowBasePath(): string {
  const location = useLocation();
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first ? `/${first}` : "";
}
