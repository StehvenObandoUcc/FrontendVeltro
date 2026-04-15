$ErrorActionPreference = 'SilentlyContinue'
$message = "landing page"

$modified = @(
    ".gitignore",
    "package-lock.json",
    "package.json",
    "src/App.tsx",
    "src/api/client.ts",
    "src/components/inventory/AlertBadge.tsx",
    "src/components/layout/MainLayout.tsx",
    "src/index.css",
    "src/pages/auth/LoginPage.tsx",
    "src/pages/catalog/ProductFormPage.tsx",
    "src/test/setup.ts",
    "src/test/stores/cartStore.test.ts"
)

$untracked = @(
    ".gitattributes",
    "README.md",
    "docs/.env.example",
    "docs/AGENTS_F.md",
    "docs/AGENT_PROMPT_SPECIFICATION.md",
    "docs/B3-01_IMPLEMENTATION_COMPLETE.md",
    "docs/BASEDATOS.txt",
    "docs/CREAR_BASE_DE_DATOS.md",
    "docs/DOCUMENTATION.md",
    "docs/EXECUTIVE_SUMMARY.md",
    "docs/INDEX.md",
    "docs/OPENAI_VISION_API_SPECIFICATION.md",
    "docs/PROBLEMAS_SOLUCIONAR.txt",
    "docs/PROJECT_COMPLETION_REPORT.md",
    "docs/README.md",
    "docs/SESSION_SUMMARY.md",
    "docs/VeltroBase.md",
    "docs/analisis_clip_poc_veltro.md",
    "docs/analisis_yolo_veltro.md",
    "docs/create_database.sql",
    "docs/frontend-handoff.md",
    "public/dashboard.png",
    "public/model/nms-yolov8.onnx",
    "public/model/yolov8n.onnx",
    "skills-lock.json",
    "src/GlobalErrorBoundary.tsx",
    "src/components/pos/AiResultsPanel.tsx",
    "src/components/pos/AiScannerContainer.tsx",
    "src/components/pos/CameraErrorBoundary.tsx",
    "src/components/pos/DetectionOverlay.tsx",
    "src/components/pos/ScanModeToggle.tsx",
    "src/components/purchasing/ProductSearchSelect.tsx",
    "src/hooks/useAiScanQueue.ts",
    "src/hooks/useYoloDetection.ts",
    "src/modules/types/ai.types.ts",
    "src/pages/landing/FeaturesGrid.tsx",
    "src/pages/landing/FooterCTA.tsx",
    "src/pages/landing/FunctionalitiesExposition.tsx",
    "src/pages/landing/HeaderSticky.tsx",
    "src/pages/landing/HeroSection.tsx",
    "src/pages/landing/LandingPage.tsx",
    "src/pages/landing/PricingSection.tsx",
    "src/pages/landing/TechMarquee.tsx",
    "src/pages/landing/index.ts",
    "src/replace.cjs",
    "src/stores/aiScanStore.ts"
)

$count = 0

foreach ($file in $modified) {
    $count++
    git add $file
    git commit -m $message
    Write-Host "[$count] Commit: $file" -ForegroundColor Green
}

foreach ($file in $untracked) {
    $count++
    git add $file
    git commit -m $message
    Write-Host "[$count] Commit: $file" -ForegroundColor Green
}

Write-Host "`nTotal commits: $count" -ForegroundColor Cyan