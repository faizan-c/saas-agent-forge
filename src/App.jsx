import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Crosshair,
  ImagePlus,
  Minus,
  MousePointer2,
  Pencil,
  RectangleHorizontal,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import mockupUrl from "./assets/screen-mockup.svg";

const tools = [
  { id: "pen", label: "Pen", Icon: Pencil },
  { id: "highlighter", label: "Highlighter", Icon: Sparkles },
  { id: "rectangle", label: "Rectangle", Icon: RectangleHorizontal },
];

function WindowControls() {
  return (
    <div className="window-controls">
      <button aria-label="Minimize window" onClick={() => window.snipStudio?.minimize()}>
        <Minus size={14} />
      </button>
      <button aria-label="Maximize window" onClick={() => window.snipStudio?.toggleMaximize()}>
        <Square size={11} />
      </button>
      <button className="close-control" aria-label="Close window" onClick={() => window.snipStudio?.close()}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function App() {
  const sourceCanvasRef = useRef(null);
  const editorCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const editorDragRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(mockupUrl);
  const [cropUrl, setCropUrl] = useState("");
  const [captureMode, setCaptureMode] = useState(true);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#a3e635");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const drawSelectionOverlay = useCallback((nextSelection) => {
    const canvas = sourceCanvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 15, 0.57)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (nextSelection) {
      const { x, y, width, height } = nextSelection;
      context.clearRect(x, y, width, height);
      context.drawImage(image, x, y, width, height, x, y, width, height);
      context.strokeStyle = "#a3e635";
      context.lineWidth = Math.max(2, canvas.width / 900);
      context.setLineDash([8, 5]);
      context.strokeRect(x, y, width, height);
      context.setLineDash([]);
    }
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const canvas = sourceCanvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      drawSelectionOverlay(null);
    };
    image.onerror = () => setNotice("That image could not be opened. Try another file.");
    image.src = imageUrl;
    return () => {
      if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl, drawSelectionOverlay]);

  useEffect(() => {
    if (!cropUrl) return;
    const image = new Image();
    image.onload = () => {
      const canvas = editorCanvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
    };
    image.src = cropUrl;
  }, [cropUrl]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const getSourcePoint = (event) => {
    const canvas = sourceCanvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - bounds.left) * canvas.width / bounds.width)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - bounds.top) * canvas.height / bounds.height)),
    };
  };

  const onSourcePointerDown = (event) => {
    if (!captureMode || !imageRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getSourcePoint(event);
    dragRef.current = { x: point.x, y: point.y };
    drawSelectionOverlay({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const onSourcePointerMove = (event) => {
    if (!captureMode || !dragRef.current) return;
    const start = dragRef.current;
    const point = getSourcePoint(event);
    const next = {
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    };
    drawSelectionOverlay(next);
  };

  const onSourcePointerUp = (event) => {
    if (!captureMode || !dragRef.current) return;
    const start = dragRef.current;
    const end = getSourcePoint(event);
    dragRef.current = null;
    const crop = {
      x: Math.floor(Math.min(start.x, end.x)),
      y: Math.floor(Math.min(start.y, end.y)),
      width: Math.floor(Math.abs(end.x - start.x)),
      height: Math.floor(Math.abs(end.y - start.y)),
    };
    if (crop.width < 6 || crop.height < 6) {
      drawSelectionOverlay(null);
      return;
    }
    const output = document.createElement("canvas");
    output.width = crop.width;
    output.height = crop.height;
    output.getContext("2d").drawImage(
      imageRef.current,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    try {
      setCropUrl(output.toDataURL("image/png"));
    } catch {
      setNotice("This image cannot be exported. Try a PNG, JPEG, WebP, GIF, or BMP image.");
      drawSelectionOverlay(null);
      return;
    }
    setCaptureMode(false);
  };

  const startNewSnip = () => {
    setCropUrl("");
    setCaptureMode(true);
    drawSelectionOverlay(null);
  };

  const onUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const supportedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"];
    if (!supportedTypes.includes(file.type)) {
      setNotice("Choose a PNG, JPEG, WebP, GIF, or BMP image to start a snip.");
      event.target.value = "";
      return;
    }
    setImageUrl(URL.createObjectURL(file));
    setCropUrl("");
    setCaptureMode(true);
    setNotice("");
    event.target.value = "";
  };

  const getEditorPoint = (event) => {
    const canvas = editorCanvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * canvas.height / bounds.height,
    };
  };

  const onSourcePointerCancel = () => {
    dragRef.current = null;
    drawSelectionOverlay(null);
  };

  const onEditorPointerDown = (event) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getEditorPoint(event);
    const context = canvas.getContext("2d");
    editorDragRef.current = {
      ...point,
      previous: point,
      snapshot: tool === "rectangle" ? context.getImageData(0, 0, canvas.width, canvas.height) : null,
    };
    if (tool !== "rectangle") {
      context.beginPath();
      context.moveTo(point.x, point.y);
    }
  };

  const onEditorPointerMove = (event) => {
    const state = editorDragRef.current;
    const canvas = editorCanvasRef.current;
    if (!state || !canvas) return;
    const context = canvas.getContext("2d");
    const point = getEditorPoint(event);
    const lineScale = canvas.width / 700;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (tool === "rectangle") {
      context.putImageData(state.snapshot, 0, 0);
      context.strokeStyle = color;
      context.lineWidth = Math.max(2, lineScale * 3);
      context.strokeRect(state.x, state.y, point.x - state.x, point.y - state.y);
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = color;
      context.globalAlpha = tool === "highlighter" ? 0.32 : 1;
      context.lineWidth = Math.max(2, lineScale * (tool === "highlighter" ? 15 : 3));
      context.beginPath();
      context.moveTo(state.previous.x, state.previous.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      context.globalAlpha = 1;
      state.previous = point;
    }
  };

  const finishEditorPointer = () => {
    const canvas = editorCanvasRef.current;
    if (!editorDragRef.current || !canvas) return;
    const context = canvas.getContext("2d");
    context.closePath();
    context.globalAlpha = 1;
    editorDragRef.current = null;
  };

  const exportSnip = async (action) => {
    const canvas = editorCanvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      const png = canvas.toDataURL("image/png");
      if (!window.snipStudio) throw new Error("Native desktop actions are unavailable.");
      if (action === "save") {
        const result = await window.snipStudio.savePng(png);
        if (result.saved) setNotice("Your snip was saved as a PNG.");
      } else {
        await window.snipStudio.copyImage(png);
        setNotice("Snip copied to your clipboard.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not export this snip.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div className="brand">
          <div className="brand-mark"><Crosshair size={17} strokeWidth={2.4} /></div>
          <span>snip<span className="brand-light">studio</span></span>
          <span className="brand-separator" />
          <span className="brand-caption">IMAGE WORKSPACE</span>
        </div>
        <div className="titlebar-center"><span className="live-dot" /> LOCAL WORKSPACE</div>
        <WindowControls />
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-label">WORKSPACE</div>
          <button className="nav-item active"><Crosshair size={17} /> <span>Capture</span><span className="nav-kbd">C</span></button>
          <button className="nav-item" onClick={() => fileInputRef.current?.click()}><ImagePlus size={17} /> <span>Open image</span></button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" className="hidden" onChange={onUpload} />

          <div className="sidebar-divider" />
          <div className="sidebar-label">ANNOTATE</div>
          <div className="sidebar-tool-list">
            {tools.map(({ id, label, Icon }) => (
              <button key={id} className={`nav-item tool-nav ${tool === id && cropUrl ? "selected" : ""}`} onClick={() => setTool(id)} disabled={!cropUrl}>
                <Icon size={17} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <div className="tip-card">
              <div className="tip-icon"><Sparkles size={15} /></div>
              <div className="tip-title">A little tip</div>
              <p>Drag across your image to select just the area you need.</p>
            </div>
            <button className="help-link" onClick={() => setNotice("Drag on the image to select. Then annotate, copy, or download.")}><CircleHelp size={15} /> How it works</button>
          </div>
        </aside>

        <section className="main-content">
          <div className="toolbar">
            <div className="toolbar-heading">
              <div className="eyebrow">{cropUrl ? "SNIP EDITOR" : "CAPTURE CANVAS"}</div>
              <h1>{cropUrl ? "Your snip" : "Make a selection"}</h1>
            </div>
            <div className="toolbar-actions">
              <button className="button button-secondary" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus size={15} /> Open image
              </button>
              {cropUrl ? (
                <>
                  <span className="action-divider" />
                  <div className="annotation-tools">
                    {tools.map(({ id, label, Icon }) => (
                      <button key={id} title={label} aria-label={label} className={`icon-button ${tool === id ? "tool-active" : ""}`} onClick={() => setTool(id)}>
                        <Icon size={16} />
                      </button>
                    ))}
                    <span className="tool-divider" />
                    <label className="color-control" title="Annotation color">
                      <input aria-label="Annotation color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                      <span className="color-swatch" style={{ backgroundColor: color }} />
                      <ChevronDown size={12} />
                    </label>
                  </div>
                  <span className="action-divider" />
                  <button className="button button-secondary" onClick={() => exportSnip("copy")} disabled={busy}>
                    <Clipboard size={15} /> Copy
                  </button>
                  <button className="button button-primary" onClick={() => exportSnip("save")} disabled={busy}>
                    <ArrowDownToLine size={15} /> Download Snip
                  </button>
                </>
              ) : (
                <button className="button button-primary" onClick={startNewSnip}>
                  <MousePointer2 size={15} /> Select region
                </button>
              )}
            </div>
          </div>

          <div className="canvas-area">
            <div className="canvas-toolbarline">
              <div className="canvas-context">
                <span className={`status-pill ${cropUrl ? "status-ready" : ""}`}><span />{cropUrl ? "READY TO EXPORT" : "SELECTION MODE"}</span>
                <span className="context-copy">{cropUrl ? "Draw directly on your image" : "Click and drag to capture a region"}</span>
              </div>
              {cropUrl && <button className="text-button" onClick={startNewSnip}><Crosshair size={14} /> New snip</button>}
            </div>

            <div className="canvas-stage">
              <div className="canvas-frame">
                {cropUrl ? (
                  <canvas
                    ref={editorCanvasRef}
                    className="editor-canvas"
                    onPointerDown={onEditorPointerDown}
                    onPointerMove={onEditorPointerMove}
                    onPointerUp={finishEditorPointer}
                    onPointerCancel={finishEditorPointer}
                  />
                ) : (
                  <canvas
                    ref={sourceCanvasRef}
                    className={`source-canvas ${captureMode ? "can-select" : ""}`}
                    onPointerDown={onSourcePointerDown}
                    onPointerMove={onSourcePointerMove}
                    onPointerUp={onSourcePointerUp}
                    onPointerCancel={onSourcePointerCancel}
                  />
                )}
              </div>
              {!cropUrl && <div className="canvas-hint"><MousePointer2 size={14} /> Drag to select an area</div>}
            </div>

            <footer className="canvas-footer">
              <div className="footer-left"><span className="footer-indicator" /> All processing happens on your device</div>
              <div className="footer-right"><span>PNG</span><span className="footer-separator">·</span><span>LOSSLESS EXPORT</span></div>
            </footer>
          </div>
        </section>
      </div>
      {notice && <div className="toast"><Check size={15} />{notice}</div>}
    </main>
  );
}
