import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit, Plus, X } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "operator" | "client";
  active: boolean;
};

type Liaison = {
  id: string;
  name: string;
  active: boolean;
};

type ClientLiaison = {
  client_id: string;
  liaison_id: string;
};

type NewUser = {
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "operator" | "client";
  liaison_id?: string;
};

const ManageUsers = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<Profile>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    first_name: "",
    last_name: "",
    role: "client",
  });

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
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

  const { data: liaisons, isLoading: isLoadingLiaisons } = useQuery({
    queryKey: ["liaisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liaisons")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Liaison[];
    },
  });

  const { data: clientLiaisons, isLoading: isLoadingClientLiaisons } = useQuery({
    queryKey: ["client_liaisons", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from("client_liaisons")
        .select("*")
        .eq("client_id", selectedUser.id);

      if (error) throw error;
      return data as ClientLiaison[];
    },
    enabled: !!selectedUser?.id,
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
    queryClient.invalidateQueries({ queryKey: ["client_liaisons"] });
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

  const handleEditUser = async () => {
    if (!selectedUser?.id || !editedUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editedUser.first_name,
        last_name: editedUser.last_name,
      })
      .eq("id", selectedUser.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour du profil");
      return;
    }

    toast.success("Profil mis à jour avec succès");
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    setIsDialogOpen(false);
  };

  const assignLiaison = async (userId: string, liaisonId: string) => {
    const { error } = await supabase
      .from("client_liaisons")
      .insert({ client_id: userId, liaison_id: liaisonId });

    if (error) {
      if (error.code === "23505") {
        toast.error("Cette liaison est déjà assignée à cet utilisateur");
      } else {
        toast.error("Erreur lors de l'assignation de la liaison");
      }
      return;
    }

    toast.success("Liaison assignée avec succès");
    queryClient.invalidateQueries({ queryKey: ["client_liaisons"] });
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
    queryClient.invalidateQueries({ queryKey: ["client_liaisons"] });
  };

  const createUser = async () => {
    try {
      if (!newUser.email || !newUser.first_name || !newUser.last_name) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email: newUser.email,
        options: {
          data: {
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            role: newUser.role,
          },
        },
      });

      if (authError) throw authError;

      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          role: newUser.role,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
        })
        .eq("email", newUser.email);

      if (profileError) {
        console.error("Erreur lors de la mise à jour du profil:", profileError);
        throw profileError;
      }

      if (newUser.role === "client" && newUser.liaison_id) {
        const { data: profileData, error: profileFetchError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", newUser.email)
          .single();

        if (profileFetchError) {
          console.error("Erreur lors de la récupération du profil:", profileFetchError);
          throw profileFetchError;
        }

        if (profileData) {
          const { error: liaisonError } = await supabase
            .from("client_liaisons")
            .insert({
              client_id: profileData.id,
              liaison_id: newUser.liaison_id,
            });

          if (liaisonError) {
            console.error("Erreur lors de la création de la liaison:", liaisonError);
            throw liaisonError;
          }
        }
      }

      toast.success("Un email d'invitation a été envoyé à l'utilisateur");
      setIsCreateDialogOpen(false);
      setNewUser({
        email: "",
        first_name: "",
        last_name: "",
        role: "client",
      });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error: any) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      toast.error("Erreur lors de la création de l'utilisateur : " + error.message);
    }
  };

  if (isLoadingProfiles || isLoadingLiaisons) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Gérer les Utilisateurs</h1>
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gérer les Utilisateurs</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Liaisons</TableHead>
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
                <TableCell className="flex items-center gap-2">
                  <Switch
                    checked={profile.active}
                    onCheckedChange={(checked) =>
                      updateUserStatus(profile.id, checked)
                    }
                  />
                  <Dialog open={isDialogOpen && selectedUser?.id === profile.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (open) {
                      setSelectedUser(profile);
                      setEditedUser({
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                      });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifier l'utilisateur</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="firstName">Prénom</Label>
                          <Input
                            id="firstName"
                            value={editedUser.first_name || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                first_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Nom</Label>
                          <Input
                            id="lastName"
                            value={editedUser.last_name || ""}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                last_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <Button onClick={handleEditUser}>Enregistrer</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell>
                  {profile.role === "client" && (
                    <div className="flex flex-col gap-2">
                      <Select
                        onValueChange={(liaisonId) =>
                          assignLiaison(profile.id, liaisonId)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assigner une liaison" />
                        </SelectTrigger>
                        <SelectContent>
                          {liaisons
                            ?.filter(
                              (l) =>
                                l.active &&
                                !clientLiaisons?.some(
                                  (cl) =>
                                    cl.client_id === profile.id &&
                                    cl.liaison_id === l.id
                                )
                            )
                            .map((liaison) => (
                              <SelectItem key={liaison.id} value={liaison.id}>
                                {liaison.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        {clientLiaisons
                          ?.filter((cl) => cl.client_id === profile.id)
                          .map((cl) => {
                            const liaison = liaisons?.find(
                              (l) => l.id === cl.liaison_id
                            );
                            return (
                              liaison && (
                                <Badge
                                  key={cl.liaison_id}
                                  className="flex items-center gap-1"
                                >
                                  {liaison.name}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() =>
                                      removeLiaison(profile.id, liaison.id)
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              )
                            );
                          })}
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={newUser.first_name}
                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={newUser.last_name}
                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: "admin" | "operator" | "client") =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="operator">Opérateur</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === "client" && (
              <div className="grid gap-2">
                <Label htmlFor="liaison">Liaison</Label>
                <Select
                  value={newUser.liaison_id}
                  onValueChange={(value) =>
                    setNewUser({ ...newUser, liaison_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une liaison" />
                  </SelectTrigger>
                  <SelectContent>
                    {liaisons?.filter(l => l.active).map((liaison) => (
                      <SelectItem key={liaison.id} value={liaison.id}>
                        {liaison.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createUser}>
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
