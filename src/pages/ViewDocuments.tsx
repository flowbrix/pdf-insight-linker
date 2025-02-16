
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Sector = "SAT" | "Embarquement" | "Cable" | "all";

const ViewDocuments = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSector, setSelectedSector] = useState<Sector>("all");
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
    queryKey: ["documents", currentPage, selectedSector],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select(`
          *,
          extracted_data (*)
        `)
        .order("created_at", { ascending: false });

      if (profile?.role === "client") {
        query = query.eq("client_visible", true);
      }

      if (selectedSector && selectedSector !== "all") {
        query = query.eq("sector", selectedSector);
      }

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error, count } = await query
        .range(start, end);

      if (error) throw error;

      return { documents: data, total: count || 0 };
    },
  });

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Select value={selectedSector} onValueChange={(value: Sector) => setSelectedSector(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par secteur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les secteurs</SelectItem>
            <SelectItem value="SAT">SAT</SelectItem>
            <SelectItem value="Embarquement">Embarquement</SelectItem>
            <SelectItem value="Cable">Cable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du fichier</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {doc.file_name}
                    </div>
                  </TableCell>
                  <TableCell>{doc.sector}</TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    {new Date(doc.created_at!).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleDownload(doc.file_path, doc.file_name)
                        }
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    onClick={() => setCurrentPage(i + 1)}
                    isActive={currentPage === i + 1}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default ViewDocuments;
