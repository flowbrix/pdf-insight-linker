
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Profile } from "@/types/user";

export const useLiaisons = (selectedUserId?: string) => {
  const queryClient = useQueryClient();

  const { data: liaisons, isLoading } = useQuery({
    queryKey: ["liaisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liaisons")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: clientLiaisons } = useQuery({
    queryKey: ["client_liaisons", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from("client_liaisons")
        .select("*")
        .eq("client_id", selectedUserId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  const assignLiaison = async (userId: string, liaisonId: string) => {
    // Vérifier si la liaison existe déjà
    const { data: existingLiaison } = await supabase
      .from("client_liaisons")
      .select("*")
      .eq("client_id", userId)
      .eq("liaison_id", liaisonId)
      .maybeSingle();

    if (existingLiaison) {
      toast.error("Cette liaison est déjà assignée à cet utilisateur");
      return;
    }

    const { error } = await supabase
      .from("client_liaisons")
      .insert({ client_id: userId, liaison_id: liaisonId });

    if (error) {
      toast.error("Erreur lors de l'assignation de la liaison");
      return;
    }

    toast.success("Liaison assignée avec succès");
    await queryClient.invalidateQueries({ queryKey: ["client_liaisons", userId] });
  };

  const removeLiaison = async (userId: string, liaisonId: string) => {
    const { error } = await supabase
      .from("client_liaisons")
      .delete()
      .eq("client_id", userId)
      .eq("liaison_id", liaisonId);

    if (error) {
      toast.error("Erreur lors de la suppression de la liaison");
      return;
    }

    toast.success("Liaison supprimée avec succès");
    await queryClient.invalidateQueries({ queryKey: ["client_liaisons", userId] });
  };

  return {
    liaisons,
    clientLiaisons,
    isLoading,
    assignLiaison,
    removeLiaison,
  };
};
