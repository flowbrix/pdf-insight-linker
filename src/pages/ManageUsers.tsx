
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; 
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { type Profile, type NewUser } from "@/types/user";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UserList } from "@/components/users/UserList";
import { useProfiles } from "@/hooks/useProfiles";
import { useLiaisons } from "@/hooks/useLiaisons";

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

  const { profiles, isLoading: isLoadingProfiles, updateUserRole, updateUserStatus } = useProfiles();
  const { liaisons, clientLiaisons, isLoading: isLoadingLiaisons, assignLiaison, removeLiaison } = useLiaisons(selectedUser?.id);

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

  const createUser = async () => {
    try {
      if (!newUser.email || !newUser.first_name || !newUser.last_name) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }

      // Fermer d'abord la modale
      setIsCreateDialogOpen(false);

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

      // Attendre un peu pour laisser le temps au trigger de créer le profil
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
      // Réouvrir la modale en cas d'erreur pour permettre à l'utilisateur de corriger
      setIsCreateDialogOpen(true);
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

      <UserList
        profiles={profiles || []}
        liaisons={liaisons || []}
        clientLiaisons={clientLiaisons || []}
        selectedUser={selectedUser}
        editedUser={editedUser}
        isDialogOpen={isDialogOpen}
        onUpdateRole={updateUserRole}
        onUpdateStatus={updateUserStatus}
        onDialogOpenChange={setIsDialogOpen}
        onEditUser={setSelectedUser}
        onEditedUserChange={setEditedUser}
        onSaveEdit={handleEditUser}
        onAssignLiaison={assignLiaison}
        onRemoveLiaison={removeLiaison}
      />

      <CreateUserDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        newUser={newUser}
        onNewUserChange={setNewUser}
        onCreateUser={createUser}
        liaisons={liaisons || []}
      />
    </div>
  );
};

export default ManageUsers;
