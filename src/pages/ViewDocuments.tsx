
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DocumentList } from "@/components/documents/DocumentList";
import { SectorFilter } from "@/components/documents/SectorFilter";
import { LiaisonFilter } from "@/components/documents/LiaisonFilter";
import { LengthFilter } from "@/components/documents/LengthFilter";
import { DocumentsPagination } from "@/components/documents/DocumentsPagination";

type Sector = "SAT" | "Embarquement" | "Cable" | "all";

const ViewDocuments = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSector, setSelectedSector] = useState<Sector>("all");
  const [selectedLiaison, setSelectedLiaison] = useState("all");
  const [selectedLength, setSelectedLength] = useState("all");
  const [availableLengths, setAvailableLengths] = useState<string[]>([]);
  const itemsPerPage = 10;

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", currentPage, selectedSector, selectedLiaison, selectedLength],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*, liaisons(name)")
        .order("created_at", { ascending: false });

      if (profile?.role === "client") {
        query = query.eq("client_visible", true);
      }

      if (selectedSector && selectedSector !== "all") {
        query = query.eq("sector", selectedSector);
      }

      if (selectedLiaison && selectedLiaison !== "all") {
        query = query.eq("liaison_id", selectedLiaison);
      }

      if (selectedLength && selectedLength !== "all") {
        query = query.eq("length_number", selectedLength);
      }

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error, count } = await query
        .range(start, end);

      if (error) throw error;

      return { documents: data, total: count || 0 };
    },
  });

  useEffect(() => {
    const fetchLengths = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("length_number")
        .not("length_number", "is", null);

      if (error) {
        console.error("Erreur lors du chargement des numéros de longueur:", error);
        return;
      }

      const uniqueLengths = Array.from(new Set(data.map(doc => doc.length_number))).filter(Boolean);
      setAvailableLengths(uniqueLengths);
    };

    fetchLengths();
  }, []);

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erreur lors du téléchargement du document");
    }
  };

  const totalPages = documents
    ? Math.ceil(documents.total / itemsPerPage)
    : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex flex-wrap gap-4">
          <SectorFilter
            selectedSector={selectedSector}
            onSectorChange={(value: Sector) => setSelectedSector(value)}
          />
          <LiaisonFilter
            selectedLiaison={selectedLiaison}
            onLiaisonChange={setSelectedLiaison}
          />
          <LengthFilter
            selectedLength={selectedLength}
            availableLengths={availableLengths}
            onLengthChange={setSelectedLength}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DocumentList
            documents={documents?.documents || []}
            onDownload={handleDownload}
          />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <DocumentsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ViewDocuments;
