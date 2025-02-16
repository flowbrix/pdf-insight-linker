
FROM denoland/deno:alpine-1.37.0

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    python3 \
    py3-pip \
    tesseract-ocr \
    tesseract-ocr-data-fra \
    poppler-utils \
    gcc \
    python3-dev \
    musl-dev \
    jpeg-dev \
    zlib-dev \
    libjpeg

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers nécessaires
COPY . .

# Installation des dépendances Python
RUN pip3 install -r requirements.txt

# Création du dossier temporaire pour les PDF
RUN mkdir -p temp

# Exposition du port
EXPOSE 8000

# Commande par défaut
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-run", "index.ts"]
