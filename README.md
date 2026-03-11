# Bhagavad Gita

Static Bhagavad Gita experience with:

- 18 chapters bundled locally as JSON
- one shloka per page with direct verse navigation
- chapter artwork and chapter-wise audio from local assets
- Krishna-themed immersive layout with ambient playback toggle

## Build data

The app uses the public [gita/gita](https://github.com/gita/gita) dataset for chapter metadata, verses, and English translations. To rebuild the local JSON bundle:

```bash
node scripts/build-data.mjs
```

## Run locally

Serve the folder with any static server. Example:

```bash
python3 -m http.server 4173
```
