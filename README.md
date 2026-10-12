# Snip Studio

A standalone desktop snipping and annotation app built with Electron, React, Vite, and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

The app opens with a bundled website mockup. Drag over the image to crop a snip, then use the pen, highlighter, or rectangle tools and choose an annotation color. **Copy** puts the finished image on the system clipboard; **Download Snip** opens the native save dialog and exports a PNG.

Use **Open image** to select a local image to capture instead. Image editing and cropping happen locally on your device.

## Build and package

```bash
npm run build
npm run package
```

Vite output is written to `dist/`. Electron Builder packages the app into `release/` for the current platform.
