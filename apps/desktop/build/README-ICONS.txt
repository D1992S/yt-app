Icon files required for building platform-specific installers:

Windows:  icon.ico  (256x256, multi-resolution recommended: 16,32,48,64,128,256)
macOS:    icon.icns (1024x1024 source recommended)
Linux:    icon.png  (512x512 minimum recommended)

Generate from a single 1024x1024 PNG source:
  - Windows: Use https://icoconvert.com or ImageMagick:
      magick convert icon-source.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
  - macOS: Use iconutil or https://cloudconvert.com/png-to-icns
  - Linux: Just rename the source PNG to icon.png

Place the generated files in this directory (apps/desktop/build/).
