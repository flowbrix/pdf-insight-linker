
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import FileDropzone from "@/components/FileDropzone"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

export default function ImageTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState<string>("")

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setExtractedText("")
  }

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner une image")
      return
    }

    setIsProcessing(true)
    try {
      // Upload de l'image
      const fileName = `${crypto.randomUUID()}-${selectedFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('test-images')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Création de l'entrée dans la base de données
      const { data: imageTest, error: insertError } = await supabase
        .from('image_tests')
        .insert({ image_path: fileName })
        .select()
        .single()

      if (insertError) throw insertError

      // Analyse avec Mistral
      const response = await fetch('/functions/v1/analyze-image-mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: imageTest.id })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse')
      }

      const { extractedText: text, error } = await response.json()
      if (error) throw new Error(error)

      setExtractedText(text)
      toast.success("Analyse terminée avec succès")

    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Erreur lors de l'analyse: " + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test d'Analyse d'Image avec Mistral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropzone onFileSelect={handleFileSelect} />
          
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Image sélectionnée : {selectedFile.name}
            </p>
          )}

          <Button 
            onClick={handleUploadAndAnalyze} 
            disabled={!selectedFile || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Analyse en cours..." : "Analyser l'image"}
          </Button>

          {extractedText && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Texte extrait :</h3>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {extractedText}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
