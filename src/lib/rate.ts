import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { USD_TO_BS } from "@/lib/format";

/** Global USD -> Bs exchange rate, editable by admins. */
export function useRate() {
  const q = useQuery({
    queryKey: ["usd-rate"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("usd_to_bs").eq("id", 1).maybeSingle();
      return Number(data?.usd_to_bs ?? USD_TO_BS);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return q.data ?? USD_TO_BS;
}
