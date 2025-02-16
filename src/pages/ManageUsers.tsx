
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "operator" | "client";
  active: boolean;
};

const ManageUsers = () => {
  const { data: profiles, isLoading, error } = useQuery({
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
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Gérer les Utilisateurs</h1>
        <div>Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Gérer les Utilisateurs</h1>
        <div className="text-red-500">Erreur lors du chargement des utilisateurs</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gérer les Utilisateurs</h1>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  {profile.first_name || profile.last_name
                    ? `${profile.first_name || ""} ${profile.last_name || ""}`
                    : "Non renseigné"}
                </TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={profile.role}
                    onValueChange={(value: Profile["role"]) =>
                      updateUserRole(profile.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="operator">Opérateur</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={profile.active ? "success" : "destructive"}
                    className="w-24 justify-center"
                  >
                    {profile.active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={profile.active}
                    onCheckedChange={(checked) =>
                      updateUserStatus(profile.id, checked)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageUsers;
