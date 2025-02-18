
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Profile } from "@/types/user";

export const useProfiles = () => {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateUserRole = async (userId: string, newRole: Profile["role"]) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du rôle");
      return;
    }
    toast.success("Rôle mis à jour avec succès");
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
  };

  const updateUserStatus = async (userId: string, active: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ active })
      .eq("id", userId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du statut");
      return;
    }
    toast.success("Statut mis à jour avec succès");
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
  };

  return {
    profiles,
    isLoading,
    updateUserRole,
    updateUserStatus,
  };
};
