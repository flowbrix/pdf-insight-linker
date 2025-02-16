
import sys
import pytesseract
from pdf2image import convert_from_path
import json

def process_document(document_id):
    try:
        # Conversion du PDF en images
        images = convert_from_path(f'temp/{document_id}.pdf')
        
        results = []
        
        # Traitement de chaque page
        for i, image in enumerate(images):
            # Utilisation de Tesseract pour extraire le texte
            text = pytesseract.image_to_string(image, lang='fra')
            results.append({
                'page': i + 1,
                'text': text
            })
        
        # Retourner les résultats au format JSON
        print(json.dumps({
            'success': True,
            'pages': results
        }))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        document_id = sys.argv[1]
        process_document(document_id)
    else:
        print(json.dumps({
            'success': False,
            'error': 'No document ID provided'
        }))
