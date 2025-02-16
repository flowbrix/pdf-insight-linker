
FROM denoland/deno:1.40.2

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    poppler-utils \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Configuration d'ImageMagick pour permettre la conversion PDF
RUN sed -i 's/rights="none" pattern="PDF"/rights="read | write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

WORKDIR /app
USER deno

