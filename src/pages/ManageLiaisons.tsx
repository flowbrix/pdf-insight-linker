
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Liaison = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

const ManageLiaisons = () => {
  const queryClient = useQueryClient();
  const [newLiaison, setNewLiaison] = useState({
    name: "",
  });

  // Charger les liaisons et le rôle de l'utilisateur
  const { data: liaisons, isLoading } = useQuery({
    queryKey: ["liaisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liaisons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Liaison[];
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Créer une nouvelle liaison
  const handleCreateLiaison = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLiaison.name) {
      toast.error("Le nom de la liaison est requis");
      return;
    }

    try {
      const { error } = await supabase
        .from("liaisons")
        .insert({
          name: newLiaison.name,
        });

      if (error) throw error;

      toast.success("Liaison créée avec succès");
      setNewLiaison({ name: "" });
      queryClient.invalidateQueries({ queryKey: ["liaisons"] });
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      toast.error("Erreur lors de la création de la liaison");
    }
  };

  // Mettre à jour le statut d'une liaison
  const updateLiaisonStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("liaisons")
        .update({ active })
        .eq("id", id);

      if (error) throw error;

      toast.success("Statut mis à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["liaisons"] });
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  // Supprimer une liaison
  const deleteLiaison = async (id: string) => {
    try {
      const { error } = await supabase
        .from("liaisons")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Liaison supprimée avec succès");
      queryClient.invalidateQueries({ queryKey: ["liaisons"] });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de la liaison");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Gérer les Liaisons</h1>
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gérer les Liaisons</h1>
      </div>

      {/* Formulaire de création */}
      <form onSubmit={handleCreateLiaison} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle Liaison
        </h2>
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={newLiaison.name}
            onChange={(e) => setNewLiaison({ name: e.target.value })}
            placeholder="Nom de la liaison"
          />
        </div>
        <Button type="submit" className="mt-4">
          Créer la liaison
        </Button>
      </form>

      {/* Liste des liaisons */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Actions</TableHead>
              {userProfile?.role === "admin" && (
                <TableHead className="w-[100px]">Supprimer</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {liaisons?.map((liaison) => (
              <TableRow key={liaison.id}>
                <TableCell className="font-medium">{liaison.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={liaison.active ? "success" : "destructive"}
                    className="w-24 justify-center"
                  >
                    {liaison.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={liaison.active}
                    onCheckedChange={(checked) =>
                      updateLiaisonStatus(liaison.id, checked)
                    }
                  />
                </TableCell>
                {userProfile?.role === "admin" && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette liaison ?")) {
                          deleteLiaison(liaison.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageLiaisons;
